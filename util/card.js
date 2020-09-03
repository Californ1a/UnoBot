const {
	Card,
	Colors,
	Values,
} = require("uno-engine");
const cardImages = require("../unocardimages");

const nums = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

function getCardImage(card) {
	const value = card.value.toString();
	const color = card.color.toString();
	return cardImages[color][value];
}

function getCard(args, p, attempt) {
	let color = args[0];
	let value = args[1];

	if (color.match(/^(r|red)$/i)) {
		color = "red";
	} else if (color.match(/^(g|green)$/i)) {
		color = "green";
	} else if (color.match(/^(y|yellow)$/i)) {
		color = "yellow";
	} else if (color.match(/^(b|blue)$/i)) {
		color = "blue";
	}

	if (value.match(/^(r|reverse)$/i)) {
		value = "reverse";
	} else if (value.match(/^(s|skip)$/i)) {
		value = "skip";
	} else if (parseInt(value, 10) && parseInt(value, 10) >= 0 && parseInt(value, 10) <= 9) {
		value = nums[value];
	} else if (value.match(/^(dt|draw|drawtwo)$/i)) {
		value = "draw_two";
	} else if (value.match(/^(w|wild)$/i)) {
		value = "wild";
	} else if (value.match(/^(wd4|wilddraw|wilddraw4|wilddrawfour)$/i)) {
		value = "wild_draw_four";
	}

	color = color.toUpperCase();
	value = value.toUpperCase();
	const c = (Colors.get(color)) ? Colors.get(color) : Colors.get(value);
	const v = (Values.get(value)) ? Values.get(value) : Values.get(color);

	if (!c || !v) {
		if (attempt) {
			return null;
		}
		return getCard(args.reverse(), p, 1); // support backward args
	}

	let card = Card(v, c);
	if (args.includes("WILD") || args.includes("WILD_DRAW_FOUR")) {
		card = p.getCardByValue(v);
		card.color = Colors.get(c);
	}
	return card;
}

module.exports = {
	getCardImage,
	getCard,
};
