const { ActionRowBuilder } = require("discord.js");

function addButton(buttons, button) {
	const last = buttons[buttons.length - 1];
	if (last.length !== 5) {
		last.push(button);
	} else if (buttons.length !== 5) {
		buttons.push([button]);
	}
	return buttons;
}

function colorToButtonStyle(color) {
	return (color === "BLUE") ? 1 : (color === "GREEN") ? 3 : (color === "RED") ? 4 : 2;
}

function buttonsToMessageActions(buttons) {
	return buttons.map(b => new ActionRowBuilder().addComponents(...b));
}

module.exports = {
	addButton,
	colorToButtonStyle,
	buttonsToMessageActions,
};
