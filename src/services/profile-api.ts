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

  /** Upgrades a Telegram stub account by setting a real email + password in-place.
   * - If the email is new: returns { success: true } — user must verify via email.
   * - If the email belongs to an existing web account and password matches:
   *   merges stub into that account and returns { sessionToken, overLimit } for immediate sign-in.
   */
  async upgradeStub(
    initData: string,
    email: string,
    password: string,
  ): Promise<{ success: true } | { sessionToken: string; overLimit: boolean }> {
    const response = await fetch('/api/profile/upgrade-stub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, email, password }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || `Server error ${response.status}`);
    }
    return (await response.json()) as
      | { success: true }
      | { sessionToken: string; overLimit: boolean };
  }

  async requestUpgrade(planId: string): Promise<{ url: string }> {
    const response = await fetch('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to request upgrade');
    }
    return (await response.json()) as { url: string };
  }

  async requestTelegramStarsUpgrade(planId: string): Promise<{ invoiceLink: string }> {
    const response = await fetch('/api/telegram/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to generate Telegram invoice');
    }
    return (await response.json()) as { invoiceLink: string };
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
