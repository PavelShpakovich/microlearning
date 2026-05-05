# Credit System & Pricing Plan

> Last updated: 2026-05-05

## Credit Costs per Product

| Product                | Credits | LLM tokens (in/out) | Cost (qwen3.5-flash) | Cost (qwen-plus) |
| ---------------------- | ------- | ------------------- | -------------------- | ---------------- |
| Extended natal report  | 3       | ~3K / ~6K           | $0.0017              | $0.0020          |
| Compatibility report   | 4       | ~4K / ~6K           | $0.0018              | $0.0021          |
| Forecast               | 1       | ~2K / ~1.5K         | $0.0005              | $0.0006          |
| Follow-up pack (5 msg) | 2       | ~2K / ~1K per msg   | $0.0015              | $0.0025          |

## Credit Packs

| Pack     | Credits | Price (USD) | Per credit | Use case                                          |
| -------- | ------- | ----------- | ---------- | ------------------------------------------------- |
| Starter  | 5       | $0.99       | $0.20      | 1 natal + follow-up OR 1 compatibility + forecast |
| Standard | 12      | $2.99       | $0.25      | 2 natal + compatibility + 2 forecast              |
| Premium  | 25      | $5.99       | $0.24      | ~6 natal + 2 compatibility + forecasts            |

## Revenue After Apple Cut

| Pack     | Price | Apple 30% cut | Net (30%) | Apple 15% (SBP) | Net (15%) |
| -------- | ----- | ------------- | --------- | --------------- | --------- |
| Starter  | $0.99 | $0.30         | $0.69     | $0.15           | $0.84     |
| Standard | $2.99 | $0.90         | $2.09     | $0.45           | $2.54     |
| Premium  | $5.99 | $1.80         | $4.19     | $0.90           | $5.09     |

## LLM Pricing (verified May 2026)

### qwen3.5-flash (current)

- Input: ¥0.2/M tokens (~$0.027/M)
- Output: ¥2/M tokens (~$0.274/M)

### qwen-plus (stronger alternative)

- Input: ¥0.8/M tokens (~$0.110/M)
- Output (non-thinking): ¥2/M tokens (~$0.274/M)
- Output (thinking): ¥8/M tokens (~$1.10/M)

Source: https://help.aliyun.com/zh/model-studio/billing-for-model-studio

## Infrastructure Costs

| Service         | Free tier        | Paid tier         |
| --------------- | ---------------- | ----------------- |
| Supabase        | <500MB, <50K MAU | $25/mo            |
| Vercel          | Hobby            | $20/mo            |
| Resend          | <3K emails/mo    | $20/mo            |
| Apple Developer | —                | $99/yr ($8.25/mo) |
| Domain          | —                | ~$1/mo            |

## Scaling Model

Assumptions:

- Pack distribution: 60% Starter, 30% Standard, 10% Premium
- Free→paid conversion: ~5%
- Average 1 purchase/month per paying user
- Average revenue per buyer: $1.79 gross → $1.52 net (SBP)

### P&L by MAU (Apple 15% — Small Business Program)

| Metric            | 100 MAU    | 500 MAU    | 2,000 MAU  | 10,000 MAU  |
| ----------------- | ---------- | ---------- | ---------- | ----------- |
| Paying users (5%) | 5          | 25         | 100        | 500         |
| Gross revenue     | $7.60      | $38.00     | $152.00    | $760.00     |
| Apple cut (15%)   | −$1.14     | −$5.70     | −$22.80    | −$114.00    |
| LLM cost (flash)  | −$0.02     | −$0.11     | −$0.43     | −$2.17      |
| Infrastructure    | −$9.25     | −$9.25     | −$54.25    | −$74.25     |
| **Net profit**    | **−$2.81** | **$22.94** | **$74.52** | **$569.58** |
| **Margin**        | −37%       | 60%        | 49%        | 75%         |

### P&L by MAU (Apple 30%)

| Metric         | 100 MAU    | 500 MAU    | 2,000 MAU  | 10,000 MAU  |
| -------------- | ---------- | ---------- | ---------- | ----------- |
| Net revenue    | $6.32      | $26.60     | $106.40    | $532.00     |
| LLM cost       | −$0.02     | −$0.11     | −$0.43     | −$2.17      |
| Infrastructure | −$9.25     | −$9.25     | −$54.25    | −$74.25     |
| **Net profit** | **−$2.95** | **$17.24** | **$51.72** | **$455.58** |
| **Margin**     | −47%       | 45%        | 34%        | 60%         |

### LLM Model Comparison at Scale (10K MAU, 500 buyers)

| Model         | LLM cost/mo | % of revenue | Margin impact |
| ------------- | ----------- | ------------ | ------------- |
| qwen3.5-flash | $2.17       | 0.29%        | Negligible    |
| qwen-plus     | $2.95       | 0.39%        | Negligible    |

## Break-even

| Apple rate | Break-even MAU | Break-even buyers/mo |
| ---------- | -------------- | -------------------- |
| 15% (SBP)  | ~150           | ~8                   |
| 30%        | ~180           | ~9                   |

## Key Takeaways

1. **LLM cost is negligible** — even at 10K users it's <$3/mo. Use stronger model if quality improves.
2. **Infrastructure is fixed** — $54-74/mo after scaling past free tiers.
3. **Apple cut is the largest cost** (15-30% of all revenue).
4. **Break-even at ~150 MAU** (~8 paying users/month).
5. **At 2K+ MAU** margin stabilizes at 49-75%.
