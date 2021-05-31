const commandData = require("../data/commands.json");

async function deploy(bot, msg) {
	if (!(msg.author.id === bot.application?.owner.id
			|| bot.application?.owner.members.has(msg.author.id))) {
		await msg.reply("Only the bot owner can deploy slash commands.");
		return;
	}
	await msg.guild.commands.set(commandData);
	await msg.reply("Success");
}

exports.run = deploy;
exports.type = "chat";
