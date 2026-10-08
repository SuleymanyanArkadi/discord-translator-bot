import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRY_TO_LANG, countryFromFlag, langFromFlag, parseReactionEmoji } from '../src/flags.js';
import { getLanguage } from '../src/languages.js';

// Полный список ISO 3166-1 alpha-2 (249 кодов).
const ISO = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS
BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER
ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE
IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA
MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM
PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR
SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU
WF WS YE YT ZA ZM ZW`.split(/\s+/);

const flag = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

test('ISO-список содержит 249 кодов', () => assert.equal(ISO.length, 249));

test('каждая страна ISO 3166-1 имеет язык', () => {
  const missing = ISO.filter((cc) => !COUNTRY_TO_LANG[cc]);
  assert.deepEqual(missing, []);
});

test('каждый язык из маппинга есть в списке языков', () => {
  const unknown = [...new Set(Object.values(COUNTRY_TO_LANG))].filter((l) => !getLanguage(l));
  assert.deepEqual(unknown, []);
});

test('флаг -> код страны', () => {
  assert.equal(countryFromFlag('🇷🇺'), 'RU');
  assert.equal(countryFromFlag('🇦🇲'), 'AM');
  assert.equal(countryFromFlag('😀'), null);
  assert.equal(countryFromFlag('🇷'), null);
  assert.equal(countryFromFlag(''), null);
});

test('основные флаги -> языки', () => {
  const cases = {
    '🇷🇺': 'ru', '🇬🇧': 'en', '🇺🇸': 'en', '🇩🇪': 'de', '🇦🇲': 'hy', '🇫🇷': 'fr', '🇪🇸': 'es',
    '🇧🇷': 'pt', '🇵🇹': 'pt', '🇨🇳': 'zh-CN', '🇹🇼': 'zh-TW', '🇭🇰': 'zh-TW', '🇯🇵': 'ja',
    '🇺🇦': 'uk', '🇧🇾': 'be', '🇰🇿': 'kk', '🇬🇪': 'ka', '🇮🇱': 'he', '🇳🇴': 'no', '🇨🇭': 'de',
    '🇧🇪': 'nl', '🇨🇦': 'en', '🇮🇳': 'hi', '🇪🇺': 'en', '🇦🇹': 'de', '🇲🇽': 'es', '🇵🇭': 'tl',
  };
  for (const [emoji, lang] of Object.entries(cases)) assert.equal(langFromFlag(emoji), lang, emoji);
});

test('все 249 флагов дают язык', () => {
  for (const cc of ISO) assert.ok(langFromFlag(flag(cc)), cc);
});

test('флаги Англии/Шотландии/Уэльса', () => {
  assert.equal(langFromFlag('🏴󠁧󠁢󠁥󠁮󠁧󠁿'), 'en');
  assert.equal(langFromFlag('🏴󠁧󠁢󠁳󠁣󠁴󠁿'), 'en');
  assert.equal(langFromFlag('🏴󠁧󠁢󠁷󠁬󠁳󠁿'), 'cy');
  assert.equal(langFromFlag('🏴'), null);
});

test('parseReactionEmoji', () => {
  assert.deepEqual(parseReactionEmoji('🇩🇪'), { kind: 'flag', lang: 'de', emoji: '🇩🇪' });
  assert.deepEqual(parseReactionEmoji('🌐'), { kind: 'globe', emoji: '🌐' });
  assert.deepEqual(parseReactionEmoji('🌐️'), { kind: 'globe', emoji: '🌐' });
  assert.equal(parseReactionEmoji('👍'), null);
  assert.equal(parseReactionEmoji('🏳️‍🌈'), null);
  assert.equal(parseReactionEmoji(null), null); // кастомные эмодзи без имени
  assert.equal(parseReactionEmoji('custom_emoji'), null);
});
