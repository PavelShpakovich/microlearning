-- 0013: Revise plan limits, rename tiers, add theme limits
-- Free: 20→50  |  Basic→Starter: 200→300  |  Pro: 1000→2000  |  Unlimited→Max: 5000 (unchanged)
-- Theme limits: Free=5, Starter=20, Pro=unlimited, Max=unlimited

-- ── Card limits & renames ──────────────────────────────────────────────────
UPDATE subscription_plans SET
  cards_per_month = 50,
  features = '{"features": ["50 cards per month", "Up to 5 themes"]}'
WHERE id = 'free';

UPDATE subscription_plans SET
  name = 'Starter',
  description = 'For growing learners',
  cards_per_month = 300,
  features = '{"features": ["300 cards per month", "Up to 20 themes"]}'
WHERE id = 'basic';

UPDATE subscription_plans SET
  cards_per_month = 2000,
  features = '{"features": ["2,000 cards per month", "Unlimited themes"]}'
WHERE id = 'pro';

UPDATE subscription_plans SET
  name = 'Max',
  description = 'For power learners',
  features = '{"features": ["5,000 cards per month", "Unlimited themes"]}'
WHERE id = 'unlimited';

-- ── Theme limits column ───────────────────────────────────────────────────
-- NULL means unlimited
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_themes INTEGER DEFAULT NULL;

UPDATE subscription_plans SET max_themes = 5  WHERE id = 'free';
UPDATE subscription_plans SET max_themes = 20 WHERE id = 'basic';
-- pro and unlimited remain NULL (unlimited themes)

-- ── Community themes access ──────────────────────────────────────────────
-- false = community tab is locked for that plan
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS community_themes BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE subscription_plans SET community_themes = FALSE WHERE id = 'free';
UPDATE subscription_plans SET community_themes = TRUE  WHERE id = 'basic';
UPDATE subscription_plans SET community_themes = TRUE  WHERE id = 'pro';
UPDATE subscription_plans SET community_themes = TRUE  WHERE id = 'unlimited';
