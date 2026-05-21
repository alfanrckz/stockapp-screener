export type BandarmologyStatus =
  | 'Big Accumulation'
  | 'Small Accumulation'
  | 'Neutral'
  | 'Distribution';

export type TechnicalPosition =
  | 'Above MA20 & MA50'
  | 'Above MA20'
  | 'Above MA50'
  | 'Rebound from Support'
  | 'RSI Oversold Recovery'
  | 'MACD Golden Cross'
  | 'Below All MA';

export interface AntiGorenganResult {
  passed: boolean;
  avg_value_20d: number;
  market_cap: number;
  reject_reason?: string;
}

export interface BandarmologyResult {
  status: BandarmologyStatus;
  cmf_20: number;
  obv_trend: 'rising' | 'falling' | 'neutral';
  obv_divergence: boolean;
  volume_spike: boolean;
  volume_ratio: number;
  vma_20: number;
  retail_panic_selling: boolean;
}

export interface TechnicalResult {
  ma20: number;
  ma50: number;
  rsi_14: number;
  macd_line: number;
  macd_signal: number;
  macd_histogram: number;
  technical_position: TechnicalPosition;
  macd_golden_cross: boolean;
  support_level: number;
  resistance_level: number;
  passed: boolean;
}

export interface TradingPlanResult {
  entry_price: number;
  cut_loss_price: number;
  take_profit_price: number;
  risk_reward_ratio: number;
  valid: boolean;       // TRUE jika R:R >= 2
}

export interface ScreeningResult {
  screening_date: string;
  stock_code: string;
  stock_name?: string;
  sector?: string | null;
  subsector?: string | null;
  close_price: number;
  prev_close: number;
  change_pct: number;
  avg_value_20d: number;
  market_cap: number;
  passed_antigorengan: boolean;
  bandarmology_status: BandarmologyStatus;
  cmf_20: number;
  obv_trend: string;
  obv_divergence: boolean;
  retail_panic_selling: boolean;
  volume_today: number;
  vma_20: number;
  volume_ratio: number;
  volume_spike: boolean;
  ma20: number;
  ma50: number;
  rsi_14: number;
  macd_line: number;
  macd_signal: number;
  macd_histogram: number;
  technical_position: TechnicalPosition;
  macd_golden_cross: boolean;
  support_level: number;
  resistance_level: number;
  entry_price: number;
  cut_loss_price: number;
  take_profit_price: number;
  risk_reward_ratio: number;
  signal_strength: number;
}
