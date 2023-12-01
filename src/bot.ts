import { ChannelType, Client, Collection, GatewayIntentBits, Guild, GuildMember, REST, Routes, ShardClientUtil, TextChannel } from 'discord.js'
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet'
import { schedule } from 'node-cron'
import { inspect } from 'util'
import fs from 'node:fs'
import os from 'os'
import { Browser, launch } from 'puppeteer'
import axios from 'axios'
import { accessCookie, languageCookie } from './modules/variables'
import { greetingConfig, makeGreetingImage } from './modules/greeting'
import { App } from 'octokit'
import { dateStringToUnix } from './modules/time'

export const client: Client<boolean> & {commands?: Collection<unknown, unknown>} = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration], rest: {timeout: 60000}})
export const cryoServerShardID = ShardClientUtil.shardIdForGuildId('379501550097399810', client.shard?.count!)
const currentShardID = client.shard?.ids[0]
// let isHost = os.hostname() !== 'PC-Hywell'
let isHost = true

const privateCommandFiles = ['connect.js', 'say.js', 'respawn.js', 'log.js']
const gameCommandNames = ['spark', 'crew', 'events', 'player', 'roll', 'banner']

export const regCommands = fs.readdirSync('./prod/commands').filter(file => file.endsWith('.js'))
export const modCommands = fs.readdirSync('./prod/modCommands').filter(file => file.endsWith('.js'))
const commandFiles = regCommands.concat(modCommands)

export async function registerCommands() {
	const commands = []
	const privateCommands = []
	const commandInfo = []
	client.commands = new Collection()

	for (const file of commandFiles) {
		const command = regCommands.includes(file) ? require(`./commands/${file}`) : require(`./modCommands/${file}`)
		if (privateCommandFiles.includes(file)) privateCommands.push(command.data.toJSON())
		else {
			commands.push(command.data.toJSON())
			commandInfo.push([
				command.data.name, 
				command.data.description, 
				gameCommandNames.includes(command.data.name) 
					? 'game' 
					: modCommands.includes(`${command.data.name}.js`) 
						? 'moderator' 
						: 'regular'
			])
		}
		client.commands.set(command.data.name, command)
	}

	for (const command of commandInfo) {
		if (/translate text/.test(command[0])) {
			command[1] = 'Translates text to your own language'
			command[2] += ' context'
		}
	}

	await publicDB.sheetsByTitle['Commands'].clearRows()
	await publicDB.sheetsByTitle['Commands'].addRows(commandInfo)
	const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN!)
	rest.put(Routes.applicationCommands('585514230967566338'), { body: commands })
		.then(() => console.log(`Successfully registered application commands globally for Shard #${currentShardID}`))
		.catch(console.error)

	rest.put(Routes.applicationGuildCommands('585514230967566338', '379501550097399810'), { body: privateCommands })
		.then(() => console.log(`Successfully registered private commands to The Cryo Chamber for Shard #${currentShardID}`))
		.catch(console.error)
}

export let publicDB: GoogleSpreadsheet
export let privateDB: GoogleSpreadsheet
export let servers: Array<GoogleSpreadsheetRow>
export let sparkProfiles: Array<GoogleSpreadsheetRow>
export let data: Array<GoogleSpreadsheetRow>
export let announcements: Array<GoogleSpreadsheetRow>
export let info: Array<GoogleSpreadsheetRow>

const serviceAccountCredentials = {client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!, private_key: process.env.GOOGLE_PRIVATE_KEY!}
export async function connectToDB(){
    publicDB = new GoogleSpreadsheet('1H5oCUOvKSN5AAo_tQvr7ElhDIJxhuYVpaJCbbyFeA0E')
    await publicDB.useServiceAccountAuth(serviceAccountCredentials)
    await publicDB.loadInfo()
	
    privateDB = new GoogleSpreadsheet(process.env.PRIVATE_DB_ID)
    await privateDB.useServiceAccountAuth(serviceAccountCredentials)
    await privateDB.loadInfo()

    servers = await privateDB.sheetsByTitle['Servers'].getRows()
    sparkProfiles = await privateDB.sheetsByTitle['Spark'].getRows()
	announcements = await privateDB.sheetsByTitle['Announcements'].getRows()
	data = await publicDB.sheetsByTitle['Data'].getRows()
	info = await publicDB.sheetsByTitle['Info'].getRows()

	console.log(`Database connection successful for Shard #${currentShardID}`)
}
connectToDB().then(() => registerCommands())

