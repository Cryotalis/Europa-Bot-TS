import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('raidcode')
		.setDescription('Share a raid code (use with bookmarklet for best results)')
		.addStringOption(option => option.setName('code').setDescription('The code for the raid').setRequired(true))
		.addRoleOption(option => option.setName('role').setDescription('The role to ping for the raid'))
		.addStringOption(option => option.setName('name').setDescription('The name of the boss'))
		.addStringOption(option => option.setName('message').setDescription('A message to send along with the raid code'))
		.addIntegerOption(option => option.setName('time').setDescription('The amount of time (in minutes) remaining in the raid'))
		.addIntegerOption(option => option.setName('hp').setDescription('The amount of hp the boss currently has'))
		.addIntegerOption(option => option.setName('hp-percent').setDescription('The percentage of hp the boss currently has. (Omit the % sign)').setMinValue(1).setMaxValue(100))
		.addStringOption(option => option.setName('participants').setDescription('The number of participants / max participants for the raid. (Ex: 1/6)'))
		.addStringOption(option => option.setName('quest-id').setDescription('The quest id for the raid'))
	,
	async execute(interaction: ChatInputCommandInteraction) {
		const code = interaction.options.getString('code')!.substring(0, 10)
		const role = interaction.options.getRole('role')
		const name = interaction.options.getString('name')
		const message = interaction.options.getString('message')
		const time = interaction.options.getInteger('time')
		const hp = interaction.options.getInteger('hp')?.toLocaleString()
		const hpPercent = interaction.options.getInteger('hp-percent')
		const participants = interaction.options.getString('participants')
		const questID = interaction.options.getString('quest-id')

		const raidEmbed = new EmbedBuilder()
			.setAuthor({
				iconURL: 'https://raw.githubusercontent.com/Cryotalis/Europa-Bot-TS/main/assets/Raid%20Icon.png',
				name: name ?? role?.name ?? 'Unknown Raid',
			})
			.setDescription(message)
			.setTitle(code)
			.setColor('Blue')

		if (time) 			 raidEmbed.addFields({name: 'Time Remaining', value: `Ends <t:${Math.trunc(new Date().getTime() / 1000 + time! * 60)}:R>`, inline: true})
		if (hp || hpPercent) raidEmbed.addFields({name: 'Boss HP', value: (hp && hpPercent) ? `${hp} [${hpPercent}%]` : (hp ?? hpPercent + '%'), inline: true})
		if (participants) 	 raidEmbed.addFields({name: 'Participants', value: participants, inline: true})
		if (questID) 		 raidEmbed.setThumbnail(`https://prd-game-a1-granbluefantasy.akamaized.net/assets_en/img/sp/quest/assets/lobby/${questID}.png`)
		if (!(name && time && hp && hpPercent && participants && questID)) raidEmbed.addFields({name: '\u200B', value: '❗ For best results, use the associated [bookmarklet](https://cryotalis.github.io/Demo/bookmarklets.html).'})
		await interaction.reply({content: role ? '## ' + String(role) : undefined, embeds: [raidEmbed], allowedMentions: {roles: role ? [role.id] : undefined}})
		await interaction.followUp(code)
	}
}