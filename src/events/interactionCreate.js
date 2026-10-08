import { Events, MessageFlags } from 'discord.js';
import { commands } from '../commands/index.js';
import { log } from '../logger.js';
import { pending } from '../pending.js';
import { BUTTON_PREFIX, SETLANG_HINT, buildTranslationEmbed, composeParts } from '../ui.js';
import { safeDelete } from '../utils.js';

const EPHEMERAL = MessageFlags.Ephemeral;

async function handleButton(interaction) {
  const id = interaction.customId.slice(BUTTON_PREFIX.length);
  const entry = pending.get(id);

  if (!entry) {
    await interaction.reply({ content: 'Перевод устарел, поставьте флаг ещё раз.', flags: EPHEMERAL });
    await safeDelete(interaction.message);
    return;
  }

  if (interaction.user.id !== entry.userId) {
    await interaction.reply({ content: 'Это не ваш перевод — поставьте флаг сами.', flags: EPHEMERAL });
    return;
  }

  pending.take(id);
  const { result } = entry;
  const embed = buildTranslationEmbed({
    text: composeParts(result.parts),
    sourceLang: result.sourceLang,
    targetLang: entry.targetLang,
    provider: result.provider,
    sameLanguage: result.sameLanguage,
    url: entry.url,
    authorName: entry.authorName,
  });
  await interaction.reply({
    content: entry.hint ? SETLANG_HINT : undefined,
    embeds: [embed],
    flags: EPHEMERAL,
  });
  await safeDelete(interaction.message);
}

async function replyError(interaction, content) {
  try {
    if (interaction.deferred || interaction.replied) await interaction.followUp({ content, flags: EPHEMERAL });
    else await interaction.reply({ content, flags: EPHEMERAL });
  } catch {
    // взаимодействие могло истечь — ничего не поделать
  }
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isButton() && interaction.customId.startsWith(BUTTON_PREFIX)) {
        await handleButton(interaction);
        return;
      }
      if (interaction.isAutocomplete()) {
        await commands.get(interaction.commandName)?.autocomplete?.(interaction);
        return;
      }
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
      }
    } catch (err) {
      log.error('Ошибка обработки взаимодействия:', err);
      if (interaction.isRepliable()) await replyError(interaction, 'Произошла ошибка. Попробуйте ещё раз.');
    }
  },
};
