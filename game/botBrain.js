const { Colors } = require("uno-engine");
const sleep = require("./sleep.js");
const countOccurrences = require("../util/countOccurrences.js");

const unoBotThink = ["*evil grin*..", "You'll pay for that...", "woooot..", "Dum de dum..", "hehe..", "Oh boy..", "hrm..", "Lets see here..", "uh..", "Hmm, you're good..", "Decisions decisions..", "Ahah!...", "Eeny Meeny Miney Moe..", "LOL..", "Oh dear..", "Errr..", "Ah me brain!..."];

async function botPlay(chan, matchingHand, callUno = true) {
	if (!chan.uno) return;
	const { id } = chan.uno;
	const player = chan.uno.game.currentPlayer;
	chan.startTyping();
	await sleep(1500, 2500);
	if (Math.floor(Math.random() * unoBotThink.length) < Math.floor(unoBotThink.length / 3)) {
		if (!chan.uno || id !== chan.uno.id) return;
		chan.stopTyping();
		await chan.send(unoBotThink[Math.floor(Math.random() * unoBotThink.length)]);
		await sleep(500, 1500);
		chan.startTyping();
	}

	// TODO: Improve logic on which card to pick
	const card = matchingHand[0];

	if (card.value.toString().includes("WILD")) {
		if (player.hand.length > 1) {
			// Choose color to set wild/wd4 to
			const cardColors = [];
			const handWithoutWilds = player.hand.filter(c => !c.value.toString().includes("WILD"));
			handWithoutWilds.forEach((c) => {
				if (c.color.toString() !== chan.uno.game.discardedCard.color.toString()) {
					// Create list of colors in hand not matching current color
					cardColors.push(c.color.toString());
				}
			});
			if (cardColors.length === 0) {
				// All cards in hand had same color as the current card
				cardColors.push(chan.uno.game.discardedCard.color.toString());
			}
			const cardCols = countOccurrences(cardColors);

			const keys = Object.keys(cardCols);
			const colorArr = keys.reduce((a, c) => {
				for (let i = 0; i < cardCols[c]; i += 1) {
					a.push(c);
				}
				return a;
			}, []);
			const randomIndex = Math.floor(Math.random() * colorArr.length);
			const randomColor = colorArr[randomIndex];

			card.color = Colors.get(randomColor);
		} else {
			// Color doesn't matter if wild/wd4 is last card in hand
			card.color = Colors.get("BLUE");
		}
	}

	await sleep(500, 1500);
	chan.stopTyping();

	if (player.hand.length === 2 && callUno) {
		if (!chan.uno || id !== chan.uno.id) return;
		await chan.send("UNO!");
		chan.startTyping();
		await sleep(500, 1500);
		chan.stopTyping();
	}

	const commandColor = card.color.toString().toLowerCase();
	const val = card.value.toString();
	const commandValue = (val.includes("_")) ? val.split("_").map(word => ((word !== "FOUR") ? word.charAt(0) : "4")).join("").toLowerCase() : val.toLowerCase();

	if (!chan.uno || id !== chan.uno.id) return;
	await chan.send(`\`/play ${commandColor} ${commandValue}\``);
	chan.uno.game.play(card);
	if (!chan.uno || id !== chan.uno.id) return;
	const drawn = { didDraw: false, player: chan.uno.players.get(chan.uno.game.currentPlayer.name) };
	if (player.hand.length !== 0 && (chan.uno.game.discardedCard.value.toString().match(/^(draw_two|wild_draw_four)$/i))) {
		chan.uno.game.draw();
		drawn.didDraw = true;
	}
	if (drawn.didDraw) {
		const c = chan.uno.game.discardedCard.value.toString().toLowerCase();
		await chan.send(`${drawn.player} drew ${(c.includes("two") ? "2" : "4")} cards.`, {
			allowedMentions: {
				users: [],
			},
		});
	}
	await sleep(1000);
}

async function botTurn(chan) {
	if (!chan.uno) return;
	const { id } = chan.uno;
	const player = chan.uno.game.currentPlayer;
	if (player.name !== chan.guild.me.id) return;
	let matchingHand = player.hand.filter(card => (card.color === chan.uno.game.discardedCard.color
		|| card.value === chan.uno.game.discardedCard.value
		|| card.value.toString().includes("WILD")));
	await sleep(2000, 4000);
	if (matchingHand.length === 0) {
		chan.startTyping();
		await sleep(1000, 1500);
		chan.stopTyping();
		if (!chan.uno || id !== chan.uno.id) return;
		await chan.send("`/draw`");
		chan.uno.game.draw();
		matchingHand = player.hand.filter(card => (card.color === chan.uno.game.discardedCard.color
			|| card.value === chan.uno.game.discardedCard.value
			|| card.value.toString().includes("WILD")));
		if (matchingHand.length === 0) {
			await sleep(500, 1500);
			chan.startTyping();
			await sleep(500, 1500);
			chan.stopTyping();
			if (!chan.uno || id !== chan.uno.id) return;
			await chan.send("`/pass`");
			chan.uno.game.pass();
			await sleep(500, 1500);
			return;
		}
		await botPlay(chan, matchingHand, false);
		return;
	}
	await botPlay(chan, matchingHand);
}

module.exports = botTurn;
