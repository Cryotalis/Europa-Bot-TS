import { Image, loadImage } from 'canvas'
import { currentShardID } from '../bot'

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
export let clearMBSparkBG: Image
export let defaultSparkBG: Image
export let defaultMBSparkBG: Image
export let developerTitle: Image
export let VIPTitle: Image
export let progressBars: Image[]

export let skydomWallpaper: Image
export async function loadAssets(){
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
        clearMBSparkBG,
        defaultSparkBG,
        defaultMBSparkBG,
        developerTitle,
        VIPTitle,
        progressBars,
        skydomWallpaper,
    ] = await Promise.all([
        loadImage('assets/Player Template.png'),
        loadImage('assets/Support Summons Template.png'),
        loadImage('assets/Private Support Summon.png'),
        loadImage('assets/Open Support Summon.png'),
        loadImage('assets/Uncap Star.png'),
        loadImage('assets/Uncap Star Blank.png'),
        loadImage('assets/Blue Uncap Star.png'),
        loadImage('assets/Blue Uncap Star Blank.png'),
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
        loadImage('assets/Fire Advantage.png'),
        loadImage('assets/Water Advantage.png'),
        loadImage('assets/Earth Advantage.png'),
        loadImage('assets/Wind Advantage.png'),
        loadImage('assets/Light Advantage.png'),
        loadImage('assets/Dark Advantage.png'),
        loadImage('assets/Spark Template Background Mask.png'),
        loadImage('assets/Spark Template Translucent BG.png'),
        loadImage('assets/Spark Template Translucent BG with MobaCoin.png'),
        loadImage('assets/Spark Template.png'),
        loadImage('assets/Spark Template with MobaCoin.png'),
        loadImage('assets/Developer Title.png'),
        loadImage('assets/VIP Title.png'),
        Promise.all([
            loadImage('assets/Progress Bar 1.png'),
            loadImage('assets/Progress Bar 2.png'),
            loadImage('assets/Progress Bar 3.png'),
            loadImage('assets/Progress Bar 4.png'),
            loadImage('assets/Progress Bar 5.png'),
            loadImage('assets/Progress Bar 6.png'),
            loadImage('assets/Progress Bar 7.png'),
        ]),
        loadImage('assets/Skydom Wallpaper.png')
    ])
    console.log(`Assets loaded for Shard #${currentShardID}`)
}