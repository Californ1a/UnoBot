const send = require("../util/send");
const msgAllPlayers = require("../util/msgAllPlayers");

async function draw(bot, msg) {
	if (typeof bot.unogame.unoRunning === "boolean" && bot.unogame.unoRunning) {
		if (msg.author.id !== bot.unogame.currentPlayer.name) {
			await send(bot.webhooks.uno, "It's not your turn");
			return;
		}
		let previousPlayer;
		if (bot.unogame.unoPlayers && !bot.unogame.unoPlayers.includes(bot.user.id)) {
			previousPlayer = await bot.users.fetch(bot.unogame.currentPlayer.name);
		}
		bot.unogame.draw();
		if (bot.unogame.unoPlayers && !bot.unogame.unoPlayers.includes(bot.user.id)) {
			msgAllPlayers(bot, bot.unogame.unoPlayers, previousPlayer, `${previousPlayer}: draw`);
		}
		const card = bot.unogame.currentPlayer.hand[bot.unogame.currentPlayer.hand.length - 1];
		const name = (card.color) ? card.toString() : card.value.toString();
		const n2 = (name.includes("WILD_DRAW")) ? "WD4" : (name.includes("DRAW")) ? `${name.split(" ")[0]} DT` : name;
		await send(bot.webhooks.uno, `${msg.author} drew a ${n2.toLowerCase()}`);
	} else {
		await send(msg.channel, "Uno isn't running.");
	}
}

module.exports.run = draw;
