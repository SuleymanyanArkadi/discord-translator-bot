// Маппинг эмодзи-флагов стран (ISO 3166-1 alpha-2) на коды языков.
// Для многоязычных стран выбран основной (самый распространённый / государственный) язык.

const GROUPS = {
  en: `AC AG AI AQ AS AU BB BM BS BT BW BZ CA CC CK CX DG DM EU FJ FK FM GB GD GG GH GI GM GS GU GY
       HM IE IM IO JE JM KI KN KY LC LR MH MP MS MU NA NF NG NR NU NZ PG PN PW SB SC SG SH SL SS SZ
       TA TC TK TO TT TV UG UM UN US VC VG VI VU ZA ZM ZW`,
  fr: 'BF BI BJ BL CD CF CG CI CM CP DJ FR GA GF GN GP KM MC MF ML MQ NC NE PF PM RE SN TD TF TG WF YT',
  es: 'AR BO CL CO CR CU DO EA EC ES GQ GT HN IC MX NI PA PE PR PY SV UY VE',
  pt: 'AO BR CV GW MZ PT ST TL',
  ar: 'AE BH DZ EG EH IQ JO KW LB LY MA MR OM PS QA SA SD SY TN YE',
  de: 'AT CH DE LI',
  nl: 'AW BE BQ CW NL SR SX',
  it: 'IT SM VA',
  no: 'BV NO SJ',
  sv: 'AX SE',
  da: 'DK FO GL',
  'zh-CN': 'CN',
  'zh-TW': 'HK MO TW',
  sq: 'AL XK',
  sr: 'ME RS',
  el: 'CY GR',
  ro: 'MD RO',
  ms: 'BN MY',
  ko: 'KP KR',
  sw: 'KE TZ',
  fa: 'AF IR',
  ca: 'AD',
  hy: 'AM',
  az: 'AZ',
  bs: 'BA',
  bn: 'BD',
  bg: 'BG',
  be: 'BY',
  cs: 'CZ',
  et: 'EE',
  ti: 'ER',
  am: 'ET',
  fi: 'FI',
  ka: 'GE',
  hr: 'HR',
  ht: 'HT',
  hu: 'HU',
  id: 'ID',
  he: 'IL',
  hi: 'IN',
  is: 'IS',
  ja: 'JP',
  ky: 'KG',
  km: 'KH',
  kk: 'KZ',
  lo: 'LA',
  si: 'LK',
  st: 'LS',
  lt: 'LT',
  lb: 'LU',
  lv: 'LV',
  mg: 'MG',
  mk: 'MK',
  my: 'MM',
  mn: 'MN',
  mt: 'MT',
  dv: 'MV',
  ny: 'MW',
  ne: 'NP',
  tl: 'PH',
  ur: 'PK',
  pl: 'PL',
  ru: 'RU',
  rw: 'RW',
  sl: 'SI',
  sk: 'SK',
  so: 'SO',
  th: 'TH',
  tg: 'TJ',
  tk: 'TM',
  tr: 'TR',
  uk: 'UA',
  uz: 'UZ',
  vi: 'VN',
  sm: 'WS',
};

export const COUNTRY_TO_LANG = Object.freeze(
  Object.fromEntries(
    Object.entries(GROUPS).flatMap(([lang, countries]) =>
      countries.split(/\s+/).filter(Boolean).map((cc) => [cc, lang]),
    ),
  ),
);

// Флаги-субрегионы Великобритании (🏴 + тег-последовательность).
const SUBDIVISION_TO_LANG = { gbeng: 'en', gbsct: 'en', gbwls: 'cy' };

export const GLOBE_EMOJI = '🌐';

const RI_A = 0x1f1e6; // REGIONAL INDICATOR SYMBOL LETTER A
const RI_Z = 0x1f1ff;
const BLACK_FLAG = 0x1f3f4;
const TAG_A = 0xe0061;
const TAG_Z = 0xe007a;

/** Возвращает ISO-код страны для эмодзи-флага ('🇷🇺' -> 'RU') или null. */
export function countryFromFlag(emoji) {
  if (!emoji) return null;
  const cps = [...String(emoji).replace(/️/g, '')].map((c) => c.codePointAt(0));
  if (cps.length !== 2 || !cps.every((cp) => cp >= RI_A && cp <= RI_Z)) return null;
  return String.fromCharCode(...cps.map((cp) => cp - RI_A + 65));
}

function subdivisionFromFlag(emoji) {
  const cps = [...String(emoji)].map((c) => c.codePointAt(0));
  if (cps[0] !== BLACK_FLAG || cps.length < 3) return null;
  const tags = cps.slice(1, -1); // последний — CANCEL TAG
  if (!tags.every((cp) => cp >= TAG_A && cp <= TAG_Z)) return null;
  return String.fromCharCode(...tags.map((cp) => cp - TAG_A + 97));
}

/** Код языка для флага или null, если это не флаг / флаг неизвестен. */
export function langFromFlag(emoji) {
  const cc = countryFromFlag(emoji);
  if (cc) return COUNTRY_TO_LANG[cc] ?? null;
  const sub = emoji ? subdivisionFromFlag(emoji) : null;
  return sub ? SUBDIVISION_TO_LANG[sub] ?? null : null;
}

/**
 * Разбирает реакцию:
 *  - { kind: 'flag', lang, emoji } — флаг страны;
 *  - { kind: 'globe', emoji } — 🌐, перевод на язык пользователя;
 *  - null — реакцию игнорируем.
 */
export function parseReactionEmoji(name) {
  if (!name) return null;
  const clean = String(name).replace(/️/g, '');
  if (clean === GLOBE_EMOJI) return { kind: 'globe', emoji: GLOBE_EMOJI };
  const lang = langFromFlag(clean);
  return lang ? { kind: 'flag', lang, emoji: name } : null;
}
