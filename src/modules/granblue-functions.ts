import { CanvasRenderingContext2D, Image, loadImage } from 'canvas'
import { data } from '../bot'
import { blankBlueStar, blankRegularStar, blueStar, privateSummon, regularStar } from './assets'
import { isInRange } from './number-functions'

/**
 * Parses raw HTML and returns an array containing information for each support summon the player has set.
 * @param rawHtml - Raw HTML containing summon information taken from the player profile page.
 */
export async function getAllSummonInfo(rawHtml: string){
    interface summonInfo {image: Image, level: number, uncaps: number, maxUncaps: number}
    const summons: Array<summonInfo> = []
    const summonIDs = [
        '10', '11', // Fire summon IDs
        '20', '21', // Water summon IDs
        '30', '31', // Earth summon IDs
        '40', '41', // Wind summon IDs
        '50', '51', // Light summon IDs
        '60', '61', // Dark summon IDs
        '00', '01', // Misc summon IDs
    ]

    const summonPrivate = /Support\sSummons<\/div>.+<div\sclass="txt-private">Private/s.test(rawHtml)
    if (summonPrivate) return []

    const summonImagePromises: Promise<Image>[] = []
    summonIDs.forEach(ID => {
        const nameRegex = new RegExp(`(?<=summon${ID}-name" class="prt-fix-name" name=").+?(?=">)`)
        const uncapRegex = new RegExp(`(?<=summon${ID}-info" class="prt-fix-info bless-rank)\\d`)
        const levelRegex = new RegExp(`summon${ID}-name".+?\\d+`)
        const summonURLRegex = new RegExp(`${ID.replace(/(\d)(\d)/, '$1/$2')}".+?img-fix-summon.+?src="(.+?)"`, 's')
        const summonInfo = data.find(info => info.summonName === String(rawHtml.match(nameRegex)))
        summonImagePromises.push(loadImage(rawHtml.match(summonURLRegex)![1]))
        summons.push({
            image: privateSummon,
            level: parseInt(String(String(rawHtml.match(levelRegex)).match(/(?<=Lvl\s)\d+/i))),
            uncaps: parseInt(String(rawHtml.match(uncapRegex))) + 2,
            maxUncaps: summonInfo?.ulbDate ? 5 : summonInfo?.flbDate ? 4 : 3
        })
    })

    const summonImages = await Promise.all(summonImagePromises)
    summons.forEach((summon, i) => summon.image = summonImages[i])

    return summons
}


/**
 * Draws uncap stars for summons.
 * @param ctx - The canvas context to draw the stars onto.
 * @param spacing - How far apart the stars should be spaced in pixels.
 * @param level - The current level of the summon.
 * @param uncaps - The number of times the summon has been uncapped.
 * @param maxUncaps - The maximum number of times the summon can be uncapped.
 * @param x - The x coordinate from which to start drawing the uncap stars.
 * @param y - The y coordinate from which to start drawing the uncap stars.
 */
export function drawStars(ctx: CanvasRenderingContext2D, spacing: number, level: number, uncaps: number, maxUncaps: number, x: number, y: number) {
    // If number of uncaps are unknown, use the level of the summon to (try to) determine uncaps
    if (isNaN(uncaps)) {
        if (isInRange(level, 1, 40))    {uncaps = 1}
        if (isInRange(level, 41, 60))   {uncaps = 1}
        if (isInRange(level, 61, 80))   {uncaps = 2}
        if (isInRange(level, 81, 100))  {uncaps = 3}
        if (isInRange(level, 101, 150)) {uncaps = 4}
        if (isInRange(level, 151, 200)) {uncaps = 5}
    }

    ctx.save()
    ctx.shadowColor = 'black'
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    x += (5 - maxUncaps) * spacing // This ensures that the placement of the stars is consistent no matter the number of stars that need to be drawn
    for (let i = 0; i < maxUncaps; i++) {
        if (i < 3 && i < uncaps) {ctx.drawImage(regularStar, x + spacing * i, y)}
        if (i < 3 && i >= uncaps) {ctx.drawImage(blankRegularStar, x + spacing * i, y)}
        if (i >= 3 && i < uncaps) {ctx.drawImage(blueStar, x + spacing * i, y)}
        if (i >= 3 && i >= uncaps) {ctx.drawImage(blankBlueStar, x + spacing * i, y)}
    }
    ctx.restore()
}
