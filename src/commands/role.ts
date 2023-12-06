import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, Role, SlashCommandBuilder } from 'discord.js'
import { categoryRole, servers } from '../bot'
import { findBestCIMatch } from '../modules/string'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('role')
		.setDescription('Manage your roles')
		.addStringOption(option => option.setName('roles').setDescription('The roles to add or remove (@mention the roles)').setRequired(true))
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const clientUser = interaction.guild?.members.me! as GuildMember
		if (!clientUser.permissions.has('ManageRoles')) return interaction.reply('I do not have permission to assign roles in this server.')

		const server = servers.find(server => server.get('guildID') === interaction.guildId)
		if (!server?.get('roles')) return interaction.reply('No roles are set for your server.')
		
		const rolesInput = interaction.options.getString('roles')!.replace(/(<@&\d+>)/g, '$1, ').match(/(?! )[^,]+(?<! )/g)
		if (!rolesInput?.length) return interaction.reply('The roles you provided were invalid.')

		const serverRolesConfig: categoryRole[] = JSON.parse(server.get('roles'))
		const serverRoles = interaction.guild?.roles.cache.filter((role: Role) => role.name !== '@everyone' && !role.managed)
		if (!serverRoles) return interaction.reply('Your server does not have any roles that I can assign to you.')
		
		const member = interaction.member as GuildMember
		const addedRoles: Role[] = [], removedRoles: Role[] = [], notAddedRoles: (Role|string)[] = [], notPermittedRoles: Role[] = []
		rolesInput.forEach(roleInput => {
			const role = /<@&\d+>/.test(roleInput)
				? serverRoles.find((role: Role) => role.id === roleInput.match(/\d+/)![0])
				: serverRoles.find((role: Role) => role.name === findBestCIMatch(roleInput, serverRoles.map((role: Role) => role.name)).bestMatch.target)
			
			if (!role){
				notAddedRoles.push(roleInput)
			} else if (!serverRolesConfig.some(serverRole => serverRole.id === role.id)) {
				notAddedRoles.push(role)
			} else if (clientUser.roles.highest.position <= role.position) {
				notPermittedRoles.push(role)
			} else if (member.roles.cache.find((r: Role) => r === role)){
				member.roles.remove(role)
				removedRoles.push(role)
			} else {
				member.roles.add(role)
				addedRoles.push(role)
			}
		})
		
		const rolesEmbed = new EmbedBuilder()
			.setAuthor({name: `Roles changes for ${member.displayName}:`, iconURL: interaction.user.displayAvatarURL({extension: 'png'})})
			.setColor('Blue')

		if (addedRoles.length) rolesEmbed.addFields([{name: 'Added Roles:', value: `${addedRoles.join(' ')}`}])
		if (removedRoles.length) rolesEmbed.addFields([{name: 'Removed Roles:', value: `${removedRoles.join(' ')}`}])
		if (notAddedRoles.length) rolesEmbed.addFields([{name: 'Roles not available on the server role list:', value: `${notAddedRoles.join(' ')}`}])
		if (notPermittedRoles.length) rolesEmbed.addFields([{name: 'Roles I don\'t have permission to assign:', value: `${notAddedRoles.join(' ')}`}])

		return interaction.reply({embeds: [rolesEmbed]})
	}
}