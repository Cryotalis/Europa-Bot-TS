import { CommandInteraction, GuildMember, MessageEmbed, Role } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { categoryRole, servers } from '../bot'
import { findBestMatch } from 'string-similarity'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rolelist')
		.setDescription('Manage the server role list')
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add one or more roles to the server role list under a category')
				.addStringOption(option => option.setName('roles').setDescription('The roles to add').setRequired(true))
				.addStringOption(option => option.setName('category').setDescription('The category to add the roles to'))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Remove one or more roles from the server role list')
				.addStringOption(option => option.setName('roles').setDescription('The roles to remove').setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('rename')
				.setDescription('Rename a role category')
				.addStringOption(option => option.setName('category').setDescription('The category to be renamed').setRequired(true))
				.addStringOption(option => option.setName('name').setDescription('The new name for the category').setRequired(true))	
		)
	,
	async execute(interaction: CommandInteraction) {
		const rolesInput = interaction.options.getString('roles')!.match(/[\w\s]+/g)?.filter(r => /\w/.test(r))
		const category = interaction.options.getString('category') ?? 'General'
		const newName = interaction.options.getString('name')!
		if (!rolesInput?.length && !newName) return interaction.reply('The roles you provided were invalid.')

		const clientUser = interaction.guild?.me! as GuildMember
		const server = servers.find(server => server.guildID === interaction.guildId)
		if (!server) return interaction.reply('Unable to access settings for your server.')

		const serverRolesConfig: categoryRole[] = server.roles ? JSON.parse(server.roles) : []
		const serverRoles = interaction.guild?.roles.cache.filter(role => role.name !== '@everyone' && !role.managed)
		const addedRoles: (Role|string)[] = [], removedRoles: (Role|string)[] = [], invalidRoles: (Role|string)[] = []

		const command = interaction.options.getSubcommand()
		if (command === 'add'){
			rolesInput!.forEach(roleInput => {
				const role = /^\d+$/.test(roleInput)
					? serverRoles?.find(role => role.id === roleInput)
					: serverRoles?.find(role => role.name === findBestMatch(roleInput, serverRoles.map(role => role.name.toLowerCase())).bestMatch.target)
				const serverRole = serverRolesConfig.find(serverRole => serverRole.id === role?.id)
				
				if (!role || clientUser.roles.highest.position <= role.position) {
					invalidRoles.push(role ?? roleInput)
				} else if (serverRole) {
					serverRolesConfig.splice(serverRolesConfig.indexOf(serverRole), 1, {id: role.id, category: category})
					addedRoles.push(role)
				} else {
					serverRolesConfig.push({id: role.id, category: category})
					addedRoles.push(role)
				}
			})
		} else if (command === 'remove') {
			rolesInput!.forEach(roleInput => {
				const role = /^\d+$/.test(roleInput)
					? serverRoles?.find(role => role.id === roleInput)
					: serverRoles?.find(role => role.name === findBestMatch(roleInput, serverRoles.map(role => role.name)).bestMatch.target)
				const serverRole = serverRolesConfig.find(serverRole => serverRole.id === role?.id)
				
				if (!role || !serverRole) {
					invalidRoles.push(roleInput)
				} else {
					serverRolesConfig.splice(serverRolesConfig.indexOf(serverRole), 1)
					removedRoles.push(role)
				}
			})
		} else {
			if (!serverRolesConfig.some(role => role.category === category)) return interaction.reply('I could not find a category with that name!')
			serverRolesConfig.forEach(role => {
				if (role.category === category) {
					addedRoles.push(`<@&${role.id}>`)
					removedRoles.push(`<@&${role.id}>`)
					role.category = newName
				}
			})
		}
		server.roles = JSON.stringify(serverRolesConfig)
		await server.save()

		const rolesEmbed = new MessageEmbed()
			.setAuthor({
				name: `Server role list for ${interaction.guild?.name} was${addedRoles.concat(removedRoles).length === 0 ? ' not ' : ' '}updated`,
				iconURL: interaction.guild?.iconURL({format: 'png'}) ?? ''
			})
			.setColor('BLUE')

		if (removedRoles.length > 0) rolesEmbed.addField(`Roles removed from category '${category}':`, `${removedRoles.join(' ')}`)
		if (addedRoles.length > 0) rolesEmbed.addField(`Roles added to category '${newName ?? category}':`, `${addedRoles.join(' ')}`)
		if (invalidRoles.length > 0) rolesEmbed.addField('Invalid roles:', `${invalidRoles.join(' ')}`)

		return interaction.reply({embeds: [rolesEmbed]})
	}
}