// #region discord.js
require("dotenv").config();
const Discord = require("discord.js");
const colors = require("colors");
const {
	Game,
	Card,
	Colors,
	Values,
} = require("uno-engine");
const cardImages = require("./unocardimages.json");

const bot = new Discord.Client();
console.log(colors.red("Starting"));
const token = process.env.DISCORD_TOKEN;

function sendM(chan, msg, options) {
	return new Promise((resolve, reject) => {
		if (options) {
			chan.send(msg, options).then((m) => {
				resolve(m);
			}).catch((e) => {
				reject(e);
			});
		} else {
			chan.send(msg).then((m) => {
				resolve(m);
			}).catch((e) => {
				reject(e);
			});
		}
	});
}

function send(chan, msg, options) {
	return new Promise((resolve, reject) => {
		const channel = (chan.content) ? ((chan.guild) ? chan.channel : chan.author) : chan;
		sendM(channel, msg, options).then((m) => {
			resolve(m);
		}).catch((e) => {
			reject(e);
		});
	});
}
// #endregion

const unoBotThink = ["*evil grin*..", "You'll pay for that...", "woooot..", "Dum de dum..", "hehe..", "Oh boy..", "hrm..", "Lets see here..", "uh..", "Hmm, you're good..", "Decisions decisions..", "Ahah!...", "Eeny Meeny Miney Moe..", "LOL..", "Oh dear..", "Errr..", "Ah me brain!-..."];
const unoBotMad = ["ARRGH!", "This is getting annoying!", "RATS!", "*sigh*", "You're getting on my nerves >:/", "dfasdfjhweuryaeuwysadjkf", "I'm steamed.", "BAH"];

function getCardImage(card) {
	const value = card.value.toString();
	const color = card.color.toString();
	// if (value === "WILD" || value === "WILD_DRAW_FOUR") {
	// 	return cardImages[value];
	// }
	return cardImages[color][value];
}

// #region uno setup
let game;

function getCard(args, p) {
	// #region Shorthand for quick testing games
	switch (args[0]) {
		case "r":
			args[0] = "red";
			break;
		case "g":
			args[0] = "green";
			break;
		case "y":
			args[0] = "yellow";
			break;
		case "b":
			args[0] = "blue";
			break;
		case "w":
			args[0] = "wild";
			break;
		case "wd4":
			args[0] = "wild_draw_four";
			break;
		default:
			throw new Error("Woops");
	}
	switch (args[1]) {
		case "r":
			args[1] = (args[0].includes("wild")) ? "red" : "reverse";
			break;
		case "s":
			args[1] = "skip";
			break;
		case "y":
			args[1] = (args[0].includes("wild")) ? "yellow" : args[1];
			break;
		case "b":
			args[1] = (args[0].includes("wild")) ? "blue" : args[1];
			break;
		case "g":
			args[1] = (args[0].includes("wild")) ? "green" : args[1];
			break;
		case "0":
			args[1] = "zero";
			break;
		case "1":
			args[1] = "one";
			break;
		case "2":
			args[1] = "two";
			break;
		case "3":
			args[1] = "three";
			break;
		case "4":
			args[1] = "four";
			break;
		case "5":
			args[1] = "five";
			break;
		case "6":
			args[1] = "six";
			break;
		case "7":
			args[1] = "seven";
			break;
		case "8":
			args[1] = "eight";
			break;
		case "9":
			args[1] = "nine";
			break;
		case "dt":
			args[1] = "draw_two";
			break;
		case "w":
			args[1] = "wild";
			break;
		case "wd4":
			args[1] = "wild_draw_four";
			break;
		default:
			throw new Error("Woops");
	}
	// #endregion
	args[0] = args[0].toUpperCase();
	args[1] = args[1].toUpperCase();
	const c = (Colors.get(args[0])) ? Colors.get(args[0]) : Colors.get(args[1]);
	const v = (Values.get(args[1])) ? Values.get(args[1]) : Values.get(args[0]);
	// console.log(args[0], args[1]);
	// console.log(c, v);
	let card = Card(v, c);
	if (args.includes("WILD") || args.includes("WILD_DRAW_FOUR")) {
		card = p.getCardByValue(v);
		card.color = Colors.get(c);
	}
	return card;
}

function resetGame(msg) {
	msg.channel.unoPlayers = [];
	msg.channel.unoRunning = false;
	game = null;
	bot.webhooks.uno.delete().then(() => {
		bot.webhooks = {};
	});
}

