const send = require("./send");

async function showHand(bot, msg, player) {
	let p = player;
	if (player.name) {
		p = player.name;
	}
	if (msg.guild.members.cache.get(p).user.bot) {
		return;
	}
	const handArr = bot.unogame.getPlayer(p).hand; // .toString().toLowerCase().split(",");
	const hand = [];
	for (const card of handArr) {
		if (card.value.toString() === "WILD") {
			hand.push("wild");
		} else if (card.value.toString() === "WILD_DRAW_FOUR") {
			hand.push("WD4");
		} else if (card.value.toString() === "DRAW_TWO") {
			hand.push(`${card.color.toString().toLowerCase()} DT`);
		} else {
			hand.push(card.toString().toLowerCase());
		}
	}
	const member = msg.guild.members.cache.get(p);
	await send(bot.webhooks.uno, `${member} Your Uno hand: ${hand.join(", ")}`); // TODO: send privately to `member` when inline pm is available - direct msg works but is annoying
}

module.exports = showHand;
