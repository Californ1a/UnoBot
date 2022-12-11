const { getHand, checkUnoRunning } = require("../game/game.js");

async function hand(interaction, chan) {
	if (await checkUnoRunning(interaction)) return;
	// eslint-disable-next-line no-underscore-dangle
	const user = interaction.options._hoistedOptions[0]?.user;
	if (user) {
		const player = chan.uno.game.getPlayer(user.id);
		if (!player) {
			await interaction.reply({ content: `${user} is not part of the game.`, ephemeral: true });
			return;
		}
		await interaction.reply({ content: `${user} has ${player.hand.length} cards remaining.`, ephemeral: true });
		return;
	}
	const player = chan.uno.game.getPlayer(interaction.member.id);
	if (!player) {
		await interaction.reply({ content: "You aren't in the game.", ephemeral: true });
		return;
	}
	const { handStr } = getHand(player);
	await interaction.reply({ content: `Your Uno hand: ${handStr}`, ephemeral: true });
}

exports.run = hand;
exports.type = "slash";
