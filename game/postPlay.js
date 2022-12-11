const errHandler = require("../util/err.js");
const getPlainCard = require("./getPlainCard.js");
const getHand = require("./getHand.js");

const noMention = {
	allowedMentions: {
		users: [],
	},
};

async function postPlay(chan, interaction, card) {
	const drawn = { didDraw: false };
	const playingPlayer = chan.uno.game.currentPlayer;
	try {
		chan.uno.game.play(card);
		chan.uno.selectingColor = false;

		const playedStr = `${interaction?.member} played ${getPlainCard(card)}`;
		if (!chan.uno && interaction) {
			if (interaction.type === 3) {
				await interaction.update({ content: interaction.message.content, components: [] });
				await interaction.followUp({ content: playedStr, ...noMention });
			} else {
				await interaction.reply({ content: playedStr, ...noMention });
			}
			return false;
		}
		if (interaction?.type === 3) {
			await interaction.update({ content: card.toString(), components: [] });
		}
		if (!chan.uno) return false;

		if (playingPlayer.hand.length !== 0
			&& chan.uno.game.discardedCard.value.toString().match(/^(draw_two|wild_draw_four)$/i)) {
			drawn.player = {
				user: chan.uno.players.get(chan.uno.game.currentPlayer.name).member,
				handCount: chan.uno.game.currentPlayer.hand.length,
			};
			chan.uno.game.draw();
			drawn.didDraw = true;
		}
	} catch (e) {
		if (e.message.includes("does not have card")) {
			await interaction.reply({ content: "You do not have that card.", ephemeral: true });
			return false;
		}
		if (e.message.includes("from discard pile, does not match")) {
			await interaction.reply({ content: "That card can't be played now.", ephemeral: true });
			return false;
		}
		errHandler("error", e);
		await interaction.reply("An unknown error occurred.");
		return false;
	}
	const p = chan.uno.players.get(playingPlayer.name);
	if (interaction && p.interaction) {
		if (interaction.channel.id === p.interaction.channel.id) {
			chan.uno.players.get(playingPlayer.name).interaction = interaction;
		}
	}
	const c = chan.uno.game.discardedCard.value.toString().toLowerCase();

	const drewAmnt = (c.includes("two") ? 2 : 4);
	const drewStr = `${drawn.player?.user} drew ${drewAmnt} cards (${drawn.player?.handCount}->${drawn.player?.handCount + drewAmnt}).`;
	const someoneDrew = (drawn.didDraw) ? `, ${drewStr}` : "";
	const played = `${interaction?.member} played ${getPlainCard(card)}`;

	if (drawn.didDraw) {
		if (!interaction) {
			await chan.send(drewStr, noMention);
		} else if (interaction.type === 3) {
			await interaction.followUp({ content: `${played}${someoneDrew}`, ...noMention });
		} else {
			await interaction.reply({ content: `${played}${someoneDrew}`, ...noMention });
		}
	} else if (interaction?.type === 3) {
		await interaction.followUp({ content: played, ...noMention });
	} else if (interaction?.type === 2) {
		await interaction.reply({ content: played, ...noMention });
	}
	if (playingPlayer.name !== chan.guild.members.me.id) {
		const { handStr } = getHand(playingPlayer);
		chan.uno.playerCustomId = `${playingPlayer.name}+${handStr}`;
	}
	return true;
}

module.exports = postPlay;
