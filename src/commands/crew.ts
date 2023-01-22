import { CommandInteraction, MessageActionRow, MessageAttachment, MessageButton, MessageEmbed, MessageSelectMenu } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { browser, languageCookie, accessCookie } from '../bot'
import axios from 'axios'
import { formatList } from '../library'
import { compareTwoStrings } from 'string-similarity'

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
	async execute(interaction: CommandInteraction) {
		const crewName = interaction.options.getString('name')
		const crewID = interaction.options.getNumber('id')?.toString()

		async function loadCrew(crew: crew){
			crewEmbed
				.setTitle('Loading Crew Page <a:loading:763160594974244874>')
				.setFooter({text: `http://game.granbluefantasy.jp/#guild/detail/${crew.id}`, iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})
			interaction.editReply({embeds: [crewEmbed], components: []})
	
			if (!browser) return interaction.editReply({content: 'Browser is currently unavailable. Please try again later.', embeds: []})
			const page = await browser.newPage()
			await page.setCookie(languageCookie, accessCookie)
			await page.goto(`http://game.granbluefantasy.jp/#guild/detail/${crew.id}`, { waitUntil: 'networkidle0' })
			const bodyHTML = await page.evaluate(() => new XMLSerializer().serializeToString(document.doctype!) + document.documentElement.outerHTML)
			if (/maintenance/g.test(bodyHTML)) {await interaction.editReply({content: 'The game is currently undergoing maintenance. Please try again when maintenance is over.', embeds: []}); return await page.close()}
	
			await page.waitForSelector('#wrapper > div.contents > div.cnt-guild > div.prt-airship-image > img', {visible: true})
			await page.waitForTimeout(2000) // Wait 2 seconds for page to load
			await page.evaluate((crewID) => {
				document.getElementsByClassName('prt-head-current')[0].setAttribute('style', 'font-size: 14pxpadding-top: 4px')
				document.getElementsByClassName('prt-head-current')[0].textContent += ` ID: ${crewID}`
			}, crew.id)
	
			const screenshot = await page.screenshot({ encoding: 'binary', clip: { x: 0, y: 0, width: 363, height: 400 } }) //Take the screenshot
			await page.close()
	
			const attachment = new MessageAttachment(screenshot, `${crew.data[0].name}.png`)

			crewEmbed
				.setTitle(`${crew.data[0].name}`)
				.setURL(`http://game.granbluefantasy.jp/#guild/detail/${crew.id}`)
				.setImage(`attachment://${crew.data[0].name}.png`)
				.addField('Ranking', `Ranked #${crew.data[0].rank} in GW #${crew.data[0].gw_num} with ${String(crew.data[0].points).match(/\d{3}/g)?.join(',')} points`)
				.addField('Name History', `${formatList([... new Set(crew.data.map(crew => crew.name))])}`)
			
			return interaction.editReply({embeds: [crewEmbed], files: [attachment]})
		}

		const crewEmbed = new MessageEmbed()
			.setTitle(`Searching for ${crewName ?? crewID} <a:loading:763160594974244874>`)
			.setColor('BLUE')
			.setAuthor({name: 'Crew Finder', iconURL: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Granblue_Fantasy_logo.png'})
			.setFooter({text: 'http://gbf.gw.lt/gw-guild-searcher/', iconURL: 'http://game.granbluefantasy.jp/favicon.ico'})
		
		await interaction.reply({embeds: [crewEmbed]})

		interface crew {data: {is_seed: number, points: number, gw_num: number, rank: number, name: string}[], id: number}
		let crews: crew[] = []
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
		
		await axios.request(options).then(({data}) => {
			crews = crewName ? data.result : [data]
		}).catch((error) => {
			if (error){
				console.error(error)
				return interaction.reply({content: 'Crew Search is currently unavailable. Please try again later.'})
			}
		})

		if (!crews[0]?.data[0]) return interaction.editReply({content: `No crews were found for ${crewName ?? crewID}.`, embeds: []})
		if (crews.length === 1) return loadCrew(crews[0])

		crews = crews.sort((a, b) => a.data[0].rank - b.data[0].rank)
		crews = crews.sort((a, b) => compareTwoStrings(b.data[0].name, crewName!) - compareTwoStrings(a.data[0].name, crewName!))

		const crewsEmbed = new MessageEmbed()
			.setTitle(`Found ${crews.length} results for "${crewName}"`)
			.setDescription('Select a crew using the menu below.\nRank here refers to the rank of the crew for the latest Guild War.')
			.setColor('BLUE')

		let pageNum = 0
		const numbers = [ '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟' ]
		const formattedCrews = crews.map(crew => `${numbers[crews.indexOf(crew)%10]} ${crew.data[0].name} Rank ${crew.data[0].rank} (${crew.id})`)
		
		function setPage(page: number){
			const index = page*10
			crewsEmbed.fields = []
			if (crews.length > index) crewsEmbed.addField('\u200b', formattedCrews.slice(index, index + 5).join('\n\n'), true)
			if (crews.length > index + 5) crewsEmbed.addField('\u200b', formattedCrews.slice(index + 5, index + 10).join('\n\n'), true)

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
						.setDisabled(Boolean(crews.length <= index + 10))
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
						.setCustomId('Crew Selector')
						.setPlaceholder('Select a Crew')
						.addOptions(formattedCrews.slice(index, index + 10).map((crew: string) => ({label: crew, value: crew})))
				)
			interaction.editReply({embeds: [crewsEmbed], components: [playerMenu, navButtons]})
		}
		setPage(0)

		const crewCollector = interaction.channel?.createMessageComponentCollector({componentType: 'SELECT_MENU', filter: msg => msg.member?.user.id === interaction.member?.user.id, time: 60000*5, max: 1})
			crewCollector?.on('collect', i => {
				buttonCollector?.stop()
				crewCollector.stop()
				loadCrew(crews.find(crew => String(crew.id) === i.values[0].match(/(?<=\()\d+/)![0])!)
			})
			
		const buttonCollector = interaction.channel?.createMessageComponentCollector({componentType: 'BUTTON', filter: msg => msg.member?.user.id === msg.member?.user.id, time: 60000*5})
		buttonCollector?.on('collect', i => {
			i.deferUpdate()
			if (i.customId === 'leftButton') {pageNum--; setPage(pageNum)}
			else if (i.customId === 'rightButton') {pageNum++; setPage(pageNum)}
			else if (i.customId === 'cancelButton') {
				buttonCollector.stop() 
				interaction.editReply({content: 'Crew Search cancelled.', embeds: [], components: []})
			}
		})
	}
}