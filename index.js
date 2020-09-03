require("dotenv").config();
const Discord = require("discord.js");
const colors = require("colors");
const commands = require("./commands.js");

const bot = new Discord.Client();
console.log(colors.red("Starting"));
const token = process.env.DISCORD_TOKEN;

bot.webhooks = {};
bot.unoAwaitingPlayers = false;
bot.unogame = {};

bot.on("message", async (msg) => {
	const hr = msg.createdAt.getHours();
	const min = msg.createdAt.getMinutes();
	const hour = (hr.length < 2) ? `0${hr}` : hr;
	const minute = (min.length < 2) ? `0${min}` : min;
	console.log(`[${hour}:${minute}] ${msg.author.username}: ${msg.content}`);
	if (msg.author.bot) {
		return;
	}

	if (msg.content.startsWith("!")) {
		msg.content = msg.content.slice(1);
	}

	const cmd = msg.content.split(" ")[0];

	if (Object.prototype.hasOwnProperty.call(commands, cmd)) {
		commands[cmd].run(bot, msg);
	}
});

// Bot login+info
bot.on("ready", () => {
	console.log("Ready!");
});
bot.on("error", (e) => {
	if (e.message) {
		console.error(colors.green(e.message));
	} else {
		console.error(colors.green(e));
	}
});
bot.on("warn", (e) => {
	console.warn(colors.blue(e));
});
const regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
bot.on("debug", (e) => {
	if (!e.toLowerCase().includes("heartbeat")) { // suppress heartbeat messages
		console.info(colors.grey(e.replace(regToken, "[Redacted]")));
	}
});
bot.login(token);
