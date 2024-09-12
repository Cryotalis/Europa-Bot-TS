import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { servers } from '../bot.js'
import { categoryRole } from '../data/variables.js'

export const command = {
	data: new SlashCommandBuilder()
		.setName('listroles')
		.setDescription('Show the list of available roles for this server')
		.addBooleanOption(option => option.setName('raidroles').setDescription('Whether or not to instead show the raid roles list'))
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const server = servers.find(server => server.get('guildID') === interaction.guildId)
		const serverRoles: categoryRole[] = JSON.parse(server?.get('roles') ?? '[]')
		const assignableRoles = serverRoles.filter(role => role.category)
		const raidRoles = serverRoles.filter(role => role.raids)
		const showRaidRoles = interaction.options.getBoolean('raidroles')

		if (showRaidRoles) {
			if (!raidRoles.length) return interaction.reply('No raid roles are set for your server.')

			let raidroleList = ''

			raidRoles.forEach(role => {
				raidroleList += `> [@${interaction.guild?.roles.cache.get(role.id)?.name}]\n`
				raidroleList +=	role.raids?.map(raid => `    * ${raid}`).join('\n') + '\n'
			})

			interaction.reply({files: [{attachment: Buffer.from(raidroleList), name: 'Raid Roles.md'}]})
		} else {
			if (!assignableRoles.length) return interaction.reply('No assignable roles are set for your server.')
		
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
	
			interaction.reply({embeds: [rolesEmbed]})
		}
	}
}