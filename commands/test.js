const { MessageActionRow, MessageButton } = require("discord.js");

async function test(interaction) {
	const row = new MessageActionRow()
		.addComponents(new MessageButton()
			.setCustomID("primary")
			.setLabel("primary")
			.setStyle("PRIMARY"));

	await interaction.reply("Pong!", { components: [row], ephemeral: true });
}

exports.run = test;
exports.type = "slash";