export let browser: Browser
export let jsessionID: string // Required for player name search
async function renewJSessionID(){
	const page = await browser.newPage()
	await page.goto('http://info.gbfteamraid.fun/web/about', { timeout: 30000 })
	await page.click('#login')
	await page.waitForNetworkIdle()
	jsessionID = (await page.cookies())[0].value
	await page.close()
}

export async function startPuppeteer(){
	browser = await launch({args: ['--single-process', '--no-zygote', '--no-sandbox']})
	console.log(`Puppeteer browser launched for Shard #${currentShardID}`)
	renewJSessionID()
	schedule('0 * * * *', () => renewJSessionID())
}
startPuppeteer()

async function getServerCount(){
	const results = await client.shard?.fetchClientValues('guilds.cache.size')
    return results?.reduce((a: any, b: any) => a + b, 0)
}

client.on('ready', () => {
    setTimeout(async () => {
        if (isHost){
            await client.shard?.broadcastEval((client: Client<boolean>, { shard }: any) => {
                (client.channels.cache.get('577636091834662915') as TextChannel).send(`:white_check_mark:  **Europa Shard #${shard} is now online**`)
            }, {shard: cryoServerShardID, context: {shard: currentShardID}})
        }
        console.log(`Shard #${currentShardID} is now online`)
		
		client.user?.setActivity('Granblue Fantasy')
		
		async function updateCounter() {
			const serverCount = await getServerCount()
            await client.shard?.broadcastEval((client: Client<boolean>, { count }: any) => {
                const cryoServer = client.guilds.cache.get('379501550097399810') as Guild;
                (cryoServer.channels.cache.get('657766651441315840') as TextChannel).edit({name: `Server Count: ${count}`});
                (cryoServer.channels.cache.get('666696864716029953') as TextChannel).edit({name: `Member Count: ${cryoServer.memberCount}`});
            }, {shard: cryoServerShardID, context: {count: serverCount}})
		}

		updateCounter()
		setInterval(() => { updateCounter() }, 1.8e+6) //Updates Europa's server count and my own server's member count every 30 minutes
	}, 10000)
})

// Slash Command Handler
client.on('interactionCreate', interaction => {
	if ((!interaction.isCommand() && !interaction.isMessageContextMenuCommand()) || !interaction.channel || interaction.channel.type === ChannelType.DM || (!isHost && interaction.user.id !== '251458435554607114')) return

	const isModCommand = modCommands.includes(`${interaction.commandName}.js`)
    const command: any = client.commands?.get(interaction.commandName)
	if (!command) {interaction.reply('Failed to load command. Please try again in a few seconds.'); return}
	if (isModCommand && !(interaction.memberPermissions?.has('ManageMessages') || interaction.user.id === '251458435554607114')){
		interaction.reply({content: 'You do not have permission to use this command.', ephemeral: true})
		return
	} 

	try {
		command.execute(interaction)
	} catch (error) {
		client.shard?.broadcastEval((client: Client, {error}: any) => {
			(client.channels.cache.get('672715578347094026') as TextChannel).send({files: [{attachment: Buffer.from(error, 'utf-8'), name: 'error.ts'}]})
		}, {shard: cryoServerShardID, context: {error: inspect(error, {depth: null})}})
		interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
	} finally {
		const logMessage = `:scroll:  **${interaction.user.tag}** ran the ${isModCommand ? 'mod ' : ''}command \`${interaction.commandName}\` in **${interaction.guild?.name}** (${interaction.guildId})`
		client.shard?.broadcastEval((client: Client, {message}: {message: string}) => {
			(client.channels.cache.get('577636091834662915') as TextChannel).send(message)
		}, {shard: cryoServerShardID, context: {message: logMessage}})
	}
})

// Create entry for new guilds for storing settings
client.on('guildCreate', async guild => {
	if (!servers) return
	const server = servers.find(server => server.guildID === guild.id)
	if (!server){
		const newServer = await privateDB.sheetsByTitle['Servers'].addRow({
			guildName: guild.name,
			guildID: `'${guild.id}`
		})
		servers.push(newServer)
	}
	const joinMessage = `:man_raising_hand:  Joined server **${guild.name}**`
	client.shard?.broadcastEval((client: Client, {message}: {message: string}) => {
		(client.channels.cache.get('577636091834662915') as TextChannel).send(message)
	}, {shard: cryoServerShardID, context: {message: joinMessage}})
})

