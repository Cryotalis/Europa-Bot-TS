import { createCanvas, loadImage } from "canvas"
import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { browser, fontFallBacks, startPuppeteer } from "../bot"
import { playerTemplate, openSummon, perpetuityRingIcon } from "./assets"
import { getAllSummonInfo, drawStars } from "./granblue"
import { wrapText } from "./image"
import { languageCookie, accessCookie } from "./variables"
import { decode } from "html-entities"

export async function loadProfile(interaction: ChatInputCommandInteraction, playerID: string) {
    const playerEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setAuthor({name: 'Player Search', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})
        .setTitle('Fetching Player Profile <a:loading:763160594974244874>')
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

    await page.waitForSelector('#wrapper > div.contents > div.cnt-profile > div.prt-status', { timeout: 10000 }).catch(async () => {
        await interaction.editReply({content: 'Could not connect to Granblue Fantasy. Please try again later.', embeds: []})
        await page.close()
    })
    if (page.isClosed()) return

    const name = bodyHTML.match(/(?<=<span\sclass="txt-other-name">).+(?=<\/span>)/)?.toString()

    playerEmbed.setTitle('Drawing Player Profile and Support Summons <a:loading:763160594974244874>')
    interaction.editReply({embeds: [playerEmbed]})

    // Reformat the page for the screenshot
    await page.evaluate(playerID => {
        document.getElementById('pop-force')?.remove()
        document.getElementsByClassName('prt-status')[0].innerHTML += `<div class="prt-user-id" style="left:160px; padding-top:10px">Player ID: ${playerID}</div>`
        document.getElementsByClassName('prt-total-status')[0].setAttribute('class', 'prt-total-status mine')
        document.getElementsByClassName('prt-other-job')[0].remove()
        document.body.style.background = 'transparent'
        document.getElementById('wrapper')?.removeAttribute('class')
    }, playerID)
    
    // Take a screenshot of the page and close the page
    const screenshot = await page.screenshot({clip: { x: 0, y: 52, width: 362, height: 520 }, encoding: 'binary', omitBackground: true})
    page.close()
    
    // Draw Player profile, template, and Star Character
    const canvas = createCanvas(810, 520)
    const ctx = canvas.getContext('2d')

    const playerProfile = await loadImage(screenshot)
    ctx.drawImage(playerProfile, 0, 0)
    ctx.drawImage(playerTemplate, 350, 0)
    
    // Fetch/compile summon info and draw summons with uncap stars
    ctx.shadowColor = '#000000'
    ctx.shadowOffsetX = ctx.shadowOffsetY = 2

    const summons = await getAllSummonInfo(bodyHTML)
    summons.forEach((summon, i) => {
        const summonXCoords = [370, 475, 585, 690, 370, 475, 585, 690, 370, 475, 585, 690, 470, 600]
        const summonYCoords = [ 50,  50,  50,  50, 115, 115, 115, 115, 180, 180, 180, 180, 275, 275]
        ctx.drawImage(summon.image, 0, 0, 500, 200, summonXCoords[i], summonYCoords[i], 250, 100)

        const starXCoords = [398, 503, 613, 718, 398, 503, 613, 718, 398, 503, 613, 718, 498, 628]
        const starYCoords = [ 91,  91,  91,  91, 156, 156, 156, 156, 221, 221, 221, 221, 316, 316]
        drawStars(ctx, 15, 17, summon.uncaps, summon.maxUncaps, starXCoords[i], starYCoords[i])
    })

    // Fetch Star Character info and draw
    const starCharPrivate = /Star\sCharacter<\/div>\n.+Private/.test(bodyHTML)
    const starCharRinged = /"ico-augment2-s"/.test(bodyHTML)
    const starCharURL = String(bodyHTML.match(/(?<=img-pushed-npc"\ssrc=").+?(?=")/))
    let starCharName = String(bodyHTML.match(/(?<=prt-current-npc-name">)\s+?.+?\s+?(?=<)/)).trim()
    let emLvl = String(bodyHTML.match(/(?<=txt-npc-rank">)\d+(?=<)/))
    let starCharText = decode(String(bodyHTML.match(/(?<=prt-pushed-info">).+?(?=<)/)))
    let starCharImage
    if (starCharURL.includes('empty.jpg')){starCharImage = openSummon; starCharName = 'Not Set'; emLvl = 'N/A'}
    else if (starCharPrivate){starCharName = 'Private'; emLvl = 'N/A'; starCharText = 'Private' }
    else starCharImage = await loadImage(starCharURL)

    if (starCharImage) ctx.drawImage(starCharImage, 0, 0, 500, 200, 400, 410, 250, 100)

    ctx.textAlign = 'center'
    ctx.font = `20px Default Bold ${fontFallBacks}`
    ctx.fillStyle = 'white'
    ctx.lineWidth = 2

    ctx.strokeStyle = '#570980'
    ctx.strokeText(`${emLvl}`, 760, 390)
    ctx.fillText(`${emLvl}`, 760, 390)

    ctx.font = `20px Default ${fontFallBacks}`
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0
    ctx.strokeStyle = 'black'
    ctx.strokeText(`${starCharName}`, 580, 390)
    ctx.fillText(`${starCharName}`, 580, 390)

    wrapText({ctx: ctx, font: '18px Default', textAlign: 'left'}, `${starCharText}`, 525, 435, 240, 15)

    if (starCharRinged) ctx.drawImage(perpetuityRingIcon, 460, 409, 22, 22)

    const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `Player_${playerID}.png`})

    playerEmbed
        .setTitle(`${name}`)
        .setURL(`http://game.granbluefantasy.jp/#profile/${playerID}`)
        .setImage(`attachment://${attachment.name}`)
        .setFooter({text: `http://game.granbluefantasy.jp/#profile/${playerID}`, iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})

    interaction.editReply({embeds: [playerEmbed], files: [attachment]})
}