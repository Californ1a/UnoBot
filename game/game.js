const { MessageButton, MessageEmbed } = require("discord.js");
const { Card, Values, Colors } = require("uno-engine");
const { addButton, colorToButtonStyle, buttonsToMessageActions } = require("../util/buttons.js");
const errHandler = require("../util/err.js");
const botTurn = require("./botBrain.js");
const cardImages = require("../data/unocardimages.json");
const sleep = require("./sleep.js");
const start = require("./gameStart.js");

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

function createButtons(hand, discard) {
	let buttons = [
		[],
	];
	let i = 0;
	for (const card of hand) {
		const color = (card.color) ? card.color.toString() : "YELLOW";
		const style = colorToButtonStyle(color);
		const val = card.value.toString();
		const value = (val === "DRAW_TWO") ? "DT" : (val === "WILD_DRAW_FOUR") ? "WD4" : val;
		// let button;
		// if (value === "WD4" || value === "WILD") {
		// 	button = new MessageSelectMenu()
		// 		.setCustomID(val)
		// 		.setPlaceholder(value)
		// 		.addOptions([{
		// 			label: "Blue",
		// 			description: "Color selection",
		// 			value: "BLUE",
		// 		}, {
		// 			label: "Green",
		// 			description: "Color selection",
		// 			value: "GREEN",
		// 		}, {
		// 			label: "Red",
		// 			description: "Color selection",
		// 			value: "RED",
		// 		}, {
		// 			label: "Yellow",
		// 			description: "Color selection",
		// 			value: "YELLOW",
		// 		}]);
		// } else {
		const button = new MessageButton()
			.setCustomID(card.toString())
			.setLabel(value)
			.setStyle(style);
		// }
		const match = (card.color === discard.color
			|| card.value === discard.value
			|| card.value.toString().includes("WILD"));
		if (!match) {
			button.setDisabled(true);
		}
		buttons[i].push(button);
		if (buttons[i].length === 5) {
			i += 1;
			buttons[i] = [];
		}
		if (buttons.length === 6) {
			return null;
		}
	}
	const drawButton = new MessageButton()
		.setCustomID("draw")
		.setLabel("Draw")
		.setStyle("SECONDARY")
		.setEmoji("🎲");
	buttons = addButton(buttons, drawButton);
	// const passButton = new MessageButton()
	// 	.setCustomID("pass")
	// 	.setLabel("Pass")
	// 	.setStyle("SECONDARY")
	// 	.setEmoji("⏭️");
	// buttons = addButton(buttons, passButton);
	return buttonsToMessageActions(buttons);
}

async function playedWildCard(inter, chan, value, pid) {
	const colors = ["Blue", "Green", "Red", "Yellow"];
	const buttons = colors.reduce((a, c) => addButton(a, new MessageButton()
		.setCustomID(c.toUpperCase())
		.setLabel(c)
		.setStyle(colorToButtonStyle(c.toUpperCase()))), [
		[],
	]);
	console.log(inter.type);
	await inter.update(inter.message.content, {
		components: buttonsToMessageActions(buttons),
	});
	const colorCollector = inter.message.createMessageComponentInteractionCollector(() => true, {
		max: 1,
	});
	const inter2 = await new Promise((resolve) => {
		colorCollector.on("collect", resolve);
	});
	console.log(`Collected ${inter2.customID}`);
	if (chan.uno.game.currentPlayer.name !== inter.user.id
		|| chan.uno.playerCustomID !== pid) {
		inter.update(inter.message.content, { components: [] });
		inter.followUp("You can't use old buttons.", { ephemeral: true });
		return false;
	}

	let card = Card(Values.get(value), Colors.get(inter2.customID));
	const p = chan.uno.game.currentPlayer;
	card = p.getCardByValue(Values.get(value));
	card.color = Colors.get(Colors.get(inter2.customID));
	const drawn = { didDraw: false };
	chan.uno.game.play(card);

	if (chan.uno.game.discardedCard.value.toString() === "WILD_DRAW_FOUR") {
		drawn.player = chan.uno.players.get(chan.uno.game.currentPlayer.name);
		chan.uno.game.draw();
		drawn.didDraw = true;
	}

	await inter2.update(card.toString(), { components: [] });
	chan.uno.players.get(p.name).interaction = inter2;
	await inter2.followUp(`${inter2.member} played ${getPlainCard(card)}${(drawn.didDraw) ? `, ${drawn.player} drew 4 cards.` : ""}`, {
		allowedMentions: {
			users: [],
		},
	});
	if (!chan.uno) return false;
	chan.uno.drawn = false;
	return true;
}

