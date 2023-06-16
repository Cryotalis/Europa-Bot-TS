import { createCanvas } from 'canvas'
import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { browser, startPuppeteer } from '../bot'
import { summonsTemplate } from './assets'
import { getAllSummonInfo, drawStars } from './granblue'
import { languageCookie, accessCookie } from './variables'

export async function loadSummons(interaction: ChatInputCommandInteraction, playerID: string){
    const playerEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setAuthor({name: 'Player Search', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})
        .setTitle('Fetching Support Summons <a:loading:763160594974244874>')
    interaction.editReply({embeds: [playerEmbed], components: []})

    // Access the Player profile page
    if (!browser.isConnected()) await startPuppeteer()
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

    await page.waitForSelector('#wrapper > div.contents > div.cnt-profile > div.prt-status', { timeout: 5000 }).catch(async () => {
        await interaction.editReply({content: 'Could not connect to Granblue Fantasy. Please try again later.', embeds: []})
        await page.close()
    })
    if (page.isClosed()) return

    const name = bodyHTML.match(/(?<=<span\sclass="txt-other-name">).+(?=<\/span>)/)?.toString()
    const rank = bodyHTML.match(/(?<=\sRank\s)\d+/)

    playerEmbed.setTitle('Drawing Support Summons <a:loading:763160594974244874>')
    interaction.editReply({embeds: [playerEmbed]})

	// Draw player name, ID, and template
	const canvas = createCanvas(1375, 475)
	const ctx = canvas.getContext('2d')

	ctx.drawImage(summonsTemplate, 0, 0)

	ctx.textAlign = 'center'
	ctx.font = '35px Times Bold'
	ctx.strokeStyle = 'black'
	ctx.fillStyle = 'white'
	ctx.lineWidth = 2
	ctx.strokeText(`${name} Rank ${rank}`, 467, 420)
	ctx.strokeText(`ID: ${playerID}`, 908, 420)
	ctx.fillText(`${name} Rank ${rank}`, 467, 420)
	ctx.fillText(`ID: ${playerID}`, 908, 420)

	const summons = await getAllSummonInfo(bodyHTML)
	summons.forEach((summon, i) => {
		const summonXCoords = [ 50,  50, 234, 234, 419, 419, 604, 604, 788, 788, 973, 973, 1158, 1158]
		const summonYCoords = [155, 265, 155, 265, 155, 265, 155, 265, 155, 265, 155, 265,  155,  265]
		ctx.drawImage(summon.image, summonXCoords[i], summonYCoords[i], 168, 96)

		const xCoordinates = [113, 113, 297, 297, 482, 482, 667, 667, 851, 851, 1036, 1036, 1221, 1221]
		const yCoordinates = [220, 330, 220, 330, 220, 330, 220, 330, 220, 330,  220,  330,  220,  330]
		drawStars(ctx, 19, summon.level, summon.uncaps, summon.maxUncaps, xCoordinates[i], yCoordinates[i])
	})

	const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `${String(String(name).replace(/\s/g, '_').match(/\w+/))}SupportSummons.png`})
    
	playerEmbed
		.setTitle(`${name}`)
		.setURL(`http://game.granbluefantasy.jp/#profile/${playerID}`)
		.setImage(`attachment://${String(String(name).replace(/\s/g, '_').match(/\w+/))}SupportSummons.png`)
		.setFooter({text: `http://game.granbluefantasy.jp/#profile/${playerID}`, iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})

	return interaction.editReply({embeds: [playerEmbed], files: [attachment]})
}