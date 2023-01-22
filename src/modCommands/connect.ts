import { CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { connectToDB, registerCommands } from '../bot'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('connect')
		.setDescription("Refresh Europa's connection to the database (reserved for Cryo)")
	,
	async execute(interaction: CommandInteraction) {
		if (interaction.user.id !== '251458435554607114') {
			return interaction.reply('This command is reserved for Cryo.')
		}
		
		await interaction.reply('Connecting to Database <a:loading:763160594974244874>')
		await connectToDB()
		await registerCommands()
		interaction.editReply('Database Connection Successful.')
	}
}