import { CommandInteraction, MessageActionRow, MessageAttachment, MessageButton, MessageEmbed, MessageSelectMenu } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { data, browser, languageCookie, accessCookie, jsessionID } from '../bot'
import { compareTwoStrings } from 'string-similarity'
import { createCanvas, loadImage, Image, CanvasRenderingContext2D } from 'canvas'
import axios from 'axios'
import { wrapText } from '../library'
import urlencode from 'urlencode'

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
	async execute(interaction: CommandInteraction) {
		const playerName = interaction.options.getString('name')
		const playerID = interaction.options.getNumber('id')?.toString()

		if (!data) return interaction.reply('Unable to connect to database. Please try again in a few seconds.')

		const playerEmbed = new MessageEmbed()
			.setColor('BLUE')
			.setAuthor({name: 'Player Finder', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})

		
		function drawStars(ctx: CanvasRenderingContext2D, stars: Image[], spacing: number, uncaps: number, level: number, maxLevel: number, x: number, y: number) {
			if (isNaN(uncaps)) { //If number of uncaps are unknown, use summon level to determine uncaps
				if (level <= 40) {uncaps = 0}
				if (level > 40 && level <= 60) {uncaps = 1}
				if (level > 60 && level <= 80) {uncaps = 2}
				if (level > 80 && level <= 100) {uncaps = 3}
				if (level > 100 && level <= 150) {uncaps = 4}
				if (level > 150 && level <= 200) {uncaps = 5}
			}

			ctx.shadowColor = 'black'
			ctx.shadowOffsetX = 2
			ctx.shadowOffsetY = 2

			x += (5 - maxLevel) * spacing
			for (let i = 0; i < maxLevel; i++) {
				if (i < 3 && i < uncaps) {ctx.drawImage(stars[0], x + spacing * i, y)}
				if (i >= 3 && i < uncaps) {ctx.drawImage(stars[1], x + spacing * i, y)}
				if (i < 3 && i >= uncaps) {ctx.drawImage(stars[2], x + spacing * i, y)}
				if (i >= 3 && i >= uncaps) {ctx.drawImage(stars[3], x + spacing * i, y)}
			}
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

			const [summonsTemplate, ...stars] = await Promise.all([
				loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842832315213152286/SummonsTemplate.png'),
				loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842840832217579520/regularStar.png'),
				loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842843224505843772/blueStar.png'),
				loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842840831311347732/regularStarBlank.png'),
				loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842843214209482814/blueStarBlank.png')
			])

			ctx.drawImage(summonsTemplate, 0, 0)
			ctx.textAlign = 'center'
			ctx.font = '35px Times Bold'
			ctx.strokeStyle = 'black'
			ctx.lineWidth = 2
			ctx.strokeText(`${name} Rank ${rank}`, 467, 420)
			ctx.strokeText(`ID: ${playerID}`, 908, 420)
			ctx.fillStyle = 'white'
			ctx.fillText(`${name} Rank ${rank}`, 467, 420)
			ctx.fillText(`ID: ${playerID}`, 908, 420)

			// Fetch and draw summon images
			const summonIDs = [
				'10', '11', // Fire summon IDs
				'20', '21', // Water summon IDs
				'30', '31', // Earth summon IDs
				'40', '41', // Wind summon IDs
				'50', '51', // Light summon IDs
				'60', '61', // Dark summon IDs
				'00', '01', // Misc summon IDs
			]
			const summonPrivate = /Support\sSummons<\/div>.+<div\sclass="txt-private">Private/s.test(bodyHTML)
			const summonImagePromises: Promise<Image>[] = []
			if (summonPrivate) {
				summonIDs.forEach(() => summonImagePromises.push(loadImage('https://i.imgur.com/kruvcZo.png')))
			} else {
				summonIDs.forEach(ID => {
					const summonRegex = new RegExp(`${ID.replace(/(\d)(\d)/, '$1/$2')}".+?img-fix-summon.+?src="(.+?)"`, 's')
					summonImagePromises.push(loadImage(bodyHTML.match(summonRegex)![1]))
				})
			}

			const summonImages = await Promise.all(summonImagePromises)
			summonImages.forEach((image, i) => {
				const xCoordinates = [ 50,  50, 234, 234, 419, 419, 604, 604, 788, 788, 973, 973, 1158, 1158]
				const yCoordinates = [155, 265, 155, 265, 155, 265, 155, 265, 155, 265, 155, 265,  155,  265]
				ctx.drawImage(image, xCoordinates[i], yCoordinates[i], 168, 96)
			})

			// Fetch summon uncap information and draw uncap stars
			const summons: {uncaps: number, level: number, maxLevel: number}[] = []
			if (!summonPrivate) {
				summonIDs.forEach(ID => {
					const nameRegex = new RegExp(`(?<=summon${ID}-name" class="prt-fix-name" name=").+?(?=">)`)
					const uncapRegex = new RegExp(`(?<=summon${ID}-info" class="prt-fix-info bless-rank)\\d`)
					const levelRegex = new RegExp(`summon${ID}-name".+?\\d+`)
					const summonInfo = data.find(info => info.summonName === String(bodyHTML.match(nameRegex)))
					summons.push({
						uncaps: parseInt(String(bodyHTML.match(uncapRegex))) + 2,
						level: parseInt(String(String(bodyHTML.match(levelRegex)).match(/(?<=Lvl\s)\d+/i))),
						maxLevel: summonInfo?.ulbDate ? 5 : summonInfo?.flbDate ? 4 : 3
					})
				})
			}

			summons.forEach((summon, i) => {
				const xCoordinates = [113, 113, 297, 297, 482, 482, 667, 667, 851, 851, 1036, 1036, 1221, 1221]
				const yCoordinates = [220, 330, 220, 330, 220, 330, 220, 330, 220, 330,  220,  330,  220,  330]
				drawStars(ctx, stars, 19, summon.uncaps, summon.level, summon.maxLevel, xCoordinates[i], yCoordinates[i])
			})

			const attachment = new MessageAttachment(canvas.toBuffer(), `${String(String(name).replace(/\s/g, '_').match(/\w+/))}SupportSummons.png`)
			playerEmbed
				.setTitle(`${name}`)
				.setURL(`http://game.granbluefantasy.jp/#profile/${playerID}`)
				.setImage(`attachment://${String(String(name).replace(/\s/g, '_').match(/\w+/))}SupportSummons.png`)
				.setFooter({text: `http://game.granbluefantasy.jp/#profile/${playerID}`, iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})
	
			return interaction.editReply({embeds: [playerEmbed], files: [attachment]})
		}

		async function loadProfile(playerID: string) {
			playerEmbed.setTitle('Loading Player Profile <a:loading:763160594974244874>')
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
			
			// Reformat the page for the screenshot
			const bodyHTML = await page.evaluate(() => new XMLSerializer().serializeToString(document.doctype!) + document.documentElement.outerHTML)
			await page.evaluate(playerID => {
				document.getElementById('pop-force')?.remove()
				document.getElementsByClassName('prt-status')[0].innerHTML += `<div class="prt-user-id" style="left:160px; padding-top:10px">Player ID: ${playerID}</div>`
				document.getElementsByClassName('prt-total-status')[0].setAttribute('class', 'prt-total-status mine')
				document.getElementsByClassName('prt-other-job')[0].remove()
				document.body.style.background = 'transparent'
				document.getElementById('wrapper')?.removeAttribute('class')
			}, playerID)
			
			// Check whether player profile is private
			if (/(?<=<div\sclass="txt-secret-profile">).+(?=<\/div>)/.test(bodyHTML)) {interaction.editReply('Player profile is private.'); return await page.close()}
	
			// Extract player name
			const name = bodyHTML.match(/(?<=<span\sclass="txt-other-name">).+(?=<\/span>)/)
			if (!name) {interaction.editReply({content: 'Could not get player profile. Please try again later.', embeds: []}); return await page.close()}
			
			// Take a screenshot of the page and close the page
			const screenshot = await page.screenshot({clip: { x: 0, y: 52, width: 362, height: 520 }, encoding: 'binary', omitBackground: true})
			await page.close()

			if (interaction.options.getBoolean('summons-only')) return await loadSummons(playerID, bodyHTML)

			playerEmbed.setTitle('Loading Support Summons and Star Character <a:loading:763160594974244874>')
			interaction.editReply({embeds: [playerEmbed]})
	
			// Fetch Star Character information
			let starChar = String(bodyHTML.match(/(?<=img-pushed-npc"\ssrc=").+?(?=")/))
			let starCharName = String(bodyHTML.match(/(?<=prt-current-npc-name">)\s+?.+?\s+?(?=<)/)).trim()
			let emLvl = String(bodyHTML.match(/(?<=txt-npc-rank">)\d+(?=<)/))
			let starCharText = String(bodyHTML.match(/(?<=prt-pushed-info">).+?(?=<)/))
			const starCharPrivate = /Star\sCharacter<\/div>\n.+Private/.test(bodyHTML)
			if (starCharPrivate){starChar = 'https://i.imgur.com/kruvcZo.png'; starCharName = 'Private'; emLvl = 'N/A'; starCharText = 'Private' }
			if (starChar === 'http://game-a1.granbluefantasy.jp/assets_en/img_mid/sp/assets/summon/m/empty.jpg'){starCharName = 'Not Set'; emLvl = 'N/A'}

			const [playerProfile, playerTemplate, starCharImage] = await Promise.all([
				loadImage(screenshot),
				loadImage('https://cdn.discordapp.com/attachments/659229575821131787/829179175403388948/PlayerTemplate_1.png'),
				loadImage(starChar)
			])

			// Draw Player profile, template, and Star Character
			const canvas = createCanvas(810, 520)
			const ctx = canvas.getContext('2d')

			ctx.drawImage(playerProfile, 0, 0)
			ctx.drawImage(playerTemplate, 350, 0)
			ctx.drawImage(starCharImage, 0, 0, 500, 200, 400, 410, 250, 100)
	
			ctx.textAlign = 'center'
			ctx.font = `20px Times Bold`
			ctx.strokeStyle = 'black'
			ctx.lineWidth = 2
			ctx.strokeText(`${starCharName}`, 580, 390)
			ctx.fillStyle = 'white'
			ctx.fillText(`${starCharName}`, 580, 390)
	
			wrapText({ctx: ctx, font: '18px Times Bold', textAlign: 'left'}, `${starCharText}`, 525, 435, 240, 15)

			ctx.strokeStyle = '#570980'
			ctx.strokeText(`${emLvl}`, 760, 390)
			ctx.fillText(`${emLvl}`, 760, 390)
	
			// Fetch and draw summon images
			const summonIDs = [
				'10', '11', // Fire summon IDs
				'20', '21', // Water summon IDs
				'30', '31', // Earth summon IDs
				'40', '41', // Wind summon IDs
				'50', '51', // Light summon IDs
				'60', '61', // Dark summon IDs
				'00', '01', // Misc summon IDs
			]
			const summonPrivate = /Support\sSummons<\/div>.+<div\sclass="txt-private">Private/s.test(bodyHTML)
			const summonImagePromises: Promise<Image>[] = []
			if (summonPrivate) {
				summonIDs.forEach(() => summonImagePromises.push(loadImage('https://i.imgur.com/kruvcZo.png')))
			} else {
				summonIDs.forEach(ID => {
					const summonRegex = new RegExp(`${ID.replace(/(\d)(\d)/, '$1/$2')}".+?img-fix-summon.+?src="(.+?)"`, 's')
					summonImagePromises.push(loadImage(bodyHTML.match(summonRegex)![1]))
				})
			}

			const summonImages = await Promise.all(summonImagePromises)
			summonImages.forEach((image, i) => {
				const xCoordinates = [370, 475, 585, 690, 370, 475, 585, 690, 370, 475, 585, 690, 470, 600]
				const yCoordinates = [ 50,  50,  50,  50, 115, 115, 115, 115, 180, 180, 180, 180, 275, 275]
				ctx.drawImage(image, 0, 0, 500, 200, xCoordinates[i], yCoordinates[i], 250, 100)
			})

			// Fetch summon uncap information and draw uncap stars
			const stars = await Promise.all([
				loadImage('https://i.imgur.com/ICv0syr.png'),
				loadImage('https://i.imgur.com/IzXxg3R.png'),
				loadImage('https://i.imgur.com/KfjU5W5.png'),
				loadImage('https://i.imgur.com/3mnCjnH.png')
			])

			const summons: {uncaps: number, level: number, maxLevel: number}[] = []
			if (!summonPrivate) {
				summonIDs.forEach(ID => {
					const nameRegex = new RegExp(`(?<=summon${ID}-name" class="prt-fix-name" name=").+?(?=">)`)
					const uncapRegex = new RegExp(`(?<=summon${ID}-info" class="prt-fix-info bless-rank)\\d`)
					const levelRegex = new RegExp(`summon${ID}-name".+?\\d+`)
					const summonInfo = data.find(info => info.summonName === String(bodyHTML.match(nameRegex)))
					summons.push({
						uncaps: parseInt(String(bodyHTML.match(uncapRegex))) + 2,
						level: parseInt(String(String(bodyHTML.match(levelRegex)).match(/(?<=Lvl\s)\d+/i))),
						maxLevel: summonInfo?.ulbDate ? 5 : summonInfo?.flbDate ? 4 : 3
					})
				})
			}

			summons.forEach((summon, i) => {
				const xCoordinates = [405, 510, 620, 725, 405, 510, 620, 725, 405, 510, 620, 725, 505, 635]
				const yCoordinates = [ 92,  92,  92,  92, 157, 157, 157, 157, 222, 222, 222, 222, 316, 316]
				drawStars(ctx, stars, 13, summon.uncaps, summon.level, summon.maxLevel, xCoordinates[i], yCoordinates[i])
			})

			const attachment = new MessageAttachment(canvas.toBuffer(), `${String(String(name).replace(/\s/g, '_').match(/\w+/))}Profile.png`)
	
			playerEmbed
				.setTitle(`${name}`)
				.setURL(`http://game.granbluefantasy.jp/#profile/${playerID}`)
				.setImage(`attachment://${String(String(name).replace(/\s/g, '_').match(/\w+/))}Profile.png`)
				.setFooter({text: `http://game.granbluefantasy.jp/#profile/${playerID}`, iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})
	
			return interaction.editReply({embeds: [playerEmbed], files: [attachment]})
		}

		if (playerID){
			await interaction.reply({embeds: [playerEmbed]})
			loadProfile(playerID)
		} else {
			const searchEmbed = new MessageEmbed()
				.setTitle(`Searching for "${playerName}" <a:loading:763160594974244874>`)
				.setColor('BLUE')
				.setAuthor({name: 'Player Finder', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})
				.setFooter({text: 'http://info.gbfteamraid.fun/web/about', iconURL: 'http://info.gbfteamraid.fun/view/image/icon.png'})
				// .setFooter({text: 'https://gbfdata.com/', iconURL: 'https://gbfdata.com/favicon.ico'})

			await interaction.reply({embeds: [searchEmbed]})

			let players: {level: string, name: string, userid: string}[] = []
			// https://info.gbfteamraid.fun version
			const options = {
				method: 'POST',
				url: `https://info.gbfteamraid.fun/web/userrank?method=getUserrank&params={"username":"${playerName}"}`,
				headers: {
					Cookie: `JSESSIONID=${jsessionID}`,
				}
			}

			await axios.request(options).then(({data: {result}}) => {
				players = result
			}).catch(async error => {
				return interaction.editReply({content: 'Player Search by name is currently unavailable. Please try again later.', embeds: []})
			})

			// // https://gbfdata.com version
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

			const playersEmbed = new MessageEmbed()
				.setTitle(`Found ${players.length} results for "${playerName}"`)
				.setDescription('Select a player using the menu below.')
				.setColor('BLUE')

			let pageNum = 0
			const numbers = [ '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟' ]
			const formattedPlayers = players.map(player => `${numbers[players.indexOf(player)%10]} ${player.name} Rank ${player.level} (${player.userid})`)
			
			function setPage(page: number){
				const index = page*10
				playersEmbed.fields = []
				if (players.length > index) playersEmbed.addField('\u200b', formattedPlayers.slice(index, index + 5).join('\n\n'), true)
				if (players.length > index + 5) playersEmbed.addField('\u200b', formattedPlayers.slice(index + 5, index + 10).join('\n\n'), true)

				const navButtons = new MessageActionRow()
					.addComponents(
						new MessageButton()
							.setCustomId('leftButton')
							.setLabel('🡰')
							.setStyle('PRIMARY')
							.setDisabled(Boolean(page === 0))
					)
					.addComponents(
						new MessageButton()
							.setCustomId('pageButton')
							.setLabel(`ㅤㅤㅤㅤPage ${pageNum + 1}ㅤㅤㅤㅤ`)
							.setStyle('SECONDARY')
							.setDisabled(true)
					)
					.addComponents(
						new MessageButton()
							.setCustomId('rightButton')
							.setLabel('🡲')
							.setStyle('PRIMARY')
							.setDisabled(Boolean(players.length <= index + 10))
					)
					.addComponents(
						new MessageButton()
							.setCustomId('cancelButton')
							.setLabel('✖')
							.setStyle('DANGER')
					)

				const playerMenu = new MessageActionRow()
					.addComponents(
						new MessageSelectMenu()
							.setCustomId('Player Selector')
							.setPlaceholder('Select a Player')
							.addOptions(formattedPlayers.slice(index, index + 10).map((player: string) => ({label: player, value: player})))
					)
				interaction.editReply({embeds: [playersEmbed], components: [playerMenu, navButtons]})
			}
			setPage(0)

			const playerCollector = interaction.channel?.createMessageComponentCollector({componentType: 'SELECT_MENU', filter: msg => msg.member?.user.id === interaction.member?.user.id, time: 60000*5, max: 1})
			playerCollector?.on('collect', i => {
				buttonCollector?.stop()
				playerCollector.stop()
				loadProfile(String(i.values[0].match(/(?<=\()\d+/)))
			})
			
			const buttonCollector = interaction.channel?.createMessageComponentCollector({componentType: 'BUTTON', filter: msg => msg.member?.user.id === msg.member?.user.id, time: 60000*5})
            buttonCollector?.on('collect', i => {
				i.deferUpdate()
				if (i.customId === 'leftButton') {pageNum--; setPage(pageNum)}
				else if (i.customId === 'rightButton') {pageNum++; setPage(pageNum)}
				else if (i.customId === 'cancelButton') {
					buttonCollector.stop() 
					interaction.editReply({content: 'Player Search cancelled.', embeds: [], components: []})
				}
            })
		}
	}
}