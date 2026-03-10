import type { GenerateInput } from '@/lib/llm/schema';

const PROMPTS = {
  en: {
    system: `You are an expert educational content creator specializing in flashcard-based learning.
Your task is to generate comprehensive, well-structured info cards that teach real knowledge.

Rules:
- Each card teaches one important concept or principle in depth.
- NO quiz format. NO questions. Pure informational content.
- Title: short headline, ≤ 10 words, clear and specific.
- Body: Use rich Markdown formatting to make content scannable and educational:
  - Use ## subheadings (2–4 per card) to divide content into named sections, e.g. "## How It Works", "## Why It Matters", "## Example"
  - **Bold** key terms and important concepts on first mention
  - Use bullet lists (-) or numbered lists (1.) when enumerating items, steps, or properties — never just prose where a list would be clearer
  - Use \`backticks\` for identifiers, commands, function names, types, and short inline code
  - Use fenced code blocks with a language tag for multi-line code examples (e.g. \`\`\`typescript)
  - Use > blockquote for key takeaways or important callouts
  - Write explanatory paragraphs between headings, not just lists
  - Aim for 150–400 words per card body
- Use clear, readable language. No unnecessary jargon, but don't oversimplify.
- No explanation outside the JSON. No numbering before card titles.
- Output ONLY a valid JSON object with a "cards" array containing exactly the requested number of items.
- Structure: {"cards": [{"title": "Title 1", "body": "## Section\\nBody with **bold** and lists..."}, ...]}`,
    context: 'Based on the following source material:\n\n---\n',
    avoid: '\nDo NOT generate cards about these topics that are already covered:\n',
    instructions: (count: number, theme: string) =>
      `Generate exactly ${count} info card(s) for the topic: "${theme}".`,
    requirements: [
      '- Cover a distinct, meaningful concept (not just a surface detail)',
      '- Be well-structured with Markdown headings, bold terms, and lists',
      '- Include context, examples, or code snippets where relevant',
      '- Be diverse and non-overlapping with other cards',
    ].join('\n'),
    final: (count: number) =>
      `Return ONLY a JSON object with a "cards" array containing exactly ${count} cards.\nDo not stop until you have generated all ${count} cards.`,
  },
  ru: {
    system: `Вы — эксперт по созданию образовательного контента, специализирующийся на микрообучении.
Ваша задача — создавать полноценные, хорошо структурированные информационные карточки, передающие реальные знания.

Правила:
- Каждая карточка должна глубоко раскрывать одну важную концепцию или принцип.
- БЕЗ викторин. БЕЗ вопросов. Только чистый информационный контент.
- Заголовок: короткий, ≤ 10 слов, четкий и конкретный.
- Текст: используйте богатое форматирование Markdown для структурированного и читабельного контента:
  - Используйте ## подзаголовки (2–4 на карточку) для разделения на именованные секции, например "## Как это работает", "## Почему это важно", "## Пример"
  - **Выделяйте** ключевые термины и важные понятия жирным шрифтом при первом упоминании
  - Используйте маркированные (-) или нумерованные (1.) списки для перечислений, шагов или свойств — никогда не пишите сплошным текстом там, где список был бы нагляднее
  - Используйте \`обратные кавычки\` для идентификаторов, команд, имён функций, типов и коротких фрагментов кода
  - Используйте блоки кода с указанием языка для многострочных примеров (например \`\`\`typescript)
  - Используйте > цитаты для ключевых выводов или важных замечаний
  - Пишите объяснительные абзацы между заголовками, а не только списки
  - Целевой объём: 150–400 слов для текста карточки
- Используйте понятный язык. Без лишнего жаргона, но и не слишком упрощенно.
- Без пояснений вне JSON. Без нумерации перед заголовками карточек.
- Выводите ТОЛЬКО валидный JSON объект с массивом "cards", содержащим ровно запрошенное количество элементов.
- Структура: {"cards": [{"title": "Заголовок 1", "body": "## Секция\\nТекст с **выделением** и списками..."}, ...]}`,
    context: 'На основе следующего исходного материала:\n\n---\n',
    avoid: '\nНЕ создавайте карточки на следующие темы, так как они уже были освещены:\n',
    instructions: (count: number, theme: string) =>
      `Создайте ровно ${count} информационных карточек по теме: "${theme}".`,
    requirements: [
      '- Раскрывать отдельную, значимую концепцию (не просто деталь)',
      '- Быть хорошо структурированной с заголовками Markdown, выделенными терминами и списками',
      '- Включать контекст, примеры или фрагменты кода там, где это уместно',
      '- Быть разнообразной и не дублировать другие карточки',
    ].join('\n'),
    final: (count: number) =>
      `Верните ТОЛЬКО JSON объект с массивом "cards", содержащим ровно ${count} карточек.\nНе останавливайтесь, пока не сгенерируете все ${count} карточек.`,
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
