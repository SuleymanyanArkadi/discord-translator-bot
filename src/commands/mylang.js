import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { config } from '../config.js';
import { getUserLang } from '../db.js';
import { describeLanguage } from '../languages.js';

export default {
  data: new SlashCommandBuilder().setName('mylang').setDescription('Показать ваш язык по умолчанию'),

  async execute(interaction) {
    const lang = getUserLang(interaction.user.id);
    const content = lang
      ? `Ваш язык по умолчанию: ${describeLanguage(lang)} (\`${lang}\`). Изменить: \`/setlang\`.`
      : `Язык не задан, для 🌐 используется ${describeLanguage(config.defaultLang)}. Задайте свой: \`/setlang\`.`;
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  },
};
