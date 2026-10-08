// Языки, доступные боту. Коды совместимы с Google Translate;
// для DeepL они нормализуются отдельно (см. src/translate/deepl.js).
// [код, самоназвание, название по-русски, флаг для отображения]
const RAW = [
  ['af', 'Afrikaans', 'Африкаанс', '🇿🇦'],
  ['am', 'አማርኛ', 'Амхарский', '🇪🇹'],
  ['ar', 'العربية', 'Арабский', '🇸🇦'],
  ['az', 'Azərbaycan', 'Азербайджанский', '🇦🇿'],
  ['be', 'Беларуская', 'Белорусский', '🇧🇾'],
  ['bg', 'Български', 'Болгарский', '🇧🇬'],
  ['bn', 'বাংলা', 'Бенгальский', '🇧🇩'],
  ['bs', 'Bosanski', 'Боснийский', '🇧🇦'],
  ['ca', 'Català', 'Каталанский', '🇦🇩'],
  ['cs', 'Čeština', 'Чешский', '🇨🇿'],
  ['cy', 'Cymraeg', 'Валлийский', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
  ['da', 'Dansk', 'Датский', '🇩🇰'],
  ['de', 'Deutsch', 'Немецкий', '🇩🇪'],
  ['dv', 'ދިވެހި', 'Мальдивский', '🇲🇻'],
  ['el', 'Ελληνικά', 'Греческий', '🇬🇷'],
  ['en', 'English', 'Английский', '🇬🇧'],
  ['eo', 'Esperanto', 'Эсперанто', '🌍'],
  ['es', 'Español', 'Испанский', '🇪🇸'],
  ['et', 'Eesti', 'Эстонский', '🇪🇪'],
  ['eu', 'Euskara', 'Баскский', '🇪🇸'],
  ['fa', 'فارسی', 'Персидский', '🇮🇷'],
  ['fi', 'Suomi', 'Финский', '🇫🇮'],
  ['fr', 'Français', 'Французский', '🇫🇷'],
  ['ga', 'Gaeilge', 'Ирландский', '🇮🇪'],
  ['gl', 'Galego', 'Галисийский', '🇪🇸'],
  ['gu', 'ગુજરાતી', 'Гуджарати', '🇮🇳'],
  ['he', 'עברית', 'Иврит', '🇮🇱'],
  ['hi', 'हिन्दी', 'Хинди', '🇮🇳'],
  ['hr', 'Hrvatski', 'Хорватский', '🇭🇷'],
  ['ht', 'Kreyòl ayisyen', 'Гаитянский креольский', '🇭🇹'],
  ['hu', 'Magyar', 'Венгерский', '🇭🇺'],
  ['hy', 'Հայերեն', 'Армянский', '🇦🇲'],
  ['id', 'Bahasa Indonesia', 'Индонезийский', '🇮🇩'],
  ['is', 'Íslenska', 'Исландский', '🇮🇸'],
  ['it', 'Italiano', 'Итальянский', '🇮🇹'],
  ['ja', '日本語', 'Японский', '🇯🇵'],
  ['ka', 'ქართული', 'Грузинский', '🇬🇪'],
  ['kk', 'Қазақ тілі', 'Казахский', '🇰🇿'],
  ['km', 'ខ្មែរ', 'Кхмерский', '🇰🇭'],
  ['kn', 'ಕನ್ನಡ', 'Каннада', '🇮🇳'],
  ['ko', '한국어', 'Корейский', '🇰🇷'],
  ['ky', 'Кыргызча', 'Киргизский', '🇰🇬'],
  ['la', 'Latina', 'Латынь', '🇻🇦'],
  ['lb', 'Lëtzebuergesch', 'Люксембургский', '🇱🇺'],
  ['lo', 'ລາວ', 'Лаосский', '🇱🇦'],
  ['lt', 'Lietuvių', 'Литовский', '🇱🇹'],
  ['lv', 'Latviešu', 'Латышский', '🇱🇻'],
  ['mg', 'Malagasy', 'Малагасийский', '🇲🇬'],
  ['mk', 'Македонски', 'Македонский', '🇲🇰'],
  ['ml', 'മലയാളം', 'Малаялам', '🇮🇳'],
  ['mn', 'Монгол', 'Монгольский', '🇲🇳'],
  ['mr', 'मराठी', 'Маратхи', '🇮🇳'],
  ['ms', 'Bahasa Melayu', 'Малайский', '🇲🇾'],
  ['mt', 'Malti', 'Мальтийский', '🇲🇹'],
  ['my', 'မြန်မာ', 'Бирманский', '🇲🇲'],
  ['ne', 'नेपाली', 'Непальский', '🇳🇵'],
  ['nl', 'Nederlands', 'Нидерландский', '🇳🇱'],
  ['no', 'Norsk', 'Норвежский', '🇳🇴'],
  ['ny', 'Chichewa', 'Чева', '🇲🇼'],
  ['pa', 'ਪੰਜਾਬੀ', 'Панджаби', '🇮🇳'],
  ['pl', 'Polski', 'Польский', '🇵🇱'],
  ['ps', 'پښتو', 'Пушту', '🇦🇫'],
  ['pt', 'Português', 'Португальский', '🇵🇹'],
  ['ro', 'Română', 'Румынский', '🇷🇴'],
  ['ru', 'Русский', 'Русский', '🇷🇺'],
  ['rw', 'Kinyarwanda', 'Руанда', '🇷🇼'],
  ['si', 'සිංහල', 'Сингальский', '🇱🇰'],
  ['sk', 'Slovenčina', 'Словацкий', '🇸🇰'],
  ['sl', 'Slovenščina', 'Словенский', '🇸🇮'],
  ['sm', 'Gagana Samoa', 'Самоанский', '🇼🇸'],
  ['so', 'Soomaali', 'Сомали', '🇸🇴'],
  ['sq', 'Shqip', 'Албанский', '🇦🇱'],
  ['sr', 'Српски', 'Сербский', '🇷🇸'],
  ['st', 'Sesotho', 'Сесото', '🇱🇸'],
  ['sv', 'Svenska', 'Шведский', '🇸🇪'],
  ['sw', 'Kiswahili', 'Суахили', '🇹🇿'],
  ['ta', 'தமிழ்', 'Тамильский', '🇮🇳'],
  ['te', 'తెలుగు', 'Телугу', '🇮🇳'],
  ['tg', 'Тоҷикӣ', 'Таджикский', '🇹🇯'],
  ['th', 'ไทย', 'Тайский', '🇹🇭'],
  ['ti', 'ትግርኛ', 'Тигринья', '🇪🇷'],
  ['tk', 'Türkmen', 'Туркменский', '🇹🇲'],
  ['tl', 'Filipino', 'Филиппинский', '🇵🇭'],
  ['tr', 'Türkçe', 'Турецкий', '🇹🇷'],
  ['uk', 'Українська', 'Украинский', '🇺🇦'],
  ['ur', 'اردو', 'Урду', '🇵🇰'],
  ['uz', 'Oʻzbek', 'Узбекский', '🇺🇿'],
  ['vi', 'Tiếng Việt', 'Вьетнамский', '🇻🇳'],
  ['xh', 'isiXhosa', 'Коса', '🇿🇦'],
  ['yi', 'ייִדיש', 'Идиш', '🇮🇱'],
  ['zh-CN', '中文（简体）', 'Китайский (упрощённый)', '🇨🇳'],
  ['zh-TW', '中文（繁體）', 'Китайский (традиционный)', '🇹🇼'],
  ['zu', 'isiZulu', 'Зулу', '🇿🇦'],
];

export const LANGUAGES = RAW.map(([code, name, ru, flag]) => ({ code, name, ru, flag }));

const byCode = new Map(LANGUAGES.map((l) => [l.code.toLowerCase(), l]));

// Синонимы кодов, которые возвращают провайдеры или может ввести пользователь.
const ALIASES = {
  zh: 'zh-CN',
  'zh-hans': 'zh-CN',
  'zh-hant': 'zh-TW',
  iw: 'he',
  nb: 'no',
  nn: 'no',
  fil: 'tl',
  jw: 'jv',
  'en-us': 'en',
  'en-gb': 'en',
  'pt-br': 'pt',
  'pt-pt': 'pt',
};

/** Приводит код языка к виду из LANGUAGES (или возвращает как есть в нижнем регистре). */
export function normalizeLangCode(code) {
  if (!code) return null;
  const lower = String(code).trim().toLowerCase();
  if (byCode.has(lower)) return byCode.get(lower).code;
  if (ALIASES[lower]) return ALIASES[lower];
  const base = lower.split('-')[0];
  if (byCode.has(base)) return byCode.get(base).code;
  return lower;
}

export function getLanguage(code) {
  const norm = normalizeLangCode(code);
  return norm ? byCode.get(norm.toLowerCase()) ?? null : null;
}

/** Базовая часть кода для сравнения языков: 'zh-CN' -> 'zh', 'en-US' -> 'en'. */
export function baseLang(code) {
  return (normalizeLangCode(code) ?? '').split('-')[0];
}

export function isSameLanguage(a, b) {
  return Boolean(a && b) && baseLang(a) === baseLang(b);
}

/** Человекочитаемое название: «🇷🇺 Русский». */
export function describeLanguage(code) {
  const lang = getLanguage(code);
  if (lang) return `${lang.flag} ${lang.name}`;
  return code ? String(code).toUpperCase() : 'неизвестный язык';
}

export function formatChoice(lang) {
  return `${lang.name} (${lang.code})`;
}

/** Находит язык по коду, самоназванию, русскому названию или строке вида «Русский (ru)». */
export function resolveLanguage(input) {
  if (!input) return null;
  const q = String(input).trim().toLowerCase();
  const direct = getLanguage(q);
  if (direct && (byCode.has(q) || ALIASES[q])) return direct;
  const inParens = q.match(/\(([a-z-]+)\)\s*$/i);
  if (inParens && getLanguage(inParens[1])) return getLanguage(inParens[1]);
  return LANGUAGES.find((l) => l.name.toLowerCase() === q || l.ru.toLowerCase() === q) ?? null;
}

// Популярные языки показываются первыми при пустом запросе и при равной релевантности.
const POPULAR = ['en', 'ru', 'es', 'de', 'fr', 'zh-CN', 'ja', 'pt', 'it', 'uk', 'hy', 'tr', 'ar', 'ko', 'pl'];
const popularity = (l) => {
  const i = POPULAR.indexOf(l.code);
  return i === -1 ? POPULAR.length : i;
};

function matchScore(l, q) {
  const code = l.code.toLowerCase();
  const names = [l.name.toLowerCase(), l.ru.toLowerCase()];
  if (code === q || names.includes(q)) return 0;
  if (code.startsWith(q)) return 1;
  if (names.some((n) => n.startsWith(q))) return 2;
  if (names.some((n) => n.includes(q))) return 3;
  return -1;
}

/** Поиск для autocomplete: точное совпадение, код, начало названия, вхождение. */
export function searchLanguages(query, limit = 25) {
  const q = String(query ?? '').trim().toLowerCase();
  return LANGUAGES.map((l) => ({ l, score: q ? matchScore(l, q) : 0 }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score || popularity(a.l) - popularity(b.l))
    .slice(0, limit)
    .map((x) => x.l);
}
