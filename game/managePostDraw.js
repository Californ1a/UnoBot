const { ButtonBuilder } = require("discord.js");
const errHandler = require("../util/err.js");
const { addButton, colorToButtonStyle, buttonsToMessageActions } = require("../util/buttons.js");
const playedWildCard = require("./playedWild.js");
const postPlay = require("./postPlay.js");

async function managePostDraw(chan, interaction, player, pid) {
	const card = chan.uno.game.currentPlayer.hand[chan.uno.game.currentPlayer.hand.length - 1];
	const name = (card.color) ? card.toString() : card.value.toString();
	const n2 = (name.includes("WILD_DRAW")) ? "WD4" : (name.includes("DRAW")) ? `${name.split(" ")[0]} DT` : name;
	colorToButtonStyle(name.split(" ")[0]);

	const cardBtn = new ButtonBuilder()
		.setCustomId(card.toString())
		.setLabel((n2.split(" ")[1] ? n2.split(" ")[1] : n2))
		.setStyle(colorToButtonStyle(name.split(" ")[0]));

	const match = (card.color === chan.uno.game.discardedCard.color
		|| card.value === chan.uno.game.discardedCard.value
		|| card.value.toString().includes("WILD"));
	if (!match) {
		cardBtn.setDisabled(true);
	}

	let buttons = addButton([
		[],
	], cardBtn);

	const passBtn = new ButtonBuilder()
		.setCustomId("PASS")
		.setLabel("Pass")
		.setStyle(2)
		.setEmoji("⏭️");
	buttons = addButton(buttons, passBtn);
	const interMsg = `You drew a ${n2.toLowerCase()}`;
	const msgOpts = {
		ephemeral: true,
		components: buttonsToMessageActions(buttons),
	};
	let msg;
	if (interaction.type === 2) {
		await interaction.reply({ content: "Drew", allowedMentions: { users: [] } });
		msg = await interaction.followUp({ content: interMsg, ...msgOpts });
	} else if (interaction.type === 3) {
		await interaction.update({ content: interMsg, ...msgOpts });
		// await chan.send({ content: `${interaction.member} drew`, allowedMentions: { users: [] } });
	} else {
		return false;
	}
	const createCollector = type => type.createMessageComponentCollector({
		max: 1,
	});
	const passCollector = createCollector(msg || interaction.message);

	const inter2 = await new Promise((resolve) => {
		passCollector.on("collect", resolve);
	});
	console.log(`Collected ${inter2.customId}`);
	if (chan.uno.game.currentPlayer.name !== inter2.member.id) {
		await inter2.update({ content: inter2.message.content, components: [] });
		await inter2.followUp({ content: "It's not your turn.", ephemeral: true });
		return false;
	}
	if (chan.uno.playerCustomId !== pid) {
		inter2.update({ content: inter2.message.content, components: [] });
		inter2.followUp({ content: "You can't use old Uno buttons.", ephemeral: true });
		return false;
	}
	if (inter2.customId === "PASS") {
		try {
			chan.uno.game.pass();
		} catch (e) {
			if (e.message.includes("must draw at least one card")) {
				inter2.update({ content: inter2.message.content, components: [] });
				inter2.followUp({ content: "You can't use old Uno buttons.", ephemeral: true });
				return false;
			}
			errHandler("error", e);
			return false;
		}
		await inter2.update({ content: "Passed", components: [] });
		await chan.send({ content: `${inter2.member} drew & passed`, allowedMentions: { users: [] } });
		chan.uno.drawn = false;
		return true;
	}

	if (inter2.customId.includes("NO_COLOR")) {
		const ret = await playedWildCard(inter2, chan, card.value.toString(), pid, true);
		return ret;
	}

	const ret = await postPlay(chan, inter2, card, true);
	if (!ret) return false;

	if (!chan.uno) return false;
	chan.uno.drawn = false;
	return true;
}

module.exports = managePostDraw;
