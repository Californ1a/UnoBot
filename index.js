require("dotenv").config();
const Discord = require("discord.js");
const colors = require("colors");
const send = require("./util/send.js");
const showHand = require("./util/showHand");
const {
	resetGame,
	beginning,
	nextTurn,
} = require("./util/game");
const {
	getCard,
} = require("./util/card");
const doBotTurn = require("./util/doBotTurn.js");

const bot = new Discord.Client();
console.log(colors.red("Starting"));
const token = process.env.DISCORD_TOKEN;

const unoBotMad = ["ARRGH!", "This is getting annoying!", "RATS!", "*sigh*", "You're getting on my nerves >:/", "dfasdfjhweuryaeuwysadjkf", "I'm steamed.", "BAH"];

bot.webhooks = {};
bot.unoAwaitingPlayers = false;

bot.on("message", async (msg) => {
	const hr = msg.createdAt.getHours();
	const min = msg.createdAt.getMinutes();
	const hour = (hr.length < 2) ? `0${hr}` : hr;
	const minute = (min.length < 2) ? `0${min}` : min;
	console.log(`[${hour}:${minute}] ${msg.author.username}: ${msg.content}`);
	if (msg.author.bot) {
		return;
	}
	if (msg.content.startsWith("!uno")) {
		if (msg.channel.unoRunning && !bot.unoAwaitingPlayers) {
			bot.unoAwaitingPlayers = true;
			// return send(msg.channel, "Uno is already running");
			await send(msg.channel, "Do you want to end Uno? [y/N]");
			try {
				const collected = await msg.channel.awaitMessages(r => (r.content === "y" || r.content === "yes" || r.content === "n" || r.content === "no") && msg.author.id === r.author.id, {
					max: 1,
					time: 30000,
					errors: ["time"],
				});
				if (collected.first().content === "n" || collected.first().content === "no") {
					await send(msg.channel, "Uno will continue.");
					bot.unoAwaitingPlayers = false;
					return;
				}
				await resetGame(bot, msg);
				await send(msg.channel, "Uno has been forced ended.");
				bot.unoAwaitingPlayers = false;
				return;
			} catch (e) {
				await send(msg.channel, "Took too long to respond. Uno will continue.");
				bot.unoAwaitingPlayers = false;
				console.log(e);
			}
		} else if (!bot.unoAwaitingPlayers) {
			bot.unoAwaitingPlayers = true;
			if (!msg.channel.unoPlayers) {
				msg.channel.unoPlayers = [];
			}
			const players = msg.channel.unoPlayers;
			players.push(msg.author.id);
			const hooks = await msg.channel.fetchWebhooks();
			const unobot = hooks.find(hook => hook.name === "UnoBot");
			if (!unobot) {
				const hook = await msg.channel.createWebhook("UnoBot", {
					avatar: "https://i.imgur.com/fLMHXKh.jpg",
				});
				const check = await beginning(bot, hook, msg, players);
				bot.unoAwaitingPlayers = false;
				if (check) {
					doBotTurn(bot, msg);
				}
			} else {
				const hook = unobot;
				const check = await beginning(bot, hook, msg, players);
				bot.unoAwaitingPlayers = false;
				if (check) {
					doBotTurn(bot, msg);
				}
			}
		} else {
			await send(msg.channel, "Still waiting for players. You can end Uno after players have joined.");
		}
	} else if (msg.content.startsWith("play")) {
		if (!(typeof msg.channel.unoRunning === "boolean" && msg.channel.unoRunning)) {
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
			bot.unogame.play(card);
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
		const check = await nextTurn(bot, msg);
		if (check) {
			doBotTurn(bot, msg);
		}
	} else if (msg.content === "draw") {
		if (typeof msg.channel.unoRunning === "boolean" && msg.channel.unoRunning) {
			if (msg.author.id !== bot.unogame.currentPlayer.name) {
				await send(bot.webhooks.uno, "It's not your turn");
				return;
			}
			bot.unogame.draw();
			const card = bot.unogame.currentPlayer.hand[bot.unogame.currentPlayer.hand.length - 1];
			const name = (card.color) ? card.toString() : card.value.toString();
			const n2 = (name.includes("WILD_DRAW")) ? `${name.split(" ")[0]} WD4` : (name.includes("DRAW")) ? `${name.split(" ")[0]} DT` : name;
			await send(bot.webhooks.uno, `${msg.author} drew a ${n2.toLowerCase()}`);
		} else {
			await send(msg.channel, "Uno isn't running.");
		}
	} else if (msg.content === "pass") {
		if (typeof msg.channel.unoRunning === "boolean" && msg.channel.unoRunning) {
			if (msg.author.id !== bot.unogame.currentPlayer.name) {
				await send(bot.webhooks.uno, "It's not your turn");
				return;
			}
			try {
				bot.unogame.pass();
			} catch (e) {
				if (e.message.includes("must draw at least one card")) {
					await send(bot.webhooks.uno, "You must draw before passing.");
					return;
				}
			}
			const check = await nextTurn(bot, msg);
			if (check) {
				doBotTurn(bot, msg);
			}
		} else {
			await send(msg.channel, "Uno isn't running.");
		}
	} else if (msg.content === "hand") {
		if (typeof msg.channel.unoRunning === "boolean" && msg.channel.unoRunning) {
			if (msg.channel.unoPlayers.includes(msg.author.id)) {
				showHand(bot, msg, bot.unogame.getPlayer(msg.author.id));
			}
		} else {
			await send(msg.channel, "Uno isn't running.");
		}
	} else if (msg.content === "score") {
		if (!(typeof msg.channel.unoRunning === "boolean" && msg.channel.unoRunning)) {
			await send(msg.channel, "Uno isn't running.");
			return;
		}
		if (!msg.channel.unoPlayers.includes(msg.author.id)) {
			await send(msg.channel, "You are not a participant in this game.");
			return;
		}
		const players = [];
		for (const p of msg.channel.unoPlayers) {
			players.push(bot.unogame.getPlayer(p));
		}
		const score = players.map(player => player.hand).reduce((amount, cards) => {
			amount += cards.reduce((s, c) => s += c.score, 0); // eslint-disable-line
			return amount;
		}, 0);
		await send(bot.webhooks.uno, `Score: ${score}`);
	}
});

// Bot login+info
bot.on("ready", () => {
	console.log("Ready!");
});
bot.on("error", (e) => {
	if (e.message) {
		console.error(colors.green(e.message));
	} else {
		console.error(colors.green(e));
	}
});
bot.on("warn", (e) => {
	console.warn(colors.blue(e));
});
const regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
bot.on("debug", (e) => {
	if (!e.toLowerCase().includes("heartbeat")) { // suppress heartbeat messages
		console.info(colors.grey(e.replace(regToken, "[Redacted]")));
	}
});
bot.login(token);
