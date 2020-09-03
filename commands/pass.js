const send = require("../util/send");
const doBotTurn = require("../util/doBotTurn");
const msgAllPlayers = require("../util/msgAllPlayers");
const {
	nextTurn,
} = require("../util/game");

async function pass(bot, msg) {
	if (typeof bot.unogame.unoRunning === "boolean" && bot.unogame.unoRunning) {
		if (msg.author.id !== bot.unogame.currentPlayer.name) {
			await send(bot.webhooks.uno, "It's not your turn");
			return;
		}
		try {
			let previousPlayer;
			if (bot.unogame.unoPlayers && !bot.unogame.unoPlayers.includes(bot.user.id)) {
				previousPlayer = await bot.users.fetch(bot.unogame.currentPlayer.name);
			}
			bot.unogame.pass();
			if (bot.unogame.unoPlayers && !bot.unogame.unoPlayers.includes(bot.user.id)) {
				msgAllPlayers(bot, bot.unogame.unoPlayers, previousPlayer, `${previousPlayer}: pass`);
			}
		} catch (e) {
			if (e.message.includes("must draw at least one card")) {
				await send(bot.webhooks.uno, "You must draw before passing.");
				return;
			}
		}
		const check = await nextTurn(bot, msg, bot.unogame.unoPlayers);
		if (!check) {
			doBotTurn(bot, msg);
		}
	} else {
		await send(msg.channel, "Uno isn't running.");
	}
}

module.exports.run = pass;
