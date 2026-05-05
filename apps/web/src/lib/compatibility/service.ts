import { NotFoundError, ValidationError } from '@/lib/errors';
import { env } from '@/lib/env';
import { generateStructuredOutputWithUsage } from '@/lib/llm/structured-generation';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { refundReferenceDebitIfEligible } from '@/lib/credits/service';
import {
  structuredReadingSchema,
  type StructuredReadingOutput,
} from '@/lib/readings/report-schema';
import type { Json, TablesInsert } from '@/lib/supabase/types';

const db = supabaseAdmin;

// ─── Compatibility types ──────────────────────────────────────────────────────

export { COMPATIBILITY_TYPES, type CompatibilityType } from './types';
import type { CompatibilityType } from './types';

interface CompatibilityTypeConfig {
  promptVersion: string;
  titleSuffix: Record<'en' | 'ru', string>;
  role: Record<'en' | 'ru', string>;
  sections: Record<'en' | 'ru', string>;
  mockSections: Record<'en' | 'ru', Array<{ key: string; title: string; content: string }>>;
  planetWeights: Record<string, number>;
}

const COMPATIBILITY_CONFIGS: Record<CompatibilityType, CompatibilityTypeConfig> = {
  romantic: {
    promptVersion: 'compatibility-romantic-v1',
    titleSuffix: {
      ru: 'Синастрия',
      en: 'Synastry',
    },
    role: {
      ru: 'Ты — эксперт-астролог по синастрии и отношениям в профессиональном астрологическом сервисе.\nТы анализируешь, как две натальные карты взаимодействуют между собой, чтобы раскрыть сильные стороны, вызовы и темы роста романтических отношений.',
      en: 'You are an expert synastry astrologer at a professional astrology service.\nYou analyze how two natal charts interact to reveal the strengths, challenges, and growth themes of romantic relationships.',
    },
    sections: {
      ru: `(1) эмоциональный резонанс и глубина связи (взаимодействия Луна-Луна, Луна-Венера, Луна-ASC), (2) коммуникация и ментальная совместимость (аспекты Меркурий-Меркурий, Меркурий-ASC), (3) любовь, притяжение и ценности (кросс-аспекты Венера-Марс, Венера-Венера, Венера-ASC), (4) вызовы и зоны роста (напряжённые кросс-аспекты: квадратуры, оппозиции между ключевыми планетами), (5) долгосрочный потенциал и предназначение отношений (кросс-аспекты Сатурна, Юпитера, темы Северного узла)`,
      en: `(1) emotional resonance and depth of connection (Moon-Moon, Moon-Venus, Moon-ASC interactions), (2) communication and mental compatibility (Mercury-Mercury, Mercury-ASC aspects), (3) love, attraction and values (Venus-Mars, Venus-Venus, Venus-ASC cross-aspects), (4) challenges and growth zones (tense cross-aspects: squares, oppositions between key planets), (5) long-term potential and relationship purpose (Saturn, Jupiter cross-aspects, North Node themes)`,
    },
    mockSections: {
      ru: [
        {
          key: 'emotional',
          title: 'Эмоциональный резонанс',
          content: 'Анализ эмоциональной связи и глубины контакта.',
        },
        {
          key: 'communication',
          title: 'Общение и мышление',
          content: 'Как партнёры понимают друг друга.',
        },
        { key: 'attraction', title: 'Влечение и ценности', content: 'Венера и Марс в синастрии.' },
        {
          key: 'challenges',
          title: 'Вызовы и рост',
          content: 'Напряжённые аспекты и как с ними работать.',
        },
        { key: 'potential', title: 'Долгосрочный потенциал', content: 'Сатурн и цель отношений.' },
      ],
      en: [
        {
          key: 'emotional',
          title: 'Emotional Resonance',
          content: 'Analysis of emotional connection and depth of contact.',
        },
        {
          key: 'communication',
          title: 'Communication & Thinking',
          content: 'How partners understand each other.',
        },
        { key: 'attraction', title: 'Attraction & Values', content: 'Venus and Mars in synastry.' },
        {
          key: 'challenges',
          title: 'Challenges & Growth',
          content: 'Tense aspects and how to work with them.',
        },
        {
          key: 'potential',
          title: 'Long-term Potential',
          content: 'Saturn and the purpose of the relationship.',
        },
      ],
    },
    planetWeights: {
      sun: 3,
      moon: 3,
      ascendant: 2.5,
      venus: 2.5,
      mars: 2.5,
      mercury: 2,
      jupiter: 1.5,
      saturn: 1.5,
      uranus: 1,
      neptune: 1,
      pluto: 1.2,
      midheaven: 1,
    },
  },
  friendship: {
    promptVersion: 'compatibility-friendship-v1',
    titleSuffix: {
      ru: 'Дружеская совместимость',
      en: 'Friendship Compatibility',
    },
    role: {
      ru: 'Ты — эксперт-астролог по синастрии в профессиональном астрологическом сервисе.\nТы анализируешь, как две натальные карты взаимодействуют между собой, чтобы раскрыть сильные стороны, вызовы и темы роста дружеских отношений.',
      en: 'You are an expert synastry astrologer at a professional astrology service.\nYou analyze how two natal charts interact to reveal the strengths, challenges, and growth themes of a friendship.',
    },
    sections: {
      ru: `(1) эмоциональный комфорт и доверие — насколько легко эти два человека чувствуют себя в безопасности и расслабленно друг с другом (взаимодействия Луна-Луна, Луна-Венера, Луна-ASC), (2) стиль общения, общий юмор и интеллектуальная синергия (аспекты Меркурий-Меркурий, Меркурий-Юпитер), (3) общие интересы, ценности и что притягивает этих друзей друг к другу (кросс-аспекты Венера-Венера, Юпитер-Юпитер, Солнце-Солнце), (4) потенциальные точки трения и как справляться с разногласиями (напряжённые кросс-аспекты: квадратуры, оппозиции), (5) взаимный рост, вдохновение и что эта дружба даёт каждому (темы Юпитера, Урана, Северного узла)`,
      en: `(1) emotional comfort and trust — how easily these two feel safe and relaxed with each other (Moon-Moon, Moon-Venus, Moon-ASC interactions), (2) communication style, shared humor and intellectual synergy (Mercury-Mercury, Mercury-Jupiter aspects), (3) shared interests, values and what attracts these friends to each other (Venus-Venus, Jupiter-Jupiter, Sun-Sun cross-aspects), (4) potential friction points and how to handle disagreements (tense cross-aspects: squares, oppositions), (5) mutual growth, inspiration and what this friendship gives each person (Jupiter, Uranus, North Node themes)`,
    },
    mockSections: {
      ru: [
        {
          key: 'trust',
          title: 'Эмоциональный комфорт и доверие',
          content: 'Как легко вы чувствуете себя друг с другом.',
        },
        {
          key: 'communication',
          title: 'Общение и юмор',
          content: 'Стиль общения и интеллектуальная синергия.',
        },
        {
          key: 'values',
          title: 'Общие интересы и ценности',
          content: 'Что объединяет эту дружбу.',
        },
        {
          key: 'friction',
          title: 'Точки трения',
          content: 'Потенциальные разногласия и как их решать.',
        },
        {
          key: 'growth',
          title: 'Взаимный рост и вдохновение',
          content: 'Что дружба даёт каждому.',
        },
      ],
      en: [
        {
          key: 'trust',
          title: 'Emotional Comfort & Trust',
          content: 'How easily you feel safe with each other.',
        },
        {
          key: 'communication',
          title: 'Communication & Humor',
          content: 'Communication style and intellectual synergy.',
        },
        {
          key: 'values',
          title: 'Shared Interests & Values',
          content: 'What unites this friendship.',
        },
        {
          key: 'friction',
          title: 'Friction Points',
          content: 'Potential disagreements and how to resolve them.',
        },
        {
          key: 'growth',
          title: 'Mutual Growth & Inspiration',
          content: 'What the friendship gives each person.',
        },
      ],
    },
    planetWeights: {
      sun: 2,
      moon: 3,
      ascendant: 2,
      venus: 1.5,
      mars: 1,
      mercury: 2.5,
      jupiter: 2.5,
      saturn: 1.5,
      uranus: 1.5,
      neptune: 1,
      pluto: 1,
      midheaven: 0.5,
    },
  },
  business: {
    promptVersion: 'compatibility-business-v1',
    titleSuffix: {
      ru: 'Деловая совместимость',
      en: 'Business Compatibility',
    },
    role: {
      ru: 'Ты — эксперт-астролог по синастрии в профессиональном астрологическом сервисе.\nТы анализируешь, как две натальные карты взаимодействуют между собой, чтобы раскрыть сильные стороны, вызовы и темы роста делового или профессионального партнёрства.',
      en: 'You are an expert synastry astrologer at a professional astrology service.\nYou analyze how two natal charts interact to reveal the strengths, challenges, and growth themes of a business or professional partnership.',
    },
    sections: {
      ru: `(1) стили лидерства и принятия решений — как каждый подходит к авторитету, инициативе и структуре (кросс-аспекты Солнце-Сатурн, Марс-Сатурн, Солнце-Марс), (2) коммуникация и переговоры — насколько эффективно эти двое обсуждают идеи, решают споры и приходят к согласию (аспекты Меркурий-Меркурий, Меркурий-Сатурн, Меркурий-Юпитер), (3) рабочая этика, амбиции и совпадение профессиональных целей (кросс-аспекты Марс-Марс, Сатурн-Сатурн, MC-MC, Юпитер-Сатурн), (4) потенциальные конфликты, динамика власти и конкурентные напряжения (напряжённые кросс-аспекты: квадратуры, оппозиции между Марсом, Плутоном, Сатурном), (5) долгосрочный профессиональный потенциал и взаимодополняющие сильные стороны (темы Юпитера, Сатурна, Северного узла, взаимодействия MC)`,
      en: `(1) leadership and decision-making styles — how each approaches authority, initiative and structure (Sun-Saturn, Mars-Saturn, Sun-Mars cross-aspects), (2) communication and negotiation — how effectively these two discuss ideas, resolve disputes and reach agreement (Mercury-Mercury, Mercury-Saturn, Mercury-Jupiter aspects), (3) work ethic, ambition and alignment of professional goals (Mars-Mars, Saturn-Saturn, MC-MC, Jupiter-Saturn cross-aspects), (4) potential conflicts, power dynamics and competitive tensions (tense cross-aspects: squares, oppositions between Mars, Pluto, Saturn), (5) long-term professional potential and complementary strengths (Jupiter, Saturn, North Node themes, MC interactions)`,
    },
    mockSections: {
      ru: [
        {
          key: 'leadership',
          title: 'Лидерство и принятие решений',
          content: 'Как каждый подходит к инициативе и структуре.',
        },
        {
          key: 'communication',
          title: 'Коммуникация и переговоры',
          content: 'Эффективность обсуждения идей и решения споров.',
        },
        {
          key: 'ambition',
          title: 'Рабочий стиль и амбиции',
          content: 'Совместимость профессиональных целей.',
        },
        {
          key: 'conflicts',
          title: 'Конфликты и динамика власти',
          content: 'Потенциальные конкурентные напряжения.',
        },
        {
          key: 'potential',
          title: 'Профессиональный потенциал',
          content: 'Долгосрочные перспективы сотрудничества.',
        },
      ],
      en: [
        {
          key: 'leadership',
          title: 'Leadership & Decision-Making',
          content: 'How each approaches initiative and structure.',
        },
        {
          key: 'communication',
          title: 'Communication & Negotiation',
          content: 'Effectiveness of discussing ideas and resolving disputes.',
        },
        {
          key: 'ambition',
          title: 'Work Style & Ambition',
          content: 'Professional goals compatibility.',
        },
        {
          key: 'conflicts',
          title: 'Conflicts & Power Dynamics',
          content: 'Potential competitive tensions.',
        },
        {
          key: 'potential',
          title: 'Professional Potential',
          content: 'Long-term collaboration prospects.',
        },
      ],
    },
    planetWeights: {
      sun: 2.5,
      moon: 1.5,
      ascendant: 1.5,
      venus: 1,
      mars: 2.5,
      mercury: 2.5,
      jupiter: 2,
      saturn: 3,
      uranus: 1,
      neptune: 0.5,
      pluto: 1.5,
      midheaven: 2.5,
    },
  },
  family: {
    promptVersion: 'compatibility-family-v1',
    titleSuffix: {
      ru: 'Родственная совместимость',
      en: 'Family Compatibility',
    },
    role: {
      ru: 'Ты — эксперт-астролог по синастрии в профессиональном астрологическом сервисе.\nТы анализируешь, как две натальные карты взаимодействуют между собой, чтобы раскрыть сильные стороны, вызовы и темы роста родственных отношений (родитель-ребёнок, братья/сёстры или другие близкие семейные связи).',
      en: 'You are an expert synastry astrologer at a professional astrology service.\nYou analyze how two natal charts interact to reveal the strengths, challenges, and growth themes of family relationships (parent-child, siblings, or other close family bonds).',
    },
    sections: {
      ru: `(1) эмоциональная связь и взаимопонимание — насколько естественно эти родственники чувствуют потребности и настроения друг друга (взаимодействия Луна-Луна, Луна-Солнце, Луна-ASC), (2) стиль общения и как конфликты выражаются или подавляются (аспекты Меркурий-Меркурий, Меркурий-Луна, Меркурий-Сатурн), (3) общие ценности, традиции и чувство «дома», которое они создают вместе (кросс-аспекты Венера-Венера, Луна-IC, Солнце-Солнце, Юпитер-Луна), (4) точки напряжения и вопросы границ — где проявляются различия поколений или темпераментов (напряжённые кросс-аспекты: Сатурн-Луна, Плутон-Солнце, Марс-Сатурн), (5) взаимная поддержка, рост и чему каждый учится у другого в долгосрочной перспективе (темы Юпитера, Сатурна, Северного узла)`,
      en: `(1) emotional bond and mutual understanding — how naturally these relatives sense each other's needs and moods (Moon-Moon, Moon-Sun, Moon-ASC interactions), (2) communication style and how conflicts are expressed or suppressed (Mercury-Mercury, Mercury-Moon, Mercury-Saturn aspects), (3) shared values, traditions and the sense of "home" they create together (Venus-Venus, Moon-IC, Sun-Sun, Jupiter-Moon cross-aspects), (4) tension points and boundary issues — where generational or temperamental differences emerge (tense cross-aspects: Saturn-Moon, Pluto-Sun, Mars-Saturn), (5) mutual support, growth and what each learns from the other long-term (Jupiter, Saturn, North Node themes)`,
    },
    mockSections: {
      ru: [
        {
          key: 'bond',
          title: 'Эмоциональная связь и понимание',
          content: 'Как естественно вы чувствуете потребности друг друга.',
        },
        {
          key: 'communication',
          title: 'Стиль общения',
          content: 'Как выражаются и решаются конфликты.',
        },
        {
          key: 'values',
          title: 'Общие ценности и традиции',
          content: 'Чувство «дома», которое вы создаёте вместе.',
        },
        {
          key: 'tension',
          title: 'Точки напряжения и границы',
          content: 'Различия темпераментов и поколений.',
        },
        { key: 'support', title: 'Поддержка и рост', content: 'Чему вы учите друг друга.' },
      ],
      en: [
        {
          key: 'bond',
          title: 'Emotional Bond & Understanding',
          content: "How naturally you sense each other's needs.",
        },
        {
          key: 'communication',
          title: 'Communication Style',
          content: 'How conflicts are expressed and resolved.',
        },
        {
          key: 'values',
          title: 'Shared Values & Traditions',
          content: 'The sense of "home" you create together.',
        },
        {
          key: 'tension',
          title: 'Tension Points & Boundaries',
          content: 'Temperamental and generational differences.',
        },
        { key: 'support', title: 'Support & Growth', content: 'What you teach each other.' },
      ],
    },
    planetWeights: {
      sun: 3,
      moon: 3.5,
      ascendant: 2,
      venus: 1.5,
      mars: 1.5,
      mercury: 2,
      jupiter: 2,
      saturn: 2.5,
      uranus: 1,
      neptune: 1,
      pluto: 1.2,
      midheaven: 0.5,
    },
  },
};

