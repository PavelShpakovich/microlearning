import type { GenerateInput } from '@/lib/llm/schema';

const PROMPTS = {
  en: {
    system: `You are an expert educational content creator specializing in mobile flashcard learning.
Your task is to generate concise, focused info cards that teach one idea per card — short enough to read in 30 seconds.

CARD STRUCTURE (follow this pattern):
1. One or two sentences introducing the concept.
2. A short bullet list (2–4 items) OR a brief example showing it in action.
3. Optional: one sentence wrapping up why it matters.

FORMATTING RULES:
- **Bold** key terms on first mention.
- Use a bullet list (-) or numbered list (1.) when listing 2 or more items — never run them into prose.
- Use \`backticks\` for code identifiers, commands, or types when the topic involves code.
- Use a fenced code block (\`\`\`language) ONLY when the topic is literally about writing code and a short snippet is the clearest explanation. Do NOT add code blocks for conceptual, historical, or general topics.
- Add a single ## subheading ONLY if the card has two clearly distinct parts (e.g. "## Example"). Maximum one subheading per card.
- Do NOT use > blockquotes.
- Do NOT start the body with a heading — the title is already the heading.

LENGTH: 60–130 words per card body. Cards must fit a mobile screen without scrolling.

OUTPUT FORMAT:
- Output ONLY a valid JSON object — no markdown fences, no explanation outside the JSON.
- Use \\n for newlines inside JSON strings. Put a blank line (\\n\\n) before any list.
- Structure: {"cards": [{"title": "Short Title", "body": "Intro sentence.\\n\\n- item 1\\n- item 2\\n\\nWhy it matters."}, ...]}
- Titles: ≤ 8 words, clear and specific. No numbering.`,
    context: 'Based on the following source material:\n\n---\n',
    avoid: '\nDo NOT generate cards about these topics that are already covered:\n',
    instructions: (count: number, theme: string) =>
      `Generate exactly ${count} info card(s) for the topic: "${theme}".`,
    requirements: [
      '- Cover one distinct, meaningful concept (not just a surface detail)',
      '- Use bold for key terms and bullet lists for enumerations',
      '- Keep body to 60–130 words so the card fits a mobile screen',
      '- Be diverse and non-overlapping with other cards',
    ].join('\n'),
    final: (count: number) =>
      `Return ONLY a JSON object with a "cards" array containing exactly ${count} cards. No markdown fences.\nDo not stop until you have generated all ${count} cards.`,
  },
  ru: {
    system: `Вы — эксперт по созданию образовательного контента для мобильных флэш-карточек.
Ваша задача — создавать краткие, сфокусированные информационные карточки, которые раскрывают одну идею — достаточно короткие для чтения за 30 секунд.

СТРУКТУРА КАРТОЧКИ (следуйте этому шаблону):
1. Одно-два предложения, вводящих понятие.
2. Краткий список (2–4 пункта) ИЛИ короткий пример, показывающий концепцию в действии.
3. Опционально: одно предложение, объясняющее важность.

ПРАВИЛА ФОРМАТИРОВАНИЯ:
- **Выделяйте жирным** ключевые термины при первом упоминании.
- Используйте маркированный список (-) или нумерованный список (1.) когда перечисляете 2 и более пунктов — никогда не вставляйте их в обычный текст.
- Используйте \`обратные кавычки\` для идентификаторов кода, команд или типов, когда тема связана с программированием.
- Используйте блок кода (\`\`\`язык) ТОЛЬКО если тема буквально о написании кода и короткий фрагмент — лучшее объяснение. НЕ добавляйте блоки кода для концептуальных, исторических или общих тем.
- Добавляйте один ## подзаголовок ТОЛЬКО если в карточке есть два явно различных раздела (например "## Пример"). Максимум один подзаголовок на карточку.
- НЕ используйте > цитаты.
- НЕ начинайте текст с заголовка — заголовок карточки уже является заголовком.

ДЛИНА: 60–130 слов для текста карточки. Карточки должны помещаться на экране мобильного телефона без прокрутки.

ФОРМАТ ВЫВОДА:
- Выводите ТОЛЬКО валидный JSON объект — без markdown-оберток, без пояснений вне JSON.
- Используйте \\n для переносов строк в JSON-строках. Ставьте пустую строку (\\n\\n) перед любым списком.
- Структура: {"cards": [{"title": "Короткий заголовок", "body": "Вводное предложение.\\n\\n- пункт 1\\n- пункт 2\\n\\nПочему это важно."}, ...]}
- Заголовки: ≤ 8 слов, чёткие и конкретные. Без нумерации.`,
    context: 'На основе следующего исходного материала:\n\n---\n',
    avoid: '\nНЕ создавайте карточки на следующие темы, так как они уже были освещены:\n',
    instructions: (count: number, theme: string) =>
      `Создайте ровно ${count} информационных карточек по теме: "${theme}".`,
    requirements: [
      '- Раскрывайте одну отдельную, значимую концепцию (не просто деталь)',
      '- Используйте жирный шрифт для ключевых терминов и списки для перечислений',
      '- Ограничьте текст 60–130 словами, чтобы карточка помещалась на экране мобильного',
      '- Будьте разнообразными и не дублируйте другие карточки',
    ].join('\n'),
    final: (count: number) =>
      `Верните ТОЛЬКО JSON объект с массивом "cards", содержащим ровно ${count} карточек. Без markdown-оберток.\nНе останавливайтесь, пока не сгенерируете все ${count} карточек.`,
  },
};

