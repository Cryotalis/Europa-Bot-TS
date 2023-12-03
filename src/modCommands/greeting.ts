import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder } from 'discord.js'
import { servers } from '../bot'
import { findBestMatch } from 'string-similarity'
import { getImageLink } from '../modules/image'
import { titleize } from '../modules/string'
import { greetingConfig, makeGreetingImage, toggleableGreetingSetting } from '../modules/greeting'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('greeting')
		.setDescription('Manage settings for the greeting system')
		.addSubcommand(subcommand =>
			subcommand
				.setName('toggle')
				.setDescription('Toggle greeting settings on or off')
				.addStringOption(option =>
					option
						.setName('setting')
						.setDescription('The setting to toggle on or off')
						.addChoices(
							{name: 'Join Message', value: 'sendJoinMessage'},
							{name: 'Leave Message', value: 'sendLeaveMessage'},
							{name: 'Ban Message', value: 'sendBanMessage'},
							{name: 'Join Image', value: 'showJoinImage'},
							{name: 'AutoRole', value: 'useAutoRole'}
						)
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('join-message')
				.setDescription('Set the message to be sent when someone joins the server')
				.addStringOption(option => option.setName('message').setDescription('Tip: Include [member] in your message to mention the user.').setRequired(true))	
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('leave-message')
				.setDescription('Set the message to be sent when someone leaves the server')
				.addStringOption(option => option.setName('message').setDescription('Tip: Include [member] in your message to mention the user.').setRequired(true))	
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('ban-message')
				.setDescription('Set the message to be sent when someone is banned from the server')
				.addStringOption(option => option.setName('message').setDescription('Tip: Include [member] in your message to mention the user.').setRequired(true))	
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('channel')
				.setDescription('Set the channel the join/leave/ban messages are to be sent in')
				.addChannelOption(option => option.setName('channel').setDescription('The link to the background image for the greeting image').setRequired(true))	
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('background')
				.setDescription('Set the background image for the greeting image')
				.addAttachmentOption(option => option.setName('image').setDescription('An attached image for the background of the greeting image'))
				.addStringOption(option => option.setName('link').setDescription('The link to the background image for the greeting image'))	
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('autorole')
				.setDescription('Set the roles to be assigned when someone joins the server')
				.addStringOption(option => option.setName('roles').setDescription('The roles to be assigned when someone joins the server').setRequired(true))	
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('settings')
				.setDescription('Show the greeting settings for this server')
		)
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const server = servers.find(server => server.guildID === interaction.guildId)
		if (!server) return interaction.reply('Unable to access settings for your server.')
		const channels = interaction.guild?.channels.cache.map(channel => channel)!
		const generalChannel = channels[findBestMatch('general', channels?.map(channel => channel.name)).bestMatchIndex].id

		const command = interaction.options.getSubcommand()
		const setting = interaction.options.getString('setting')! as toggleableGreetingSetting
		const message = interaction.options.getString('message')!
		const channel = interaction.options.getChannel('channel')!
		const linkInput = interaction.options.getString('link')
		const imageInput = interaction.options.getAttachment('image')
		const roleIDs = interaction.options.getString('roles')?.match(/\d+/g)

		const greetingSettings: greetingConfig = server.greeting
			? JSON.parse(server.greeting)
			: {
				joinMessage: '👋 Welcome to the server, [member]!',
				leaveMessage: '👋 Goodbye, [member].',
				banMessage: '🔨 [member] has been banned.',
				channelID: generalChannel,
				background: null,
				autoRoles: [],
				sendJoinMessage: false,
				sendLeaveMessage: false,
				sendBanMessage: false,
				showJoinImage: true,
				useAutoRole: false,
			} 
		
		if (command === 'toggle'){
			greetingSettings[setting] = !greetingSettings[setting as toggleableGreetingSetting]
			if (/Image|Role/.test(setting)) interaction.reply(`${/Image/.test(setting) ? 'Join Image' : 'Auto Role'} has been ${greetingSettings[setting] ? 'enabled' : 'disabled'}.`)
			else interaction.reply(`${titleize(String(setting.match(/(?<=send).+(?=Message)/)))} Message has been ${greetingSettings[setting] ? 'enabled' : 'disabled'}.`)
		} else if (/message/.test(command)){
			const msgType = String(command.match(/.+(?=-)/)) + 'Message'
			greetingSettings[msgType as 'joinMessage' | 'leaveMessage' | 'banMessage'] = message
			interaction.reply(`${titleize(String(msgType.match(/.+(?=Message)/)))} Message set.`)
		} else if (command === 'channel'){
			greetingSettings.channelID = channel.id
			interaction.reply(`Greeting channel set to <#${channel.id}>`)
		} else if (command === 'background'){
			const {errorMsg, imageLink} = await getImageLink(linkInput, imageInput)
			if (errorMsg) return interaction.reply(errorMsg)
			greetingSettings.background = imageLink
			interaction.reply('Join image background set.')
		} else if (command === 'autorole'){
			if (!roleIDs) return interaction.reply('The roles you provided were invalid.')
			const clientUser = interaction.guild?.members.me! as GuildMember
			const addedRoles: string[] = [], invalidRoles: string[] = []
			greetingSettings.autoRoles = []

			roleIDs.forEach(roleID => {
				const role = interaction.guild?.roles.cache.find(role => role.id === roleID)
				if (!role || clientUser.roles.highest.position <= role.position) {
					invalidRoles.push(`<@&${roleID}>`)
					greetingSettings.autoRoles.push(roleID)
				} else {
					addedRoles.push(`<@&${roleID}>`)
					greetingSettings.autoRoles.push(roleID)
				}
			})

			const rolesEmbed = new EmbedBuilder()
				.setAuthor({
					name: `AutoRoles were${addedRoles.length === 0 ? ' not ' : ' '}set`,
					iconURL: interaction.guild?.iconURL({extension: 'png'}) ?? ''
				})
				.setColor('Blue')

			if (addedRoles.length > 0) rolesEmbed.addFields([{name: `Auto-Assigned Roles:`, value: `${addedRoles.join(' ')}`}])
			if (invalidRoles.length > 0) rolesEmbed.addFields([{name: 'Invalid roles:', value: `${invalidRoles.join(' ')}`}])

			interaction.reply({embeds: [rolesEmbed]})
		} else if (command === 'settings'){	
			let joinMsg = greetingSettings.joinMessage
			let	leaveMsg = greetingSettings.leaveMessage
			let	banMsg = greetingSettings.banMessage
			
			joinMsg = joinMsg.replace('[member]', String(interaction.user))
			leaveMsg = leaveMsg.replace('[member]', interaction.user.username)
			banMsg = banMsg.replace('[member]', interaction.user.username)
	
			if (joinMsg.length > 1000) {joinMsg = joinMsg.substring(0, 1000) + '...' }
			if (leaveMsg.length > 1000) {leaveMsg = leaveMsg.substring(0, 1000) + '...' }
			if (banMsg.length > 1000) {banMsg = banMsg.substring(0, 1000) + '...' }
			
			const greetingEmbed = new EmbedBuilder()
				.setTitle('Server Greeting Settings')
				.setColor('Blue')
				.setDescription(`Greeting messages are currently set to be sent in <#${greetingSettings.channelID}>.`)
				.addFields([
					{name: 'Join Message', value: greetingSettings.sendJoinMessage ? 'Enabled' : 'Disabled', inline: true},
					{name: '\u200b', value: '\u200b', inline: true},
					{name: 'Leave Message', value: greetingSettings.sendLeaveMessage ? 'Enabled' : 'Disabled', inline: true},
					{name: 'Ban Message', value: greetingSettings.sendBanMessage ? 'Enabled' : 'Disabled', inline: true},
					{name: '\u200b', value: '\u200b', inline: true},
					{name: 'Auto Role', value: greetingSettings.useAutoRole ? 'Enabled' : 'Disabled', inline: true},
					{name: 'Join Message', value: joinMsg},
					{name: 'Leave Message', value: leaveMsg},
					{name: 'Ban Message', value: banMsg},
					{name: 'Auto-Assigned Roles', value: greetingSettings.autoRoles.length > 0 ? greetingSettings.autoRoles.map(roleID => `<@&${roleID}>`).join(' ') : 'None'},
					{name: '\u200b', value: `**Join Image \`${greetingSettings.showJoinImage ? 'Enabled' : 'Disabled'}\`**`},
				])
				.setImage('attachment://welcome.png')
			if (!greetingSettings.channelID) greetingEmbed.setDescription('No channel has been set to display greeting messages.')
			return interaction.reply({embeds: [greetingEmbed], files: [await makeGreetingImage(greetingSettings, interaction.user)]})
		}

		server.greeting = JSON.stringify(greetingSettings)
		server.save()
	}
}