import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { decode } from 'html-entities'
import { Image, createCanvas, loadImage } from 'canvas'
import { wrapText } from '../modules/image-functions'
import { dateDiff, getSimpleDate, timeToUnix } from '../modules/time-functions'
import { currentEventsText, darkAdvantage, earthAdvantage, eventsBackground, fireAdvantage, lightAdvantage, upcomingEventsText, waterAdvantage, windAdvantage } from '../modules/assets'
import axios from 'axios'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('events')
		.setDescription('Show current and upcoming events')
		.addBooleanOption(option => option.setName('embed').setDescription('Use the embedded message version of this command instead?'))
	,
	async execute(interaction: ChatInputCommandInteraction) {
		interface event {title: string, image: Image | undefined, duration: string, elementAdvantage: string | undefined, elementAdvantageImage: Image | undefined}
		/** Parses through event data from gbf.wiki and returns a JSON with important information for each event. */
		async function getEventsInformation(eventData: string, type: 'Current' | 'Upcoming'){
			const eventsTitles = [...new Set(eventData.match(/(?<=title=").+?(?=")/g))]
			const eventsImgURLs = [...new Set(eventData.match(/<img.+?>/g))] ?? ['']

			const events: event[] = []
			const eventImagePromises: (Promise<Image>|undefined)[] = []
			const now = new Date()
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

				let eventDuration: string
				if (type === 'Current'){
					eventDuration = now < eventStart
						? `Starts in ${dateDiff(now, eventStart, true)}`
						: now < eventEnd
							? `Ends in ${dateDiff(now, eventEnd, true)}`
							: 'Event has ended.'
				} else {
					const inMonth = thisEventData.match(/(?:In\s)(?:January|February|March|April|May|June|July|August|September|October|November|December)/)?.[0]
					eventDuration = inMonth ?? `${getSimpleDate(eventStart)} - ${getSimpleDate(eventEnd)}`
				}
				
				events.push({
					title: decode(title),
					image: undefined,
					duration: eventDuration,
					elementAdvantage: getElementAdvantage(thisEventData)?.advantage,
					elementAdvantageImage: getElementAdvantage(thisEventData)?.image
				})
			})

			const eventImages = await Promise.all(eventImagePromises)
			events.forEach((event, i) => event.image = eventImages[i])

			return events.length ? events.slice(0, 6) : [{title: 'No events to display', image: undefined, duration: '', elementAdvantage: undefined, elementAdvantageImage: undefined}]
		}

		/** Draws event banners and their durations. */
		function drawEvent(event: event, textX: number, eventX: number, eventY: number){
			/** Calculates where text should be placed on the X-axis in order to be center aligned. */
			function centerTextX(text: string, center: number) { 
				return center - ctx.measureText(text).width / text.length * text.length / 2
			}

			ctx.font = '20px Arial'
			ctx.textAlign = 'center'
			ctx.strokeStyle = 'black'
			ctx.lineWidth = 3
			ctx.fillStyle = 'white'
			
			// Draw the event banner, or text if there is no banner image
			if (event.image) ctx.drawImage(event.image, eventX, eventY, 330, 78)
			else wrapText({ctx: ctx, font: '25px Arial'}, event.title, textX, eventY + 43, 290, 30)

			if (event.elementAdvantageImage){
				textX += 18
				ctx.drawImage(event.elementAdvantageImage, centerTextX(event.duration, textX) - 35, eventY + 82)
			}

			ctx.strokeText(event.duration, textX, eventY + 100)
			ctx.fillText(event.duration, textX, eventY + 100)
		}

		/** Determines the element advantage and the element advantage image from the event data. */
		function getElementAdvantage(eventData: string) {
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

		await interaction.deferReply()
		let {data}: {data: string} = await axios.get('https://gbf.wiki/Template:MainPageEvents').catch(error => {
			interaction.editReply({content: 'Events data is temporarily unavailable. Please try again later.', embeds: []})
			return {data: ''}
		})

		if (!data) return
		
		const eventData = data.match(/vertical-align: top.+<!--/s)!.toString()

		const currentEventsData = eventData.match(/.+(?=<hr \/>)/s)?.[0] ?? ''
		const upcomingEventsData = eventData.match(/(?<=<hr \/>).+/s)?.[0] ?? ''
		const [currentEvents, upcomingEvents] = await Promise.all([
			getEventsInformation(currentEventsData, 'Current'),
			getEventsInformation(upcomingEventsData, 'Upcoming')
		])

		if (interaction.options.getBoolean('embed')){
			const eventEmbed = new EmbedBuilder()
				.setTitle('Events')
				.setDescription('**__CURRENT AND UPCOMING EVENTS__**')
				.setURL('https://gbf.wiki/Main_Page')
				.setColor('Blue')
				.setFooter({text: 'https://gbf.wiki/Main_Page', iconURL: 'https://i.imgur.com/MN6TIHj.png'})
			
			currentEvents.forEach(event => eventEmbed.addFields([{name: event.title, value: `${event.duration} (<t:${Math.ceil((new Date().getTime() + timeToUnix(event.duration))/1000)}:f>)`}]))
			upcomingEvents.forEach(event => eventEmbed.addFields([{name: event.title + (event.elementAdvantage ? ` (${event.elementAdvantage})` : ''), value: event.duration}]))
			return interaction.editReply({embeds: [eventEmbed]})
		}

		// Create the events image
		const canvasHeight = 200 + Math.ceil(currentEvents.length / 2) * 110 + Math.ceil(upcomingEvents.length / 2) * 110
		const canvas = createCanvas(700, canvasHeight)
		const ctx = canvas.getContext('2d')

		ctx.drawImage(eventsBackground, 0, 0, 700, canvasHeight)
		ctx.drawImage(currentEventsText, 170, 65)

		let X = 25, Y = 120 // Starting position for event banners
		currentEvents.forEach((event, i) => {
			if (i % 2 === 0){ // Draw events in the left column
				const lastEvent = Boolean(i + 1 === currentEvents.length)
				X = lastEvent ? 185 : 25 // Center the event if it's the last one
				Y += i ? 110 : 0 // Only add to Y after the first event
				drawEvent(event, lastEvent ? 350 : 190, X, Y)
			} else { // Draw events in the right column
				X = 345
				drawEvent(event, 510, X, Y)
			}
		})

		ctx.drawImage(upcomingEventsText, 165, Y + 110)
		Y += 150
		
		upcomingEvents.forEach((event, i) => {
			if (i % 2 === 0){ // Draw events in the left column
				const lastEvent = Boolean(i + 1 === upcomingEvents.length)
				X = lastEvent ? 185 : 25 // Center the event if it's the last one
				Y += i ? 110 : 0 // Only add to Y after the first event
				drawEvent(event, lastEvent ? 350 : 190, X, Y)
			} else { // Draw events in the right column
				X = 345
				drawEvent(event, 510, X, Y)
			}
		})

		const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `Events.png`})
		interaction.editReply({files: [attachment]})
	}
}