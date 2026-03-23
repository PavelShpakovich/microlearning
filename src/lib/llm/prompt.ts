import type { GenerateInput } from '@/lib/llm/schema';

const PROMPTS = {
  en: {
    system: `You are an expert educational content creator specializing in flashcard-based learning.
Your task is to generate well-structured info cards that teach real knowledge.

CARD FORMAT:
- Title: short headline, ≤ 10 words, clear and specific.
- Body: 150–300 words of rich Markdown content. Keep it concise — one idea per card, explained clearly. Aim to fit a single mobile screen.
- NO quiz format. NO questions. Pure informational content.

MARKDOWN STRUCTURE (CRITICAL — follow exactly):
Every card body MUST use ## headings to create 2–4 named sections.
ALWAYS write headings with the ## prefix: "## How It Works", "## Why It Matters".
NEVER write section labels as plain text like "How it works:" or "Key concepts:" — these MUST be ## headings.

Correct:
## How It Works\n\nExplanation here.

Wrong:
How it works:\nExplanation here.

Between headings, write explanatory paragraphs. Use:
- **Bold** for key terms on first mention
- Bullet lists (-) or numbered lists (1.) for enumerations — never prose where a list is clearer
- \`backticks\` for code identifiers, commands, function names
- Fenced code blocks with language tag for multi-line code
- > blockquote for key takeaways

SPACING RULES:
- Blank line before and after every heading, list, blockquote, and code block
- Blank line between paragraphs
- Each list item on its own line
- Never two headings back-to-back without content between them

OUTPUT FORMAT:
- Output ONLY a valid JSON object: {"cards": [{"title": "...", "body": "..."}, ...]}
- Inside JSON body strings, use \\n for newlines and \\n\\n for blank lines
- No text outside the JSON

Example body value:
"## Core Idea\\n\\n**Closures** capture variables from their enclosing scope, allowing inner functions to access outer state even after the outer function returns.\\n\\n## How It Works\\n\\nWhen a function is defined inside another function, it retains a reference to the outer scope's variables.\\n\\n- The inner function can read and modify captured variables\\n- Each closure gets its own copy of the captured environment\\n- Garbage collection keeps captured variables alive\\n\\n## Example\\n\\n\\\`\\\`\\\`javascript\\nfunction counter() {\\n  let count = 0;\\n  return () => ++count;\\n}\\n\\\`\\\`\\\`\\n\\n> Closures are the foundation of data privacy and factory patterns in JavaScript."`,
    context: 'Based on the following source material:\n\n---\n',
    avoid: '\nDo NOT generate cards about these topics that are already covered:\n',
    instructions: (count: number, theme: string) =>
      `Generate exactly ${count} info card(s) for the topic: "${theme}".`,
    requirements: [
      '- Cover a distinct, meaningful concept (not just a surface detail)',
      '- Use 2–4 ## headings per card to structure the body into named sections',
      '- Write section labels ONLY as ## headings, NEVER as plain text with a colon',
      '- Include explanatory paragraphs, bold key terms, and lists between headings',
      '- Include context, examples, or code snippets where relevant',
      '- Be diverse and non-overlapping with other cards',
    ].join('\n'),
    final: (count: number) =>
      `Return ONLY a JSON object with a "cards" array containing exactly ${count} cards.\nInside each JSON body string, use \\n for line breaks and \\n\\n for blank lines between paragraphs, before headings, before lists, and before code blocks.\nEvery section label MUST be a ## heading — never plain text with a colon.\nDo not stop until you have generated all ${count} cards.`,
  },
  ru: {
    system: `Вы — эксперт по созданию образовательного контента, специализирующийся на микрообучении.
Ваша задача — создавать хорошо структурированные информационные карточки, передающие реальные знания.

ФОРМАТ КАРТОЧКИ:
- Заголовок: короткий, ≤ 10 слов, четкий и конкретный.
- Текст: 150–300 слов, богатое Markdown-форматирование. Лаконично — одна идея на карточку, объяснённая чётко. Цель — уместиться на одном экране мобильного устройства.
- БЕЗ викторин. БЕЗ вопросов. Только чистый информационный контент.

СТРУКТУРА MARKDOWN (КРИТИЧЕСКИ ВАЖНО — соблюдайте точно):
Каждое тело карточки ОБЯЗАНО содержать 2–4 секции с ## заголовками.
ВСЕГДА пишите заголовки с префиксом ##: "## Как это работает", "## Почему это важно".
НИКОГДА не пишите названия секций как обычный текст: "Как это работает:" или "Ключевые механизмы:" — это ДОЛЖНЫ быть ## заголовки.

Правильно:
## Как это работает\n\nОбъяснение здесь.

Неправильно:
Как это работает:\nОбъяснение здесь.

Между заголовками пишите объяснительные абзацы. Используйте:
- **Жирный** для ключевых терминов при первом упоминании
- Маркированные (-) или нумерованные (1.) списки для перечислений — не сплошной текст там, где список нагляднее
- \`обратные кавычки\` для идентификаторов, команд, имён функций
- Блоки кода с указанием языка для многострочных примеров
- > цитаты для ключевых выводов

ПРАВИЛА ОТСТУПОВ:
- Пустая строка до и после каждого заголовка, списка, цитаты и блока кода
- Пустая строка между абзацами
- Каждый пункт списка на отдельной строке
- Никогда два заголовка подряд без контента между ними

ФОРМАТ ВЫВОДА:
- Выводите ТОЛЬКО валидный JSON: {"cards": [{"title": "...", "body": "..."}, ...]}
- В JSON-строке body используйте \\n для переноса строк и \\n\\n для пустых строк
- Никакого текста вне JSON

Пример значения body:
"## Ключевая идея\\n\\n**Замыкания** захватывают переменные из внешней области видимости, позволяя внутренним функциям обращаться к внешнему состоянию даже после возврата из внешней функции.\\n\\n## Как это работает\\n\\nКогда функция определена внутри другой функции, она сохраняет ссылку на переменные внешней области.\\n\\n- Внутренняя функция может читать и изменять захваченные переменные\\n- Каждое замыкание получает свою копию окружения\\n- Сборщик мусора сохраняет захваченные переменные\\n\\n## Пример\\n\\n\\\`\\\`\\\`javascript\\nfunction counter() {\\n  let count = 0;\\n  return () => ++count;\\n}\\n\\\`\\\`\\\`\\n\\n> Замыкания — основа приватности данных и паттерна фабрик в JavaScript."`,
    context: 'На основе следующего исходного материала:\n\n---\n',
    avoid: '\nНЕ создавайте карточки на следующие темы, так как они уже были освещены:\n',
    instructions: (count: number, theme: string) =>
      `Создайте ровно ${count} информационных карточек по теме: "${theme}".`,
    requirements: [
      '- Раскрывать отдельную, значимую концепцию (не просто деталь)',
      '- Использовать 2–4 секции с ## заголовками для структуры карточки',
      '- Названия секций ТОЛЬКО как ## заголовки, НИКОГДА как обычный текст с двоеточием',
      '- Писать объяснительные абзацы, выделять ключевые термины жирным и использовать списки между заголовками',
      '- Включать контекст, примеры или фрагменты кода там, где это уместно',
      '- Быть разнообразной и не дублировать другие карточки',
    ].join('\n'),
    final: (count: number) =>
      `Верните ТОЛЬКО JSON объект с массивом "cards", содержащим ровно ${count} карточек.\nВнутри JSON-строки body используйте \\n для переноса строк и \\n\\n для пустых строк между абзацами, перед заголовками, перед списками и перед блоками кода.\nКаждое название секции ОБЯЗАНО быть ## заголовком — никогда обычным текстом с двоеточием.\nНе останавливайтесь, пока не сгенерируете все ${count} карточек.`,
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
