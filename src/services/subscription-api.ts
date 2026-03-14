/**
 * Client-side service for subscription management.
 *
 * All methods call the generic subscription endpoints.
 * NOTE: DELETE cancels **auto-renewal** only — the subscription stays active
 * until the current period ends, then expires.
 */

class SubscriptionApi {
  async createCheckout(planId: string): Promise<{
    url?: string;
    method?: 'GET' | 'POST';
    fields?: Record<string, string>;
    message?: string;
  }> {
    const response = await fetch('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to start checkout');
    }

    return (await response.json()) as {
      url?: string;
      method?: 'GET' | 'POST';
      fields?: Record<string, string>;
      message?: string;
    };
  }

  /**
   * Cancels auto-renewal for the current subscription.
   * The subscription remains active until current_period_end.
   */
  async cancelRenewal(): Promise<void> {
    const response = await fetch('/api/profile/subscription', {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to cancel renewal');
    }
  }

  /**
   * Re-enables auto-renewal for a subscription where it was previously disabled.
   */
  async reEnableRenewal(): Promise<void> {
    const response = await fetch('/api/profile/subscription', {
      method: 'PATCH',
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to re-enable renewal');
    }
  }
}

export const subscriptionApi = new SubscriptionApi();
