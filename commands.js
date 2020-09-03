const fs = require("fs");

const ex = {};

fs.readdir("./commands", (err, files) => {
	if (err) {
		console.error(err);
	}
	console.log(`Loading a total of ${files.length} commands.`);
	files.forEach((file) => {
		ex[file.slice(0, -3)] = require(`./commands/${file}`); // eslint-disable-line
	});
});

module.exports = ex;
