import { CommandInteraction, MessageEmbed } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription("Show links to Europa's website and Support Discord Server")
	,
	async execute(interaction: CommandInteraction) {
		const helpEmbed = new MessageEmbed()
			.setColor('BLUE')
			.setTitle('Europa Command List')
			.setDescription('The complete list of commands for Europa can be found here: [https://cryotalis.github.io/Europa](https://cryotalis.github.io/Europa)')
			.setThumbnail('https://i.imgur.com/f0MfwDw.png')
			.addField('\u200b','If you want to talk to my creator about anything, please join the support server here: [https://discord.gg/YtwzVSp](https://discord.gg/YtwzVSp)')
    	return interaction.reply({embeds: [helpEmbed]})
	}
}