import { Image, loadImage } from 'canvas'

export let playerTemplate: Image
export let privateSummon: Image
export let openSummon: Image
export let regularStar: Image
export let blankRegularStar: Image
export let blueStar: Image
export let blankBlueStar: Image
export let eventsBackground: Image
export let eventsBackgroundHalloween: Image
export let currentEventsText: Image
export let upcomingEventsText: Image
export let darkAdvantage: Image
export let lightAdvantage: Image
export let waterAdvantage: Image
export let fireAdvantage: Image
export let windAdvantage: Image
export let earthAdvantage: Image
async function loadAssets(){
    [
        playerTemplate,
        privateSummon,
        openSummon,
        regularStar,
        blankRegularStar,
        blueStar,
        blankBlueStar,
        eventsBackground,
        eventsBackgroundHalloween,
        currentEventsText,
        upcomingEventsText,
        fireAdvantage,
        waterAdvantage,
        earthAdvantage,
        windAdvantage,
        lightAdvantage,
        darkAdvantage,
    ] = await Promise.all([
        loadImage('https://cdn.discordapp.com/attachments/647256353844232202/1097295608148144129/PlayerTemplate.png'),
        loadImage('https://i.imgur.com/kruvcZo.png'),
        loadImage('https://prd-game-a1-granbluefantasy.akamaized.net/assets_en/img/sp/assets/summon/m/empty.jpg'),
        loadImage('https://i.imgur.com/ICv0syr.png'),
        loadImage('https://i.imgur.com/KfjU5W5.png'),
        loadImage('https://i.imgur.com/IzXxg3R.png'),
        loadImage('https://i.imgur.com/3mnCjnH.png'),
        loadImage('https://i.imgur.com/6zQvrJT.png'), // Normal Events Template
        loadImage('https://media.discordapp.net/attachments/647256353844232202/1033487287293579415/EventsHalloweenTemplate.png'), // Halloween Events Template
        loadImage('https://i.imgur.com/8z0eQIk.png'),
        loadImage('https://i.imgur.com/dSzz0to.png'),
        loadImage('https://gbf.wiki/images/thumb/7/77/Status_FireAtkUp.png/25px-Status_FireAtkUp.png'),
        loadImage('https://gbf.wiki/images/thumb/0/08/Status_WaterAtkUp.png/25px-Status_WaterAtkUp.png'),
        loadImage('https://gbf.wiki/images/thumb/4/44/Status_EarthAtkUp.png/25px-Status_EarthAtkUp.png'),
        loadImage('https://gbf.wiki/images/thumb/4/4d/Status_WindAtkUp.png/25px-Status_WindAtkUp.png'),
        loadImage('https://gbf.wiki/images/thumb/3/3d/Status_LightAtkUp.png/25px-Status_LightAtkUp.png'),
        loadImage('https://gbf.wiki/images/thumb/a/a0/Status_DarkAtkUp.png/25px-Status_DarkAtkUp.png'),
    ]) 
}
loadAssets()