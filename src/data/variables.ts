export const languageCookie = { name: 'ln', value: '2', domain: 'game.granbluefantasy.jp' }
export const accessCookie = {name: 'wing', value: process.env.GBF_WING!, domain: 'game.granbluefantasy.jp'}

export const rarityEmotes: {[key: string]: string} = {
    'SS Rare': '<:SSR:755671138624864266> ',
    'S Rare': '<:SR:755671130882179113> ',
    'Rare': '<:R_:755671123588546623> '
}

export const weaponEmotes: {[key: string]: string} = {
    'Sabre': '<:Sabre:755661280332742699> ',
    'Dagger': '<:Dagger:755667404784140348> ',
    'Spear': '<:Spear:755662079846776933> ',
    'Axe': '<:Axe:755668293632917564> ',
    'Staff': '<:Staff:755662292254851093> ',
    'Gun': '<:Gun:755668506300776520> ',
    'Melee': '<:Melee:755668026023477339> ',
    'Bow': '<:Bow:755662696745009194> ',
    'Harp': '<:Harp:755662500250386433> ',
    'Katana': '<:Katana:755661824925499442> '
}

export const timeZoneOffsets = [
    { name: 'A', offset: 'UTC +1' },
    { name: 'ACDT', offset: 'UTC +10:30' },
    { name: 'ACST', offset: 'UTC +9:30' },
    { name: 'ACT', offset: 'UTC -5' },
    { name: 'ACT', offset: 'UTC +9:30' },
    { name: 'ACWST', offset: 'UTC +8:45' },
    { name: 'ADT', offset: 'UTC +4' },
    { name: 'ADT', offset: 'UTC -3' },
    { name: 'AEDT', offset: 'UTC +11' },
    { name: 'AEST', offset: 'UTC +10' },
    { name: 'AET', offset: 'UTC +10:00' },
    { name: 'AFT', offset: 'UTC +4:30' },
    { name: 'AKDT', offset: 'UTC -8' },
    { name: 'AKST', offset: 'UTC -9' },
    { name: 'ALMT', offset: 'UTC +6' },
    { name: 'AMST', offset: 'UTC -3' },
    { name: 'AMST', offset: 'UTC +5' },
    { name: 'AMT', offset: 'UTC -4' },
    { name: 'AMT', offset: 'UTC +4' },
    { name: 'ANAST', offset: 'UTC +12' },
    { name: 'ANAT', offset: 'UTC +12' },
    { name: 'AQTT', offset: 'UTC +5' },
    { name: 'ART', offset: 'UTC -3' },
    { name: 'AST', offset: 'UTC +3' },
    { name: 'AST', offset: 'UTC -4' },
    { name: 'AT', offset: 'UTC -4:00' },
    { name: 'AWDT', offset: 'UTC +9' },
    { name: 'AWST', offset: 'UTC +8' },
    { name: 'AZOST', offset: 'UTC +0' },
    { name: 'AZOT', offset: 'UTC -1' },
    { name: 'AZST', offset: 'UTC +5' },
    { name: 'AZT', offset: 'UTC +4' },
    { name: 'AoE', offset: 'UTC -12' },
    { name: 'B', offset: 'UTC +2' },
    { name: 'BNT', offset: 'UTC +8' },
    { name: 'BOT', offset: 'UTC -4' },
    { name: 'BRST', offset: 'UTC -2' },
    { name: 'BRT', offset: 'UTC -3' },
    { name: 'BST', offset: 'UTC +1' },
    { name: 'BTT', offset: 'UTC +6' },
    { name: 'C', offset: 'UTC +3' },
    { name: 'CAST', offset: 'UTC +8' },
    { name: 'CAT', offset: 'UTC +2' },
    { name: 'CCT', offset: 'UTC +6:30' },
    { name: 'CDT', offset: 'UTC -5' },
    { name: 'CDT', offset: 'UTC -4' },
    { name: 'CEST', offset: 'UTC +2' },
    { name: 'CET', offset: 'UTC +1' },
    { name: 'CHADT', offset: 'UTC +13:45' },
    { name: 'CHAST', offset: 'UTC +12:45' },
    { name: 'CHOST', offset: 'UTC +9' },
    { name: 'CHOT', offset: 'UTC +8' },
    { name: 'CHUT', offset: 'UTC +10' },
    { name: 'CIDST', offset: 'UTC -4' },
    { name: 'CIST', offset: 'UTC -5' },
    { name: 'CKT', offset: 'UTC -10' },
    { name: 'CLST', offset: 'UTC -3' },
    { name: 'CLT', offset: 'UTC -4' },
    { name: 'COT', offset: 'UTC -5' },
    { name: 'CST', offset: 'UTC -6' },
    { name: 'CST', offset: 'UTC +8' },
    { name: 'CST', offset: 'UTC -5' },
    { name: 'CT', offset: 'UTC -6:00' },
    { name: 'CVT', offset: 'UTC -1' },
    { name: 'CXT', offset: 'UTC +7' },
    { name: 'ChST', offset: 'UTC +10' },
    { name: 'D', offset: 'UTC +4' },
    { name: 'DAVT', offset: 'UTC +7' },
    { name: 'DDUT', offset: 'UTC +10' },
    { name: 'E', offset: 'UTC +5' },
    { name: 'EASST', offset: 'UTC -5' },
    { name: 'EAST', offset: 'UTC -6' },
    { name: 'EAT', offset: 'UTC +3' },
    { name: 'ECT', offset: 'UTC -5' },
    { name: 'EDT', offset: 'UTC -4' },
    { name: 'EEST', offset: 'UTC +3' },
    { name: 'EET', offset: 'UTC +2' },
    { name: 'EGST', offset: 'UTC +0' },
    { name: 'EGT', offset: 'UTC -1' },
    { name: 'EST', offset: 'UTC -5' },
    { name: 'ET', offset: 'UTC -5:00' },
    { name: 'F', offset: 'UTC +6' },
    { name: 'FET', offset: 'UTC +3' },
    { name: 'FJST', offset: 'UTC +13' },
    { name: 'FJT', offset: 'UTC +12' },
    { name: 'FKST', offset: 'UTC -3' },
    { name: 'FKT', offset: 'UTC -4' },
    { name: 'FNT', offset: 'UTC -2' },
    { name: 'G', offset: 'UTC +7' },
    { name: 'GALT', offset: 'UTC -6' },
    { name: 'GAMT', offset: 'UTC -9' },
    { name: 'GET', offset: 'UTC +4' },
    { name: 'GFT', offset: 'UTC -3' },
    { name: 'GILT', offset: 'UTC +12' },
    { name: 'GMT', offset: 'UTC +0' },
    { name: 'GST', offset: 'UTC +4' },
    { name: 'GST', offset: 'UTC -2' },
    { name: 'GYT', offset: 'UTC -4' },
    { name: 'H', offset: 'UTC +8' },
    { name: 'HDT', offset: 'UTC -9' },
    { name: 'HKT', offset: 'UTC +8' },
    { name: 'HOVST', offset: 'UTC +8' },
    { name: 'HOVT', offset: 'UTC +7' },
    { name: 'HST', offset: 'UTC -10' },
    { name: 'I', offset: 'UTC +9' },
    { name: 'ICT', offset: 'UTC +7' },
    { name: 'IDT', offset: 'UTC +3' },
    { name: 'IOT', offset: 'UTC +6' },
    { name: 'IRDT', offset: 'UTC +4:30' },
    { name: 'IRKST', offset: 'UTC +9' },
    { name: 'IRKT', offset: 'UTC +8' },
    { name: 'IRST', offset: 'UTC +3:30' },
    { name: 'IST', offset: 'UTC +5:30' },
    { name: 'IST', offset: 'UTC +1' },
    { name: 'IST', offset: 'UTC +2' },
    { name: 'JST', offset: 'UTC +9' },
    { name: 'K', offset: 'UTC +10' },
    { name: 'KGT', offset: 'UTC +6' },
    { name: 'KOST', offset: 'UTC +11' },
    { name: 'KRAST', offset: 'UTC +8' },
    { name: 'KRAT', offset: 'UTC +7' },
    { name: 'KST', offset: 'UTC +9' },
    { name: 'KUYT', offset: 'UTC +4' },
    { name: 'L', offset: 'UTC +11' },
    { name: 'LHDT', offset: 'UTC +11' },
    { name: 'LHST', offset: 'UTC +10:30' },
    { name: 'LINT', offset: 'UTC +14' },
    { name: 'M', offset: 'UTC +12' },
    { name: 'MAGST', offset: 'UTC +12' },
    { name: 'MAGT', offset: 'UTC +11' },
    { name: 'MART', offset: 'UTC -9:30' },
    { name: 'MAWT', offset: 'UTC +5' },
    { name: 'MDT', offset: 'UTC -6' },
    { name: 'MHT', offset: 'UTC +12' },
    { name: 'MMT', offset: 'UTC +6:30' },
    { name: 'MSD', offset: 'UTC +4' },
    { name: 'MSK', offset: 'UTC +3' },
    { name: 'MST', offset: 'UTC -7' },
    { name: 'MT', offset: 'UTC -7:00' },
    { name: 'MUT', offset: 'UTC +4' },
    { name: 'MVT', offset: 'UTC +5' },
    { name: 'MYT', offset: 'UTC +8' },
    { name: 'N', offset: 'UTC -1' },
    { name: 'NCT', offset: 'UTC +11' },
    { name: 'NDT', offset: 'UTC -2:30' },
    { name: 'NFDT', offset: 'UTC +12' },
    { name: 'NFT', offset: 'UTC +11' },
    { name: 'NOVST', offset: 'UTC +7' },
    { name: 'NOVT', offset: 'UTC +7' },
    { name: 'NPT', offset: 'UTC +5:45' },
    { name: 'NRT', offset: 'UTC +12' },
    { name: 'NST', offset: 'UTC -3:30' },
    { name: 'NUT', offset: 'UTC -11' },
    { name: 'NZDT', offset: 'UTC +13' },
    { name: 'NZST', offset: 'UTC +12' },
    { name: 'O', offset: 'UTC -2' },
    { name: 'OMSST', offset: 'UTC +7' },
    { name: 'OMST', offset: 'UTC +6' },
    { name: 'ORAT', offset: 'UTC +5' },
    { name: 'P', offset: 'UTC -3' },
    { name: 'PDT', offset: 'UTC -7' },
    { name: 'PET', offset: 'UTC -5' },
    { name: 'PETST', offset: 'UTC +12' },
    { name: 'PETT', offset: 'UTC +12' },
    { name: 'PGT', offset: 'UTC +10' },
    { name: 'PHOT', offset: 'UTC +13' },
    { name: 'PHT', offset: 'UTC +8' },
    { name: 'PKT', offset: 'UTC +5' },
    { name: 'PMDT', offset: 'UTC -2' },
    { name: 'PMST', offset: 'UTC -3' },
    { name: 'PONT', offset: 'UTC +11' },
    { name: 'PST', offset: 'UTC -8' },
    { name: 'PST', offset: 'UTC -8' },
    { name: 'PT', offset: 'UTC -8:00' },
    { name: 'PWT', offset: 'UTC +9' },
    { name: 'PYST', offset: 'UTC -3' },
    { name: 'PYT', offset: 'UTC -4' },
    { name: 'PYT', offset: 'UTC +8:30' },
    { name: 'Q', offset: 'UTC -4' },
    { name: 'QYZT', offset: 'UTC +6' },
    { name: 'R', offset: 'UTC -5' },
    { name: 'RET', offset: 'UTC +4' },
    { name: 'ROTT', offset: 'UTC -3' },
    { name: 'S', offset: 'UTC -6' },
    { name: 'SAKT', offset: 'UTC +11' },
    { name: 'SAMT', offset: 'UTC +4' },
    { name: 'SAST', offset: 'UTC +2' },
    { name: 'SBT', offset: 'UTC +11' },
    { name: 'SCT', offset: 'UTC +4' },
    { name: 'SGT', offset: 'UTC +8' },
    { name: 'SRET', offset: 'UTC +11' },
    { name: 'SRT', offset: 'UTC -3' },
    { name: 'SST', offset: 'UTC -11' },
    { name: 'SYOT', offset: 'UTC +3' },
    { name: 'T', offset: 'UTC -7' },
    { name: 'TAHT', offset: 'UTC -10' },
    { name: 'TFT', offset: 'UTC +5' },
    { name: 'TJT', offset: 'UTC +5' },
    { name: 'TKT', offset: 'UTC +13' },
    { name: 'TLT', offset: 'UTC +9' },
    { name: 'TMT', offset: 'UTC +5' },
    { name: 'TOST', offset: 'UTC +14' },
    { name: 'TOT', offset: 'UTC +13' },
    { name: 'TRT', offset: 'UTC +3' },
    { name: 'TVT', offset: 'UTC +12' },
    { name: 'U', offset: 'UTC -8' },
    { name: 'ULAST', offset: 'UTC +9' },
    { name: 'ULAT', offset: 'UTC +8' },
    { name: 'UTC', offset: 'UTC +0' },
    { name: 'UYST', offset: 'UTC -2' },
    { name: 'UYT', offset: 'UTC -3' },
    { name: 'UZT', offset: 'UTC +5' },
    { name: 'V', offset: 'UTC -9' },
    { name: 'VET', offset: 'UTC -4' },
    { name: 'VLAST', offset: 'UTC +11' },
    { name: 'VLAT', offset: 'UTC +10' },
    { name: 'VOST', offset: 'UTC +6' },
    { name: 'VUT', offset: 'UTC +11' },
    { name: 'W', offset: 'UTC -10' },
    { name: 'WAKT', offset: 'UTC +12' },
    { name: 'WARST', offset: 'UTC -3' },
    { name: 'WAST', offset: 'UTC +2' },
    { name: 'WAT', offset: 'UTC +1' },
    { name: 'WEST', offset: 'UTC +1' },
    { name: 'WET', offset: 'UTC +0' },
    { name: 'WFT', offset: 'UTC +12' },
    { name: 'WGST', offset: 'UTC -2' },
    { name: 'WGT', offset: 'UTC -3' },
    { name: 'WIB', offset: 'UTC +7' },
    { name: 'WIT', offset: 'UTC +9' },
    { name: 'WITA', offset: 'UTC +8' },
    { name: 'WST', offset: 'UTC +13' },
    { name: 'WST', offset: 'UTC +1' },
    { name: 'WT', offset: 'UTC +0' },
    { name: 'X', offset: 'UTC -11' },
    { name: 'Y', offset: 'UTC -12' },
    { name: 'YAKST', offset: 'UTC +10' },
    { name: 'YAKT', offset: 'UTC +9' },
    { name: 'YAPT', offset: 'UTC +10' },
    { name: 'YEKST', offset: 'UTC +6' },
    { name: 'YEKT', offset: 'UTC +5' },
    { name: 'Z', offset: 'UTC +0' }
]

