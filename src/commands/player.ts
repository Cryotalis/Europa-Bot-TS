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

		if (!data) return interaction.reply('Unable to connect to database. Please try again in a few seconds.')

		// async function loadSummons(playerID: string, bodyHTML: string){
		// 	// Extract player name
		// 	const name = bodyHTML.match(/(?<=<span\sclass="txt-other-name">).+(?=<\/span>)/)
		// 	const rank = bodyHTML.match(/(?<=\sRank\s)\d+/)
		// 	if (!name) return interaction.editReply({content: 'Could not get player profile. Please try again later.', embeds: []})

		// 	playerEmbed.setTitle('Loading Support Summons and Star Character <a:loading:763160594974244874>')
		// 	interaction.editReply({embeds: [playerEmbed]})

		// 	// Draw player name, ID, and template
		// 	const canvas = createCanvas(1375, 475)
		// 	const ctx = canvas.getContext('2d')

		// 	const summonsTemplate = await loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842832315213152286/SummonsTemplate.png')
		// 	ctx.drawImage(summonsTemplate, 0, 0)

		// 	ctx.textAlign = 'center'
		// 	ctx.font = '35px Times Bold'
		// 	ctx.strokeStyle = 'black'
		// 	ctx.fillStyle = 'white'
		// 	ctx.lineWidth = 2
		// 	ctx.strokeText(`${name} Rank ${rank}`, 467, 420)
		// 	ctx.strokeText(`ID: ${playerID}`, 908, 420)
		// 	ctx.fillText(`${name} Rank ${rank}`, 467, 420)
		// 	ctx.fillText(`ID: ${playerID}`, 908, 420)

		// 	const summons = await getAllSummonInfo(bodyHTML)
		// 	summons.forEach((summon, i) => {
		// 		const summonXCoords = [ 50,  50, 234, 234, 419, 419, 604, 604, 788, 788, 973, 973, 1158, 1158]
		// 		const summonYCoords = [155, 265, 155, 265, 155, 265, 155, 265, 155, 265, 155, 265,  155,  265]
		// 		ctx.drawImage(summon.image, summonXCoords[i], summonYCoords[i], 168, 96)

		// 		const xCoordinates = [113, 113, 297, 297, 482, 482, 667, 667, 851, 851, 1036, 1036, 1221, 1221]
		// 		const yCoordinates = [220, 330, 220, 330, 220, 330, 220, 330, 220, 330,  220,  330,  220,  330]
		// 		drawStars(ctx, 19, summon.level, summon.uncaps, summon.maxUncaps, xCoordinates[i], yCoordinates[i])
		// 	})

		// 	const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `${String(String(name).replace(/\s/g, '_').match(/\w+/))}SupportSummons.png`})
			
		// 	playerEmbed
		// 		.setTitle(`${name}`)
		// 		.setURL(`http://game.granbluefantasy.jp/#profile/${playerID}`)
		// 		.setImage(`attachment://${String(String(name).replace(/\s/g, '_').match(/\w+/))}SupportSummons.png`)
		// 		.setFooter({text: `http://game.granbluefantasy.jp/#profile/${playerID}`, iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})
	
		// 	return interaction.editReply({embeds: [playerEmbed], files: [attachment]})
		// }

		if (playerID){
			loadProfile(interaction, playerID)
		} else {
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
			
			if (!players){ // Fall back to https://gbfdata.com version if teamraid is not available
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
}