const {
	Game,
} = require("uno-engine");
const {
	getCardImage,
} = require("./card");
const send = require("./send");
const showHand = require("./showHand");
const doBotTurn = require("./doBotTurn");
const delay = require("./delay");

async function resetGame(bot, msg) {
	msg.channel.unoPlayers = [];
	msg.channel.unoRunning = false;
	bot.unogame = null;
	await bot.webhooks.uno.delete();
	bot.webhooks = {};
}

async function startGame(bot, msg, players) {
	bot.unogame = new Game(players);
	bot.unogame.newGame();
	const member = msg.guild.members.cache.get(bot.unogame.currentPlayer.name);
	bot.unogame.on("end", async (err, winner, score) => {
		const memb = msg.guild.members.cache.get(winner.name); // winner.name === member.id
		await send(bot.webhooks.uno, `${memb} wins! Score: ${score}`);
		await resetGame(bot, msg);
	});
	msg.channel.unoRunning = true;
	await send(bot.webhooks.uno, `${msg.author} has started Uno!`);
	await send(bot.webhooks.uno, `You're up ${member} - Card: ${bot.unogame.discardedCard.toString()}`, {
		files: [getCardImage(bot.unogame.discardedCard)],
	});
	players.forEach((p) => {
		showHand(bot, msg, p);
	});
	if (bot.unogame.currentPlayer.name === bot.user.id) {
		await delay(2000);
		doBotTurn(bot, msg);
	}
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
	collector.on("end", async () => { // arg=collected collection
		if (players.length < 2) {
			await send(msg.channel, "No one joined, the bot will play!");
			// Bot as player
			players.push(bot.user.id);
			await delay(7000);
		}
		startGame(bot, msg, players);
	});
}

module.exports = {
	reset: resetGame,
	beginning,
};
