import { Image, loadImage } from 'canvas'

export let playerTemplate: Image
export let summonsTemplate: Image
export let privateSummon: Image
export let openSummon: Image
export let regularStar: Image
export let blankRegularStar: Image
export let blueStar: Image
export let blankBlueStar: Image
export let transcendenceStars: Image[]
export let perpetuityRingIcon: Image

export let eventsBackgroundTop: Image
export let eventsBackgroundMiddle: Image
export let eventsBackgroundBottom: Image
export let upcomingEventsText: Image

export let fireAdvantage: Image
export let waterAdvantage: Image
export let earthAdvantage: Image
export let windAdvantage: Image
export let lightAdvantage: Image
export let darkAdvantage: Image

export let sparkBGMask: Image
export let clearSparkBG: Image
export let defaultSparkBG: Image
export let developerTitle: Image
export let VIPTitle: Image
export let progressBars: Image[]

export let skydomWallpaper: Image
async function loadAssets(){
    [
        playerTemplate,
        summonsTemplate,
        privateSummon,
        openSummon,
        regularStar,
        blankRegularStar,
        blueStar,
        blankBlueStar,
        transcendenceStars,
        perpetuityRingIcon,
        eventsBackgroundTop,
        eventsBackgroundMiddle,
        eventsBackgroundBottom,
        upcomingEventsText,
        fireAdvantage,
        waterAdvantage,
        earthAdvantage,
        windAdvantage,
        lightAdvantage,
        darkAdvantage,
        sparkBGMask,
        clearSparkBG,
        defaultSparkBG,
        developerTitle,
        VIPTitle,
        progressBars,
        skydomWallpaper,
    ] = await Promise.all([
        loadImage('https://cdn.discordapp.com/attachments/647256353844232202/1097295608148144129/PlayerTemplate.png'),
        loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842832315213152286/SummonsTemplate.png'),
        loadImage('https://i.imgur.com/kruvcZo.png'),
        loadImage('https://prd-game-a1-granbluefantasy.akamaized.net/assets_en/img/sp/assets/summon/m/empty.jpg'),
        loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842840832217579520/regularStar.png'),
        loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842840831311347732/regularStarBlank.png'),
        loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842843224505843772/blueStar.png'),
        loadImage('https://cdn.discordapp.com/attachments/659229575821131787/842843214209482814/blueStarBlank.png'),
        Promise.all([
            loadImage('assets/Transcendence Star 0.png'),
            loadImage('assets/Transcendence Star 1.png'),
            loadImage('assets/Transcendence Star 2.png'),
            loadImage('assets/Transcendence Star 3.png'),
            loadImage('assets/Transcendence Star 4.png'),
            loadImage('assets/Transcendence Star 5.png'),
            loadImage('assets/Transcendence Star Blank.png'),
        ]),
        loadImage('assets/Perpetuity Ring Icon.png'),
        loadImage('assets/Events Background Top.png'),    
        loadImage('assets/Events Background Middle.png'), 
        loadImage('assets/Events Background Bottom.png'), 
        loadImage('assets/Upcoming Events Text.png'),
        loadImage('https://gbf.wiki/images/thumb/7/77/Status_FireAtkUp.png/25px-Status_FireAtkUp.png'),
        loadImage('https://gbf.wiki/images/thumb/0/08/Status_WaterAtkUp.png/25px-Status_WaterAtkUp.png'),
        loadImage('https://gbf.wiki/images/thumb/4/44/Status_EarthAtkUp.png/25px-Status_EarthAtkUp.png'),
        loadImage('https://gbf.wiki/images/thumb/4/4d/Status_WindAtkUp.png/25px-Status_WindAtkUp.png'),
        loadImage('https://gbf.wiki/images/thumb/3/3d/Status_LightAtkUp.png/25px-Status_LightAtkUp.png'),
        loadImage('https://gbf.wiki/images/thumb/a/a0/Status_DarkAtkUp.png/25px-Status_DarkAtkUp.png'),
        loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762191969321484328/SparkMask.png'),
        loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762203777629290526/SparkShadedBG.png'),
        loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762188325330485248/SparkDefaultBG.png'),
        loadImage('https://i.imgur.com/THKXHC0.png'),
        loadImage('https://i.imgur.com/uGK0xjS.png'),
        Promise.all([
            loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762201628031189002/RegularProgressBar.png'),
            loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762201828334239764/RedProgressBar.png'),
            loadImage('https://cdn.discordapp.com/attachments/659229575821131787/762202150599917568/BlueProgressBar.png'),
            loadImage('https://cdn.discordapp.com/attachments/565650781961846784/790744430805123103/PurpleProgressBar_2.png'),
        ]),
        loadImage('assets/Skydom Wallpaper.png')

    ]) 
}
loadAssets()