function showHand(msg, player) {
	let p = player;
	if (player.name) {
		p = player.name;
	}
	if (msg.guild.members.cache.get(p).user.bot) {
		return;
	}
	const handArr = game.getPlayer(p).hand; // .toString().toLowerCase().split(",");
	const hand = [];
	for (const card of handArr) {
		if (card.value.toString() === "WILD") {
			hand.push("wild");
		} else if (card.value.toString() === "WILD_DRAW_FOUR") {
			hand.push("WD4");
		} else if (card.value.toString() === "DRAW_TWO") {
			hand.push(`${card.color.toString().toLowerCase()} DT`);
		} else {
			hand.push(card.toString().toLowerCase());
		}
	}
	const member = msg.guild.members.cache.get(p);
	send(bot.webhooks.uno, `${member} Your Uno hand: ${hand.join(", ")}`); // TODO: send privately to `member` when inline pm is available - direct msg works but is annoying
}

const countOccurrences = (arr, val) => {
	if (!val) {
		return arr.reduce((prev, curr) => (prev[curr] = ++prev[curr] || 1, prev), {}); // eslint-disable-line
	}
	return arr.reduce((a, v) => (v === val ? a + 1 : a), 0);
};

const doBotTurn = (msg) => {
	if (Math.floor(Math.random() * unoBotThink.length) < Math.floor(unoBotThink.length / 3)) {
		send(msg.channel, unoBotThink[Math.floor(Math.random() * unoBotThink.length)]);
	}
	setTimeout(() => {
		const player = game.currentPlayer;
		let currentHand = player.hand;
		let botMatchingHand = currentHand.filter(card => (card.color === game.discardedCard.color
			|| card.value === game.discardedCard.value
			|| card.value.toString().includes("WILD")));
		if (botMatchingHand.length === 0) {
			send(msg.channel, "draw");
			game.draw();
			console.log("bot drew");
			// console.log(`\n\n${game.currentPlayer.hand[game.currentPlayer.hand.length - 1]}\n\n`);
			// console.log(`\n\n${botMatchingHand}\n\n`);
			currentHand = game.currentPlayer.hand;
			botMatchingHand = currentHand.filter(card => (card.color === game.discardedCard.color
				|| card.value === game.discardedCard.value
				|| card.value.toString().includes("WILD")));
			if (botMatchingHand.length === 0) {
				// console.log(`\n\n${botMatchingHand}\n\n`);
				setTimeout(() => {
					send(msg.channel, "pass");
					game.pass();
					console.log("bot passed");
					setTimeout(() => {
						if (player.hand.length !== 0) {
							const member = msg.guild.members.cache.get(game.currentPlayer.name);
							send(bot.webhooks.uno, `You're up ${member} - Card: ${game.discardedCard.toString()}`, {
								files: [getCardImage(game.discardedCard)],
							}).then(() => {
								showHand(msg, game.currentPlayer);
								if (game.currentPlayer.name === bot.user.id) {
									setTimeout(() => {
										doBotTurn(msg);
									}, 2000);
								}
							});
						}
					}, 1000);
				}, 2000);
			} else {
				setTimeout(() => {
					doBotTurn(msg);
				}, 2000);
			}
		} else {
			// TODO: Improve logic on which card to pick

			// wild and wd4 set color
			const cardColors = [];
			player.hand.filter(card => !card.value.toString().includes("WILD")).forEach((card) => {
				cardColors.push(card.color.toString());
			});
			const cardCols = countOccurrences(cardColors);
			// console.log(`\n\n${JSON.stringify(cardColors, null, 2)}\n\n`);
			const keys = Object.keys(cardColors);
			const mostColor = keys.reduce((a, e) => ((cardCols[e] > cardCols[a]) ? e : a), keys[0]);
			// console.log(`\n\n${mostColor}\n\n`);
			const card = botMatchingHand[0];
			if (card.value.toString().includes("WILD")) {
				card.color = Colors.get(mostColor);
			}

			if (player.hand.length === 2) {
				send(msg.channel, "UNO!");
			}

			const commandColor = card.color.toString().toLowerCase();
			const val = card.value.toString();
			const commandValue = (val.includes("_")) ? val.split("_").map(word => ((word !== "FOUR") ? word.charAt(0) : "4")).join("").toLowerCase() : val.toLowerCase();

			send(msg.channel, `play ${commandColor} ${commandValue}`).then(() => {
				game.play(card); // TODO: Improve logic on which card to pick
				if (game && (game.discardedCard.value.toString() === "DRAW_TWO" || game.discardedCard.value.toString() === "WILD_DRAW_FOUR")) {
					game.draw();
				}
				setTimeout(() => {
					if (player.hand.length !== 0) {
						const member = msg.guild.members.cache.get(game.currentPlayer.name);
						send(bot.webhooks.uno, `You're up ${member} - Card: ${game.discardedCard.toString()}`, {
							files: [getCardImage(game.discardedCard)],
						}).then(() => {
							showHand(msg, game.currentPlayer);
							if (game.currentPlayer.name === bot.user.id) {
								setTimeout(() => {
									doBotTurn(msg);
								}, 2000);
							}
						});
					}
				}, 1000);
			});
		}
	}, 5000);
};

