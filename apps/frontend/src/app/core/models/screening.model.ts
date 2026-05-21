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
  streak?: number;
}

export const BANDARMOLOGY_SEVERITY: Record<BandarmologyStatus, number> = {
  'Big Accumulation':   4,
  'Small Accumulation': 3,
  'Neutral':            2,
  'Distribution':       1,
};

export const BANDARMOLOGY_COLOR: Record<BandarmologyStatus, string> = {
  'Big Accumulation':   'success',
  'Small Accumulation': 'info',
  'Neutral':            'warning',
  'Distribution':       'danger',
};
