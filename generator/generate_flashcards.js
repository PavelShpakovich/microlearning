#!/usr/bin/env node
// ─── Admin card generator ─────────────────────────────────────────────────────
// Generates global flashcards using a local or remote LLM and inserts them
// into Supabase with user_id = NULL (visible to all users).
//
// Usage:
//   node generator/generate_flashcards.js --theme "TypeScript generics" --count 20
//
// Requirements:
//   • generator/.env with SUPABASE_URL, SUPABASE_SERVICE_KEY, LLM_PROVIDER, etc.

import 'dotenv/config';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';

// ─── Argument parsing ─────────────────────────────────────────────────────────
const { values } = parseArgs({
  options: {
    theme: { type: 'string', short: 't' },
    count: { type: 'string', short: 'c', default: '10' },
    'dry-run': { type: 'boolean', default: false },
    confirm: { type: 'boolean', default: false },
  },
});

if (!values.theme) {
  console.error('Error: --theme is required');
  process.exit(1);
}

const theme = values.theme;
const count = Math.min(parseInt(values.count ?? '10', 10), 50);
const dryRun = values['dry-run'] ?? false;

// ─── Supabase client (service role — admin only) ──────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in generator/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ─── LLM call ────────────────────────────────────────────────────────────────
const provider = process.env.LLM_PROVIDER ?? 'ollama';
const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const ollamaModel = process.env.OLLAMA_MODEL ?? 'llama3';

async function callOllama(prompt) {
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: ollamaModel, prompt, stream: false, format: 'json' }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.response;
}

async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');
  const model = process.env.GROQ_MODEL ?? 'llama3-70b-8192';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function generateCards(theme, count) {
  const system = `You are an expert flashcard creator. Output ONLY a JSON array of exactly ${count} objects: [{"question":"...","answer":"..."}]`;
  const prompt = `${system}\n\nGenerate ${count} flashcards for the topic: "${theme}"`;

  let raw;
  switch (provider) {
    case 'groq':
      raw = await callGroq(prompt);
      break;
    case 'ollama':
    default:
      raw = await callOllama(prompt);
      break;
  }

  let parsed = JSON.parse(raw.trim());
  if (!Array.isArray(parsed)) {
    // Some models wrap in an object — extract the first array value
    parsed = Object.values(parsed).find(Array.isArray) ?? [];
  }
  return parsed;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🃏  Generating ${count} cards for topic: "${theme}"\n`);

  let cards;
  try {
    cards = await generateCards(theme, count);
    console.log(`✓  Generated ${cards.length} cards\n`);
    cards.slice(0, 3).forEach((c, i) => {
      console.log(`   [${i + 1}] Q: ${c.question}`);
      console.log(`       A: ${c.answer}\n`);
    });
    if (cards.length > 3) console.log(`   … and ${cards.length - 3} more\n`);
  } catch (err) {
    console.error('✗  Generation failed:', err.message);
    process.exit(1);
  }

  if (dryRun) {
    console.log('ℹ  Dry-run mode — nothing inserted into Supabase.\n');
    return;
  }

  if (!values.confirm) {
    const readline = await import('node:readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const confirmed = await new Promise((resolve) => {
      rl.question(`Insert ${cards.length} cards into Supabase? (y/N) `, (ans) => {
        rl.close();
        resolve(ans.trim().toLowerCase() === 'y');
      });
    });
    if (!confirmed) {
      console.log('Aborted.');
      return;
    }
  }

  const rows = cards.map((c) => ({
    user_id: null,
    theme_id: null,
    source_id: null,
    question: c.question,
    answer: c.answer,
    topic: theme,
  }));

  const { error } = await supabase.from('cards').insert(rows);
  if (error) {
    console.error('✗  Supabase insert failed:', error.message);
    process.exit(1);
  }

  console.log(`✓  Inserted ${rows.length} global cards into Supabase.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
