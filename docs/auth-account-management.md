# Authentication And Account Management

## Overview

Clario Astrology uses a shared Supabase identity backend for both clients, but the session layer differs by platform:

- Web uses NextAuth with a custom Credentials provider that signs into Supabase and then stores a NextAuth JWT session.
- Mobile uses Supabase Auth directly and persists the Supabase session in Expo Secure Store.
- Shared authenticated API routes accept either a mobile Bearer token or a web session/cookie-backed identity.

Core split:

- Identity source of truth: Supabase Auth users.
- Web session transport: NextAuth JWT cookie.
- Mobile session transport: Supabase access token and refresh token.
- App profile/account data: `profiles`, `user_preferences`, `account_identities`, `email_verification_tokens`, plus related user-owned tables in Supabase.

## Shared Building Blocks

### API authentication resolution

Server routes use `requireAuth()` from `apps/web/src/lib/api/auth.ts`.

Resolution order:

1. If the request has `Authorization: Bearer <token>`, the API treats it as a mobile client and validates the token via `supabaseAdmin.auth.getUser(token)`.
2. Otherwise it tries a Supabase server client cookie session.
3. If that is absent, it falls back to the NextAuth server session via `auth()`.

Implications:

- Mobile can call the same `/api/*` routes as web without NextAuth.
- Web API routes remain usable from server components and browser requests even when only the NextAuth session is present.
- Admin checks first trust `session.user.isAdmin`, then fall back to `profiles.is_admin` and `ADMIN_EMAILS`.

### Shared API client behavior

`packages/api-client` is the common client used by both apps.

- `authApi.register()` calls `/api/auth/register` and passes `source: 'mobile'`.
- `authApi.resendVerificationEmail()` calls `/api/auth/resend-verification`.
- `authApi.requestPasswordReset()` calls `/api/auth/password/reset`.
- `authApi.confirmPasswordReset()` calls `/api/auth/password/confirm-reset` with a Bearer token.
- `profileApi` wraps `/api/profile` for read, update, and delete.

On mobile, `apps/mobile/src/lib/api.ts` installs a token getter that pulls `supabase.auth.getSession()` and injects the current access token into shared API requests.

Current auth-focused test coverage on web includes:

- `apps/web/src/__tests__/api/auth-routes.test.ts` for registration anti-enumeration, password-reset throttling, and shared `confirm-reset` behavior.
- `apps/web/src/__tests__/proxy.test.ts` for public access to `/auth/reset-confirm` and redirect behavior for protected routes.

## Web Authentication

### Session model

Web auth entrypoints:

