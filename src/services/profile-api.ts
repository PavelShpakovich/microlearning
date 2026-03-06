import type { SubscriptionResponse } from '@/lib/subscriptions/types';

type ProfileResponse = {
  streak_count: number;
  display_name: string | null;
  telegram_id: string | null;
  last_study_date?: string | null;
};

class ProfileApi {
  async getProfile(): Promise<ProfileResponse> {
    const response = await fetch('/api/profile');

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to load profile');
    }

    return (await response.json()) as ProfileResponse;
  }

  async updateDisplayName(displayName: string): Promise<ProfileResponse> {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to update profile');
    }

    return (await response.json()) as ProfileResponse;
  }

  async updateUiLanguage(uiLanguage: 'en' | 'ru'): Promise<ProfileResponse> {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uiLanguage }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to update language');
    }

    return (await response.json()) as ProfileResponse;
  }

  async updatePassword(password: string): Promise<void> {
    const response = await fetch('/api/profile/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to update password');
    }
  }

  async getSubscription(): Promise<SubscriptionResponse> {
    const response = await fetch('/api/profile/subscription');
    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to load subscription');
    }
    return (await response.json()) as SubscriptionResponse;
  }

  /** Generates a short-lived link token so the user can connect their Telegram account. */
  async generateTelegramLinkToken(): Promise<{ token: string }> {
    const response = await fetch('/api/profile/telegram-link-token', { method: 'POST' });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to generate link token');
    }
    return (await response.json()) as { token: string };
  }

  async requestUpgrade(planId: string): Promise<{ supportEmail: string }> {
    const response = await fetch('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to request upgrade');
    }
    return (await response.json()) as { supportEmail: string };
  }
}

export const profileApi = new ProfileApi();
