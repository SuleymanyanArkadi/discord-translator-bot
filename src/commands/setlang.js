import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { setUserLang } from '../db.js';
import { describeLanguage, resolveLanguage } from '../languages.js';
import { languageAutocomplete } from './autocomplete.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setlang')
    .setDescription('Задать ваш язык по умолчанию (для реакции 🌐 и /translate)')
    .addStringOption((o) =>
      o.setName('language').setDescription('Язык, например «Русский (ru)»').setRequired(true).setAutocomplete(true),
    ),

  autocomplete: languageAutocomplete,

  async execute(interaction) {
    const input = interaction.options.getString('language', true);
    const lang = resolveLanguage(input);
    if (!lang) {
      await interaction.reply({
        content: `Не знаю язык «${input}». Выберите вариант из подсказок.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    setUserLang(interaction.user.id, lang.code);
    await interaction.reply({
      content: `Готово! Ваш язык: ${describeLanguage(lang.code)} (\`${lang.code}\`). Теперь ставьте 🌐 под сообщениями.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
