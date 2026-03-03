import { createHmac } from 'crypto';
import { env } from '@/lib/env';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: number;
}

interface VerifyTelegramResult {
  userId: number;
  telegramData: {
    user?: TelegramUser;
    auth_date?: number;
  };
}

/**
 * Validates Telegram Mini App initData HMAC signature
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export async function verifyTelegramAuthData(initData: string): Promise<VerifyTelegramResult> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram auth is not configured on this server');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) {
    throw new Error('Missing hash in Telegram initData');
  }

  params.delete('hash');

  const sortedParams = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(env.TELEGRAM_BOT_TOKEN).digest();
  const expectedHash = createHmac('sha256', secretKey).update(sortedParams).digest('hex');

  if (expectedHash !== hash) {
    throw new Error('Telegram initData HMAC verification failed');
  }

  const userParam = params.get('user');
  if (!userParam) {
    throw new Error('No user in Telegram initData');
  }

  const telegramUser = JSON.parse(userParam) as TelegramUser;
  const authDate = params.get('auth_date');

  console.log('Telegram auth data verified', {
    telegramId: telegramUser.id,
    username: telegramUser.username,
  });

  return {
    userId: telegramUser.id,
    telegramData: {
      user: telegramUser,
      auth_date: authDate ? parseInt(authDate, 10) : undefined,
    },
  };
}
