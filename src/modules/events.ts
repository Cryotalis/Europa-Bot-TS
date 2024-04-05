import { waterAdvantage, earthAdvantage, windAdvantage, fireAdvantage, darkAdvantage, lightAdvantage, eventsBackgroundTop, eventsBackgroundMiddle, eventsBackgroundBottom, upcomingEventsText } from './assets'
import { Canvas, CanvasRenderingContext2D, Image, createCanvas, loadImage } from 'canvas'
import { dateDiff, getSimpleDate, parseOffset } from './time'
import { client, fontFallBacks, servers } from '../bot'
import { capFirstLetter} from './string'
import { wrapText } from './image'
import axios from 'axios'
import md5 from 'md5'

export interface event {
    title: string
    type: string
    start: Date
    end: Date
    duration: string
    image: Image | null
    imageURL: string | null
    elementAdvantage: string | null
    elementAdvantageImg: Image | null
}
export interface rawEvent {
    name: string
    'utc start': number
    'utc end': number
    element: string | null
    image: string
    'time known': string
}
export let currentEvents: event[] = []
export let upcomingEvents: event[] = []
export let eventsTemplate: Canvas | undefined

const eventParams = {
    tables: 'event_history',
    fields: 'event_history.name, event_history.utc_start, event_history.utc_end, event_history.element, event_history.image, event_history.time_known',
    'order by': 'event_history.utc_start DESC',
    limit: 20,
    format: 'json'
}

/**
 * Loads event information and event template. The template includes upcoming events and leaves a blank space for current events.
 */
export async function loadEvents(){
    const {data: rawEvents} = await axios.get('https://gbf.wiki/index.php?title=Special:CargoExport', {headers: {'User-Agent': 'Europa Bot'}, params: eventParams}).catch(() => ({data: null}))
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

export async function processEvents(events: rawEvent[]){
    const now = new Date()
    const currentStart = (now.getTime() / 1000) - (3 * 60 * 60)
    const currentEnd = (now.getTime() / 1000) + (36 * 60 * 60)
    const filteredEvents = events.filter(event => {
        if (event['utc end'] === 0) return true
        else return event['utc end'] > currentStart && event['utc end'] < (now.getTime() / 1000) + (90 * 24 * 60 * 60)
    }) // Only take events that end after now - 3 hours and before now + 90 days

    const processedEvents = filteredEvents.slice(0, 10).map(async event => {
        const start = new Date(event['utc start'] * 1000)
        const end = new Date(event['utc end'] * 1000)
        const month = new Date((event['utc start'] + (now.getTimezoneOffset() + parseOffset('UTC +9')) * 60) * 1000).toLocaleDateString('en-US', {month: 'long'})
        const imgName = capFirstLetter(event.image).replace(/ /g, '_')
        const imgHash = md5(imgName)
        const imgURL = `https://gbf.wiki/images/${imgHash.charAt(0)}/${imgHash.slice(0,2)}/${encodeURI(imgName)}`

        return {
            title: event.name,
            type: event['utc start'] < currentEnd ? 'Current' : 'Upcoming',
            start: start,
            end: end,
            duration: event['time known'] === 'yes' ? `${getSimpleDate(start)} - ${getSimpleDate(end)}` : `In ${month}`,
            image: await loadImage(imgURL),
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
        case 'fire': return {advantage: `Water Advantage`, image: waterAdvantage}
        case 'water': return {advantage: `Earth Advantage`, image: earthAdvantage}
        case 'farth': return {advantage: `Wind Advantage`, image: windAdvantage}
        case 'wind': return {advantage: `Fire Advantage`, image: fireAdvantage}
        case 'light': return {advantage: `Dark Advantage`, image: darkAdvantage}
        case 'dark': return {advantage: `Light Advantage`, image: lightAdvantage}
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
        return now < event.start
            ? `Starts in ${dateDiff(now, event.start, true)}`
            : now < event.end
                ? `Ends in ${dateDiff(now, event.end, true)}`
                : 'Event has ended.'
    }
    return event.duration
}

/**
 * Creates scheduled events according to the in-game events for each subscribed server
 */
export async function createScheduledEvents(){
    const subscribedServers = servers.filter(server => server.get('events') === 'TRUE')
    subscribedServers.forEach(server => {
        const eventsManager = client.guilds.cache.get(server.get('guildID'))?.scheduledEvents
        if (!eventsManager) return
        const newEvents = upcomingEvents.filter(({title, start}) => !eventsManager.cache.some(({name, scheduledStartTimestamp}) => title === name && scheduledStartTimestamp === start.getTime()))

        newEvents.forEach(event => {
            if (!event.start || event.start < new Date() || event.duration.startsWith('In')) return
            eventsManager?.create({
                name: event.title,
                description: event.elementAdvantage ?? undefined,
                image: event.imageURL,
                scheduledStartTime: event.start,
                scheduledEndTime: event.end,
                privacyLevel: 2,                    // Only Guild Members can see the event (this is currently only valid value)
                entityType: 3,                      // 3 = External event
                entityMetadata: {location: 'Granblue Fantasy Skydom'}
            })
        })
    })
}