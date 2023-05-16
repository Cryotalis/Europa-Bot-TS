import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { bannerDuration, featuredItemIDs, items1 } from '../bot'
import { dateStringToUnix } from '../modules/time'
import { weaponEmotes, rarityEmotes } from '../modules/variables'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('banner')
		.setDescription('Show the featured characters and rate ups on the current banner')
		.addBooleanOption(option => option.setName('detailed').setDescription('Show non-SSR items'))
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const includeNonSSRItems = interaction.options.getBoolean('detailed')
		const includedRarities = includeNonSSRItems ? ['SS Rare', 'S Rare', 'Rare'] : ['SS Rare']
		const bannerInfoEmbed = new EmbedBuilder()
			.setTitle('__Banner Information__')
			.setDescription(`<t:${dateStringToUnix(bannerDuration.start)!/1000}> ~ <t:${dateStringToUnix(bannerDuration.end)!/1000}> (Ends <t:${dateStringToUnix(bannerDuration.end)!/1000}:R>)\n\n**The following items have boosted draw rates:**`)
			.setColor('Blue')
		
		const rateUpItems = items1
			.filter(item => item.rate_up && includedRarities.includes(item.rarity))
			.sort((a, b) => (featuredItemIDs.includes(a.id) ? -1 : featuredItemIDs.includes(b.id) ? 1 : 0))

		rateUpItems.slice(0,25).forEach(item => {
			const featured = featuredItemIDs.includes(item.id)
			const description = item.type === 'Summon'
				? '<:SummonCradle:753364568138317914> Summon'
				: item.character
					? `👤 ${item.character}`
					: weaponEmotes[item.type] + 'Weapon'
			bannerInfoEmbed.addFields([{name: `${rarityEmotes[item.rarity]}${item.name} (${featured ? 'Featured | ' : ''}${item.drop_rate}%)`, value: description}])
		})
		
		interaction.reply({embeds: [bannerInfoEmbed]})
	}
}