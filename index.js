const { Client } = require("discord.js"); // v13
const colors = require("colors");
const { getOpts, getTimestamp } = require("./util/util.js");
const errHandler = require("./util/err.js");
const commands = require("./util/loadCommands.js");
const { reset, nextTurn, finished } = require("./game/game.js");
const start = require("./game/gameStart.js");

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
	if (!interaction.isCommand()) {
		if (!interaction.isMessageComponent() && interaction.componentType !== "BUTTON") return;
		return;
	}
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
	const cmd = interaction.commandName;
	if (Object.prototype.hasOwnProperty.call(commands.slash, cmd)) {
		const chan = interaction.channel;
		commands.slash[cmd].run(interaction, chan, opts, bot);
	}
});

async function listenToButtonsOnOldMsg(msg) {
	const startCollector = msg.createMessageComponentInteractionCollector(() => true, {
		max: 1,
	});
	const interaction = await new Promise((resolve) => {
		startCollector.on("collect", resolve);
	});
	console.log(`Collected ${interaction.customID}`);
	if (interaction.replied) return;
	// TODO: Make it work for mid-game buttons if bot restarts during a game
	if (!interaction.customID.match(/^(start|quick|bot)$/i)) {
		await interaction.update(interaction.message.content, { components: [] });
		await interaction.followUp("You can't use old Uno buttons", { ephemeral: true });
		return;
	}
	const opts = {};
	if (interaction.customID === "QUICK") {
		opts.solo = true;
	}
	if (interaction.customID === "BOT") {
		opts.bot = true;
	}

	if (interaction.channel.uno?.running) {
		await interaction.update(interaction.message.content, { components: [] });
		await interaction.followUp("Uno is already running.", { ephemeral: true });
		return;
	}

	start(interaction, interaction.channel, opts, reset, nextTurn, finished);
}

// Bot login+info
bot.on("ready", async () => {
	console.log("Ready!");
	bot.guilds.cache.forEach((guild) => {
		guild.channels.cache.forEach(async (channel) => {
			if (!(channel.type === "text" && channel.viewable && channel.isText())) return;
			console.log(`Checking channel ${channel.name} in guild ${guild.name}...`);
			const msgs = await channel.messages.fetch({ limit: 15 });
			msgs.forEach((message) => {
				if (!message.components?.[0]) return;
				console.log(`Found remaining buttons on message ${message.id}`);
				listenToButtonsOnOldMsg(message);
			});
		});
	});
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
