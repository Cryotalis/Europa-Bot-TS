import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { findLastWord } from '../modules/string.js'
import { dateToString, findTimeZone, dateStringToUnix } from '../modules/time.js'

export const command = {
	data: new SlashCommandBuilder()
		.setName('time')
		.setDescription('Show the current time in Japan')
		.addStringOption(option => option.setName('time').setDescription("The date/time you'd like to convert from"))
		.addStringOption(option => option.setName('timezone').setDescription("The timezone you'd like to convert to"))
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const timeInput = interaction.options.getString('time')!
		if (!timeInput) return await interaction.reply(`It is currently \`${dateToString(new Date(), 'JST')}\` in Japan.`)
		
		const timeZone1 = findTimeZone(findLastWord(timeInput)).name
		const timeZone2 = interaction.options.getString('timezone')
		const unix = dateStringToUnix(timeInput)!
		const time1 = `\`${dateToString(new Date(unix), timeZone1, true)}\``
		const time2 = timeZone2 ? `\`${dateToString(new Date(unix), timeZone2, true)}\`` : `<t:${unix/1000}>`

		await interaction.reply(`${time1} is ${time2}`)
	}
}