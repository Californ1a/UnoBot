const { ButtonBuilder } = require("discord.js");
const { Card, Values, Colors } = require("uno-engine");
const { addButton, colorToButtonStyle, buttonsToMessageActions } = require("../util/buttons.js");
const postPlay = require("./postPlay.js");
const getHand = require("./getHand.js");

async function playedWild(inter, chan, value, pid) {
	const colors = ["Blue", "Green", "Red", "Yellow"];
	const buttons = colors.reduce((a, c) => addButton(a, new ButtonBuilder()
		.setCustomId(c.toUpperCase())
		.setLabel(c)
		.setStyle(colorToButtonStyle(c.toUpperCase()))), [
		[],
	]);
	const { handStr } = getHand(chan.uno.game.currentPlayer);
	await inter.update({
		content: `Your Uno hand: ${handStr.split(", ").slice(0, -1).join(", ")}`,
		components: buttonsToMessageActions(buttons),
	});
	const colorCollector = inter.message.createMessageComponentCollector({
		max: 1,
	});
	chan.uno.selectingColor = true;
	const inter2 = await new Promise((resolve) => {
		colorCollector.on("collect", resolve);
	});
	console.log(`Collected ${inter2.customId}`);

	let card = Card(Values.get(value), Colors.get(inter2.customId));
	const p = chan.uno.game.currentPlayer;
	card = p.getCardByValue(Values.get(value));

	if (!card || !chan.uno.selectingColor
		|| chan.uno.game.currentPlayer.name !== inter2.user.id
		|| chan.uno.playerCustomId !== pid) {
		if (!inter2.replied) {
			await inter2.update({ content: inter.message.content, components: [] });
		}
		await inter2.followUp({ content: "You can't use old Uno buttons.", ephemeral: true });
		return false;
	}
	card.color = Colors.get(Colors.get(inter2.customId));

	const ret = await postPlay(chan, inter2, card);
	if (!ret) return false;

	if (!chan.uno) return false;
	chan.uno.drawn = false;
	return true;
}

module.exports = playedWild;
