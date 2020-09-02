const {
	Card,
	Colors,
	Values,
} = require("uno-engine");
const cardImages = require("../unocardimages");

function getCardImage(card) {
	const value = card.value.toString();
	const color = card.color.toString();
	return cardImages[color][value];
}

function getCard(args, p) {
	// #region Shorthand for quick testing games
	switch (args[0]) {
		case "r":
			args[0] = "red";
			break;
		case "g":
			args[0] = "green";
			break;
		case "y":
			args[0] = "yellow";
			break;
		case "b":
			args[0] = "blue";
			break;
		case "w":
			args[0] = "wild";
			break;
		case "wd4":
			args[0] = "wild_draw_four";
			break;
		default:
			throw new Error("Woops");
	}
	switch (args[1]) {
		case "r":
			args[1] = (args[0].includes("wild")) ? "red" : "reverse";
			break;
		case "s":
			args[1] = "skip";
			break;
		case "y":
			args[1] = (args[0].includes("wild")) ? "yellow" : args[1];
			break;
		case "b":
			args[1] = (args[0].includes("wild")) ? "blue" : args[1];
			break;
		case "g":
			args[1] = (args[0].includes("wild")) ? "green" : args[1];
			break;
		case "0":
			args[1] = "zero";
			break;
		case "1":
			args[1] = "one";
			break;
		case "2":
			args[1] = "two";
			break;
		case "3":
			args[1] = "three";
			break;
		case "4":
			args[1] = "four";
			break;
		case "5":
			args[1] = "five";
			break;
		case "6":
			args[1] = "six";
			break;
		case "7":
			args[1] = "seven";
			break;
		case "8":
			args[1] = "eight";
			break;
		case "9":
			args[1] = "nine";
			break;
		case "dt":
			args[1] = "draw_two";
			break;
		case "w":
			args[1] = "wild";
			break;
		case "wd4":
			args[1] = "wild_draw_four";
			break;
		default:
			throw new Error("Woops");
	}
	// #endregion
	args[0] = args[0].toUpperCase();
	args[1] = args[1].toUpperCase();
	const c = (Colors.get(args[0])) ? Colors.get(args[0]) : Colors.get(args[1]);
	const v = (Values.get(args[1])) ? Values.get(args[1]) : Values.get(args[0]);
	// console.log(args[0], args[1]);
	// console.log(c, v);
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
