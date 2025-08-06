import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { compareTwoStrings } from 'string-similarity'
import axios from 'axios'
import { showMenu } from '../commandHelpers/menu.js'
import { crew, loadCrew } from '../commandHelpers/crew.js'

export const command = {
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
		
		let crews: crew[] | null = await axios.request(options).then(({data}) => crewName ? data.result : [data]).catch(() => null)

		if (!crews){
			crewEmbed.setFooter({text: 'https://gbfdata.com/', iconURL: 'https://pbs.twimg.com/profile_images/1484899620907991047/gypDoVwq_200x200.jpg'})
			interaction.editReply({embeds: [crewEmbed]})
			crews = await axios.get(`https://gbfdata.com/guild/search?q=${crewName ?? crewID}&is_fulltext=${crewName ? 1 : 0}`).then(({data}) => {
				const crewData = String(data.match(/(?<=\/thead>).+(?=<\/table)/s))
				const crewMatches = crewData.matchAll(/href=".+?guild\/(\d+)">\n(.+?)\n/gs)
				return [...crewMatches].map(crew => ({data: [{is_seed: '?', points: '?', gw_num: '?', rank: '?', name: crew[2]}], id: parseInt(crew[1])}))
			}).catch(() => null)
		}

		if (!crews) 			return interaction.editReply({content: 'Crew Search is currently unavailable. Please try again later.', embeds: []})
		if (!crews[0]?.data[0]) return interaction.editReply({content: `No crews were found for ${crewName ?? crewID}.`, embeds: []})
		if (crews.length === 1) return loadCrew(interaction, crews[0])

		crews.sort((a, b) => +a.data[0].rank - +b.data[0].rank)
		crews.sort((a, b) => compareTwoStrings(b.data[0].name, crewName!) - compareTwoStrings(a.data[0].name, crewName!))
		const formattedCrews = crews.map(crew => crew.data[0].name + (+crew.data[0].rank ? ' Rank ' + crew.data[0].rank : ` (${crew.id})`))

		const userChoice = await showMenu(interaction, crewName!, formattedCrews)
		if (userChoice === null) return

		loadCrew(interaction, crews[userChoice])
	}
}