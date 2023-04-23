import axios from 'axios'
import { CanvasRenderingContext2D } from 'canvas'

/**
 * Takes an Imgur link and returns a list of direct image links. Works with Albums and Galleries.
 * @param url An Imgur link
 * @returns Array of direct image links
 */
export async function getDirectImgurLinks(url: string): Promise<string[]> {
    if (url.includes('i.imgur.com') || !url.includes('imgur.com')) return [url]
    if (/(imgur\.)(com\/gallery\/|com\/a\/|com\/t\/.+?\/)/.test(url)) {
        const albumHash = url.match(/(?:com\/gallery\/|com\/a\/|com\/t\/.+?\/)(.+)/)![1]
        const {data: {data}} = await axios.get(`https://api.imgur.com/3/album/${albumHash}/images`, {headers: {Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`}})
        return data.map((img: any) => img.link)
    } else {
        const imageHash = url.match(/(?<=com\/).+/)
        const {data: {data}} = await axios.get(`https://api.imgur.com/3/image/${imageHash}`, {headers: {Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`}})
        return [data.link]
    }
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