import { EmbedBuilder } from "discord.js"
import { data } from "../bot.js"
import { findBestCIMatch, titleize } from "./string.js"
import { weaponEmotes, rarityEmotes } from "../data/variables.js"
import { item, bannerData } from "./banner.js"

export function gacha(crystals: number, singles: number, tenparts: number, target?: item, modifier?: "gachapin" | "mukku" | "super mukku"){
    /**
     * Change the SSR rate
     * 
     * This is a lazy and technically inaccurate implementation, but I doubt any users will care :)
     * @param rate - The new SSR rate in decimal form (i.e. 1 = 100% and 0.5 = 50%)
     */
    function setSSRRate(rate: number) {
        const rateModifier = 100 - parseFloat(bannerData.bannerInfo.drawRates["SS Rare"]) / rate
        totalRate1 -= rateModifier
        totalRate2 -= rateModifier
    }

    const rolls = Math.floor(crystals / 300) + singles + tenparts * 10
    const tenPartDraws = tenparts + Math.floor(crystals / 3000)
    let { totalRate1, totalRate2 } = bannerData.bannerInfo
    
    if (modifier === "mukku") setSSRRate(0.09)
    if (modifier === "super mukku") setSSRRate(0.15)
    
    // Roll for items
    const items: item[] = []
    for (let i = 1; i <= rolls; i++){
        if (i % 10 === 0 && i <= tenPartDraws * 10){ // Draw from 2nd set of items for 10-Part Draws on the 10th draw
            const rand = Math.random() * totalRate2
            items.push(bannerData.items.find(item => item.cum_rate2 >= rand)!)

            if ((modifier === "gachapin" || modifier === "mukku") && items.filter(item => item.rarity === "SS Rare").length) break
            if (modifier === "super mukku" && items.filter(item => item.rarity === "SS Rare").length >= 5) break
        } else {
            const rand = Math.random() * totalRate1
            items.push(bannerData.items.find(item => item.cum_rate1 >= rand)!)
        }

        if (target && items.includes(target)) break
    }

    // const specialSummons = data.map(row => row.nonTixableSummons)
    const specialCharacters = data.map(row => row.get('limitedCharacters'))
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

export function createGachaEmbed(items: item[], target?: item, modifier?: "gachapin" | "mukku" | "super mukku") {
    const SSRCharacters = items.filter(item => item.rarity === 'SS Rare' && item.character)
    const SSRSummons = items.filter(item => item.rarity === 'SS Rare' && item.type === 'Summon')
    const SSRRate = (items.filter(item => item.rarity === 'SS Rare').length / items.length * 100).toFixed(2)
    const totalRolls = items.length
    
    let gachaTitle = target
        ? `__You got ${target.character ?? target.name} and these ${items.length - 1} items:__`
        : `__You got these ${items.length} items:__`
    if (modifier) gachaTitle = gachaTitle.replace(':__', ` from ${titleize(modifier)} Frenzy:__`)

    const rollEmbed = new EmbedBuilder()
        .setAuthor({name: 'Gacha Simulator', iconURL: 'https://i.imgur.com/MN6TIHj.png'})
        .setTitle(gachaTitle)
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

export function findTarget(target: string){
    const bannerWeaponNames = bannerData.items.map(item => item.name)
    const characterNames = data.map(item => item.get('characterName')).filter(i => i)
    const weaponNames = data.map(item => item.get('weaponName')).filter(i => i)
    const summonNames = data.map(item => item.get('summonName')).filter(i => i)
    const allItemNames = [characterNames, summonNames, weaponNames, bannerWeaponNames].flat()

    const targetName = /summon/i.test(target)
        ? findBestCIMatch(target.replace(/summon/i, ''), summonNames).bestMatch.target
        : findBestCIMatch(target, allItemNames).bestMatch.target
    const targetWeaponID = data.find(item => item.get('characterName') === targetName || item.get('weaponName') === targetName)?.get('weaponID')
    const targetSummonID = data.find(item => item.get('summonName') === targetName)?.get('summonID')
    const targetItem = bannerData.items.find(item => item.id === (targetWeaponID ?? targetSummonID) || item.character === targetName || item.name === targetName)
    return targetItem ?? targetName
}