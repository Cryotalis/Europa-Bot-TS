import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { servers, categoryRole } from '../bot'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('listroles')
		.setDescription('Show the list of available roles for this server')
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const server = servers.find(server => server.guildID === interaction.guildId)
		const serverRolesConfig: categoryRole[] = JSON.parse(server?.roles ?? '[]')
		if (!serverRolesConfig.length) return interaction.reply('No roles are set for your server.')
		const roleCategories = [...new Set(serverRolesConfig.map(role => role.category))]

		const rolesEmbed = new EmbedBuilder()
			.setTitle('Server Role List')
			.setColor('Blue')
		
		roleCategories.sort()
		roleCategories.sort((a, b) => (a === 'General' ? -1 : b === 'General' ? 1 : 0))
		roleCategories.forEach(category => {
			const categoryRoles = serverRolesConfig.filter(role => role.category === category).map(role => `<@&${role.id}>`)
			rolesEmbed.addFields([{name: category, value: categoryRoles.join(' ')}])
		})

		return interaction.reply({embeds: [rolesEmbed]})
	}
}