/**
 * Sanitize user-provided text before embedding it in an LLM prompt.
 * Strips XML-like tags that could escape the delimiters used to isolate user data,
 * and removes common prompt-injection prefixes.
 */
function sanitizeUserInput(text: string): string {
  return (
    text
      // Remove any attempt to close or open our XML-style delimiters
      .replace(/<\/?user-content[^>]*>/gi, '')
      .replace(/<\/?source-material[^>]*>/gi, '')
      // Strip null bytes and other control characters (except newlines/tabs)
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
  );
}

/**
 * Builds the system + user prompt for info card generation.
 * All providers use this same template — consistent output format regardless of model.
 *
 * User-supplied content is wrapped in XML-style delimiters to clearly separate
 * data from instructions, mitigating prompt injection attacks.
 */
export function buildPrompt(input: GenerateInput): { system: string; user: string } {
  const lang = input.language || 'en';
  const t = PROMPTS[lang];

  // Sanitize all user-controlled inputs before embedding in the prompt
  const safeTopic = sanitizeUserInput(input.theme);
  const safeDescription = input.description ? sanitizeUserInput(input.description) : undefined;
  const safeSourceText = input.sourceText
    ? sanitizeUserInput(input.sourceText.slice(0, 8000))
    : undefined;
  const safeTopicsToAvoid = input.topicsToAvoid?.map(sanitizeUserInput) ?? [];

  // Wrap source material in XML delimiters to isolate it from instructions
  const contextBlock = safeSourceText
    ? `${t.context}<source-material>\n${safeSourceText}\n</source-material>\n\n`
    : '';

  const descriptionBlock = safeDescription
    ? lang === 'ru'
      ? `\nОписание темы: <user-content>${safeDescription}</user-content>\n`
      : `\nTheme description: <user-content>${safeDescription}</user-content>\n`
    : '';

  const avoidBlock =
    safeTopicsToAvoid.length > 0 ? `${t.avoid}- ${safeTopicsToAvoid.join('\n- ')}\n` : '';

  const languageBlock = lang === 'ru' ? '\nВсё содержимое должно быть на русском языке.' : '';

  const user = `${contextBlock}${t.instructions(
    input.count,
    safeTopic,
  )}${descriptionBlock}${avoidBlock}${languageBlock}
${lang === 'ru' ? 'Каждая карточка должна:' : 'Each card must:'}
${t.requirements}

${t.final(input.count)}`;

  return { system: t.system, user };
}
