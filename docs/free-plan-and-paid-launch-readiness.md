# Free Plan Stability And Hidden Paid Launch Readiness

## Purpose

This document tracks what is still required to keep Clario stable in free mode today while also keeping paid subscriptions fully prepared, hidden behind feature flags, and ready to enable later with defined BYN pricing.

## Target Operating Mode

### Current production mode

- Free plan is fully usable.
- Telegram is companion-only, not a billing surface.
- Paid plan information stays hidden.
- WEBPAY code path exists but stays disabled.

Recommended flag values:

```env
NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS=false
NEXT_PUBLIC_ENABLE_WEBPAY=false
NEXT_PUBLIC_SHOW_PAID_INFO=false
```

### Future launch mode for paid subscriptions

- Paid plans become visible.
- Checkout starts via WEBPAY.
- WEBPAY webhook activates subscriptions.
- Prices are shown in BYN.

Target flag values when launch-ready:

```env
NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS=true
NEXT_PUBLIC_ENABLE_WEBPAY=true
NEXT_PUBLIC_SHOW_PAID_INFO=true
```

## What Is Already Implemented

- Telegram billing runtime has been removed.
- Billing data model is centered on `payment_transactions`, `subscription_plans`, and `user_subscriptions`.
- WEBPAY environment variables and helper layer exist.
- Checkout route creates pending payment transactions.
- WEBPAY webhook updates transactions and activates subscriptions.
- Paid UI is hidden behind feature flags.
- Landing/settings pages already support a hidden paid-prelaunch state.
- Admin paid surfaces are gated behind flags.
- Return URLs from WEBPAY already point back to the app.

## Remaining Work For Stable Free Mode

These items should be completed before treating the free-only product as operationally stable.

### 1. Confirm database state in the target environment

- Apply all migrations through `0026_remove_telegram_billing.sql`.
- Verify `subscription_plans` contains `free`, `basic`, `pro`, and `max`.
- Verify `payment_history`, `stars_price`, and Telegram billing columns are gone in the deployed database.
- Verify `currency` defaults to `BYN` and plan ordering is correct.

### 2. Lock free-only production configuration

- Keep all three billing flags disabled in production.
- Ensure WEBPAY secrets are either absent or present but unused while flags are off.
- Confirm no public page or metadata block leaks paid pricing when `NEXT_PUBLIC_SHOW_PAID_INFO=false`.

### 3. Run a free-plan smoke checklist before release

- Register/login with email.
- Link Telegram account.
- Create themes.
- Upload text, URL, PDF, and DOCX sources.
- Generate cards until usage limits are reached.
- Confirm limit messaging stays coherent when paid info is hidden.
- Study existing cards in web and Telegram companion flows.

### 4. Add minimal regression coverage around flags

Still missing from the current implementation:

- Tests that assert paid UI stays hidden when `NEXT_PUBLIC_SHOW_PAID_INFO=false`.
- Tests that assert `/api/subscription/checkout` rejects requests when billing is disabled.
- Tests that assert `/api/webhooks/webpay` rejects invalid signatures.
- Tests that assert plan status remains `free` when webhook is never called.

## Remaining Work Before Paid Can Be Enabled

These are the actual blockers for switching paid subscriptions on.

### 1. Finalize the real WEBPAY contract

Current state:

- The project has a working internal WEBPAY scaffolding layer.
- The exact request field names, signature format, and callback schema are still based on a generic interpretation.

Must do:

- Align `src/lib/billing/webpay.ts` with official WEBPAY sandbox or merchant documentation.
- Confirm the exact checkout endpoint path.
- Confirm the exact signed field set and signing algorithm.
- Confirm the exact callback header name and webhook signature verification rules.
- Confirm the exact success/cancel/fail redirect behavior.
- Confirm whether recurring billing requires a different initial checkout contract.

This is the main technical blocker for enabling paid subscriptions.

### 2. Configure all paid plan metadata in `subscription_plans`

The checkout route requires every paid plan to have all of the following:

- `price_minor`
- `currency`
- `webpay_product_id`
- `webpay_plan_id`
- `is_public=true`

