# Telegram Stars Monetization Analysis

## Stars → Revenue → Profit: Complete Model

### Revenue per paying subscriber (Stars × $0.013)

| Plan  | Price    | Monthly revenue |
| ----- | -------- | --------------- |
| basic | 200 ⭐   | **$2.60**       |
| pro   | 500 ⭐   | **$6.50**       |
| max   | 1,000 ⭐ | **$13.00**      |

---

### LLM cost per user (qwen3.5-flash: $0.1/1M input · $0.4/1M output)

Assumptions: 10-card batch generation, ~700 input tokens + ~3,000 output tokens per generation.

- Cost per 10-card generation: $0.00007 (input) + $0.0012 (output) ≈ **$0.00127**

| Plan  | Cards/month | Generations | LLM cost/user |
| ----- | ----------- | ----------- | ------------- |
| free  | 50          | 5           | **$0.006**    |
| basic | 300         | 30          | **$0.038**    |
| pro   | 2,000       | 200         | **$0.25**     |
| max   | 5,000       | 500         | **$0.64**     |

> Output tokens dominate (96% of cost). Prompt caching (already implemented) reduces input cost ~65%, but overall savings are only ~2–3%.

---

### Gross margin per paying subscriber

| Plan  | Revenue | LLM cost | Net margin         |
| ----- | ------- | -------- | ------------------ |
| basic | $2.60   | $0.038   | **$2.56 (98.5%)**  |
| pro   | $6.50   | $0.25    | **$6.25 (96.1%)**  |
| max   | $13.00  | $0.64    | **$12.36 (95.1%)** |

LLM is essentially free at this pricing. The bottleneck is fixed infra.

---

### Break-even on infrastructure (~$45/month: Vercel Pro + Supabase Pro)

| Subscriber mix                                | Break-even          |
| --------------------------------------------- | ------------------- |
| All basic                                     | 18 subscribers      |
| All pro                                       | 8 subscribers       |
| **Realistic (70% basic / 20% pro / 10% max)** | **~11 subscribers** |

---

### Profit at scale (70% basic / 20% pro / 10% max mix)

| Paying subs | Revenue | LLM cost | Infra  | **Net profit/mo**            |
| ----------- | ------- | -------- | ------ | ---------------------------- |
| 10          | $44.20  | $1.41    | $45    | **−$2.21** (near break-even) |
| 15          | $71.50  | $2.41    | $45    | **+$24**                     |
| 50          | $221    | $7.05    | $45    | **+$169**                    |
| 100         | $442    | $14.09   | $45    | **+$383/mo** (~$4,600/yr)    |
| 500         | $2,210  | $70.45   | ~$80\* | **+$2,060/mo** (~$24,700/yr) |

\*Infra scales moderately at 500+ users.

---

### Free tier LLM drain

1,000 free active users → ~$6.40/month in LLM costs. Negligible compared to infra.  
Free users are essentially free to serve from an LLM perspective.

---

### Key takeaways

1. **You need just ~11 paying subscribers to cover all infra costs** — extremely low bar.
2. **LLM margins are exceptional** (95–98.5%). Economics scale linearly with subscribers from there.
3. **The real cost risk is infra scaling**, not LLM. Watch Supabase egress/storage and Vercel function invocations.
4. **Stars withdrawal lag (21 days)** means cash flow lags revenue — plan for ~1 month working capital.
5. Upgrading even a few free users to basic ($2.60/mo each) quickly adds meaningful profit at small scale.

---

### Stars withdrawal process (Fragment.com)

- Withdraw via [fragment.com](https://fragment.com) → TON wallet → exchange → fiat
- Manual process only — no API for withdrawal automation
- Monitor balance with `getStarTransactions` Bot API method for automated alerts
- Rate: **$0.013 USD per Star** (cash reward after Fragment's cut)
- Stars available ~21 days after receipt
