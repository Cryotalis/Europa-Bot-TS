import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, Role, SlashCommandBuilder } from 'discord.js'
import { servers } from '../bot.js'
import { findBestCIMatch } from '../modules/string.js'
import { categoryRole } from '../data/variables.js'

export const command = {
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
		.addSubcommand(subcommand =>
			subcommand
				.setName('register')
				.setDescription('Register a raid role with a raid name')
				.addRoleOption(option => option.setName('role').setDescription('The raid role to register').setRequired(true))
				.addStringOption(option => option.setName('raid').setDescription('The raid to register the raid role with').setAutocomplete(true).setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('unregister')
				.setDescription('Unregister a raid role')
				.addRoleOption(option => option.setName('role').setDescription('The raid role to unregister').setRequired(true))
		)
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const rolesInput = interaction.options.getString('roles')?.match(/[\w\s]+/g)?.filter(r => /\w/.test(r))
		const category = interaction.options.getString('category')
		const newCategory = interaction.options.getString('name')!

		const raidRole = interaction.options.getRole('role')!
		const raidName = interaction.options.getString('raid')!

		const clientUser = interaction.guild?.members.me! as GuildMember
		const server = servers.find(server => server.get('guildID') === interaction.guildId)
		if (!server) return interaction.reply('Unable to access settings for your server.')

		const serverRolesConfig: categoryRole[] = server.get('roles') ? JSON.parse(server.get('roles')) : []
		const serverRoles = interaction.guild?.roles.cache.filter((role: Role) => role.name !== '@everyone' && !role.managed)
		const addedRoles: (Role|string)[] = [], removedRoles: (Role|string)[] = [], invalidRoles: (Role|string)[] = []

		const command = interaction.options.getSubcommand()
		switch (command) {
			case 'add':
				if (!rolesInput?.length) return interaction.reply('The roles you provided were invalid.')
				if (serverRolesConfig.filter(role => role.category === category).length >= 45){
					return interaction.reply('You cannot add any more roles to this category!')
				}

				rolesInput!.forEach(roleInput => {
					const role = /^\d+$/.test(roleInput)
						? serverRoles?.find((role: Role) => role.id === roleInput)
						: serverRoles?.find((role: Role) => role.name === findBestCIMatch(roleInput, serverRoles.map((role: Role) => role.name)).bestMatch.target)
					const serverRole = serverRolesConfig.find(serverRole => serverRole.id === role?.id)
					
					if (!role || clientUser.roles.highest.position <= role.position) {
						invalidRoles.push(role ?? roleInput)
					} else if (serverRole) {
						serverRolesConfig.splice(serverRolesConfig.indexOf(serverRole), 1, {id: role.id, category: category ?? 'General'})
						addedRoles.push(role)
					} else {
						serverRolesConfig.push({id: role.id, category: category ?? 'General'})
						addedRoles.push(role)
					}
				})
				break
			case 'remove':
				if (!rolesInput?.length) return interaction.reply('The roles you provided were invalid.')
				
				rolesInput!.forEach(roleInput => {
					const role = /^\d+$/.test(roleInput)
						? serverRoles?.find((role: Role) => role.id === roleInput)
						: serverRoles?.find((role: Role) => role.name === findBestCIMatch(roleInput, serverRoles.map((role: Role) => role.name)).bestMatch.target)
					const serverRole = serverRolesConfig.find(serverRole => serverRole.id === role?.id)
					
					if (!role || !serverRole) {
						invalidRoles.push(roleInput)
					} else {
						const newServerRole = serverRole
						delete newServerRole.category
						serverRolesConfig.splice(serverRolesConfig.indexOf(serverRole), 1, newServerRole)
						removedRoles.push(role)
					}
				})
				break
			case 'rename':
				if (!serverRolesConfig.some(role => role.category === category)) return interaction.reply(`I could not find a category named \"${category}\"!`)
				serverRolesConfig.filter(role => role.category === category).forEach(role => role.category = newCategory)
				break
			case 'register': {
				const serverRole = serverRolesConfig.find(role => role.id === raidRole.id)

				if (serverRole) {
					const newRole = {...serverRole, raids: (serverRole.raids ?? []).concat(raidName)}
					serverRolesConfig.splice(serverRolesConfig.indexOf(serverRole), 1, newRole)
				} else {
					serverRolesConfig.push({id: raidRole.id, raids: [raidName]})
				}
				break
			}
			case 'unregister': {
				const serverRole = serverRolesConfig.find(role => role.id === raidRole.id && role.raids)

				if (!serverRole) return interaction.reply('That role is not registered to a raid!')
				
				const newServerRole = serverRole
				delete newServerRole.raids
				serverRolesConfig.splice(serverRolesConfig.indexOf(serverRole), 1, newServerRole)
			}
		}

		const validRoles = serverRolesConfig.filter(role => role.raids || role.category)
		server.set('roles', JSON.stringify(validRoles))
		await server.save()

		const updated = addedRoles.concat(removedRoles).length !== 0 || command === 'rename'
		const rolesEmbed = new EmbedBuilder()
			.setAuthor({
				name: `Server role list for ${interaction.guild?.name} was ${updated ? 'updated' : 'not updated'}`,
				iconURL: interaction.guild?.iconURL({extension: 'png'}) ?? undefined
			})
			.setColor('Blue')

		if (addedRoles.length > 0) 	 rolesEmbed.addFields([{name: `Roles added to category '${category}':`, value: `${addedRoles.join(' ')}`}])
		if (removedRoles.length > 0) rolesEmbed.addFields([{name: `Roles removed:`, value: `${removedRoles.join(' ')}`}])
		if (invalidRoles.length > 0) rolesEmbed.addFields([{name: 'Invalid roles:', value: `${invalidRoles.join(' ')}`}])
		if (command === 'rename') 	 rolesEmbed.setDescription(`**Successfully renamed category \`${category}\` to \`${newCategory}\`**`)
		
		if (command === 'register') {
			rolesEmbed
				.setAuthor({
					name: 'Raid role registered',
					iconURL: interaction.guild?.iconURL({extension: 'png'}) ?? undefined
				})
				.addFields([
					{name: 'Role', value: String(raidRole), inline: true},
					{name: 'Raid', value: raidName, inline: true}
				])
		}
		if (command === 'unregister') {
			rolesEmbed
				.setAuthor({
					name: 'Raid role unregistered',
					iconURL: interaction.guild?.iconURL({extension: 'png'}) ?? undefined
				})
				.setDescription(`Raid role ${raidRole} has been unregistered`)
		}

		return interaction.reply({embeds: [rolesEmbed]})
	}
}