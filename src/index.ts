import { ShardingManager } from 'discord.js'
import { botToken } from './config.js'

const manager = new ShardingManager('./prod/bot.js', { token: botToken })

manager.on('shardCreate', shard => {
    console.log(`[${new Date().toString().split(' ', 5).join(' ')}] Launched Shard #${shard.id}`)
})

manager.spawn().catch(() => {})