import { formatChoice, searchLanguages } from '../languages.js';

/** Общий autocomplete для опций с языком: «Русский (ru)» -> 'ru'. */
export async function languageAutocomplete(interaction) {
  const focused = interaction.options.getFocused();
  const choices = searchLanguages(focused, 25).map((l) => ({ name: formatChoice(l), value: l.code }));
  await interaction.respond(choices);
}
