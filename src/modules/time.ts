import { getOrdinal } from './number'
import { timeZoneOffsets } from '../data/variables'

const TZdefault = timeZoneOffsets.find(TZ => TZ.name === 'JST')! // The default timezone to use for time functions
const fullDates: {[key: string]: string} = {
    'Jan': 'January',
    'Feb': 'February',
    'Mar': 'March',
    'Apr': 'April',
    'May': 'May',
    'Jun': 'June',
    'Jul': 'July',
    'Aug': 'August',
    'Sep': 'September',
    'Oct': 'October',
    'Nov': 'November',
    'Dec': 'December'
}

/**
 * Converts UTC offset in format ±hours:minutes to minutes
 * @param {String} offset - The UTC offset in format ±hours:minutes 
 */
export function parseOffset(offset: string){
    const hours = parseInt(offset.match(/-?\d+/)![0])
    const minutes = /:\d+/.test(offset) ? parseInt(offset.match(/(?<=:)\d+/)![0]) : 0
    return hours * 60 + minutes
}

/**
 * Returns a time zone offset object with time zone name and offset. Defaults to UTC+0 if input is invalid.
 */
export function findTimeZone(timeZone: string){
    return timeZoneOffsets.find(TZ => TZ.name === timeZone.toUpperCase()) || TZdefault
}

/**
 * Returns the difference between 2 dates (secondDate - firstDate) as a string in the following format: days, hours, minutes, and seconds.
 * @param {boolean} shortFormat - Whether to use the shorthand format (d h m s instead of days, hours, minutes, and seconds)
 */
export function dateDiff(firstDate: Date, secondDate: Date, shortFormat: boolean = false) {
    if (firstDate === secondDate) {return 'right now'}
    let timeDiff = Math.abs(secondDate.getTime() - firstDate.getTime()) / 1000 //Gets difference between the dates in seconds

    //Calculates difference of days, hours, minutes, seconds
    const days = Math.floor(timeDiff / 86400)
    timeDiff -= days * 86400
    const hours = Math.floor(timeDiff / 3600)
    timeDiff -= hours * 3600
    const minutes = Math.floor(timeDiff / 60)
    timeDiff -= minutes * 60
    const seconds = Math.floor(timeDiff)

    //Labels days, hours, minutes, seconds grammatically and leaves blank when appropriate
    const daysOutput = days === 1 ? `${days} day,` : days ? `${days} days,` : ''
    const hoursOutput = hours === 1 ? `${hours} hour,` : hours ? `${hours} hours,` : ''
    const minutesOutput = minutes === 1 ? `${minutes} minute,` : minutes ? `${minutes} minutes,` : ''
    const secondsOutput = seconds === 1 ? `${seconds} second,` : seconds ? `${seconds} seconds,` : ''
    let dateString = `${daysOutput} ${hoursOutput} ${minutesOutput} ${secondsOutput}`
        .replace(/\s+/g, ' ') // Removes any extra spaces between words
        .replace(/,(?=[^,]*$)/, '') //removes extra comma at the end of the string
        .replace(/,(?=[^,]*$)/, ' and') //replaces last comma in string with "and"
        .trim()
    if (shortFormat) dateString = dateString.replace(/\sdays?/, 'd').replace(/\shours?/, 'h').replace(/\sminutes?/, 'm').replace(/\sseconds?/, 's').replace(/\sand/, '').replace(/,/g, '')
    return secondDate > firstDate ? dateString : '-' + dateString // If applicable, add a negative sign
}

/**
 * Converts time duration input to unix. Format: a days b hours c minutes d seconds.
 */
export function timeToUnix(time: string) { //Converts a day/hour/minute/second time input to unix
    const days = /\d+\s?d/i.test(time) ? parseInt(time.match(/\d+\s?d/i)![0]) : (/\sd/i.test(time) || /^d/i.test(time)) ? 1 : 0
    const hours = /\d+\s?h/i.test(time) ? parseInt(time.match(/\d+\s?h/i)![0]) : (/\sh/i.test(time) || /^h/i.test(time)) ? 1 : 0
    const minutes = /\d+\s?m/i.test(time) ? parseInt(time.match(/\d+\s?m/i)![0]) : (/\sm/i.test(time) || /^m/i.test(time)) ? 1 : 0
    const seconds = /\d+\s?s/i.test(time) ? parseInt(time.match(/\d+\s?s/i)![0]) : (/\ss/i.test(time) || /^s/i.test(time)) ? 1 : 0
    return days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000
}

/**
 * Converts date/time input to unix. Format: 1:23 AM/PM TimeZone
 */
