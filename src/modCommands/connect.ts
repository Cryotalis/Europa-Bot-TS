import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { registerCommands } from '../bot.js'
import { connectDatabase } from '../data/database.js'

export const command = {
	data: new SlashCommandBuilder()
		.setName('connect')
		.setDescription("Refresh Europa's connection to the database (Developer Only)")
	,
	async execute(interaction: ChatInputCommandInteraction) {
		if (interaction.user.id !== '251458435554607114') {
			return interaction.reply({content: 'You do not have permission to use this command.', ephemeral: true})
		}
		
		await interaction.reply('Connecting to Database <a:loading:763160594974244874>')
		await connectDatabase()
		await registerCommands()
		interaction.editReply('Database Connection Successful.')
	}
}