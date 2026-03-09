-- 0015: Add max_community_themes to subscription_plans
-- Store the limit of community themes each plan can access (0 = disabled)

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_community_themes INTEGER NOT NULL DEFAULT 0;

-- Set limits based on plan tier
-- free: 0 (no community themes)
-- basic: 5 community themes
-- pro: 10 community themes  
-- max: 50 community themes

UPDATE subscription_plans SET max_community_themes = 0 WHERE id = 'free';
UPDATE subscription_plans SET max_community_themes = 5 WHERE id = 'basic';
UPDATE subscription_plans SET max_community_themes = 10 WHERE id = 'pro';
UPDATE subscription_plans SET max_community_themes = 50 WHERE id = 'max';
UPDATE subscription_plans SET max_community_themes = 50 WHERE id = 'unlimited'; -- Handle old 'unlimited' plan ID if it exists
