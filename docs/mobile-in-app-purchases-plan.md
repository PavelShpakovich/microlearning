# Mobile In-App Purchases Plan

> Last updated: 2026-05-06
>
> Scope: sell credit packs in the iOS App Store and Google Play, while keeping Clario Astrology credits as a server-side ledger.

## Goal

Add native in-app purchases for credit packs in the mobile app:

- Apple App Store on iOS
- Google Play Billing on Android

The purchase itself must be handled by the platform store, while credit granting must remain controlled by the backend.

## Current Project State

The repository already has the main pieces needed for this integration:

### Mobile

- Store screen already exists in [apps/mobile/src/app/store.tsx](/Users/Pavel_Shpakovich/Desktop/clario/apps/mobile/src/app/store.tsx)
- Credit balance and pricing are already shown in mobile via `creditsApi`
- Insufficient-credit flows already redirect users to the store
- Credit-spend confirmation is already implemented in generation flows

### API client

- Credit APIs already exist in [packages/api-client/src/credits-api.ts](/Users/Pavel_Shpakovich/Desktop/clario/packages/api-client/src/credits-api.ts)
- Current methods already support:
  - balance
  - pricing
  - packs
  - store snapshot/history

### Backend

- Credit pricing routes already exist:
  - [apps/web/src/app/api/credits/pricing/route.ts](/Users/Pavel_Shpakovich/Desktop/clario/apps/web/src/app/api/credits/pricing/route.ts)
  - [apps/web/src/app/api/credits/packs/route.ts](/Users/Pavel_Shpakovich/Desktop/clario/apps/web/src/app/api/credits/packs/route.ts)
- Credit ledger/business logic already exists in [apps/web/src/lib/credits/service.ts](/Users/Pavel_Shpakovich/Desktop/clario/apps/web/src/lib/credits/service.ts)

### Product/pricing

- Credit pack definitions and pricing assumptions are documented in [docs/credit-pricing-plan.md](/Users/Pavel_Shpakovich/Desktop/clario/docs/credit-pricing-plan.md)

## Recommended Architecture

Recommended approach:

- Use RevenueCat as the billing abstraction layer for iOS and Android
- Keep Clario Astrology credits on the backend as the source of truth
- Grant credits only after server-side purchase validation / webhook processing

### Why this approach

This project already has a custom credit economy. The missing part is not the credit system itself, but a safe purchase bridge between platform stores and the server.

RevenueCat reduces complexity in:

- StoreKit / Play Billing differences
- receipt normalization
- sandbox vs production handling
- restore purchase flows
- webhook delivery
- purchase state edge cases

## Source of Truth

Use the following ownership model:

### Money / purchase source of truth

- App Store / Google Play
- normalized via RevenueCat

### Credits / usage source of truth

- backend credit ledger
- backend transaction history

### Important rule

Never grant credits directly from the mobile client after a purchase callback.

The client can only:

- initiate purchase
- request reconciliation
- refresh balance/history

The server must:

- validate purchase identity
- deduplicate transaction processing
- grant credits
- record ledger history

## Product Model

Existing packs:

- Starter
- Standard
- Premium

Recommended internal mapping:

| Internal pack key | Credits | Apple product id                | Google product id               |
| ----------------- | ------: | ------------------------------- | ------------------------------- |
| `starter`         |       5 | `by.tryclario.credits.starter`  | `by.tryclario.credits.starter`  |
| `standard`        |      12 | `by.tryclario.credits.standard` | `by.tryclario.credits.standard` |
| `premium`         |      25 | `by.tryclario.credits.premium`  | `by.tryclario.credits.premium`  |

Notes:

- Use the same IDs on both platforms when possible
- Keep credits amount on the backend, not in the mobile UI
- Use store-returned localized prices in the app UI

## High-Level Flow

1. Mobile store screen loads current balance, pack metadata, pricing, and history from backend.
2. Mobile loads corresponding store products from RevenueCat.
3. User taps a pack.
4. Native purchase sheet opens.
5. RevenueCat receives purchase result.
6. RevenueCat sends webhook to backend.
7. Backend maps the purchased product to an internal credit pack.
8. Backend idempotently grants credits.
9. Mobile refreshes balance and history.

## Platform Setup

## Apple App Store

Create three In-App Purchases in App Store Connect as `Consumable` products:

- Starter credits
- Standard credits
- Premium credits

For each product:

- set product ID
- add localized title and description
- set price tier
- attach to app `by.tryclario.app`

Also prepare:

- sandbox test users
- reviewer notes explaining that credits unlock digital astrology content inside the app

### Apple-specific notes

- Credits must be consumables
- Digital content inside the app must use Apple IAP
- Do not link to external checkout for these credits in the iOS app

## Google Play

Create three one-time in-app products in Google Play Console:

- Starter credits
- Standard credits
- Premium credits

For each product:

- set product ID
- add title and description
- set price
- publish to internal testing first

Also configure:

