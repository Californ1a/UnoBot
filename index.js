require("dotenv").config();
const Discord = require("discord.js");
const colors = require("colors");
const send = require("./util/send.js");
const showHand = require("./util/showHand");
const {
	resetGame,
	beginning,
} = require("./util/game");
const {
	getCard,
	getCardImage,
} = require("./util/card");
const doBotTurn = require("./util/doBotTurn");
const delay = require("./util/delay.js");

const bot = new Discord.Client();
console.log(colors.red("Starting"));
const token = process.env.DISCORD_TOKEN;

const unoBotMad = ["ARRGH!", "This is getting annoying!", "RATS!", "*sigh*", "You're getting on my nerves >:/", "dfasdfjhweuryaeuwysadjkf", "I'm steamed.", "BAH"];

bot.webhooks = {};

bot.on("message", async (msg) => {
	console.log(`${msg.author.username}: ${msg.content}`);
	if (msg.author.bot) {
		return;
	}
	if (msg.content.startsWith("!uno")) {
		if (msg.channel.unoRunning) {
			// return send(msg.channel, "Uno is already running");
			await send(msg.channel, "Do you want to end Uno?");
			try {
				const collected = await msg.channel.awaitMessages(r => (r.content === "y" || r.content === "yes" || r.content === "n" || r.content === "no") && msg.author.id === r.author.id, {
					max: 1,
					time: 30000,
					errors: ["time"],
				});
				if (collected.first().content === "n" || collected.first().content === "no") {
					await send(msg.channel, "Uno will continue.");
					return;
				}
				resetGame(bot, msg);
				await send(msg.channel, "Uno has been forced ended.");
				return;
			} catch (e) {
				await send(msg.channel, "You took too long to respond. Uno will continue.");
			}
		} else {
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
				beginning(bot, hook, msg, players);
			} else {
				const hook = unobot;
				beginning(bot, hook, msg, players);
			}
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
			return;
		}
		try {
			bot.unogame.play(getCard(args, bot.unogame.currentPlayer));
			if (bot.unogame && (bot.unogame.discardedCard.value.toString() === "DRAW_TWO"
					|| bot.unogame.discardedCard.value.toString() === "WILD_DRAW_FOUR")) {
				bot.unogame.draw();
			}
		} catch (e) {
			if (e.message.includes("does not have card")) {
				await send(bot.webhooks.uno, "You do not have that card.");
			} else if (e.message.includes("from discard pile, does not match")) {
				await send(bot.webhooks.uno, "That card can't be played now.");
			} else {
				// else if (e.message.includes("must draw cards")) {
				// 	game.draw();
				// }
				console.error(e);
			}
		}
		if (player.hand.length === 0) {
			// `game.on("end")` gets triggered
			return;
		}
		const betweenLength = Math.floor(Math.random() * unoBotMad.length);
		const rand = betweenLength > Math.floor(unoBotMad.length / 3);
		if (rand && bot.unogame.getPlayer(bot.user.id)
			&& (bot.unogame.discardedCard.value.toString().includes("WILD") || bot.unogame.discardedCard.value.toString().includes("DRAW"))) {
			await send(msg.channel, unoBotMad[Math.floor(Math.random() * unoBotMad.length)]);
		}
		const member = msg.guild.members.cache.get(bot.unogame.currentPlayer.name);
		await send(bot.webhooks.uno, `You're up ${member} - Card: ${bot.unogame.discardedCard.toString()}`, {
			files: [getCardImage(bot.unogame.discardedCard)],
		});
		showHand(bot, msg, bot.unogame.currentPlayer);
		if (bot.unogame.currentPlayer.name === bot.user.id) {
			await delay(2000);
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
			await send(bot.webhooks.uno, `${msg.author} drew a ${name.toLowerCase().replace("_", " ")}`);
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
			const member = msg.guild.members.cache.get(bot.unogame.currentPlayer.name);
			await send(bot.webhooks.uno, `You're up ${member} - Card: ${bot.unogame.discardedCard.toString()}`, {
				files: [getCardImage(bot.unogame.discardedCard)],
			});
			showHand(bot, msg, bot.unogame.currentPlayer);
			if (bot.unogame.currentPlayer.name === bot.user.id) {
				await delay(2000);
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
