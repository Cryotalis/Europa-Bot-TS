import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { data, users } from '../bot.js'
import { createGachaEmbed, findTarget, gacha } from '../modules/roll.js'
import { item } from '../modules/banner.js'

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
				.setName('until')
				.setDescription('Draw using 10-Part Draws until you get a specific character, weapon, or summon')
				.addStringOption(option => option.setName('target').setDescription("The character, weapon, or summon you're drawing for").setRequired(true))
		)
	,
	async execute(interaction: ChatInputCommandInteraction) {
		if (!data) return interaction.reply('Database connection failed. Please try again later.')

		await interaction.deferReply()
		const command = interaction.options.getSubcommand()
		const amount = interaction.options.getNumber('amount') ?? 1
		const targetInput = interaction.options.getString('target')!
		const user = users.find(user => user.get('userID') === interaction.user.id || user.get('username') === interaction.user.username)
		let crystals = 0, singles = 0, tenparts = 0
		let	target: item | string | undefined = undefined
		
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
			case 'until':
				target = findTarget(targetInput)
				if (typeof target === 'string') return interaction.editReply(`**${target}** is not available on the current banner.`)
				break
		}

		const items = gacha(crystals, singles, tenparts, target)
		return interaction.editReply({embeds: [createGachaEmbed(items, target)]})
	}
}