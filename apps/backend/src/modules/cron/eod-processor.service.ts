import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../database/supabase.service';
import { ScreeningService } from '../screening/screening.service';
import axios from 'axios';

/**
 * EOD Processor: Fetch data + jalankan screening setiap hari bursa 16:15 WIB
 *
 * Sumber data:
 * - OHLCV: Yahoo Finance (gratis, format BBCA.JK)
 * - Broker data: Pluggable (mock/RTI/Stockbit)
 *
 * Cron: "15 9 * * 1-5"  (09:15 UTC = 16:15 WIB)
 */
@Injectable()
export class EodProcessorService {
  private readonly logger = new Logger(EodProcessorService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly screening: ScreeningService,
    private readonly config: ConfigService,
  ) {}

  // Senin-Jumat 16:15 WIB (09:15 UTC)
  @Cron('15 9 * * 1-5', { name: 'eod-screening', timeZone: 'UTC' })
  async runEOD() {
    this.logger.log('=== EOD Processing dimulai ===');
    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Fetch & update OHLCV data
      await this.fetchAndStoreOHLCV(today);

      // 2. (Opsional) Fetch broker transactions jika ada data feed
      await this.fetchAndStoreBrokerData(today);

      // 3. Jalankan screening lengkap
      const results = await this.screening.runFullScreening(today);
      this.logger.log(`=== EOD selesai: ${results.length} saham lolos screening ===`);
    } catch (err) {
      this.logger.error(`EOD processing error: ${err.message}`, err.stack);
    }
  }

  /**
   * Fetch OHLCV dari Yahoo Finance untuk semua saham aktif
   * Yahoo Finance format IDX: BBCA.JK, TLKM.JK, dst.
   */
  async fetchAndStoreOHLCV(date: string) {
    const stocks = await this.supabase.getActiveStocks();
    this.logger.log(`Fetching OHLCV untuk ${stocks.length} saham dari Yahoo Finance...`);

    const BATCH_SIZE = 10;
    let success = 0;

    for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
      const batch = stocks.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async stock => {
          try {
            const ohlcv = await this.fetchYahooFinanceEOD(stock.code, date);
            if (ohlcv) {
              await this.supabase.upsertDailyPrices([ohlcv]);
              success++;
            }
          } catch (e) {
            this.logger.warn(`Yahoo Finance error untuk ${stock.code}: ${e.message}`);
          }
        }),
      );

      // Rate limit: 100ms delay per batch
      await new Promise(r => setTimeout(r, 100));
    }

    this.logger.log(`OHLCV fetched: ${success}/${stocks.length} saham`);
  }

  /**
   * Fetch data EOD dari Yahoo Finance
   * Menggunakan unofficial Yahoo Finance API v8
   */
  private async fetchYahooFinanceEOD(
    stockCode: string,
    date: string,
  ): Promise<object | null> {
    const ticker = `${stockCode}.JK`;
    const dateObj = new Date(date);
    const periodStart = Math.floor(dateObj.getTime() / 1000) - 86400; // -1 hari buffer
    const periodEnd   = Math.floor(dateObj.getTime() / 1000) + 86400;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    const response = await axios.get(url, {
      params: {
        period1:  periodStart,
        period2:  periodEnd,
        interval: '1d',
      },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });

    const result = response.data?.chart?.result?.[0];
    if (!result) return null;

    const timestamps  = result.timestamp ?? [];
    const quotes      = result.indicators?.quote?.[0] ?? {};

    if (timestamps.length === 0) return null;

    // Ambil candle terakhir
    const idx = timestamps.length - 1;
    const candleDate = new Date(timestamps[idx] * 1000).toISOString().split('T')[0];

    if (candleDate !== date) return null; // Data bukan untuk tanggal yang diminta

    // Yahoo Finance menggunakan harga dalam IDR (tidak perlu konversi)
    const close  = Math.round((quotes.close?.[idx]  ?? 0) * 1);
    const open   = Math.round((quotes.open?.[idx]   ?? 0) * 1);
    const high   = Math.round((quotes.high?.[idx]   ?? 0) * 1);
    const low    = Math.round((quotes.low?.[idx]    ?? 0) * 1);
    const volume = quotes.volume?.[idx] ?? 0; // dalam lembar, convert ke lot
    const value  = Math.round(close * volume); // estimasi nilai transaksi

    return {
      stock_code: stockCode,
      date:       candleDate,
      open,
      high,
      low,
      close,
      volume:    Math.floor(volume / 100), // lembar → lot
      value,
      frequency: 0,
    };
  }

  /**
   * Fetch broker transaction data
   * Ganti implementasi ini dengan data provider Anda (RTI, Stockbit, dll.)
   * Saat ini menghasilkan mock data untuk development
   */
  async fetchAndStoreBrokerData(date: string) {
    const isDev = this.config.get('NODE_ENV') === 'development';
    if (isDev) {
      this.logger.debug('Mode development: skip fetch broker data (gunakan mock/seed manual)');
      return;
    }

    // TODO: Implementasi fetch broker data dari sumber nyata
    // Contoh: RTI API, scraping idx.co.id/broker-summary, atau data feed berbayar
    this.logger.warn('Broker data feed belum dikonfigurasi. Set STOCKBIT_API_KEY atau RTI_API_KEY.');
  }
}
