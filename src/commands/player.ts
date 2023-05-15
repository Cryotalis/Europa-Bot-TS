import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { data, browser, jsessionID } from '../bot'
import { compareTwoStrings } from 'string-similarity'
import { createCanvas, loadImage } from 'canvas'
import { wrapText } from '../modules/image-helpers'
import { showMenu } from '../modules/menu'
import { drawStars, getAllSummonInfo } from '../modules/granblue-helpers'
import { openSummon, playerTemplate } from '../modules/assets'
import { accessCookie, languageCookie } from '../modules/variables'
import axios from 'axios'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('player')
		.setDescription('Search for a player and display their player profile page')
		.addSubcommand(subcommand =>
			subcommand
				.setName('name')
				.setDescription('Search for a player by their name')
				.addStringOption(option => option.setName('name').setDescription("The name of the player you're looking for").setRequired(true))
				.addBooleanOption(option => option.setName('summons').setDescription('Show summons only?'))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('id')
				.setDescription('Search for a player by their ID')		
				.addNumberOption(option => option.setName('id').setDescription("The ID of the player you're looking for").setRequired(true))
				.addBooleanOption(option => option.setName('summons').setDescription('Show summons only?'))
		)
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const playerName = interaction.options.getString('name')
		const playerID = interaction.options.getNumber('id')?.toString()

		if (!data) return interaction.reply('Unable to connect to database. Please try again in a few seconds.')

		const playerEmbed = new EmbedBuilder()
			.setColor('Blue')
			.setAuthor({name: 'Player Search', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})

		async function loadProfile(playerID: string) {
			playerEmbed.setTitle('Fetching Player Profile <a:loading:763160594974244874>')
			interaction.editReply({embeds: [playerEmbed], components: []})

			// Access the Player profile page
			if (!browser.isConnected()) return interaction.editReply({content: 'Browser is currently unavailable. Please try again later.', embeds: []})
			const page = await browser.newPage()
			await page.setCookie(languageCookie, accessCookie)
			await page.goto(`http://game.granbluefantasy.jp/#profile/${playerID}`, { waitUntil: 'networkidle0' })
			await page.waitForSelector('#wrapper > div.contents > div.cnt-profile > div.prt-status', { timeout: 5000 }).catch(async () => {
				if (await page.$('.cnt-maintenance') !== null) await interaction.editReply({content: 'The game is currently undergoing maintenance. Please try again when maintenance is over.', embeds: []})
				else await interaction.editReply({content: 'Could not connect to Granblue Fantasy. Please try again later.', embeds: []})
				await page.close()
			})
			if (page.isClosed()) return

			const bodyHTML = await page.evaluate(() => new XMLSerializer().serializeToString(document.doctype!) + document.documentElement.outerHTML)
			
			// Check whether the player's profile is private
			if (/(?<=<div\sclass="txt-secret-profile">).+(?=<\/div>)/.test(bodyHTML)) {interaction.editReply('Player profile is private.'); return await page.close()}

			// Get the player's name
			const name = bodyHTML.match(/(?<=<span\sclass="txt-other-name">).+(?=<\/span>)/)?.toString()
			if (!name) {interaction.editReply({content: 'Could not get player profile. Please try again later.', embeds: []}); return await page.close()}

			// Reformat the page for the screenshot
			await page.evaluate(playerID => {
				document.getElementById('pop-force')?.remove()
				document.getElementsByClassName('prt-status')[0].innerHTML += `<div class="prt-user-id" style="left:160px; padding-top:10px">Player ID: ${playerID}</div>`
				document.getElementsByClassName('prt-total-status')[0].setAttribute('class', 'prt-total-status mine')
				document.getElementsByClassName('prt-other-job')[0].remove()
				document.body.style.background = 'transparent'
				document.getElementById('wrapper')?.removeAttribute('class')
			}, playerID)
			
			// Take a screenshot of the page and close the page
			const screenshot = await page.screenshot({clip: { x: 0, y: 52, width: 362, height: 520 }, encoding: 'binary', omitBackground: true})
			await page.close()
			
			if (interaction.options.getBoolean('summons')) return await loadSummons(playerID, bodyHTML)

			playerEmbed.setTitle('Drawing Player Profile and Support Summons <a:loading:763160594974244874>')
			interaction.editReply({embeds: [playerEmbed]})
			
			// Draw Player profile, template, and Star Character
			const canvas = createCanvas(810, 520)
			const ctx = canvas.getContext('2d')

			const playerProfile = await loadImage(screenshot)
			ctx.drawImage(playerProfile, 0, 0)
			ctx.drawImage(playerTemplate, 350, 0)
			
			// Fetch/compile summon info and draw summons with uncap stars
			ctx.shadowColor = '#000000'
			ctx.shadowOffsetX = ctx.shadowOffsetY = 2

			const summons = await getAllSummonInfo(bodyHTML)
			summons.forEach((summon, i) => {
				const summonXCoords = [370, 475, 585, 690, 370, 475, 585, 690, 370, 475, 585, 690, 470, 600]
				const summonYCoords = [ 50,  50,  50,  50, 115, 115, 115, 115, 180, 180, 180, 180, 275, 275]
				ctx.drawImage(summon.image, 0, 0, 500, 200, summonXCoords[i], summonYCoords[i], 250, 100)

				const starXCoords = [405, 510, 620, 725, 405, 510, 620, 725, 405, 510, 620, 725, 505, 635]
				const starYCoords = [ 92,  92,  92,  92, 157, 157, 157, 157, 222, 222, 222, 222, 316, 316]
				drawStars(ctx, 13, summon.level, summon.uncaps, summon.maxUncaps, starXCoords[i], starYCoords[i])
			})

			// Fetch Star Character info and draw
			const starCharPrivate = /Star\sCharacter<\/div>\n.+Private/.test(bodyHTML)
			const starCharURL = String(bodyHTML.match(/(?<=img-pushed-npc"\ssrc=").+?(?=")/))
			let starCharName = String(bodyHTML.match(/(?<=prt-current-npc-name">)\s+?.+?\s+?(?=<)/)).trim()
			let emLvl = String(bodyHTML.match(/(?<=txt-npc-rank">)\d+(?=<)/))
			let starCharText = String(bodyHTML.match(/(?<=prt-pushed-info">).+?(?=<)/))
			let starCharImage
			if (starCharURL.includes('empty.jpg')){starCharImage = openSummon; starCharName = 'Not Set'; emLvl = 'N/A'}
			else if (starCharPrivate){starCharName = 'Private'; emLvl = 'N/A'; starCharText = 'Private' }
			else starCharImage = await loadImage(starCharURL)

			if (starCharImage) ctx.drawImage(starCharImage, 0, 0, 500, 200, 400, 410, 250, 100)
	
			ctx.textAlign = 'center'
			ctx.font = `20px Times Bold`
			ctx.fillStyle = 'white'
			ctx.lineWidth = 2

			ctx.strokeStyle = '#570980'
			ctx.strokeText(`${emLvl}`, 760, 390)
			ctx.fillText(`${emLvl}`, 760, 390)

			ctx.shadowOffsetX = ctx.shadowOffsetY = 0
			ctx.strokeStyle = 'black'
			ctx.strokeText(`${starCharName}`, 580, 390)
			ctx.fillText(`${starCharName}`, 580, 390)
	
			wrapText({ctx: ctx, font: '18px Times Bold', textAlign: 'left'}, `${starCharText}`, 525, 435, 240, 15)

			const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `Player_${playerID}.png`})
	
			playerEmbed
				.setTitle(`${name}`)
				.setURL(`http://game.granbluefantasy.jp/#profile/${playerID}`)
				.setImage(`attachment://${attachment.name}`)
				.setFooter({text: `http://game.granbluefantasy.jp/#profile/${playerID}`, iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})
	
			interaction.editReply({embeds: [playerEmbed], files: [attachment]})
		}

		async function loadSummons(playerID: string, bodyHTML: string){
			// Extract player name
			const name = bodyHTML.match(/(?<=<span\sclass="txt-other-name">).+(?=<\/span>)/)
			const rank = bodyHTML.match(/(?<=\sRank\s)\d+/)
			if (!name) return interaction.editReply({content: 'Could not get player profile. Please try again later.', embeds: []})

			playerEmbed.setTitle('Loading Support Summons and Star Character <a:loading:763160594974244874>')
			interaction.editReply({embeds: [playerEmbed]})

			// Draw player name, ID, and template
			const canvas = createCanvas(1375, 475)
			const ctx = canvas.getContext('2d')

			const summonsTemplate = await loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842832315213152286/SummonsTemplate.png')
			ctx.drawImage(summonsTemplate, 0, 0)

			ctx.textAlign = 'center'
			ctx.font = '35px Times Bold'
			ctx.strokeStyle = 'black'
			ctx.fillStyle = 'white'
			ctx.lineWidth = 2
			ctx.strokeText(`${name} Rank ${rank}`, 467, 420)
			ctx.strokeText(`ID: ${playerID}`, 908, 420)
			ctx.fillText(`${name} Rank ${rank}`, 467, 420)
			ctx.fillText(`ID: ${playerID}`, 908, 420)

			const summons = await getAllSummonInfo(bodyHTML)
			summons.forEach((summon, i) => {
				const summonXCoords = [ 50,  50, 234, 234, 419, 419, 604, 604, 788, 788, 973, 973, 1158, 1158]
				const summonYCoords = [155, 265, 155, 265, 155, 265, 155, 265, 155, 265, 155, 265,  155,  265]
				ctx.drawImage(summon.image, summonXCoords[i], summonYCoords[i], 168, 96)

				const xCoordinates = [113, 113, 297, 297, 482, 482, 667, 667, 851, 851, 1036, 1036, 1221, 1221]
				const yCoordinates = [220, 330, 220, 330, 220, 330, 220, 330, 220, 330,  220,  330,  220,  330]
				drawStars(ctx, 19, summon.level, summon.uncaps, summon.maxUncaps, xCoordinates[i], yCoordinates[i])
			})

			const attachment = new AttachmentBuilder(canvas.toBuffer(), {name: `${String(String(name).replace(/\s/g, '_').match(/\w+/))}SupportSummons.png`})
			
			playerEmbed
				.setTitle(`${name}`)
				.setURL(`http://game.granbluefantasy.jp/#profile/${playerID}`)
				.setImage(`attachment://${String(String(name).replace(/\s/g, '_').match(/\w+/))}SupportSummons.png`)
				.setFooter({text: `http://game.granbluefantasy.jp/#profile/${playerID}`, iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})
	
			return interaction.editReply({embeds: [playerEmbed], files: [attachment]})
		}

		if (playerID){
			await interaction.reply({embeds: [playerEmbed]})
			loadProfile(playerID)
		} else {
			const searchEmbed = new EmbedBuilder()
				.setTitle(`Searching for "${playerName}" <a:loading:763160594974244874>`)
				.setColor('Blue')
				.setAuthor({name: 'Player Search', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})
				.setFooter({text: 'http://info.gbfteamraid.fun/web/about', iconURL: 'http://info.gbfteamraid.fun/view/image/icon.png'})
				// .setFooter({text: 'https://gbfdata.com/', iconURL: 'https://gbfdata.com/favicon.ico'})

			await interaction.reply({embeds: [searchEmbed]})

			let players: {level: string, name: string, userid: string}[] = []
			// https://info.gbfteamraid.fun version
			const options = {
				method: 'POST',
				url: 'https://info.gbfteamraid.fun/web/userrank',
				headers: {
				  'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
				  Cookie: `JSESSIONID=${jsessionID}`
				},
				data: {method: 'getUserrank', params: `{"username":"${playerName}"}`}
			  }

			await axios.request(options).then(({data: {result}}) => {
				players = result
			}).catch(async error => {
				console.log(error)
				return interaction.editReply({content: 'Player Search by name is currently unavailable. Please try again later.', embeds: []})
			})

			// https://gbfdata.com version
			// await axios.get(`https://gbfdata.com/user/search?q=${urlencode(playerName!)}&is_fulltext=1`).then(({data}) => {
			// 	const playerData = String(data.match(/(?<=\/thead>).+(?=<\/table)/s))
			// 	const playerMatches = playerData.matchAll(/href=".+?(\d+)">\n(.+?)\n<.+?"num">(\d+)/gs)
			// 	players = [...playerMatches].map(player => ({userid: player[1], name: player[2], level: player[3]}))
			// }).catch(async error => {
			// 	return interaction.editReply({content: 'Player Search by name is currently unavailable. Please try again later.', embeds: []})
			// })

			if (!players?.length) return interaction.editReply({content: 'No players were found.', embeds: []})
			if (players.length === 1) return loadProfile(players[0].userid)

			players = players.sort((a, b) => parseInt(b.level) - parseInt(a.level))
			players = players.sort((a, b) => compareTwoStrings(b.name, playerName!) - compareTwoStrings(a.name, playerName!))
			const formattedPlayers = players.map(player => `${player.name} Rank ${player.level} (${player.userid})`)

			const userChoice = await showMenu(interaction, playerName!, formattedPlayers)
			if (!userChoice) return
			
			loadProfile(userChoice.match(/(?<=\()\d+/)![0])
		}
	}
}