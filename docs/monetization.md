# Monetization Plan

## Role Of This Document

This file captures monetization research, legal constraints, payment processor analysis, and the implementation plan for Clario's revenue model. It is the decision record — not an engineering spec. Implementation details will live in code and migration files once work begins.

---

## Context

- **Entity**: ИП in Belarus, general tax regime (16%), active business bank account.
- **Target audience**: Russian-speaking users (Russia + CIS). Russian is the reference product language.
- **Product**: Web-first AI astrology workspace — charts, readings, compatibility reports, daily forecasts, follow-up chat.
- **Existing infrastructure**: Database tables for products, purchases, and entitlements already exist (migration 0036) but have no application code, no prices set, and no payment provider integration. Usage gating exists (3 charts/month, 5 saved charts) with a `hasPaidAccess` flag that is always `false`.

---

## Legal And Financial Constraints (Belarus)

### Entity Status

- ИП in Belarus is sufficient to sell digital services online. No need for ООО or foreign entity.
- No specific Belarusian prohibition on astrology services as a business category. If marketed with medical or psychological claims, consumer protection rules could apply — but Clario's trust model already avoids this.

### Tax

- Current regime: general (16% of net income).
- Alternative: УСН (simplified, 6% of revenue) if annual revenue stays below ~BYN 500,000. This is a significant saving worth discussing with an accountant before first revenue.
- HTP (Hi-Tech Park) residency offers near-zero taxes but requires a registered legal entity and expert board approval. An individual astrology service is unlikely to qualify as "high-tech." Not pursued.

### Sanctions

- Belarus is under targeted EU and US sanctions (not a comprehensive embargo like Cuba/Iran). Financial institutions treat Belarus as high-risk and often refuse services preemptively.
- EU sanctions explicitly ban providing IT consultancy and cloud services TO Belarus — but enforcement on SaaS platform usage by individuals is practically limited. Vercel and Supabase are not explicitly prohibited for Belarusian individuals.
- Mastercard cards from Belarusian banks are losing EU acceptance (April 2026). Cross-border card processing is increasingly restricted.
- These sanctions are the reason international payment processors are unavailable (see below).

---

## Payment Processor Analysis

### Unavailable Options

| Processor                                | Why Not                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stripe**                               | Belarus not in supported countries list. Stripe Atlas (US LLC) is blocked by KYC — banks refuse Belarusian nationals.                                  |
| **YooKassa / CloudPayments / Robokassa** | All require a Russian legal entity (ИП or ООО registered in Russia).                                                                                   |
| **PayPal**                               | Not available for Belarusian merchants.                                                                                                                |
| **US LLC via Stripe Atlas**              | Theoretically possible, practically blocked — US banks reject Belarusian beneficial owners during enhanced due diligence.                              |
| **Estonian e-Residency**                 | Applications accepted but Estonian banks (LHV, Swedbank) increasingly reject Belarusian nationals. Banking is the blocker, not the e-Residency itself. |
| **Georgian entity**                      | Viable but requires in-person travel for registration and bank account opening. Not an option without travel.                                          |

### Available Options

| Processor                         | Mir Support                                           | Visa/MC       | ИП Support                   | API Quality                                          | Fees      |
| --------------------------------- | ----------------------------------------------------- | ------------- | ---------------------------- | ---------------------------------------------------- | --------- |
| **WEBPAY (webpay.by)**            | ✅ Claimed (via Сбер Банк acquirer, MirAccept listed) | ✅            | ✅                           | Good (docs.webpay.by, REST API, recurring, webhooks) | ~1.5–2.8% |
| **bePaid (bepaid.by)**            | ❌ Not listed                                         | ✅ + UnionPay | ✅                           | Excellent (widget, S2S, SDKs, Postman collection)    | ~1.5–3.0% |
| **Assist Belarus (belassist.by)** | ❌ Not listed                                         | ✅            | Unclear (enterprise-focused) | Poor (no public docs)                                | Unknown   |