async function sendHandWithButtons(chan, player, handStr, rows) {
	const handMsg = await player.interaction.followUp(`Your Uno hand: ${handStr}`, { ephemeral: true, components: rows });
	// console.log(handMsg);
	const collector = handMsg.createMessageComponentInteractionCollector(() => true, {
		max: 1,
	});
	const pid = chan.uno.playerCustomID;
	const inter = await new Promise((resolve) => {
		collector.on("collect", resolve);
	});
	// await i.deferUpdate();
	// console.log(i);

	console.log(`Collected ${inter.customID}`);
	if (chan.uno.game.currentPlayer.name !== inter.user.id
		|| chan.uno.playerCustomID !== pid) {
		inter.update(inter.message.content, { components: [] });
		inter.followUp("You can't use old Uno buttons.", { ephemeral: true });
		return false;
	}
	const cardArr = inter.customID.split(" ");

	if (cardArr.length === 1) {
		if (chan.uno.drawn) {
			await inter.update(inter.message.content, { components: [] });
			await inter.followUp("You cannot draw twice in a row.", { ephemeral: true });
			return false;
		}
		chan.uno.game.draw();

		const card = chan.uno.game.currentPlayer.hand[chan.uno.game.currentPlayer.hand.length - 1];
		const name = (card.color) ? card.toString() : card.value.toString();
		const n2 = (name.includes("WILD_DRAW")) ? "WD4" : (name.includes("DRAW")) ? `${name.split(" ")[0]} DT` : name;
		colorToButtonStyle(name.split(" ")[0]);

		const cardBtn = new MessageButton()
			.setCustomID(card.toString())
			.setLabel((n2.split(" ")[1] ? n2.split(" ")[1] : n2))
			.setStyle(colorToButtonStyle(name.split(" ")[0]));

		const match = (card.color === chan.uno.game.discardedCard.color
			|| card.value === chan.uno.game.discardedCard.value
			|| card.value.toString().includes("WILD"));
		if (!match) {
			cardBtn.setDisabled(true);
		}

		let buttons = addButton([
			[],
		], cardBtn);

		const passBtn = new MessageButton()
			.setCustomID("PASS")
			.setLabel("Pass")
			.setStyle("SECONDARY")
			.setEmoji("⏭️");
		buttons = addButton(buttons, passBtn);

		await inter.update(`You drew a ${n2.toLowerCase()}`, {
			ephemeral: true,
			components: buttonsToMessageActions(buttons),
		});
		await chan.send(`${inter.member} drew`, { allowedMentions: { users: [] } });

		const passCollector = inter.message.createMessageComponentInteractionCollector(() => true, {
			max: 1,
		});
		const inter2 = await new Promise((resolve) => {
			passCollector.on("collect", resolve);
		});
		console.log(`Collected ${inter2.customID}`);
		if (chan.uno.game.currentPlayer.name !== inter2.member.id) {
			await inter2.update(inter2.message.content, { components: [] });
			await inter2.followUp("It's not your turn.", { ephemeral: true });
			return false;
		}
		if (chan.uno.playerCustomID !== pid) {
			inter2.update(inter.message.content, { components: [] });
			inter2.followUp("You can't use old Uno buttons.", { ephemeral: true });
			return false;
		}
		if (inter2.customID === "PASS") {
			chan.uno.game.pass();
			await inter2.update("Passed", { components: [] });
			await chan.send(`${inter2.member} passed`, { allowedMentions: { users: [] } });
			chan.uno.drawn = false;
			return true;
		}
		if (inter2.customID.includes("NO_COLOR")) {
			const ret = await playedWildCard(inter2, chan, card.value.toString(), pid);
			return ret;
		}

		await inter2.update(inter.customID, { components: [] });
		const drawn = { didDraw: false };
		chan.uno.game.play(card);
		if (!chan.uno) return false;
		if (chan.uno.game.discardedCard.value.toString() === "DRAW_TWO") {
			drawn.player = chan.uno.players.get(chan.uno.game.currentPlayer.name);
			chan.uno.game.draw();
			drawn.didDraw = true;
		}
		player.interaction = inter2;
		const c = chan.uno.game.discardedCard.value.toString().toLowerCase();
		await inter2.followUp(`${inter2.member} played ${getPlainCard(card)}${(drawn.didDraw) ? `, ${drawn.player} drew ${(c.includes("two") ? "2" : "4")} cards.` : ""}`, {
			allowedMentions: {
				users: [],
			},
			ephemeral: false,
		});
		if (!chan.uno) return false;
		chan.uno.drawn = false;
		return true;
	}
	if (cardArr[0] === "NO_COLOR") {
		const ret = await playedWildCard(inter, chan, cardArr[1], pid);
		return ret;
	}
	console.log("inter.customID", inter.customID);
	await inter.update(inter.customID, { components: [] });
	const drawn = { didDraw: false };
	const card = Card(Values.get(cardArr[1]), Colors.get(cardArr[0]));
	chan.uno.game.play(card);
	if (!chan.uno) return false;
	if (chan.uno.game.discardedCard.value.toString() === "DRAW_TWO") {
		drawn.player = chan.uno.players.get(chan.uno.game.currentPlayer.name);
		chan.uno.game.draw();
		drawn.didDraw = true;
	}
	player.interaction = inter;
	console.log("getPlainCard(card)", getPlainCard(card));
	await inter.followUp(`${inter.member} played ${getPlainCard(card)}${(drawn.didDraw) ? `, ${drawn.player} drew 2 cards.` : ""}`, {
		allowedMentions: {
			users: [],
		},
		ephemeral: false,
	});
	if (!chan.uno) return false;
	chan.uno.drawn = false;
	return true;
	// });
	// collector.on("end", (collected) => {
	// 	if (collected.size === 0) {
	// 		resolve(false);
	// 	}
	// });
	// });
	// return playedCard;
}

