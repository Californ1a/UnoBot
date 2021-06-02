const managePostDraw = require("../game/managePostDraw.js");
const { nextTurn } = require("../game/game.js");
const getHand = require("../game/getHand.js");

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
	const player = chan.uno.players.get(interaction.member.id);
	const { handStr } = getHand(chan.uno.game.getPlayer(player.id));
	const pid = `${player.id}+${handStr}`;
	chan.uno.drawn = true;
	chan.uno.game.draw();
	const next = await managePostDraw(chan, interaction, player, pid);
	if (next) {
		nextTurn(chan);
	}
}

exports.run = draw;
exports.type = "slash";
