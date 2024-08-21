import { waterAdvantage, earthAdvantage, windAdvantage, fireAdvantage, darkAdvantage, lightAdvantage, eventsBackgroundTop, eventsBackgroundMiddle, eventsBackgroundBottom, upcomingEventsText } from '../data/assets.js'
import { Canvas, CanvasRenderingContext2D, Image, createCanvas, loadImage } from 'canvas'
import { dateDiff, getSimpleDate, parseOffset } from './time.js'
import { client, fontFallBacks, servers } from '../bot.js'
import { capFirstLetter} from './string.js'
import { wrapText } from './image.js'
import axios from 'axios'
import md5 from 'md5'
import { GuildScheduledEventCreateOptions, GuildScheduledEventStatus } from 'discord.js'
import { decode } from 'html-entities'

export interface event {
    title: string
    id: string
    type: string
    start: Date | null
    end: Date | null
    duration: string
    wikiURL: string | null
    image: Image | null
    imageURL: string | null
    elementAdvantage: string | null
    elementAdvantageImg: Image | null
}
export interface rawEvent {
    name: string
    _ID: number
    'time known': string
    'utc start': number
    'utc end': number
    'wiki page': string | null
    image: string | null
    element: string | null
}
export let currentEvents: event[] = []
export let upcomingEvents: event[] = []
export let eventsTemplate: Canvas | undefined

const eventParams = {
    tables: 'event_history',
    fields: 'event_history.name, event_history._ID, event_history.time_known, event_history.utc_start,' + 
            'event_history.utc_end, event_history.wiki_page, event_history.image, event_history.element',
    'order by': 'event_history.utc_start DESC',
    limit: 20,
    format: 'json'
}

/**
 * Loads event information and event template. The template includes upcoming events and leaves a blank space for current events.
 */
export async function loadEvents(){
    const {data: rawEvents} = await axios.get('https://gbf.wiki/index.php?title=Special:CargoExport', {headers: {'User-Agent': 'Europa Bot'}, params: eventParams})
    if (!rawEvents) return

    const events = (await processEvents(rawEvents)).reverse()
    currentEvents = events.filter(event => event.type === 'Current')
    upcomingEvents = events.filter(event => event.type === 'Upcoming')

    // Create the events image
    const canvasHeight = Math.ceil(currentEvents.length / 2) * 110 + Math.ceil(upcomingEvents.length / 2) * 110 + 50
    const canvas = createCanvas(700, canvasHeight + 150)
    const ctx = canvas.getContext('2d')

    ctx.drawImage(eventsBackgroundTop, 0, 0)
    ctx.drawImage(eventsBackgroundMiddle, 0, 100, 700, canvasHeight)
    ctx.drawImage(eventsBackgroundBottom, 0, 100 + canvasHeight)

    let X = 25
    let Y = Math.ceil(currentEvents.length / 2) * 110 + 110 + 5
    ctx.drawImage(upcomingEventsText, 155, Y)
    Y += 45

    upcomingEvents.forEach((event, i) => {
        if (i % 2 === 0){ // Draw events in the left column
            const lastEvent = Boolean(i + 1 === upcomingEvents.length)
            X = lastEvent ? 185 : 25 // Center the event if it's the last one
            Y += i ? 110 : 0 // Only add to Y after the first event
            drawEvent(ctx, event, lastEvent ? 350 : 190, X, Y)
        } else { // Draw events in the right column
            X = 345
            drawEvent(ctx, event, 510, X, Y)
        }
    })

    eventsTemplate = canvas
}

/**
 * Processes events from the GBF wiki. 
 * - Events that are not ongoing, ended more than 3 hours ago, or end more than 90 days later are filtered out.
 * - Returns up to 10 events.
 */
