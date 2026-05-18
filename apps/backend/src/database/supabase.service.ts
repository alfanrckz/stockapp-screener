import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Polyfill global WebSocket untuk Node.js < 22 (dibutuhkan Supabase Realtime)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WS = require('ws');
if (!(globalThis as any).WebSocket) {
  (globalThis as any).WebSocket = WS; // ws export = WebSocket class (CJS)
}

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_KEY');

    if (!url || !key) {
      this.logger.error('SUPABASE_URL atau SUPABASE_SERVICE_KEY tidak dikonfigurasi');
      return;
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });
    this.logger.log('Supabase client initialized');
  }

  get db(): SupabaseClient {
    return this.client;
  }

  // ── Daily Prices ──────────────────────────────────────────────────────────

  async getDailyPrices(stockCode: string, limit = 60) {
    const { data, error } = await this.client
      .from('daily_prices')
      .select('*')
      .eq('stock_code', stockCode)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`getDailyPrices error: ${error.message}`);
    return (data ?? []).reverse(); // kembalikan ascending
  }

  async upsertDailyPrices(rows: object[]) {
    const { error } = await this.client
      .from('daily_prices')
      .upsert(rows, { onConflict: 'stock_code,date' });

    if (error) throw new Error(`upsertDailyPrices error: ${error.message}`);
  }

  // ── Broker Transactions ───────────────────────────────────────────────────

  async getBrokerTransactions(stockCode: string, days = 20) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days * 2); // buffer hari libur

    const { data, error } = await this.client
      .from('broker_transactions')
      .select('*')
      .eq('stock_code', stockCode)
      .gte('date', cutoffDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw new Error(`getBrokerTransactions error: ${error.message}`);
    return data ?? [];
  }

  async upsertBrokerTransactions(rows: object[]) {
    const { error } = await this.client
      .from('broker_transactions')
      .upsert(rows, { onConflict: 'stock_code,date,broker_code' });

    if (error) throw new Error(`upsertBrokerTransactions error: ${error.message}`);
  }

  // ── Stocks ────────────────────────────────────────────────────────────────

  async getActiveStocks() {
    const { data, error } = await this.client
      .from('stocks')
      .select('*')
      .eq('is_active', true);

    if (error) throw new Error(`getActiveStocks error: ${error.message}`);
    return data ?? [];
  }

  async upsertStocks(rows: object[]) {
    const { error } = await this.client
      .from('stocks')
      .upsert(rows, { onConflict: 'code' });

    if (error) throw new Error(`upsertStocks error: ${error.message}`);
  }

  // ── Screening Results ─────────────────────────────────────────────────────

  async getLatestScreeningResults(date?: string) {
    let query = this.client
      .from('screening_results')
      .select('*')
      .order('signal_strength', { ascending: false });

    if (date) {
      query = query.eq('screening_date', date);
    } else {
      // Ambil tanggal terbaru
      const { data: latest } = await this.client
        .from('screening_results')
        .select('screening_date')
        .order('screening_date', { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        query = query.eq('screening_date', latest.screening_date);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(`getLatestScreeningResults error: ${error.message}`);
    return data ?? [];
  }

  async upsertScreeningResults(rows: object[]) {
    const { error } = await this.client
      .from('screening_results')
      .upsert(rows, { onConflict: 'screening_date,stock_code' });

    if (error) throw new Error(`upsertScreeningResults error: ${error.message}`);
  }

  // ── OHLCV untuk chart ─────────────────────────────────────────────────────

  async getChartData(stockCode: string, days = 90) {
    const { data, error } = await this.client
      .from('daily_prices')
      .select('date,open,high,low,close,volume')
      .eq('stock_code', stockCode)
      .order('date', { ascending: false })
      .limit(days);

    if (error) throw new Error(`getChartData error: ${error.message}`);
    return (data ?? []).reverse();
  }

  async getAvailableScreeningDates(limit = 10) {
    const { data, error } = await this.client
      .from('screening_results')
      .select('screening_date')
      .order('screening_date', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return [...new Set((data ?? []).map(d => d.screening_date))];
  }
}