- `apps/web/auth.ts`
- `apps/web/src/lib/auth/options.ts`
- `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- `apps/web/src/components/root-providers.tsx`

How it works:

- NextAuth is configured with a custom Credentials provider named `password`.
- The provider's `authorize()` signs into Supabase using `signInWithPassword()`.
- On success, NextAuth stores a JWT session cookie and exposes it through `SessionProvider`.
- On refresh, the NextAuth `jwt` callback re-fetches current auth state from Supabase Admin so stale JWT flags do not keep trusting deleted or unverified users.

Session fields synchronized into the JWT/session:

- `userId`
- `displayName`
- `email`
- `isAdmin`
- `isStub`
- `isEmailVerified`

Notable behavior:

- If the NextAuth JWT cannot be decrypted, `auth()` returns `null` instead of crashing the request.
- Login attempts through `/api/auth/callback/password` are rate-limited to 5 attempts per 15 minutes per IP.

### Login flow

Relevant files:

- `apps/web/src/components/auth/login-form.tsx`
- `apps/web/src/lib/auth/options.ts`

Flow:

1. The login form calls `signOut({ redirect: false })` first to clear any stale session.
2. It then calls `signIn('password', { email, password, redirect: false })`.
3. NextAuth forwards credentials into the custom provider.
4. The provider checks whether a matching Supabase user exists and whether email confirmation is complete.
5. It signs into Supabase using a dedicated auth client.
6. It ensures an `account_identities` row exists for that Supabase user.
7. It loads or creates a `profiles` row and uses the profile display name in the NextAuth session.
8. The browser navigates to the returned URL, usually `/dashboard` or a supplied `callbackUrl`.

Failure handling:

- Unverified email raises `email_not_verified` so the form can show a resend-verification action.
- The login page also shows a success banner when redirected back with `reset=success` after password reset.
- Other credential failures are shown as invalid credentials.

### Registration flow

Relevant files:

- `apps/web/src/components/auth/register-form.tsx`
- `apps/web/src/app/api/auth/register/route.ts`
- `apps/web/src/lib/auth/user-accounts.ts`
- `apps/web/src/lib/auth/account-identities.ts`
- `apps/web/src/lib/auth/email-verification.ts`

Flow:

1. The form validates email, password length, password confirmation, and privacy/terms consent.
2. It calls `/api/auth/register`.
3. The route rate-limits by IP to 3 registrations per hour.
4. It checks whether a Supabase auth user already exists for the email.
5. If a confirmed account already exists, the route returns the same public success shape used for new registrations so callers cannot enumerate existing accounts.
6. If an unconfirmed account exists, Clario Astrology resends verification and still returns that same success shape.
7. Otherwise the route creates a Supabase Auth user with `email_confirm: false`.
8. It creates or updates the matching `profiles` row with a derived display name.
9. It ensures a `account_identities` link exists.
10. It grants welcome credits as best-effort.
11. It sends a Clario Astrology-managed verification email.

Important detail:

- Verification is not delegated to Supabase's default email templates. Clario Astrology issues and tracks its own verification token via `email_verification_tokens` and sends mail itself.

### Email verification

Relevant files:

- `apps/web/src/app/api/auth/resend-verification/route.ts`
- `apps/web/src/app/api/auth/confirm/route.ts`
- `apps/web/src/lib/auth/email-verification.ts`

Flow:

1. Registration or explicit resend creates a verification token row.
2. The user receives an email containing `/api/auth/confirm?token=...`.
3. The confirm route validates the token against `email_verification_tokens`.
4. It confirms the Supabase Auth user with `supabaseAdmin.auth.admin.updateUserById(..., { email_confirm: true })`.
5. It redirects to login.

Redirect behavior:

- Web success: `/login?callbackUrl=/onboarding`
- Web error: `/login?verified=error`
- Mobile success: `clario://login?verified=true`
- Mobile error: `clario://login?verified=error`

Security/privacy behavior:

- Resend endpoint always returns success, even for invalid emails or rate limits, to avoid leaking account existence.

### Password reset on web

Relevant files:

- `apps/web/src/app/api/auth/password/reset/route.ts`
- `apps/web/src/components/auth/set-password-form.tsx`
- `apps/web/src/app/(bare)/auth/reset-confirm/page.tsx`

Flow:

1. The user requests a reset through `/api/auth/password/reset`.
2. The route is rate-limited to 5 reset attempts per hour per IP, but still returns `success: true` when throttled so callers cannot use it for account discovery.
3. The route asks Supabase Admin to generate a recovery link.
4. If link generation fails, the error is logged internally and the route still returns `success: true` so it does not reveal whether the email is registered.
5. The real one-time Supabase verify URL is wrapped inside `/auth/reset-confirm?u=<base64url(...)>`.
6. The email contains the Clario Astrology bounce URL, not the raw Supabase URL.
7. The bounce page uses JavaScript to redirect to Supabase only in the browser.
8. Supabase redirects the user back to `/set-password`.
9. `SetPasswordForm` waits for a recovery session or signed-in state from the browser Supabase client.
10. The form updates the password via `supabase.auth.updateUser({ password })`.
11. It then calls `/api/auth/password/confirm-reset` with the recovery access token.
12. That endpoint confirms the email if needed, attempts to revoke other active sessions for the account, and clears any outstanding verification tokens.
13. If session revocation fails, the server logs a warning but still returns success so the completed password change is not rolled back by a cleanup failure.
14. Finally the form clears the local recovery session and redirects to `/login?reset=success` instead of auto-signing the user into the app.

Why the bounce page exists:

- It prevents security scanners such as Microsoft Safe Links from consuming the one-time Supabase recovery URL before the user clicks it.

### Route protection on web

Relevant files:

- `apps/web/middleware.ts`
- `apps/web/src/proxy.ts`

Observed behavior:

- Public pages include `/`, `/privacy`, `/terms`, `/login`, `/register`, `/forgot-password`, `/set-password`, `/auth/callback` and in `src/proxy.ts` also `/auth/reset-confirm`.
- Public APIs include `/api/auth` and `/api/cron`.
- Protected pages and APIs require a valid NextAuth JWT unless they present a Bearer token for mobile.
- Users with `isEmailVerified === false` are blocked from protected routes.
- Admin pages and admin APIs additionally require `isAdmin`.

Important repo note:

- `apps/web/src/proxy.ts` is the canonical route-guard implementation.
- `apps/web/middleware.ts` delegates to `src/proxy.ts` so there is a single source of truth for route protection.

## Mobile Authentication

### Session model

Relevant files:

- `apps/mobile/src/lib/supabase.ts`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/index.tsx`
- `apps/mobile/src/app/auth/callback.tsx`

How it works:

- Mobile creates a Supabase client directly.
- Session storage is backed by Expo Secure Store.
- `autoRefreshToken` and `persistSession` are enabled.
- `detectSessionInUrl` is disabled because Expo handles auth callback URLs explicitly.

Root auth orchestration in `_layout.tsx`:

- On startup the app configures the shared API client.
- It reads the initial deep link before subscribing to Supabase auth events.
- This avoids falsely redirecting to login when the app cold-starts via a recovery deep link.
- `INITIAL_SESSION` decides whether the app is authenticated.
- `SIGNED_OUT` redirects to `/(auth)/login`.
- `PASSWORD_RECOVERY` redirects to `/(auth)/set-password`.
- `USER_UPDATED` redirects to `/`.

Startup routing in `apps/mobile/src/app/index.tsx`:

- No Supabase session: go to `/(auth)/login`.
- Session exists but onboarding incomplete: go to `/onboarding`.
- Session exists and onboarding complete: go to `/(tabs)`.

### Login flow on mobile

Relevant file:

- `apps/mobile/src/app/(auth)/login.tsx`

Flow:

1. The screen calls `supabase.auth.signInWithPassword({ email, password })`.
2. On success it fetches the profile through the shared `profileApi`.
3. If `onboarding_completed_at` is empty it routes to `/onboarding`.
4. Otherwise it routes to the main tabs.

Failure and status handling:

- If Supabase reports an unconfirmed email, the screen shows a dedicated verification error and offers a resend-verification action.
- The login screen also shows a success banner when opened with `reset=success` after password reset.
- Successful resend routes back to `/(auth)/login?verified=true` so the user sees the confirmation banner.

Unlike web:

- There is no NextAuth layer.
- The session remains the Supabase session itself.

### Registration flow on mobile

Relevant file:

- `apps/mobile/src/app/(auth)/register.tsx`

Flow:

1. The screen validates email, password, confirmation, and consent.
2. It calls `authApi.register(email, password)`.
3. The request goes to the same web API route as the web client, but with `source: 'mobile'`.
4. The app shows a verification-required state instead of signing in immediately.
5. Resend verification reuses `/api/auth/resend-verification`.

### Email verification on mobile

Mobile verification still originates from the same server route, but the success redirect goes to the app via custom scheme.

Result:

- Successful verification opens `clario://login?verified=true`.
- The login screen shows the verification banner using the `verified` search param.

### Password reset on mobile

Relevant files:

- `apps/mobile/src/app/(auth)/forgot-password.tsx`
- `apps/mobile/src/app/auth/callback.tsx`
- `apps/mobile/src/app/(auth)/set-password.tsx`
- `apps/web/src/app/(bare)/auth/callback/page.tsx`

Flow:

1. The user requests reset from the app.
2. `authApi.requestPasswordReset()` calls the shared web endpoint with `source: 'mobile'`.
3. The server asks Supabase to generate a recovery link with redirect target `/auth/callback?source=mobile` on the web domain.
4. The user clicks the email link.
5. The web `auth/callback` page converts the browser URL into a `clario://auth/callback?...` deep link.
6. The app's `auth/callback.tsx` receives either `access_token` and `refresh_token`, or a PKCE `code`, or an error.
7. For token-based recovery it calls `supabase.auth.setSession(...)` and routes to `/(auth)/set-password`.
8. The set-password screen updates the password with `supabase.auth.updateUser({ password })`.
9. It then calls `/api/auth/password/confirm-reset` with the recovery access token so mobile and web share the same reset finalization step, including best-effort revocation of other active sessions.
10. The screen clears the local recovery session and redirects back to `/(auth)/login?reset=success` instead of auto-entering the app.

Notable difference from web:

- Mobile and web now share the same reset finalization step, but they still keep separate UI implementations.

## Account Management

### Profile and onboarding

Relevant files:

- `apps/web/src/app/api/profile/route.ts`
- `packages/api-client/src/profile-api.ts`
- `apps/web/src/app/settings/page.tsx`
- `apps/web/src/components/settings/settings-form.tsx`
- `apps/mobile/src/app/(tabs)/settings.tsx`
- `apps/mobile/src/app/onboarding.tsx`

