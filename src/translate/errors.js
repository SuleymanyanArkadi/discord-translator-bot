/** Ошибка, текст которой можно показать пользователю. */
export class TranslationError extends Error {
  constructor(message, { causes = [] } = {}) {
    super(message);
    this.name = 'TranslationError';
    this.causes = causes;
  }
}