export function dateStringToUnix(dateString: string) {
    dateString = dateString.toLowerCase().replace(/[^a-zA-Z0-9\s\/:]/g, '') // Remove any characters that aren't words/numbers/spaces/slashes/colons
    dateString = dateString.replace('noon', 'pm').replace('midnight', 'am')
    const now = new Date()
    const year = now.getFullYear().toString()
    const months = [ 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec' ]
    const month = months.find(m => dateString.toLowerCase().includes(m))
    const timeFormat = new RegExp(/(\d+:){1,2}\d+ ?(am|pm)?|\d+\s*(am|pm)/i)
    const abbreviated = new RegExp('(\\d\\d?)\\s*/\\s*(\\d\\d?)\\s*/?\\s*(\\d*)') // 1/1/1970
    const american = new RegExp(`(${month}\\w*)\\s+(\\d+)(?:\\w*)\\s*(\\d*)`) // January 1, 1970
    const british = new RegExp(`(\\d+)(?:\\w*)\\s*(${month}\\w*)\\s*(\\d*)`) // 1 January, 1970
    const mdyTimeZones = [
        'SST',  'PDT',  'PST',  'PT',
        'NDT',  'NST',  'ADT',  'AST',
        'AT',   'EST',  'EDT',  'ET',
        'CST',  'CDT',  'CT',   'MST',
        'MDT',  'MT',   'CHUT', 'PONT',
        'KOST', 'CHST', 'JST',  'KST',
        'MHT',  'PHT',  'AOE',  'WAKT',
        'HST',  'AKDT'
    ] // Timezones that use the Month/Day/Year format
    let date = '', time = dateString.match(timeFormat)?.[0], timeZone = TZdefault.name

    if (time) { // Extracts the time, if it was provided
        dateString = dateString.replace(timeFormat, '').trim() // Remove the time from dateString
        if (/^(?!12).+pm/i.test(time)) time = time.replace(/\d+/, String(parseInt(time.match(/\d+/)![0]) + 12)) // Convert the time input to military time (add 12 hours for 1pm ~ 11pm)
        if (/^12.*am/i.test(time)) time = time.replace(/\d+/, '00') // Convert the time input to military time (replace 12am with 00am)
        time = time.replace(/\s*(am|pm)/i, '') // Remove AM or PM from the time input   
        while (!/\d+:\d+:\d+/.test(time)) {time += ':00'} // Coerce time input to format hh:mm:ss (hours, minutes, and seconds)
    }

    let dateData: RegExpMatchArray = ['']
    function getDateData(format: RegExp){
        if (dateString.replace(format, '').trim()) {timeZone = dateString.replace(format, '').trim().split(' ').at(-1)!} //Note the time zone if it was provided
        dateData = dateString.match(format)!
        if (!dateData[3]) {dateData[3] = year}
    }

    if (abbreviated.test(dateString)) { //Abbreviated date format
        getDateData(abbreviated)
        if (mdyTimeZones.some(tz => tz === timeZone)) {
            date = `${dateData[1]}/${dateData[2]}/${dateData[3]}`
        } else {
            date = `${dateData[2]}/${dateData[1]}/${dateData[3]}`
        }
    } else if (american.test(dateString)) { //American date format
        getDateData(american)
        date = `${dateData[1]} ${dateData[2]} ${dateData[3]}`
    } else if (british.test(dateString)) { //British date format
        getDateData(british)
        date = `${dateData[2]} ${dateData[1]} ${dateData[3]}`
    } else if (time) { //If a date wasn't specified, use today's date
        if (dateString) {timeZone = dateString.trim().split(' ').at(-1)!}
        const timeZoneOffset = findTimeZone(timeZone).offset
        now.setHours(new Date().getHours() + parseInt(timeZoneOffset.match(/-?\d+/)![0]))
        date = `${now.getMonth() + 1}/${now.getDate()}/${year}`
    } else {
        return null
    }

    const timeZoneOffset = findTimeZone(timeZone).offset
    return isNaN(Date.parse(`${date} ${time} ${timeZoneOffset}`)) ? Date.parse(`${date} ${time}`) : Date.parse(`${date} ${time} ${timeZoneOffset}`)
}

/**
 * Converts a Date object to a more readable format - [Thu Jan 1 1970 00:00:00 AM]
 * @param {Boolean} showTZ - Whether or not the time zone should be displayed
 */
export function dateToString(date: Date, timeZone: string = 'UTC', showTZ: boolean = false) {
    date.setMinutes(date.getMinutes() + new Date().getTimezoneOffset()) //Ensures that the function uses UTC rather than the system timezone. Unecessary in if host uses UTC.
    date.setMinutes(date.getMinutes() + parseOffset(findTimeZone(timeZone).offset)) //Add the offset from UTC to the date
    let dateString = String(date).replace(/\sGMT.\d{4}\s\(.+\)/, '') //Removes the timezone offset in GMT from the date string
    const hours = parseInt(dateString.match(/\d\d:/)![0])
    const ampm = hours < 12 ? 'AM' : 'PM'

    if (hours > 12) {dateString = dateString.replace(`${hours}:`, `${hours - 12}:`)} //Coerce the output to 12 hour format
    if (hours === 0) {dateString = dateString.replace(/00:/, '12:')} //Coerce the output to 12 hour format
    if (!showTZ) {timeZone = ''}
    return `${dateString} ${ampm} ${timeZone.toUpperCase()}`.trim()
}

/**
 * Takes a Date object and returns the simple date (e.g. January 1st, February 2nd, etc)
 */
export function getSimpleDate(date: Date){
    const simpleShortDate = date.toString().match(/\w+/g)!.slice(1,3)
    const simpleFullDate = fullDates[simpleShortDate[0]] + ' ' + getOrdinal(simpleShortDate[1])
    return simpleFullDate
}