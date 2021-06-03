const { MessageButton } = require("discord.js");
const { Card, Values, Colors } = require("uno-engine");
const { addButton, colorToButtonStyle, buttonsToMessageActions } = require("../util/buttons.js");
const getPlainCard = require("./getPlainCard.js");

async function playedWild(inter, chan, value, pid) {
	const colors = ["Blue", "Green", "Red", "Yellow"];
	const buttons = colors.reduce((a, c) => addButton(a, new MessageButton()
		.setCustomID(c.toUpperCase())
		.setLabel(c)
		.setStyle(colorToButtonStyle(c.toUpperCase()))), [
		[],
	]);
	console.log(inter.type);
	await inter.update(inter.message.content, {
		components: buttonsToMessageActions(buttons),
	});
	const colorCollector = inter.message.createMessageComponentInteractionCollector(() => true, {
		max: 1,
	});
	const inter2 = await new Promise((resolve) => {
		colorCollector.on("collect", resolve);
	});
	console.log(`Collected ${inter2.customID}`);
	if (chan.uno.game.currentPlayer.name !== inter.user.id
		|| chan.uno.playerCustomID !== pid) {
		inter.update(inter.message.content, { components: [] });
		inter.followUp("You can't use old buttons.", { ephemeral: true });
		return false;
	}

	let card = Card(Values.get(value), Colors.get(inter2.customID));
	const p = chan.uno.game.currentPlayer;
	card = p.getCardByValue(Values.get(value));
	card.color = Colors.get(Colors.get(inter2.customID));
	const drawn = { didDraw: false };
	chan.uno.game.play(card);
	if (!chan.uno) {
		await inter2.update(inter2.message.content, { components: [] });
		await inter2.followUp(`${inter2.member} played ${getPlainCard(card)}`, {
			allowedMentions: {
				users: [],
			},
		});
		return false;
	}
	if (chan.uno.game.discardedCard.value.toString() === "WILD_DRAW_FOUR") {
		drawn.player = chan.uno.players.get(chan.uno.game.currentPlayer.name);
		chan.uno.game.draw();
		drawn.didDraw = true;
	}

	await inter2.update(card.toString(), { components: [] });
	chan.uno.players.get(p.name).interaction = inter2;
	await inter2.followUp(`${inter2.member} played ${getPlainCard(card)}${(drawn.didDraw) ? `, ${drawn.player} drew 4 cards.` : ""}`, {
		allowedMentions: {
			users: [],
		},
	});
	if (!chan.uno) return false;
	chan.uno.drawn = false;
	return true;
}

module.exports = playedWild;
