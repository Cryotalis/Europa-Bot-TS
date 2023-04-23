import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { decode } from 'html-entities'
import { Image, createCanvas, loadImage } from 'canvas'
import { wrapText } from '../modules/image-functions'
import { dateDiff, timeToUnix } from '../modules/time-functions'
import axios from 'axios'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('events')
		.setDescription('Show current and upcoming events')
		.addBooleanOption(option => option.setName('embed').setDescription('Use the embedded message version of this command instead?'))
	,
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply()
		await axios.get('https://gbf.wiki/Main_Page').then(async ({data}) => {
			function getElementAdvantage(data: string) {
				if (/(Dark|Light|Water|Fire|Wind|Earth)(?=<\/span>\sBosses)/.test(data)) {// Check if there is a GW upcoming or ongoing GW with elemental advantage displayed
					const element = String(data.match(/(Dark|Light|Water|Fire|Wind|Earth)(?=<\/span>\sBosses)/)![0])
					let advantageURL = ''
					switch (element) {
						case 'Dark': advantageURL = 'https://gbf.wiki/images/thumb/3/3d/Status_LightAtkUp.png/25px-Status_LightAtkUp.png'; break
						case 'Light': advantageURL = 'https://gbf.wiki/images/thumb/a/a0/Status_DarkAtkUp.png/25px-Status_DarkAtkUp.png'; break
						case 'Water': advantageURL = 'https://gbf.wiki/images/thumb/4/44/Status_EarthAtkUp.png/25px-Status_EarthAtkUp.png'; break
						case 'Fire': advantageURL = 'https://gbf.wiki/images/thumb/0/08/Status_WaterAtkUp.png/25px-Status_WaterAtkUp.png'; break
						case 'Wind': advantageURL = 'https://gbf.wiki/images/thumb/7/77/Status_FireAtkUp.png/25px-Status_FireAtkUp.png'; break
						case 'Earth': advantageURL = 'https://gbf.wiki/images/thumb/4/4d/Status_WindAtkUp.png/25px-Status_WindAtkUp.png'; break
					}
					return {advantage: `${advantageURL.match(/Dark|Light|Water|Fire|Wind|Earth/)} Advantage`, image: loadImage(advantageURL)}
				}
			}

			interface event {title: string, image: Image | Promise<Image> | undefined, duration: string, elementAdvantage: string | undefined, elementAdvantageImage: Image | Promise<Image> | undefined}
			function getEventsInformation(data: string, titles: string[], imageURLs: RegExpMatchArray, current: Boolean){
				const events: event[] = []
				const now = new Date()
				titles.forEach((title, i) => {
					const eventImageURLs = imageURLs.flatMap(image => {
						if (image.includes(title) && image.includes('src=')){
							return [`https://gbf.wiki${image.match(/(?<=src=").+?(?=")/)}`]
						} else return []
					})

					const eventData = String(data.match(new RegExp(`${title}.+?${titles[i+1]}|${title}.+`))) // Data which contains the duration & element advantage
					const image = eventImageURLs.length > 1
						? loadImage(eventImageURLs[Math.floor(Math.random()*eventImageURLs.length)])
						: eventImageURLs.length > 0
							? loadImage(eventImageURLs[0])
							: undefined
					const eventStart = new Date(parseInt(String(eventData.match(/(?<=data-start=")\d+(?=")/))) * 1000)
					const eventEnd = new Date(parseInt(String(eventData.match(/(?<=data-end=")\d+(?=")/))) * 1000)
					const duration = current
						? now < eventStart 
							? `Starts in ${dateDiff(now, eventStart, true)}` 
							: `Ends in ${dateDiff(now, eventEnd, true)}`
						: String(eventData.match(/(?:In\s)?(?:January|February|March|April|June|July|August|September|October|November|December)(?:\s\d.+?(?=<))?/))
					
					events.push({
						title: title,
						image: image,
						duration: now > eventEnd ? 'Event has ended.' : duration,
						elementAdvantage: getElementAdvantage(eventData)?.advantage,
						elementAdvantageImage: getElementAdvantage(eventData)?.image
					})
				})
				return events.length > 0 ? events : [{title: 'No Events to display', image: undefined, duration: '', elementAdvantage: undefined, elementAdvantageImage: undefined}]
			}

			// Current Events Information
			const currentEventsData = String(data.match(/(?<=<td\sstyle="vertical-align:\stop;\stext-align:\scenter;">).+?(?=<\/td>)/s))
			const currentEventsTitles = [...new Set(currentEventsData.match(/(?<=title=").+?(?=")/g))]
			const currentEventsImgURLs = currentEventsData.match(/<img.+?>/g) ?? ['']
			const currentEvents = getEventsInformation(currentEventsData, currentEventsTitles, currentEventsImgURLs, true)

			// Upcoming Events Information
			const upcomingEventsData = String(data.match(/(?<=<td\sstyle="vertical-align:\stop;">).+?(?=<\/td>)/gs)[1])
			const upcomingEventsTitles = [...new Set(upcomingEventsData.match(/(?<=title=").+?(?=")/g))]
			const upcomingEventsImgURLs = upcomingEventsData.match(/<img.+?>/g) ?? ['']
			const upcomingEvents = getEventsInformation(upcomingEventsData, upcomingEventsTitles, upcomingEventsImgURLs, false)

			while (upcomingEvents.length > 6) upcomingEvents.pop()

			if (interaction.options.getBoolean('embed')){
				const eventEmbed = new EmbedBuilder()
					.setTitle('Events')
					.setDescription('**__CURRENT AND UPCOMING EVENTS__**')
					.setURL('https://gbf.wiki/Main_Page')
					.setColor('Blue')
					.setFooter({text: 'https://gbf.wiki/Main_Page', iconURL: 'https://i.imgur.com/MN6TIHj.png'})
				
				currentEvents.forEach(event => eventEmbed.addFields([{name: decode(event.title), value: `${event.duration} (<t:${Math.ceil((new Date().getTime() + timeToUnix(event.duration))/1000)}:f>)`}]))
				upcomingEvents.forEach(event => eventEmbed.addFields([{name: decode(event.title) + (event.elementAdvantage ? ` (${event.elementAdvantage})` : ''), value: event.duration}]))
				return interaction.editReply({embeds: [eventEmbed]})
			}

			const currentEventsImages = await Promise.all(currentEvents.map(event => event.image))
			const upcomingEventsImages = await Promise.all(upcomingEvents.map(event => event.image))
			currentEvents.forEach(async (event, i) => {
				event.image = currentEventsImages[i]
				event.elementAdvantageImage = await Promise.resolve(event.elementAdvantageImage)
			})
			upcomingEvents.forEach(async (event, i) => {
				event.image = upcomingEventsImages[i]
				event.elementAdvantageImage = await Promise.resolve(event.elementAdvantageImage)
			})

			// Helper functions
			function centerText(text: string, center: number, fontsize: number) { // Calculates where text should be placed on the X-axis in order to be center aligned
				ctx.font = `${fontsize}px Arial`
				const endX = center - ctx.measureText(text).width / text.length * text.length / 2
				return endX
			}
			function drawEvent(event: event, textX: number, eventX: number, eventY: number){
				ctx.textAlign = 'center'
				ctx.strokeStyle = 'black'
				ctx.lineWidth = 3
				ctx.fillStyle = 'white'
				
				// Draw the event banner, or text if there is no banner image
				if (event.image) ctx.drawImage(event.image as Image, eventX, eventY, 330, 78)
				else wrapText({ctx: ctx, font: '25px Arial'}, event.title, textX, eventY + 43, 290, 30)

				if (event.elementAdvantage){
					textX += 18
					ctx.drawImage(event.elementAdvantageImage as Image, centerText(event.duration, textX, 20) - 35, eventY + 82)
				}
				ctx.font = '20px Arial'
				ctx.strokeText(event.duration, textX, eventY + 100)
				ctx.fillText(event.duration, textX, eventY + 100)
			}

			// Create the events image
			const canvasHeight = 200 + Math.ceil(currentEvents.length / 2) * 110 + Math.ceil(upcomingEvents.length / 2) * 110
			const canvas = createCanvas(700, canvasHeight)
			const ctx = canvas.getContext('2d')

			const [background, currentEventsText, upcomingEventsText] = await Promise.all([
				loadImage('https://i.imgur.com/6zQvrJT.png'), // Normal Template
				// loadImage('https://media.discordapp.net/attachments/647256353844232202/1033487287293579415/EventsHalloweenTemplate.png'), // Halloween Template
				loadImage('https://i.imgur.com/8z0eQIk.png'),
				loadImage('https://i.imgur.com/dSzz0to.png')
			])

			ctx.drawImage(background, 0, 0, 700, canvasHeight)
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
			return interaction.editReply({files: [attachment], allowedMentions: {repliedUser: false}})
		}).catch(error => {
			if (error) {
				console.error(error)
				interaction.editReply({content: 'Events data is temporarily unavailable. Please try again later.', embeds: []})
			}
		})
	}
}