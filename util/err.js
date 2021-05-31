const colors = require("colors");

function err(type, e) {
	if (!type.match(/error|warn/)) {
		console.error(colors.red("Error handler type unknown."), e);
		return;
	}
	const color = (type === "error") ? "green" : "blue";

	console[type](colors[color](e));
}

module.exports = err;
