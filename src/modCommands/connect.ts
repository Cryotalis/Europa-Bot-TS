import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { connectToDB, registerCommands } from '../bot'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('connect')
		.setDescription("Refresh Europa's connection to the database (reserved for Cryo)")
	,
	async execute(interaction: ChatInputCommandInteraction) {
		if (interaction.user.id !== '251458435554607114') {
			return interaction.reply('This command is reserved for Cryo.')
		}
		
		await interaction.reply('Connecting to Database <a:loading:763160594974244874>')
		await connectToDB()
		await registerCommands()
		interaction.editReply('Database Connection Successful.')
	}
}