const { ButtonBuilder, EmbedBuilder } = require("discord.js");
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
const postPlay = require("./postPlay.js");

// function gcd(a, b) {
// 	if (b === 0) {
// 		return a;
// 	}
// 	return gcd(b, a % b);
// }

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
		await interaction.reply({ content: "No Uno game found. Use `/uno` to start a new game.", ephemeral: true });
		return true;
	}
	return false;
}

async function checkPlayerTurn(interaction) {
	if (interaction.channel.uno.game.currentPlayer.name !== interaction.member.id) {
		await interaction.reply({ content: "It's not your turn.", ephemeral: true });
		return true;
	}
	return false;
}

function createButtons(hand, discard) {
	let buttons = [
		[],
	];
	let i = 0;
	let j = 0;
	for (j = 0; j < hand.length; j += 1) {
		const card = hand[j];
		const color = (card.color) ? card.color.toString() : "YELLOW";
		const style = colorToButtonStyle(color);
		const val = card.value.toString();
		const value = (val === "DRAW_TWO") ? "DT" : (val === "WILD_DRAW_FOUR") ? "WD4" : val;
		const button = new ButtonBuilder()
			.setCustomId(`${j}|${card.toString()}`)
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
	const drawButton = new ButtonBuilder()
		.setCustomId(`${j + 1}|draw`)
		.setLabel("Draw")
		.setStyle(2)
		.setEmoji("🎲");
	buttons = addButton(buttons, drawButton);

	return buttonsToMessageActions(buttons);
}

async function sendHandWithButtons(chan, player, handStr, rows) {
	if (!chan.uno || chan.uno.end) return false;
	const handMsg = await player.interaction.followUp({ content: `Your Uno hand: ${handStr}`, ephemeral: true, components: rows });

	const collector = handMsg.createMessageComponentCollector({
		max: 1,
	});
	const pid = chan.uno.playerCustomId;
	const inter = await new Promise((resolve) => {
		collector.on("collect", resolve);
	});

	console.log(`Collected ${inter.customId}`);
	if (!chan.uno || chan.uno.game.currentPlayer.name !== inter.user.id
		|| chan.uno.playerCustomId !== pid) {
		inter.update({ content: inter.message.content, components: [] });
		inter.followUp({ content: "You can't use old Uno buttons.", ephemeral: true });
		return false;
	}

	const cardArr = inter.customId.split("|")[1].split(" ");

	if (cardArr.length === 1) {
		if (chan.uno.drawn) {
			await inter.update({ content: inter.message.content, components: [] });
			await inter.followUp({ content: "You cannot draw twice in a row.", ephemeral: true });
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
	const card = Card(Values.get(cardArr[1]), Colors.get(cardArr[0]));

	const ret = await postPlay(chan, inter, card);
	if (!ret) return false;

	if (!chan.uno) return false;
	chan.uno.drawn = false;

	return true;
}

async function nextTurn(chan) {
	if (!chan.uno) return;
	const player = chan.uno.players.get(chan.uno.game.currentPlayer.name);

	const { handArr, handStr } = getHand(chan.uno.game.currentPlayer);
	if (handArr.length === 0) {
		return; // game.on end triggers
	}
	const str = `${player.member} (${handArr.length}) is up - Card: ${chan.uno.game.discardedCard.toString()}`;
	const file = getCardImage(chan.uno.game.discardedCard);
	await chan.send({ content: str, files: [file] });
	await botMad(chan);
	chan.uno.playerCustomId = `${player.member.id}+${handStr}`;

	if (player.member.id !== chan.guild.members.me.id) {
		try {
			const rows = createButtons(chan.uno.game.currentPlayer.hand, chan.uno.game.discardedCard);
			if (rows) {
				const clickedButton = await sendHandWithButtons(chan, player, handStr, rows);
				if (clickedButton) {
					await nextTurn(chan);
					return;
				}
			} else {
				await player.interaction.followUp({ content: `Your Uno hand: ${handStr}\n\n**Too many cards to create buttons (max 25) - use \`/play\` command.**`, ephemeral: true });
			}
		} catch (e) {
			await chan.send(`An unknown error occurred, ${player}, use slash comamnds.`);
			errHandler("error", e);
		}
	}

	if (chan.uno && player.member.id === chan.guild.members.me.id) {
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

	const losers = chan.uno.players.filter(p => p.member.id !== winner.name);
	const hands = losers.map(p => getHand(chan.uno.game.getPlayer(p.member.id)));

	const file = path.join(__dirname, "../scores.json");
	try {
		await fs.access(file);
	} catch (e) {
		errHandler("error", e);
		await fs.writeFile(file, JSON.stringify({}, null, 2));
	}
	const users = await fs.readFile(file);
	const userScores = JSON.parse(users);
	if (!userScores[player.member.id]) {
		userScores[player.member.id] = {
			wins: 1,
			loses: 0,
			score,
		};
	} else {
		userScores[player.member.id].wins += 1;
		userScores[player.member.id].score += score;
	}

	const handLines = [];
	for (const hand of hands) {
		const p = chan.uno.players.get(hand.player.name);
		handLines.push(`${p.member}'s final hand (${hand.handArr.length}): ${hand.handStr}`);
		if (!userScores[p.member.id]) {
			userScores[p.member.id] = {
				wins: 0,
				loses: 1,
				score: 0,
			};
		} else {
			userScores[p.member.id].loses += 1;
		}
	}
	handLines.sort((a, b) => a.split(",").length - b.split(",").length);

	const finalColor = chan.uno.game.discardedCard.color.toString();
	await sleep(1000);
	reset(chan);

	const startBtn = new ButtonBuilder()
		.setCustomId("START")
		.setLabel("Start")
		.setStyle(1)
		.setEmoji("⏩");
	let buttons = addButton([
		[],
	], startBtn);

	const quickStartBtn = new ButtonBuilder()
		.setCustomId("QUICK")
		.setLabel("Quick Start")
		.setStyle(3)
		.setEmoji("🏃");
	buttons = addButton(buttons, quickStartBtn);

	const botStartBtn = new ButtonBuilder()
		.setCustomId("BOT")
		.setLabel("Bot Start")
		.setStyle(2)
		.setEmoji("🤖");
	buttons = addButton(buttons, botStartBtn);

	const colors = ["BLUE", "GREEN", "RED", "YELLOW"];

	const hexColors = ["#0095da", "#00a651", "#ed1c24", "#ffde00"];
	// const randColor = colors[Math.floor(Math.random() * colors.length)];
	const embedColor = hexColors[colors.indexOf(finalColor)];

	const winScore = userScores[player.member.id];
	const bar = "-".repeat(40);
	const { wins } = winScore;
	const totalGames = wins + winScore.loses;
	// const winsGCD = gcd(wins, totalGames);
	const winPercent = `${((wins / totalGames) * 100).toFixed(2)}%`;
	const embed = new EmbedBuilder()
		.setDescription(`${bar}\n🥇 ${player.member} wins! Score: ${score}\n${bar}\nWins: ${wins.toLocaleString()}/${totalGames.toLocaleString()} (${winPercent}) - Total score: ${winScore.score.toLocaleString()}\n\n${handLines.join("\n")}`)
		.setColor(embedColor);
	const msg = await chan.send({
		content: "Game finished!",
		embeds: [embed],
		components: buttonsToMessageActions(buttons),
	});
	await fs.writeFile(file, JSON.stringify(userScores, null, 2));
	const startCollector = msg.createMessageComponentCollector({
		max: 1,
	});
	const inter = await new Promise((resolve) => {
		startCollector.on("collect", resolve);
	});
	console.log(`Collected ${inter.customId}`);
	const opts = {};
	if (inter.customId === "QUICK") {
		opts.solo = true;
	}
	if (inter.customId === "BOT") {
		opts.bot = true;
	}
	if (!chan.uno?.running) {
		start(inter, chan, opts, reset, nextTurn, finished);
		return;
	}
	await inter.update({ content: inter.message.content, components: [] });
	await inter.followUp({ content: "Uno is already running.", ephemeral: true });
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
