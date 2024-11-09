export const languageCookie = { name: 'ln', value: '2', domain: 'game.granbluefantasy.jp' }
export const accessCookie = { name: 'wing', value: process.env.GBF_WING!, domain: 'game.granbluefantasy.jp' }

export const rarityFullNames: {[key: string]: 'SS Rare' | 'S Rare' | 'Rare' | 'Normal'} = {
    'SSR': 'SS Rare',
    'SR': 'S Rare',
    'R': 'Rare',
    'N': 'Normal'
};
