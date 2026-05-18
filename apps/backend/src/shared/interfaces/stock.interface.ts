export interface Stock {
  code: string;
  name: string;
  sector?: string;
  subsector?: string;
  market_cap: number;
  listed_shares: number;
  is_active: boolean;
}

export interface DailyPrice {
  id?: number;
  stock_code: string;
  date: string;         // ISO date string YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;       // dalam lot
  value: number;        // nilai transaksi IDR
  frequency?: number;
}

export interface BrokerTransaction {
  id?: number;
  stock_code: string;
  date: string;
  broker_code: string;
  buy_lot: number;
  buy_value: number;
  sell_lot: number;
  sell_value: number;
  net_lot?: number;     // generated
  net_value?: number;   // generated
}

export interface BrokerSummary {
  broker_code: string;
  broker_name?: string;
  net_value: number;
  net_lot: number;
  buy_value: number;
  sell_value: number;
}

export interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
}
