const send = require("../util/send");
const getHand = require("../util/getHand");

async function handCmd(bot, msg) {
	if (typeof bot.unogame.unoRunning === "boolean" && bot.unogame.unoRunning) {
		if (bot.unogame.unoPlayers && bot.unogame.unoPlayers.includes(msg.author.id)) {
			const {
				hand,
				sendTo,
				user,
			} = await getHand(bot, msg.author.id, bot.unogame.unoPlayers);
			await send(sendTo, `${user} Your Uno hand: ${hand}`);
		}
	} else {
		await send(msg.channel, "Uno isn't running.");
	}
}

module.exports.run = handCmd;