- test accounts
- license testers

### Google-specific notes

- Treat credit packs as one-time in-app products
- Billing lifecycle and acknowledgment are easier if delegated through RevenueCat

## RevenueCat Setup

Create one RevenueCat project for the app and connect:

- iOS app
- Android app

Configure:

- App Store Connect API key
- Google Play service account
- product import / mapping
- webhook delivery to backend

### Identity strategy

Use Supabase user ID as RevenueCat `appUserID`.

This allows webhooks to map purchases directly to users without client-side heuristics.

## Backend Changes

## 1. Add purchase persistence

Create a new table for processed store purchases.

Suggested table: `store_purchases`

Suggested fields:

- `id`
- `user_id`
- `provider` (`apple` | `google`)
- `external_transaction_id`
- `external_product_id`
- `pack_id`
- `credits_granted`
- `environment` (`sandbox` | `production`)
- `status` (`received` | `credited` | `refunded` | `revoked`)
- `purchased_at`
- `credited_at`
- `raw_payload` (`jsonb`)

Important constraint:

- unique index on `(provider, external_transaction_id)`

Optional supporting table:

- `store_purchase_events`

This is useful for support/debugging and replay-safe webhook handling.

## 2. Add product mapping source

Extend the current credit pack source so each pack includes store product IDs.

This should eventually be reflected in the backend pack payload returned by:

- [apps/web/src/app/api/credits/packs/route.ts](/Users/Pavel_Shpakovich/Desktop/clario/apps/web/src/app/api/credits/packs/route.ts)

Suggested extra fields in the pack payload:

- `appleProductId`
- `googleProductId`
- `storeProductId` for current platform if you want to pre-resolve it server-side

## 3. Add webhook route

Add a backend route, for example:

- `apps/web/src/app/api/billing/revenuecat/webhook/route.ts`

Responsibilities:

- verify webhook authenticity
- parse purchase event
- resolve internal user via RevenueCat `appUserID`
- map product ID to pack
- check if transaction already processed
- grant credits idempotently
- store raw event for support/debugging

## 4. Make credit grant idempotent

This is the most important backend rule.

Granting flow must be atomic:

1. insert purchase row if transaction not seen before
2. grant credits in current ledger/service
3. add a credit history row, e.g. reason `pack_purchase`
4. mark purchase as `credited`

If the same webhook arrives twice, credits must still be granted only once.

## 5. Add client-triggered reconcile route

Add a route like:

- `apps/web/src/app/api/billing/reconcile/route.ts`

Purpose:

- speed up UX after successful purchase
- recover when webhook arrives late
- restore state after reinstall/login

Suggested client payload:

- provider
- productId
- transactionId
- optional RevenueCat customer/app user metadata

Possible server behavior:

- if already credited: return success
- if pending: fetch/sync purchase state from RevenueCat API or queue reconciliation
- then return current status

## 6. Refund / revoke handling

Handle store refunds explicitly.

Recommended approach:

- store refund/revocation event
- create compensating credit ledger transaction
- use a dedicated reason like `store_refund_revoke`

Open product decision:

- if refunded credits were already spent, should balance go negative?

This must be decided before release.

## Mobile Changes

## 1. Add billing service

Add a new mobile service, for example:

- `apps/mobile/src/lib/billing.ts`

Responsibilities:

- initialize RevenueCat SDK
- login/logout purchase identity
- fetch store products
- purchase pack
- restore purchases
- trigger backend reconcile

## 2. Initialize billing in app bootstrap

Likely integration points:

- [apps/mobile/src/app/\_layout.tsx](/Users/Pavel_Shpakovich/Desktop/clario/apps/mobile/src/app/_layout.tsx)
- auth/session lifecycle near Supabase session handling

Behavior:

- initialize purchases SDK on app boot
- when session is available, login RevenueCat with Supabase user ID
- on sign-out, clear/reset purchase identity

## 3. Extend mobile store screen

Update [apps/mobile/src/app/store.tsx](/Users/Pavel_Shpakovich/Desktop/clario/apps/mobile/src/app/store.tsx).

The store screen should combine two data sources:

- backend credit/store state
- platform store product state

### Store screen should display

- backend-managed credit pack meaning and credits amount
- store-managed localized purchase price
- current balance from backend
- transaction history from backend

### Pack purchase flow

1. User taps a pack
2. Mobile starts native purchase flow
3. After success, mobile shows processing state
4. Mobile calls reconcile endpoint
5. Mobile refreshes:
   - balance
   - history
6. UI updates only after backend confirms credit grant

## 4. Add restore purchases action

Add a visible `Restore purchases` action on the store screen.

Flow:

1. SDK restore/sync
2. backend reconcile
3. refresh balance/history

Important:

- restore must not duplicate credit grants
- backend ledger remains source of truth

## 5. Extend API client

Update [packages/api-client/src/credits-api.ts](/Users/Pavel_Shpakovich/Desktop/clario/packages/api-client/src/credits-api.ts) or add a dedicated billing client.

