// SubscriptionResponse type replaced with inline types

type ProfileResponse = {
  display_name: string | null;
  telegram_id: string | null;
};

type SubscriptionResponse = {
  planId: 'free' | 'basic' | 'pro' | 'max';
  cardsLimit: number;
  cardsGenerated: number;
  cardsRemaining: number;
  isPaid: boolean;
};

type TelegramLinkResponse = {
  success: boolean;
  alreadyLinked: boolean;
  telegramId?: string;
  deepLink?: string;
};

class ProfileApi {
  async getProfile(noCache = false): Promise<ProfileResponse> {
    const response = await fetch('/api/profile', {
      cache: noCache ? 'no-store' : 'default',
    });

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

  async setupWebAccess(email: string, password: string): Promise<void> {
    const response = await fetch('/api/profile/link-web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to set up web access');
    }
  }

  async startTelegramLink(locale?: string): Promise<TelegramLinkResponse> {
    const response = await fetch('/api/profile/link-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: locale ?? null }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to start Telegram linking');
    }

    return (await response.json()) as TelegramLinkResponse;
  }

  async getSubscription(): Promise<SubscriptionResponse> {
    const response = await fetch('/api/profile/subscription');
    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to load subscription');
    }
    return (await response.json()) as SubscriptionResponse;
  }

  async requestPlanCheckout(planId: string): Promise<{ url: string }> {
    const response = await fetch('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to start plan checkout');
    }
    return (await response.json()) as { url: string };
  }

  async requestUpgrade(planId: string): Promise<{ url: string }> {
    return this.requestPlanCheckout(planId);
  }

  async deleteAccount(): Promise<void> {
    const response = await fetch('/api/profile', {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to delete account');
    }
  }
}

export const profileApi = new ProfileApi();
