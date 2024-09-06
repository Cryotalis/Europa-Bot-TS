import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType, ChatInputCommandInteraction } from 'discord.js'

/**
 * Displays a menu with an embedded message, navigation buttons, and a select box.
 * @param interaction - The command interaction to edit this menu onto.
 * @param userInput - The search term the user used.
 * @param items - The items to populate the menu with.
 */
export async function showMenu(interaction: ChatInputCommandInteraction, userInput: string, items: Array<string>){
    const itemsEmbed = new EmbedBuilder()
        .setTitle(`Found ${items.length} results for "${userInput}"`)
        .setDescription('Select an option using the menu below.')
        .setColor('Blue')

    let pageNum = 0
    const numbers = [ '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟' ]
    const numberedItems = items.map((item, index) => numbers[index % 10] + ' ' + item)

    function setPage(page: number){
        const index = page*10
        itemsEmbed.setFields([])
        if (items.length > index) itemsEmbed.addFields({name: '\u200b', value: numberedItems.slice(index, index + 5).join('\n\n'), inline: true})
        if (items.length > index + 5) itemsEmbed.addFields({name: '\u200b', value: numberedItems.slice(index + 5, index + 10).join('\n\n'), inline: true})

        const navButtons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('leftButton')
                    .setLabel('🡰')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(Boolean(page === 0))
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pageButton')
                    .setLabel(`ㅤㅤㅤㅤPage ${pageNum + 1}ㅤㅤㅤㅤ`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rightButton')
                    .setLabel('🡲')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(Boolean(items.length <= index + 10))
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('cancelButton')
                    .setLabel('✖')
                    .setStyle(ButtonStyle.Danger)
            )

        const playerMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('String Selector')
                    .setPlaceholder('Select an option')
                    .addOptions(numberedItems.slice(index, index + 10).map((item: string) => ({label: item, value: item})))
            )
        const messagePayload = {embeds: [itemsEmbed], components: [playerMenu, navButtons]}
        interaction.replied ? interaction.editReply(messagePayload) : interaction.reply(messagePayload)
    }
    setPage(0)

    const interactionReplyID = (await interaction.fetchReply()).id
    const choiceCollector = (await interaction.fetchReply()).createMessageComponentCollector({
        componentType: ComponentType.StringSelect, 
        filter: async i => i.member?.user.id === interaction.member?.user.id && i.message.id === interactionReplyID, 
        idle: 60000, 
        max: 1
    })
    const buttonCollector = (await interaction.fetchReply()).createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: async i => i.member?.user.id === interaction.member?.user.id && i.message.id === interactionReplyID,
        idle: 60000
    })
    buttonCollector?.on('collect', i => {
        i.deferUpdate()
        buttonCollector.resetTimer()
        choiceCollector?.resetTimer()
        if (i.customId === 'leftButton') {pageNum--; setPage(pageNum)}
        else if (i.customId === 'rightButton') {pageNum++; setPage(pageNum)}
        else if (i.customId === 'cancelButton') {
            choiceCollector?.stop()
        }
    })

    const result = await choiceCollector?.next.catch(() => {interaction.editReply({content: 'Select menu closed.', embeds: [], components: []})})
    buttonCollector?.stop()

    return result?.values[0] ? numberedItems.indexOf(result.values[0]) : null
}
