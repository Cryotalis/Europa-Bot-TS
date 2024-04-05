import { ChannelType, Client, Collection, GatewayIntentBits, Guild, GuildMember, REST, Role, Routes, ShardClientUtil, TextChannel } from 'discord.js'
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet'
import { schedule } from 'node-cron'
import { inspect } from 'util'
import fs from 'node:fs'
import { Browser, launch } from 'puppeteer'
import { greetingConfig, makeGreetingImage } from './modules/greeting'
import { JWT } from 'google-auth-library'
import { loadAssets } from './modules/assets'
import { createScheduledEvents, loadEvents } from './modules/events'
import { getBannerData } from './modules/banner'
import { registerFont } from 'canvas'

export const client: Client<boolean> & {commands?: Collection<unknown, unknown>} = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration], rest: {timeout: 60000}})
export const homeServerShardID = ShardClientUtil.shardIdForGuildId('379501550097399810', client.shard?.count!)
export const currentShardID = client.shard?.ids[0]

export const fontFallBacks = 'Noto Serif SC Noto Serif TC Noto Serif JP Code2000'
registerFont('assets/Code2000.TTF', {family: 'Code2000'})
registerFont('assets/NotoSerifSC.otf', {family: 'Noto Serif SC'})
registerFont('assets/NotoSerifTC.otf', {family: 'Noto Serif TC'})
registerFont('assets/NotoSerifJP.otf', {family: 'Noto Serif JP'})
registerFont(require('@canvas-fonts/arial'), {family: 'Default'})
registerFont(require('@canvas-fonts/arial-bold'), {family: 'Default Bold'})

const privateCommandFiles = ['connect.js', 'say.js', 'respawn.js']
const regCommands = fs.readdirSync('./prod/commands').filter(file => file.endsWith('.js'))
const modCommands = fs.readdirSync('./prod/modCommands').filter(file => file.endsWith('.js'))
const commandFiles = regCommands.concat(modCommands)

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
	rest.put(Routes.applicationCommands('585514230967566338'), { body: commands })
		.then(() => console.log(`Successfully registered application commands globally for Shard #${currentShardID}`))
		.catch(console.error)

	rest.put(Routes.applicationGuildCommands('585514230967566338', '379501550097399810'), { body: privateCommands })
		.catch(console.error)
}

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
	await page.goto('http://info.gbfteamraid.fun/web/about', { timeout: 30000 })
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
	const homeServer = client.guilds.cache.get('379501550097399810') as Guild
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

client.on('ready', async () => {
	console.log(`Shard #${currentShardID} is now online`)
	client.user?.setActivity('Granblue Fantasy')
	startUp()
	
	if (currentShardID !== homeServerShardID) return
	
	(client.channels.cache.get('577636091834662915') as TextChannel).send(`:white_check_mark:  **Europa is now online**`)
})

// Slash Command Handler
client.on('interactionCreate', interaction => {
	if ((!interaction.isCommand() && !interaction.isMessageContextMenuCommand()) || !interaction.channel || interaction.channel.type === ChannelType.DM) return

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
		}, {shard: homeServerShardID, context: {error: inspect(error, {depth: null})}})
		interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
	} finally {
		const logMessage = `:scroll:  **${interaction.user.username}** (${interaction.user.id}) ran the ${isModCommand ? 'mod ' : ''}command \`${interaction.commandName}\` in **${interaction.guild?.name}** (${interaction.guildId})`
		client.shard?.broadcastEval((client: Client, {message}: any): void => {
			(client.channels.cache.get('577636091834662915') as TextChannel).send(message)
		}, {shard: homeServerShardID, context: {message: logMessage}})
	}
})

// Create entry for new guilds for storing settings
client.on('guildCreate', async guild => {
	if (!servers) return
	const server = servers.find(server => server.get('guildID') === guild.id)
	if (!server){
		const newServer = await privateDB.sheetsByTitle['Servers'].addRow({
			guildName: guild.name,
			guildID: `'${guild.id}`
		})
		servers.push(newServer)
	}
	const joinMessage = `:man_raising_hand:  Joined server **${guild.name}**`
	client.shard?.broadcastEval((client: Client, {message}: any): void => {
		(client.channels.cache.get('577636091834662915') as TextChannel).send(message)
	}, {shard: homeServerShardID, context: {message: joinMessage}})
})

// Greeting System
client.on('guildMemberAdd', async member => {
	const server = servers.find(server => server.get('guildID') === member.guild.id)
	if (!server?.get('greeting')) return
	const clientUser = member.guild?.members.me! as GuildMember
	const greetingSettings: greetingConfig = JSON.parse(server.get('greeting'))
	const greetingChannel = member.guild.channels.cache.get(greetingSettings.channelID) as TextChannel

	if (greetingSettings.autoRoles.length > 0 && greetingSettings.useAutoRole){
		greetingSettings.autoRoles.forEach(roleID => {
			const role = member.guild?.roles.cache.find((role: Role) => role.id === roleID)
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
	const server = servers.find(server => server.get('guildID') === member.guild.id)
	if (!server?.get('greeting')) return
	const greetingSettings: greetingConfig = JSON.parse(server.get('greeting'))
	const greetingChannel = member.guild.channels.cache.get(greetingSettings.channelID) as TextChannel
	
	if (!greetingSettings.sendLeaveMessage || !greetingChannel) return
	const ban = await member.guild.bans.fetch(member.user).catch(() => {})
	if (ban?.user === member.user) return // Don't send a leave message if the user was banned rather than leaving on their own
	greetingChannel.send(greetingSettings.leaveMessage.replace('[member]', member.user.username))
})

client.on('guildBanAdd', ban => {
	const server = servers.find(server => server.get('guildID') === ban.guild.id)
	if (!server?.get('greeting')) return
	const greetingSettings: greetingConfig = JSON.parse(server.get('greeting'))
	const greetingChannel = ban.guild.channels.cache.get(greetingSettings.channelID) as TextChannel
	
	if (!greetingSettings.sendBanMessage || !greetingChannel) return
	greetingChannel.send(greetingSettings.banMessage.replace('[member]', ban.user.username))
})

// Delete roles from the server role list if they are deleted through Discord
export interface categoryRole {id: string, category: string}
client.on('roleDelete', async role => {
	const server = servers.find(server => server.get('guildID') === role.guild.id)
	if (!server?.get('roles')) return
	const serverRoles: categoryRole[] = JSON.parse(server.get('roles'))
	const serverRole = serverRoles.find(r => r.id === role.id)
	if (!serverRole) return

	serverRoles.splice(serverRoles.indexOf(serverRole), 1)
	server.set('roles', JSON.stringify(serverRoles))
	await server.save()
})

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
	}, {shard: homeServerShardID, context: {error: inspect(error, {depth: null})}})
})