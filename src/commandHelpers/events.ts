import { waterAdvantage, earthAdvantage, windAdvantage, fireAdvantage, darkAdvantage, lightAdvantage, eventsBackgroundTop, eventsBackgroundMiddle, eventsBackgroundBottom, upcomingEventsText } from '../data/assets.js'
import { Canvas, CanvasRenderingContext2D, Image, createCanvas, loadImage } from 'canvas'
import { dateDiff, getSimpleDate, parseOffset } from './time.js'
import { browser, client, fontFallBacks } from '../bot.js'
import { capFirstLetter} from './string.js'
import { wrapText } from './image.js'
import md5 from 'md5'
import { EmbedBuilder, GuildScheduledEvent, GuildScheduledEventCreateOptions, GuildScheduledEventEditOptions, GuildScheduledEventStatus, TextChannel } from 'discord.js'
import { decode } from 'html-entities'
import { eventReminder, recurringEvents } from '../data/events.js'
import { database } from '../data/database.js'
import { botID } from '../config.js'

export interface event {
    title: string
    id: string
    type: string
    start: Date
    end: Date
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
export let granblueEvents: event[] = []
export let eventsTemplate: Canvas | undefined

/**
 * Loads event information and event template. The template includes upcoming events and leaves a blank space for current events.
 * @param retries - How many times to retry if events cannot be loaded
 */
export async function loadEvents(retries: number) {
    if (retries < 0) return

    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({'User-Agent': 'Europa Bot'})

    const params = {
        title: 'Special:CargoExport',
        tables: 'event_history',
        fields: 'event_history.name, event_history._ID, event_history.time_known, event_history.utc_start,' + 
                'event_history.utc_end, event_history.wiki_page, event_history.image, event_history.element',
        'order by': 'event_history.utc_start DESC',
        limit: '20',
        format: 'json'
    }
    const url = new URL('https://gbf.wiki/index.php')
    url.search = new URLSearchParams(params).toString()

    const eventsResponse = await page.goto(url.href, { waitUntil: 'networkidle0' })
    if (!eventsResponse?.ok()) return setTimeout(() => loadEvents(--retries), 90000)

    const rawEvents: rawEvent[] = await eventsResponse.json()
    rawEvents.sort((a, b) => a['utc start'] - b['utc start'])

    const maintResponse = await page.goto('https://gbf.wiki/Template:MainPage/Notice', { waitUntil: 'domcontentloaded' })
    const maintHTML = await maintResponse?.text()
    if (maintResponse?.ok() && maintHTML && /The game will undergo maintenance/i.test(maintHTML)) {
        const [ _, maintStart, maintEnd ] = maintHTML
            .match(/data-start="(\d+)" data-end="(\d+)" data-text-start="The game will undergo maintenance/)!
            .map((match: string) => parseInt(match))

        if (maintStart && maintEnd && (maintStart * 1000) > new Date().getTime()) {
            rawEvents.unshift({
                name: 'Maintenance',
                _ID: 0,
                'time known': 'yes',
                'utc start': maintStart,
                'utc end': maintEnd,
                'wiki page': null,
                image: null,
                element: null
            })
        }
    }

    await page.close()

    granblueEvents = await processEvents(rawEvents)
    currentEvents = granblueEvents.filter(event => event.type === 'Current')
    upcomingEvents = granblueEvents.filter(event => event.type === 'Upcoming')

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
        if (i % 2 === 0) { // Draw events in the left column
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
export async function processEvents(events: rawEvent[]): Promise<event[]> {
    const now = new Date()
    const currentStart = (now.getTime() / 1000) - (3 * 60 * 60)
    const currentEnd = (now.getTime() / 1000) + (36 * 60 * 60)
    const filteredEvents = events.filter(event => {
        if (event['utc end'] === 0) return true
        return event['utc end'] > currentStart && event['utc end'] < (now.getTime() / 1000) + (90 * 24 * 60 * 60)
    })

    const processedEvents = filteredEvents.slice(0, 10).map(async event => {
        const eventStart = new Date(event['utc start'] * 1000)
        const eventEnd = new Date(event['utc end'] * 1000)
        const eventMonth = new Date((event['utc start'] + (now.getTimezoneOffset() + parseOffset('UTC +9')) * 60) * 1000).toLocaleDateString('en-US', {month: 'long'})
        let imgName, imgHash, imgURL = null

        if (event.name === 'Maintenance') {
            imgURL = 'https://raw.githubusercontent.com/Cryotalis/Europa-Bot-TS/main/assets/Maintenance%20Event.png'
        } else if (event.image) {
            imgName = decode(capFirstLetter(event.image).replace(/ /g, '_').replace(/__/g, '_'))
            imgHash = md5(imgName)
            imgURL = `https://gbf.wiki/images/${imgHash.charAt(0)}/${imgHash.slice(0,2)}/${encodeURI(imgName)}`
        }

        return {
            title: decode(event.name),
            id: String(event._ID),
            type: event['utc start'] < currentEnd ? 'Current' : 'Upcoming',
            start: eventStart,
            end: eventEnd,
            duration: event['time known'] === 'yes' ? `${getSimpleDate(eventStart)} - ${getSimpleDate(eventEnd)}` : `In ${eventMonth}`,
            wikiURL: event['wiki page'] && `https://gbf.wiki/${decode(event['wiki page'].replace(/ /g, '_'))}`,
            image: imgURL ? await loadImage(imgURL) : null,
            imageURL: imgURL,
            elementAdvantage: getElementAdvantage(event.element).advantage,
            elementAdvantageImg: getElementAdvantage(event.element).image
        }
    })

    return Promise.all(processedEvents)
}

/** Determines the element advantage and the element advantage image from the event data. */
export function getElementAdvantage(element: string | null) {
    switch (element) {
        case 'fire': return {advantage: `<:WaterAdvantage:1225922220157833277> Water Advantage`, image: waterAdvantage}
        case 'water': return {advantage: `<:EarthAdvantage:1225922224154742957> Earth Advantage`, image: earthAdvantage}
        case 'earth': return {advantage: `<:WindAdvantage:1225922221617319976> Wind Advantage`, image: windAdvantage}
        case 'wind': return {advantage: `<:FireAdvantage:1225922225492856852> Fire Advantage`, image: fireAdvantage}
        case 'light': return {advantage: `<:DarkAdvantage:1225922222871412887> Dark Advantage`, image: darkAdvantage}
        case 'dark': return {advantage: `<:LightAdvantage:1225922226503811153> Light Advantage`, image: lightAdvantage}
        default: return {advantage: null, image: null}
    }
}

/** Draws event banners and their durations. */
export function drawEvent(ctx: CanvasRenderingContext2D, event: event, textX: number, eventX: number, eventY: number) {
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
    if (event.image) {
        let bannerHeight = event.image.height * 330 / event.image.width
        ctx.drawImage(event.image, eventX, eventY + (77 - bannerHeight) / 2, 330, bannerHeight)
    } else {
        wrapText({ctx: ctx, font: '25px Default'}, event.title, textX, eventY + 43, 290, 30)
    }

    if (event.elementAdvantageImg) {
        textX += 18
        ctx.drawImage(event.elementAdvantageImg, centerTextX(eventDuration, textX) - 35, eventY + 82)
    }

    ctx.strokeText(eventDuration, textX, eventY + 100)
    ctx.fillText(eventDuration, textX, eventY + 100)
}

/**
 * Takes an event and outputs the correct duration string for the event.
 */
export function getEventDuration(event: event) {
    if (event.type === 'Current') {
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
 * Creates a list of Discord scheduled events according to the in-game events
 */
async function makeScheduledEvents() {
    if (!granblueEvents.length) return

    const threeMinsLater = new Date(new Date().valueOf() + 3 * 60000)
    const scheduledEvents: GuildScheduledEventCreateOptions[] = granblueEvents.map(event => {
        if (!event.start || !event.end || new Date() >= event.end || event.duration.startsWith('In')) return {} as GuildScheduledEventCreateOptions
        
        // Resize the image to better fit Discord's event image frame
        let canvas
        if (event.image) {
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
                            event.imageURL && `[Event Image](${event.imageURL})`
                         ].filter(e => e).join(' | '),
            image: canvas?.toBuffer(),
            scheduledStartTime: event.start < new Date() ? threeMinsLater : event.start, // If the in-game event already started, set the discord event to start in 3 minutes
            scheduledEndTime: event.end,
            privacyLevel: 2, // Only Guild Members can see the event (this is currently the only valid value)
            entityType: 3, // 3 = External event
            entityMetadata: {location: event.elementAdvantage ?? 'No Element Advantage'}
        }
    }).filter(event => event.name)

    return scheduledEvents
}

/**
 * Relays scheduled GBF events to each subscribed server
 */
export async function relayEvents() {
    const scheduledEvents = await makeScheduledEvents()
    if (!scheduledEvents) return setTimeout(() => relayEvents(), 60000)

    const subscribedServers = database.servers.filter(server => server.get('events') && server.get('events') !== '[]')
    subscribedServers.forEach(async server => {
        const eventsManager = (await client.guilds.fetch(server.get('guildID'))).scheduledEvents
        const serverEvents = await eventsManager.fetch()

        const relayEvents: string[] = JSON.parse(server.get('events') || '[]')
        
        let filteredEvents: GuildScheduledEventCreateOptions[]
        switch (relayEvents[0]) {
            case 'All': filteredEvents = [...scheduledEvents]; break
            case 'All Recurring': 
                filteredEvents = scheduledEvents.filter(({name}) => {
                    return recurringEvents.some(eventName => name.includes(eventName))
                })
                break
            default:
                filteredEvents = scheduledEvents.filter(({name}) => {
                    return relayEvents.some(eventName => name.includes(eventName))
                })
        }

        const maintEvent = scheduledEvents.find(({name}) => name === 'Maintenance')
        if (maintEvent && !filteredEvents.includes(maintEvent)) filteredEvents.unshift(maintEvent)

        const filteredEventNames = filteredEvents.map(e => e.name)
        const existingEvents: GuildScheduledEvent<GuildScheduledEventStatus>[] = []
        const obsoleteEvents: GuildScheduledEvent<GuildScheduledEventStatus>[] = []

        serverEvents.filter(({creatorId, scheduledEndAt}) => {
            return (creatorId === botID) && (new Date() < (scheduledEndAt ?? new Date(0)))
        }).forEach(event => {
            filteredEventNames.includes(event.name)
                ? existingEvents.push(event)
                : obsoleteEvents.push(event)
        })

        filteredEvents.forEach(event => {
            let existingEvent = existingEvents.find(({name}) => name === event.name)

            // Prefer editing an obsolete event over creating a new one
            if (existingEvent) {
                // Remove event from array for future loops, prevents editing the same event twice (mostly for recurring events)
                existingEvents.splice(existingEvents.findIndex(({name}) => name == existingEvent!.name), 1)
            } else if (obsoleteEvents.length && !recurringEvents.includes(event.name)) { // Don't overwrite recurring events
                existingEvent = obsoleteEvents.shift()!
            } else {
                return eventsManager.create(event)
            }

            const editOptions: GuildScheduledEventEditOptions<GuildScheduledEventStatus, any> = {}
            const eventTimeChanged = Boolean(
                existingEvent.scheduledStartTimestamp !== new Date(event.scheduledStartTime).getTime() ||
                existingEvent.scheduledEndTimestamp !== new Date(event.scheduledEndTime!).getTime()
            )

            if (existingEvent.name !== event.name) editOptions.name = event.name
            if (existingEvent.entityMetadata !== event.entityMetadata) editOptions.entityMetadata = event.entityMetadata
            if (existingEvent.description !== event.description) {
                editOptions.description = event.description
                editOptions.image = event.image
            }
            if (eventTimeChanged && existingEvent.scheduledStartAt! > new Date()) {
                editOptions.scheduledStartTime = event.scheduledStartTime
                editOptions.scheduledEndTime = event.scheduledEndTime
            }

            if (Object.keys(editOptions).length) existingEvent.edit(editOptions)
        })

        // Delete any remaining obsolete events
        obsoleteEvents.filter(event => event.name !== 'Maintenance').forEach(event => event.delete())
    })
}

/**
 * Sends reminders to subscribed servers and users when GBF events are ending soon
 */
export async function sendEventReminders() {
    if (!granblueEvents.length) return setTimeout(() => sendEventReminders(), 60000)
    const servers = database.servers.filter(server => server.get('reminders') && server.get('reminders') !== '[]')
    const users = database.users.filter(user => user.get('reminders') && user.get('reminders') !== '[]')

    function findReminder(reminders: eventReminder[], event: event) {
        const isRecurringEvent = recurringEvents.some(eventName => event.title.includes(eventName))
        switch (reminders[0].eventName) {
            case 'All':             return reminders[0]
            case 'All Recurring':   return isRecurringEvent ? reminders[0] : undefined
            default:                return reminders.find(({eventName}) => event.title.includes(eventName))
        }
    }

    function makeReminderEmbed(event: event) {
        const reminderEmbed = new EmbedBuilder()
            .setAuthor({name: 'Event Reminder'})
            .setTitle(`${event.title} is Ending Soon!`)
            .setDescription(`Event Ends <t:${event.end.getTime() / 1000}:R>`)
            .setImage(event.imageURL)
            .setURL(event.wikiURL)
            .setColor('Blue')

        return reminderEmbed
    }

    for (const server of servers) {
        const reminderGuild = await client.guilds.fetch(server.get('guildID'))
        const reminders: eventReminder[] = JSON.parse(server.get('reminders') || '[]')
        const receivedReminders: {title: string, end: string}[] = JSON.parse(server.get('receivedReminders') || '[]')
        const filteredEvents = granblueEvents.filter(event =>
            receivedReminders.every(e => e.title !== event.title) && event.end > new Date()
        )

        for (const event of filteredEvents) {
            const reminder = findReminder(reminders, event)
            
            if (reminder && (new Date()).getTime() >= event.end.getTime() - reminder.time) {
                const reminderChannel = await reminderGuild.channels.fetch(reminder.channelID!) as TextChannel
                await reminderChannel.send({
                    content: reminder.roleID && `## <@&${reminder.roleID}>`, 
                    allowedMentions: reminder.roleID ? {roles: [reminder.roleID]} : undefined,
                    embeds: [makeReminderEmbed(event)]
                })

                receivedReminders.push({title: event.title, end: event.end.getTime().toString()})
            }
        }
        
        server.set(
            'receivedReminders',
            JSON.stringify(receivedReminders.filter(({end}) => new Date().getTime() < parseInt(end)))
        )
        server.save()
    }

    for (const user of users) {
        const reminders: eventReminder[] = JSON.parse(user.get('reminders') || '[]')
        const receivedReminders: {title: string, end: string}[] = JSON.parse(user.get('receivedReminders') || '[]')
        const filteredEvents = granblueEvents.filter(event => 
            receivedReminders.every(e => e.title !== event.title) && event.end > new Date()
        )

        for (const event of filteredEvents) {
            const reminder = findReminder(reminders, event)

            if (reminder && (new Date()).getTime() >= event.end.getTime() - reminder.time) {
                const targetUser = await client.users.fetch(user.get('userID'))
                await targetUser.send({embeds: [makeReminderEmbed(event)]})

                receivedReminders.push({title: event.title, end: event.end.getTime().toString()})
            }
        }
        
        user.set(
            'receivedReminders',
            JSON.stringify(receivedReminders.filter(({end}) => new Date().getTime() < parseInt(end)))
        )
        user.save()
    }
}