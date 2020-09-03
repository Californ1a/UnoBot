const send = require("../util/send");

async function score(bot, msg) {
	if (!(typeof bot.unogame.unoRunning === "boolean" && bot.unogame.unoRunning)) {
		await send(msg.channel, "Uno isn't running.");
		return;
	}
	if (bot.unogame.unoPlayers && !bot.unogame.unoPlayers.includes(msg.author.id)) {
		await send(msg.channel, "You are not a participant in this game.");
		return;
	}
	const players = [];
	for (const p of bot.unogame.unoPlayers) {
		players.push(bot.unogame.getPlayer(p));
	}
	const playerScore = players.map(player => player.hand).reduce((amount, cards) => {
		amount += cards.reduce((s, c) => s += c.score, 0); // eslint-disable-line
		return amount;
	}, 0);
	await send(bot.webhooks.uno, `Score: ${playerScore}`);
}

module.exports.run = score;
