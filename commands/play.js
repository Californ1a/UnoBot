const { Values, Colors, Card } = require("uno-engine");
const errHandler = require("../util/err.js");
const { getPlainCard, nextTurn } = require("../game/game.js");

const unoBotMad = ["ARRGH!", "This is getting annoying!", "RATS!", "*sigh*", "You're getting on my nerves >:/", "dfasdfjhweuryaeuwysadjkf", "I'm steamed.", "BAH"];

async function play(interaction, chan, opts, bot) {
	if (!chan.uno?.running) {
		await interaction.reply("No Uno game found. Use `/uno` to start a new game.", { ephemeral: true });
		return;
	}
	if (chan.uno.game.currentPlayer.name !== interaction.member.id) {
		await interaction.reply("It's not your turn.", { ephemeral: true });
		return;
	}

	let card = Card(Values.get(opts.value), Colors.get(opts.color));
	const p = chan.uno.game.currentPlayer;
	if (opts.value.includes("WILD") || opts.value.includes("WILD_DRAW_FOUR")) {
		card = p.getCardByValue(Values.get(opts.value));
		card.color = Colors.get(Colors.get(opts.color));
	}
	const player = chan.uno.game.currentPlayer;
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
		console.error(e);
		return;
	}
	chan.uno.players.get(player.name).interaction = interaction;
	const c = chan.uno.game.discardedCard.value.toString().toLowerCase();
	await interaction.reply(`Played ${getPlainCard(card)}${(drawn.didDraw) ? `, ${drawn.player} drew ${(c.includes("two") ? "2" : "4")} cards.` : ""}`);
	if (!chan.uno) return;
	chan.uno.drawn = false;

	// Let bot get mad if he has to draw cards or gets skipped
	if (chan.uno.game.currentPlayer.name === chan.guild.me.id && chan.uno.players.size === 2) {
		const betweenLength = Math.floor(Math.random() * unoBotMad.length);
		let rand = betweenLength > Math.floor(unoBotMad.length / 2);
		const value = chan.uno.game.discardedCard.value.toString();
		if (value.includes("DRAW")) { // Increase chance for bot to get mad for draw cards
			rand = betweenLength > Math.floor(unoBotMad.length / 3);
		}
		if (rand !== 0 && chan.uno.game.getPlayer(bot.user.id)
			&& (value.includes("DRAW") || value.includes("SKIP") || value.includes("REVERSE"))) {
			await chan.send(unoBotMad[Math.floor(Math.random() * unoBotMad.length)]);
		}
	}

	try {
		await nextTurn(chan);
	} catch (e) {
		errHandler("error", e);
	}
}

exports.run = play;
exports.type = "slash";
