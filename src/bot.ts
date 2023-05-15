import { ChannelType, Client, Collection, GatewayIntentBits, Guild, GuildMember, REST, Routes, ShardClientUtil, TextChannel } from 'discord.js'
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet'
import { schedule } from 'node-cron'
import { inspect } from 'util'
import fs from 'node:fs'
import os from 'os'
import { Browser, launch } from 'puppeteer'
import axios from 'axios'
import { accessCookie, languageCookie } from './modules/variables'
import { greetingConfig, makeGreetingImage } from './modules/greeting-helpers'

export const client: Client<boolean> & {commands?: Collection<unknown, unknown>} = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration]})
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
	await page.goto('http://info.gbfteamraid.fun/web/about', { timeout: 5000 })
	await page.click('#login')
	await page.waitForNetworkIdle()
	jsessionID = (await page.cookies())[0].value
	await page.close()
	setTimeout(() => renewJSessionID(), 1.8e+6)
}
async function startPuppeteer(){
	browser = await launch({args: ['--single-process', '--no-zygote', '--no-sandbox']})
	console.log(`Puppeteer browser launched for Shard #${currentShardID}`)
	renewJSessionID()
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
		
		client.user?.setActivity('/help')
		while (!sparkProfiles){setTimeout(() => {}, 1000)}
		setInterval(async () => { 
			const serverCount = await getServerCount()
			const status = [`/help`, `${serverCount} servers`, `https://cryotalis.github.io/Europa`, `${sparkProfiles.length} spark profiles`] //Array of status messages for the bot to switch through
			
			let index = 0
			client.user!.setActivity(status[index])
			index++
			if (index > status.length - 1) { index = 0 }
		}, 300000) //Rotates through status messages every 5 minutes
		
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
	drop_rate: number,
	weight: number,
	rate_up: boolean,
	character: string | null
}
export let items1: item[] = []
export let items2: item[] = []
export let featuredItemIDs: string[]
export let bannerDuration: {start: string, end: string}
async function getBannerData(){
	items1 = [], items2 = [] // Clear the items before each run
    const gameVersion = (await axios.get('http://game.granbluefantasy.jp/')).data.match(/Game.version = "(\d+)"/i)?.[1]
	if (!gameVersion) return
	const headers = {
        Cookie: `wing=${accessCookie.value};ln=${languageCookie.value}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-VERSION': gameVersion
    }

	const bannerInfo = await axios.get('http://game.granbluefantasy.jp/gacha/list', {headers: headers})
	const banner = bannerInfo.data.legend.lineup.find((banner: {name: string}) => banner.name === 'Premium 10-Part Draw')
	bannerDuration = {start: banner.service_start, end: banner.service_end}
	const [items1Info, items2Info, featured] = await Promise.all([
		axios.get(`http://game.granbluefantasy.jp/gacha/provision_ratio/legend/${banner.id}/1`, {headers: headers}),
		axios.get(`http://game.granbluefantasy.jp/gacha/provision_ratio/legend/${banner.id}/2`, {headers: headers}),
		axios.get('https://game.granbluefantasy.jp/gacha/list', {headers: headers})
	])
	featuredItemIDs = featured.data.header_images
	const elements = ['None', 'Fire', 'Water', 'Earth', 'Wind', 'Light', 'Dark']
	const weaponTypes = ['None', 'Sabre', 'Dagger', 'Spear', 'Axe', 'Staff', 'Gun', 'Melee', 'Bow', 'Harp', 'Katana']

	let cumulativeDropRate1 = 0
	items1Info.data.appear.forEach(({item, rarity_name}: {item: rawItem[], rarity_name: string}) => {
		items1 = items1.concat(
			item.map((item: rawItem) => {
				cumulativeDropRate1 += parseFloat(item.drop_rate)
				return {
					name: item.name + (item.is_season ? ` ${item.season_message}` : ''),
					id: String(item.reward_id),
					rarity: rarity_name,
					element: elements[parseInt(item.attribute)],
					type: item.kind ? weaponTypes[parseInt(item.kind)] : 'Summon',
					drop_rate: parseFloat(item.drop_rate),
					weight: parseFloat(cumulativeDropRate1.toFixed(3)),
					rate_up: Boolean(item.incidence),
					character: item.character_name
				}
			})
		)
	})

	let cumulativeDropRate2 = 0
	items2Info.data.appear.forEach(({item, rarity_name}: {item: rawItem[], rarity_name: string}) => {
		items2 = items2.concat(
			item.map((item: rawItem) => {
				cumulativeDropRate2 += parseFloat(item.drop_rate)
				return {
					name: item.name,
					id: String(item.reward_id),
					rarity: rarity_name,
					element: elements[parseInt(item.attribute)],
					type: item.kind ? weaponTypes[parseInt(item.kind)] : 'Summon',
					drop_rate: parseFloat(item.drop_rate),
					weight: parseFloat(cumulativeDropRate2.toFixed(3)),
					rate_up: Boolean(item.incidence),
					character: item.character_name
				}
			})
		)
	})
}
getBannerData()
schedule('0 * * * *', () => getBannerData())

client.login(process.env.BOT_TOKEN)

// Check every hour, if memory exceeds 400MB, stop accepting commands and kill the shard after 1 minute.
schedule('0 * * * *', () => {
	if (process.memoryUsage().heapUsed / 1024 / 1024 > 400){
		isHost = false
		setTimeout(() => process.exit(), 6e+4)
	}
})

process.on('uncaughtException', error => {
	client.shard?.broadcastEval((client: Client, {error}: any) => {
		(client.channels.cache.get('672715578347094026') as TextChannel)?.send({files: [{attachment: Buffer.from(error, 'utf-8'), name: 'error.ts'}]})
	}, {shard: cryoServerShardID, context: {error: inspect(error, {depth: null})}})
})