/**
 * Modifications to the list below (which was received from Google's Translate API):
 * Removed - (Meitei Mayek) from Manipuri and added a separate entry for the same language with name: "Meitei"
 * Removed - (Oriya) from Odia and added a separate entry for the same language with name: "Oriya"
 * Replaced - Myanmar (Burmese) with Burmese
 * Replaced - Chinese (Simplified) and Chinese (Traditional) with Simplified Chinese and Traditional Chinese, respectively
 * Replaced - Kurdish (Kurmanji) and Kurdish (Sorani) with Kurmanji Kurdish and Sorani Kurdish, respectively
 * Added - fil as a language code for Filipino
 * DO NOT REMOVE ANY ENTRIES, ONLY NAMES CAN BE CHANGED
 */
export const languageCodes = [
    {code:'af', name:'Afrikaans'},
    {code:'ak', name:'Akan'},
    {code:'sq', name:'Albanian'},
    {code:'am', name:'Amharic'},
    {code:'ar', name:'Arabic'},
    {code:'hy', name:'Armenian'},
    {code:'as', name:'Assamese'},
    {code:'ay', name:'Aymara'},
    {code:'az', name:'Azerbaijani'},
    {code:'bm', name:'Bambara'},
    {code:'eu', name:'Basque'},
    {code:'be', name:'Belarusian'},
    {code:'bn', name:'Bengali'},
    {code:'bho', name:'Bhojpuri'},
    {code:'bs', name:'Bosnian'},
    {code:'bg', name:'Bulgarian'},
    {code:'ca', name:'Catalan'},
    {code:'ceb', name:'Cebuano'},
    {code:'ny', name:'Chichewa'},
    {code:'zh', name:'Simplified Chinese'},
    {code:'zh-CN', name:'Simplified Chinese'},
    {code:'zh-TW', name:'Traditional Chinese'},
    {code:'co', name:'Corsican'},
    {code:'hr', name:'Croatian'},
    {code:'cs', name:'Czech'},
    {code:'da', name:'Danish'},
    {code:'dv', name:'Divehi'},
    {code:'doi', name:'Dogri'},
    {code:'nl', name:'Dutch'},
    {code:'en', name:'English'},
    {code:'eo', name:'Esperanto'},
    {code:'et', name:'Estonian'},
    {code:'ee', name:'Ewe'},
    {code:'tl', name:'Filipino'},
    {code:'fil', name:'Filipino'},
    {code:'fi', name:'Finnish'},
    {code:'fr', name:'French'},
    {code:'fy', name:'Frisian'},
    {code:'gl', name:'Galician'},
    {code:'lg', name:'Ganda'},
    {code:'ka', name:'Georgian'},
    {code:'de', name:'German'},
    {code:'gom', name:'Goan Konkani'},
    {code:'el', name:'Greek'},
    {code:'gn', name:'Guarani'},
    {code:'gu', name:'Gujarati'},
    {code:'ht', name:'Haitian Creole'},
    {code:'ha', name:'Hausa'},
    {code:'haw', name:'Hawaiian'},
    {code:'iw', name:'Hebrew'},
    {code:'hi', name:'Hindi'},
    {code:'hmn', name:'Hmong'},
    {code:'hu', name:'Hungarian'},
    {code:'is', name:'Icelandic'},
    {code:'ig', name:'Igbo'},
    {code:'ilo', name:'Iloko'},
    {code:'id', name:'Indonesian'},
    {code:'ga', name:'Irish'},
    {code:'it', name:'Italian'},
    {code:'ja', name:'Japanese'},
    {code:'jw', name:'Javanese'},
    {code:'kn', name:'Kannada'},
    {code:'kk', name:'Kazakh'},
    {code:'km', name:'Khmer'},
    {code:'rw', name:'Kinyarwanda'},
    {code:'ko', name:'Korean'},
    {code:'kri', name:'Krio'},
    {code:'ku', name:'Kurmanji Kurdish'},
    {code:'ckb', name:'Sorani Kurdish'},
    {code:'ky', name:'Kyrgyz'},
    {code:'lo', name:'Lao'},
    {code:'la', name:'Latin'},
    {code:'lv', name:'Latvian'},
    {code:'ln', name:'Lingala'},
    {code:'lt', name:'Lithuanian'},
    {code:'lb', name:'Luxembourgish'},
    {code:'mk', name:'Macedonian'},
    {code:'mai', name:'Maithili'},
    {code:'mg', name:'Malagasy'},
    {code:'ms', name:'Malay'},
    {code:'ml', name:'Malayalam'},
    {code:'mt', name:'Maltese'},
    {code:'mni-Mtei', name:'Manipuri'},
    {code:'mni-Mtei', name:'Meitei'},
    {code:'mi', name:'Maori'},
    {code:'mr', name:'Marathi'},
    {code:'lus', name:'Mizo'},
    {code:'mn', name:'Mongolian'},
    {code:'my', name:'Burmese'},
    {code:'ne', name:'Nepali'},
    {code:'nso', name:'Northern Sotho'},
    {code:'no', name:'Norwegian'},
    {code:'or', name:'Odia'},
    {code:'or', name:'Oriya'},
    {code:'om', name:'Oromo'},
    {code:'ps', name:'Pashto'},
    {code:'fa', name:'Persian'},
    {code:'pl', name:'Polish'},
    {code:'pt', name:'Portuguese'},
    {code:'pa', name:'Punjabi'},
    {code:'qu', name:'Quechua'},
    {code:'ro', name:'Romanian'},
    {code:'ru', name:'Russian'},
    {code:'sm', name:'Samoan'},
    {code:'sa', name:'Sanskrit'},
    {code:'gd', name:'Scots Gaelic'},
    {code:'sr', name:'Serbian'},
    {code:'st', name:'Sesotho'},
    {code:'sn', name:'Shona'},
    {code:'sd', name:'Sindhi'},
    {code:'si', name:'Sinhala'},
    {code:'sk', name:'Slovak'},
    {code:'sl', name:'Slovenian'},
    {code:'so', name:'Somali'},
    {code:'es', name:'Spanish'},
    {code:'su', name:'Sundanese'},
    {code:'sw', name:'Swahili'},
    {code:'sv', name:'Swedish'},
    {code:'tg', name:'Tajik'},
    {code:'ta', name:'Tamil'},
    {code:'tt', name:'Tatar'},
    {code:'te', name:'Telugu'},
    {code:'th', name:'Thai'},
    {code:'ti', name:'Tigrinya'},
    {code:'ts', name:'Tsonga'},
    {code:'tr', name:'Turkish'},
    {code:'tk', name:'Turkmen'},
    {code:'uk', name:'Ukrainian'},
    {code:'ur', name:'Urdu'},
    {code:'ug', name:'Uyghur'},
    {code:'uz', name:'Uzbek'},
    {code:'vi', name:'Vietnamese'},
    {code:'cy', name:'Welsh'},
    {code:'xh', name:'Xhosa'},
    {code:'yi', name:'Yiddish'},
    {code:'yo', name:'Yoruba'},
    {code:'zu', name:'Zulu'},
    {code:'he', name:'Hebrew'},
]