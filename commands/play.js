const { Values, Colors, Card } = require("uno-engine");
const errHandler = require("../util/err.js");
const { nextTurn, checkUnoRunning, checkPlayerTurn } = require("../game/game.js");
const botMad = require("../game/botMad.js");
const postPlay = require("../game/postPlay.js");

async function play(interaction, chan, opts) {
	if (await checkUnoRunning(interaction)) return;
	if (await checkPlayerTurn(interaction)) return;

	let card = Card(Values.get(opts.value), Colors.get(opts.color));
	const p = chan.uno.game.currentPlayer;
	if (opts.value.includes("WILD") || opts.value.includes("WILD_DRAW_FOUR")) {
		card = p.getCardByValue(Values.get(opts.value));
		card.color = Colors.get(Colors.get(opts.color));
	}

	const ret = await postPlay(chan, interaction, card);
	if (!ret) return;

	if (!chan.uno) return;
	chan.uno.drawn = false;

	await botMad(chan);

	try {
		await nextTurn(chan);
	} catch (e) {
		errHandler("error", e);
	}
}

exports.run = play;
exports.type = "slash";
