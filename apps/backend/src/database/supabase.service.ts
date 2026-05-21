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

  async updateStockSectors(updates: Array<{ code: string; sector: string; subsector?: string }>) {
    for (const u of updates) {
      const { error } = await this.client
        .from('stocks')
        .update({ sector: u.sector, subsector: u.subsector ?? null })
        .eq('code', u.code);
      if (error) this.logger.warn(`updateStockSectors error ${u.code}: ${error.message}`);
    }
  }

  // ── Screening Results ─────────────────────────────────────────────────────

  async getLatestScreeningResults(date?: string) {
    let query = this.client
      .from('screening_results')
      .select('*, stocks!stock_code(sector, subsector)')
      .order('signal_strength', { ascending: false });

    if (date) {
      query = query.eq('screening_date', date);
    } else {
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

    return (data ?? []).map((row: any) => {
      const { stocks: stockInfo, ...rest } = row;
      return {
        ...rest,
        sector:    stockInfo?.sector    ?? null,
        subsector: stockInfo?.subsector ?? null,
      };
    });
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

  async getStockStreaks(): Promise<Record<string, number>> {
    // Fetch last 10 distinct screening dates
    const { data: dateRows, error: dateErr } = await this.client
      .from('screening_results')
      .select('screening_date')
      .order('screening_date', { ascending: false })
      .limit(200); // over-fetch; we'll deduplicate

    if (dateErr) throw new Error(`getStockStreaks dates error: ${dateErr.message}`);

    const dates = [...new Set((dateRows ?? []).map(d => d.screening_date))].slice(0, 10);
    if (dates.length === 0) return {};

    // Fetch stock_code + date for those dates in one query
    const { data: rows, error: rowErr } = await this.client
      .from('screening_results')
      .select('stock_code, screening_date')
      .in('screening_date', dates);

    if (rowErr) throw new Error(`getStockStreaks rows error: ${rowErr.message}`);

    // Build set-per-date map
    const byDate = new Map<string, Set<string>>();
    for (const row of rows ?? []) {
      if (!byDate.has(row.screening_date)) byDate.set(row.screening_date, new Set());
      byDate.get(row.screening_date)!.add(row.stock_code);
    }

    // Compute consecutive streak for each stock in the latest date
    const latest   = byDate.get(dates[0]) ?? new Set<string>();
    const streaks: Record<string, number> = {};

    for (const code of latest) {
      let count = 0;
      for (const date of dates) {
        if (byDate.get(date)?.has(code)) count++;
        else break;
      }
      streaks[code] = count;
    }

    return streaks;
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
