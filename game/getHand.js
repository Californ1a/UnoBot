const getPlainCard = require("./getPlainCard.js");

function getHand(player) {
	const handArr = player.hand;
	const hand = [];
	for (const card of handArr) {
		hand.push(getPlainCard(card));
	}
	return {
		handStr: hand.join(", "),
		handArr: hand,
		player,
	};
}

module.exports = getHand;