const startGame = (msg, players) => {
	game = new Game(players);
	game.newGame();
	const member = msg.guild.members.cache.get(game.currentPlayer.name);
	game.on("end", (err, winner, score) => {
		const memb = msg.guild.members.cache.get(winner.name); // winner.name === member.id
		send(bot.webhooks.uno, `${memb} wins! Score: ${score}`).then(() => {
			resetGame(msg);
		});
	});
	msg.channel.unoRunning = true;
	send(bot.webhooks.uno, `${msg.author} has started Uno!`);
	send(bot.webhooks.uno, `You're up ${member} - Card: ${game.discardedCard.toString()}`, {
		files: [getCardImage(game.discardedCard)],
	}).then(() => {
		players.forEach((p) => {
			showHand(msg, p);
		});
		if (game.currentPlayer.name === bot.user.id) {
			setTimeout(() => {
				doBotTurn(msg);
			}, 2000);
		}
	});
};
// #endregion

function beginning(hook, msg, players) {
	send(hook, `${msg.author} wants to play Uno! Type \`join\` in the channel to join the game. Game will start in 30 seconds.`);
	bot.webhooks.uno = hook;
	const collector = msg.channel.createMessageCollector(m => m.content.toLowerCase() === "join", {
		time: 30000,
	});
	collector.on("collect", (m) => {
		if (!players.includes(m.author.id) && players.length < 10) {
			send(hook, `${m.guild.members.cache.get(m.author.id).displayName} will play!`);
			players.push(m.author.id);
		}
	});
	collector.on("end", () => { // arg=collected collection
		if (players.length < 2) {
			send(msg.channel, "No one joined, the bot will play!");
			// Bot as player
			players.push(bot.user.id);
			setTimeout(() => {
				startGame(msg, players);
			}, 7000);
		} else {
			startGame(msg, players);
		}
	});
}

bot.webhooks = {};