Current state:

- `basic`, `pro`, and `max` still default to `price_minor=null` in the current migration layer.
- WEBPAY product and plan IDs still need to be filled with real merchant values.

### 3. Define final launch prices in BYN

Recommended launch prices to review and either accept or replace:

| Plan | Current usage limits | Recommended `price_minor` | Display price |
| ---- | -------------------- | -------------------------- | ------------- |
| free | 50 cards/month, 5 themes | `0` | 0 BYN |
| basic | 300 cards/month, 20 themes | `990` | 9.90 BYN |
| pro | 2000 cards/month, unlimited themes | `2490` | 24.90 BYN |
| max | 5000 cards/month, unlimited themes | `4990` | 49.90 BYN |

If these prices are approved, update `subscription_plans.price_minor` in the database and assign matching WEBPAY product/plan IDs.

### 4. Decide how renewals, cancellation, and resume work

Current state:

- Initial checkout exists.
- Webhook activation exists.
- Cancellation and resume endpoints intentionally return `not configured yet`.

Must do before paid launch:

- Implement actual WEBPAY cancellation behavior if recurring payments are supported.
- Implement resume behavior if recurring payments are pausable.
- If WEBPAY does not support this flow directly, remove or replace those actions in the UI before launch.

This is a launch blocker because the current UI exposes paid-plan management actions once flags are enabled.

### 5. Prove the full paid flow end-to-end in sandbox

Required acceptance test:

1. User opens plan page.
2. User starts checkout for `basic`, `pro`, or `max`.
3. Browser is redirected or POSTed to WEBPAY.
4. WEBPAY returns to the app.
5. WEBPAY webhook is received and verified.
6. `payment_transactions` is updated to `paid`.
7. `user_subscriptions` becomes active with the correct plan.
8. `/api/profile/subscription` reflects the new status without manual database fixes.

Also verify negative cases:

- cancelled payment
- failed payment
- duplicate webhook
- webhook before redirect
- redirect before webhook

### 6. Add launch-grade observability

Before enabling paid subscriptions, add or confirm:

- structured logs for checkout creation
- structured logs for webhook success/failure
- alerting for repeated webhook signature failures
- alerting for transactions stuck in `pending`
- a simple admin query or dashboard for pending/paid/failed WEBPAY transactions

### 7. Add operational documentation

Still needed for support/admin use:

- how to rotate WEBPAY credentials
- how to verify webhook delivery
- how to inspect `payment_transactions`
- how to manually recover a stuck subscription after a provider incident
- how to disable paid mode safely by toggling flags

## Launch Checklist

### Free-only stable release checklist

- Migrations applied in production.
- Billing flags all set to `false`.
- Free-plan smoke flows pass.
- No paid information visible on landing/settings/admin.
- Type-check, lint, and key tests pass.

### Paid-hidden-ready checklist

- Prices approved in BYN.
- `price_minor` filled for all paid plans.
- `webpay_product_id` filled for all paid plans.
- `webpay_plan_id` filled for all paid plans.
- Official WEBPAY contract mapped into code.
- Webhook signature confirmed against sandbox.
- Cancellation/resume either implemented or hidden.
- Sandbox checkout tested end-to-end.
- Support runbook written.

## Recommended Rollout Order

1. Keep production free-only and finish the free smoke/regression checklist.
2. Get official WEBPAY sandbox documentation and replace the generic contract in code.
3. Approve BYN pricing and fill paid plan metadata in `subscription_plans`.
4. Finish recurring payment lifecycle behavior or remove unsupported management actions.
5. Run full sandbox E2E validation.
6. Enable paid info internally first.
7. Enable checkout only after webhook and subscription activation are proven stable.

## Bottom Line

The app is already close to stable for a free-only release.

The paid subscription system is structurally prepared but not yet safe to enable publicly. The hard blockers are:

- official WEBPAY contract alignment
- real plan metadata and BYN pricing in the database
- cancellation/resume behavior decision
- sandbox end-to-end verification

Until those four items are complete, keep paid functionality hidden behind feature flags.