import { CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('drunk')
		.setDescription('Convfrt text joto erunk text')
		.addStringOption(option => option.setName('text').setDescription("The text you'd like to convert to drunk text").setRequired(true))
	,
	async execute(interaction: CommandInteraction) {
		const text = interaction.options.getString('text')!
		let drunkMsg = ''

		for (const letter of text){
			const rand = Math.floor(Math.random() * 5) // Pick a random number between 0 and 4, inclusive (1/5 chance)
			drunkMsg += !rand && /\w/.test(letter) 
				? String.fromCharCode(letter.charCodeAt(0) + 1) // Shift the letter to the right (a -> b, b -> c, etc)
				: letter // Leave the letter alone otherwise
		}
		return interaction.reply(drunkMsg)
	}
}