async function draw(interaction, chan) {
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
}

exports.run = draw;
exports.type = "slash";
