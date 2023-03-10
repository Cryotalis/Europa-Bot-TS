import { CommandInteraction, GuildMember, MessageAttachment, MessageEmbed } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { greetingConfig, servers } from '../bot'
import { findBestMatch } from 'string-similarity'
import { capitalize, getDirectImgurLinks } from '../library'
import { createCanvas, loadImage } from 'canvas'

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
						.addChoices([
							['Join Message', 'sendJoinMessage'],
							['Leave Message', 'sendLeaveMessage'],
							['Ban Message', 'sendBanMessage'],
							['Join Image', 'showJoinImage'],
							['AutoRole', 'useAutoRole']
						])
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
				.addStringOption(option => option.setName('link').setDescription('The link to the background image for the greeting image').setRequired(true))	
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
	async execute(interaction: CommandInteraction) {
		const server = servers.find(server => server.guildID === interaction.guildId)
		if (!server) return interaction.reply('Unable to access settings for your server.')
		const channels = interaction.guild?.channels.cache.map(channel => channel)!
		const generalChannel = channels[findBestMatch('general', channels?.map(channel => channel.name)).bestMatchIndex].id

		const command = interaction.options.getSubcommand()
		const setting = interaction.options.getString('setting')!
		const message = interaction.options.getString('message')!
		const channel = interaction.options.getChannel('channel')!
		const backgroundURL = interaction.options.getString('link')!
		const roleIDs = interaction.options.getString('roles')?.match(/\d+/g)

		const greetingSettings: greetingConfig = server.greeting
			? JSON.parse(server.greeting)
			: {
				joinMessage: '???? Welcome to the server, [member]!',
				leaveMessage: '???? Goodbye, [member].',
				banMessage: '???? [member] has been banned.',
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
			type toggleableGreetingSetting = 'sendJoinMessage' | 'sendLeaveMessage' | 'sendBanMessage' | 'showJoinImage' | 'useAutoRole';
			greetingSettings[setting as toggleableGreetingSetting] = !greetingSettings[setting as toggleableGreetingSetting]
			if (/Image|Role/.test(setting)) interaction.reply(`${/Image/.test(setting) ? 'Join Image' : 'Auto Role'} has been ${greetingSettings[setting as toggleableGreetingSetting] ? 'enabled' : 'disabled'}.`)
			else interaction.reply(`${capitalize(String(setting.match(/(?<=send).+(?=Message)/)))} Message has been ${greetingSettings[setting as toggleableGreetingSetting] ? 'enabled' : 'disabled'}.`)
		} else if (/message/.test(command)){
			const msgType = String(command.match(/.+(?=-)/)) + 'Message'
			greetingSettings[msgType as 'joinMessage' | 'leaveMessage' | 'banMessage'] = message
			interaction.reply(`${capitalize(String(msgType.match(/.+(?=Message)/)))} Message set.`)
		} else if (command === 'channel'){
			greetingSettings.channelID = channel.id
			interaction.reply(`Greeting channel set to <#${channel.id}>`)
		} else if (command === 'background'){
			const validBackground = (await getDirectImgurLinks(backgroundURL))[0]
			if (!validBackground) return interaction.reply('The image link you provided was invalid.')
			greetingSettings.background = validBackground
			interaction.reply('Join image background set.')
		} else if (command === 'autorole'){
			if (!roleIDs) return interaction.reply('The roles you provided were invalid.')
			const clientUser = interaction.guild?.me! as GuildMember
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

			const rolesEmbed = new MessageEmbed()
				.setAuthor({
					name: `AutoRoles were${addedRoles.length === 0 ? ' not ' : ' '}set`,
					iconURL: interaction.guild?.iconURL({format: 'png'}) ?? ''
				})
				.setColor('BLUE')

			if (addedRoles.length > 0) rolesEmbed.addField(`Auto-Assigned Roles:`, `${addedRoles.join(' ')}`)
			if (invalidRoles.length > 0) rolesEmbed.addField('Invalid roles:', `${invalidRoles.join(' ')}`)

			interaction.reply({embeds: [rolesEmbed]})
		} else if (command === 'settings'){
			const canvas = createCanvas(700, 250)
			const ctx = canvas.getContext('2d')
	
			let joinMsg = greetingSettings.joinMessage,
				leaveMsg = greetingSettings.leaveMessage,
				banMsg = greetingSettings.banMessage
			
			joinMsg = joinMsg.replace('[member]', String(interaction.user))
			leaveMsg = leaveMsg.replace('[member]', interaction.user.username)
			banMsg = banMsg.replace('[member]', interaction.user.username)
	
			if (joinMsg.length > 1000) {joinMsg = joinMsg.substring(0, 1000) + '...' }
			if (leaveMsg.length > 1000) {leaveMsg = leaveMsg.substring(0, 1000) + '...' }
			if (banMsg.length > 1000) {banMsg = banMsg.substring(0, 1000) + '...' }
			
			const [background, textBox, userAvatar] = await Promise.all([
				greetingSettings.background ? loadImage(greetingSettings.background) : loadImage('https://cdn.discordapp.com/attachments/659229575821131787/847525054833360896/GBFBackground.jpg'),
				loadImage('https://i.imgur.com/5pMqWKz.png'),
				loadImage(interaction.user.displayAvatarURL({format: 'png', size: 4096}))
			])

			ctx.drawImage(background, 0, 0, canvas.width, canvas.height)
			ctx.drawImage(textBox, 250, 40, 420, 170)
	
			let fontSize = 40
			function applyText(text: string){
				do {
					ctx.font = `${fontSize -= 1}px Times`
				} while (ctx.measureText(text).width > 200)
				return ctx.font
			}
	
			ctx.font = `28px Times`
			ctx.fillStyle = '#000000'
			ctx.fillText('Welcome to the server,', canvas.width / 2.5, canvas.height / 2.8)
			ctx.font = applyText(interaction.user.username + '!')
			ctx.fillText(`${interaction.user.username}!`, canvas.width / 2.5, 160 - (40 - fontSize * 0.5))
	
			ctx.beginPath()
			ctx.arc(125, 125, 100, 0, Math.PI * 2, true)
			ctx.closePath()
			ctx.clip()
			
			ctx.drawImage(userAvatar, 25, 25, 200, 200)
	
			const greetingAttachment = new MessageAttachment(canvas.toBuffer(), 'welcome.png')
			const greetingEmbed = new MessageEmbed()
				.setTitle('Server Greeting Settings')
				.setColor('BLUE')
				.setDescription(`Greeting messages are currently set to be sent in <#${greetingSettings.channelID}>.`)
				.addField('Join Message', greetingSettings.sendJoinMessage ? 'Enabled' : 'Disabled', true)
				.addField('\u200b', '\u200b', true)
				.addField('Leave Message', greetingSettings.sendLeaveMessage ? 'Enabled' : 'Disabled', true)
				.addField('Ban Message', greetingSettings.sendBanMessage ? 'Enabled' : 'Disabled', true)
				.addField('\u200b', '\u200b', true)
				.addField('Auto Role', greetingSettings.useAutoRole ? 'Enabled' : 'Disabled', true)
				.addField('Join Message', joinMsg)
				.addField('Leave Message', leaveMsg)
				.addField('Ban Message', banMsg)
				.addField('Auto-Assigned Roles', greetingSettings.autoRoles.length > 0 ? greetingSettings.autoRoles.map(roleID => `<@&${roleID}>`).join(' ') : 'None')
				.addField('\u200b', `**Join Image \`${greetingSettings.showJoinImage ? 'Enabled' : 'Disabled'}\`**`)
				.setImage('attachment://welcome.png')
			if (!greetingSettings.channelID) greetingEmbed.setDescription('No channel has been set to display greeting messages.')
			return interaction.reply({embeds: [greetingEmbed], files: [greetingAttachment]})
		}

		server.greeting = JSON.stringify(greetingSettings)
		server.save()
	}
}