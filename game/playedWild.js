const { MessageButton } = require("discord.js");
const { Card, Values, Colors } = require("uno-engine");
const { addButton, colorToButtonStyle, buttonsToMessageActions } = require("../util/buttons.js");
const postPlay = require("./postPlay.js");
const botMad = require("./botMad.js");
const getHand = require("./getHand.js");

async function playedWild(inter, chan, value, pid) {
	const colors = ["Blue", "Green", "Red", "Yellow"];
	const buttons = colors.reduce((a, c) => addButton(a, new MessageButton()
		.setCustomID(c.toUpperCase())
		.setLabel(c)
		.setStyle(colorToButtonStyle(c.toUpperCase()))), [
		[],
	]);
	console.log(inter.type);
	const { handStr } = getHand(chan.uno.game.currentPlayer);
	await inter.update(`Your Uno hand: ${handStr.split(", ").slice(0, -1).join(", ")}`, {
		components: buttonsToMessageActions(buttons),
	});
	const colorCollector = inter.message.createMessageComponentInteractionCollector(() => true, {
		max: 1,
	});
	chan.uno.playerSelectingColor = true;
	const inter2 = await new Promise((resolve) => {
		colorCollector.on("collect", resolve);
	});
	console.log(`Collected ${inter2.customID}`);

	let card = Card(Values.get(value), Colors.get(inter2.customID));
	const p = chan.uno.game.currentPlayer;
	card = p.getCardByValue(Values.get(value));

	if (!card || !chan.uno.selectingColor
		|| chan.uno.game.currentPlayer.name !== inter.user.id
		|| chan.uno.playerCustomID !== pid) {
		if (!inter2.replied) {
			await inter2.update(inter.message.content, { components: [] });
		}
		await inter2.followUp("You can't use old Uno buttons.", { ephemeral: true });
		return false;
	}
	card.color = Colors.get(Colors.get(inter2.customID));

	const ret = await postPlay(chan, inter2, card);
	if (!ret) return false;

	if (!chan.uno) return false;
	chan.uno.drawn = false;
	await botMad(chan);
	return true;
}

module.exports = playedWild;
