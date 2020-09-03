const send = require("../util/send");
const {
	getCard,
} = require("../util/card");
const msgAllPlayers = require("../util/msgAllPlayers");
const doBotTurn = require("../util/doBotTurn");
const {
	nextTurn,
} = require("../util/game");

const unoBotMad = ["ARRGH!", "This is getting annoying!", "RATS!", "*sigh*", "You're getting on my nerves >:/", "dfasdfjhweuryaeuwysadjkf", "I'm steamed.", "BAH"];

async function play(bot, msg) {
	if (!(typeof bot.unogame.unoRunning === "boolean" && bot.unogame.unoRunning)) {
		await send(msg.channel, "Uno isn't running.");
		return;
	}
	if (msg.author.id !== bot.unogame.currentPlayer.name) {
		await send(bot.webhooks.uno, "It's not your turn");
		return;
	}
	const player = bot.unogame.currentPlayer;
	const args = msg.content.split(" ").slice(1);
	if (args.length !== 2) {
		if (args[0] && args[0].match(/^(w|wild|wd4)$/i)) {
			await send(msg.channel, "You must provide a color to switch to.");
			return;
		}
		await send(msg.channel, "You must specify both/only a card value and color");
		return;
	}
	try {
		const card = getCard(args, bot.unogame.currentPlayer);
		if (!card) {
			await send(msg.channel, "Couldn't find card matching the given input.");
			return;
		}
		let previousPlayer;
		if (bot.unogame.unoPlayers && !bot.unogame.unoPlayers.includes(bot.user.id)) {
			previousPlayer = await bot.users.fetch(bot.unogame.currentPlayer.name);
		}
		bot.unogame.play(card);
		if (bot.unogame.unoPlayers && !bot.unogame.unoPlayers.includes(bot.user.id)) {
			msgAllPlayers(bot, bot.unogame.unoPlayers, previousPlayer, `${previousPlayer}: play ${args.join(" ")}`);
		}
		if (bot.unogame && (bot.unogame.discardedCard.value.toString() === "DRAW_TWO"
				|| bot.unogame.discardedCard.value.toString() === "WILD_DRAW_FOUR")) {
			bot.unogame.draw();
		}
	} catch (e) {
		if (e.message.includes("does not have card")) {
			await send(bot.webhooks.uno, "You do not have that card.");
			return;
		}
		if (e.message.includes("from discard pile, does not match")) {
			await send(bot.webhooks.uno, "That card can't be played now.");
			return;
		}
		console.error(e);
		return;
	}
	if (player.hand.length === 0) {
		// `game.on("end")` gets triggered
		return;
	}
	const betweenLength = Math.floor(Math.random() * unoBotMad.length);
	let rand = betweenLength > Math.floor(unoBotMad.length / 2);
	const value = bot.unogame.discardedCard.value.toString();
	if (value.includes("DRAW")) { // Increase chance for bot to get mad for draw cards
		rand = betweenLength > Math.floor(unoBotMad.length / 3);
	}
	if (rand && bot.unogame.getPlayer(bot.user.id) && (value.includes("DRAW") || value.includes("SKIP") || value.includes("REVERSE"))) {
		await send(msg.channel, unoBotMad[Math.floor(Math.random() * unoBotMad.length)]);
	}

	const check = await nextTurn(bot, msg, bot.unogame.unoPlayers);
	if (!check) {
		doBotTurn(bot, msg);
	}
}

module.exports.run = play;
