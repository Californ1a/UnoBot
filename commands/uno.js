const { reset, nextTurn, finished } = require("../game/game.js");
const start = require("../game/gameStart.js");

async function uno(interaction, chan, opts) {
	start(interaction, chan, opts, reset, nextTurn, finished);
}

exports.run = uno;
exports.type = "slash";
