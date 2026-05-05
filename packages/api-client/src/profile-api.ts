import { fetchJson } from './api-client';

type ProfileResponse = {
  display_name: string | null;
  timezone?: string | null;
  onboarding_completed_at?: string | null;
  birth_data_consent_at?: string | null;
};

class ProfileApi {
  async getProfile(noCache = false): Promise<ProfileResponse> {
    return fetchJson<ProfileResponse>('/api/profile', {
      cache: noCache ? 'no-store' : 'default',
    });
  }

  async updateDisplayName(displayName: string): Promise<ProfileResponse> {
    return this.updateProfile({ displayName });
  }

  async updateProfile(updates: {
    displayName?: string;
    timezone?: string | null;
    locale?: string;
    onboardingCompleted?: boolean;
  }): Promise<ProfileResponse> {
    return fetchJson<ProfileResponse>('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }

  async updatePassword(password: string): Promise<void> {
    await fetchJson<{ ok: true }>('/api/profile/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  }

  async deleteAccount(): Promise<void> {
    await fetchJson<{ ok: true }>('/api/profile', { method: 'DELETE' });
  }
}

export const profileApi = new ProfileApi();
