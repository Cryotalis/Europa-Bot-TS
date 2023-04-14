import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription("Show links to Europa's website and Support Discord Server")
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const helpEmbed = new EmbedBuilder()
			.setColor('Blue')
			.setTitle('Europa Command List')
			.setDescription('The complete list of commands for Europa can be found here: [https://cryotalis.github.io/Europa](https://cryotalis.github.io/Europa)')
			.setThumbnail('https://i.imgur.com/f0MfwDw.png')
			.addFields([{name: '\u200b', value: 'If you want to talk to my creator about anything, please join the support server here: [https://discord.gg/YtwzVSp](https://discord.gg/YtwzVSp)'}])
    	return interaction.reply({embeds: [helpEmbed]})
	}
}