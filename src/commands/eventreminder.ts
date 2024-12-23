import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'
import { eventChoices, eventReminder } from '../data/events.js'
import { database, serverData, userData } from '../data/database.js'
import { GoogleSpreadsheetRow } from 'google-spreadsheet'

const eventOption = (option: SlashCommandStringOption) => option
    .setName('event')
    .setDescription('The event you\'d like to create or delete a reminder for')
    .addChoices(eventChoices)
    .setRequired(true)

export const command = {
	data: new SlashCommandBuilder()
        .setName('eventreminder')
        .setDescription('Set reminders that trigger when events are ending soon')
        .addSubcommand(subcommand => subcommand
            .setName('create')
            .setDescription('Create a new reminder for an event')
            .addStringOption(eventOption)
            .addChannelOption(option => option
                .setName('channel')
                .setDescription('The channel to send the reminder in (server only)')
            )
            .addRoleOption(option => option
                .setName('role')
                .setDescription('The role to ping in the reminder message (server only)')
            )
            .addIntegerOption(option => option
                .setName('time')
                .setDescription('Time in hours before the event ends to send the reminder')
                .setMinValue(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('delete')
            .setDescription('Delete a reminder for an event')
            .addStringOption(eventOption)
        )
        .addSubcommand(subcommand => subcommand
            .setName('settings')
            .setDescription('See your active event reminders')
        )
	,
	async execute(interaction: ChatInputCommandInteraction) {
        if (!database.variables[1].get('value').includes(interaction.user.id)) {
            return interaction.reply('Sorry, this command is not available yet <:blue:725143925396078643>')
        }

        const command = interaction.options.getSubcommand()
        const eventInput = interaction.options.getString('event')!
        const channelInput = interaction.options.getChannel('channel')
        const roleInput = interaction.options.getRole('role')
        const timeInput = interaction.options.getInteger('time') ?? 24

        const isServerReminder = Boolean(interaction.member && channelInput)
        
        const settings = isServerReminder
            ? database.servers.find(server => server.get('guildID') === interaction.guildId)
            : database.users.find(user => user.get('userID') === interaction.user.id)

        if (!settings) {
            return interaction.reply(
                'Unable to access ' + isServerReminder ? 'settings for your server' : 'your reminder settings'
            )
        }
        
        const reminders: eventReminder[] = JSON.parse(settings.get('reminders') || '[]')

        if (isServerReminder && !(interaction.member as GuildMember).permissions.has('ManageMessages')) {
            return interaction.reply({
                content: 'You do not have permission to manage server event reminders!', 
                ephemeral: true
            })
        }

        switch (command) {
            case 'create':
                const newReminder: eventReminder = { eventName: eventInput, time: timeInput * 60 * 60 * 1000 }
                if (isServerReminder) {
                    const targetChannel = interaction.guild?.channels.cache.get(channelInput!.id)
                    if (!targetChannel?.permissionsFor(interaction.guild!.members.me!).has('SendMessages')) {
                        return interaction.reply('I don\'t have permission to send messages in that channel!')
                    }

                    newReminder.channelID = channelInput!.id
                    newReminder.roleID = roleInput?.id
                }

                const existingReminder = reminders.find(({eventName}) => eventName === eventInput)
                existingReminder
                    ? reminders.splice(reminders.indexOf(existingReminder), 1, newReminder)
                    : reminders.push(newReminder)
                break

            case 'delete':
                const reminderToDelete = reminders.find(({eventName}) => eventName === eventInput)
                if (!reminderToDelete) return interaction.reply('You do not have a reminder for that event!')

                reminders.splice(reminders.indexOf(reminderToDelete), 1)
                break
        }

        isServerReminder 
            ? (settings as GoogleSpreadsheetRow<serverData>).set('reminders', JSON.stringify(reminders))
            : (settings as GoogleSpreadsheetRow<userData>).set('reminders', JSON.stringify(reminders))
        settings.save()

        const reminderEmbed = new EmbedBuilder()
            .setAuthor({
                name: (isServerReminder ? 'Server Reminders' : 'Your Reminders') + (command === 'settings' ? '' : ' Were Updated'),
                iconURL: interaction.guild?.iconURL({extension: 'png'}) ?? undefined
            })
            .setTitle('Currently Sending Reminders for These Events:')
            .setColor('Blue')
        
        for (const { eventName, channelID, roleID, time } of reminders) {
            let message = `Reminds you ${time / 60 / 60 / 1000} hours before the event ends`
            if (isServerReminder) {
                message = message.replace('you', (roleID ? `<@&${roleID}>` : 'members') + ` in <#${channelID}>`)
            }

            reminderEmbed.addFields([{name: eventName, value: message}])
        }

        interaction.reply({embeds: [reminderEmbed]})
	}
}