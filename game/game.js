const errHandler = require("../util/err.js");
const botTurn = require("./botBrain.js");
const cardImages = require("../data/unocardimages.json");

function getCardImage(card) {
	const value = card.value.toString();
	const color = card.color.toString();
	return cardImages[color][value];
}

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

function getHand(player) {
	const handArr = player.hand;
	const hand = [];
	for (const card of handArr) {
		hand.push(getPlainCard(card));
	}
	return {
		handStr: hand.join(", "),
		handArr: hand,
		player,
	};
}

function reset(chan) {
	chan.uno = null;
}

async function finished(chan, err, winner, score) {
	if (err) {
		errHandler("error", err);
	}
	const player = chan.uno.players.get(winner.name);

	const losers = chan.uno.players.filter(p => p.id !== winner.name);
	const hands = losers.map(p => getHand(chan.uno.game.getPlayer(p.id)));

	const handLines = [];
	for (const hand of hands) {
		handLines.push(`${chan.uno.players.get(hand.player.name)}'s final hand: ${hand.handStr}`);
	}
	await chan.send(`Game finished!\n${"-".repeat(35)}\n${player} wins! Score: ${score}\n${"-".repeat(35)}\n\n${handLines.join("\n")}`);
	reset(chan);
}

async function nextTurn(chan) {
	if (!chan.uno) return;
	const player = chan.uno.players.get(chan.uno.game.currentPlayer.name);

	const { handArr, handStr } = getHand(chan.uno.game.currentPlayer);
	if (handArr.length === 0) {
		return; // game.on end triggers
	}
	if (player.id !== chan.guild.me.id) {
		try {
			await player.interaction.followUp(`Your Uno hand: ${handStr}`, { ephemeral: true });
		} catch (e) {
			await chan.send(`Could not send your hand, ${player}, use \`/hand\` to view it.`);
			errHandler("error", e);
		}
	}
	const str = `${player} is up (${handArr.length}) - Card: ${chan.uno.game.discardedCard.toString()}`;
	const file = { files: [getCardImage(chan.uno.game.discardedCard)] };
	await chan.send(str, file);

	if (chan.uno && player.id === chan.guild.me.id) {
		try {
			await botTurn(chan);
			await nextTurn(chan);
		} catch (e) {
			errHandler("error", e);
		}
	}

	// chan.uno.players.forEach((pla) => {
	// 	const p = chan.uno.game.getPlayer(pla.id);
	// 	console.log(`${pla.id} - ${getHand(p).handArr.length} - ${getHand(p).handStr}`);
	// });
}

module.exports = {
	nextTurn,
	finished,
	reset,
	getHand,
	getPlainCard,
	getCardImage,
};
