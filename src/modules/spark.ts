import { createCanvas, loadImage, Image } from "canvas"
import { AttachmentBuilder, EmbedBuilder, GuildMember, InteractionReplyOptions, User } from "discord.js"
import { GoogleSpreadsheetRow } from "google-spreadsheet"
import { info, userData } from "../bot"
import { sparkBGMask, clearSparkBG, defaultSparkBG, progressBars, developerTitle, VIPTitle } from "./assets"
import { formatList } from "./string"
import { round } from "./number"

export async function getProfile(user: GoogleSpreadsheetRow<userData>, discordUser: User): Promise<InteractionReplyOptions>{
    let badBackground = false
    let customBackground

    const canvas = createCanvas(500, 300)
    const ctx = canvas.getContext('2d')
    
    const {userID, crystals, tickets, tenParts, rolls, background} = user.toObject() as userData

    if (background){
        customBackground = await loadImage(background).catch(() => {badBackground = true})
    }

    if (background && !badBackground){
        ctx.drawImage(sparkBGMask, 0, 0)
        ctx.globalCompositeOperation = 'source-in'
        ctx.drawImage(customBackground as Image, 0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
        ctx.drawImage(clearSparkBG, 0, 0)
    } else {
        ctx.drawImage(defaultSparkBG, 0, 0)
    }
    
    const sparkPercent = calcDraws(user, false)/300
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

    ctx.font = applyText(discordUser.displayName)
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(discordUser.displayName, 318, 95)

    if (userID === '251458435554607114'){
        ctx.drawImage(developerTitle, 270, 122)
    }

    if (info.find(row => row.get('name') === 'VIPs')?.get('value').includes(userID)){
        ctx.drawImage(VIPTitle, 302, 122)
    }
    
    ctx.font = '24px Times'
    ctx.textAlign = 'right'
    ctx.fillText(crystals, 160, 175)
    ctx.fillText(tickets, 313, 175)
    ctx.fillText(tenParts, 460, 175)
    ctx.fillText(rolls, 313, 222)

    ctx.font = '19px Arial'
    ctx.textAlign = 'left'
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 3
    ctx.strokeText(round(sparkPercent * 100) + '%', 50, 257)
    ctx.fillText(round(sparkPercent * 100) + '%', 50, 257)

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
    
    const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `${discordUser.displayName}SparkProfile.png`})
    
    if (badBackground){ // If the user's custom background caused an error, send a warning.
        return {content: 'I could not access your background image. Please make sure your background image is publicly accessible.', files: [attachment]}
    }
    
    return {files: [attachment]}
}

