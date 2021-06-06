const { Collection, MessageButton } = require("discord.js");
const { Game } = require("uno-engine");
const { addButton, buttonsToMessageActions } = require("../util/buttons.js");
const sleep = require("./sleep.js");
const errHandler = require("../util/err.js");

async function startMsg(i, msg, options) {
	let type = "reply";
	if (i.type === "MESSAGE_COMPONENT") {
		const { embeds } = i.message;
		await i.update(i.message.content, { components: [], embeds });
		type = "followUp";
	}
	const m = await i[type](msg, options);
	if (m) {
		return m;
	}
	return i.fetchReply();
}

async function start(interaction, chan, opts, reset, nextTurn, finished) {
	if (chan.uno?.running && typeof opts.end === "undefined") {
		await interaction.reply("An Uno game is already running in this channel.", { ephemeral: true });
		return;
	}
	if (chan.uno?.running && typeof opts.end !== "undefined" && interaction.member.id !== chan.uno.ownerID) {
		await interaction.reply("Only the person who started the game can force-end it early.", { ephemeral: true });
		return;
	}
	if (chan.uno?.running
		&& typeof opts.end !== "undefined"
		&& interaction.member.id === chan.uno.ownerID) {
		if (opts.end) {
			reset(chan);
			await interaction.reply("Uno has been force-ended.");
			return;
		}
		await interaction.reply("Uno will continue.", { ephemeral: true });
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
		ownerID: interaction.member.id,
		awaitingPlayers: true,
		players: new Collection(),
		id: Date.now(),
	};
	console.log(chan.uno);
	chan.uno.players.set(interaction.member.id, {
		member: interaction.member,
		interaction,
	});
	// chan.uno.players.get(interaction.member.id).interaction = interaction;
	if (botPlayer) {
		chan.uno.players.set(chan.guild.me.id, {
			member: chan.guild.me,
		});
	}
	const { id } = chan.uno;
	if (!solo) {
		const startTime = 30;

		const joinBtn = new MessageButton()
			.setCustomID("JOIN")
			.setLabel("Join")
			.setStyle("SUCCESS")
			.setEmoji("⏩");
		const buttons = addButton([
			[],
		], joinBtn);

		const msg = await startMsg(interaction, `An Uno game${(botPlayer) ? " *with the bot*" : ""} will be started in ${startTime}s! Use \`/join\` or click the button to join.`, {
			components: buttonsToMessageActions(buttons),
		});
		const joinCollector = msg.createMessageComponentInteractionCollector(() => true, {
			time: startTime * 1000,
		});
		joinCollector.on("collect", async (i) => {
			if (chan.uno.players.has(i.member.id)) {
				await i.reply("You are already in the current game.", { ephemeral: true });
				return;
			}
			chan.uno.players.set(i.member.id, {
				member: i.member,
				interaction: i,
			});
			// chan.uno.players.get(i.member.id).interaction = i;
			i.reply(`${i.member} joined - Player ${chan.uno.players.size}`, { allowedMentions: { users: [] } });
		});
		await new Promise((resolve) => { // Wait full duration before starting game
			joinCollector.on("end", resolve);
		});
		msg.edit(msg.content, { components: [] });
		// await sleep(startTime * 1000);
	} else {
		await startMsg(interaction, "Uno is starting!");
	}
	// If player force-ends uno during waiting for players, id will be different
	if (!chan.uno || id !== chan.uno.id) return;

	chan.uno.awaitingPlayers = false;
	const players = chan.uno.players.map(p => p.member.id);
	if (players.length < 2) {
		chan.uno.players.set(chan.guild.me.id, {
			member: chan.guild.me,
		});
		players.push(chan.guild.me.id);
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
