const send = require("../util/send");
const showHand = require("../util/showHand");

async function hand(bot, msg) {
	if (typeof bot.unogame.unoRunning === "boolean" && bot.unogame.unoRunning) {
		if (bot.unogame.unoPlayers && bot.unogame.unoPlayers.includes(msg.author.id)) {
			showHand(bot, msg, bot.unogame.getPlayer(msg.author.id), bot.unogame.unoPlayers);
		}
	} else {
		await send(msg.channel, "Uno isn't running.");
	}
}

module.exports.run = hand;
