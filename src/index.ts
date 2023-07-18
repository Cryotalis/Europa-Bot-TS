import { ShardingManager } from 'discord.js'

const manager = new ShardingManager('./prod/bot.js', {token: process.env.BOT_TOKEN})

manager.on('shardCreate', shard => {
    console.log(`[${new Date().toString().split(' ', 5).join(' ')}] Launched Shard #${shard.id}`)
})

manager.spawn({amount: 'auto', delay: 10000, timeout: -1})