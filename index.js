require("dotenv").config();
const { Client, Intents, Collection } = require("discord.js"); // v13
const colors = require("colors");
const { Game, Card, Values, Colors } = require("uno-engine");
const util = require("util");
const errHandler = require("./err.js");
const cardImages = require("./unocardimages.json");

const sleep = util.promisify(setTimeout);
const bot = new Client({ intents: [Intents.ALL] });
console.log(colors.red("Starting"));
const token = process.env.DISCORD_TOKEN;

function getTimestamp(date) {
	const hr = date.getHours();
	const min = date.getMinutes();
	const hour = (`${hr}`.length < 2) ? `0${hr}` : hr;
	const minute = (`${min}`.length < 2) ? `0${min}` : min;
	return `${hour}:${minute}`;
}

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

async function nextTurn(chan) {
	const currentPlayer = chan.uno.players.get(chan.uno.game.currentPlayer.name);

	const { handArr, handStr } = getHand(chan.uno.game.currentPlayer);
	if (handArr.length === 0) {
		return; // game.on end triggers
	}
	try {
		await currentPlayer.interaction.followUp(`Your Uno hand: ${handStr}`, { ephemeral: true });
	} catch (e) {
		await chan.send(`Could not send your hand, ${currentPlayer}, use \`/hand\` to view it.`);
		errHandler("error", e);
	}

	const str = `${currentPlayer} is up (${handArr.length}) - Card: ${chan.uno.game.discardedCard.toString()}`;
	const file = { files: [getCardImage(chan.uno.game.discardedCard)] };
	await chan.send(str, file);

	// chan.uno.players.forEach((pla) => {
	// 	const p = chan.uno.game.getPlayer(pla.id);
	// 	console.log(`${pla.id} - ${getHand(p).handArr.length} - ${getHand(p).handStr}`);
	// });
}

bot.on("message", async (msg) => {
	console.log(`[${getTimestamp(msg.createdAt)}] ${msg.author.username}: ${msg.cleanContent}`);
	if (msg.author.bot) return;
	if (!msg.content.startsWith("!")) return;

	if (!bot.application?.owner) await bot.application?.fetch();
	// console.log(bot.application);

	const cmd = msg.content.slice(1).split(" ")[0].toLowerCase();
	if (cmd === "deploy" && (msg.author.id === bot.application?.owner.id || bot.application?.owner.members.has(msg.author.id))) {
		const data = [{
			name: "uno",
			description: "Start Uno!",
			options: [{
				name: "end",
				type: "BOOLEAN",
				description: "Force end a currently-running game.",
				required: false,
			}],
		}, {
			name: "score",
			description: "View your score",
		}, {
			name: "play",
			description: "Play a card",
			options: [{
				name: "color",
				type: "STRING",
				description: "The color of the card to play",
				required: true,
				choices: [{
					name: "Blue",
					value: "BLUE",
				}, {
					name: "Green",
					value: "GREEN",
				}, {
					name: "Red",
					value: "RED",
				}, {
					name: "Yellow",
					value: "YELLOW",
				}],
			}, {
				name: "value",
				type: "STRING",
				description: "The value of the card to play",
				required: true,
				choices: [{
					name: "0",
					value: "ZERO",
				}, {
					name: "1",
					value: "ONE",
				}, {
					name: "2",
					value: "TWO",
				}, {
					name: "3",
					value: "THREE",
				}, {
					name: "4",
					value: "FOUR",
				}, {
					name: "5",
					value: "FIVE",
				}, {
					name: "6",
					value: "SIX",
				}, {
					name: "7",
					value: "SEVEN",
				}, {
					name: "8",
					value: "EIGHT",
				}, {
					name: "9",
					value: "NINE",
				}, {
					name: "Skip",
					value: "SKIP",
				}, {
					name: "Reverse",
					value: "REVERSE",
				}, {
					name: "Draw Two",
					value: "DRAW_TWO",
				}, {
					name: "Wild",
					value: "WILD",
				}, {
					name: "Wild Draw Four",
					value: "WILD_DRAW_FOUR",
				}],
			}],
		}, {
			name: "pass",
			description: "Pass your turn",
		}, {
			name: "hand",
			description: "View your hand or count cards in another player's hand",
			options: [{
				name: "player",
				type: "USER",
				description: "Count cards remaining in this player's hand",
				required: false,
			}],
		}, {
			name: "draw",
			description: "Draw a card",
		}, {
			name: "join",
			description: "Join an Uno game",
		}];

		await msg.guild.commands.set(data);
		await msg.reply("Success");
		// console.log(bot.application);
	}
});

