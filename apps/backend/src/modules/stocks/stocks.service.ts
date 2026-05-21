import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getAllStocks() {
    return this.supabase.getActiveStocks();
  }

  async syncStockList(stocks: Array<{
    code: string;
    name: string;
    sector?: string;
    market_cap?: number;
    listed_shares?: number;
  }>) {
    await this.supabase.upsertStocks(
      stocks.map(s => ({ ...s, is_active: true })),
    );
    this.logger.log(`Synced ${stocks.length} stocks`);
  }

  async getDailyPrices(code: string, limit = 60) {
    return this.supabase.getDailyPrices(code.toUpperCase(), limit);
  }

  async syncSectors(): Promise<{ updated: number; failed: number }> {
    const stocks = await this.supabase.getActiveStocks();
    const missing = stocks.filter((s: any) => !s.sector);
    this.logger.log(`Syncing sectors for ${missing.length} stocks without sector data`);

    const BATCH = 50;
    let updated = 0;
    let failed  = 0;

    for (let i = 0; i < missing.length; i += BATCH) {
      const batch   = missing.slice(i, i + BATCH);
      const symbols = batch.map((s: any) => `${s.code}.JK`).join(',');

      try {
        const resp = await axios.get(
          'https://query1.finance.yahoo.com/v7/finance/quote',
          {
            params:  { symbols, fields: 'sector,industry,longName' },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          },
        );

        const quotes: any[] = resp.data?.quoteResponse?.result ?? [];
        const updates = quotes
          .filter(q => q.sector)
          .map(q => ({
            code:      q.symbol.replace('.JK', ''),
            sector:    q.sector,
            subsector: q.industry ?? undefined,
          }));

        if (updates.length > 0) {
          await this.supabase.updateStockSectors(updates);
          updated += updates.length;
        }

        failed += batch.length - updates.length;
      } catch (e) {
        this.logger.warn(`Sector sync batch error: ${e.message}`);
        failed += batch.length;
      }

      await new Promise(r => setTimeout(r, 600));
    }

    this.logger.log(`Sector sync done — updated: ${updated}, failed/no-data: ${failed}`);
    return { updated, failed };
  }
}
