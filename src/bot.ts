import { ChannelType, Client, Collection, GatewayIntentBits, Guild, REST, Routes, ShardClientUtil, TextChannel } from 'discord.js'
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet'
import { schedule } from 'node-cron'
import { inspect } from 'util'
import { readdirSync } from 'node:fs'
import { Browser, launch } from 'puppeteer'
import { JWT } from 'google-auth-library'
import { loadAssets } from './data/assets'
import { createScheduledEvents, loadEvents } from './modules/events'
import { getBannerData } from './modules/banner'
import { registerFont } from 'canvas'
import { handleNewGuild, handleNewMember, handleRemovedMember } from './events/guild'
import { handleDeletedRole } from './events/role'
import { handleAutocomplete, handleCommand } from './events/interaction'

export const client: Client<boolean> & {commands?: Collection<unknown, unknown>} = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration], rest: {timeout: 60000}})
export const botID = '585514230967566338'
export const homeServerID = '379501550097399810'
export const homeServerShardID = ShardClientUtil.shardIdForGuildId(homeServerID, client.shard?.count!)
export const currentShardID = client.shard?.ids[0]
export const logChannelID = '577636091834662915'
export const errorChannelID = '672715578347094026'

export const fontFallBacks = 'Noto Serif SC Noto Serif TC Noto Serif JP Code2000'
registerFont('assets/Arial.ttf', {family: 'Default'})
registerFont('assets/Arial Bold.ttf', {family: 'Default Bold'})
registerFont('assets/NotoSerifSC.otf', {family: 'Noto Serif SC'})
registerFont('assets/NotoSerifTC.otf', {family: 'Noto Serif TC'})
registerFont('assets/NotoSerifJP.otf', {family: 'Noto Serif JP'})
registerFont('assets/Code2000.ttf', {family: 'Code2000'})

export const privateCommandFiles = ['connect.js', 'say.js', 'respawn.js']
export const regCommands = readdirSync('./prod/commands').filter(file => file.endsWith('.js'))
export const modCommands = readdirSync('./prod/modCommands').filter(file => file.endsWith('.js'))
export const commandFiles = regCommands.concat(modCommands)

export async function registerCommands() {
	const commands = []
	const privateCommands = []
	client.commands = new Collection()

	for (const file of commandFiles) {
		const command = regCommands.includes(file) ? require(`./commands/${file}`) : require(`./modCommands/${file}`)
		if (privateCommandFiles.includes(file)) privateCommands.push(command.data.toJSON())
		else {
			commands.push(command.data.toJSON())
		}
		client.commands.set(command.data.name, command)
	}

	const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN!)
	rest.put(Routes.applicationCommands(botID), { body: commands })
		.then(() => console.log(`Successfully registered application commands globally for Shard #${currentShardID}`))
		.catch(console.error)

	rest.put(Routes.applicationGuildCommands(botID, homeServerID), { body: privateCommands })
		.catch(console.error)
}

/**
 * - If category is defined, the role can be assigned by members.
 * - If raid is defined, the role is tied to a raid for use with /raidcode.
 * - At least one of category or raid should always be defined.
 */
export interface categoryRole {id: string, category?: string, raid?: string}
export interface serverData {guildName: string, guildID: string, greeting: string, roles: string, events: string}
export interface userData {
	username: string,	userID: string,
	crystals: string,	mobaCoin: string,
	tickets: string,    tenParts: string,
	rolls: string, 		background: string,
	sparkTitle: string
}
export let publicDB: GoogleSpreadsheet
export let privateDB: GoogleSpreadsheet
export let servers: Array<GoogleSpreadsheetRow<serverData>>
export let users: Array<GoogleSpreadsheetRow<userData>>
export let announcements: Array<GoogleSpreadsheetRow>
export let data: Array<GoogleSpreadsheetRow>

