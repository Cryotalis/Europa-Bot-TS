import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js'
import { privateDB, sparkProfiles, userData } from '../bot'
import { getImageLink } from '../modules/image'
import { calcDraws, getEmbedProfile, getProfile, manageSpark } from '../modules/spark'
import { round } from '../modules/number'

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
				.addAttachmentOption(option => option.setName('image').setDescription('An attached image for the background of your spark profile'))
				.addStringOption(option => option.setName('link').setDescription('A link to the background image for your spark profile'))
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
		let user = sparkProfiles.find(profile => profile.get('userID') === interaction.user.id || profile.get('userTag') === interaction.user.tag)
		if (!user){
			user = await privateDB.sheetsByTitle['Spark'].addRow({
				userTag: interaction.user.tag,
				userID: `'${interaction.user.id}`,
				crystals: 0,
				tickets: 0,
				tenParts: 0,
				rolls: 0,
			})
			sparkProfiles.push(user)
		}
		user.set('userTag', interaction.user.tag)

		const initialRolls = parseInt(user.get('rolls'))
		const userInput = interaction.options.getUser('user')
		const shorthandInput = interaction.options.getString('sh')
		let crystals = interaction.options.getNumber('crystals')
		let tickets = interaction.options.getNumber('tickets')
		let tenparts = interaction.options.getNumber('10-parts')
		const linkInput = interaction.options.getString('link')
		const imageInput = interaction.options.getAttachment('image')
		const command = interaction.options.getSubcommand()

		if (command === 'profile'){
			const targetUser = userInput ? sparkProfiles.find(profile => profile.get('userID') === userInput.id || profile.get('userTag') === userInput.tag) : user
			if (!targetUser) return interaction.reply('I could not find a spark profile for the user you specified.')
			if (interaction.options.getBoolean('embed')) interaction.reply(getEmbedProfile(targetUser, interaction.member as GuildMember))
			else {
				await interaction.deferReply()
				if (!user) return interaction.editReply('I could not find your spark profile.')
				interaction.editReply(await getProfile(targetUser, userInput ?? interaction.user))
			}
		}
		else if (/\bset\b|add|subtract/.test(command)){
			if (shorthandInput) {
				const shorthandMatch = shorthandInput.replace(',', '').match(/\d+/g)!
				crystals = shorthandMatch[0] ? parseInt(shorthandMatch[0]) : null
				tickets = shorthandMatch[1] ? parseInt(shorthandMatch[1]) : null
				tenparts = shorthandMatch[2] ? parseInt(shorthandMatch[2]) : null
			}

			const {errorMsg, summary} = manageSpark(user, command, crystals, tickets, tenparts)
			await interaction.reply(errorMsg || summary)
		}
		else if (command === 'background'){
			const {errorMsg, imageLink} = await getImageLink(linkInput, imageInput)
			if (errorMsg) return interaction.reply(errorMsg)
			user.set('background', imageLink)
			await interaction.reply('Spark background set.')
		}
		else if (command === 'reset'){
			user.assign({...user.toObject() as userData, tickets: '0', crystals: '0', tenParts: '0', rolls: '0'})
			await interaction.reply('Spark profile reset.')
		}
		else if (command === 'delete'){
			// user.userTag = user.userID = user.crystals = user.tickets = user.tenParts = user.percent = user.rolls = user.background = 'deleted'
			user.assign({
				userID: 'deleted',
				userTag: 'deleted',
				crystals: 'deleted',
				tickets: 'deleted',
				tenParts: 'deleted',
				rolls: 'deleted',
				background: 'deleted',
			})
			// await user.delete()
			await interaction.reply('Spark profile deleted.')
		}

		if (command !== 'profile') await user.save()

		// Sends a congratulatory message when the user saves up a spark (a set of 300 rolls)
		const sparkPercent = user.get('rolls')/300
		if (Math.floor(sparkPercent) - Math.floor(initialRolls/300) >= 1) {
			interaction.followUp(`<:mogumogu:563695725951582239>  <:narulove:585534241459273728>  🎊 Congratulations! You've saved up ${Math.floor(sparkPercent)} spark${Math.floor(sparkPercent) > 1 ? 's' : ''}! 🎊 <:blue:725143925396078643> <:SatThumb:585533971178324049>`)
		}

		// Nickname Auto-Updater
		const member = interaction.member as GuildMember
		const nickname = member.nickname
		if (interaction.guild?.ownerId === member.id) return
		if (nickname && /\(\d+\/300\)|\d+\.\d\d%/.test(nickname)){
			if (!member.manageable) return interaction.followUp({content: `I could not update your nickname due to missing permissions.`, ephemeral: true})
			
			const newNickname = /\(\d+\/300\)/.test(nickname) 
				? nickname.replace(/\(\d+\/300\)/, `(${calcDraws(user)}/300)`) 
				: nickname.replace(/\d+\.\d\d%/, round(sparkPercent * 100) + '%')

			member.setNickname(newNickname)
		}
	}
}