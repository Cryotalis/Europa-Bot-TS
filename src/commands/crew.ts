import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { compareTwoStrings } from 'string-similarity'
import { showMenu } from '../modules/menu'
import { crew, loadCrew } from '../modules/crew'
import axios from 'axios'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('crew')
		.setDescription('Search for a crew and display the crew page')
		.addSubcommand(subcommand =>
			subcommand
				.setName('name')
				.setDescription('Search for a crew by its name')
				.addStringOption(option => option.setName('name').setDescription("The name of the crew you're looking for").setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('id')
				.setDescription('Search for a crew by its ID')		
				.addNumberOption(option => option.setName('id').setDescription("The ID of the crew you're looking for").setRequired(true))
		)
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const crewName = interaction.options.getString('name')
		const crewID = interaction.options.getNumber('id')?.toString()

		const crewEmbed = new EmbedBuilder()
			.setTitle(`Searching for ${crewName ?? crewID} <a:loading:763160594974244874>`)
			.setColor('Blue')
			.setAuthor({name: 'Crew Search', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})
			.setFooter({text: 'http://gbf.gw.lt/gw-guild-searcher/', iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})
		
		await interaction.reply({embeds: [crewEmbed]})

		const options = crewName 
			? {
				method: 'POST',
				url: 'http://gbf.gw.lt/gw-guild-searcher/search',
				data: `{"search":"${crewName}"}`
			}
			: {
				method: 'GET',
				url: `http://gbf.gw.lt/gw-guild-searcher/info/${crewID}`
			}
		
		const crews: crew[] = await axios.request(options).then(({data}) => crewName ? data.result : [data]).catch((error) => {
			console.error(error)
			return interaction.reply({content: 'Crew Search is currently unavailable. Please try again later.'})
		})

		if (!crews[0]?.data[0]) return interaction.editReply({content: `No crews were found for ${crewName ?? crewID}.`, embeds: []})
		if (crews.length === 1) return loadCrew(interaction, crews[0])

		crews.sort((a, b) => a.data[0].rank - b.data[0].rank)
		crews.sort((a, b) => compareTwoStrings(b.data[0].name, crewName!) - compareTwoStrings(a.data[0].name, crewName!))
		const formattedCrews = crews.map(crew => `${crew.data[0].name} Rank ${crew.data[0].rank}`)

		const userChoice = await showMenu(interaction, crewName!, formattedCrews)
		if (!userChoice) return

		const targetCrew = crews.find(crew => `${crew.data[0].name} Rank ${crew.data[0].rank}` === String(userChoice.match(/(?<= ).+/)))!
		loadCrew(interaction, targetCrew)
	}
}