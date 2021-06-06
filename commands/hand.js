const { getHand, checkUnoRunning } = require("../game/game.js");

async function hand(interaction, chan) {
	if (await checkUnoRunning(interaction)) return;
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