// #region uno
bot.on("message", (msg) => {
	if (msg.author.bot) {
		return;
	}
	console.log(msg.content);
	if (msg.content.startsWith("!uno")) {
		if (msg.channel.unoRunning) {
			// return send(msg.channel, "Uno is already running");
			send(msg.channel, "Do you want to end Uno?");
			msg.channel.awaitMessages(r => (r.content === "y" || r.content === "yes" || r.content === "n" || r.content === "no") && msg.author.id === r.author.id, {
				max: 1,
				time: 30000,
				errors: ["time"],
			}).then((collected) => {
				if (collected.first().content === "n" || collected.first().content === "no") {
					return send(msg.channel, "Uno will continue.");
				}
				resetGame(msg);
				return send(msg.channel, "Uno has been forced ended.");
			}).catch(() => (
				send(msg.channel, "You took too long to respond. Uno will continue.")
			));
		} else {
			if (!msg.channel.unoPlayers) {
				msg.channel.unoPlayers = [];
			}
			const players = msg.channel.unoPlayers;
			players.push(msg.author.id);
			msg.channel.fetchWebhooks().then((hooks) => {
				if (hooks.size === 0) {
					msg.channel.createWebhook("UnoBot", {
						avatar: "https://i.imgur.com/fLMHXKh.jpg",
					}).then((hook) => {
						beginning(hook, msg, players);
					});
				} else {
					const hook = hooks.find(h => h.name === "UnoBot");
					beginning(hook, msg, players);
				}
			});
		}
	} else if (msg.content.startsWith("play")) {
		if (typeof msg.channel.unoRunning === "boolean" && msg.channel.unoRunning) {
			if (msg.author.id !== game.currentPlayer.name) {
				send(bot.webhooks.uno, "It's not your turn");
				return;
			}
			const player = game.currentPlayer;
			const args = msg.content.split(" ").slice(1);
			if (args.length === 2) {
				try {
					game.play(getCard(args, game.currentPlayer));
					if (game && (game.discardedCard.value.toString() === "DRAW_TWO" || game.discardedCard.value.toString() === "WILD_DRAW_FOUR")) {
						game.draw();
					}
				} catch (e) {
					if (e.message.includes("does not have card")) {
						send(bot.webhooks.uno, "You do not have that card.");
					} else if (e.message.includes("from discard pile, does not match")) {
						send(bot.webhooks.uno, "That card can't be played now.");
					} else {
						// else if (e.message.includes("must draw cards")) {
						// 	game.draw();
						// }
						console.error(e);
					}
				}
				if (player.hand.length !== 0) {
					const betweenLength = Math.floor(Math.random() * unoBotMad.length);
					const rand = betweenLength > Math.floor(unoBotMad.length / 3);
					if (rand && game.getPlayer(bot.user.id)
						&& (game.discardedCard.value.toString().includes("WILD") || game.discardedCard.value.toString().includes("DRAW"))) {
						send(msg.channel, unoBotMad[Math.floor(Math.random() * unoBotMad.length)]);
					}
					const member = msg.guild.members.cache.get(game.currentPlayer.name);
					send(bot.webhooks.uno, `You're up ${member} - Card: ${game.discardedCard.toString()}`, {
						files: [getCardImage(game.discardedCard)],
					}).then(() => {
						showHand(msg, game.currentPlayer);
						if (game.currentPlayer.name === bot.user.id) {
							setTimeout(() => {
								doBotTurn(msg);
							}, 2000);
						}
					});
				}
			}
		} else {
			send(msg.channel, "Uno isn't running.");
		}
	} else if (msg.content === "draw") {
		if (typeof msg.channel.unoRunning === "boolean" && msg.channel.unoRunning) {
			if (msg.author.id !== game.currentPlayer.name) {
				send(bot.webhooks.uno, "It's not your turn");
				return;
			}
			game.draw();
			const card = game.currentPlayer.hand[game.currentPlayer.hand.length - 1];
			const name = (card.color) ? card.toString() : card.value.toString();
			send(bot.webhooks.uno, `${msg.author} drew a ${name.toLowerCase()}`);
		} else {
			send(msg.channel, "Uno isn't running.");
		}
	} else if (msg.content === "pass") {
		if (typeof msg.channel.unoRunning === "boolean" && msg.channel.unoRunning) {
			if (msg.author.id !== game.currentPlayer.name) {
				send(bot.webhooks.uno, "It's not your turn");
				return;
			}
			try {
				game.pass();
			} catch (e) {
				if (e.message.includes("must draw at least one card")) {
					send(bot.webhooks.uno, "You must draw before passing.");
					return;
				}
			}
			send(bot.webhooks.uno, `You're up ${msg.guild.members.cache.get(game.currentPlayer.name)} - Card: ${game.discardedCard.toString()}`, {
				files: [getCardImage(game.discardedCard)],
			}).then(() => {
				showHand(msg, game.currentPlayer);
				if (game.currentPlayer.name === bot.user.id) {
					setTimeout(() => {
						doBotTurn(msg);
					}, 2000);
				}
			});
		} else {
			send(msg.channel, "Uno isn't running.");
		}
	} else if (msg.content === "hand") {
		if (typeof msg.channel.unoRunning === "boolean" && msg.channel.unoRunning) {
			if (msg.channel.unoPlayers.includes(msg.author.id)) {
				showHand(msg, game.getPlayer(msg.author.id));
			}
		} else {
			send(msg.channel, "Uno isn't running.");
		}
	} else if (msg.content === "score") {
		if (typeof msg.channel.unoRunning === "boolean" && msg.channel.unoRunning) {
			if (msg.channel.unoPlayers.includes(msg.author.id)) {
				const players = [];
				for (const p of msg.channel.unoPlayers) {
					players.push(game.getPlayer(p));
				}
				const score = players.map(player => player.hand).reduce((amount, cards) => {
					amount += cards.reduce((s, c) => s += c.score, 0); // eslint-disable-line
					return amount;
				}, 0);
				send(bot.webhooks.uno, `Score: ${score}`);
			}
		} else {
			send(msg.channel, "Uno isn't running.");
		}
	}
});
// #endregion

// #region bot login
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
// #endregion
