const managePostDraw = require("../game/managePostDraw.js");
const { nextTurn, checkUnoRunning, checkPlayerTurn } = require("../game/game.js");
const getHand = require("../game/getHand.js");

async function draw(interaction, chan) {
	if (await checkUnoRunning(interaction)) return;
	if (await checkPlayerTurn(interaction)) return;
	if (chan.uno.drawn) {
		await interaction.reply({ content: "You cannot draw twice in a row.", ephemeral: true });
		return;
	}
	const player = chan.uno.players.get(interaction.member.id);
	const { handStr } = getHand(chan.uno.game.getPlayer(player.member.id));
	const pid = `${player.member.id}+${handStr}`;
	chan.uno.drawn = true;
	chan.uno.game.draw();
	const next = await managePostDraw(chan, interaction, player, pid);
	if (next) {
		nextTurn(chan);
	}
}

exports.run = draw;
exports.type = "slash";
