import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { createGachaEmbed, findTarget, gacha } from '../modules/roll.js'
import { item } from '../modules/banner.js'
import { database } from '../data/database.js'

export const command = {
	data: new SlashCommandBuilder()
		.setName('roll')
		.setDescription('Draw from the current banner')
		.addSubcommand(subcommand =>
			subcommand
				.setName('singles')
				.setDescription('Draw using single tickets')
				.addNumberOption(option => option.setName('amount').setDescription('The amount of single tickets to use').setMaxValue(10000))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('10-parts')
				.setDescription('Draw using 10-Part tickets')
				.addNumberOption(option => option.setName('amount').setDescription('The amount of 10-Part tickets to use').setMaxValue(1000))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('spark')
				.setDescription('Draw 300 times (30x 10-Part Draws)')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('funds')
				.setDescription('Draw using all your spark funds')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('gachapin')
				.setDescription('Draw using 10-part tickets until you get an SSR item')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('super-mukku')
				.setDescription('Draw using 10-part tickets with boosted SSR rates until you get 5 SSR items')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('until')
				.setDescription('Draw using 10-Part Draws until you get a specific character, weapon, or summon')
				.addStringOption(option => option.setName('target').setDescription("The character, weapon, or summon you're drawing for").setRequired(true))
		)
	,
	async execute(interaction: ChatInputCommandInteraction) {
		if (!database?.characters || !database?.summons) {
			return interaction.reply('Database connection failed. Please try again later.')
		}

		await interaction.deferReply()
		const command = interaction.options.getSubcommand()
		const amount = interaction.options.getNumber('amount') ?? 1
		const targetInput = interaction.options.getString('target')!
		const user = database.users.find(user => 
			user.get('userID') === interaction.user.id || user.get('username') === interaction.user.username
		)
		let crystals = 0, singles = 0, tenparts = 0
		let	target: item | string | undefined = undefined
		let modifier: "gachapin" | "mukku" | "super mukku" | undefined
		
		switch (command) {
			case 'singles':
				singles = amount
				break
			case '10-parts':
				tenparts = amount
				break
			case 'spark':
				tenparts = 30
				break
			case 'funds':
				if (!user) return interaction.editReply('I could not find your spark profile.')
				crystals = parseInt(user.get('crystals'))
				singles = parseInt(user.get('tickets'))
				tenparts = parseInt(user.get('tenParts'))
				if (!crystals && !singles && !tenparts) return interaction.editReply('You do not have any funds to roll with!')
				break
			case 'gachapin':
				const items1 = gacha(0, 0, 30, undefined, "gachapin")
				const gachaEmbeds = [createGachaEmbed(items1, undefined, "gachapin")]

				const rand = Math.floor(Math.random() * items1.length)
				if ((items1.length <= 20 && rand < 10) || rand < 3) { // Reduced mukku rate after 20 pulls
					const items2 = gacha(0, 0, 30 - items1.length / 10, undefined, "mukku")
					gachaEmbeds.push(createGachaEmbed(items2, undefined, "mukku"))
				}

				return interaction.editReply({embeds: gachaEmbeds})
			case 'super-mukku':
				tenparts = 20
				modifier = "super mukku"
				break
			case 'until':
				tenparts = Infinity
				target = findTarget(targetInput)
				if (typeof target === 'string') return interaction.editReply(`**${target}** is not available on the current banner.`)
				break
		}

		const items = gacha(crystals, singles, tenparts, target, modifier)
		interaction.editReply({embeds: [createGachaEmbed(items, target, modifier)]})
	}
}