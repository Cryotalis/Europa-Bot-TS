import { Canvas, CanvasRenderingContext2D, Image, createCanvas, loadImage } from "canvas"
import { decode } from "html-entities"
import { waterAdvantage, earthAdvantage, windAdvantage, fireAdvantage, darkAdvantage, lightAdvantage, eventsBackgroundTop, eventsBackgroundMiddle, eventsBackgroundBottom, upcomingEventsText } from "./assets"
import { wrapText } from "./image"
import { dateDiff, getSimpleDate } from "./time"
import axios from "axios"

export interface event {type: 'Current' | 'Upcoming', title: string, image: Image | undefined, start: Date, end: Date, duration: string, elementAdvantage: string | undefined, elementAdvantageImage: Image | undefined}
export let currentEvents: event[] = []
export let upcomingEvents: event[] = []
export let eventsTemplate: Canvas | undefined

/**
 * Loads event information and event template. The template includes upcoming events and leaves a blank space for current events.
 */
export async function loadEvents(){
    let {data}: {data: string} = await axios.get('https://gbf.wiki/Template:MainPageEvents').catch(() => ({data: ''}))
    if (!data) return

    const eventData = data.match(/vertical-align: top.+<!--/s)!.toString()
    const currentEventsData = eventData.match(/.+(?=<hr \/>)/s)?.[0] ?? ''
    const upcomingEventsData = eventData.match(/(?<=<hr \/>).+/s)?.[0] ?? ''
    ;[currentEvents, upcomingEvents] = await Promise.all([
        getEventsInformation(currentEventsData, 'Current'),
        getEventsInformation(upcomingEventsData, 'Upcoming')
    ])

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

/** Parses through event data from gbf.wiki and returns a JSON with important information for each event. */
export async function getEventsInformation(eventData: string, type: 'Current' | 'Upcoming'){
    const eventsTitles = [...new Set(eventData.match(/(?<=title="|<b>)[^<>]+?(?="|<\/b>)/g))]
    const eventsImgURLs = [...new Set(eventData.match(/<img.+?>/g))] ?? ['']

    const events: event[] = []
    const eventImagePromises: (Promise<Image>|undefined)[] = []
    eventsTitles.forEach((title, i) => {
        const eventImageURLs = eventsImgURLs.flatMap(URL => {
            if (URL.includes(title) && URL.includes('src=')) return [`https://gbf.wiki${URL.match(/(?<=src=").+?(?=")/)}`]
            else return []
        })
        
        const imagePromise = eventImageURLs.length > 0
            ? loadImage(eventImageURLs[Math.floor(Math.random()*eventImageURLs.length)])
            : undefined
        eventImagePromises.push(imagePromise)

        const thisEventData = eventData.match(new RegExp(`${title}.+?${eventsTitles[i+1]}|${title}.+`, 's'))![0] // All data for the event currently being parsed
        const eventEpochs = [...thisEventData.matchAll(/data-(?:start|end|time)="(\d+)"/g)].map(match => parseInt(match[1]))
        const [eventStart, eventEnd] = [...new Set(eventEpochs)].map(epoch => new Date(epoch * 1000))

        const monthInfo = thisEventData.match(/(?<=>)[^>]+(?:January|February|March|April|May|June|July|August|September|October|November|December)/)?.[0]
        const eventDuration = eventEpochs.length ? `${getSimpleDate(eventStart)} - ${getSimpleDate(eventEnd)}` : monthInfo
        
        events.push({
            type: type,
            title: decode(title),
            image: undefined,
            start: eventStart,
            end: eventEnd,
            duration: eventDuration!,
            elementAdvantage: getElementAdvantage(thisEventData)?.advantage,
            elementAdvantageImage: getElementAdvantage(thisEventData)?.image
        })
    })

    const eventImages = await Promise.all(eventImagePromises)
    events.forEach((event, i) => event.image = eventImages[i])

    return events.length ? events.slice(0, 6) : [{type: 'Upcoming', title: 'No events to display', duration: ''} as event]
}

/** Draws event banners and their durations. */
export function drawEvent(ctx: CanvasRenderingContext2D, event: event, textX: number, eventX: number, eventY: number){
    /** Calculates where text should be placed on the X-axis in order to be center aligned. */
    function centerTextX(text: string, center: number) { 
        return center - ctx.measureText(text).width / text.length * text.length / 2
    }

    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 3
    ctx.fillStyle = 'white'

    let eventDuration = getEventDuration(event)
    
    // Draw the event banner, or text if there is no banner image
    if (event.image){
        let bannerHeight = event.image.height * 11 / 15
        ctx.drawImage(event.image, eventX, eventY + (77 - bannerHeight) / 2, 330, bannerHeight)
    } else {
        wrapText({ctx: ctx, font: '25px Arial'}, event.title, textX, eventY + 43, 290, 30)
    }

    if (event.elementAdvantageImage){
        textX += 18
        ctx.drawImage(event.elementAdvantageImage, centerTextX(eventDuration, textX) - 35, eventY + 82)
    }

    ctx.strokeText(eventDuration, textX, eventY + 100)
    ctx.fillText(eventDuration, textX, eventY + 100)
}

/** Determines the element advantage and the element advantage image from the event data. */
export function getElementAdvantage(eventData: string) {
    const bossElement = eventData.match(/(Dark|Light|Water|Fire|Wind|Earth)(?=<\/span>\sBosses)/)?.[0]
    if (!bossElement) return

    switch (bossElement) {
        case 'Fire': return {advantage: `Water Advantage`, image: waterAdvantage}
        case 'Water': return {advantage: `Earth Advantage`, image: earthAdvantage}
        case 'Earth': return {advantage: `Wind Advantage`, image: windAdvantage}
        case 'Wind': return {advantage: `Fire Advantage`, image: fireAdvantage}
        case 'Light': return {advantage: `Dark Advantage`, image: darkAdvantage}
        case 'Dark': return {advantage: `Light Advantage`, image: lightAdvantage}
    }
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