export function getEmbedProfile(user: GoogleSpreadsheetRow<userData>, discordUser: GuildMember): InteractionReplyOptions{
    const {crystals, tickets, tenParts, rolls} = user.toObject() as userData
    const sparkPercent = calcDraws(user, false) / 300
    const blank = '⠀'
    let crystalBlank = '', ticketBlank = '', tenticketBlank = '', sparkBlank = ''
    const progBar = '▰'.repeat((sparkPercent % 1) / 0.05) + '▱'.repeat(20 - (sparkPercent % 1) / 0.05)
    const sparkEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setAuthor({name: discordUser.displayName, iconURL: discordUser.user.displayAvatarURL({extension: 'png', forceStatic: true})!})
        .setTitle(`${discordUser.displayName}'s Spark Progress`)

    if (discordUser.presence?.clientStatus?.mobile){
        for (let i = 0; i < 4 - crystals.length / 2; i++) {crystalBlank += blank}
        for (let i = 0; i < 6 - tickets.length / 2; i++) {ticketBlank += blank}
        for (let i = 0; i < 5 - tenParts.length / 2; i++) {tenticketBlank += blank}
        for (let i = 0; i < 14 - rolls.length / 2; i++) {sparkBlank += blank}
        
        sparkEmbed
            .addFields([
                {
                    name: '<:Crystal:616792937161949189> Crystals:⠀   ⠀<:Ticket:616792937254092800> Tickets:⠀   ⠀<:10Ticket:616792937220669450> 10 Parts:', 
                    value: `${crystalBlank + crystals + crystalBlank}${ticketBlank + tickets + ticketBlank}${tenticketBlank + tenParts}`
                },
                {name: '⠀⠀⠀⠀⠀⠀⠀⠀⠀<:Spark:622196123695710208> Rolls/Sparks:', value: sparkBlank + rolls, inline: false},
                {name: `⠀⠀You are ${round(sparkPercent * 100)}% of the way to a spark! <:Stronk:585534348695044199>`, value: `⠀[${progBar}]`}
            ])
    } else {
        for (let i = 0; i < 6 - crystals.length / 2; i++) {crystalBlank += blank}
        for (let i = 0; i < 8 - tickets.length / 2; i++) {ticketBlank += blank}
        for (let i = 0; i < 7 - tenParts.length / 2; i++) {tenticketBlank += blank}
        for (let i = 0; i < 8 - rolls.length / 2; i++) {sparkBlank += blank}
        
        sparkEmbed
            .addFields([
                {name: '⠀⠀<:Crystal:616792937161949189> Crystals:', value: crystalBlank + crystals, inline: true},
                {name: '⠀⠀⠀⠀<:Ticket:616792937254092800> Tickets:', value: ticketBlank + tickets, inline: true},
                {name: '⠀<:10Ticket:616792937220669450> 10 Part Tickets: ⠀', value: tenticketBlank + tenParts, inline: true},
                {name: '\u200B', value: '\u200B', inline: true},
                {name: '⠀⠀<:Spark:622196123695710208> Rolls/Sparks:', value: sparkBlank + rolls, inline: true},
                {name: '\u200B', value: '\u200B', inline: true},
                {name: `⠀⠀⠀⠀⠀⠀You are ${round(sparkPercent * 100)}% of the way to a spark! <:Stronk:585534348695044199>`, value: `⠀ ⠀ ⠀⠀[${progBar}]`}
            ])
    }

    return {embeds: [sparkEmbed]}
}

export function calcDraws(user: GoogleSpreadsheetRow<userData>, round: boolean = true){
    const {crystals, tickets, tenParts} = user.toObject() as userData
    const preciseDraws = (parseInt(crystals) + parseInt(tickets) * 300 + parseInt(tenParts) * 3000) / 300
    return round ? Math.floor(preciseDraws) : preciseDraws
}

export function manageSpark(user: GoogleSpreadsheetRow<userData>, operation: string, crystals: number | null, tickets: number | null, tenParts: number | null){
    const resourceArr = []
    const initialRolls = calcDraws(user)
    if (crystals !== null) resourceArr.push('Crystals')
    if (tickets !== null) resourceArr.push('Tickets')
    if (tenParts !== null) resourceArr.push('10-Part Tickets')

    if (!resourceArr.length) return {errorMsg: `You must choose a resource to ${operation}!`, summary: ''}

    const userCrystals = parseInt(user.get('crystals'))
    const userTickets = parseInt(user.get('tickets'))
    const userTenParts = parseInt(user.get('tenParts'))

    switch(operation){
        case 'set':
            user.set('crystals', String(crystals ?? userCrystals))
            user.set('tickets', String(tickets ?? userTickets))
            user.set('tenParts', String(tenParts ?? userTenParts))
            break
        case 'add':
            user.set('crystals', String(userCrystals + (crystals ?? 0)))
            user.set('tickets', String(userTickets + (tickets ?? 0)))
            user.set('tenParts', String(userTenParts + (tenParts ?? 0)))
            break
        case 'subtract':
            user.set('crystals', String(userCrystals - (crystals ?? 0)))
            user.set('tickets', String(userTickets - (tickets ?? 0)))
            user.set('tenParts', String(userTenParts - (tenParts ?? 0)))
            break
    }

    if (operation !== 'set') operation += 'ed'
    user.set('rolls', String(calcDraws(user)))
    const rolls = calcDraws(user)
    return {errorMsg: '', summary: `${formatList(resourceArr)} ${operation}. You now have ${rolls} draws (${rolls >= initialRolls ? '+' : ''}${rolls - initialRolls}).`}
}