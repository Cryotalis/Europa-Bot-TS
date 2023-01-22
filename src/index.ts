import { ShardingManager } from 'discord.js'

const manager = new ShardingManager('./prod/bot.js', {
    token: process.env.BOT_TOKEN,
    totalShards: 'auto'
})

manager.on('shardCreate', shard => {
    console.log(`[${new Date().toString().split(' ', 5).join(' ')}] Launched Shard #${shard.id}`)
})
manager.spawn({amount: manager.totalShards, delay: 10000, timeout: -1})