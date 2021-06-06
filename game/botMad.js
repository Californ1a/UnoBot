const unoBotMad = ["ARRGH!", "This is getting annoying!", "RATS!", "*sigh*", "You're getting on my nerves >:/", "dfasdfjhweuryaeuwysadjkf", "I'm steamed.", "BAH"];

async function botMad(chan) {
	// Let bot get mad if he has to draw cards or gets skipped
	const value = chan.uno.game.discardedCard.value.toString();
	if (!(value.includes("DRAW") || value.includes("SKIP") || value.includes("REVERSE"))
		|| !chan.uno.game.getPlayer(chan.guild.me.id) || chan.uno.players.size !== 2
		|| chan.uno.game.currentPlayer.name === chan.guild.me.id) {
		return;
	}
	const betweenLength = Math.floor(Math.random() * unoBotMad.length);
	let rand = betweenLength > Math.floor(unoBotMad.length / 2);
	if (value.includes("DRAW")) { // Increase chance for bot to get mad for draw cards
		rand = betweenLength > Math.floor(unoBotMad.length / 3);
	}
	if (rand) {
		await chan.send(unoBotMad[Math.floor(Math.random() * unoBotMad.length)]);
	}
}

module.exports = botMad;
