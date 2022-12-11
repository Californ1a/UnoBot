// const { REST, Routes } = require("discord.js");
const commands = require("../data/commands.json");

// const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
async function deployCommands(bot) {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		// const client = process.env.DISCORD_CLIENT_ID;
		// const guild = process.env.DISCORD_GUILD_ID;
		// const type = (process.env.DEV === "true") ? Routes.applicationGuildCommands
		// 	: Routes.applicationCommands;
		// const cmds = type(client, guild);
		// const data = await rest.put(cmds, {
		// 	body: commands,
		// });
		if (!bot.application?.owner) await bot.application?.fetch();
		const cmds = await bot.application?.commands.set(commands);

		console.log(`Successfully reloaded ${cmds.size} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
}

module.exports = deployCommands;
