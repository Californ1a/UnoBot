function matchCard(card, discardedCard) {
	return (card.color === discardedCard.color
		|| card.value === discardedCard.value
		|| card.value.toString().includes("WILD"));
}

function filterHand(hand, discardedCard) {
	return hand.filter(card => matchCard(card, discardedCard));
}

module.exports = {
	filterHand,
	matchCard,
};
