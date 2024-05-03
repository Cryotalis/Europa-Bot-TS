import { Client, TextChannel, GuildMember } from "discord.js"
import { client, servers, privateDB, homeServerShardID } from "../bot"
import { greetingConfig, makeGreetingImage } from "../modules/greeting"

// Create an entry in the database when joining a guild for the first time
client.on('guildCreate', async guild => {
	if (!servers) return
	const server = servers.find(server => server.get('guildID') === guild.id)
	if (!server){
		const newServer = await privateDB.sheetsByTitle['Servers'].addRow({guildName: guild.name, guildID: `'${guild.id}`})
		servers.push(newServer)
	}

	const joinMessage = `:man_raising_hand:  Joined server **${guild.name}**`
	client.shard?.broadcastEval((client: Client, {message}: any): void => {
		(client.channels.cache.get('577636091834662915') as TextChannel).send(message)
	}, {shard: homeServerShardID, context: {message: joinMessage}})
})

// Greeting System - Join Messages
client.on('guildMemberAdd', async member => {
	const server = servers.find(server => server.get('guildID') === member.guild.id)
	if (!server?.get('greeting')) return

	const clientUser = member.guild?.members.me! as GuildMember
	const greetingSettings: greetingConfig = JSON.parse(server.get('greeting'))
    const {channelID, autoRoles, useAutoRole, sendJoinMessage, joinMessage, showJoinImage} = greetingSettings
	const greetingChannel = member.guild.channels.cache.get(channelID) as TextChannel

	if (autoRoles.length > 0 && useAutoRole){
		autoRoles.forEach(roleID => {
			const role = member.guild?.roles.cache.find(role => role.id === roleID)
            const roleIsAssignable = !!(role && clientUser.roles.highest.position > role.position)
			if (roleIsAssignable) member.roles.add(role)
		})
	}
	
	if (!sendJoinMessage || !greetingChannel) return

    greetingChannel.send({
        content: joinMessage.replace('[member]', String(member)),
        files: showJoinImage ? [await makeGreetingImage(greetingSettings, member.user)] : []
    })
})

// Greeting System - Leave & Ban Messages
client.on('guildMemberRemove', async member => {
	const server = servers.find(server => server.get('guildID') === member.guild.id)
	if (!server?.get('greeting')) return

	const greetingSettings: greetingConfig = JSON.parse(server.get('greeting'))
    const {channelID, leaveMessage, banMessage, sendLeaveMessage, sendBanMessage} = greetingSettings
	const greetingChannel = member.guild.channels.cache.get(channelID) as TextChannel
	if (!greetingChannel) return
	
	const userIsBanned = await member.guild.bans.fetch(member.user).catch(() => {})
	
	if (userIsBanned) {
        if (sendBanMessage) greetingChannel.send(banMessage.replace('[member]', member.user.username))
    } else {
        if (sendLeaveMessage) greetingChannel.send(leaveMessage.replace('[member]', member.user.username))
    }
})