Suggested new methods:

- `reconcileStorePurchase()`
- `restoreStorePurchases()`
- `getStoreCatalog()` if you decide to separate store purchase metadata from packs

## Database / Supabase Work

Add a new migration under [supabase/migrations](/Users/Pavel_Shpakovich/Desktop/clario/supabase/migrations).

Suggested scope:

- create `store_purchases`
- optional `store_purchase_events`
- indexes for user lookup and transaction deduplication
- optional enum definitions if desired

## Transaction History Integration

The store history UI already exists in [apps/mobile/src/app/store.tsx](/Users/Pavel_Shpakovich/Desktop/clario/apps/mobile/src/app/store.tsx).

Extend it so store purchases are clearly visible:

- pack name
- granted credits
- transaction date
- optional store source label (`App Store` / `Google Play`)

This will help:

- support
- auditability
- restore confidence for users

## Analytics and Support

Add observability for purchase flows:

- structured logs for webhook processing
- Sentry on failed purchase reconciliation
- admin lookup by transaction ID
- admin lookup by user ID

Support should be able to answer:

- did we receive the store purchase?
- was it credited?
- was it refunded/revoked?
- was the event duplicated?

## Open Decisions

These must be finalized before implementation starts:

1. Billing provider

- Recommended: RevenueCat
- Alternative: direct StoreKit + Play Billing implementation

2. Purchase identity

- Recommended: Supabase user ID as RevenueCat `appUserID`

3. Credit grant trigger

- Recommended: webhook plus reconcile endpoint

4. Refund policy

- Decide how to handle already-spent refunded credits

5. Web store coexistence

- Decide whether web and mobile can sell the same credits through different payment providers while sharing one backend ledger

## Delivery Plan

## Phase 1: Backend infrastructure

- add DB tables for store purchases
- add product-to-pack mapping
- add RevenueCat webhook route
- add idempotent credit grant logic
- add reconcile endpoint

## Phase 2: Store provider setup

- create App Store consumable products
- create Google Play one-time products
- configure RevenueCat apps/products/webhook
- configure sandbox/test users

## Phase 3: Mobile SDK integration

- add purchases SDK
- initialize it in app bootstrap
- bind purchase identity to logged-in user
- load store products on the store screen
- purchase packs from mobile store UI

## Phase 4: Reliability and recovery

- restore purchases flow
- delayed webhook/reconcile handling
- duplicate event safety
- refund/revoke support

## Phase 5: QA and release prep

- sandbox purchase testing on iOS
- internal testing track on Android
- support tooling
- analytics and monitoring
- store review readiness

## Test Checklist

## iOS sandbox

1. Buy Starter pack
2. Verify webhook received
3. Verify credits granted once
4. Verify history row appears
5. Repeat purchase and verify second unique grant
6. Reinstall app and verify balance persists via backend
7. Run restore and verify no duplicate grant

## Android internal testing

1. Buy Starter pack
2. Verify webhook received
3. Verify credits granted once
4. Verify history row appears
5. Test canceled purchase
6. Test delayed/pending purchase state
7. Verify restore/reconcile path

## Negative cases

1. Duplicate webhook
2. Unknown product ID
3. Client success before webhook delivery
4. Webhook before client refresh
5. Server failure between event receive and credit grant
6. Refund or revoke after credits already used

## File-Level Implementation Map

### Mobile

- [apps/mobile/src/app/store.tsx](/Users/Pavel_Shpakovich/Desktop/clario/apps/mobile/src/app/store.tsx)
- [apps/mobile/src/app/\_layout.tsx](/Users/Pavel_Shpakovich/Desktop/clario/apps/mobile/src/app/_layout.tsx)
- add `apps/mobile/src/lib/billing.ts`

### API client

- [packages/api-client/src/credits-api.ts](/Users/Pavel_Shpakovich/Desktop/clario/packages/api-client/src/credits-api.ts)

### Backend

- [apps/web/src/app/api/credits/packs/route.ts](/Users/Pavel_Shpakovich/Desktop/clario/apps/web/src/app/api/credits/packs/route.ts)
- [apps/web/src/lib/credits/service.ts](/Users/Pavel_Shpakovich/Desktop/clario/apps/web/src/lib/credits/service.ts)
- add `apps/web/src/app/api/billing/revenuecat/webhook/route.ts`
- add `apps/web/src/app/api/billing/reconcile/route.ts`

### Database

- [supabase/migrations](/Users/Pavel_Shpakovich/Desktop/clario/supabase/migrations)

## Final Recommendation

For this codebase, the safest and fastest production-grade path is:

- RevenueCat for purchase orchestration
- backend ledger as the only credit source of truth
- idempotent server-side grant on webhook/reconcile
- mobile client only for purchase initiation and refresh

This minimizes fraud risk, keeps credits consistent across devices, and fits the existing credit/store architecture with the least disruption.
