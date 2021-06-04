const errHandler = require("../util/err.js");
const { nextTurn, checkUnoRunning, checkPlayerTurn } = require("../game/game.js");

async function pass(interaction, chan) {
	if (await checkUnoRunning(interaction)) return;
	if (await checkPlayerTurn(interaction)) return;
	const player = chan.uno.game.currentPlayer;
	try {
		chan.uno.game.pass();
	} catch (e) {
		if (e.message.includes("must draw at least one card")) {
			await interaction.reply("You must draw before passing.", { ephemeral: true });
			return;
		}
		errHandler("error", e);
		return;
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
