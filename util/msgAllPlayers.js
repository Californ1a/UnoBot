const send = require("./send");

async function msgAllPlayers(bot, players, previousPlayer, content, msgOptions) {
	const fetchPlayers = players.filter(p => p !== previousPlayer.id).map(p => bot.users.fetch(p));
	const users = await Promise.all(fetchPlayers);
	const sendUsers = users.map(u => send(u, content, msgOptions));
	await Promise.all(sendUsers);
}

module.exports = msgAllPlayers;
