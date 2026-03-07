# Auth Flows — Technical Analysis

> Last updated: 2025

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Web Login Flow](#2-web-login-flow)
3. [Telegram Login Flow](#3-telegram-login-flow)
4. [Stub Account Lifecycle](#4-stub-account-lifecycle)
5. [Web → Telegram Linking](#5-web--telegram-linking)
6. [Telegram → Web Upgrade / Merge](#6-telegram--web-upgrade--merge)
7. [Over-Limit Handling](#7-over-limit-handling)
8. [One-Time Telegram Connect Prompt](#8-one-time-telegram-connect-prompt)
9. [Session & Middleware](#9-session--middleware)
10. [Potential Attack Vectors](#10-potential-attack-vectors)
11. [Known Limitations & Recommendations](#11-known-limitations--recommendations)

---

## 1. Architecture Overview

The app uses **NextAuth.js** as the session layer, backed by **Supabase Auth** as the identity store.

```
Browser / Telegram Mini App
       │
       ▼
NextAuth.js  (next-auth)
  ├── credentials provider  →  Supabase signInWithPassword
  └── telegram  provider   →  HMAC-signed session token
       │
       ▼
 JWT cookie  (30-day, HttpOnly, Secure)
  └── stores: { userId, displayName, isAdmin }
       │
       ▼
 API routes / Server Components
  └── read via getServerSession() or getToken()
```

**Infrastructure split:**

| Concern              | Technology               |
| -------------------- | ------------------------ |
| Session holding      | NextAuth JWT cookie      |
| Identity / passwords | Supabase Auth            |
| Application data     | Supabase Postgres        |
| Bot / Mini App       | Telegram `initData` HMAC |

---

## 2. Web Login Flow

```
User enters email + password
  │
  ▼
POST /api/auth/callback/credentials  (NextAuth)
  │  credentials provider calls:
  ▼
supabase.auth.signInWithPassword({ email, password })
  │  on success:
  └─→ authorize() returns { id, email, name }
       │
       ▼
NextAuth issues 30-day JWT cookie
  └── { userId, displayName, isAdmin, exp }
```

**Registration:**  
`POST /api/auth/register` → `supabase.auth.admin.createUser({ email_confirm: true })` → user must verify email.

**Password change:**  
`POST /api/auth/password` → `supabaseAdmin.auth.admin.updateUserById(userId, { password })` — no re-verification required.

---

## 3. Telegram Login Flow

```
Telegram Mini App opens (initData present)
  │
  ▼
TelegramLoader mounts → detects window.Telegram.WebApp.initData
  │
  ▼
POST /api/auth/telegram  { initData }
  │  Server:
  │  1. HMAC-verify initData using BOT_TOKEN
  │  2. Parse user.id from initData
  │  3. Look up profile by telegram_id
  │     ├─ Found → return sessionToken for that userId
  │     └─ Not found → create stub account
  │         email: telegram_{id}@noreply.clario.app
  │         no password
  │         link telegram_id
  │         return sessionToken for stub userId
  │
  ▼
TelegramLoader calls signIn('telegram', { sessionToken })
  │
  ▼
NextAuth telegram provider:
  1. Decodes sessionToken:  base64url(JSON).HMAC-SHA256
  2. Verifies HMAC with SESSION_SECRET
  3. Checks exp (2-minute window)
  4. Returns { id, name } to NextAuth
  │
  ▼
NextAuth issues 30-day JWT cookie
```

**Session token format:**

```
base64url( JSON.stringify({ userId, displayName, exp }) )
  + "."
  + base64url( HMAC-SHA256( header, SESSION_SECRET ) )
```

Expiry is **2 minutes** — tight window prevents replay outside the handoff.

---

## 4. Stub Account Lifecycle

A **stub account** is created when a Telegram user has never registered on the web.

| Property      | Value                                                         |
| ------------- | ------------------------------------------------------------- |
| Email         | `telegram_{telegramId}@noreply.clario.app`                    |
| Password      | none (Supabase `no_password`)                                 |
| Detection     | `email.startsWith('telegram_') && email.includes('@noreply')` |
| `telegram_id` | populated on `public.profiles`                                |

**Auto-deletion condition:**  
When `POST /api/profile/link-telegram` finds an existing stub with zero themes, the stub is automatically deleted instead of merged, to avoid orphan accounts.

**Stub upgrade paths:**

1. User fills in the `/tg/upgrade` form → `POST /api/profile/upgrade-stub`
2. System may auto-delete stubs on Web→Tg link when they're empty

---

## 5. Web → Telegram Linking

Triggered from **Settings → Connect Telegram** (web) or **one-time prompt** (web).

```
Web user clicks "Connect Telegram"
  │
  ▼
POST /api/profile/generate-link-token
  └─ Returns a short-lived link token (stored in DB or signed)
  │
  ▼
Browser opens Telegram deep link:
  {BOT_URL}?startapp=link_{token}
  │
  ▼
Telegram Mini App opens with start_param = "link_{token}"
  │
  ▼
tg/page.tsx detects "link_" prefix
  │
  ▼
POST /api/profile/link-telegram  { initData, linkToken }
  │  Server:
  │  1. HMAC-verify initData
  │  2. Validate linkToken → extract webUserId
  │  3. Look for stub account with this telegram_id
  │     ├─ Stub found, 0 themes → delete stub, stamp telegram_id on webUser
  │     ├─ Stub found, N themes → merge:
  │     │    UPDATE themes SET user_id = webUserId WHERE user_id = stubId
  │     │    upsert bookmarked_cards (ignore duplicates)
  │     │    DELETE stub from auth
  │     │    check overLimit (post-merge theme count vs plan.max_themes)
  │     │    stamp telegram_id on webUser
  │     └─ No stub → stamp telegram_id directly
  │
  ▼
Returns { sessionToken, overLimit }
  │
  ▼
tg/page.tsx calls signIn('telegram', { sessionToken })
  └─ Redirects to /settings or /settings?overLimit=1
```

---

## 6. Telegram → Web Upgrade / Merge

Triggered from **Settings card → Set Up Web Access** (shown only to stub users) or **Login page hint**.

### Path A — New email (in-place upgrade)

```
Stub user enters email + password on /tg/upgrade
  │
  ▼
POST /api/profile/upgrade-stub  { initData, email, password }
  │  Server:
  │  1. HMAC-verify initData → stubUserId
  │  2. supabaseAdmin.auth.admin.updateUserById(stubId, { email, password })
  │     → Success (email was new)
  │  3. Returns { success: true }
  │
  ▼
/tg/upgrade shows "Check your email" screen
  └─ User verifies email, then logs in normally at /login
```

### Path B — Email already registered (account merge)

```
POST /api/profile/upgrade-stub  { initData, email, password }
  │  Server:
  │  1. HMAC-verify initData → stubUserId
  │  2. updateUserById fails with "already exists"
  │  3. supabase.auth.signInWithPassword({ email, password })
  │     ├─ Wrong password → 400 "That email is already registered. Check your password."
  │     └─ Correct password → webUserId extracted
  │  4. Merge stub → webUser:
  │       UPDATE themes SET user_id = webUserId WHERE user_id = stubId
  │       upsert bookmarked_cards
  │       stamp telegram_id on webUser (public.profiles)
  │       DELETE stub from supabase auth
  │  5. Check overLimit
  │  6. Issue sessionToken for webUserId
  │  7. Returns { sessionToken, overLimit }
  │
  ▼
/tg/upgrade calls signIn('telegram', { sessionToken })
  └─ Shows "Accounts merged!" screen (with amber warning if overLimit)
```

---

## 7. Over-Limit Handling

Both merge paths (Web→Tg and Tg→Web) perform an **over-limit check** after merging themes:

```ts
const plan = await SubscriptionService.getUserPlan(userId);
const { count } = await supabase
  .from('themes')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId);
const overLimit = (count ?? 0) > (plan.max_themes ?? Infinity);
```

**When `overLimit = true`:**

| Path                            | User experience                                      |
| ------------------------------- | ---------------------------------------------------- |
| Web→Tg merge via `tg/page.tsx`  | Redirect to `/settings?overLimit=1`                  |
| Tg→Web merge via `/tg/upgrade`  | `merged` screen shows amber warning                  |
| Settings page on `?overLimit=1` | `toast.warning()` shown once, param removed from URL |

Users **can still study** all existing themes; they just cannot **create new ones** until they upgrade or delete themes.

---

## 8. One-Time Telegram Connect Prompt

After a web login, users are shown a **one-time modal** suggesting they connect Telegram.

**Conditions to show:**

- `status === 'authenticated'`
- `NEXT_PUBLIC_TELEGRAM_BOT_URL` is set
- Not currently inside Telegram Mini App (`isTelegramWebApp() === false`)
- `localStorage.getItem('tg_prompt_shown_{userId}')` is falsy
- Profile API reports `telegram_id === null`

**Component:** `src/components/providers/telegram-connect-prompt.tsx`  
**Mounted in:** `src/components/root-providers.tsx` (inside `ThemeProvider`)

**On "Connect Telegram":**  
Generates a link token → opens Telegram deep link in new tab → sets localStorage flag → never shows again.

**On "Maybe later":**  
Sets localStorage flag → never shows again on this device/browser for this account.

---

## 9. Session & Middleware

### Token chain

```
Supabase Auth session (internal, server-side only)
  └─ NOT stored client-side

NextAuth JWT cookie (30-day, HttpOnly)
  └─ { userId, displayName, isAdmin }

Short-lived session token (2-min)
  └─ Used only during Telegram→NextAuth handoff
```

### Middleware protection

`middleware.ts` runs on every request. Public routes bypass auth check:

**Public page routes:**

- `/`, `/login`, `/register`, `/privacy`, `/terms`, `/tg`, `/tg/upgrade`, `/auth/callback`

**Public API routes:**

- `/api/auth/**`
- `/api/auth/telegram`
- `/api/profile/upgrade-stub`
- `/api/profile/link-web`

All other routes require a valid NextAuth JWT. Unauthenticated requests to non-public routes redirect to `/tg?callbackUrl=...` (intentional — most users come from Telegram).

---

## 10. Potential Attack Vectors

### 10.1 Session token replay

**Risk:** A stolen 2-minute session token could log in as another user.  
**Mitigation:** 2-minute expiry, HMAC-signed with `SESSION_SECRET`. Tokens are transmitted over HTTPS only.  
**Recommendation:** Consider one-time-use tokens (mark as consumed in DB after first use).

### 10.2 Telegram initData forgery

**Risk:** Attacker crafts fake `initData` to impersonate a Telegram user.  
**Mitigation:** Full HMAC-SHA256 verification against `BOT_TOKEN`. Standard Telegram security model.  
**Risk level:** Low — requires knowledge of the bot token.

### 10.3 Link token interception

**Risk:** Attacker intercepts a `link_` deep link and arrives in the Mini App before the legitimate user.  
**Mitigation:** Tokens are short-lived. The legitimate user opens the link in Telegram, which is a trusted channel.  
**Recommendation:** Add server-side token expiry (e.g., 5 minutes) if not already enforced.

### 10.4 Stub account enumeration

**Risk:** Attacker enumerates stub emails (`telegram_{id}@noreply.clario.app`) to check which Telegram IDs have accounts.  
**Mitigation:** Stubs are not publicly discoverable; `/api/profile/upgrade-stub` authenticates via `initData` HMAC.  
**Risk level:** Low.

### 10.5 Merge without consent

**Risk:** Malicious Mini App could trigger account merge without user awareness.  
**Mitigation:** Web→Tg linking requires the user to explicitly click "Connect Telegram" and open the bot. Tg→Web merge requires the user to enter their web password.

---

## 11. Known Limitations & Recommendations

| #   | Issue                                                                                                           | Recommendation                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | `overLimit` uses a simple count check at merge time; users can delete themes to fix, but there's no guided flow | Add a theme management prompt after merge                                           |
| 2   | Login hint "Started on Telegram?" only shows if `NEXT_PUBLIC_TELEGRAM_BOT_URL` is set                           | Ensure env var is set in all deployments                                            |
| 3   | `TelegramConnectPrompt` uses localStorage — won't persist across browsers/devices                               | Acceptable for UX; alternatively, store "shown" flag in `public.profiles`           |
| 4   | Session tokens have no server-side invalidation (pure JWT)                                                      | Acceptable for 30-day sessions; consider refresh token rotation for higher security |
| 5   | Stub email pattern `telegram_{id}@noreply.clario.app` is predictable                                            | Low risk given HMAC auth; acceptable                                                |
| 6   | `POST /api/auth/register` sends email confirmation but there's no "resend" UI                                   | Add resend confirmation email button on login page                                  |
| 7   | No rate limiting on `/api/profile/upgrade-stub`                                                                 | Add rate limiting (e.g., 5 attempts / 15 min per IP)                                |
