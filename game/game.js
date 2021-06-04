const { MessageButton, MessageEmbed } = require("discord.js");
const { Card, Values, Colors } = require("uno-engine");
const fs = require("fs/promises");
const path = require("path");
const { addButton, colorToButtonStyle, buttonsToMessageActions } = require("../util/buttons.js");
const errHandler = require("../util/err.js");
const botTurn = require("./botBrain.js");
const cardImages = require("../data/unocardimages.json");
const sleep = require("./sleep.js");
const start = require("./gameStart.js");
const getPlainCard = require("./getPlainCard.js");
const managePostDraw = require("./managePostDraw.js");
const playedWildCard = require("./playedWild.js");
const getHand = require("./getHand.js");
const { matchCard } = require("./filterHand.js");
const botMad = require("./botMad.js");

function getCardImage(card) {
	const value = card.value.toString();
	const color = card.color.toString();
	return cardImages[color][value];
}

function reset(chan) {
	chan.uno = null;
}

async function checkUnoRunning(interaction) {
	if (!interaction.channel.uno?.running) {
		await interaction.reply("No Uno game found. Use `/uno` to start a new game.", { ephemeral: true });
		return true;
	}
	return false;
}

async function checkPlayerTurn(interaction) {
	if (interaction.channel.uno.game.currentPlayer.name !== interaction.member.id) {
		await interaction.reply("It's not your turn.", { ephemeral: true });
		return true;
	}
	return false;
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
		// NOTE Future select menus:
		// * https://deploy-preview-674--discordjs-guide.netlify.app/interactions/select-menus.html#building-and-sending-select-menus
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
		if (!matchCard(card, discard)) {
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

	return buttonsToMessageActions(buttons);
}

async function sendHandWithButtons(chan, player, handStr, rows) {
	if (!chan.uno || chan.uno.end) return false;
	const handMsg = await player.interaction.followUp(`Your Uno hand: ${handStr}`, { ephemeral: true, components: rows });

	const collector = handMsg.createMessageComponentInteractionCollector(() => true, {
		max: 1,
	});
	const pid = chan.uno.playerCustomID;
	const inter = await new Promise((resolve) => {
		collector.on("collect", resolve);
	});

	console.log(`Collected ${inter.customID}`);
	if (!chan.uno || chan.uno.game.currentPlayer.name !== inter.user.id
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

		const postDraw = await managePostDraw(chan, inter, player, pid);
		return postDraw;
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
	if (!chan.uno) {
		await inter.followUp(`${inter.member} played ${getPlainCard(card)}`, {
			allowedMentions: {
				users: [],
			},
		});
		return false;
	}
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
	});
	if (!chan.uno) return false;
	chan.uno.drawn = false;

	await botMad(chan);
	return true;
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
					await nextTurn(chan);
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
}

async function finished(chan, err, winner, score) {
	chan.uno.end = true;
	if (err) {
		errHandler("error", err);
	}
	const player = chan.uno.players.get(winner.name);

	const losers = chan.uno.players.filter(p => p.id !== winner.name);
	const hands = losers.map(p => getHand(chan.uno.game.getPlayer(p.id)));

	const file = path.join(__dirname, "../scores.json");
	try {
		await fs.access(file);
	} catch (e) {
		errHandler("error", e);
		await fs.writeFile(file, JSON.stringify({}, null, 2));
	}
	const users = await fs.readFile(file);
	const userScores = JSON.parse(users);
	if (!userScores[player.id]) {
		userScores[player.id] = {
			wins: 1,
			loses: 0,
			score,
		};
	} else {
		userScores[player.id].wins += 1;
		userScores[player.id].score += score;
	}

	const handLines = [];
	for (const hand of hands) {
		const p = chan.uno.players.get(hand.player.name);
		handLines.push(`${p}'s final hand (${hand.handArr.length}): ${hand.handStr}`);
		if (!userScores[p.id]) {
			userScores[p.id] = {
				wins: 0,
				loses: 1,
				score: 0,
			};
		} else {
			userScores[p.id].loses += 1;
		}
	}
	handLines.sort((a, b) => a.split(",").length - b.split(",").length);

	const finalColor = chan.uno.game.discardedCard.color.toString();
	await sleep(1000);
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

	const colors = ["BLUE", "GREEN", "RED", "YELLOW"];

	const hexColors = ["#0095da", "#00a651", "#ed1c24", "#ffde00"];
	// const randColor = colors[Math.floor(Math.random() * colors.length)];
	const embedColor = hexColors[colors.indexOf(finalColor)];

	const winScore = userScores[player.id];
	const bar = "-".repeat(40);
	const embed = new MessageEmbed()
		.setDescription(`${bar}\n🥇 ${player} wins! Score: ${score}\n${bar}\nWins: ${winScore.wins}/${winScore.wins + winScore.loses} - Total score: ${winScore.score}\n\n${handLines.join("\n")}`)
		.setColor(embedColor);
	const msg = await chan.send("Game finished!", {
		embed,
		components: buttonsToMessageActions(buttons),
	});
	await fs.writeFile(file, JSON.stringify(userScores, null, 2));
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
	checkUnoRunning,
	checkPlayerTurn,
};
