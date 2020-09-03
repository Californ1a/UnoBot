const send = require("../util/send");
const {
	beginning,
	reset,
} = require("../util/game");
const doBotTurn = require("../util/doBotTurn");

async function uno(bot, msg) {
	if (bot.unogame.unoRunning && !bot.unoAwaitingPlayers) {
		bot.unoAwaitingPlayers = true;
		// return send(msg.channel, "Uno is already running");
		await send(msg.channel, "Do you want to end Uno? [y/N]");
		try {
			const collected = await msg.channel.awaitMessages(r => (r.content === "y" || r.content === "yes" || r.content === "n" || r.content === "no") && msg.author.id === r.author.id, {
				max: 1,
				time: 30000,
				errors: ["time"],
			});
			if (collected.first().content === "n" || collected.first().content === "no") {
				await send(msg.channel, "Uno will continue.");
				bot.unoAwaitingPlayers = false;
				return;
			}
			await reset(bot, msg);
			await send(msg.channel, "Uno has been forced ended.");
			bot.unoAwaitingPlayers = false;
			return;
		} catch (e) {
			await send(msg.channel, "Took too long to respond. Uno will continue.");
			bot.unoAwaitingPlayers = false;
			console.log(e);
		}
	} else if (!bot.unoAwaitingPlayers) {
		bot.unoAwaitingPlayers = true;
		if (!bot.unogame.unoPlayers) {
			bot.unogame.unoPlayers = [];
		}
		try {
			if (!process.env.DEV) {
				await send(msg.author, "You are entered to play Uno. If more than 1 person enters, the game will be run in DMs. Disregard this message otherwise.");
			}
		} catch (e) {
			await send(msg.channel, "Couldn't send you a DM. DMs must be open to play Uno.");
			return;
		}
		const players = bot.unogame.unoPlayers;
		players.push(msg.author.id);

		const hooks = await msg.channel.fetchWebhooks();
		const unobot = hooks.find(hook => hook.name === "UnoBot");
		if (!unobot) {
			const hook = await msg.channel.createWebhook("UnoBot", {
				avatar: "https://i.imgur.com/fLMHXKh.jpg",
			});
			const check = await beginning(bot, hook, msg, players);
			bot.unoAwaitingPlayers = false;
			if (!check) {
				doBotTurn(bot, msg);
			} else if (check[0]) {
				bot.unogame.unoPlayers = check;
			}
		} else {
			const hook = unobot;
			const check = await beginning(bot, hook, msg, players);
			bot.unoAwaitingPlayers = false;
			if (!check) {
				doBotTurn(bot, msg);
			} else if (check[0]) {
				bot.unogame.unoPlayers = check;
			}
		}
	} else {
		await send(msg.channel, "Still waiting for players. You can end Uno after players have joined.");
	}
}

module.exports.run = uno;
