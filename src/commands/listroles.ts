import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { servers } from '../bot.js'
import { categoryRole } from '../data/variables.js'

export const command = {
	data: new SlashCommandBuilder()
		.setName('listroles')
		.setDescription('Show the list of available roles for this server')
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const server = servers.find(server => server.get('guildID') === interaction.guildId)
		const serverRoles: categoryRole[] = JSON.parse(server?.get('roles') ?? '[]')
		if (!serverRoles.length) return interaction.reply('No roles are set for your server.')
		const roleCategories = [...new Set(serverRoles.map(role => role.category))].filter((c): c is string => !!c)

		if (roleCategories.some(category => serverRoles.filter(role => role.category === category).length > 45)){
			return interaction.reply('Server role list could not be displayed because more than 45 roles are assigned to one category.')
		}

		const rolesEmbed = new EmbedBuilder()
			.setTitle('Server Role List')
			.setColor('Blue')
		
		roleCategories.sort()
		roleCategories.sort((a, b) => (a === 'General' ? -1 : b === 'General' ? 1 : 0))
		roleCategories.forEach(category => {
			const categoryRoles = serverRoles.filter(role => role.category === category).map(role => `<@&${role.id}>`)
			rolesEmbed.addFields([{name: category, value: categoryRoles.join(' ')}])
		})

		return interaction.reply({embeds: [rolesEmbed]})
	}
}