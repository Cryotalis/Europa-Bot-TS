/**
 * - `eventName` - Name of the event
 * - `roleID` - the ID of the role to ping in the reminder
 * - `channelID` - the ID of the channel to ping in the reminder
 * - `time` - time in milliseconds before the event ends to send the reminder
 */
export interface eventReminder {
    eventName: string
    time: number
    channelID?: string
    roleID?: string
}

export const eventChoices = [
    {name: 'All Events (Overrides other options)', value: 'All'},
    {name: 'All Recurring Events (Overrides other options)', value: 'All Recurring'},
    {name: 'Unite and Fight', value: 'Unite and Fight'},
    {name: 'Dread Barrage', value: 'Dread Barrage'},
    {name: 'Rise of the Beasts', value: 'Rise of the Beasts'},
    {name: 'Tower of Babyl', value: 'Tower of Babyl'},
    {name: 'Proving Grounds', value: 'Proving Grounds'},
    {name: 'Tales of Arcarum', value: 'Tales of Arcarum'},
    {name: 'Exo Crucibles', value: 'Crucible'},
    {name: 'Records of the Ten', value: 'Records of the Ten'},
]


export const recurringEvents = [
    "Unite and Fight",
    "Dread Barrage",
    "Rise of the Beasts",
    "Tower of Babyl",
    "Proving Grounds",

    "Tales of Arcarum",
    "Tales of Arcarum: Justice",
    "Tales of Arcarum: The Hanged Man",
    "Tales of Arcarum: Death",
    "Tales of Arcarum: Temperance",
    "Tales of Arcarum: The Devil",
    "Tales of Arcarum: The Tower",
    "Tales of Arcarum: The Star",
    "Tales of Arcarum: The Moon",
    "Tales of Arcarum: The Sun",
    "Tales of Arcarum: Judgement",

    "Exo Crucible",
    "Exo Sagittarius Crucible",
    "Exo Vohu Manah Crucible",
    "Exo Cocytus Crucible Crucible",
    "Exo Ifrit Crucible",
    "Exo Corow Crucible",
    "Exo Diablo Crucible",

    "Records of the Ten"
]