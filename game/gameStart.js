const { Collection } = require("discord.js");
const { Game } = require("uno-engine");
const sleep = require("./sleep.js");
const errHandler = require("../util/err.js");

async function startMsg(i, msg) {
	let type = "reply";
	if (i.type === "MESSAGE_COMPONENT") {
		await i.update(i.message.content, { components: [] });
		type = "followUp";
	}
	i[type](msg);
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
	chan.uno.players.set(interaction.member.id, interaction.member);
	chan.uno.players.get(interaction.member.id).interaction = interaction;
	if (botPlayer) {
		chan.uno.players.set(chan.guild.me.id, chan.guild.me);
	}
	const { id } = chan.uno;
	if (!solo) {
		const startTime = 30;
		await startMsg(interaction, `An Uno game${(botPlayer) ? " *with the bot*" : ""} will be started in ${startTime}s! Use \`/join\` to join.`);
		await sleep(startTime * 1000);
	} else {
		await startMsg(interaction, "Uno is starting!");
	}
	// If player force-ends uno during waiting for players, id will be different
	if (!chan.uno || id !== chan.uno.id) return;

	chan.uno.awaitingPlayers = false;
	const players = chan.uno.players.map(p => p.id);
	if (players.length < 2) {
		chan.uno.players.set(chan.guild.me.id, chan.guild.me);
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
	try {
		await nextTurn(chan);
	} catch (e) {
		errHandler("error", e);
	}
	chan.uno.game.on("end", (...args) => finished(chan, ...args));
}

module.exports = start;
