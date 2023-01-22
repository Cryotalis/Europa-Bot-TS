import { CommandInteraction, MessageEmbed } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { dateStringToUnix, rarityEmotes, weaponEmotes } from '../library'
import { bannerDuration, featuredItemIDs, items1 } from '../bot'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('banner')
		.setDescription('Show the featured characters and rate ups on the current banner')
		.addBooleanOption(option => option.setName('detailed').setDescription('Show non-SSR items'))
	,
	async execute(interaction: CommandInteraction) {
		const includeNonSSRItems = interaction.options.getBoolean('detailed')
		const includedRarities = includeNonSSRItems ? ['SS Rare', 'S Rare', 'Rare'] : ['SS Rare']
		const bannerInfoEmbed = new MessageEmbed()
			.setTitle('__Banner Information__')
			.setDescription(`<t:${dateStringToUnix(bannerDuration.start)!/1000}> ~ <t:${dateStringToUnix(bannerDuration.end)!/1000}> (Ends <t:${dateStringToUnix(bannerDuration.end)!/1000}:R>)\n\n**The following items have boosted draw rates:**`)
			.setColor('BLUE')
		
		const rateUpItems = items1
			.filter(item => item.rate_up && includedRarities.includes(item.rarity))
			.sort((a, b) => (featuredItemIDs.includes(a.id) ? -1 : featuredItemIDs.includes(b.id) ? 1 : 0))

		rateUpItems.forEach(item => {
			const featured = featuredItemIDs.includes(item.id)
			const description = item.type === 'Summon'
				? '<:SummonCradle:753364568138317914> Summon'
				: item.character
					? `👤 ${item.character}`
					: weaponEmotes[item.type] + 'Weapon'
			bannerInfoEmbed.addField(`${rarityEmotes[item.rarity]}${item.name} (${featured ? 'Featured | ' : ''}${item.drop_rate}%)`, description)
		})
		
		interaction.reply({embeds: [bannerInfoEmbed]})
	}
}