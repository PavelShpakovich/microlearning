import Stripe from 'stripe';
import { env } from '@/lib/env';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-02-25.clover',
      appInfo: {
        name: 'Clario',
        version: '0.1.0',
      },
    });
  }
  return _stripe;
}
