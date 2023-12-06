/**
 * Check if a number is between two other numbers, exclusive of upper and lower bounds.
 */
export function isBetween(num: number, min: number, max: number){
    return num > min && num < max
}

/**
 * Check if a number is between two other numbers, inclusive of upper and lower bounds.
 */
export function isInRange(num: number, min: number, max: number){
    return num >= min && num <= max
}

/**
 * Checks whether a value is a number or not.
 */
export function isNumber(value: number | null){
    return typeof value === 'number'
}

/**
 * Returns the ordinal of a number (1 => 1st, 2 => 2nd etc)
 */
export function getOrdinal(number: number | string) {
    if (typeof number === 'string') number = parseInt(number)
    let ordinal = 'th'

    if (number % 10 == 1 && number % 100 != 11){
        ordinal = 'st'
    } else if (number % 10 == 2 && number % 100 != 12){
        ordinal = 'nd'
    } else if (number % 10 == 3 && number % 100 != 13){
        ordinal = 'rd'
    }

    return String(number) + ordinal
}

/**
 * Rounds a number correctly, preventing Javascript issues like rounding 5 down instead of up.
 * - https://stackoverflow.com/a/18358056/12109293
 */
export function round(num: number, places: number = 2){
    return Number(Math.round(Number(num + 'e+' + places)) + 'e-' + places)
}