const {
	Game,
} = require("uno-engine");
const {
	getCardImage,
} = require("./card");
const send = require("./send");
const showHand = require("./showHand");
const delay = require("./delay");

async function resetGame(bot, msg) {
	msg.channel.unoPlayers = [];
	msg.channel.unoRunning = false;
	bot.unogame = null;
	await bot.webhooks.uno.delete();
	bot.webhooks = {};
}

async function nextTurn(bot, msg, players) {
	if (!bot.unogame) {
		return null;
	}
	const member = msg.guild.members.cache.get(bot.unogame.currentPlayer.name);
	const name = bot.unogame.discardedCard.toString();
	const n2 = (name.includes("WILD_DRAW")) ? `${name.split(" ")[0]} WD4` : (name.includes("DRAW")) ? `${name.split(" ")[0]} DT` : name;
	await send(bot.webhooks.uno, `You're up ${member} - Card: ${n2}`, {
		files: [getCardImage(bot.unogame.discardedCard)],
	});
	if (players) {
		players.forEach((p) => {
			showHand(bot, msg, p);
		});
	} else {
		showHand(bot, msg, bot.unogame.currentPlayer);
	}
	if (bot.unogame.currentPlayer.name === bot.user.id) {
		await delay(2000);
		return bot.user.id;
		/* `doBotTurn(bot, msg);`
			but then recursive requires,
			so pass a value back up the stack instead */
	}
	return null;
}

async function startGame(bot, msg, players) {
	bot.unogame = new Game(players);
	bot.unogame.newGame();
	bot.unogame.on("end", async (err, winner, score) => {
		const memb = msg.guild.members.cache.get(winner.name); // winner.name === member.id
		await send(bot.webhooks.uno, `${memb} wins! Score: ${score}`);
		await resetGame(bot, msg);
	});
	msg.channel.unoRunning = true;
	await send(bot.webhooks.uno, `${msg.author} has started Uno!`);
	const check = await nextTurn(bot, msg, players); // Pass the bot id all the way back up the stack
	return check;
}

async function beginning(bot, hook, msg, players) {
	await send(hook, `${msg.author} wants to play Uno! Type \`join\` in the channel to join the game. Game will start in 30 seconds.`);
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
