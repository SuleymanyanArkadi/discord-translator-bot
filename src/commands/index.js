import setlang from './setlang.js';
import mylang from './mylang.js';
import translate from './translate.js';

const list = [setlang, mylang, translate];

/** Map<имя команды, команда> */
export const commands = new Map(list.map((c) => [c.data.name, c]));

/** JSON для регистрации в Discord API. */
export const commandsJSON = list.map((c) => c.data.toJSON());
