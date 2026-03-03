class AuthApi {
  async register(email: string, password: string): Promise<void> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      throw new Error(data.message || 'Registration failed');
    }
  }

  async exchangeTelegramInitData(initData: string): Promise<{ sessionToken: string }> {
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error || `Server error ${response.status}`);
    }

    return (await response.json()) as { sessionToken: string };
  }
}

export const authApi = new AuthApi();
