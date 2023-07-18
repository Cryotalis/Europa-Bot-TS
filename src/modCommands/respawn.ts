import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { client } from '../bot'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('respawn')
		.setDescription('Force a Europa shard to respawn (Developer Only)')
		.addNumberOption(option => option.setName('number').setDescription('The number for the shard to respawn').setRequired(true))
	,
	async execute(interaction: ChatInputCommandInteraction) {
		if (interaction.user.id !== '251458435554607114') {
			return interaction.reply({content: 'You do not have permission to use this command.', ephemeral: true})
		}
		
		const shardNumber = interaction.options.getNumber('number')!
		client.shard?.broadcastEval(client => {process.exit()}, {shard: shardNumber})
		interaction.reply(`Shard #${shardNumber} is now respawning.`)
	}
}