export async function processEvents(events: rawEvent[]): Promise<event[]>{
    const now = new Date()
    const currentStart = (now.getTime() / 1000) - (3 * 60 * 60)
    const currentEnd = (now.getTime() / 1000) + (36 * 60 * 60)
    const filteredEvents = events.filter(event => {
        if (event['utc end'] === 0) return true
        return event['utc end'] > currentStart && event['utc end'] < (now.getTime() / 1000) + (90 * 24 * 60 * 60)
    })

    const processedEvents = filteredEvents.slice(0, 10).map(async event => {
        const start = event['utc start'] ? new Date(event['utc start'] * 1000) : null
        const end = event['utc end'] ? new Date(event['utc end'] * 1000) : null
        const month = new Date((event['utc start'] + (now.getTimezoneOffset() + parseOffset('UTC +9')) * 60) * 1000).toLocaleDateString('en-US', {month: 'long'})
        let imgName, imgHash, imgURL = null

        if (event.image){
            imgName = decode(capFirstLetter(event.image).replace(/ /g, '_'))
            imgHash = md5(imgName)
            imgURL = `https://gbf.wiki/images/${imgHash.charAt(0)}/${imgHash.slice(0,2)}/${encodeURI(imgName)}`
        }

        return {
            title: event.name,
            id: String(event._ID),
            type: event['utc start'] < currentEnd ? 'Current' : 'Upcoming',
            start: start,
            end: end,
            duration: event['time known'] === 'yes' ? `${getSimpleDate(start)} - ${getSimpleDate(end)}` : `In ${month}`,
            wikiURL: event['wiki page'] && `https://gbf.wiki/${event['wiki page'].replace(/ /g, '_')}`,
            image: imgURL ? await loadImage(imgURL) : null,
            imageURL: imgURL,
            elementAdvantage: getElementAdvantage(event.element).advantage,
            elementAdvantageImg: getElementAdvantage(event.element).image
        }
    })

    return await Promise.all(processedEvents)
}

/** Determines the element advantage and the element advantage image from the event data. */
export function getElementAdvantage(element: string | null) {
    switch (element) {
        case 'fire': return {advantage: `<:WaterAdvantage:1225922220157833277> Water Advantage`, image: waterAdvantage}
        case 'water': return {advantage: `<:EarthAdvantage:1225922224154742957> Earth Advantage`, image: earthAdvantage}
        case 'farth': return {advantage: `<:WindAdvantage:1225922221617319976> Wind Advantage`, image: windAdvantage}
        case 'wind': return {advantage: `<:FireAdvantage:1225922225492856852> Fire Advantage`, image: fireAdvantage}
        case 'light': return {advantage: `<:DarkAdvantage:1225922222871412887> Dark Advantage`, image: darkAdvantage}
        case 'dark': return {advantage: `<:LightAdvantage:1225922226503811153> Light Advantage`, image: lightAdvantage}
        default: return {advantage: null, image: null}
    }
}

/** Draws event banners and their durations. */
export function drawEvent(ctx: CanvasRenderingContext2D, event: event, textX: number, eventX: number, eventY: number){
    /** Calculates where text should be placed on the X-axis in order to be center aligned. */
    function centerTextX(text: string, center: number) { 
        return center - ctx.measureText(text).width / text.length * text.length / 2
    }

    ctx.font = `20px Default ${fontFallBacks}`
    ctx.textAlign = 'center'
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 3
    ctx.fillStyle = 'white'

    let eventDuration = getEventDuration(event)
    
    // Draw the event banner, or text if there is no banner image
    if (event.image){
        let bannerHeight = event.image.height * 330 / event.image.width
        ctx.drawImage(event.image, eventX, eventY + (77 - bannerHeight) / 2, 330, bannerHeight)
    } else {
        wrapText({ctx: ctx, font: '25px Default'}, event.title, textX, eventY + 43, 290, 30)
    }

    if (event.elementAdvantageImg){
        textX += 18
        ctx.drawImage(event.elementAdvantageImg, centerTextX(eventDuration, textX) - 35, eventY + 82)
    }

    ctx.strokeText(eventDuration, textX, eventY + 100)
    ctx.fillText(eventDuration, textX, eventY + 100)
}

