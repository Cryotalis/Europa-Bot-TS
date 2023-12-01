import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder } from 'discord.js'
import { privateDB, sparkProfiles } from '../bot'
import { getDirectImgurLinks } from '../modules/image'
import { isNumber } from '../modules/number'
import { calcDraws, getEmbedProfile, getProfile, manageSpark } from '../modules/spark'

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
			if (interaction.options.getBoolean('embed')) interaction.reply(getEmbedProfile(targetUser, interaction.member as GuildMember))
			else {
				await interaction.deferReply()
				if (!user) return interaction.editReply('User profile not found.')
				interaction.editReply(await getProfile(targetUser, userInput ?? interaction.user))
			}
		}
		else if (/\bset\b|add|subtract/.test(command)){
			if ((!shorthand && !isNumber(crystals) && !isNumber(tickets) && !isNumber(tenparts)) || (shorthand && !/\d+/.test(shorthand))) {
				return interaction.reply({content: `You must choose a resource to ${command}!`, ephemeral: true})
			}
			if (shorthand) {
				const shorthandMatch = shorthand.replace(',', '').match(/\d+/g)!
				crystals = shorthandMatch[0] ? parseInt(shorthandMatch[0]) : null
				tickets = shorthandMatch[1] ? parseInt(shorthandMatch[1]) : null
				tenparts = shorthandMatch[2] ? parseInt(shorthandMatch[2]) : null
			}
			interaction.reply(manageSpark(user, command, crystals, tickets, tenparts))
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

		if (command !== 'profile') await user.save()

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
				? nickname.replace(/\(\d+\/300\)/, `(${calcDraws(user)}/300)`) 
				: nickname.replace(/\d+\.\d\d%/, `${(user.percent*100).toFixed(2)}%`)

			member.setNickname(newNickname)
		}
	}
}