// Greeting System
client.on('guildMemberAdd', async member => {
	const server = servers.find(server => server.guildID === member.guild.id)
	if (!server || !server.greeting) return
	const clientUser = member.guild?.members.me! as GuildMember
	const greetingSettings: greetingConfig = JSON.parse(server.greeting)
	const greetingChannel = member.guild.channels.cache.get(greetingSettings.channelID) as TextChannel

	if (greetingSettings.autoRoles.length > 0 && greetingSettings.useAutoRole){
		greetingSettings.autoRoles.forEach(roleID => {
			const role = member.guild?.roles.cache.find(role => role.id === roleID)
			if (!role || clientUser.roles.highest.position <= role.position) return
			member.roles.add(role)
		})
		member.roles.add(greetingSettings.autoRoles)
	}
	
	if (!greetingSettings.sendJoinMessage || !greetingChannel) return

	if (!greetingSettings.showJoinImage) {
		greetingChannel.send(greetingSettings.joinMessage.replace('[member]', String(member)))
		return
	}

	greetingChannel.send({content: greetingSettings.joinMessage.replace('[member]', String(member)), files: [await makeGreetingImage(greetingSettings, member.user)]})
})

client.on('guildMemberRemove', async member => {
	const server = servers.find(server => server.guildID === member.guild.id)
	if (!server || !server.greeting) return
	const greetingSettings: greetingConfig = JSON.parse(server.greeting)
	const greetingChannel = member.guild.channels.cache.get(greetingSettings.channelID) as TextChannel
	
	if (!greetingSettings.sendLeaveMessage || !greetingChannel) return
	const ban = await member.guild.bans.fetch(member.user).catch(() => {})
	if (ban?.user === member.user) return // Don't send a leave message if the user was banned rather than leaving on their own
	greetingChannel.send(greetingSettings.leaveMessage.replace('[member]', member.user.username))
})

client.on('guildBanAdd', ban => {
	const server = servers.find(server => server.guildID === ban.guild.id)
	if (!server || !server.greeting) return
	const greetingSettings: greetingConfig = JSON.parse(server.greeting)
	const greetingChannel = ban.guild.channels.cache.get(greetingSettings.channelID) as TextChannel
	
	if (!greetingSettings.sendBanMessage || !greetingChannel) return
	greetingChannel.send(greetingSettings.banMessage.replace('[member]', ban.user.username))
})

// Delete roles from the server role list if they are deleted through Discord
export interface categoryRole {id: string, category: string}
client.on('roleDelete', async role => {
	const server = servers.find(server => server.guildID === role.guild.id)
	if (!server || !server.roles) return
	const serverRoles: categoryRole[] = JSON.parse(server.roles)
	const serverRole = serverRoles.find(r => r.id === role.id)
	if (!serverRole) return

	serverRoles.splice(serverRoles.indexOf(serverRole), 1)
	server.roles = JSON.stringify(serverRoles)
	await server.save()
})

