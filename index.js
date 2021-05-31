const { Client } = require("discord.js"); // v13
const colors = require("colors");
const { getOpts, getTimestamp } = require("./util/util.js");
const errHandler = require("./util/err.js");
const commands = require("./util/loadCommands.js");

const bot = new Client({ intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_EMOJIS", "GUILD_WEBHOOKS", "GUILD_MESSAGES"] });
console.log(colors.red("Starting"));
const token = process.env.DISCORD_TOKEN;

bot.on("message", async (msg) => {
	console.log(`[${getTimestamp(msg.createdAt)}] ${msg.author.username}: ${msg.cleanContent}`);
	if (msg.author.bot) return;
	if (!msg.content.startsWith("!")) return;

	if (!bot.application?.owner) await bot.application?.fetch();

	const cmd = msg.content.slice(1).split(" ")[0].toLowerCase();
	if (Object.prototype.hasOwnProperty.call(commands.chat, cmd)) {
		commands.chat[cmd].run(bot, msg);
	}
});

bot.on("interaction", async (interaction) => {
	if (!interaction.isCommand()) return;
	let opts = {};
	let optString = "";
	if (interaction.options?.length > 0) {
		opts = getOpts(interaction.options);
		if (Object.keys(opts).length > 0) {
			optString = opts;
		}
	}
	const logStr = `[${getTimestamp(interaction.createdAt)}] ${interaction.user.username}: /${interaction.commandName}`;
	console.log(logStr, optString);
	// console.log(interaction);
	// const chan = interaction.channel;
	const cmd = interaction.commandName;
	if (Object.prototype.hasOwnProperty.call(commands.slash, cmd)) {
		commands.slash[cmd].run(bot, interaction, opts);
	}
});

// Bot login+info
bot.on("ready", () => {
	console.log("Ready!");
});
bot.on("error", (...args) => {
	errHandler("error", ...args);
});
bot.on("warn", (...args) => {
	errHandler("warn", ...args);
});
const regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
bot.on("debug", (e) => {
	if (!e.toLowerCase().includes("heartbeat")) { // suppress heartbeat messages
		console.info(colors.grey(e.replace(regToken, "[Redacted]")));
	}
});
bot.login(token);
