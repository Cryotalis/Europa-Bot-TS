import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { browser } from '../bot'
import { formatList } from '../modules/string-functions'
import { compareTwoStrings } from 'string-similarity'
import { showMenu } from '../modules/menu'
import { languageCookie, accessCookie } from '../modules/variables'
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
			await page.evaluate((crewID) => {
				document.getElementsByClassName('prt-head-current')[0].setAttribute('style', 'font-size: 14pxpadding-top: 4px')
				document.getElementsByClassName('prt-head-current')[0].textContent += ` ID: ${crewID}`
			}, crew.id)
	
			const screenshot = await page.screenshot({ encoding: 'binary', clip: { x: 0, y: 0, width: 363, height: 400 } }) //Take the screenshot
			await page.close()
	
			const attachment = new AttachmentBuilder(screenshot, {name: `Crew_${crew.id}.png`})

			crewEmbed
				.setTitle(`${crew.data[0].name}`)
				.setURL(`http://game.granbluefantasy.jp/#guild/detail/${crew.id}`)
				.setImage(`attachment://${attachment.name}`)
				.addFields([
					{name: 'Ranking', value: `Ranked #${crew.data[0].rank} in GW #${crew.data[0].gw_num} with ${String(crew.data[0].points).match(/\d{3}/g)?.join(',')} points`},
					{name: 'Name History', value: `${formatList([... new Set(crew.data.map(crew => crew.name))])}`}
				])
			
			return interaction.editReply({embeds: [crewEmbed], files: [attachment]})
		}

		const crewEmbed = new EmbedBuilder()
			.setTitle(`Searching for ${crewName ?? crewID} <a:loading:763160594974244874>`)
			.setColor('Blue')
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
		const formattedCrews = crews.map(crew => `${crew.data[0].name} Rank ${crew.data[0].rank} (${crew.id})`)

		const userChoice = await showMenu(interaction, crewName!, formattedCrews)
		if (!userChoice) return

		loadCrew(crews.find(crew => String(crew.id) === userChoice.match(/(?<=\()\d+/)![0])!)
	}
}