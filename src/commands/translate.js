import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { config } from '../config.js';
import { getUserLang } from '../db.js';
import { resolveLanguage } from '../languages.js';
import { log } from '../logger.js';
import { rateLimiter } from '../ratelimit.js';
import { TranslationError, translateParts } from '../translate/index.js';
import { SETLANG_HINT, buildTranslationEmbed, composeParts } from '../ui.js';
import { languageAutocomplete } from './autocomplete.js';

export default {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Перевести текст')
    .addStringOption((o) =>
      o.setName('text').setDescription('Текст для перевода').setRequired(true).setMaxLength(4000),
    )
    .addStringOption((o) =>
      o.setName('to').setDescription('На какой язык (по умолчанию — ваш из /setlang)').setAutocomplete(true),
    ),

  autocomplete: languageAutocomplete,

  async execute(interaction) {
    const text = interaction.options.getString('text', true);
    const toInput = interaction.options.getString('to');
    const ephemeral = { flags: MessageFlags.Ephemeral };

    let targetLang;
    let hint = false;
    if (toInput) {
      const lang = resolveLanguage(toInput);
      if (!lang) {
        await interaction.reply({ content: `Не знаю язык «${toInput}». Выберите вариант из подсказок.`, ...ephemeral });
        return;
      }
      targetLang = lang.code;
    } else {
      const saved = getUserLang(interaction.user.id);
      targetLang = saved ?? config.defaultLang;
      hint = !saved;
    }

    if (!rateLimiter.hit(interaction.user.id)) {
      log.info(`Rate limit: ${interaction.user.tag} превысил лимит в /translate`);
      await interaction.reply({
        content: `Слишком много переводов: не больше ${config.rateLimit.limit} в минуту. Подождите немного.`,
        ...ephemeral,
      });
      return;
    }

    await interaction.deferReply(ephemeral);
    try {
      const result = await translateParts([{ kind: 'content', text }], targetLang);
      const embed = buildTranslationEmbed({
        text: composeParts(result.parts),
        sourceLang: result.sourceLang,
        targetLang,
        provider: result.provider,
        sameLanguage: result.sameLanguage,
      });
      await interaction.editReply({ content: hint ? SETLANG_HINT : undefined, embeds: [embed] });
    } catch (err) {
      if (!(err instanceof TranslationError)) log.error('Ошибка /translate:', err);
      await interaction.editReply({
        content: err instanceof TranslationError ? err.message : 'Не удалось перевести текст.',
      });
    }
  },
};
