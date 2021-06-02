const { MessageButton } = require("discord.js");
const errHandler = require("../util/err.js");
const { addButton, colorToButtonStyle, buttonsToMessageActions } = require("../util/buttons.js");
const getPlainCard = require("./getPlainCard.js");
const playedWildCard = require("./playedWild.js");

async function managePostDraw(chan, interaction, player, pid) {
	const card = chan.uno.game.currentPlayer.hand[chan.uno.game.currentPlayer.hand.length - 1];
	const name = (card.color) ? card.toString() : card.value.toString();
	const n2 = (name.includes("WILD_DRAW")) ? "WD4" : (name.includes("DRAW")) ? `${name.split(" ")[0]} DT` : name;
	colorToButtonStyle(name.split(" ")[0]);

	const cardBtn = new MessageButton()
		.setCustomID(card.toString())
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

	const passBtn = new MessageButton()
		.setCustomID("PASS")
		.setLabel("Pass")
		.setStyle("SECONDARY")
		.setEmoji("⏭️");
	buttons = addButton(buttons, passBtn);
	const interMsg = `You drew a ${n2.toLowerCase()}`;
	const msgOpts = {
		ephemeral: true,
		components: buttonsToMessageActions(buttons),
	};
	// console.log(interaction.type);
	let msg;
	if (interaction.type === "APPLICATION_COMMAND") {
		await interaction.reply(`${interaction.member} drew`, { allowedMentions: { users: [] } });
		msg = await interaction.followUp(interMsg, msgOpts);
	} else if (interaction.type === "MESSAGE_COMPONENT") {
		await interaction.update(interMsg, msgOpts);
		await chan.send(`${interaction.member} drew`, { allowedMentions: { users: [] } });
	} else {
		return false;
	}
	const createCollector = type => type.createMessageComponentInteractionCollector(() => true, {
		max: 1,
	});
	const passCollector = createCollector(msg || interaction.message);

	// console.log(passCollector);
	const inter2 = await new Promise((resolve) => {
		passCollector.on("collect", resolve);
	});
	console.log(`Collected ${inter2.customID}`);
	if (chan.uno.game.currentPlayer.name !== inter2.member.id) {
		await inter2.update(inter2.message.content, { components: [] });
		await inter2.followUp("It's not your turn.", { ephemeral: true });
		return false;
	}
	if (chan.uno.playerCustomID !== pid) {
		inter2.update(inter2.message.content, { components: [] });
		inter2.followUp("You can't use old Uno buttons.", { ephemeral: true });
		return false;
	}
	if (inter2.customID === "PASS") {
		try {
			chan.uno.game.pass();
		} catch (e) {
			if (e.message.includes("must draw at least one card")) {
				inter2.update(inter2.message.content, { components: [] });
				inter2.followUp("You can't use old Uno buttons.", { ephemeral: true });
				return false;
			}
			errHandler("error", e);
			return false;
		}
		await inter2.update("Passed", { components: [] });
		await chan.send(`${inter2.member} passed`, { allowedMentions: { users: [] } });
		chan.uno.drawn = false;
		return true;
	}

	if (inter2.customID.includes("NO_COLOR")) {
		const ret = await playedWildCard(inter2, chan, card.value.toString(), pid);
		return ret;
	}

	await inter2.update(interaction.customID, { components: [] });
	const drawn = { didDraw: false };
	chan.uno.game.play(card);
	if (!chan.uno) return false;
	if (chan.uno.game.discardedCard.value.toString() === "DRAW_TWO") {
		drawn.player = chan.uno.players.get(chan.uno.game.currentPlayer.name);
		chan.uno.game.draw();
		drawn.didDraw = true;
	}
	player.interaction = inter2;
	const c = chan.uno.game.discardedCard.value.toString().toLowerCase();
	await inter2.followUp(`${inter2.member} played ${getPlainCard(card)}${(drawn.didDraw) ? `, ${drawn.player} drew ${(c.includes("two") ? "2" : "4")} cards.` : ""}`, {
		allowedMentions: {
			users: [],
		},
		ephemeral: false,
	});
	if (!chan.uno) return false;
	chan.uno.drawn = false;
	return true;
}

module.exports = managePostDraw;