### Decision: WEBPAY As Primary Processor

**Mir card support is the deciding factor.** Most Russian users lost Visa/Mastercard access after 2022 sanctions. Without Mir, roughly 80% of the target audience cannot pay. WEBPAY is the only Belarusian processor claiming Mir support through its Сбер Банк (Belarus) acquirer partnership.

bePaid has a superior developer experience but cannot serve the core audience. It may be added later as a secondary processor for Visa/MC/БЕЛКАРТ users if conversion data justifies the complexity.

### Required Verification Before Implementation

Contact WEBPAY sales (+375 29 383 7172) and confirm:

1. Can Russian-issued Mir cardholders pay for a digital service through WEBPAY?
2. Which acquirer bank should the ИП use for Mir processing?
3. What are the exact fees for a digital-service ИП?
4. What is the settlement timeline (days to funds in account)?
5. Is sandbox/test environment available, and does it simulate Mir transactions?

**Do not begin implementation until these questions are answered.**

---

## Monetization Model: Credits

### Why Credits

Users buy credit packs and spend credits on AI-generated reports. This was chosen over alternatives:

- **vs. Subscriptions**: No recurring billing complexity, no churn management, simpler ИП accounting (each sale is a discrete transaction), no need for card-on-file infrastructure. Credits match the "pay for what you use" mental model.
- **vs. Pure one-time purchases**: Credits reduce payment friction — one purchase unlocks multiple reports. They increase perceived value and encourage users to explore different report types instead of buying one reading and leaving.

### Pricing Structure

Credit packs (prices are initial estimates for the Russian-speaking market — validate with audience):

| Pack     | Credits | Price (RUB) | Price (BYN) | Per-Credit |
| -------- | ------- | ----------- | ----------- | ---------- |
| Starter  | 3       | 299         | 9.90        | ~100₽      |
| Standard | 7       | 599         | 19.90       | ~86₽       |
| Premium  | 15      | 990         | 32.90       | ~66₽       |

Credit costs per report type:

| Report Type                       | Credits |
| --------------------------------- | ------- |
| Natal chart reading               | 2       |
| Compatibility report              | 3       |
| Monthly forecast pack             | 2       |
| Follow-up chat pack (10 messages) | 1       |

Market benchmarks: Western astrology apps charge $5–15/month (Co-Star, Nebula). Russian-speaking audience is price-sensitive — ~200–500₽ per reading is the expected range. The pricing above targets the lower end to maximize adoption.

### Free Tier

The free tier keeps the acquisition funnel open:

- Chart creation: up to 3 per month (existing limit).
- Basic chart data visible: planetary positions, houses, aspects — no AI narrative.
- Daily horoscope: preview (first paragraph only), full version requires credits.
- Follow-up chat: 1 free question per reading.

This means a user can explore the product, see their chart data, and understand what the paid readings contain — but AI-generated interpretations require credits.

---

## Existing Database Infrastructure

Migration 0036 already created the purchase foundation:

- **`report_products`** — 4 seeded products: `natal_report`, `compatibility_report`, `forecast_report`, `follow_up_pack`. Prices are `null`. Currency defaults to `BYN`.
- **`report_purchases`** — provider enum: `manual | admin | webpay`. Statuses: `pending | paid | failed | cancelled | refunded`.
- **`report_entitlements`** — statuses: `reserved | active | consumed | refunded | expired`. Links to readings via `entity_type` and `entity_id`.

The `webpay` provider value is already in the enum — this was planned from the start.

Additionally:

- **`usage_counters`** — existing monthly quota system (3 charts/month).
- **`access-utils.ts`** — `hasPaidAccess` flag exists but always returns `false`. Ready to wire up.
- **`usage-policy.ts`** — hardcoded limits. Will need to become dynamic based on credit balance.

---

## Implementation Plan

### Phase 1: Payment Processor Setup (Non-Code)

