import { GoogleSpreadsheet, GoogleSpreadsheetRow, GoogleSpreadsheetWorksheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { decode } from "html-entities"
import axios from "axios"
import { currentShardID } from "../bot.js"
import { capFirstLetter } from "../modules/string.js"
import { rarityFullNames } from "./granblue.js"

export interface serverData { guildName: string, guildID: string, greeting: string, roles: string, events: string }
export interface userData {
	username: string,	userID: string,
	crystals: string,	mobaCoin: string,   tickets: string,    tenParts: string,    rolls: string,
    background: string, sparkTitle: string
}
export interface itemData {
    name: string
    id: string
    rarity: "SS Rare" | "S Rare" | "Rare" | "Normal"
    element: "Fire" | "Water" | "Earth" | "Wind" | "Light" | "Dark"
    series: string
    obtain: string
    maxUncaps: 3 | 4 | 5 | 6
}
export interface characterData extends itemData { weaponName: string, weaponID: string }

export let database = {} as {
    serversTable: GoogleSpreadsheetWorksheet
    usersTable: GoogleSpreadsheetWorksheet
    charactersTable: GoogleSpreadsheetWorksheet
    summonsTable: GoogleSpreadsheetWorksheet
    servers: Array<GoogleSpreadsheetRow<serverData>>
    users: Array<GoogleSpreadsheetRow<userData>>
    characters: Array<GoogleSpreadsheetRow<characterData>>
    summons: Array<GoogleSpreadsheetRow<itemData>>
}

const serviceAccountAuth = new JWT({
	email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
	key: process.env.GOOGLE_PRIVATE_KEY,
	scopes: ['https://www.googleapis.com/auth/spreadsheets']
})

export async function connectDatabase(){
    const gsheetsDB = new GoogleSpreadsheet(process.env.PRIVATE_DB_ID!, serviceAccountAuth)
    await gsheetsDB.loadInfo()

    database.serversTable = gsheetsDB.sheetsByTitle['Servers']
    database.usersTable = gsheetsDB.sheetsByTitle['Users']
    database.charactersTable = gsheetsDB.sheetsByTitle['Characters']
    database.summonsTable = gsheetsDB.sheetsByTitle['Summons']

	;[
        database.servers,
        database.users,
        database.characters,
        database.summons
    ] = await Promise.all([
		database.serversTable.getRows(),
		database.usersTable.getRows(),
        database.charactersTable.getRows(),
        database.summonsTable.getRows()
	])

	console.log(`Database connection successful for Shard #${currentShardID}`)
}

/**
 * Fetches summon data from the Wiki's Cargo Tables and stores it in the database
 */
export async function getSummonData(){
    const {data: summons} = await axios.get<itemData[]>(
        'https://gbf.wiki/index.php?title=Special:CargoExport',
        {
            headers: {'User-Agent': 'Europa Bot'},
            params: {
                tables: 'summons',
                fields: [
                    'name', 'id', 'rarity', 'element', 'series', 'obtain', 'evo_max=maxUncaps'
                ].map(field => `summons.${field}`).join(','),
                limit: 1000,
                format: 'json'
            }
        }
    ).catch(() => ({data: null}))
    if (!summons) return setTimeout(() => getSummonData(), 60000)

    // Only update the database if new summons were added
    if (summons.length === database.summons.length) return

    await database.summonsTable.clearRows()
    await database.summonsTable.addRows(
        summons.map(({name, rarity, element, series, obtain, ...summonData}) => ({
            name: decode(name),
            rarity: rarityFullNames[rarity],
            element: capFirstLetter(element),
            series: decode(series),
            obtain: decode(obtain),
            ...summonData
        }))
    )

    console.log('Summon Data has been updated.')
}

/**
 * Fetches character data from the Wiki's Cargo Tables and stores it in the database
 */
export async function getCharacterData(){
    const {data: characters} = await axios.get<characterData[]>(
        'https://gbf.wiki/index.php?title=Special:CargoExport',
        {
            headers: {'User-Agent': 'Europa Bot'},
            params: {
                tables: 'weapons, characters',
                "join on": 'weapons.name=characters.join_weapon',
                fields: [
                    'name', 'id', 'rarity', 'element', 'series', 'obtain', 'max_evo=maxUncaps', 'join_weapon=weaponName'
                ].map(field => `characters.${field}`).join(',') + 'weapons.name=weaponName, weapons.id=weaponID',
                where: 'characters.id != ""',
                limit: 2000,
                format: 'json'
            }
        }
    ).catch(() => ({data: null}))
    if (!characters) return setTimeout(() => getCharacterData(), 60000)

    // Only update the database if new characters were added
    if (characters.length === database.characters.length) return

    await database.charactersTable.clearRows()
    await database.charactersTable.addRows(
        characters.map(({name, rarity, series, obtain, weaponName, ...characterData}) => ({
            name: decode(name),
            rarity: rarityFullNames[rarity],
            series: decode(series),
            obtain: decode(obtain[0]),
            weaponName: decode(weaponName),
            ...characterData
        }))
    )

    console.log('Character Data has been updated.')
}