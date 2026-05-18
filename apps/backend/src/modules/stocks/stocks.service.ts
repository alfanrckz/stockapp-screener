import { Injectable, Logger } from '@nestjs/common';
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
}
