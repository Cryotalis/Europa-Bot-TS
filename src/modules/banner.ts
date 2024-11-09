import axios from "axios"
import { dateStringToUnix } from "./time.js"
import { accessCookie, languageCookie } from "../data/variables.js"
import { homeServerShardID, currentShardID } from "../bot.js"
import { App } from "octokit"

export interface rawItem {
	name: string,
	drop_rate: string,
	rarity: string,
	attribute: string,
	kind: string | null,
	incidence: string | null,
	reward_id: number,
	character_name: string | null,
	is_season: boolean,
	season_message: string
}
export interface item {
	name: string,
	id: string,
	rarity: string,
	element: string,
	type: string,
	rate1: number,
	rate2: number,
	cum_rate1: number,
	cum_rate2: number,
	rate_up: boolean,
	character: string | null
}
export interface bannerInfo {
	id: string,
	key: string,
	start: string,
	end: string,
	featuredItemIDs: string[],
	seasons: string[],
	series: string[],
	totalRate1: number,
	totalRate2: number,
	drawRates: {
		'SS Rare': string,
		'S Rare': string,
		'Rare': string
	}
}
export interface character {
	number: string
	id: string
	name: string
	short_name: string
	style: string
	rarity: string
	element: string
	uncaps: number
	specialties: string[]
	series: string[]
	races: string[]
	voice_actor: string
	weapon_name: string
	weapon_id: string
}  
export const bannerData: {bannerInfo: bannerInfo, items: item[]} = {bannerInfo: {} as bannerInfo, items: []}
export async function getBannerData(){
	const gameVersion = (await axios.get('http://game.granbluefantasy.jp/')).data.match(/(?<="version": ")\d+(?=")/i)?.[0]
	if (!gameVersion) return
	
	const headers = {
		Cookie: `wing=${accessCookie.value};ln=${languageCookie.value}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-VERSION': gameVersion
    }
	
	const bannerInfo = await axios.get('http://game.granbluefantasy.jp/gacha/list', {headers: headers})
	const banner = bannerInfo.data.legend.lineup.find((banner: {name: string}) => banner.name === 'Premium 10-Part Draw')
	const [items1Info, items2Info, featured, {data: characters}] = await Promise.all([
		axios.get(`http://game.granbluefantasy.jp/gacha/provision_ratio/legend/${banner.id}/1`, {headers: headers}),
		axios.get(`http://game.granbluefantasy.jp/gacha/provision_ratio/legend/${banner.id}/2`, {headers: headers}),
		axios.get('https://game.granbluefantasy.jp/gacha/list', {headers: headers}),
		axios.get('https://cryotalis.github.io/GBF-Banner-Data/characters.json') as unknown as {data: character[]}
	])
	const elements = ['None', 'Fire', 'Water', 'Earth', 'Wind', 'Light', 'Dark']
	const weaponTypes = ['None', 'Sabre', 'Dagger', 'Spear', 'Axe', 'Staff', 'Gun', 'Melee', 'Bow', 'Harp', 'Katana']
	
	let cumulativeDropRate1 = 0
	let cumulativeDropRate2 = 0
	let items1: rawItem[] = items1Info.data.appear.flatMap((data: {rarity_name: string, item: rawItem[]}) => data.item.map((item) => ({...item, rarity: data.rarity_name})))
	let items2: rawItem[] = items2Info.data.appear.flatMap((data: {rarity_name: string, item: rawItem[]}) => data.item.map((item) => ({...item, rarity: data.rarity_name})))

	bannerData.items = items1.map(item1 => {
		let item2 = items2.find(item2 => item1.reward_id === item2.reward_id)
		cumulativeDropRate1 += parseFloat(item1.drop_rate)
		cumulativeDropRate2 += parseFloat(item2?.drop_rate ?? '0')
		return {
			name: `${item1.name} ${item1.season_message}`.trim(),
			id: String(item1.reward_id),
			rarity: item1.rarity,
			element: elements[parseInt(item1.attribute)],
			type: item1.kind ? weaponTypes[parseInt(item1.kind)] : 'Summon',
			rate1: parseFloat(item1.drop_rate),
			rate2: parseFloat(item2?.drop_rate ?? '0'),
			cum_rate1: parseFloat(cumulativeDropRate1.toFixed(3)),
			cum_rate2: parseFloat(cumulativeDropRate2.toFixed(3)),
			rate_up: Boolean(item1.incidence),
			character: item1.character_name
		}
	})

	const characterWeapons = bannerData.items.filter(item => item.character)
	const newChars = characterWeapons.filter(weapon => characters.map(char => char.weapon_id).indexOf(weapon.id) === -1)
	const newCharNumber = characters.length + 1
	for (let i = newCharNumber; i < newCharNumber + newChars.length; i++){
		const {data: {option: {chara: {master}}}, data: {option: {chara}}} = await axios.get(`https://game.granbluefantasy.jp/gacha/content/chara/legend/111111/${i}`, {headers: headers})

		characters.push({
			number: String(i),
			id: master.id,
			name: master.name,
			short_name: master.short_name,
			style: ['', 'Balanced', 'Attack', 'Defense', 'Heal', 'Special'][master.type],
			rarity: ['', 'Normal', 'Rare', 'S Rare', 'SS Rare'][master.rarity],
			element: ['', 'Fire', 'Water', 'Earth', 'Wind', 'Light', 'Dark'][master.attribute],
			uncaps: master.max_evolution_level,
			specialties: master.specialty.map((specialty: number) => {
				return ['', 'Saber', 'Dagger', 'Spear', 'Axe', 'Staff', 'Gun', 'Melee', 'Bow', 'Harp', 'Katana'][specialty]
			}), 
			series: master.series_id.map((series: number) => {
				return ['', 'Summer', 'Yukata', 'Valentine', 'Halloween', 'Holiday', '12 Generals', 'Grand', 'Fantasy', 'Tie-In', 'Eternals', 'Evokers'][series]
			}).filter((e: string) => e),
			races: [
				['', 'Human','Erune','Draph','Harvin','Unknown','Primal'][master.tribe],
				['', 'Human','Erune','Draph','Harvin','Unknown','Primal'][master.tribe_2]
			].filter(e => e),
			voice_actor: chara.voice_acter,
			weapon_name: chara.open_reward.name,
			weapon_id: chara.story.open_reward_id
		})
	}

	// 3040092000 is Summer/Grand Zooey. She is the only Summer series character who can appear on non-summer banners, 
	// so she needs to be filtered out.
	const allSeries: string[] = characters
		.filter(char => char.id !== '3040092000' && bannerData.items.some(item => item.id === char.weapon_id))
		.flatMap(char => char.series)
	const series = [...new Set(allSeries)]
	const seasons = series.filter(series => ['Summer', 'Halloween', 'Valentine', 'Yukata', 'Holiday'].includes(series))

	bannerData.bannerInfo = {
		id: banner.id,
		key: bannerInfo.data.legend.random_key,
		start: banner.service_start,
		end: banner.service_end,
		featuredItemIDs: featured.data.header_images,
		seasons: seasons,
		series: series,
		totalRate1: parseFloat(cumulativeDropRate1.toFixed(3)),
		totalRate2: parseFloat(cumulativeDropRate2.toFixed(3)),
		drawRates: {
			'SS Rare': items1Info.data.ratio[0].ratio,
			'S Rare': items1Info.data.ratio[1].ratio,
			'Rare': items1Info.data.ratio[2].ratio,
		}
	}

	if (currentShardID !== homeServerShardID) return

	const bannerStart = new Date(dateStringToUnix(banner.service_start)!)
	const bannerMonth = bannerStart.toLocaleString('default', {month: 'long', timeZone: 'JST'})
	const bannerYear = bannerStart.toLocaleString('default', {year: 'numeric', timeZone: 'JST'})
	
	const app = new App({
			appId: process.env.GITHUB_APP_ID!,
			privateKey: process.env.GITHUB_PRIVATE_KEY!,
		})

	const octokit = await app.getInstallationOctokit(parseInt(process.env.GITHUB_INSTALLATION_ID!))

	const bannerDataPath = `/repos/Cryotalis/GBF-Banner-Data/contents/${bannerYear}/${bannerMonth}/${banner.id}.json`
	const {status} = await octokit.request(`GET ${bannerDataPath}`).catch((error: any) => error)

	if (status === 404){ // Do not upload if the file already exists
		await octokit.request(`PUT ${bannerDataPath}`, {
			message: `Uploaded banner data for banner ${banner.id}`,
			content: Buffer.from(JSON.stringify(bannerData, null, '\t')).toString('base64'),
		})
	}

	const directoryPath = '/repos/Cryotalis/GBF-Banner-Data/contents/directory.json'
	const {data: {content: directoryEncoded}, data: {sha: directorySHA}} = await octokit.request(`GET ${directoryPath}`)
	const directory = JSON.parse(atob(directoryEncoded))
	const newBannerInfo = {path: `/${bannerYear}/${bannerMonth}/${banner.id}.json`, ...bannerData.bannerInfo}

	if (!directory.find((bannerInfo: bannerInfo) => bannerInfo.id === newBannerInfo.id)) {
		directory.unshift(newBannerInfo)
		await octokit.request(`PUT ${directoryPath}`, {
			message: `Added banner ${banner.id} to directory`,
			content: Buffer.from(JSON.stringify(directory, null, '\t')).toString('base64'),
			sha: directorySHA
		})
	}

	const characterPath = '/repos/Cryotalis/GBF-Banner-Data/contents/characters.json'
	const {data: {sha: characterSHA}} = await octokit.request(`GET ${characterPath}`)
	if (newChars.length) {
		await octokit.request(`PUT ${characterPath}`, {
			message: `Added new characters to characters list`,
			content: Buffer.from(JSON.stringify(characters, null, '\t')).toString('base64'),
			sha: characterSHA
		})
	}
}