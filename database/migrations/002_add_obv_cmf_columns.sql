-- Migration: Replace broker net-flow fields with OBV + CMF volume analysis
-- Run this in Supabase SQL Editor

-- Add CMF and OBV columns
ALTER TABLE screening_results
  ADD COLUMN IF NOT EXISTS cmf_20        NUMERIC(8,4),  -- Chaikin Money Flow 20-period (-1 to +1)
  ADD COLUMN IF NOT EXISTS obv_trend     VARCHAR(10),   -- 'rising' | 'falling' | 'neutral'
  ADD COLUMN IF NOT EXISTS obv_divergence BOOLEAN       DEFAULT FALSE;

-- Drop old broker-specific columns (no longer populated)
ALTER TABLE screening_results
  DROP COLUMN IF EXISTS net_value_top3_5d,
  DROP COLUMN IF EXISTS net_value_top5_5d,
  DROP COLUMN IF EXISTS net_value_top3_10d,
  DROP COLUMN IF EXISTS net_value_top5_10d,
  DROP COLUMN IF EXISTS net_value_top3_20d,
  DROP COLUMN IF EXISTS net_value_top5_20d,
  DROP COLUMN IF EXISTS top_buyers,
  DROP COLUMN IF EXISTS top_sellers;
