import axios from 'axios'
import { CanvasGradient, CanvasPattern, CanvasRenderingContext2D, CanvasTextAlign, loadImage } from 'canvas'
import { Attachment } from 'discord.js'

/**
 * Fetches an image link from an Attachment image. If given an image URL, fetches an image link from that URL.
 * - Indirect Imgur links will return a direct image link.
 * - Imgur Albums, Galleries, and Topics links will return the link to the first image in the group.
 */
export async function getImageLink(image: string | Attachment){
    let imageLink = ''
    if (typeof image === 'string'){  
        const config = { headers: { Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}` } }
        if (/(imgur\.com\/)(gallery|a|t)/i.test(image)) { // Handle imgur albums/galleries
            const albumHash = image.match(/\w+$/)
            const { data: { data } } = await axios.get(`https://api.imgur.com/3/album/${albumHash}/images`, config)
            imageLink = data[0].link
        } else if (/(?<=\/)imgur\.com/i.test(image)) { // Handle indirect imgur links
            const imageHash = image.match(/\w+$/)
            const { data: { data } } = await axios.get(`https://api.imgur.com/3/image/${imageHash}`, config)
            imageLink = data.link
        } else {
            imageLink = image
        }
    } else {
        if (!/image\/(jpeg|png|gif)/.test(image.contentType!)) {
            throw new Error('The image must either be a JPG, PNG, or GIF.')
        }
        imageLink = image.url
    }

    const validImage = await loadImage(imageLink).catch(() => {})
    if (!validImage) throw new Error('I could not access the image you provided.')

    return imageLink
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

/**
 * @param image - Binary file, base64 data, or url for an image/video (up to 10mb)
 * @param album - ID of the album you want to add the image/video to. Deletehash for anonymous albums
 * @param type - file, url, base64, or raw
 */
interface imgurImgInfo {
    image: string
    album?: string
    type?: string
    name?: string
    title?: string
    description?: string
}

interface imgurUploadResponse {
    id: string
    deletehash: string
    account_id: string
    account_url: string
    type: string
    link: string
}

/**
 * Upload an image to an Imgur account
 */
export async function uploadImage(imgInfo: imgurImgInfo, accessToken: string) {
    const config = {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    }

    const { data: { data }} = await axios.post<{data: imgurUploadResponse}>('https://api.imgur.com/3/image', imgInfo, config)
        .catch(() => { throw new Error('Failed to upload image. Please try again later.') })

    return data
}