Shared rules:

- Profile data lives in `profiles`.
- `GET /api/profile` auto-creates a profile row if none exists.
- Display name is derived from session email if needed.
- `PATCH /api/profile` supports `displayName`, `timezone`, and `onboardingCompleted`.
- Setting `onboardingCompleted: true` stamps `onboarding_completed_at` with the current timestamp.

Why this matters:

- Both platforms rely on `profiles.onboarding_completed_at` to decide whether the user can enter the main experience.
- Missing profile rows are tolerated and recreated lazily.

### Web settings and account management

Web settings page behavior:

- Reads auth email from Supabase Auth Admin and profile/preferences from Supabase tables.
- Lets the user update display name and timezone through `profileApi.updateProfile()`.
- Lets the user update reading preferences through `preferencesApi.updatePreferences()`.
- Shows privacy state using `birth_data_consent_at`.
- Deletes the account through `profileApi.deleteAccount()`, then signs out of NextAuth.

### Mobile settings and account management

Mobile settings behavior:

- Loads profile, preferences, and current Supabase session email on focus.
- Updates display name and timezone through `profileApi.updateProfile()`.
- Updates preferences through `preferencesApi.updatePreferences()` with optimistic local state.
- Signs out through `supabase.auth.signOut()`.
- Deletes the account through `profileApi.deleteAccount()`, then signs out of Supabase.

### Account deletion

Relevant file:

- `apps/web/src/app/api/profile/route.ts`

Deletion behavior is shared because both clients call the same endpoint:

1. `DELETE /api/profile` requires authentication.
2. The route deletes the user from Supabase Auth using the Admin API.
3. Database cleanup relies on `ON DELETE CASCADE` from the auth user.
4. The code comments explicitly expect this to remove rows such as profiles, charts, readings, follow-up threads, and usage counters.

## Auth-Related Edge Cases And Defensive Behavior

- Web login treats unverified email separately from bad credentials.
- Mobile login now does the same and exposes a resend-verification action from the login screen.
- Web resend-verification and password-reset endpoints intentionally hide whether an email exists.
- Web password-reset throttling also preserves the same public `success: true` response shape.
- Web password reset uses a bounce page to defend against email security scanners consuming one-time tokens.
- Shared `confirm-reset` treats revocation of other sessions as best-effort hardening rather than a hard dependency for successful password change completion.
- Mobile startup explicitly waits for the initial deep link before subscribing to auth events to avoid false redirects.
- `GET /api/profile` converts a stale NextAuth JWT that points to a deleted auth user into a 401-style auth failure instead of leaking a raw database foreign-key error.
- NextAuth refresh logic re-reads auth user data from Supabase so email verification and admin status do not remain stale in old JWTs.

## Quick Reference

### Web-critical files

- `apps/web/src/lib/auth/options.ts`
- `apps/web/src/lib/api/auth.ts`
- `apps/web/src/app/api/auth/register/route.ts`
- `apps/web/src/app/api/auth/resend-verification/route.ts`
- `apps/web/src/app/api/auth/confirm/route.ts`
- `apps/web/src/app/api/auth/password/reset/route.ts`
- `apps/web/src/app/api/auth/password/confirm-reset/route.ts`
- `apps/web/src/app/api/profile/route.ts`
- `apps/web/src/components/auth/login-form.tsx`
- `apps/web/src/components/auth/register-form.tsx`
- `apps/web/src/components/auth/set-password-form.tsx`
- `apps/web/src/components/settings/settings-form.tsx`

### Mobile-critical files

- `apps/mobile/src/lib/supabase.ts`
- `apps/mobile/src/lib/api.ts`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/index.tsx`
- `apps/mobile/src/app/auth/callback.tsx`
- `apps/mobile/src/app/(auth)/login.tsx`
- `apps/mobile/src/app/(auth)/register.tsx`
- `apps/mobile/src/app/(auth)/forgot-password.tsx`
- `apps/mobile/src/app/(auth)/set-password.tsx`
- `apps/mobile/src/app/(tabs)/settings.tsx`

### Shared client files

- `packages/api-client/src/auth-api.ts`
- `packages/api-client/src/profile-api.ts`

## Summary

In this branch, Clario Astrology authentication is centered on Supabase Auth, with web layering NextAuth on top for browser session management and mobile using the Supabase session directly. Account management is mostly unified through shared `/api/profile` and preferences endpoints, while the biggest platform-specific logic lives in session transport, route guarding, and password-reset deep-link handling.
