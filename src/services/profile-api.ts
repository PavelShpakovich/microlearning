type ProfileResponse = {
  display_name: string | null;
  telegram_id: string | null;
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

  async setupWebAccess(email: string, password: string): Promise<{ needsVerification: boolean }> {
    const response = await fetch('/api/profile/link-web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to set up web access');
    }

    const data = (await response.json()) as { needsVerification?: boolean };
    return { needsVerification: Boolean(data.needsVerification) };
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
