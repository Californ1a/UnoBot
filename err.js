const colors = require("colors");

function err(type, e) {
	if (!type.match(/error|warn/)) return;
	const color = (type === "error") ? "green" : "blue";

	if (type === "error" && e.message) {
		console[type](colors[color](e.message));
	} else if (type === "error") {
		console[type](colors[color](e));
	} else if (type === "warn") {
		console[type](colors[color](e));
	}
}

module.exports = err;
