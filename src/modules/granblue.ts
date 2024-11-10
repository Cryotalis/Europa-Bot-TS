import { CanvasRenderingContext2D, Image, loadImage } from 'canvas'
import { blankBlueStar, blankRegularStar, blueStar, privateSummon, regularStar, transcendenceStars } from '../data/assets.js'
import { database } from '../data/database.js'

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

    const summonPrivate = /Support Summons<\/div>\n\n.+<div class="txt-private">Private/.test(rawHtml)
    if (summonPrivate) return []

    const summonImageLinks: string[] = []
    summonIDs.forEach(ID => {
        const nameRegex = new RegExp(`(?<=summon${ID}-name" class="prt-fix-name" name=").+?(?=">)`)
        const uncapRegex = new RegExp(`(?<=summon${ID}-info" class="prt-fix-info bless-rank)\\d`)
        const levelRegex = new RegExp(`summon${ID}-name".+?\\d+`)
        const summonURLRegex = new RegExp(`${ID.replace(/(\d)(\d)/, '$1/$2')}".+?img-fix-summon.+?src="(.+?)"`, 's')

        const summon = database.summons.find(summon => summon.get('name') === String(rawHtml.match(nameRegex)))
        const level = parseInt(String(String(rawHtml.match(levelRegex)).match(/(?<=Lvl\s)\d+/i)))
        const uncapRank = parseInt(String(rawHtml.match(uncapRegex)))
        let uncaps = uncapRank
        summonImageLinks.push(rawHtml.match(summonURLRegex)![1])

        if (uncapRank === 0 || level > 200 || isNaN(uncapRank)) { // Guess the summon uncap level based on level if the summon isn't at least mlb
            if (1   <= level && level <= 40)  uncaps = 0
            if (41  <= level && level <= 60)  uncaps = 1
            if (61  <= level && level <= 80)  uncaps = 2
            if (81  <= level && level <= 100) uncaps = 3
            if (101 <= level && level <= 150) uncaps = 4
            if (151 <= level && level <= 200) uncaps = 5
            if (201 <= level && level <= 210) uncaps = 6
            if (211 <= level && level <= 220) uncaps = 7
            if (221 <= level && level <= 230) uncaps = 8
            if (231 <= level && level <= 240) uncaps = 9
            if (241 <= level && level <= 250) uncaps = 10
        } else {
            uncaps += 2
        }

        summons.push({
            image: privateSummon,
            level: level,
            uncaps: uncaps,
            maxUncaps: summonInfo?.get('ulbDate') ? 5 : summonInfo?.get('flbDate') ? 4 : 3
        })
    })

    const summonImages = await Promise.all(summonImageLinks.map(link => loadImage(link)))
    summons.forEach((summon, i) => summon.image = summonImages[i])

    return summons
}


/**
 * Draws uncap stars for summons.
 * @param ctx - The canvas context to draw the stars onto.
 * @param spacing - How far apart the stars should be spaced in pixels.
 * @param size - The width and height when drawing the stars
 * @param uncaps - The number of times the summon has been uncapped.
 * @param maxUncaps - The maximum number of times the summon can be uncapped.
 * @param x - The x coordinate from which to start drawing the uncap stars.
 * @param y - The y coordinate from which to start drawing the uncap stars.
 */
export function drawStars(ctx: CanvasRenderingContext2D, spacing: number, size: number, uncaps: number, maxUncaps: number, x: number, y: number) {
    ctx.save()
    ctx.shadowColor = 'black'
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    x += (5 - maxUncaps) * spacing // This ensures that the placement of the stars is consistent no matter the number of stars that need to be drawn
    for (let i = 0; i < maxUncaps; i++) {
        if (uncaps > 5 && i < uncaps - 5)  {ctx.drawImage(transcendenceStars[5], x + spacing * i, y, size, size); continue}
        if (uncaps > 5 && i >= uncaps - 5) {ctx.drawImage(transcendenceStars[6], x + spacing * i, y, size, size); continue}
        if (i < 3 && i < uncaps)   ctx.drawImage(regularStar, x + spacing * i, y, size, size)
        if (i < 3 && i >= uncaps)  ctx.drawImage(blankRegularStar, x + spacing * i, y, size, size)
        if (i >= 3 && i < uncaps)  ctx.drawImage(blueStar, x + spacing * i, y, size, size)
        if (i >= 3 && i >= uncaps) ctx.drawImage(blankBlueStar, x + spacing * i, y, size, size)
    }
    ctx.restore()
}