interface rawItem {
	name: string,
	drop_rate: string,
	rarity: string,
	attribute: string,
	kind: string | null,
	incidence: string | null,
	reward_id: number,
	character_name: string | null,
	is_season: boolean,
	season_message: string
}
export interface item {
	name: string,
	id: string,
	rarity: string,
	element: string,
	type: string,
	rate1: number,
	rate2: number,
	cum_rate1: number,
	cum_rate2: number,
	rate_up: boolean,
	character: string | null
}
interface bannerInfo {
	id: string,
	key: string,
	start: string,
	end: string,
	featuredItemIDs: string[],
	totalRate1: number,
	totalRate2: number,
	drawRates: {
		'SS Rare': string,
		'S Rare': string,
		'Rare': string
	}
}
export const bannerData: {bannerInfo: bannerInfo, items: item[]} = {bannerInfo: {} as bannerInfo, items: []}
async function getBannerData(){
	const gameVersion = (await axios.get('http://game.granbluefantasy.jp/')).data.match(/Game.version = "(\d+)"/i)?.[1]
	if (!gameVersion) return
	
	const headers = {
		Cookie: `wing=${accessCookie.value};ln=${languageCookie.value}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-VERSION': gameVersion
    }
	
	const bannerInfo = await axios.get('http://game.granbluefantasy.jp/gacha/list', {headers: headers})
	const banner = bannerInfo.data.legend.lineup.find((banner: {name: string}) => banner.name === 'Premium 10-Part Draw')
	const [items1Info, items2Info, featured] = await Promise.all([
		axios.get(`http://game.granbluefantasy.jp/gacha/provision_ratio/legend/${banner.id}/1`, {headers: headers}),
		axios.get(`http://game.granbluefantasy.jp/gacha/provision_ratio/legend/${banner.id}/2`, {headers: headers}),
		axios.get('https://game.granbluefantasy.jp/gacha/list', {headers: headers})
	])
	const elements = ['None', 'Fire', 'Water', 'Earth', 'Wind', 'Light', 'Dark']
	const weaponTypes = ['None', 'Sabre', 'Dagger', 'Spear', 'Axe', 'Staff', 'Gun', 'Melee', 'Bow', 'Harp', 'Katana']
	
	let cumulativeDropRate1 = 0
	let cumulativeDropRate2 = 0
	let items1: rawItem[] = items1Info.data.appear.flatMap((data: {rarity_name: string, item: rawItem[]}) => data.item.map((item) => ({...item, rarity: data.rarity_name})))
	let items2: rawItem[] = items2Info.data.appear.flatMap((data: {rarity_name: string, item: rawItem[]}) => data.item.map((item) => ({...item, rarity: data.rarity_name})))

	bannerData.items = items1.map(item1 => {
		let item2 = items2.find(item2 => item1.reward_id === item2.reward_id)
		cumulativeDropRate1 += parseFloat(item1.drop_rate)
		cumulativeDropRate2 += parseFloat(item2?.drop_rate ?? '0')
		return {
			name: `${item1.name} ${item1.season_message}`.trim(),
			id: String(item1.reward_id),
			rarity: item1.rarity,
			element: elements[parseInt(item1.attribute)],
			type: item1.kind ? weaponTypes[parseInt(item1.kind)] : 'Summon',
			rate1: parseFloat(item1.drop_rate),
			rate2: parseFloat(item2?.drop_rate ?? '0'),
			cum_rate1: parseFloat(cumulativeDropRate1.toFixed(3)),
			cum_rate2: parseFloat(cumulativeDropRate2.toFixed(3)),
			rate_up: Boolean(item1.incidence),
			character: item1.character_name
		}
	})

	bannerData.bannerInfo = {
		id: banner.id,
		key: bannerInfo.data.legend.random_key,
		start: banner.service_start,
		end: banner.service_end,
		featuredItemIDs: featured.data.header_images,
		totalRate1: parseFloat(cumulativeDropRate1.toFixed(3)),
		totalRate2: parseFloat(cumulativeDropRate2.toFixed(3)),
		drawRates: {
			'SS Rare': items1Info.data.ratio[0].ratio,
			'S Rare': items1Info.data.ratio[1].ratio,
			'Rare': items1Info.data.ratio[2].ratio,
		}
	}

	const bannerStart = new Date(dateStringToUnix(banner.service_start)!)
	const bannerMonth = bannerStart.toLocaleString('default', {month: 'long', timeZone: 'JST'})
	const bannerYear = bannerStart.toLocaleString('default', {year: 'numeric', timeZone: 'JST'})
	const app = new App({
		appId: process.env.GITHUB_APP_ID!,
		privateKey: process.env.GITHUB_PRIVATE_KEY!,
	})
	
	const octokit = await app.getInstallationOctokit(parseInt(process.env.GITHUB_INSTALLATION_ID!))
	const filePath = `/repos/Cryotalis/GBF-Banner-Data/contents/${bannerYear}/${bannerMonth}/${banner.id}.json`
	const {status} = await octokit.request(`GET ${filePath}`).catch(error => error)
	if (status !== 404) return // Do not upload if the file already exists
	await octokit.request(`PUT ${filePath}`, {
		message: `Uploaded banner data for banner ${banner.id}`,
		content: Buffer.from(JSON.stringify(bannerData, null, "\t")).toString('base64'),
	})
}
getBannerData()
schedule('0 * * * *', () => getBannerData())

client.login(process.env.BOT_TOKEN)

// Check every hour, if memory exceeds 400MB, stop accepting commands and kill the shard.
schedule('0 * * * *', () => {
	if (process.memoryUsage().heapUsed / 1024 / 1024 > 400){
		client.shard?.broadcastEval(client => process.exit())
	}
})

process.on('uncaughtException', error => {
	client.shard?.broadcastEval((client: Client, {error}: any) => {
		(client.channels.cache.get('672715578347094026') as TextChannel)?.send({files: [{attachment: Buffer.from(error, 'utf-8'), name: 'error.ts'}]})
	}, {shard: cryoServerShardID, context: {error: inspect(error, {depth: null})}})
})