bot.on("interaction", async (interaction) => {
	if (!interaction.isCommand()) return;
	let opts = {};
	let optsArr = [];
	let optString = "";
	if (interaction.options.length > 0) {
		optsArr = interaction.options.map(opt => ({
			[opt.name]: opt.value,
		}));
		opts = optsArr.reduce((acc, obj) => {
			acc[Object.keys(obj)[0]] = obj[Object.keys(obj)[0]];
			return acc;
		}, {});
		if (optsArr.length === 1) {
			[optsArr] = optsArr;
		}
		optString = JSON.stringify(optsArr).replace(/(:|,)/gm, "$1 ");
	}
	console.log(`[${getTimestamp(interaction.createdAt)}] ${interaction.user.username}: /${interaction.commandName} ${optString}`);
	// console.log(interaction);
	const chan = interaction.channel;
	if (interaction.commandName === "uno") {
		if (chan.uno?.running && !chan.uno?.awaitingPlayers) {
			if (opts.end && interaction.member.id === chan.uno.ownerID) {
				chan.uno = null;
				interaction.reply("Uno has been force ended.");
				return;
			}
		}
		if (chan.uno?.running) {
			await interaction.reply("An Uno game is already running in this channel.", { ephemeral: true });
			return;
		}
		chan.uno = { running: true, ownerID: interaction.member.id };
		chan.uno.awaitingPlayers = true;
		chan.uno.players = new Collection();
		chan.uno.players.set(interaction.member.id, interaction.member);
		chan.uno.players.get(interaction.member.id).interaction = interaction;

		await interaction.reply("An Uno game will be started in 30s! Type `/join` to join.");
		await sleep(30 * 1000);
		chan.uno.awaitingPlayers = false;
		const players = chan.uno.players.map(p => p.id);
		if (players.length < 2) {
			// TODO: Bot joins
			await interaction.followUp("Not enough players joined, game not started.");
			chan.uno = null;
			return;
		}
		// await interaction.followUp("Game will now start!");
		chan.uno.game = new Game(players);

		await nextTurn(chan);
		chan.uno.game.on("end", async (err, winner, score) => {
			console.log("winner", winner);
			const player = chan.uno.players.get(winner.name);

			const losers = chan.uno.players.filter(p => p.id !== winner.name);
			const hands = losers.map(p => getHand(chan.uno.game.getPlayer(p.id)));

			const handLines = [];
			for (const hand of hands) {
				handLines.push(`${chan.uno.players.get(hand.player.name)}'s final hand: ${hand.handStr}`);
			}
			await chan.send(`Game finished!\n${"-".repeat(35)}\n${player} wins! Score: ${score}\n${"-".repeat(35)}\n\n${handLines.join("\n")}`);
			chan.uno = null;
		});
	} else if (interaction.commandName === "join") {
		if (!chan.uno?.running) {
			await interaction.reply("No Uno game found. Use `/uno` to start a new game.", { ephemeral: true });
			return;
		}
		if (chan.uno.players.has(interaction.member.id)) {
			await interaction.reply("You are already in the current game.", { ephemeral: true });
			return;
		}
		if (!chan.uno.awaitingPlayers) {
			await interaction.reply("You cannot join mid-game, wait for it to end and use `/uno` to start a new one.", { ephemeral: true });
			return;
		}
		if (chan.uno.players.size === 10) {
			await interaction.reply("The maximum number of players has already joined.", { ephemeral: true });
		}
		chan.uno.players.set(interaction.member.id, interaction.member);
		chan.uno.players.get(interaction.member.id).interaction = interaction;
		await interaction.reply(`Player ${chan.uno.players.size}`);
	} else if (interaction.commandName === "draw") {
		if (!chan.uno?.running) {
			await interaction.reply("No Uno game found. Use `/uno` to start a new game.", { ephemeral: true });
			return;
		}
		if (chan.uno.game.currentPlayer.name !== interaction.member.id) {
			await interaction.reply("It's not your turn.", { ephemeral: true });
			return;
		}
		if (chan.uno.drawn) {
			await interaction.reply("You cannot draw twice in a row.", { ephemeral: true });
			return;
		}
		chan.uno.drawn = true;
		chan.uno.game.draw();
		const card = chan.uno.game.currentPlayer.hand[chan.uno.game.currentPlayer.hand.length - 1];
		const name = (card.color) ? card.toString() : card.value.toString();
		const n2 = (name.includes("WILD_DRAW")) ? "WD4" : (name.includes("DRAW")) ? `${name.split(" ")[0]} DT` : name;
		await interaction.reply(`You drew a ${n2.toLowerCase()}`, { ephemeral: true });
	} else if (interaction.commandName === "hand") {
		if (!chan.uno?.running) {
			await interaction.reply("No Uno game found. Use `/uno` to start a new game.", { ephemeral: true });
			return;
		}
		const user = interaction.options[0]?.user;
		if (user) {
			const player = chan.uno.game.getPlayer(user.id);
			if (!player) {
				await interaction.reply(`${user} is not part of the game.`, { ephemeral: true });
				return;
			}
			await interaction.reply(`${user} has ${player.hand.length} cards remaining.`, { ephemeral: true });
			return;
		}
		const player = chan.uno.game.getPlayer(interaction.member.id);
		if (!player) {
			await interaction.reply("You aren't in the game.", { ephemeral: true });
			return;
		}
		const { handStr } = getHand(player);
		await interaction.reply(`Your Uno hand: ${handStr}`, { ephemeral: true });
	} else if (interaction.commandName === "play") {
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
		try {
			chan.uno.game.play(card);

			if (chan.uno.game.discardedCard.value.toString() === "DRAW_TWO"
				|| chan.uno.game.discardedCard.value.toString() === "WILD_DRAW_FOUR") {
				chan.uno.game.draw();
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
		await interaction.reply(`Played ${getPlainCard(card)}`);
		if (!chan.uno) return;
		chan.uno.drawn = false;
		await nextTurn(chan);
	} else if (interaction.commandName === "pass") {
		if (!chan.uno?.running) {
			await interaction.reply("No Uno game found. Use `/uno` to start a new game.", { ephemeral: true });
			return;
		}
		if (chan.uno.game.currentPlayer.name !== interaction.member.id) {
			await interaction.reply("It's not your turn.", { ephemeral: true });
			return;
		}
		const player = chan.uno.game.currentPlayer;
		try {
			chan.uno.game.pass();
		} catch (e) {
			if (e.message.includes("must draw at least one card")) {
				await interaction.reply("You must draw before passing.", { ephemeral: true });
				return;
			}
		}
		chan.uno.players.get(player.name).interaction = interaction;
		await interaction.reply("Passed");
		chan.uno.drawn = false;
		await nextTurn(chan);
	}
});

// Bot login+info
bot.on("ready", () => {
	console.log("Ready!");
});
bot.on("error", (...args) => {
	errHandler("error", ...args);
});
bot.on("warn", (...args) => {
	errHandler("warn", ...args);
});
const regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
bot.on("debug", (e) => {
	if (!e.toLowerCase().includes("heartbeat")) { // suppress heartbeat messages
		console.info(colors.grey(e.replace(regToken, "[Redacted]")));
	}
});
bot.login(token);
