import { createCanvas } from 'canvas'
import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { browser, fontFallBacks, startPuppeteer } from '../bot.js'
import { summonsTemplate } from '../data/assets.js'
import { getAllSummonInfo, drawStars } from './granblue.js'
import { languageCookie, accessCookie } from "../data/granblue.js"

export async function loadSummons(interaction: ChatInputCommandInteraction, playerID: string){
    const playerEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setAuthor({name: 'Player Search', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})
        .setTitle('Fetching Support Summons <a:loading:763160594974244874>')
    interaction.editReply({embeds: [playerEmbed], components: []})

    // Access the Player profile page
    if (!browser?.connected) await startPuppeteer()
    const page = await browser.newPage()
    await page.setCookie(languageCookie, accessCookie)
    await page.goto(`http://game.granbluefantasy.jp/#profile/${playerID}`, { waitUntil: 'networkidle0' })

    const bodyHTML = await page.evaluate(() => new XMLSerializer().serializeToString(document.doctype!) + document.documentElement.outerHTML)
    if (/\.cnt-maintenance/.test(bodyHTML)){
        interaction.editReply({content: 'The game is currently undergoing maintenance. Please try again when maintenance is over.', embeds: []})
        return await page.close()
    }
    if (/(?<=<div\sclass="txt-secret-profile">).+(?=<\/div>)/.test(bodyHTML)){
        interaction.editReply({content: 'Player profile is private.', embeds: []})
        return await page.close()
    }

	page.close()

	playerEmbed.setTitle('Drawing Support Summons <a:loading:763160594974244874>')
    interaction.editReply({embeds: [playerEmbed]})

    const name = bodyHTML.match(/(?<=<span\sclass="txt-other-name">).+(?=<\/span>)/)?.toString()
    const rank = bodyHTML.match(/(?<=\sRank\s)\d+/)

	// Draw player name, ID, and template
	const canvas = createCanvas(1540, 475)
	const ctx = canvas.getContext('2d')

	ctx.drawImage(summonsTemplate, 0, 0)

	ctx.textAlign = 'center'
	ctx.font = `35px Default Bold ${fontFallBacks}`
	ctx.strokeStyle = 'black'
	ctx.fillStyle = 'white'
	ctx.lineWidth = 2
	ctx.strokeText(`${name} Rank ${rank}`, 549, 425)
	ctx.fillText(`${name} Rank ${rank}`, 549, 425)
	ctx.strokeText(`ID: ${playerID}`, 990, 425)
	ctx.fillText(`ID: ${playerID}`, 990, 425)

	ctx.shadowColor = '#000000'
    ctx.shadowOffsetX = ctx.shadowOffsetY = 4

	const summons = await getAllSummonInfo(bodyHTML)
	summons.forEach((summon, i) => {
		const summonXCoords = [ 36,  36, 221, 221, 406, 406, 591, 591, 776, 776, 961, 961, 1146, 1146, 1331, 1331]
		const summonYCoords = [155, 265, 155, 265, 155, 265, 155, 265, 155, 265, 155, 265,  155,  265,  155,  265]
		ctx.drawImage(summon.image, summonXCoords[i], summonYCoords[i], 168, 96)

		const xCoordinates = summonXCoords.map(x => x + 38)
		const yCoordinates = summonYCoords.map(y => y + 65)
		drawStars(ctx, 25, 29, summon.uncaps, summon.maxUncaps, xCoordinates[i], yCoordinates[i])
	})

	const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `SupportSummons_${playerID}.png`})
    
	playerEmbed
		.setTitle(`${name}`)
		.setURL(`http://game.granbluefantasy.jp/#profile/${playerID}`)
		.setImage(`attachment://${attachment.name}`)
		.setFooter({text: `http://game.granbluefantasy.jp/#profile/${playerID}`, iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})

	return interaction.editReply({embeds: [playerEmbed], files: [attachment]})
}