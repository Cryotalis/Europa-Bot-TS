import { ContextMenuCommandBuilder, EmbedBuilder, MessageContextMenuCommandInteraction } from 'discord.js'
import { Translate } from '@google-cloud/translate/build/src/v2'
import { truncateText } from '../modules/string'
import { languageCodes } from '../data/variables'

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('translate text')
		.setType(3)
	,
	async execute(interaction: MessageContextMenuCommandInteraction) {
		const textInput = truncateText(interaction.targetMessage.content, 1024)
		if (!textInput) return interaction.reply({content: 'I could not find any text to translate.', ephemeral: true})
		await interaction.deferReply({ephemeral: true})
		const gTranslate = new Translate({credentials: {client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!, private_key: process.env.GOOGLE_PRIVATE_KEY!}})
		const userLocale = /-/.test(interaction.locale) ? interaction.locale.match(/.+(?=-)/)![0] : interaction.locale
		const outputLanguage = languageCodes.find(lang => lang.code === userLocale)!
		const [translation] = (await gTranslate.translate(textInput, outputLanguage.code))[1].data.translations
		const detectedSourceLanguage = languageCodes.find(lang => lang.code === translation.detectedSourceLanguage) ?? translation.detectedSourceLanguage
		
		const translateEmbed = new EmbedBuilder()
			.setColor('Blue')
			.addFields([{name: `Input (${detectedSourceLanguage!.name})`, value: textInput}])
			.addFields([{name: `Output (${outputLanguage.name})`, value: truncateText(translation.translatedText, 1024)}])
			.setFooter({text: 'Google Translate', iconURL: 'https://cdn.discordapp.com/attachments/647256353844232202/1011429868447211541/Google_Translate_icon.png'})
		
		interaction.editReply({embeds: [translateEmbed]})
	}
}