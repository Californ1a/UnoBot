const { Values, Colors, Card } = require("uno-engine");
const errHandler = require("../util/err.js");
const { getPlainCard, nextTurn, checkUnoRunning, checkPlayerTurn } = require("../game/game.js");
const botMad = require("../game/botMad.js");

async function play(interaction, chan, opts) {
	if (await checkUnoRunning(interaction)) return;
	if (await checkPlayerTurn(interaction)) return;

	let card = Card(Values.get(opts.value), Colors.get(opts.color));
	const p = chan.uno.game.currentPlayer;
	if (opts.value.includes("WILD") || opts.value.includes("WILD_DRAW_FOUR")) {
		card = p.getCardByValue(Values.get(opts.value));
		card.color = Colors.get(Colors.get(opts.color));
	}
	const drawn = { didDraw: false };
	try {
		chan.uno.game.play(card);

		if (chan.uno.game.discardedCard.value.toString() === "DRAW_TWO"
			|| chan.uno.game.discardedCard.value.toString() === "WILD_DRAW_FOUR") {
			drawn.player = chan.uno.players.get(chan.uno.game.currentPlayer.name);
			chan.uno.game.draw();
			drawn.didDraw = true;
		}
	} catch (e) {
		if (e.message.includes("does not have card")) {
			await interaction.reply("You do not have that card.", { ephemeral: true });
			return;
		}
		if (e.message.includes("from discard pile, does not match")) {
			await interaction.reply("That card can't be played now.", { ephemeral: true });
			return;
		}
		errHandler("error", e);
		return;
	}
	chan.uno.players.get(p.name).interaction = interaction;
	const c = chan.uno.game.discardedCard.value.toString().toLowerCase();
	await interaction.reply(`${interaction.member} played ${getPlainCard(card)}${(drawn.didDraw) ? `, ${drawn.player} drew ${(c.includes("two") ? "2" : "4")} cards.` : ""}`, {
		allowedMentions: {
			users: [],
		},
	});
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
