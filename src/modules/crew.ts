import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { browser, startPuppeteer } from "../bot.js"
import { formatList } from "./string.js"
import { languageCookie, accessCookie } from "../data/variables.js"

export interface crew {data: {is_seed: number | string, points: number | string, gw_num: number | string, rank: number | string, name: string}[], id: number}
export async function loadCrew(interaction: ChatInputCommandInteraction, crew: crew){
    if (!browser?.connected) await startPuppeteer()
    
    const crewEmbed = new EmbedBuilder()
        .setTitle('Loading Crew Page <a:loading:763160594974244874>')
        .setColor('Blue')
        .setAuthor({name: 'Crew Search', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})
        .setFooter({text: `http://game.granbluefantasy.jp/#guild/detail/${crew.id}`, iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})
    interaction.editReply({embeds: [crewEmbed], components: []})

    const page = await browser.newPage()
    await page.setCookie(languageCookie, accessCookie)
    await page.goto(`http://game.granbluefantasy.jp/#guild/detail/${crew.id}`, { waitUntil: 'networkidle0' })
    if (/maintenance/g.test(await page.content())){
        await interaction.editReply({content: 'The game is currently undergoing maintenance. Please try again when maintenance is over.', embeds: []})
        return page.close()
    }

    await page.waitForSelector('#wrapper > div.contents > div.cnt-guild > div.prt-airship-image > img', {visible: true})
    await page.evaluate((crewID) => {
        document.getElementsByClassName('prt-head-current')[0].setAttribute('style', 'font-size: 14pxpadding-top: 4px')
        document.getElementsByClassName('prt-head-current')[0].textContent += ` ID: ${crewID}`
    }, crew.id)

    const screenshot = await page.screenshot({ encoding: 'binary', clip: { x: 0, y: 0, width: 363, height: 400 } }) //Take the screenshot
    await page.close()

    const attachment = new AttachmentBuilder(Buffer.from(screenshot), {name: `Crew_${crew.id}.png`})

    crewEmbed
        .setTitle(`${crew.data[0].name}`)
        .setURL(`http://game.granbluefantasy.jp/#guild/detail/${crew.id}`)
        .setImage(`attachment://${attachment.name}`)
        .addFields([
            {name: 'Ranking', value: `Ranked #${crew.data[0].rank} in GW #${crew.data[0].gw_num} with ${crew.data[0].points.toLocaleString()} points`},
            {name: 'Name History', value: `${formatList([...new Set(crew.data.map(crew => crew.name))])}`}
        ])
    
    interaction.editReply({embeds: [crewEmbed], files: [attachment]})
}