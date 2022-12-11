const { Client, GatewayIntentBits, Collection } = require("discord.js"); // v13
const colors = require("colors");
const { getOpts, getTimestamp } = require("./util/util.js");
const errHandler = require("./util/err.js");
const commands = require("./util/loadCommands.js");
const { reset, nextTurn, finished } = require("./game/game.js");
const start = require("./game/gameStart.js");
const deployCommands = require("./util/deployCommands.js");

const bot = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});
console.log(colors.red("Starting"));
const token = process.env.DISCORD_TOKEN;

bot.on("messageCreate", async (msg) => {
	console.log(`[${getTimestamp(msg.createdAt)}] ${msg.author.username}: ${msg.cleanContent}`);
	if (msg.author.bot) return;
	if (!msg.content.startsWith("!")) return;

	if (!bot.application?.owner) await bot.application?.fetch();

	const cmd = msg.content.slice(1).split(" ")[0].toLowerCase();
	if (Object.prototype.hasOwnProperty.call(commands.chat, cmd)) {
		commands.chat[cmd].run(bot, msg);
	}
});

bot.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) {
		if (!interaction.isMessageComponent() && !interaction.isButton()) return;
		return;
	}
	let opts = {};
	let optString = "";
	console.log("interaction.options", interaction.options);
	// eslint-disable-next-line no-underscore-dangle
	if (interaction.options._hoistedOptions?.length > 0) {
		const options = new Collection();
		// eslint-disable-next-line no-underscore-dangle
		interaction.options._hoistedOptions.map(o => [o.name, o])
			.forEach(o => options.set(...o));
		// eslint-disable-next-line no-underscore-dangle
		opts = getOpts(options);
		// NOTE without subcommands this works
		// opts = interaction.options.reduce((acc, opt) => ({
		// 	[opt.name]: opt.value,
		// 	...acc,
		// }), {});
		if (Object.keys(opts).length > 0) {
			optString = opts;
		}
	}
	const logStr = `[${getTimestamp(interaction.createdAt)}] ${interaction.user.username}: /${interaction.commandName}`;
	console.log(logStr, optString);
	const cmd = interaction.commandName;
	if (Object.prototype.hasOwnProperty.call(commands.slash, cmd)) {
		const chan = interaction.channel;
		commands.slash[cmd].run(interaction, chan, opts, bot);
	}
});

async function listenToButtonsOnOldMsg(msg) {
	const startCollector = msg.createMessageComponentCollector({
		max: 1,
	});
	const interaction = await new Promise((resolve) => {
		startCollector.on("collect", resolve);
	});
	console.log(`Collected ${interaction.customId}`);
	if (interaction.replied) return;
	/**
	 * TODO: Make it work for mid-game buttons if bot restarts during a game
	 * Is this even possible considering the buttons are attached to an ephemeral msg?
	 * Ephemeral msg's can't be fetched if they aren't already cached
	 * so the bot won't see them on startup.
	 */
	if (!interaction.customId.match(/^(start|quick|bot)$/i)) {
		await interaction.update({ content: interaction.message.content, components: [] });
		await interaction.followUp({ content: "You can't use old Uno buttons", ephemeral: true });
		return;
	}
	const opts = {};
	if (interaction.customId === "QUICK") {
		opts.solo = true;
	}
	if (interaction.customId === "BOT") {
		opts.bot = true;
	}

	if (interaction.channel.uno?.running) {
		await interaction.update({ content: interaction.message.content, components: [] });
		await interaction.followUp({ content: "Uno is already running.", ephemeral: true });
		return;
	}

	start(interaction, interaction.channel, opts, reset, nextTurn, finished);
}

// Bot login+info
bot.on("ready", async () => {
	try {
		await deployCommands(bot);
	} catch (err) {
		console.error(err);
	}
	bot.guilds.cache.forEach((guild) => {
		guild.channels.cache.forEach(async (channel) => {
			if (!(channel.type === 0 && channel.viewable && channel.isTextBased())) return;
			console.log(colors.grey(`Checking channel ${channel.name} in guild ${guild.name}...`));
			const msgs = await channel.messages.fetch({ limit: 15 });
			msgs.forEach((message) => {
				if (!message.components?.[0]) return;
				console.log(`Found remaining buttons on message ${message.id} in channel ${channel.name} on guild ${guild.name}.`);
				listenToButtonsOnOldMsg(message);
			});
		});
	});
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
	if (!e.toLowerCase().includes("heartbeat")) return; // suppress heartbeat messages
	console.info(colors.grey(e.replace(regToken, "[Redacted]")));
});
bot.login(token);
