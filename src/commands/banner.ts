import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { dateStringToUnix } from '../modules/time.js'
import { weaponEmotes, rarityEmotes } from '../data/variables.js'
import { bannerData } from '../modules/banner.js'

export const command = {
	data: new SlashCommandBuilder()
		.setName('banner')
		.setDescription('Show the featured characters and rate ups on the current banner')
		.addBooleanOption(option => option.setName('detailed').setDescription('Show non-SSR items'))
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const includeNonSSRItems = interaction.options.getBoolean('detailed')
		const includedRarities = includeNonSSRItems ? ['SS Rare', 'S Rare', 'Rare'] : ['SS Rare']
		const {start, end, drawRates, featuredItemIDs} = bannerData.bannerInfo

		const rateUpItems = bannerData.items
			.filter(item => item.rate_up && includedRarities.includes(item.rarity))
			.sort((a, b) => (featuredItemIDs.includes(a.id) ? -1 : featuredItemIDs.includes(b.id) ? 1 : 0))

		const bannerInfoEmbed = new EmbedBuilder()
			.setTitle('__Banner Information__')
			.setDescription(
				`<t:${dateStringToUnix(start)!/1000}> ~ <t:${dateStringToUnix(end)!/1000}> (Ends <t:${dateStringToUnix(end)!/1000}:R>)\n
				**${rarityEmotes['SS Rare']} ${drawRates['SS Rare']} ${rarityEmotes['S Rare']} ${drawRates['S Rare']} ${rarityEmotes['Rare']} ${drawRates['Rare']}**\n
				${rateUpItems.length ? '**The following items have boosted draw rates:**' : '**No items have boosted draw rates**'}`
			)
			.setColor('Blue')

		rateUpItems.slice(0,25).forEach(item => {
			const featured = featuredItemIDs.includes(item.id)
			const description = item.type === 'Summon'
				? '<:SummonCradle:753364568138317914> Summon'
				: item.character
					? `👤 ${item.character}`
					: weaponEmotes[item.type] + 'Weapon'
			bannerInfoEmbed.addFields([{name: `${rarityEmotes[item.rarity]}${item.name} (${featured ? 'Featured | ' : ''}${item.rate1}%)`, value: description}])
		})
		
		interaction.reply({embeds: [bannerInfoEmbed]})
	}
}