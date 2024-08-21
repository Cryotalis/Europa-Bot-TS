import { createCanvas, loadImage, Image } from "canvas"
import { AttachmentBuilder, EmbedBuilder, GuildMember, InteractionReplyOptions, User } from "discord.js"
import { GoogleSpreadsheetRow } from "google-spreadsheet"
import { fontFallBacks, userData } from "../bot.js"
import { sparkBGMask, clearSparkBG, defaultSparkBG, progressBars, developerTitle, VIPTitle, clearMBSparkBG, defaultMBSparkBG } from "../data/assets.js"
import { formatList } from "./string.js"
import { round } from "./number.js"

export async function getProfile(user: GoogleSpreadsheetRow<userData>, discordUser: User): Promise<InteractionReplyOptions>{
    const canvas = createCanvas(500, 300)
    const ctx = canvas.getContext('2d')
    
    const {crystals, mobaCoin, tickets, tenParts, rolls, background, sparkTitle} = user.toObject() as userData
    let customBackground: Image | undefined

    if (background) customBackground = await loadImage(background).catch(() => undefined)

    if (customBackground){
        ctx.drawImage(sparkBGMask, 0, 0)
        ctx.globalCompositeOperation = 'source-in'
        ctx.drawImage(customBackground, 0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
        ctx.drawImage(+mobaCoin ? clearMBSparkBG : clearSparkBG, 0, 0)
    } else {
        ctx.drawImage(+mobaCoin ? defaultMBSparkBG : defaultSparkBG, 0, 0)
    }
    
    const sparkPercent = calcDraws(user, false)/300
    if (Math.floor(sparkPercent)-1 >= 0) ctx.drawImage(progressBars[Math.floor(sparkPercent)-1] ?? progressBars[progressBars.length-1], 0, 0) // Draw a full length progress bar if the user has 1 whole spark or more
    if (sparkPercent > 0){ // Draw a portion of a progress bar according to the user's spark percentage
        ctx.drawImage(progressBars[Math.ceil(sparkPercent)-1] ?? progressBars[progressBars.length-1], 0, 0, 35+424*(sparkPercent % 1), canvas.height, 0, 0, 35+424*(sparkPercent % 1), canvas.height)
    }

    function applyText(text: string){
        let fontSize = 40
        do {
            ctx.font = `${fontSize -= 1}px Default ${fontFallBacks}`
        } while (ctx.measureText(text).width > 200)
        return ctx.font
    }

    ctx.font = applyText(discordUser.displayName)
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(discordUser.displayName, 318, 95)

    switch (sparkTitle?.toLowerCase()) {
        case 'developer': ctx.drawImage(developerTitle, 270, 122); break
        case 'vip': ctx.drawImage(VIPTitle, 302, 122); break
    }
    
    ctx.font = `24px Default ${fontFallBacks}`
    ctx.textAlign = 'right'
    ctx.fillText(crystals, 165, 174)
    ctx.fillText(tickets, 315, 174)
    ctx.fillText(tenParts, 465, 174)
    if (+mobaCoin){
        ctx.fillText(mobaCoin, 240, 220)
        ctx.fillText(rolls, 390, 220)
    } else {
        ctx.fillText(rolls, 315, 220)
    }

    ctx.font = `19px Default ${fontFallBacks}`
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
    
    if (background && !customBackground){ // If the user's custom background caused an error, send a warning.
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
    const {crystals, mobaCoin, tickets, tenParts} = user.toObject() as userData
    const preciseDraws = (parseInt(crystals) + parseInt(mobaCoin) + parseInt(tickets) * 300 + parseInt(tenParts) * 3000) / 300
    return round ? Math.floor(preciseDraws) : preciseDraws
}

export function manageSpark(user: GoogleSpreadsheetRow<userData>, operation: string, crystals: number | null, mobaCoin: number | null, tickets: number | null, tenParts: number | null){
    const resourceArr = []
    const initialRolls = calcDraws(user)
    if (crystals !== null) resourceArr.push('Crystals')
    if (mobaCoin !== null) resourceArr.push('MobaCoin')
    if (tickets !== null) resourceArr.push('Tickets')
    if (tenParts !== null) resourceArr.push('10-Part Tickets')

    if (!resourceArr.length) return {errorMsg: `You must choose a resource to ${operation}!`, summary: ''}

    const userCrystals = parseInt(user.get('crystals'))
    const userMobaCoin = parseInt(user.get('mobaCoin'))
    const userTickets = parseInt(user.get('tickets'))
    const userTenParts = parseInt(user.get('tenParts'))

    switch(operation){
        case 'set':
            user.set('crystals', String(crystals ?? userCrystals))
            user.set('mobaCoin', String(mobaCoin ?? userMobaCoin))
            user.set('tickets', String(tickets ?? userTickets))
            user.set('tenParts', String(tenParts ?? userTenParts))
            break
        case 'add':
            user.set('crystals', String(userCrystals + (crystals ?? 0)))
            user.set('mobaCoin', String(userMobaCoin + (mobaCoin ?? 0)))
            user.set('tickets', String(userTickets + (tickets ?? 0)))
            user.set('tenParts', String(userTenParts + (tenParts ?? 0)))
            break
        case 'subtract':
            user.set('crystals', String(userCrystals - (crystals ?? 0)))
            user.set('mobaCoin', String(userMobaCoin - (mobaCoin ?? 0)))
            user.set('tickets', String(userTickets - (tickets ?? 0)))
            user.set('tenParts', String(userTenParts - (tenParts ?? 0)))
            break
    }

    if (operation !== 'set') operation += 'ed'
    user.set('rolls', String(calcDraws(user)))
    const rolls = calcDraws(user)
    return {errorMsg: '', summary: `${formatList(resourceArr)} ${operation}. You now have ${rolls} draws (${rolls >= initialRolls ? '+' : ''}${rolls - initialRolls}).`}
}