// ─── Harmony score computation ────────────────────────────────────────────────

const ASPECT_SCORE_DEFS = [
  { key: 'conjunction', angle: 0, orb: 8, weight: 0.85 },
  { key: 'sextile', angle: 60, orb: 4, weight: 0.6 },
  { key: 'square', angle: 90, orb: 7, weight: -0.5 },
  { key: 'trine', angle: 120, orb: 7, weight: 1 },
  { key: 'opposition', angle: 180, orb: 8, weight: -0.35 },
] as const;

const KEY_PLANETS = new Set([
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'ascendant',
  'midheaven',
]);

export interface HarmonyPositionRow {
  body_key: string;
  degree_decimal: number;
}

export function computeHarmonyScore(
  primary: HarmonyPositionRow[],
  secondary: HarmonyPositionRow[],
  compatibilityType: CompatibilityType = 'romantic',
): number {
  if (primary.length === 0 || secondary.length === 0) return 50;

  const weights = COMPATIBILITY_CONFIGS[compatibilityType].planetWeights;
  let totalScore = 0;
  let totalWeight = 0;

  for (const pA of primary) {
    if (!KEY_PLANETS.has(pA.body_key)) continue;
    for (const pB of secondary) {
      if (!KEY_PLANETS.has(pB.body_key)) continue;
      const diff = Math.abs(pA.degree_decimal - pB.degree_decimal);
      const angular = Math.min(diff, 360 - diff);
      for (const def of ASPECT_SCORE_DEFS) {
        const orbDistance = Math.abs(angular - def.angle);
        if (orbDistance <= def.orb) {
          const tightness = 1 - (orbDistance / def.orb) * 0.7;
          const pairWeight = (weights[pA.body_key] ?? 1) * (weights[pB.body_key] ?? 1);
          totalScore += def.weight * pairWeight * tightness;
          totalWeight += pairWeight * tightness;
          break;
        }
      }
    }
  }

  if (totalWeight === 0) return 50;
  const ratio = totalScore / totalWeight;
  return Math.round(Math.max(5, Math.min(98, 50 + ratio * 48)));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PositionRow {
  body_key: string;
  sign_key: string;
  house_number: number | null;
  degree_decimal: number;
  retrograde: boolean;
}

interface AspectRow {
  body_a: string;
  body_b: string;
  aspect_key: string;
  orb_decimal: number;
  applying: boolean | null;
}

function activeModelName() {
  switch (env.LLM_PROVIDER) {
    case 'qwen':
      return env.QWEN_MODEL;
    case 'mock':
      return 'deterministic-reading-mock-v1';
    default:
      return 'unknown';
  }
}

async function persistCompatibilityFailureLog(
  reportId: string,
  userId: string,
  errorMessage: string,
  requestPayload: Json,
): Promise<void> {
  const row: TablesInsert<'generation_logs'> = {
    user_id: userId,
    entity_type: 'compatibility_report',
    entity_id: reportId,
    operation_key: 'compatibility.pipeline.synastry',
    provider: env.LLM_PROVIDER,
    model: activeModelName(),
    request_payload_json: requestPayload,
    response_payload_json: { status: 'error' } as Json,
    latency_ms: 0,
    usage_tokens: null,
    error_message: errorMessage,
  };

  await db
    .from('generation_logs')
    .insert(row)
    .then(({ error }) => {
      if (error) {
        logger.warn(
          { error, reportId, errorMessage },
          'compatibility: failed to persist precondition failure log',
        );
      }
    });
}

export function serializeChartForSynastry(
  label: string,
  personName: string,
  birthTimeKnown: boolean,
  positions: PositionRow[],
  aspects: AspectRow[],
): string {
  const posLines = positions
    .map(
      (p) =>
        `  - ${p.body_key} in ${p.sign_key}, house ${p.house_number ?? '?'}, ${p.degree_decimal.toFixed(2)}°${p.retrograde ? ' (R)' : ''}`,
    )
    .join('\n');
  const aspLines = aspects
    .map(
      (a) =>
        `  - ${a.body_a} ${a.aspect_key} ${a.body_b}, orb ${a.orb_decimal.toFixed(2)}°${a.applying != null ? `, applying=${a.applying}` : ''}`,
    )
    .join('\n');
  return `Chart: ${label} (${personName})\nBirth time known: ${birthTimeKnown ? 'yes' : 'no'}\nPositions:\n${posLines}\nAspects:\n${aspLines}`;
}

const SYNASTRY_ASPECT_DEFS = [
  { name: 'conjunction', angle: 0, orb: 8 },
  { name: 'sextile', angle: 60, orb: 4 },
  { name: 'square', angle: 90, orb: 7 },
  { name: 'trine', angle: 120, orb: 7 },
  { name: 'opposition', angle: 180, orb: 8 },
] as const;

const SYNASTRY_PLANETS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'ascendant',
  'midheaven',
] as const;

