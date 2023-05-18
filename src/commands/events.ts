import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { createCanvas } from 'canvas'
import { timeToUnix } from '../modules/time'
import { getEventsInformation, drawEvent } from '../modules/events'
import { currentEventsText, eventsBackground, upcomingEventsText } from '../modules/assets'
import axios from 'axios'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('events')
		.setDescription('Show current and upcoming events')
		.addBooleanOption(option => option.setName('embed').setDescription('Use the embedded message version of this command instead?'))
	,
	async execute(interaction: ChatInputCommandInteraction) {
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

		if (interaction.options.getBoolean('embed')){ // If requested by the user, show the embedded message output instead
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
				drawEvent(ctx, event, lastEvent ? 350 : 190, X, Y)
			} else { // Draw events in the right column
				X = 345
				drawEvent(ctx, event, 510, X, Y)
			}
		})

		ctx.drawImage(upcomingEventsText, 165, Y + 110)
		Y += 150
		
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

		const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `Events.png`})
		interaction.editReply({files: [attachment]})
	}
}