async function nextTurn(chan) {
	if (!chan.uno) return;
	const player = chan.uno.players.get(chan.uno.game.currentPlayer.name);

	const { handArr, handStr } = getHand(chan.uno.game.currentPlayer);
	if (handArr.length === 0) {
		return; // game.on end triggers
	}
	const str = `${player} (${handArr.length}) is up - Card: ${chan.uno.game.discardedCard.toString()}`;
	const file = { files: [getCardImage(chan.uno.game.discardedCard)] };
	await chan.send(str, file);

	chan.uno.playerCustomID = `${player.id}+${handStr}`;

	if (player.id !== chan.guild.me.id) {
		try {
			const rows = createButtons(chan.uno.game.currentPlayer.hand, chan.uno.game.discardedCard);
			if (rows) {
				const clickedButton = await sendHandWithButtons(chan, player, handStr, rows);
				if (clickedButton) {
					nextTurn(chan);
					return;
				}
			} else {
				await player.interaction.followUp(`Your Uno hand: ${handStr}\nToo many cards to create buttons - use \`/play\` command.`, { ephemeral: true });
			}
		} catch (e) {
			await chan.send(`An error occurred, ${player}, use slash comamnds.`);
			errHandler("error", e);
		}
	}

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

async function finished(chan, err, winner, score) {
	if (err) {
		errHandler("error", err);
	}
	const player = chan.uno.players.get(winner.name);

	const losers = chan.uno.players.filter(p => p.id !== winner.name);
	const hands = losers.map(p => getHand(chan.uno.game.getPlayer(p.id)));

	const handLines = [];
	for (const hand of hands) {
		handLines.push(`${chan.uno.players.get(hand.player.name)}'s final hand (${hand.handArr.length}): ${hand.handStr}`);
	}
	handLines.sort((a, b) => a.split(",").length - b.split(",").length);

	const finalColor = chan.uno.game.discardedCard.color.toString();
	reset(chan);

	const startBtn = new MessageButton()
		.setCustomID("START")
		.setLabel("Start")
		.setStyle("PRIMARY")
		.setEmoji("⏩");
	let buttons = addButton([
		[],
	], startBtn);

	const quickStartBtn = new MessageButton()
		.setCustomID("QUICK")
		.setLabel("Quick Start")
		.setStyle("SUCCESS")
		.setEmoji("🏃");
	buttons = addButton(buttons, quickStartBtn);

	const botStartBtn = new MessageButton()
		.setCustomID("BOT")
		.setLabel("Bot Start")
		.setStyle("SECONDARY")
		.setEmoji("🤖");
	buttons = addButton(buttons, botStartBtn);

	await sleep(1000);

	const colors = ["BLUE", "GREEN", "RED", "YELLOW"];

	const hexColors = ["#0095da", "#00a651", "#ed1c24", "#ffde00"];
	// const randColor = colors[Math.floor(Math.random() * colors.length)];
	const embedColor = hexColors[colors.indexOf(finalColor)];

	const bar = "-".repeat(40);
	const embed = new MessageEmbed()
		.setDescription(`${bar}\n🥇 ${player} wins! Score: ${score}\n${bar}\n\n${handLines.join("\n")}`)
		.setColor(embedColor);
	const msg = await chan.send("Game finished!", {
		embed,
		components: buttonsToMessageActions(buttons),
	});
	const startCollector = msg.createMessageComponentInteractionCollector(() => true, {
		max: 1,
	});
	const inter = await new Promise((resolve) => {
		startCollector.on("collect", resolve);
	});
	console.log(`Collected ${inter.customID}`);
	const opts = {};
	if (inter.customID === "QUICK") {
		opts.solo = true;
	}
	if (inter.customID === "BOT") {
		opts.bot = true;
	}
	if (!chan.uno?.running) {
		start(inter, chan, opts, reset, nextTurn, finished);
		return;
	}
	await inter.update(inter.message.content, { components: [] });
	await inter.followUp("Uno is already running.", { ephemeral: true });
}

module.exports = {
	nextTurn,
	finished,
	reset,
	getHand,
	getPlainCard,
	getCardImage,
};
