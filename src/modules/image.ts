import axios from 'axios'
import { CanvasGradient, CanvasPattern, CanvasRenderingContext2D, CanvasTextAlign, loadImage } from 'canvas'
import { Attachment } from 'discord.js'

/**
 * Takes a link or image, fetches the direct link to the image, then validates and returns the image link.
 * - Imgur Albums, Galleries, and Topics links will return the link to the first image in the group.
 */
export async function getImageLink(url?: string | null, image?: Attachment | null){
    if (!url && !image) return {errorMsg: 'You must provide either an image link or upload!', imageLink: ''}
    if (url && image) url = undefined

    let imageLink = ''
    if (url){
        if (url.includes('i.imgur.com') || !url.includes('imgur.com')) imageLink = url
        else if (/(imgur\.com\/)(gallery|a|t)/i.test(url)) {
            const albumHash = url.match(/com\/(?:gallery|a|t\/.+?)\/(.+)/)![1]
            const {data: {data}} = await axios.get(`https://api.imgur.com/3/album/${albumHash}/images`, {headers: {Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`}})
            imageLink = data[0].link
        } else {
            const imageHash = url.match(/(?<=com\/).+/)
            const {data: {data}} = await axios.get(`https://api.imgur.com/3/image/${imageHash}`, {headers: {Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`}})
            imageLink = data.link
        }
    } 
    
    if (image) {
        if (!/image\/(jpeg|png|gif)/.test(image.contentType!)) return {errorMsg: 'The image must either be a JPG, PNG, or GIF.', imageLink: ''}
        imageLink = image.url
    }

    const validImage = await loadImage(imageLink).catch(() => undefined)
    if (!validImage) return {errorMsg: 'I could not access the image you provided.', imageLink: ''}

    return {errorMsg: '', imageLink: imageLink}
}

interface CanvasTextInfo {
    ctx: CanvasRenderingContext2D,
    font?: string,
    textAlign?: CanvasTextAlign,
    strokeStyle?: string | CanvasGradient | CanvasPattern,
    fillStyle?: string | CanvasGradient | CanvasPattern
}
/**
 * Writes text that wraps around when it reaches a horizontal limit
 * @param textInfo - Object containing styling information for the text
 * @param text - The text to be written
 * @param textX - The X coordinate of the text
 * @param textY - The Y coordinate of the text
 * @param maxWidth - The width of the line of text. After reaching this width limit the text will wrap around
 * @param lineHeight - The spacing between lines of text
 */
export function wrapText(textInfo: CanvasTextInfo, text: string, textX: number, textY: number, maxWidth: number, lineHeight: number) {
    const {ctx} = textInfo
    ctx.save()
    if (textInfo.font) ctx.font = textInfo.font
    if (textInfo.textAlign) ctx.textAlign = textInfo.textAlign
    if (textInfo.strokeStyle) ctx.strokeStyle = textInfo.strokeStyle
    if (textInfo.fillStyle) ctx.fillStyle = textInfo.fillStyle
    ctx.lineWidth = 3
    ctx.textBaseline = 'middle'
    const words = text.split(' ')
    let line = ''
    
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' '
        const metrics = ctx.measureText(testLine)
        const testWidth = metrics.width
        if (testWidth > maxWidth && i > 0) {
            textY -= (ctx.measureText(text).actualBoundingBoxAscent + ctx.measureText(text).actualBoundingBoxDescent) / 2
            ctx.strokeText(line, textX, textY)
            ctx.fillText(line, textX, textY)
            line = words[i] + ' '
            textY += lineHeight
        } else {
            line = testLine
        }
    }
    ctx.strokeText(line, textX, textY)
    ctx.fillText(line, textX, textY)
    ctx.restore()
}