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