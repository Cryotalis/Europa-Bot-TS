import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, Role, SlashCommandBuilder } from 'discord.js'
import { categoryRole, servers } from '../bot'
import { findBestMatch } from 'string-similarity'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('role')
		.setDescription('Manage your roles')
		.addStringOption(option => option.setName('roles').setDescription('The roles to add or remove (@mention the roles)').setRequired(true))
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const clientUser = interaction.guild?.members.me! as GuildMember
		if (!clientUser.permissions.has('ManageRoles')) return interaction.reply('I do not have permission to assign roles in this server.')

		const server = servers.find(server => server.guildID === interaction.guildId)
		if (!server || !server.roles) return interaction.reply('No roles are set for your server.')
		
		const rolesInput = interaction.options.getString('roles')!.match(/[\w\s]+/g)?.filter(r => /\w/.test(r))
		if (!rolesInput?.length) return interaction.reply('The roles you provided were invalid.')

		const serverRolesConfig: categoryRole[] = JSON.parse(server.roles)
		const serverRoles = interaction.guild?.roles.cache.filter(role => role.name !== '@everyone' && !role.managed)
		const member = interaction.member as GuildMember

		const addedRoles: Role[] = [], notAddedRoles: (Role|string)[] = [], removedRoles: Role[] = []
		rolesInput.forEach(roleInput => {
			const role = /^\d+$/.test(roleInput)
				? serverRoles?.find(role => role.id === roleInput)
				: serverRoles?.find(role => role.name === findBestMatch(roleInput, serverRoles.map(role => role.name)).bestMatch.target)
			
			if (!role){
				notAddedRoles.push(roleInput)
			} else if (!serverRolesConfig.some(serverRole => serverRole.id === role.id) || clientUser.roles.highest.position <= role.position) {
				notAddedRoles.push(role)
			} else if (member.roles.cache.find(r => r === role)){
				member.roles.remove(role)
				removedRoles.push(role)
			} else {
				member.roles.add(role)
				addedRoles.push(role)
			}
		})
		
		const rolesEmbed = new EmbedBuilder()
			.setAuthor({
				name: `Roles were${addedRoles.concat(removedRoles).length === 0 ? ' not ' : ' '}changed for ${member.nickname ?? member.user.username}`,
				iconURL: interaction.user.displayAvatarURL({extension: 'png'})
			})
			.setColor('Blue')

		if (addedRoles.length > 0) rolesEmbed.addFields([{name: 'Added Roles:', value: `${addedRoles.join(' ')}`}])
		if (removedRoles.length > 0) rolesEmbed.addFields([{name: 'Removed Roles:', value: `${removedRoles.join(' ')}`}])
		if (notAddedRoles.length > 0) rolesEmbed.addFields([{name: 'Unavailable Roles:', value: `${notAddedRoles.join(' ')}`}])

		return interaction.reply({embeds: [rolesEmbed]})
	}
}