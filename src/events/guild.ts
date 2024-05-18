import { Client, TextChannel, GuildMember, Guild, PartialGuildMember } from "discord.js"
import { client, servers, privateDB, homeServerShardID, logChannelID } from "../bot"
import { greetingConfig, makeGreetingImage } from "../modules/greeting"

/**
 * Adds new servers to the database and logs the server in the log channel
 */
export async function handleNewGuild(guild: Guild) {
	if (!servers) return
	const server = servers.find(server => server.get('guildID') === guild.id)
	if (!server){
		const newServer = await privateDB.sheetsByTitle['Servers'].addRow({guildName: guild.name, guildID: `'${guild.id}`})
		servers.push(newServer)
	}

	const joinMessage = `:man_raising_hand:  Joined server **${guild.name}**`
	client.shard?.broadcastEval((client: Client, {logChannelID, message}: {logChannelID: string, message: string}) => {
		(client.channels.cache.get(logChannelID) as TextChannel).send(message)
	}, {shard: homeServerShardID, context: {logChannelID: logChannelID, message: joinMessage}})
}

/**
 * Handles auto-roles and sends a join message (if enabled) when a member joins the server
 */
export async function handleNewMember(member: GuildMember) {
	const server = servers.find(server => server.get('guildID') === member.guild.id)
	if (!server?.get('greeting')) return

	const clientUser = member.guild.members.me! as GuildMember
	const greetingSettings: greetingConfig = JSON.parse(server.get('greeting'))
    const {channelID, useAutoRole, autoRoles, sendJoinMessage, joinMessage, showJoinImage} = greetingSettings
	const greetingChannel = member.guild.channels.cache.get(channelID) as TextChannel

	if (useAutoRole && autoRoles.length > 0){
		autoRoles.forEach(roleID => {
			const role = member.guild.roles.cache.find(role => role.id === roleID)
            const roleIsAssignable = role && clientUser.roles.highest.position > role.position
			if (roleIsAssignable) member.roles.add(role)
		})
	}
	
	if (!sendJoinMessage || !greetingChannel) return

    greetingChannel.send({
        content: joinMessage.replace('[member]', String(member)),
        files: showJoinImage ? [await makeGreetingImage(greetingSettings, member.user)] : []
    })
}

/**
 * Sends a leave or ban message when a member leaves the server
 */
export async function handleRemovedMember(member: GuildMember | PartialGuildMember) {
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
}