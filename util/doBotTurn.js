const {
	Colors,
} = require("uno-engine");
const {
	nextTurn,
} = require("./game");
const countOccurrences = require("./countOccurrences");
const send = require("./send");
const delay = require("./delay");

const unoBotThink = ["*evil grin*..", "You'll pay for that...", "woooot..", "Dum de dum..", "hehe..", "Oh boy..", "hrm..", "Lets see here..", "uh..", "Hmm, you're good..", "Decisions decisions..", "Ahah!...", "Eeny Meeny Miney Moe..", "LOL..", "Oh dear..", "Errr..", "Ah me brain!..."];

async function doBotTurn(bot, msg) {
	const player = bot.unogame.currentPlayer;
	let currentHand = player.hand;
	let botMatchingHand = currentHand.filter(card => (card.color === bot.unogame.discardedCard.color
		|| card.value === bot.unogame.discardedCard.value
		|| card.value.toString().includes("WILD")));
	if (botMatchingHand.length === 0) {
		await delay(2000);
		await send(msg.channel, "draw");
		bot.unogame.draw();
		// console.log("bot drew");
		// console.log(`\n\n${game.currentPlayer.hand[game.currentPlayer.hand.length - 1]}\n\n`);
		// console.log(`\n\n${botMatchingHand}\n\n`);
		currentHand = bot.unogame.currentPlayer.hand;
		botMatchingHand = currentHand.filter(card => (card.color === bot.unogame.discardedCard.color
			|| card.value === bot.unogame.discardedCard.value
			|| card.value.toString().includes("WILD")));
		if (botMatchingHand.length === 0) {
			// console.log(`\n\n${botMatchingHand}\n\n`);
			await delay(2000);
			await send(msg.channel, "pass");
			bot.unogame.pass();
			// console.log("bot passed");
			await delay(1000);
			if (player.hand.length === 0) {
				return;
			}
			const check = await nextTurn(bot, msg);
			if (check) {
				doBotTurn(bot, msg);
			}
		} else {
			await delay(2000);
			doBotTurn(bot, msg);
		}
	} else {
		await delay(1000);
		if (Math.floor(Math.random() * unoBotThink.length) < Math.floor(unoBotThink.length / 3)) {
			await send(msg.channel, unoBotThink[Math.floor(Math.random() * unoBotThink.length)]);
			await delay(2000);
		}
		// TODO: Improve logic on which card to pick

		// wild and wd4 set color
		const cardColors = [];
		player.hand.filter(card => !card.value.toString().includes("WILD")).forEach((card) => {
			cardColors.push(card.color.toString());
		});
		const cardCols = countOccurrences(cardColors);
		// console.log(`\n\n${JSON.stringify(cardCols, null, 2)}\n\n`);
		const keys = Object.keys(cardCols);
		const mostColor = keys.reduce((a, e) => ((cardCols[e] > cardCols[a]) ? e : a), keys[0]);
		// console.log(`\n\n${mostColor}\n\n`);
		const card = botMatchingHand[0];
		if (card.value.toString().includes("WILD")) {
			// console.log(`\n\n${mostColor}\n\n`);
			card.color = Colors.get(mostColor);
		}

		if (player.hand.length === 2) {
			await send(msg.channel, "UNO!");
		}

		const commandColor = card.color.toString().toLowerCase();
		const val = card.value.toString();
		const commandValue = (val.includes("_")) ? val.split("_").map(word => ((word !== "FOUR") ? word.charAt(0) : "4")).join("").toLowerCase() : val.toLowerCase();

		await send(msg.channel, `play ${commandColor} ${commandValue}`);
		bot.unogame.play(card); // TODO: Improve logic on which card to pick
		if (bot.unogame && (bot.unogame.discardedCard.value.toString() === "DRAW_TWO" || bot.unogame.discardedCard.value.toString() === "WILD_DRAW_FOUR")) {
			bot.unogame.draw();
		}
		await delay(1000);
		if (player.hand.length === 0) {
			return;
		}
		const check = await nextTurn(bot, msg);
		if (check) {
			doBotTurn(bot, msg);
		}
	}
}

module.exports = doBotTurn;
