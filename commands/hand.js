const { getHand } = require("../game/game.js");

async function hand(bot, interaction) {
	const chan = interaction.channel;
	if (!chan.uno?.running) {
		await interaction.reply("No Uno game found. Use `/uno` to start a new game.", { ephemeral: true });
		return;
	}
	const user = interaction.options[0]?.user;
	if (user) {
		const player = chan.uno.game.getPlayer(user.id);
		if (!player) {
			await interaction.reply(`${user} is not part of the game.`, { ephemeral: true });
			return;
		}
		await interaction.reply(`${user} has ${player.hand.length} cards remaining.`, { ephemeral: true });
		return;
	}
	const player = chan.uno.game.getPlayer(interaction.member.id);
	if (!player) {
		await interaction.reply("You aren't in the game.", { ephemeral: true });
		return;
	}
	const { handStr } = getHand(player);
	await interaction.reply(`Your Uno hand: ${handStr}`, { ephemeral: true });
}

exports.run = hand;
exports.type = "slash";
