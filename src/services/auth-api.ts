class AuthApi {
  async exchangeTelegramInitData(
    initData: string,
    startParam?: string | null,
  ): Promise<{ sessionToken: string }> {
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, startParam: startParam ?? undefined }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error || `Server error ${response.status}`);
    }

    return (await response.json()) as { sessionToken: string };
  }
}

export const authApi = new AuthApi();