const serviceAccountAuth = new JWT({
	email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
	key: process.env.GOOGLE_PRIVATE_KEY,
	scopes: ['https://www.googleapis.com/auth/spreadsheets']
})
export async function connectToDB(){
    publicDB = new GoogleSpreadsheet('1H5oCUOvKSN5AAo_tQvr7ElhDIJxhuYVpaJCbbyFeA0E', serviceAccountAuth)
    await publicDB.loadInfo()
	
    privateDB = new GoogleSpreadsheet(process.env.PRIVATE_DB_ID!, serviceAccountAuth)
    await privateDB.loadInfo()

	;[servers, users, announcements, data] = await Promise.all([
		privateDB.sheetsByTitle['Servers'].getRows(),
		privateDB.sheetsByTitle['Users'].getRows(),
		privateDB.sheetsByTitle['Announcements'].getRows(),
		publicDB.sheetsByTitle['Data'].getRows(),
	])

	console.log(`Database connection successful for Shard #${currentShardID}`)
}

export let browser: Browser
export let jsessionID: string // Required for player name search
async function getJSessionID(){
	const page = await browser.newPage()
	const res = await page.goto('http://info.gbfteamraid.fun/web/about', { timeout: 30000 }).catch(() => null)
	if (!res) return
	await page.click('#login')
	await page.waitForNetworkIdle()
	jsessionID = (await page.cookies())[0].value
	await page.close()
}

export async function startPuppeteer(){
	browser = await launch({args: ['--single-process', '--no-zygote', '--no-sandbox']})
	console.log(`Puppeteer browser launched for Shard #${currentShardID}`)
	getJSessionID()
	schedule('0 * * * *', () => getJSessionID())
}

async function updateCounter() {
	if (currentShardID !== homeServerShardID) return
	const serverCounts = await client.shard?.fetchClientValues('guilds.cache.size')
	const serverCount = serverCounts?.reduce((a: any, b: any) => a + b, 0)
	const homeServer = client.guilds.cache.get(homeServerID) as Guild
	;(homeServer.channels.cache.get('657766651441315840') as TextChannel).edit({name: `Server Count: ${serverCount}`})
	;(homeServer.channels.cache.get('666696864716029953') as TextChannel).edit({name: `Member Count: ${homeServer.memberCount}`})
}

async function startUp(){
	startPuppeteer()
	getBannerData()
	await connectToDB()
	registerCommands()
	await loadAssets()
	loadEvents()

	schedule('0 * * * *', async () => {
		getBannerData()
		updateCounter()
		await connectToDB()
		await loadEvents()
		createScheduledEvents()
	})
}

client.on('ready', () => {
	console.log(`Shard #${currentShardID} is now online`)
	client.user?.setActivity('Granblue Fantasy')
	startUp()
	
	if (currentShardID !== homeServerShardID) return
	
	(client.channels.cache.get(logChannelID) as TextChannel).send(`:white_check_mark:  **Europa is now online**`)
})

client.on('interactionCreate', interaction => {
	if (!interaction.channel || interaction.channel.type === ChannelType.DM) return
	
	if (interaction.isAutocomplete()) handleAutocomplete(interaction)

	if (interaction.isCommand()) handleCommand(interaction)
})

client.on('guildCreate', guild => handleNewGuild(guild))
client.on('guildMemberAdd', member => handleNewMember(member))
client.on('guildMemberRemove', member => handleRemovedMember(member))

client.on('roleDelete', role => handleDeletedRole(role))

client.login(process.env.BOT_TOKEN)

// Check every hour - if memory exceeds 400MB, force the shard to respawn
schedule('0 * * * *', () => {
	if (process.memoryUsage().heapUsed / 1024 / 1024 > 400){
		client.shard?.broadcastEval(client => process.exit())
	}
})

process.on('uncaughtException', error => {
	client.shard?.broadcastEval((client: Client, {errorChannelID, error}: {errorChannelID: string, error: string}) => {
		(client.channels.cache.get(errorChannelID) as TextChannel).send({files: [{attachment: Buffer.from(error, 'utf-8'), name: 'error.ts'}]})
	}, {shard: homeServerShardID, context: {errorChannelID: errorChannelID, error: inspect(error, {depth: null})}})
})