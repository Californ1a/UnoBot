const {
	Game,
} = require("uno-engine");
const {
	getCardImage,
} = require("./card");
const send = require("./send");
const showHand = require("./showHand");
const delay = require("./delay");
const msgAllPlayers = require("./msgAllPlayers");

async function resetGame(bot) {
	bot.unogame.unoPlayers = [];
	bot.unogame.unoRunning = false;
	bot.unogame = {};
	if (bot.webhooks.uno.name === "UnoBot") {
		await bot.webhooks.uno.delete();
	}
	bot.webhooks = {};
}

async function nextTurn(bot, msg, players) {
	// console.log(players);
	if (!bot.unogame) {
		return players;
	}
	const user = await bot.users.fetch(bot.unogame.currentPlayer.name);
	const name = bot.unogame.discardedCard.toString();
	const n2 = (name.includes("WILD_DRAW")) ? `${name.split(" ")[0]} WD4` : (name.includes("DRAW")) ? `${name.split(" ")[0]} DT` : name;
	if (players && !players.includes(bot.user.id)) {
		bot.webhooks.uno = await bot.users.fetch(bot.unogame.currentPlayer.name);

		const previousPlayer = {
			id: null,
		};
		await msgAllPlayers(bot, players, previousPlayer, `${user} is up - Card: ${n2}`, {
			files: [getCardImage(bot.unogame.discardedCard)],
		});
	} else {
		await send(bot.webhooks.uno, `${user} is up - Card: ${n2}`, {
			files: [getCardImage(bot.unogame.discardedCard)],
		});
	}
	// if (players) {
	// 	players.forEach((p) => {
	// 		showHand(bot, msg, p);
	// 	});
	// } else {
	// 	showHand(bot, msg, bot.unogame.currentPlayer);
	// }
	showHand(bot, msg, bot.unogame.currentPlayer, players);
	if (bot.unogame.currentPlayer.name === bot.user.id) {
		await delay(2000);
		return null;
		/* `doBotTurn(bot, msg);`
			but then recursive requires,
			so pass a value back up the stack instead */
	}
	return players;
}

async function sendWinMessage(bot, winner, score, players) {
	// console.log(players);
	if (players.length === 2 && players.includes(bot.user.id)) {
		await send(bot.webhooks.uno, `${winner} wins! Score: ${score}`);
	} else {
		const previousPlayer = {
			id: null,
		};
		await msgAllPlayers(bot, players, previousPlayer, `${winner} wins! Score: ${score}`);
		// const fetchPlayers = players.map(p => bot.users.fetch(p));
		// const users = await Promise.all(fetchPlayers);
		// const sendUsers = users.map(u => send(u, `${winner} wins! Score: ${score}`));
		// await Promise.all(sendUsers);

		// for (const player of players) {
		// 	bot.users.fetch(player).then((user) => {
		// 		send(user, `${winner} wins! Score: ${score}`);
		// 	});
		// }
	}
}

async function startGame(bot, msg, players) {
	bot.unogame = new Game(players);
	console.log(bot.unogame);
	bot.unogame.newGame();
	console.log(players);
	bot.unogame.on("end", async (err, winner, score) => {
		console.log(players);
		const user = await bot.users.fetch(winner.name); // winner.name === member.id
		await sendWinMessage(bot, user, score, players);
		await resetGame(bot, msg);
	});
	bot.unogame.unoRunning = true;
	await send(bot.webhooks.uno, `${msg.author} has started Uno!${(players.includes(bot.user.id)) ? "" : " The game will be played in your DMs to keep your hand private!"}`);
	if (!players.includes(bot.user.id)) {
		await delay(5000); // Allow extra time to read start msg when there's >1 real player
	}
	const check = await nextTurn(bot, msg, players); // Pass the bot id all the way back up the stack
	return check;
}

async function beginning(bot, hook, msg, players) {
	await send(hook, `${msg.author} wants to play Uno! Type \`join\` in the channel to join the game. Game will start in 30 seconds.`);
	bot.webhooks.uno = hook;
	const collector = msg.channel.createMessageCollector(m => m.content.toLowerCase() === "join", {
		time: 30000,
	});
	collector.on("collect", async (m) => {
		if (!players.includes(m.author.id) && players.length < 10) {
			let canEnter = true;
			try {
				await send(m.author, "You are entered to play Uno. The game will be run in DMs.");
			} catch (e) {
				console.log(e);
				canEnter = false;
				await send(hook, `${m.guild.members.cache.get(m.author.id)} Unable to send you a DM. Uno requires DMs.`);
			}
			if (canEnter) {
				await send(hook, `${m.guild.members.cache.get(m.author.id).displayName} will play!`);
				players.push(m.author.id);
			}
		}
	});
	await new Promise((resolve, reject) => { // This exists
		collector.on("end", resolve);
		collector.on("error", reject);
	});
	if (players.length < 2) {
		await send(msg.channel, "No one joined, the bot will play!");
		// Bot as player
		players.push(bot.user.id);
		await delay(7000);
	}
	const check = await startGame(bot, msg, players); // Keep passing it up the stack
	return check;
}

module.exports = {
	reset: resetGame,
	beginning,
	nextTurn,
};