/**
 * Takes an event and outputs the correct duration string for the event.
 */
export function getEventDuration(event: event){
    if (event.type === 'Current'){
        const now = new Date()
        
        if (!event.start) return 'Starts in ?'
        if (now < event.start) return `Starts in ${dateDiff(now, event.start, true)}`
        
        if (!event.end) return 'Ends in ?'
        if (now < event.end) return `Ends in ${dateDiff(now, event.end, true)}`
        return 'Event has ended.'
    }
    return event.duration
}

/**
 * Creates scheduled events according to the in-game events for each subscribed server
 */
export async function createScheduledEvents(){
    const subscribedServers = servers.filter(server => server.get('events') && !/None/.test(server.get('events')))
    const events = currentEvents.concat(upcomingEvents)
    const threeMinsLater = new Date(new Date().valueOf() + 3 * 60000)

    const scheduledEvents: GuildScheduledEventCreateOptions[] = events.map(event => {
        if (!event.start || !event.end || event.duration.startsWith('In')) return {} as GuildScheduledEventCreateOptions
        
        // Resize the image to better fit Discord's event image frame
        let canvas
        if (event.image){
            canvas = createCanvas(event.image.width, event.image.width * 320 / 800) // 800x320 is the recommended dimensions by Discord
            const ctx = canvas.getContext('2d')
            ctx.drawImage(event.image, 0, (canvas.height - event.image.height) / 2)
        }

        return {
            name: event.title,
            description: `\`Starts:\` <t:${event.start.getTime() / 1000}:f>` +
                         `\n\` Ends: \` <t:${event.end.getTime() / 1000}:f>` + 
                         '\n\n' +
                         [
                             `Event #${event.id}`,
                             event.wikiURL && `[Event Page](${event.wikiURL})`,
                             event.imageURL && `[Banner Image Link](${event.imageURL})`
                         ].filter(e => e).join(' | '),
            image: canvas?.toBuffer(),
            scheduledStartTime: event.start < new Date() ? threeMinsLater : event.start, // If the in-game event already started, set the discord event to start in 3 minutes
            scheduledEndTime: event.end,
            privacyLevel: 2, // Only Guild Members can see the event (this is currently the only valid value)
            entityType: 3, // 3 = External event
            entityMetadata: {location: event.elementAdvantage ?? 'No Element Advantage'}
        }
    }).filter(event => event.name)
 
    subscribedServers.forEach(server => {
        const eventsManager = client.guilds.cache.get(server.get('guildID'))?.scheduledEvents
        if (!eventsManager) return

        const relayEvents: string[] = JSON.parse(server.get('events'))
        const filteredEvents = relayEvents.includes('All')
            ? scheduledEvents
            : scheduledEvents.filter(({name}) => relayEvents.some(eventPhrase => name.includes(eventPhrase)))

        filteredEvents.forEach(event => {
            const eventID = String(event.description!.match(/(?<=Event #)\d+/))
            const existingEvent = eventsManager.cache.find(({name, description}) => {
                return name === event.name || description!.includes(eventID)
            })

            if (!existingEvent) return eventsManager.create(event)

            if (
                existingEvent.name !== event.name ||
                existingEvent.description !== event.description ||
                existingEvent.entityMetadata !== event.entityMetadata
            ) {
                existingEvent.edit({
                    name: event.name,
                    description: event.description,
                    image: event.image,
                    entityMetadata: event.entityMetadata
                })
            }

            if (
                existingEvent.status === GuildScheduledEventStatus.Scheduled && (
                    existingEvent.scheduledStartTimestamp !== new Date(event.scheduledStartTime).getTime() ||
                    existingEvent.scheduledEndTimestamp !== new Date(event.scheduledEndTime!).getTime()
                )
            ){
                existingEvent.edit({
                    scheduledStartTime: event.scheduledStartTime,
                    scheduledEndTime: event.scheduledEndTime,
                })
            }
        })
    })
}