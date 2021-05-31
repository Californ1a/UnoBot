const errHandler = require("../util/err.js");
const { nextTurn } = require("../game/game.js");

async function pass(bot, interaction) {
	const chan = interaction.channel;
	if (!chan.uno?.running) {
		await interaction.reply("No Uno game found. Use `/uno` to start a new game.", { ephemeral: true });
		return;
	}
	if (chan.uno.game.currentPlayer.name !== interaction.member.id) {
		await interaction.reply("It's not your turn.", { ephemeral: true });
		return;
	}
	const player = chan.uno.game.currentPlayer;
	try {
		chan.uno.game.pass();
	} catch (e) {
		if (e.message.includes("must draw at least one card")) {
			await interaction.reply("You must draw before passing.", { ephemeral: true });
			return;
		}
	}
	chan.uno.players.get(player.name).interaction = interaction;
	await interaction.reply("Passed");
	chan.uno.drawn = false;
	try {
		await nextTurn(chan);
	} catch (e) {
		errHandler("error", e);
	}
}

exports.run = pass;
exports.type = "slash";
