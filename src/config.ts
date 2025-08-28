const devMode = process.env.DEV_MODE === 'true'

export const botID = devMode ? '631961435051917362' : '585514230967566338'
export const botToken = devMode ? process.env.DEV_TOKEN! : process.env.BOT_TOKEN!