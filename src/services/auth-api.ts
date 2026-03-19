class AuthApi {
  async exchangeTelegramInitData(
    initData: string,
    startParam?: string | null,
  ): Promise<{ sessionToken: string; wasLinked?: boolean }> {
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, startParam: startParam ?? undefined }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error || `Server error ${response.status}`);
    }

    return (await response.json()) as { sessionToken: string; wasLinked?: boolean };
  }

  async resendVerificationEmail(email: string): Promise<void> {
    await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    // The endpoint always returns 200 regardless of whether the email exists,
    // so there is no error to surface here.
  }
}

export const authApi = new AuthApi();
