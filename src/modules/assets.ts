import { Image, loadImage } from 'canvas'

export let playerTemplate: Image
export let privateSummon: Image
export let openSummon: Image
export let regularStar: Image
export let blankRegularStar: Image
export let blueStar: Image
export let blankBlueStar: Image
async function loadAssets(){
    [
        playerTemplate,
        privateSummon,
        openSummon,
        regularStar,
        blankRegularStar,
        blueStar,
        blankBlueStar,
    ] = await Promise.all([
        loadImage('https://cdn.discordapp.com/attachments/647256353844232202/1097295608148144129/PlayerTemplate.png'),
        loadImage('https://i.imgur.com/kruvcZo.png'),
        loadImage('https://prd-game-a1-granbluefantasy.akamaized.net/assets_en/img/sp/assets/summon/m/empty.jpg'),
        loadImage('https://i.imgur.com/ICv0syr.png'),
        loadImage('https://i.imgur.com/KfjU5W5.png'),
        loadImage('https://i.imgur.com/IzXxg3R.png'),
        loadImage('https://i.imgur.com/3mnCjnH.png'),
    ]) 
}
loadAssets()