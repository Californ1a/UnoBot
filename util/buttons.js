const { MessageActionRow } = require("discord.js");

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
	return (color === "BLUE") ? "PRIMARY" : (color === "GREEN") ? "SUCCESS" : (color === "RED") ? "DANGER" : "SECONDARY";
}

function buttonsToMessageActions(buttons) {
	return buttons.map(b => new MessageActionRow().addComponents(b));
}

module.exports = {
	addButton,
	colorToButtonStyle,
	buttonsToMessageActions,
};
