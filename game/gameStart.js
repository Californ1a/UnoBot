const { Collection, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Game } = require("uno-engine");
const { addButton, buttonsToMessageActions } = require("../util/buttons.js");
const sleep = require("./sleep.js");
const errHandler = require("../util/err.js");

async function startMsg(i, msg, options) {
	let type = "reply";
	if (i.type === 3) {
		await i.update({ content: i.message.content, components: [], embeds: i.message.embeds });
		type = "followUp";
	}
	const m = await i[type]({ content: msg, ...options });
	if (m.edit) {
		return m;
	}
	return i.fetchReply();
}

async function start(interaction, chan, opts, reset, nextTurn, finished) {
	if (chan.uno?.running && typeof opts.end === "undefined") {
		await interaction.reply({ content: "An Uno game is already running in this channel.", ephemeral: true });
		return;
	}
	if (chan.uno?.running && typeof opts.end !== "undefined" && interaction.member.id !== chan.uno.ownerId) {
		await interaction.reply({ content: "Only the person who started the game can force-end it early.", ephemeral: true });
		return;
	}
	if (chan.uno?.running
		&& typeof opts.end !== "undefined"
		&& interaction.member.id === chan.uno.ownerId) {
		if (opts.end) {
			reset(chan);
			await interaction.reply("Uno has been force-ended.");
			return;
		}
		await interaction.reply({ content: "Uno will continue.", ephemeral: true });
		return;
	}
	let solo = false;
	if (!chan.uno?.running && opts.solo) {
		solo = true;
	}
	let botPlayer = false;
	if (!chan.uno?.running && opts.bot) {
		botPlayer = true;
	}
	chan.uno = {
		running: true,
		ownerId: interaction.member.id,
		awaitingPlayers: true,
		players: new Collection(),
		id: Date.now(),
	};
	chan.uno.players.set(interaction.member.id, {
		member: interaction.member,
		interaction,
	});
	// chan.uno.players.get(interaction.member.id).interaction = interaction;
	if (botPlayer) {
		chan.uno.players.set(chan.guild.members.me.id, {
			member: chan.guild.members.me,
		});
	}
	const { id } = chan.uno;
	if (!solo) {
		const startTime = 30;

		const joinBtn = new ButtonBuilder()
			.setCustomId("JOIN")
			.setLabel("Join")
			.setStyle(ButtonStyle.Success)
			.setEmoji("⏩");
		const buttons = addButton([
			[],
		], joinBtn);
		const actionRows = buttonsToMessageActions(buttons);

		const msg = await startMsg(interaction, `An Uno game${(botPlayer) ? " *with the bot*" : ""} will be started in ${startTime}s! Use \`/join\` or click the button to join.`, {
			components: actionRows,
		});
		const joinCollector = msg.createMessageComponentCollector({
			time: startTime * 1000,
		});
		joinCollector.on("collect", async (i) => {
			if (chan.uno.players.has(i.member.id)) {
				await i.reply({ content: "You are already in the current game.", ephemeral: true });
				return;
			}
			chan.uno.players.set(i.member.id, {
				member: i.member,
				interaction: i,
			});
			// chan.uno.players.get(i.member.id).interaction = i;
			i.reply({ content: `${i.member} joined - Player ${chan.uno.players.size}`, allowedMentions: { users: [] } });
		});
		await new Promise((resolve) => { // Wait full duration before starting game
			joinCollector.on("end", resolve);
		});
		msg.edit({ content: msg.content, components: [] });
		// await sleep(startTime * 1000);
	} else {
		await startMsg(interaction, "Uno is starting!");
	}
	// If player force-ends uno during waiting for players, id will be different
	if (!chan.uno || id !== chan.uno.id) return;

	chan.uno.awaitingPlayers = false;
	const players = chan.uno.players.map(p => p.member.id);
	if (players.length < 2) {
		chan.uno.players.set(chan.guild.members.me.id, {
			member: chan.guild.members.me,
		});
		players.push(chan.guild.members.me.id);
		if (!solo) {
			await interaction.followUp("No one joined, the bot will play!");
			await sleep(4000);
		}
		await sleep(3000);
		// If player force-ends uno during waiting for bot, id will be different
		if (!chan.uno || id !== chan.uno.id) return;
	}
	chan.uno.game = new Game(players);
	chan.uno.game.on("end", (...args) => finished(chan, ...args));

	try {
		await nextTurn(chan);
	} catch (e) {
		errHandler("error", e);
	}
}

module.exports = start;
