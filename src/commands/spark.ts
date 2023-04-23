import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder } from 'discord.js'
import { privateDB, sparkProfiles, info } from '../bot'
import { GoogleSpreadsheetRow } from 'google-spreadsheet'
import { Image, createCanvas, loadImage } from 'canvas'
import { getDirectImgurLinks } from '../modules/image-functions'
import { formatList } from '../modules/string-functions'
import { isNumber } from '../modules/number-functions'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('spark')
		.setDescription('Manage or view your spark profile')
		.addSubcommand(subcommand => 
			subcommand
				.setName('set')
				.setDescription('Set your spark resources')
				.addStringOption(option => option.setName('sh').setDescription('Add to all resources at once (shorthand option)'))
				.addNumberOption(option => option.setName('crystals').setDescription('The number of crystals to set').setMinValue(0))
				.addNumberOption(option => option.setName('tickets').setDescription('The number of tickets to set').setMinValue(0))
				.addNumberOption(option => option.setName('10-parts').setDescription('The number of 10-part tickets to set').setMinValue(0))
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('add')
				.setDescription('Add to your spark resources')
				.addStringOption(option => option.setName('sh').setDescription('Add to all resources at once (shorthand option)'))
				.addNumberOption(option => option.setName('crystals').setDescription('The number of crystals to add').setMinValue(0))
				.addNumberOption(option => option.setName('tickets').setDescription('The number of tickets to add').setMinValue(0))
				.addNumberOption(option => option.setName('10-parts').setDescription('The number of 10-part tickets to add').setMinValue(0))
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('subtract')
				.setDescription('Subtract from your spark resources')
				.addStringOption(option => option.setName('sh').setDescription('Add to all resources at once (shorthand option)'))
				.addNumberOption(option => option.setName('crystals').setDescription('The number of crystals to subtract').setMinValue(0))
				.addNumberOption(option => option.setName('tickets').setDescription('The number of tickets to subtract').setMinValue(0))
				.addNumberOption(option => option.setName('10-parts').setDescription('The number of 10-part tickets to subtract').setMinValue(0))
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('profile')
				.setDescription('Show your spark profile or search for the spark profile of another user')
				.addUserOption(option => option.setName('user').setDescription('The user whose spark profile you want to see'))
				.addBooleanOption(option => option.setName('embed').setDescription('Use the message embed version of this command instead?'))
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('background')
				.setDescription('Set your spark profile background')
				.addStringOption(option => option.setName('link').setDescription('A link to the background image for your spark profile').setRequired(true))
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('reset')
				.setDescription('Reset your spark profile')
		)
		.addSubcommand(subcommand => 
			subcommand
				.setName('delete')
				.setDescription('Delete your spark profile')
		)
	,
	async execute(interaction: ChatInputCommandInteraction) {
		async function getProfile(user: GoogleSpreadsheetRow){
			await interaction.deferReply()
			let badBackground = false
			let customBackground
			if (!user) return interaction.reply('User profile not found.')

			const canvas = createCanvas(500, 300)
			const ctx = canvas.getContext('2d')
			
			const username = String(user.userTag.match(/.+(?=#)/))

			if (user.background){
				customBackground = await loadImage(String(user.background)).catch(() => {badBackground = true})
			}

			if (user.background && !badBackground){
				const backgroundMask = await loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762191969321484328/SparkMask.png')
				const clearBackground = await loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762203777629290526/SparkShadedBG.png')
				ctx.drawImage(backgroundMask, 0, 0)
				ctx.globalCompositeOperation = 'source-in'
				ctx.drawImage(customBackground as Image, 0, 0, canvas.width, canvas.height)
				ctx.globalCompositeOperation = 'source-over'
				ctx.drawImage(clearBackground, 0, 0)
			} else {
				const defaultBackground = await loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762188325330485248/SparkDefaultBG.png')
				ctx.drawImage(defaultBackground, 0, 0)
			}
			
			//Work around inconsistencies between number/string in the database 
			if (typeof user.percent === 'number'){user.percent = `${(user.percent*100).toFixed(2)}%`}
			const sparkPercent = parseFloat(user.percent)/100.0

			const progbars = [
				await loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762201628031189002/RegularProgressBar.png'),
				await loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762201828334239764/RedProgressBar.png'),
				await loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762202150599917568/BlueProgressBar.png'),
				await loadImage('https://cdn.discordapp.com/attachments/565650781961846784/790744430805123103/PurpleProgressBar_2.png'),
				await loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762202150599917568/BlueProgressBar.png'),
				await loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762202150599917568/BlueProgressBar.png')
			]

			if (Math.floor(sparkPercent)-1 >= 0) ctx.drawImage(progbars[Math.floor(sparkPercent)-1] ?? progbars[progbars.length-1], 0, 0) // Draw a full length progress bar if the user has 1 whole spark or more
			if (sparkPercent > 0){ // Draw a portion of a progress bar according to the user's spark percentage
				ctx.drawImage(progbars[Math.ceil(sparkPercent)-1] ?? progbars[progbars.length-1], 0, 0, 35+424*(sparkPercent % 1), canvas.height, 0, 0, 35+424*(sparkPercent % 1), canvas.height)
			}

			function applyText(text: string){
				let fontSize = 40
				do {
					ctx.font = `${fontSize -= 1}px Times`
				} while (ctx.measureText(text).width > 200)
				return ctx.font
			}

			ctx.font = applyText(username)
			ctx.fillStyle = 'white'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(username, 318, 95)

			if (user.userID === '251458435554607114'){
				const Developer = await loadImage('https://i.imgur.com/THKXHC0.png')
				ctx.drawImage(Developer, 270, 122)
			}

			if (info.find(row => row.name === 'VIPs')?.value.includes(user.userID)){
				const VIP = await loadImage('https://i.imgur.com/uGK0xjS.png')
				ctx.drawImage(VIP, 302, 122)
			}
			
			ctx.font = '24px Times'
			ctx.textAlign = 'right'
			ctx.fillText(user.crystals, 160, 175)
			ctx.fillText(user.tickets, 313, 175)
			ctx.fillText(user.tenParts, 460, 175)
			ctx.fillText(String(parseInt(user.rolls)), 313, 222)

			ctx.font = '19px Arial'
			ctx.textAlign = 'left'
			ctx.strokeStyle = 'black'
			ctx.lineWidth = 3
			ctx.strokeText(user.percent, 50, 257)
			ctx.fillText(user.percent, 50, 257)

			ctx.save()
			ctx.beginPath()
			ctx.arc(105, 90, 50, 0, Math.PI * 2, true)
			ctx.closePath()
			ctx.clip()

			const avatarURL = interaction.guild?.members.cache.get(user.userID)?.user.displayAvatarURL({extension: 'png', forceStatic: true})
			const defaultAvatarURL = 'https://discordapp.com/assets/6debd47ed13483642cf09e832ed0bc1b.png?size=1024'
			const avatar = await loadImage(avatarURL ?? defaultAvatarURL)
			ctx.drawImage(avatar, 55, 40, 100, 100)
			ctx.restore()

			// For Halloween
			// const cobwebs = await loadImage('https://media.discordapp.net/attachments/647256353844232202/1033487287662690434/SparkProfileCobwebs.png')
			// ctx.drawImage(cobwebs, 0, 0)
			
			const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `${username}SparkProfile.png`})
			
			if (badBackground){ // If the user's custom background caused an error, send a warning.
				return interaction.editReply({content: 'I could not access your background image. Please make sure your background image is publicly accessible.', files: [attachment]})
			} else {
				return interaction.editReply({files: [attachment]})
			}
		}

		async function getEmbedProfile(user: GoogleSpreadsheetRow){
			const username = String(user.userTag.match(/.+(?=#)/))
			const blank = '⠀'
			let crystalBlank = '', ticketBlank = '', tenticketBlank = '', sparkBlank = ''
			const progBar = '▰'.repeat((parseFloat(user.percent) % 100) / 5) + '▱'.repeat(20 - (parseFloat(user.percent) % 100) / 5)
			const sparkEmbed = new EmbedBuilder()
				.setColor('Blue')
				.setAuthor({name: user.userTag, iconURL: interaction.guild?.members.cache.get(user.userID)?.user.displayAvatarURL({extension: 'png', forceStatic: true})!})
				.setTitle(`${username}'s Spark Progress`)
	
			if ((interaction.member as GuildMember).presence?.clientStatus?.mobile){
				for (let i = 0; i < 4 - String(user.crystals).length / 2; i++) {crystalBlank += blank}
				for (let i = 0; i < 6 - String(user.tickets).length / 2; i++) {ticketBlank += blank}
				for (let i = 0; i < 5 - String(user.tenParts).length / 2; i++) {tenticketBlank += blank}
				for (let i = 0; i < 14 - String(parseInt(user.rolls)).length / 2; i++) {sparkBlank += blank}
				
				sparkEmbed
					.addFields([
						{
							name: '<:Crystal:616792937161949189> Crystals:⠀   ⠀<:Ticket:616792937254092800> Tickets:⠀   ⠀<:10Ticket:616792937220669450> 10 Parts:', 
							value: `${crystalBlank + user.crystals + crystalBlank}${ticketBlank + user.tickets + ticketBlank}${tenticketBlank + user.tenParts}`
						},
						{name: '⠀⠀⠀⠀⠀⠀⠀⠀⠀<:Spark:622196123695710208> Rolls/Sparks:', value: sparkBlank + String(parseInt(user.rolls)), inline: false},
						{name: `⠀⠀You are ${user.percent} of the way to a spark! <:Stronk:585534348695044199>`, value: `⠀[${progBar}]`}
					])
			} else {
				for (let i = 0; i < 6 - String(user.crystals).length / 2; i++) {crystalBlank += blank}
				for (let i = 0; i < 8 - String(user.tickets).length / 2; i++) {ticketBlank += blank}
				for (let i = 0; i < 7 - String(user.tenParts).length / 2; i++) {tenticketBlank += blank}
				for (let i = 0; i < 8 - String(parseInt(user.rolls)).length / 2; i++) {sparkBlank += blank}
				
				sparkEmbed
					.addFields([
						{name: '⠀⠀<:Crystal:616792937161949189> Crystals:', value: crystalBlank + user.crystals, inline: true},
						{name: '⠀⠀⠀⠀<:Ticket:616792937254092800> Tickets:', value: ticketBlank + user.tickets, inline: true},
						{name: '⠀<:10Ticket:616792937220669450> 10 Part Tickets: ⠀', value: tenticketBlank + user.tenParts, inline: true},
						{name: '\u200B', value: '\u200B', inline: true},
						{name: '⠀⠀<:Spark:622196123695710208> Rolls/Sparks:', value: sparkBlank + String(parseInt(user.rolls)), inline: true},
						{name: '\u200B', value: '\u200B', inline: true},
						{name: `⠀⠀⠀⠀⠀⠀You are ${user.percent} of the way to a spark! <:Stronk:585534348695044199>`, value: `⠀ ⠀ ⠀⠀[${progBar}]`}
					])
			}
	
			return interaction.reply({embeds: [sparkEmbed]})
		}

		function calcDraws(user: GoogleSpreadsheetRow, round: boolean = true){
			if (!round) return (parseInt(user.crystals)+parseInt(user.tickets)*300+parseInt(user.tenParts)*3000)/300
			return Math.floor((parseInt(user.crystals)+parseInt(user.tickets)*300+parseInt(user.tenParts)*3000)/300)
		}

		function manageSpark(user: GoogleSpreadsheetRow, operation: string, crystals: number | null, tickets: number | null, tenparts: number | null){
			const resourceArr = []
			if (isNumber(crystals)) resourceArr.push('Crystals')
			if (isNumber(tickets)) resourceArr.push('Tickets')
			if (isNumber(tenparts)) resourceArr.push('10-Part Tickets')

			user.crystals = parseInt(user.crystals)
			user.tickets = parseInt(user.tickets)
			user.tenParts = parseInt(user.tenParts)

			switch(operation){
				case 'set': user.crystals = crystals ?? user.crystals; user.tickets = tickets ?? user.tickets; user.tenParts = tenparts ?? user.tenParts; break;
				case 'add': user.crystals += crystals ?? 0; user.tickets += tickets ?? 0; user.tenParts += tenparts ?? 0; break;
				case 'subtract': user.crystals -= crystals ?? 0; user.tickets -= tickets ?? 0; user.tenParts -= tenparts ?? 0; break;
			}

			operation = operation === 'add' ? 'added' : operation === 'subtract' ? 'subtracted' : operation
			user.percent = calcDraws(user, false)/300
			user.rolls = calcDraws(user, false)
			return interaction.reply(`${formatList(resourceArr)} ${operation}. You now have ${calcDraws(user)} draws (${calcDraws(user) >= initialRolls ? '+' : ''}${calcDraws(user) - initialRolls}).`)
		}
		
		let user = sparkProfiles.find(profile => profile.userID === interaction.user.id || profile.userTag === interaction.user.tag)
		if (!user){
			user = await privateDB.sheetsByTitle['Spark'].addRow({
				userTag: interaction.user.tag,
				userID: `'${interaction.user.id}`,
				crystals: 0,
				tickets: 0,
				tenParts: 0,
				percent: 0,
				rolls: 0,
			})
			sparkProfiles.push(user)
		}
		user.userTag = interaction.user.tag

		const initialRolls = parseInt(user.rolls)
		const userInput = interaction.options.getUser('user')
		const shorthand = interaction.options.getString('sh')
		let crystals = interaction.options.getNumber('crystals')
		let tickets = interaction.options.getNumber('tickets')
		let tenparts = interaction.options.getNumber('10-parts')
		const backgroundURL = interaction.options.getString('link')!
		const command = interaction.options.getSubcommand()
		if (command === 'profile'){
			const targetUser = userInput ? sparkProfiles.find(profile => profile.userID === userInput.id || profile.userTag === userInput.tag) : user
			if (!targetUser) return interaction.reply('I could not find a spark profile for the user you specified.')
			if (interaction.options.getBoolean('embed')) await getEmbedProfile(targetUser)
			else await getProfile(targetUser)
		}
		else if (/\bset\b|add|subtract/.test(command)){
			if ((!shorthand && !isNumber(crystals) && !isNumber(tickets) && !isNumber(tenparts)) || (shorthand && !/\d+/.test(shorthand))) {
				return interaction.reply({content: `You must choose a resource to ${command}!`, ephemeral: true})
			}
			if (shorthand) {
				const shorthandMatch = shorthand!.match(/\d+/g)!
				crystals = shorthandMatch[0] ? parseInt(shorthandMatch[0]) : null
				tickets = shorthandMatch[1] ? parseInt(shorthandMatch[1]) : null
				tenparts = shorthandMatch[2] ? parseInt(shorthandMatch[2]) : null
			}
			await manageSpark(user, command, crystals, tickets, tenparts)
		}
		else if (command === 'background'){
			const validBackground = (await getDirectImgurLinks(backgroundURL))[0]
			if (!validBackground) return interaction.reply('The image link you provided was invalid.')
			user.background = validBackground
			await interaction.reply('Spark background set.')
		}
		else if (command === 'reset'){
			user.tickets = user.crystals = user.tenParts = user.percent = user.rolls = 0
			await interaction.reply('Spark profile successfully reset.')
		}
		else if (command === 'delete'){
			user.userTag = user.userID = user.crystals = user.tickets = user.tenParts = user.percent = user.rolls = user.background = 'deleted'
			await interaction.reply('Spark profile deleted.')
		}

		await user.save()

		// Sends a congratulatory message when the user saves up a spark (a set of 300 rolls)
		if (Math.floor(user.rolls/300) - Math.floor(initialRolls/300) >= 1) {
			interaction.followUp(`<:mogumogu:563695725951582239>  <:narulove:585534241459273728>  🎊 Congratulations! You've saved up ${Math.floor(user.rolls/300)} spark${Math.floor(user.rolls/300) > 1 ? 's' : ''}! 🎊 <:blue:725143925396078643> <:SatThumb:585533971178324049>`)
		}

		// Nickname Auto-Updater
		const member = interaction.member as GuildMember
		const nickname = member.nickname
		if (interaction.guild?.ownerId === member.id) return
		if (nickname && /\(\d+\/300\)|\d+\.\d\d%/.test(nickname)){
			if (!member.manageable) return interaction.followUp({content: `I could not update your nickname due to missing permissions.`, ephemeral: true})
			
			const newNickname = /\(\d+\/300\)/.test(nickname) 
				? nickname.replace(/\(\d+\/300\)/, `(${parseInt(user.rolls)}/300)`) 
				: nickname.replace(/\d+\.\d\d%/, `${(user.percent*100).toFixed(2)}%`)

			member.setNickname(newNickname)
		}
	}
}