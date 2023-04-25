import { AttachmentBuilder, User } from 'discord.js'
import { createCanvas, loadImage } from 'canvas'

export type toggleableGreetingSetting = 'sendJoinMessage' | 'sendLeaveMessage' | 'sendBanMessage' | 'showJoinImage' | 'useAutoRole';

export interface greetingConfig {
	joinMessage: string,
	leaveMessage: string,
	banMessage: string,
	channelID: string,
	background: string | null,
	autoRoles: string[],
	sendJoinMessage: boolean,
	sendLeaveMessage: boolean,
	sendBanMessage: boolean,
	showJoinImage: boolean,
	useAutoRole: boolean
}

/**
 * Generates an image with a background, user avatar, and welcome message
 */
export async function makeGreetingImage(greetingSettings: greetingConfig, user: User){
    const canvas = createCanvas(700, 250)
	const ctx = canvas.getContext('2d')
	
	const [background, textBox, userAvatar] = await Promise.all([
		greetingSettings.background ? loadImage(greetingSettings.background) : loadImage('https://cdn.discordapp.com/attachments/659229575821131787/847525054833360896/GBFBackground.jpg'),
		loadImage('https://i.imgur.com/5pMqWKz.png'),
		loadImage(user.displayAvatarURL({extension: 'png', size: 4096, forceStatic: true}))
	])

	ctx.drawImage(background, 0, 0, canvas.width, canvas.height)
	ctx.drawImage(textBox, 250, 40, 420, 170)

	let fontSize = 40
	function applyText(text: string){
		do {
			ctx.font = `${fontSize -= 1}px Times`
		} while (ctx.measureText(text).width > 200)
		return ctx.font
	}

	ctx.font = `28px Times`
	ctx.fillStyle = '#000000'
	ctx.fillText('Welcome to the server,', canvas.width / 2.5, canvas.height / 2.8)
	ctx.font = applyText(user.username + '!')
	ctx.fillText(`${user.username}!`, canvas.width / 2.5, 160 - (40 - fontSize * 0.5))

	ctx.beginPath()
	ctx.arc(125, 125, 100, 0, Math.PI * 2, true)
	ctx.closePath()
	ctx.clip()
	
	ctx.drawImage(userAvatar, 25, 25, 200, 200)

	return new AttachmentBuilder(canvas.toBuffer(), {name: 'welcome.png'})
}