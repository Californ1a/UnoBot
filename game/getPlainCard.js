function getPlainCard(card) {
	const hand = [];
	if (card.value.toString() === "WILD") {
		hand.push("wild");
	} else if (card.value.toString() === "WILD_DRAW_FOUR") {
		hand.push("WD4");
	} else if (card.value.toString() === "DRAW_TWO") {
		hand.push(`${card.color.toString().toLowerCase()} DT`);
	} else {
		hand.push(card.toString().toLowerCase());
	}
	return hand[0];
}

module.exports = getPlainCard;
