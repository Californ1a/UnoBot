const fs = require("fs");

const ex = {};

fs.readdir("./commands", (err, files) => {
	if (err) {
		console.error(err);
	}
	console.log(`Loading a total of ${files.length} commands.`);
	files.forEach((file) => {
		// eslint-disable-next-line global-require, import/no-dynamic-require
		const cmd = require(`../commands/${file}`);
		if (!cmd.type) {
			console.error(`No type specified for command file: ../commands${file}`);
			return; // Skip this file
		}
		if (!ex[cmd.type]) {
			ex[cmd.type] = {};
		}
		ex[cmd.type][file.slice(0, -3)] = cmd;
	});
});

module.exports = ex;
