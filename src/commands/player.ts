import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { data, jsessionID } from '../bot'
import { compareTwoStrings } from 'string-similarity'
import { showMenu } from '../modules/menu'
import axios from 'axios'
import urlencode from 'urlencode'
import { loadProfile } from '../modules/player'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('player')
		.setDescription('Search for a player and display their player profile page')
		.addSubcommand(subcommand =>
			subcommand
				.setName('name')
				.setDescription('Search for a player by their name')
				.addStringOption(option => option.setName('name').setDescription("The name of the player you're looking for").setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('id')
				.setDescription('Search for a player by their ID')		
				.addNumberOption(option => option.setName('id').setDescription("The ID of the player you're looking for").setRequired(true))
		)
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const playerName = interaction.options.getString('name')!
		const playerID = interaction.options.getNumber('id')?.toString()

		await interaction.deferReply()

		if (!data) return interaction.editReply('Unable to connect to database. Please try again in a few seconds.')

		if (playerID) return loadProfile(interaction, playerID)

		const searchEmbed = new EmbedBuilder()
			.setTitle(`Searching for "${playerName}" <a:loading:763160594974244874>`)
			.setColor('Blue')
			.setAuthor({name: 'Player Search', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})
			.setFooter({text: 'http://info.gbfteamraid.fun/web/about', iconURL: 'http://info.gbfteamraid.fun/view/image/icon.png'})

		await interaction.editReply({embeds: [searchEmbed]})

		interface player {level: string, name: string, userid: string}
		const options = { // https://info.gbfteamraid.fun version
			method: 'POST',
			url: 'https://info.gbfteamraid.fun/web/userrank',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
				Cookie: `JSESSIONID=${jsessionID}`
			},
			data: {method: 'getUserrank', params: `{"username":"${playerName}"}`}
		}
		
		let players = await axios.request(options).then(({data: {result}}) => result as player[]).catch(() => undefined) 
		
		if (!players){ // Try searching https://gbfdata.com if teamraid is not available
			searchEmbed.setFooter({text: 'https://gbfdata.com/', iconURL: 'https://gbfdata.com/favicon.ico'})
			interaction.editReply({embeds: [searchEmbed]})
			players = await axios.get(`https://gbfdata.com/user/search?q=${urlencode(playerName)}&is_fulltext=1`).then(({data}) => {
				const playerData = String(data.match(/(?<=\/thead>).+(?=<\/table)/s))
				const playerMatches = playerData.matchAll(/href=".+?(\d+)">\n(.+?)\n<.+?"num">(\d+)/gs)
				return [...playerMatches].map(player => ({userid: player[1], name: player[2], level: player[3]}))
			}).catch(() => undefined)
		}

		if (!players) return interaction.editReply({content: 'Player search is currently unavailable. Please try again later.', embeds: []})
		if (!players.length) return interaction.editReply({content: 'No players were found.', embeds: []})
		if (players.length === 1) return loadProfile(interaction, players[0].userid)

		players.sort((a, b) => parseInt(b.level) - parseInt(a.level))
		players.sort((a, b) => compareTwoStrings(b.name, playerName) - compareTwoStrings(a.name, playerName))
		const formattedPlayers = players.map(player => `${player.name} Rank ${player.level} (${player.userid})`)

		const userChoice = await showMenu(interaction, playerName, formattedPlayers)
		if (!userChoice) return
		
		loadProfile(interaction, userChoice.match(/(?<=\()\d+/)![0])
	}
}