-- ============================================================
-- IDX Stock Screener - Initial Schema
-- Target: Supabase (PostgreSQL)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- STOCKS: Master data emiten
-- ============================================================
CREATE TABLE IF NOT EXISTS stocks (
  code        VARCHAR(10)  PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  sector      VARCHAR(100),
  subsector   VARCHAR(100),
  market_cap  BIGINT       DEFAULT 0,  -- dalam IDR
  listed_shares BIGINT     DEFAULT 0,
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_stocks_active ON stocks(is_active);
CREATE INDEX idx_stocks_market_cap ON stocks(market_cap DESC);

-- ============================================================
-- DAILY_PRICES: OHLCV harian
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_prices (
  id          BIGSERIAL    PRIMARY KEY,
  stock_code  VARCHAR(10)  NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
  date        DATE         NOT NULL,
  open        NUMERIC(14,2) NOT NULL,
  high        NUMERIC(14,2) NOT NULL,
  low         NUMERIC(14,2) NOT NULL,
  close       NUMERIC(14,2) NOT NULL,
  volume      BIGINT        NOT NULL DEFAULT 0,  -- dalam lot
  value       BIGINT        NOT NULL DEFAULT 0,  -- dalam IDR
  frequency   INTEGER       DEFAULT 0,           -- jumlah transaksi
  CONSTRAINT uq_daily_prices UNIQUE (stock_code, date)
);

CREATE INDEX idx_daily_prices_stock_date ON daily_prices(stock_code, date DESC);
CREATE INDEX idx_daily_prices_date ON daily_prices(date DESC);
CREATE INDEX idx_daily_prices_value ON daily_prices(value DESC);

-- ============================================================
-- BROKER_TRANSACTIONS: Data transaksi per broker harian
-- ============================================================
CREATE TABLE IF NOT EXISTS broker_transactions (
  id           BIGSERIAL    PRIMARY KEY,
  stock_code   VARCHAR(10)  NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
  date         DATE         NOT NULL,
  broker_code  VARCHAR(10)  NOT NULL,
  buy_lot      BIGINT       NOT NULL DEFAULT 0,
  buy_value    BIGINT       NOT NULL DEFAULT 0,  -- dalam IDR
  sell_lot     BIGINT       NOT NULL DEFAULT 0,
  sell_value   BIGINT       NOT NULL DEFAULT 0,  -- dalam IDR
  net_lot      BIGINT       GENERATED ALWAYS AS (buy_lot - sell_lot) STORED,
  net_value    BIGINT       GENERATED ALWAYS AS (buy_value - sell_value) STORED,
  CONSTRAINT uq_broker_tx UNIQUE (stock_code, date, broker_code)
);

CREATE INDEX idx_broker_tx_stock_date ON broker_transactions(stock_code, date DESC);
CREATE INDEX idx_broker_tx_broker_date ON broker_transactions(broker_code, date DESC);
CREATE INDEX idx_broker_tx_net_value ON broker_transactions(net_value DESC);

-- ============================================================
-- SCREENING_RESULTS: Hasil screening EOD
-- ============================================================
CREATE TABLE IF NOT EXISTS screening_results (
  id                      BIGSERIAL     PRIMARY KEY,
  screening_date          DATE          NOT NULL,
  stock_code              VARCHAR(10)   NOT NULL REFERENCES stocks(code),
  stock_name              VARCHAR(255),

  -- Harga
  close_price             NUMERIC(14,2),
  prev_close              NUMERIC(14,2),
  change_pct              NUMERIC(6,2),

  -- Anti-Gorengan Metrics
  avg_value_20d           BIGINT,        -- avg daily value 20 hari (IDR)
  market_cap              BIGINT,
  passed_antigorengan     BOOLEAN        DEFAULT FALSE,

  -- Bandarmology
  bandarmology_status     VARCHAR(50),   -- 'Big Accumulation' | 'Small Accumulation' | 'Neutral' | 'Distribution'
  net_value_top3_5d       BIGINT,
  net_value_top5_5d       BIGINT,
  net_value_top3_10d      BIGINT,
  net_value_top5_10d      BIGINT,
  net_value_top3_20d      BIGINT,
  net_value_top5_20d      BIGINT,
  top_buyers              JSONB,         -- [{broker, net_value, net_lot}]
  top_sellers             JSONB,
  retail_panic_selling    BOOLEAN        DEFAULT FALSE,

  -- Volume Analysis
  volume_today            BIGINT,
  vma_20                  BIGINT,        -- volume moving average 20 hari
  volume_ratio            NUMERIC(6,2),  -- volume_today / vma_20
  volume_spike            BOOLEAN        DEFAULT FALSE,

  -- Technical Indicators
  ma20                    NUMERIC(14,2),
  ma50                    NUMERIC(14,2),
  rsi_14                  NUMERIC(6,2),
  macd_line               NUMERIC(14,4),
  macd_signal             NUMERIC(14,4),
  macd_histogram          NUMERIC(14,4),
  technical_position      VARCHAR(80),   -- 'Above MA20', 'Rebound Support', dsb
  macd_golden_cross       BOOLEAN        DEFAULT FALSE,

  -- Trading Plan
  support_level           NUMERIC(14,2),
  resistance_level        NUMERIC(14,2),
  entry_price             NUMERIC(14,2),
  cut_loss_price          NUMERIC(14,2),
  take_profit_price       NUMERIC(14,2),
  risk_reward_ratio       NUMERIC(6,2),

  -- Meta
  signal_strength         INTEGER        DEFAULT 0,  -- 0-100 composite score
  created_at              TIMESTAMPTZ    DEFAULT NOW(),

  CONSTRAINT uq_screening_result UNIQUE (screening_date, stock_code)
);

CREATE INDEX idx_screening_date ON screening_results(screening_date DESC);
CREATE INDEX idx_screening_status ON screening_results(bandarmology_status);
CREATE INDEX idx_screening_signal ON screening_results(signal_strength DESC);
CREATE INDEX idx_screening_rr ON screening_results(risk_reward_ratio DESC);

-- ============================================================
-- BROKER_PROFILES: Klasifikasi broker
-- ============================================================
CREATE TABLE IF NOT EXISTS broker_profiles (
  broker_code   VARCHAR(10)  PRIMARY KEY,
  broker_name   VARCHAR(255) NOT NULL,
  broker_type   VARCHAR(50)  NOT NULL,  -- 'FOREIGN' | 'DOMESTIC_INST' | 'DOMESTIC_RETAIL'
  is_retail     BOOLEAN      DEFAULT FALSE,
  is_foreign    BOOLEAN      DEFAULT FALSE
);

-- Seed data broker klasifikasi
INSERT INTO broker_profiles (broker_code, broker_name, broker_type, is_retail, is_foreign) VALUES
  ('YP', 'Indo Premier Sekuritas',         'DOMESTIC_RETAIL', TRUE,  FALSE),
  ('CC', 'Mandiri Sekuritas',              'DOMESTIC_RETAIL', TRUE,  FALSE),
  ('XL', 'Mirae Asset Sekuritas',          'DOMESTIC_RETAIL', TRUE,  FALSE),
  ('NI', 'BNI Sekuritas',                  'DOMESTIC_RETAIL', TRUE,  FALSE),
  ('OD', 'Trimegah Sekuritas',             'DOMESTIC_RETAIL', TRUE,  FALSE),
  ('HP', 'MNC Sekuritas',                  'DOMESTIC_RETAIL', TRUE,  FALSE),
  ('KK', 'Phillip Sekuritas',              'DOMESTIC_RETAIL', TRUE,  FALSE),
  ('RX', 'Sucor Sekuritas',               'DOMESTIC_RETAIL', TRUE,  FALSE),
  ('BK', 'JPMorgan Securities',            'FOREIGN',         FALSE, TRUE),
  ('DB', 'Deutsche Securities',            'FOREIGN',         FALSE, TRUE),
  ('CS', 'Credit Suisse Securities',       'FOREIGN',         FALSE, TRUE),
  ('MS', 'Morgan Stanley Sekuritas',       'FOREIGN',         FALSE, TRUE),
  ('AK', 'UBS Securities',                 'FOREIGN',         FALSE, TRUE),
  ('ZP', 'Kim Eng Securities',             'FOREIGN',         FALSE, TRUE),
  ('CLSA', 'CLSA Sekuritas',              'FOREIGN',         FALSE, TRUE)
ON CONFLICT (broker_code) DO NOTHING;

-- ============================================================
-- RLS Policies (Supabase)
-- ============================================================
ALTER TABLE stocks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_prices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_profiles     ENABLE ROW LEVEL SECURITY;

-- Allow public read on semua tabel (screener adalah public read-only)
CREATE POLICY "Allow public read" ON stocks              FOR SELECT USING (TRUE);
CREATE POLICY "Allow public read" ON daily_prices        FOR SELECT USING (TRUE);
CREATE POLICY "Allow public read" ON broker_transactions FOR SELECT USING (TRUE);
CREATE POLICY "Allow public read" ON screening_results   FOR SELECT USING (TRUE);
CREATE POLICY "Allow public read" ON broker_profiles     FOR SELECT USING (TRUE);

-- Service role (backend) dapat write
CREATE POLICY "Allow service write" ON stocks              FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service write" ON daily_prices        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service write" ON broker_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service write" ON screening_results   FOR ALL USING (auth.role() = 'service_role');
