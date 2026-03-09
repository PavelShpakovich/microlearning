/**
 * Feature flags — code-based toggles for enabling/disabling features.
 *
 * To re-enable web auth:
 *   Set WEB_AUTH_ENABLED to true and redeploy.
 */
export const FLAGS = {
  /**
   * When false:
   *  - /login, /register, /auth/forgot-password redirect to the Telegram bot
   *  - POST /api/auth/register returns 410
   *  - Landing page CTAs link to the bot instead of /register and /login
   *
   * When true: full web login and registration are available.
   */
  WEB_AUTH_ENABLED: false,

  /**
   * When false:
   *  - /tg/upgrade redirects to /tg
   *  - POST /api/profile/upgrade-stub returns 410
   *  - GET /api/auth/verify-email returns 410
   *  - POST /api/profile/resend-verification returns 410
   *  - Telegram auth never sets needsEmail=true (stub users go straight to dashboard)
   *
   * When true: users can add & verify an email address to their Telegram account.
   */
  EMAIL_UPGRADE_ENABLED: false,
} as const;
