async function join(bot, interaction) {
	const chan = interaction.channel;
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
}

exports.run = join;
exports.type = "slash";