1. Contact WEBPAY, confirm Mir support for digital services.
2. Sign merchant agreement with WEBPAY (ИП documents, УНП).
3. Obtain sandbox/test credentials.
4. Choose acquirer bank (Сбер Банк for Mir, or МТБанк for general).

### Phase 2: Database Schema

5. Create `credit_packs` table — catalog of purchasable packs (credits count, price, currency, active flag).
6. Create `user_credits` table — balance per user.
7. Create `credit_transactions` table — audit ledger (user_id, amount, direction, reason, linked purchase/entitlement, timestamp).
8. Update `report_products` to store credit costs.
9. Seed credit packs and report product credit costs.

### Phase 3: Payment Integration (Depends On Phase 1 + 2)

10. WEBPAY service module: `src/lib/payments/webpay.ts` — init payment, verify callback, handle webhook signature.
11. `POST /api/payments/create` — authenticated, creates `report_purchases` record (status `pending`), calls WEBPAY to get redirect URL.
12. `POST /api/payments/webhook` — WEBPAY server-to-server callback, verifies signature, updates purchase status, credits user balance.
13. `GET /api/payments/status/[purchaseId]` — frontend polls payment status after redirect back.

### Phase 4: Credits Engine (Depends On Phase 2)

14. Credits service: `src/lib/credits.ts` — `getBalance()`, `deductCredits()`, `addCredits()`, all transactional with `credit_transactions` audit trail.
15. Wire `access-utils.ts` — `hasPaidAccess` checks credit balance; add `canGenerateReading(type)` to check if user has enough credits for a specific report type.
16. Gate reading/report generation behind credit check. Deduct on generation start, refund automatically on LLM failure.

### Phase 5: Purchase UI (Depends On Phase 3 + 4)

17. Credits store page (`/store`) — display packs with pricing, current balance, purchase history.
18. Credit balance indicator in header/navigation.
19. "Buy credits" interstitial when user attempts to generate a reading without sufficient credits.
20. Purchase history section in settings page.

### Phase 6: Admin And Monitoring

21. Admin ability to grant/revoke credits manually (uses existing `provider: 'admin'` enum value).
22. Credit transaction log in admin dashboard.
23. Basic revenue analytics in admin page.

### Verification Checklist

- [ ] Sandbox: complete purchase flow with WEBPAY test cards (Visa, Mastercard, Mir if available).
- [ ] Credit deduction: generate a reading → verify credits deducted → verify `credit_transactions` audit trail.
- [ ] Payment failure: simulate WEBPAY failure → verify no credits added, purchase marked `failed`.
- [ ] Webhook idempotency: replay duplicate webhook → verify no double-credit.
- [ ] Refund flow: admin refunds purchase → credits revoked, entitlements marked `refunded`.
- [ ] LLM failure: user starts generation, LLM errors → credits refunded automatically.
- [ ] Real Mir card test after going live with production credentials.

---

## Open Questions

1. **Tax regime**: Should ИП switch to УСН (6%) before first revenue? Requires accountant consultation.
2. **WEBPAY Mir confirmation**: Does Mir actually work for digital service payments? Awaiting sales call.
3. **Multi-currency pricing**: Should the store show RUB prices to Russian users and BYN to Belarusian users, or use a single currency? WEBPAY may handle conversion automatically.
4. **Credit expiration**: Should credits expire (e.g., 1 year)? Adds complexity but prevents long-tail liability. Recommend no expiration initially.
5. **Referral/promo codes**: Not in scope for initial launch but the credits model makes it trivial to add later (grant N free credits on code redemption).

---

## Supplementary Channels (Not In Initial Scope)

- **Boosty.to**: Russian Patreon alternative. Could list premium readings to tap into their existing audience. Loses UX control. Recommended only if direct payment conversion is low.
- **bePaid as second processor**: If WEBPAY API quality proves poor, add bePaid for Visa/MC users and keep WEBPAY only for Mir. Adds integration complexity.
- **Crypto (USDT)**: Liberal framework in Belarus (Decree No. 8), but audience adoption for casual purchases is low. Not pursued.
