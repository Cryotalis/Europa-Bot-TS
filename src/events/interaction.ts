import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, Client, MessageContextMenuCommandInteraction, TextChannel, UserContextMenuCommandInteraction } from "discord.js"
import { findBestCIMatch } from "../modules/string"
import { raids } from "../data/raids"
import { inspect } from "util"
import { client, errorChannelID, homeServerShardID, logChannelID, modCommands } from "../bot"

/*
 * Handles Autocomplete interactions
 */
export function handleAutocomplete(interaction: AutocompleteInteraction<CacheType>) {
    switch (interaction.commandName) {
        case 'rolelist':
            const focusedOption = interaction.options.getFocused(true)
            if (focusedOption.name !== 'raid') return
            
            const ratedChoices = findBestCIMatch(focusedOption.value, raids.map(({name}) => name)).ratings
            const bestChoices = ratedChoices.sort((a, b) => b.rating - a.rating)
            const results = bestChoices.slice(0, 10).map(({target}) => ({
                name: target, 
                value: raids.find(({name}) => name === target)!.value
            }))
    
            return interaction.respond(results).catch(() => {})
    }
}

/*
 * Handles slash commands and context menu commands
 */
export function handleCommand(interaction: ChatInputCommandInteraction<CacheType> | MessageContextMenuCommandInteraction<CacheType> | UserContextMenuCommandInteraction<CacheType>){
    const isModCommand = modCommands.includes(`${interaction.commandName}.js`)
    const command: any = client.commands?.get(interaction.commandName)
	if (!command) {interaction.reply('Failed to load command. Please try again in a few seconds.'); return}
	if (isModCommand && !(interaction.memberPermissions?.has('ManageMessages') || interaction.user.id === '251458435554607114')){
		return interaction.reply({content: 'You do not have permission to use this command.', ephemeral: true})
	}

	try {
		command.execute(interaction)
	} catch (error) {
		client.shard?.broadcastEval((client: Client, {errorChannelID, error}: {errorChannelID: string, error: string}) => {
			(client.channels.cache.get(errorChannelID) as TextChannel).send({files: [{attachment: Buffer.from(error, 'utf-8'), name: 'error.ts'}]})
		}, {shard: homeServerShardID, context: {errorChannelID: errorChannelID, error: inspect(error, {depth: null})}})
		interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
	} finally {
		const logMessage = `:scroll:  **${interaction.user.username}** (${interaction.user.id}) ran the ${isModCommand ? 'mod ' : ''}command \`${interaction.commandName}\` in **${interaction.guild?.name}** (${interaction.guildId})`
		client.shard?.broadcastEval((client: Client, {logChannelID, message}: {logChannelID: string, message: string}) => {
			(client.channels.cache.get(logChannelID) as TextChannel).send(message)
		}, {shard: homeServerShardID, context: {logChannelID: logChannelID, message: logMessage}})
	}
}