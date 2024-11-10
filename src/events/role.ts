import { Role } from "discord.js"
import { categoryRole } from "../data/variables.js"
import { database } from "../data/database.js"

/**
 * Delete roles from the server role list if they are deleted through Discord
 */
export async function handleDeletedRole(role: Role) {
	const server = database.servers.find(server => server.get('guildID') === role.guild.id)
	if (!server?.get('roles')) return
	
	const serverRoles: categoryRole[] = JSON.parse(server.get('roles'))
	const deletedRole = serverRoles.find(r => r.id === role.id)
	if (!deletedRole) return

	serverRoles.splice(serverRoles.indexOf(deletedRole), 1)
	server.set('roles', JSON.stringify(serverRoles))
	server.save()
}