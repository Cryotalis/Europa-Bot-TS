import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { database } from '../data/database.js'
import { findPlayer } from '../modules/granblue.js'
import { loadProfile } from '../modules/player.js'

export const command = {
	data: new SlashCommandBuilder()
		.setName('player')
		.setDescription('Search for a player and display their player profile page')
		.addSubcommand(subcommand =>
			subcommand
				.setName('name')
				.setDescription('Search for a player by their name')
				.addStringOption(option => option.setName('name').setDescription("The name of the player you're looking for").setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('id')
				.setDescription('Search for a player by their ID')		
				.addNumberOption(option => option.setName('id').setDescription("The ID of the player you're looking for").setRequired(true))
		)
	,
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply()
		
		if (!database?.summons) {
			return interaction.editReply('Unable to connect to database. Please try again in a few seconds.')
		}
		
		const playerName = interaction.options.getString('name')!
		const playerID = interaction.options.getNumber('id')?.toString() ?? await findPlayer(interaction, playerName)

		if (playerID) loadProfile(interaction, playerID)
	}
}