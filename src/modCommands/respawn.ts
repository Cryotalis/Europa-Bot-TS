import { CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { client } from '../bot'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('respawn')
		.setDescription('Force a Europa shard to respawn')
		.addNumberOption(option => option.setName('number').setDescription('The number for the shard to respawn').setRequired(true))
	,
	async execute(interaction: CommandInteraction) {
		if (interaction.user.id !== '251458435554607114') {
			return interaction.reply('This command is reserved for Cryo.')
		}
		
		const shardNumber = interaction.options.getNumber('number')!
		client.shard?.broadcastEval(client => {process.exit()}, {shard: shardNumber})
		interaction.reply(`Shard #${shardNumber} is now respawning.`)
	}
}