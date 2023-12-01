import { createCanvas, loadImage, Image } from "canvas"
import { AttachmentBuilder, EmbedBuilder, GuildMember, InteractionReplyOptions, User } from "discord.js"
import { GoogleSpreadsheetRow } from "google-spreadsheet"
import { info } from "../bot"
import { sparkBGMask, clearSparkBG, defaultSparkBG, progressBars, developerTitle, VIPTitle } from "./assets"
import { isNumber } from "./number"
import { formatList } from "./string"

export async function getProfile(user: GoogleSpreadsheetRow, discordUser: User): Promise<InteractionReplyOptions>{
    let badBackground = false
    let customBackground

    const canvas = createCanvas(500, 300)
    const ctx = canvas.getContext('2d')
    
    const username = String(user.userTag.match(/.+(?=#)/))

    if (user.background){
        customBackground = await loadImage(String(user.background)).catch(() => {badBackground = true})
    }

    if (user.background && !badBackground){
        ctx.drawImage(sparkBGMask, 0, 0)
        ctx.globalCompositeOperation = 'source-in'
        ctx.drawImage(customBackground as Image, 0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
        ctx.drawImage(clearSparkBG, 0, 0)
    } else {
        ctx.drawImage(defaultSparkBG, 0, 0)
    }
    
    // Work around inconsistencies between number/string in the database 
    if (typeof user.percent === 'number'){user.percent = `${(user.percent*100).toFixed(2)}%`}
    const sparkPercent = parseFloat(user.percent)/100.0

    if (Math.floor(sparkPercent)-1 >= 0) ctx.drawImage(progressBars[Math.floor(sparkPercent)-1] ?? progressBars[progressBars.length-1], 0, 0) // Draw a full length progress bar if the user has 1 whole spark or more
    if (sparkPercent > 0){ // Draw a portion of a progress bar according to the user's spark percentage
        ctx.drawImage(progressBars[Math.ceil(sparkPercent)-1] ?? progressBars[progressBars.length-1], 0, 0, 35+424*(sparkPercent % 1), canvas.height, 0, 0, 35+424*(sparkPercent % 1), canvas.height)
    }

    function applyText(text: string){
        let fontSize = 40
        do {
            ctx.font = `${fontSize -= 1}px Times`
        } while (ctx.measureText(text).width > 200)
        return ctx.font
    }

    ctx.font = applyText(username)
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(username, 318, 95)

    if (user.userID === '251458435554607114'){
        ctx.drawImage(developerTitle, 270, 122)
    }

    if (info.find(row => row.name === 'VIPs')?.value.includes(user.userID)){
        ctx.drawImage(VIPTitle, 302, 122)
    }
    
    ctx.font = '24px Times'
    ctx.textAlign = 'right'
    ctx.fillText(user.crystals, 160, 175)
    ctx.fillText(user.tickets, 313, 175)
    ctx.fillText(user.tenParts, 460, 175)
    ctx.fillText(String(parseInt(user.rolls)), 313, 222)

    ctx.font = '19px Arial'
    ctx.textAlign = 'left'
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 3
    ctx.strokeText(user.percent, 50, 257)
    ctx.fillText(user.percent, 50, 257)

    ctx.save()
    ctx.beginPath()
    ctx.arc(105, 90, 50, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.clip()

    const avatarURL = (discordUser).displayAvatarURL({extension: 'png', forceStatic: true})
    const avatar = await loadImage(avatarURL)
    ctx.drawImage(avatar, 55, 40, 100, 100)
    ctx.restore()

    // For Halloween
    // const cobwebs = await loadImage('https://media.discordapp.net/attachments/647256353844232202/1033487287662690434/SparkProfileCobwebs.png')
    // ctx.drawImage(cobwebs, 0, 0)
    
    const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `${username}SparkProfile.png`})
    
    if (badBackground){ // If the user's custom background caused an error, send a warning.
        return {content: 'I could not access your background image. Please make sure your background image is publicly accessible.', files: [attachment]}
    }
    
    return {files: [attachment]}
}

export function getEmbedProfile(user: GoogleSpreadsheetRow, discordUser: GuildMember): InteractionReplyOptions{
    const username = String(user.userTag.match(/.+(?=#)/))
    const blank = '⠀'
    let crystalBlank = '', ticketBlank = '', tenticketBlank = '', sparkBlank = ''
    const progBar = '▰'.repeat((parseFloat(user.percent) % 100) / 5) + '▱'.repeat(20 - (parseFloat(user.percent) % 100) / 5)
    const sparkEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setAuthor({name: user.userTag, iconURL: discordUser.user.displayAvatarURL({extension: 'png', forceStatic: true})!})
        .setTitle(`${username}'s Spark Progress`)

    if (discordUser.presence?.clientStatus?.mobile){
        for (let i = 0; i < 4 - String(user.crystals).length / 2; i++) {crystalBlank += blank}
        for (let i = 0; i < 6 - String(user.tickets).length / 2; i++) {ticketBlank += blank}
        for (let i = 0; i < 5 - String(user.tenParts).length / 2; i++) {tenticketBlank += blank}
        for (let i = 0; i < 14 - String(parseInt(user.rolls)).length / 2; i++) {sparkBlank += blank}
        
        sparkEmbed
            .addFields([
                {
                    name: '<:Crystal:616792937161949189> Crystals:⠀   ⠀<:Ticket:616792937254092800> Tickets:⠀   ⠀<:10Ticket:616792937220669450> 10 Parts:', 
                    value: `${crystalBlank + user.crystals + crystalBlank}${ticketBlank + user.tickets + ticketBlank}${tenticketBlank + user.tenParts}`
                },
                {name: '⠀⠀⠀⠀⠀⠀⠀⠀⠀<:Spark:622196123695710208> Rolls/Sparks:', value: sparkBlank + String(parseInt(user.rolls)), inline: false},
                {name: `⠀⠀You are ${user.percent} of the way to a spark! <:Stronk:585534348695044199>`, value: `⠀[${progBar}]`}
            ])
    } else {
        for (let i = 0; i < 6 - String(user.crystals).length / 2; i++) {crystalBlank += blank}
        for (let i = 0; i < 8 - String(user.tickets).length / 2; i++) {ticketBlank += blank}
        for (let i = 0; i < 7 - String(user.tenParts).length / 2; i++) {tenticketBlank += blank}
        for (let i = 0; i < 8 - String(parseInt(user.rolls)).length / 2; i++) {sparkBlank += blank}
        
        sparkEmbed
            .addFields([
                {name: '⠀⠀<:Crystal:616792937161949189> Crystals:', value: crystalBlank + user.crystals, inline: true},
                {name: '⠀⠀⠀⠀<:Ticket:616792937254092800> Tickets:', value: ticketBlank + user.tickets, inline: true},
                {name: '⠀<:10Ticket:616792937220669450> 10 Part Tickets: ⠀', value: tenticketBlank + user.tenParts, inline: true},
                {name: '\u200B', value: '\u200B', inline: true},
                {name: '⠀⠀<:Spark:622196123695710208> Rolls/Sparks:', value: sparkBlank + String(parseInt(user.rolls)), inline: true},
                {name: '\u200B', value: '\u200B', inline: true},
                {name: `⠀⠀⠀⠀⠀⠀You are ${user.percent} of the way to a spark! <:Stronk:585534348695044199>`, value: `⠀ ⠀ ⠀⠀[${progBar}]`}
            ])
    }

    return {embeds: [sparkEmbed]}
}

export function calcDraws(user: GoogleSpreadsheetRow, round: boolean = true){
    const preciseDraws = (parseInt(user.crystals) + parseInt(user.tickets) * 300 + parseInt(user.tenParts) * 3000) / 300
    return round ? Math.floor(preciseDraws) : preciseDraws
}

export function manageSpark(user: GoogleSpreadsheetRow, operation: string, crystals: number | null, tickets: number | null, tenparts: number | null): InteractionReplyOptions{
    const resourceArr = []
    const initialRolls = calcDraws(user)
    if (isNumber(crystals)) resourceArr.push('Crystals')
    if (isNumber(tickets)) resourceArr.push('Tickets')
    if (isNumber(tenparts)) resourceArr.push('10-Part Tickets')

    user.crystals = parseInt(user.crystals)
    user.tickets = parseInt(user.tickets)
    user.tenParts = parseInt(user.tenParts)

    switch(operation){
        case 'set': 
            user.crystals = crystals ?? user.crystals
            user.tickets = tickets ?? user.tickets
            user.tenParts = tenparts ?? user.tenParts
            break
        case 'add': 
            user.crystals += crystals ?? 0
            user.tickets += tickets ?? 0
            user.tenParts += tenparts ?? 0
            break
        case 'subtract': 
            user.crystals -= crystals ?? 0
            user.tickets -= tickets ?? 0
            user.tenParts -= tenparts ?? 0
            break
    }

    if (operation !== 'set') operation += 'ed'
    user.percent = calcDraws(user, false)/300
    user.rolls = calcDraws(user)
    return {content: `${formatList(resourceArr)} ${operation}. You now have ${user.rolls} draws (${user.rolls >= initialRolls ? '+' : ''}${user.rolls - initialRolls}).`}
}