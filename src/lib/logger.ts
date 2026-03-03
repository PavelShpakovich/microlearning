import pino from 'pino';
import { env } from '@/lib/env';

/**
 * Structured server-side logger built on pino.
 * Always includes timestamp. In development, logs are pretty-printed via a
 * synchronous custom serialiser — avoids pino-pretty worker_threads which
 * Next.js's bundler cannot resolve at runtime.
 * Never use console.log — import this logger instead.
 */

function devWrite(o: string) {
  try {
    const { time, level, msg, ...rest } = JSON.parse(o) as {
      time: number;
      level: number;
      msg: string;
      [k: string]: unknown;
    };
    const label = level >= 50 ? 'ERROR' : level >= 40 ? 'WARN' : level >= 30 ? 'INFO' : 'DEBUG';
    const ts = new Date(time).toISOString();
    const extra = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
    process.stdout.write(`${ts} [${label}] ${msg}${extra}\n`);
  } catch {
    process.stdout.write(o + '\n');
  }
}

const isDev = env.NODE_ENV !== 'production';

export const logger = pino(
  { level: isDev ? 'debug' : 'info', timestamp: pino.stdTimeFunctions.isoTime },
  isDev ? { write: devWrite } : pino.destination(1),
);

export type Logger = typeof logger;