/** Compute inter-chart (cross) aspects between two sets of positions. */
export function computeCrossAspects(
  positionsA: PositionRow[],
  nameA: string,
  positionsB: PositionRow[],
  nameB: string,
): string {
  const planetsA = positionsA.filter((p) =>
    (SYNASTRY_PLANETS as readonly string[]).includes(p.body_key),
  );
  const planetsB = positionsB.filter((p) =>
    (SYNASTRY_PLANETS as readonly string[]).includes(p.body_key),
  );

  const found: Array<{ line: string; orb: number }> = [];

  for (const a of planetsA) {
    for (const b of planetsB) {
      const raw = Math.abs(a.degree_decimal - b.degree_decimal);
      const diff = raw > 180 ? 360 - raw : raw;
      for (const aspect of SYNASTRY_ASPECT_DEFS) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          found.push({
            line: `  - ${nameA} ${a.body_key} ${aspect.name} ${nameB} ${b.body_key}, orb ${orb.toFixed(2)}°`,
            orb,
          });
          break;
        }
      }
    }
  }

  return found
    .sort((a, b) => a.orb - b.orb)
    .map((f) => f.line)
    .join('\n');
}

/** Fast: creates a pending compatibility record. */
export async function createPendingCompatibility(
  userId: string,
  primaryChartId: string,
  secondaryChartId: string,
  compatibilityType: CompatibilityType = 'romantic',
) {
  const { data: primary } = await db
    .from('charts')
    .select('id')
    .eq('id', primaryChartId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!primary) throw new NotFoundError({ message: 'Primary chart not found' });

  const { data: secondary } = await db
    .from('charts')
    .select('id')
    .eq('id', secondaryChartId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!secondary) throw new NotFoundError({ message: 'Secondary chart not found' });

  const [{ data: primarySnapshot }, { data: secondarySnapshot }] = await Promise.all([
    db
      .from('chart_snapshots')
      .select('id')
      .eq('chart_id', primaryChartId)
      .order('snapshot_version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('chart_snapshots')
      .select('id')
      .eq('chart_id', secondaryChartId)
      .order('snapshot_version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!primarySnapshot || !secondarySnapshot) {
    throw new ValidationError({
      message: 'Both charts must have generated snapshots before compatibility can be created',
      context: {
        compatibilityType,
        primaryChartId,
        secondaryChartId,
        primarySnapshotFound: Boolean(primarySnapshot),
        secondarySnapshotFound: Boolean(secondarySnapshot),
      },
    });
  }

  const config = COMPATIBILITY_CONFIGS[compatibilityType];

  const { data: report, error } = await db
    .from('compatibility_reports')
    .insert({
      user_id: userId,
      primary_chart_id: primaryChartId,
      secondary_chart_id: secondaryChartId,
      status: 'pending',
      prompt_version: config.promptVersion,
      compatibility_type: compatibilityType,
    })
    .select('*')
    .single();

  if (error || !report) throw error ?? new Error('Failed to create compatibility report');

  return report;
}

/** Slow: fetches both charts and runs the LLM pipeline to generate the synastry report. */
export async function generateCompatibilityContent(
  reportId: string,
  userId: string,
): Promise<void> {
  const { data: report } = await db
    .from('compatibility_reports')
    .select('id, primary_chart_id, secondary_chart_id, status, compatibility_type')
    .eq('id', reportId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!report) throw new NotFoundError({ message: 'Compatibility report not found' });

  if (report.status === 'ready' || report.status === 'generating') return;

  const compatibilityType = (report.compatibility_type as CompatibilityType | null) ?? 'romantic';
  const config = COMPATIBILITY_CONFIGS[compatibilityType];

  await db.from('compatibility_reports').update({ status: 'generating' }).eq('id', reportId);

  // Fetch both charts
  const [{ data: primaryChart }, { data: secondaryChart }] = await Promise.all([
    db
      .from('charts')
      .select('id, label, person_name, birth_time_known')
      .eq('id', report.primary_chart_id)
      .maybeSingle(),
    db
      .from('charts')
      .select('id, label, person_name, birth_time_known')
      .eq('id', report.secondary_chart_id)
      .maybeSingle(),
  ]);

  if (!primaryChart || !secondaryChart) {
    const errorMessage = 'Compatibility generation failed: chart lookup missing';
    logger.warn({ reportId, userId, compatibilityType }, 'compatibility: chart lookup missing');
    await persistCompatibilityFailureLog(reportId, userId, errorMessage, {
      compatibilityType,
      primaryChartId: report.primary_chart_id,
      secondaryChartId: report.secondary_chart_id,
      stage: 'chart_lookup',
    });
    await db.from('compatibility_reports').update({ status: 'error' }).eq('id', reportId);
    return;
  }

  // Fetch snapshots for both charts
  const [{ data: primarySnapshot }, { data: secondarySnapshot }] = await Promise.all([
    db
      .from('chart_snapshots')
      .select('id')
      .eq('chart_id', report.primary_chart_id)
      .order('snapshot_version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('chart_snapshots')
      .select('id')
      .eq('chart_id', report.secondary_chart_id)
      .order('snapshot_version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!primarySnapshot || !secondarySnapshot) {
    const errorMessage = 'Compatibility generation failed: latest chart snapshot missing';
    logger.warn(
      {
        reportId,
        userId,
        compatibilityType,
        primarySnapshotFound: Boolean(primarySnapshot),
        secondarySnapshotFound: Boolean(secondarySnapshot),
      },
      'compatibility: latest chart snapshot missing for generation',
    );
    await persistCompatibilityFailureLog(reportId, userId, errorMessage, {
      compatibilityType,
      primaryChartId: report.primary_chart_id,
      secondaryChartId: report.secondary_chart_id,
      primarySnapshotFound: Boolean(primarySnapshot),
      secondarySnapshotFound: Boolean(secondarySnapshot),
      stage: 'snapshot_lookup',
    });
    await db.from('compatibility_reports').update({ status: 'error' }).eq('id', reportId);
    return;
  }

  // Fetch positions and aspects for both charts in parallel
  const [
    { data: primaryPositions },
    { data: primaryAspects },
    { data: secondaryPositions },
    { data: secondaryAspects },
  ] = await Promise.all([
    db
      .from('chart_positions')
      .select('body_key, sign_key, house_number, degree_decimal, retrograde')
      .eq('chart_snapshot_id', primarySnapshot.id)
      .order('degree_decimal', { ascending: true }),
    db
      .from('chart_aspects')
      .select('body_a, body_b, aspect_key, orb_decimal, applying')
      .eq('chart_snapshot_id', primarySnapshot.id)
      .order('orb_decimal', { ascending: true }),
    db
      .from('chart_positions')
      .select('body_key, sign_key, house_number, degree_decimal, retrograde')
      .eq('chart_snapshot_id', secondarySnapshot.id)
      .order('degree_decimal', { ascending: true }),
    db
      .from('chart_aspects')
      .select('body_a, body_b, aspect_key, orb_decimal, applying')
      .eq('chart_snapshot_id', secondarySnapshot.id)
      .order('orb_decimal', { ascending: true }),
  ]);

  const primaryFacts = serializeChartForSynastry(
    primaryChart.label,
    primaryChart.person_name,
    primaryChart.birth_time_known,
    primaryPositions ?? [],
    primaryAspects ?? [],
  );
  const secondaryFacts = serializeChartForSynastry(
    secondaryChart.label,
    secondaryChart.person_name,
    secondaryChart.birth_time_known,
    secondaryPositions ?? [],
    secondaryAspects ?? [],
  );

  const crossAspectLines = computeCrossAspects(
    primaryPositions ?? [],
    primaryChart.person_name,
    secondaryPositions ?? [],
    secondaryChart.person_name,
  );

  // Fetch user locale (single source of truth)
  const { data: userProfile } = await db
    .from('profiles')
    .select('locale')
    .eq('id', userId)
    .single();
  const locale = (userProfile?.locale ?? 'ru') as 'en' | 'ru';

  const systemPrompt =
    locale === 'en'
      ? `Every string field in the JSON response MUST be written in English. No Russian words or phrases are allowed.

${config.role[locale]}
Do not mention being an AI. Do not give medical, legal, financial assertions or fatalistic predictions.

CRITICAL RULES:
- Use ONLY cross-aspects (inter-chart aspects) from the "Cross-aspects" section in the user message. Do NOT invent aspects that are not in the data.
- Do NOT use natal aspects (aspects within one chart) as cross-aspects. A cross-aspect is ALWAYS a planet of one person to a planet of the other.
- If there is no data for North Node, Lilith or other points in cross-aspects — do NOT mention them and do NOT speculate about their influence.
- Use the names of both people (${primaryChart.person_name} and ${secondaryChart.person_name}) frequently and naturally — at least 5-7 times each throughout the text. Do not replace names with pronouns or abstractions like "the first person".

Return ONLY valid JSON of this shape:
{
  "title": string,
  "summary": string,
  "sections": [{ "key": string, "title": string, "content": string }],
  "placementHighlights": string[],
  "advice": string[],
  "disclaimers": string[],
  "metadata": { "locale": "en", "readingType": "natal_overview", "promptVersion": string, "schemaVersion": string }
}

Requirements:
- Include both names in the title, e.g.: "${primaryChart.person_name} & ${secondaryChart.person_name} — ${config.titleSuffix[locale]}"
- Exactly 5 sections: ${config.sections[locale]}
- Each section — 300-400 words of specific, evidence-based analysis referencing actual cross-aspects between the two charts by name (e.g., "${primaryChart.person_name}'s Moon trine ${secondaryChart.person_name}'s Venus")
- Use both names naturally throughout the text
- Reference ONLY the cross-aspects listed in the data. Every aspect mention must correspond to an actual cross-aspect from the list.
- placementHighlights — list of 4-6 most significant inter-chart aspects (format: "Person's Planet aspect Person's Planet (orb)")
- advice — 4-5 specific, practical recommendations for this relationship
- summary — 3-4 sentences describing the overall relationship dynamics`
      : `Весь JSON-ответ — каждое строковое поле — ОБЯЗАТЕЛЬНО должен быть написан на русском языке. Использование английского языка в любом поле недопустимо.

${config.role[locale]}
Не упоминай, что ты ИИ. Не давай медицинских, юридических, финансовых утверждений и фаталистических прогнозов.

КРИТИЧЕСКИЕ ПРАВИЛА:
- Используй ТОЛЬКО кросс-аспекты (межкартные аспекты) из раздела «Кросс-аспекты» в сообщении пользователя. НЕ придумывай аспекты, которых нет в данных.
- НЕ используй натальные аспекты (аспекты внутри одной карты) как кросс-аспекты. Кросс-аспект — это ВСЕГДА планета одного человека к планете другого.
- Если данных по Северному узлу, Лилит или другим точкам нет в кросс-аспектах — НЕ упоминай их и НЕ спекулируй об их влиянии.
- Используй правильную грамматику русского языка: «в соединении с Плутоном Павла» (творительный падеж), а не «с Плутон Павла».
- Названия планет: Солнце, Луна, Меркурий, Венера, Марс, Юпитер, Сатурн, Уран, Нептун, Плутон, ASC (Асцендент), MC (Середина Неба). Слова «Мидиан», «Мидиана», «Мидиану» — ЗАПРЕЩЕНЫ. Используй только «MC» или «Середина Неба».
- Используй имена обоих людей (${primaryChart.person_name} и ${secondaryChart.person_name}) часто и естественно — минимум 5-7 раз каждое имя по всему тексту. Не заменяй имена местоимениями или абстракциями вроде «первый человек».

Верни ТОЛЬКО валидный JSON следующей формы:
{
  "title": string,
  "summary": string,
  "sections": [{ "key": string, "title": string, "content": string }],
  "placementHighlights": string[],
  "advice": string[],
  "disclaimers": string[],
  "metadata": { "locale": "ru", "readingType": "natal_overview", "promptVersion": string, "schemaVersion": string }
}

Требования:
- В заголовке укажи имена обоих людей, например: "${primaryChart.person_name} и ${secondaryChart.person_name} — ${config.titleSuffix[locale]}"
- Ровно 5 секций: ${config.sections[locale]}
- Каждая секция — 300-400 слов конкретного, обоснованного анализа с указанием реальных кросс-аспектов между двумя картами по имени (например, "Луна ${primaryChart.person_name} в тригоне к Венере ${secondaryChart.person_name}")
- Используй имена обоих людей естественно по всему тексту
- Ссылайся ТОЛЬКО на те кросс-аспекты, которые указаны в данных. Каждое упоминание аспекта должно соответствовать реальному кросс-аспекту из списка.
- placementHighlights — список 4-6 самых ярких межкартных аспектов (формат: "Планета Имени в аспекте к Планете Имени (орбита)")
- advice — 4-5 конкретных, практичных рекомендаций для этих отношений
- summary — 3-4 предложения, описывающие общую динамику отношений`;

  const userPrompt =
    locale === 'en'
      ? `Analyze the synastry between these two charts:

${primaryFacts}

---

${secondaryFacts}

Cross-aspects (inter-chart aspects, computed server-side — most significant):
${crossAspectLines || '  — none found'}

Use the cross-aspects above as the primary material for analysis. These are real inter-chart aspects between the two people.`
      : `Проанализируй синастрию между этими двумя картами:

${primaryFacts}

---

${secondaryFacts}

Кросс-аспекты (межкартные аспекты, вычислены на сервере — самые значимые):
${crossAspectLines || '  — не найдены'}

Используй приведённые выше кросс-аспекты как основной материал для анализа. Это реальные межкартные аспекты между двумя людьми.`;

  let content: StructuredReadingOutput;
  let status: 'ready' | 'error' = 'ready';
  const startedAt = Date.now();

  try {
    const result = await generateStructuredOutputWithUsage({
      systemPrompt,
      userPrompt,
      schema: structuredReadingSchema,
      mockResponse: {
        title:
          locale === 'en'
            ? `${primaryChart.person_name} & ${secondaryChart.person_name} — ${config.titleSuffix[locale]}`
            : `${primaryChart.person_name} и ${secondaryChart.person_name} — ${config.titleSuffix[locale]}`,
        summary:
          locale === 'en'
            ? `The synastry of ${primaryChart.person_name} and ${secondaryChart.person_name} shows a vivid connection with several growth points.`
            : `Синастрия ${primaryChart.person_name} и ${secondaryChart.person_name} показывает яркую связь с рядом точек роста.`,
        sections: config.mockSections[locale],
        placementHighlights: [],
        advice: [
          locale === 'en'
            ? "Pay attention to each other's needs."
            : 'Уделяйте внимание потребностям друг друга.',
        ],
        disclaimers: [
          locale === 'en'
            ? 'Synastry is an interpretation of potential, not a prediction.'
            : 'Синастрия — это интерпретация потенциала, а не предсказание.',
        ],
        metadata: {
          locale,
          readingType: 'natal_overview',
          promptVersion: config.promptVersion,
          schemaVersion: '1',
        },
      },
    });
    content = result.content;

    const generationLogRow: TablesInsert<'generation_logs'> = {
      user_id: userId,
      entity_type: 'compatibility_report',
      entity_id: reportId,
      operation_key: 'compatibility.pipeline.synastry',
      provider: env.LLM_PROVIDER,
      model: activeModelName(),
      request_payload_json: { systemPrompt, userPrompt } as Json,
      response_payload_json: content as Json,
      latency_ms: Date.now() - startedAt,
      usage_tokens: result.usageTokens,
      error_message: null,
    };

    await db
      .from('generation_logs')
      .insert(generationLogRow)
      .then(({ error }) => {
        if (error)
          logger.warn({ error, reportId }, 'compatibility: failed to persist generation log');
      });
  } catch (err) {
    status = 'error';

    // Refund only if this report was actually charged.
    try {
      await refundReferenceDebitIfEligible(
        userId,
        'compatibility_report',
        reportId,
        'compatibility_debit',
        'refund_llm_failure',
      );
    } catch (refundErr) {
      logger.error(
        { err: refundErr, reportId },
        'compatibility: failed to refund credits after LLM failure',
      );
    }

    await db
      .from('generation_logs')
      .insert({
        user_id: userId,
        entity_type: 'compatibility_report',
        entity_id: reportId,
        operation_key: 'compatibility.pipeline.synastry',
        provider: env.LLM_PROVIDER,
        model: activeModelName(),
        request_payload_json: { systemPrompt, userPrompt } as Json,
        response_payload_json: { status: 'error' } as Json,
        latency_ms: Date.now() - startedAt,
        usage_tokens: null,
        error_message: err instanceof Error ? err.message : 'Compatibility generation failed',
      })
      .then(({ error }) => {
        if (error)
          logger.warn({ error, reportId }, 'compatibility: failed to persist error generation log');
      });
    logger.error({ err, reportId }, 'compatibility: generation failed');
    await db.from('compatibility_reports').update({ status: 'error' }).eq('id', reportId);
    return;
  }

  await db
    .from('compatibility_reports')
    .update({
      status,
      summary: content.summary,
      rendered_content_json: content as Json,
      prompt_version: content.metadata.promptVersion,
      model_provider: env.LLM_PROVIDER,
      model_name: activeModelName(),
    })
    .eq('id', reportId);
}

/** Reset a failed compatibility report to pending so it can be re-generated. */
export async function resetCompatibilityForRetry(reportId: string, userId: string) {
  const { data: report } = await db
    .from('compatibility_reports')
    .select('id, status')
    .eq('id', reportId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!report) throw new NotFoundError({ message: 'Compatibility report not found' });

  await db
    .from('compatibility_reports')
    .update({ status: 'pending', rendered_content_json: null })
    .eq('id', reportId);
}
