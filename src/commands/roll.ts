import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { bannerData, data, item, sparkProfiles } from '../bot'
import { findBestCIMatch } from '../modules/string'
import { weaponEmotes, rarityEmotes } from '../modules/variables'

module.exports = {
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
		function gacha(crystals: number, singles: number, tenparts: number, target?: item){
			if (target) tenparts = Infinity
			const rolls = Math.floor(crystals / 300) + singles + tenparts * 10
			const tenPartDraws = tenparts + Math.floor(crystals / 3000)
			const {totalRate1, totalRate2} = bannerData.bannerInfo

			// Roll for items
			const items: item[] = []
			for (let i = 1; i <= rolls; i++){
				if (i % 10 === 0 && i <= tenPartDraws * 10){ // Draw from 2nd set of items for 10-Part Draws on the 10th draw
					const rand = Math.random() * totalRate2
					items.push(bannerData.items.find(item => item.cum_rate2 >= rand)!)
				} else {
					const rand = Math.random() * totalRate1
					items.push(bannerData.items.find(item => item.cum_rate1 >= rand)!)
				}

				if (i < tenPartDraws * 10 && target && items.includes(target)) break
			}

			// const specialSummons = data.map(row => row.nonTixableSummons)
			const specialCharacters = data.map(row => row.limitedCharacters)
			items.sort((a, b) => a?.character && a?.rarity === 'Rare' ? -1 : b?.character && b.rarity === 'Rare' ? 1 : 0)
			items.sort((a, b) => (a?.rarity === 'S Rare' ? -1 : b?.rarity === 'S Rare' ? 1 : 0))
			items.sort((a, b) => a?.character && a?.rarity === 'S Rare' ? -1 : b?.character && b.rarity === 'S Rare' ? 1 : 0)
			items.sort((a, b) => (a?.rarity === 'SS Rare' ? -1 : b?.rarity === 'SS Rare' ? 1 : 0))
			items.sort((a, b) => a?.character && a?.rarity === 'SS Rare' ? -1 : b?.character && b.rarity === 'SS Rare' ? 1 : 0)
			// items.sort((a, b) => specialSummons.includes(a?.name) ? -1 : specialSummons.includes(b?.name) ? 1 : 0)
			items.sort((a, b) => specialCharacters.includes(a?.character) ? -1 : specialCharacters.includes(b?.character) ? 1 : 0)
			if (target) items.sort((a, b) => a === target ? -1 : b === target ? 1 : 0)

			return items
		}

		function createGachaEmbed(items: item[], target?: item){
			const SSRCharacters = items.filter(item => item.rarity === 'SS Rare' && item.character)
			const SSRSummons = items.filter(item => item.rarity === 'SS Rare' && item.type === 'Summon')
			const SSRRate = (items.filter(item => item.rarity === 'SS Rare').length / items.length * 100).toFixed(2)
			const totalRolls = items.length

			const rollEmbed = new EmbedBuilder()
				.setAuthor({name: 'Gacha Simulator', iconURL: 'https://i.imgur.com/MN6TIHj.png'})
				.setTitle(target ? `__You got ${target.character ?? target.name} and these ${items.length - 1} items:__` : `__You got these ${items.length} items:__`)
				.setColor('Blue')
			
			for (let i = 0; i < totalRolls; i++){
				if (i >= 23){
					const remainingSSRs = `<:SSR:755671138624864266> ${items.filter(item => item.rarity === 'SS Rare').length}`
					const remainingSRs = `<:SR:755671130882179113> ${items.filter(item => item.rarity === 'S Rare').length}`
					const remainingRs = `<:R_:755671123588546623> ${items.filter(item => item.rarity === 'Rare').length}`
					rollEmbed.addFields({name: `and ${items.length} more...`, value: `**${remainingSSRs}** | **${remainingSRs}** | **${remainingRs}**`, inline: true})
					break
				} else {
					const item = items.shift()!
					const description = item.type === 'Summon'
						? '<:SummonCradle:753364568138317914> Summon'
						: item.character
							? `👤 ${item.character}`
							: weaponEmotes[item.type] + 'Weapon'

					rollEmbed.addFields({name: rarityEmotes[item.rarity] + item.name, value: description, inline: true})
				}
			}
			rollEmbed.addFields({name: '\u200b', value: `**${SSRCharacters.length} SSR Characters | ${SSRSummons.length} SSR Summons | ${SSRRate}% SSR rate**`})
			return rollEmbed
		}

		function findTarget(target: string){
			const bannerWeaponNames = bannerData.items.map(item => item.name)
			const characterNames = data.map(item => item.characterName).filter(i => i)
			const weaponNames = data.map(item => item.weaponName).filter(i => i)
			const summonNames = data.map(item => item.summonName).filter(i => i)
			const allItemNames = [characterNames, summonNames, weaponNames, bannerWeaponNames].flat()

			const targetName = /summon/i.test(target)
				? findBestCIMatch(target.replace(/summon/i, ''), summonNames).bestMatch.target
				: findBestCIMatch(target, allItemNames).bestMatch.target
			const targetWeaponID = data.find(item => item.characterName === targetName || item.weaponName === targetName)?.weaponID
			const targetSummonID = data.find(item => item.summonName === targetName)?.summonID
			const targetItem = bannerData.items.find(item => item.id === (targetWeaponID ?? targetSummonID) || item.character === targetName || item.name === targetName)
			return targetItem ?? targetName
		}

		if (!data) return interaction.reply('Database connection failed. Please try again later.')

		await interaction.deferReply()
		const command = interaction.options.getSubcommand()
		const amount = interaction.options.getNumber('amount') ?? 1
		const targetInput = interaction.options.getString('target')!
		const user = sparkProfiles.find(profile => profile.userID === interaction.user.id || profile.userTag === interaction.user.tag)
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
				crystals = parseInt(user.crystals)
				singles = parseInt(user.tickets)
				tenparts = parseInt(user.tenParts)
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