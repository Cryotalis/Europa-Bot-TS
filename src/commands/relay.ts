import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'
import { database } from '../data/database.js'
import { eventChoices } from '../data/events.js'

const eventOption = (op: SlashCommandStringOption) => op
    .setName('event')
    .setDescription('The event to relay to your server')
    .setChoices(eventChoices)
    .setRequired(true)

export const command = {
	data: new SlashCommandBuilder()
		.setName('relay')
		.setDescription('Relay in-game events to your server as Discord events')
        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add an event to the relay')
            .addStringOption(eventOption)
        )
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove an event from the relay')
            .addStringOption(eventOption)
        )
        .addSubcommand(subcommand => subcommand
            .setName('settings')
            .setDescription('Check which events are being relayed to your server')
        )
	,
	async execute(interaction: ChatInputCommandInteraction) {
        if (!database.variables[1].get('value').includes(interaction.user.id)) {
            return interaction.reply('Sorry, this command is not available yet <:blue:725143925396078643>')
        }

		const server = database.servers.find(server => server.get('guildID') === interaction.guildId)
		if (!server) return interaction.reply('Unable to access settings for your server.')

        const myPermissions = interaction.guild!.members.me!.permissions
        if (!myPermissions.has('CreateEvents') || !myPermissions.has('ManageEvents')) {
            return interaction.reply('I need the `Create Events` and `Manage Events` permissions for this feature!')
        }

        const eventInput = interaction.options.getString('event')!
        const command = interaction.options.getSubcommand()
        let serverEvents: string[] = JSON.parse(server.get('events') || '[]')
		
        switch (command) {
            case 'add':
                if (/All/.test(eventInput)) {
                    serverEvents = [eventInput]
                } else {
                    serverEvents = serverEvents.filter(eventName => !/All/.test(eventName))
                    serverEvents.push(eventInput)
                }
                break;
            case 'remove':
                serverEvents = !/All/.test(eventInput) 
                    ? serverEvents.filter(eventName => eventName !== eventInput)
                    : []
                break;
        }

		server.set('events', JSON.stringify(serverEvents))
		server.save()

		const relayEmbed = new EmbedBuilder()
			.setAuthor({
				name: 'Server Events Relay ' + (command === 'settings' ? 'Settings' : 'Updated'),
				iconURL: interaction.guild?.iconURL({extension: 'png'}) ?? undefined
			})
			.setDescription(
                serverEvents.length
                    ? `Currently relaying the following events: ${serverEvents.map(e => `\`${e}\``).join(', ')}`
                    : 'Currently not relaying any events.'
            )
            .setColor('Blue')

		interaction.reply({embeds: [relayEmbed]})
	}
}