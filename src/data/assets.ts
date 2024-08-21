import { Image, loadImage } from 'canvas'
import { readdirSync } from 'fs'
import { currentShardID } from '../bot.js'

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
    const assetPaths = readdirSync('assets/').filter(asset => /.png/i.test(asset))
    const loadedAssets = await Promise.all(assetPaths.map(asset => loadImage(`assets/${asset}`)))
    const assets = Object.fromEntries(loadedAssets.map((asset, i) => [String(assetPaths[i].match(/[^.]+/)), asset]));

    playerTemplate = assets['Player Template']
    summonsTemplate = assets['Support Summons Template']
    privateSummon = assets['Private Support Summon']
    openSummon = assets['Open Support Summon']
    regularStar = assets['Uncap Star']
    blankRegularStar = assets['Uncap Star Blank']
    blueStar = assets['Blue Uncap Star']
    blankBlueStar = assets['Blue Uncap Star Blank']
    transcendenceStars = [
        assets['Transcendence Star 0'],
        assets['Transcendence Star 1'],
        assets['Transcendence Star 2'],
        assets['Transcendence Star 3'],
        assets['Transcendence Star 4'],
        assets['Transcendence Star 5'],
        assets['Transcendence Star Blank']
    ]
    perpetuityRingIcon = assets['Perpetuity Ring Icon']
    eventsBackgroundTop = assets['Events Background Top']
    eventsBackgroundMiddle = assets['Events Background Middle']
    eventsBackgroundBottom = assets['Events Background Bottom']
    upcomingEventsText = assets['Upcoming Events Text']
    fireAdvantage = assets['Fire Advantage']
    waterAdvantage = assets['Water Advantage']
    earthAdvantage = assets['Earth Advantage']
    windAdvantage = assets['Wind Advantage']
    lightAdvantage = assets['Light Advantage']
    darkAdvantage = assets['Dark Advantage']
    sparkBGMask = assets['Spark Template Background Mask']
    clearSparkBG = assets['Spark Template Translucent BG']
    clearMBSparkBG = assets['Spark Template Translucent BG with MobaCoin']
    defaultSparkBG = assets['Spark Template']
    defaultMBSparkBG = assets['Spark Template with MobaCoin']
    developerTitle = assets['Developer Title']
    VIPTitle = assets['VIP Title']
    progressBars = [
        assets['Progress Bar 1'],
        assets['Progress Bar 2'],
        assets['Progress Bar 3'],
        assets['Progress Bar 4'],
        assets['Progress Bar 5'],
        assets['Progress Bar 6'],
    ]
    skydomWallpaper = assets['Skydom Wallpaper']
    
    console.log(`Assets loaded for Shard #${currentShardID}`)
}