import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export const command = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription("Show Europa's response time")
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const time = Date.now()
		await interaction.reply('Pinging <a:loading:763160594974244874>')
		await interaction.editReply(`Pong! - Time: **${Math.abs(interaction.createdTimestamp - time)}ms**`)
	}
}