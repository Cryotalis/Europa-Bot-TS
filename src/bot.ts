import { ChannelType, Client, Collection, GatewayIntentBits, Guild, REST, Routes, ShardClientUtil, TextChannel } from 'discord.js'
import { schedule } from 'node-cron'
import { inspect } from 'util'
import { readdirSync } from 'node:fs'
import { Browser, launch } from 'puppeteer'
import { loadAssets } from './data/assets.js'
import { loadEvents, relayEvents, sendEventReminders } from './commandHelpers/events.js'
import { getBannerData } from './commandHelpers/banner.js'
import { registerFont } from 'canvas'
import { handleNewGuild, handleNewMember, handleRemovedMember } from './events/guild.js'
import { handleDeletedRole } from './events/role.js'
import { handleAutocomplete, handleCommand } from './events/interaction.js'
import { connectDatabase, database, getCharacterData, getSummonData } from './data/database.js'
import { getAccessToken } from './commandHelpers/image.js'

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
		const { command } = regCommands.includes(file) 
			? await import(`./commands/${file}`) 
			: await import(`./modCommands/${file}`)

		if (privateCommandFiles.includes(file)) 
			privateCommands.push(command.data.toJSON())
		else 
			commands.push(command.data.toJSON())

		client.commands.set(command.data.name, command)
	}

	const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN!)
	rest.put(Routes.applicationCommands(botID), { body: commands })
		.then(() => console.log(`Successfully registered application commands globally for Shard #${currentShardID}`))
		.catch(console.error)

	rest.put(Routes.applicationGuildCommands(botID, homeServerID), { body: privateCommands })
		.catch(console.error)
}

export let browser: Browser
export async function startPuppeteer(){
	browser = await launch({args: ['--single-process', '--no-zygote', '--no-sandbox']})
	console.log(`Puppeteer browser launched for Shard #${currentShardID}`)
}

async function updateCounter() {
	if (currentShardID !== homeServerShardID) return

	const serverCounts = await client.shard?.fetchClientValues('guilds.cache.size')
	const serverCount = serverCounts?.reduce((a: any, b: any) => a + b, 0)
	const homeServer = client.guilds.cache.get(homeServerID)
	const serverCountChannel = homeServer?.channels.cache.get('657766651441315840')

	serverCountChannel?.edit({name: `Server Count: ${serverCount}`})
}

client.on('ready', async () => {
	console.log(`Shard #${currentShardID} is now online`)
	client.user?.setActivity('Granblue Fantasy')

	// Run startup functions
	startPuppeteer()
	getBannerData()
	await connectDatabase()
	registerCommands()
	await loadAssets()
	loadEvents()

	schedule('0 * * * *', async () => {
		getBannerData()
		await connectDatabase()
		await loadEvents()
		if (currentShardID === homeServerShardID) {
			relayEvents()
			sendEventReminders()
		}
	})
	
	if (currentShardID === homeServerShardID) {
		(client.channels.cache.get(logChannelID) as TextChannel).send(`:white_check_mark:  **Europa is now online**`)

		// Runs at 23:55 every day. The 5 minutes is to allow time to fetch the data before the database connection is refreshed
		schedule('55 23 * * *', () => {
			// getCharacterData()
			// getSummonData()
			updateCounter()
		})

		// Regenerate a new Imgur access token every week
		schedule('0 0 * * 0', async () => {
			const newAccessToken = await getAccessToken().catch(() => undefined)
			if (newAccessToken) {
				const imgurAccessToken = database.variables.find(v => v.get('key') === 'IMGUR_ACCESS_TOKEN')!
				imgurAccessToken.set('value', newAccessToken)
				imgurAccessToken.save()
			}
		})
	}
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