import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { AntiGorenganEngine } from './engines/anti-gorengan.engine';
import { BandarmologyEngine } from './engines/bandarmology.engine';
import { TechnicalEngine } from './engines/technical.engine';
import { TradingPlanEngine } from './engines/trading-plan.engine';
import { ScreeningResult } from '../../shared/interfaces/screening.interface';
import { calcSignalStrength } from '../../shared/utils/technical-indicators.util';

@Injectable()
export class ScreeningService {
  private readonly logger = new Logger(ScreeningService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly antiGorengan: AntiGorenganEngine,
    private readonly bandarmology: BandarmologyEngine,
    private readonly technical: TechnicalEngine,
    private readonly tradingPlan: TradingPlanEngine,
  ) {}

  /**
   * Jalankan screening lengkap untuk semua saham aktif
   * Dipanggil oleh cron job EOD
   */
  async runFullScreening(targetDate?: string): Promise<ScreeningResult[]> {
    const screeningDate = targetDate ?? new Date().toISOString().split('T')[0];
    this.logger.log(`Memulai screening EOD untuk tanggal: ${screeningDate}`);

    const stocks = await this.supabase.getActiveStocks();
    this.logger.log(`Total saham aktif: ${stocks.length}`);

    const results: ScreeningResult[] = [];
    let processed = 0;
    let passed = 0;

    // Proses per batch untuk menghindari timeout
    const BATCH_SIZE = 20;
    for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
      const batch = stocks.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(stock => this.screenSingleStock(stock, screeningDate)),
      );

      for (const result of batchResults) {
        processed++;
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
          passed++;
        }
      }

      this.logger.debug(`Progress: ${processed}/${stocks.length} (lolos: ${passed})`);
    }

    // Simpan hasil ke database
    if (results.length > 0) {
      await this.supabase.upsertScreeningResults(results);
    }

    this.logger.log(`Screening selesai. ${passed}/${stocks.length} saham lolos semua filter.`);
    return results;
  }

  /**
   * Screen satu saham, return null jika tidak lolos filter kritis
   */
  async screenSingleStock(
    stock: { code: string; name: string; market_cap: number },
    screeningDate: string,
  ): Promise<ScreeningResult | null> {
    try {
      // Ambil data harga (60 hari untuk hitung semua indikator)
      const prices = await this.supabase.getDailyPrices(stock.code, 60);
      if (prices.length < 20) return null;

      const lastPrice = prices[prices.length - 1];
      const prevPrice = prices[prices.length - 2];

      // ── Tahap 1: Anti-Gorengan ─────────────────────────────────────────
      const ag = this.antiGorengan.analyze(prices, stock.market_cap);
      if (!ag.passed) return null;  // Eliminasi langsung

      // ── Tahap 2: Bandarmology (OBV + CMF) ─────────────────────────────
      const bando = this.bandarmology.analyze(prices);

      // Lewati saham dalam fase distribusi aktif
      if (bando.status === 'Distribution' && !bando.volume_spike) return null;

      // ── Tahap 3: Technical ─────────────────────────────────────────────
      const tech = this.technical.analyze(prices);
      if (!tech.passed) return null;

      // ── Tahap 4: Trading Plan ──────────────────────────────────────────
      const plan = this.tradingPlan.calculate({
        currentClose:    lastPrice.close,
        supportLevel:    tech.support_level,
        resistanceLevel: tech.resistance_level,
        avgValue20d:     ag.avg_value_20d,
      });

      if (!plan.valid) return null;  // R:R tidak memenuhi syarat

      // ── Composite Score ────────────────────────────────────────────────
      const signal_strength = calcSignalStrength({
        volumeSpike:        bando.volume_spike,
        retailPanic:        bando.retail_panic_selling,
        bandarmologyStatus: bando.status,
        rsi:                tech.rsi_14,
        macdGoldenCross:    tech.macd_golden_cross,
        rrRatio:            plan.risk_reward_ratio,
      });

      const changePct = prevPrice
        ? parseFloat((((lastPrice.close - prevPrice.close) / prevPrice.close) * 100).toFixed(2))
        : 0;

      return {
        screening_date:      screeningDate,
        stock_code:          stock.code,
        stock_name:          stock.name,
        close_price:         lastPrice.close,
        prev_close:          prevPrice?.close ?? lastPrice.close,
        change_pct:          changePct,
        avg_value_20d:       ag.avg_value_20d,
        market_cap:          ag.market_cap,
        passed_antigorengan: true,
        bandarmology_status: bando.status,
        cmf_20:              bando.cmf_20,
        obv_trend:           bando.obv_trend,
        obv_divergence:      bando.obv_divergence,
        retail_panic_selling: bando.retail_panic_selling,
        volume_today:        lastPrice.volume,
        vma_20:              bando.vma_20,
        volume_ratio:        bando.volume_ratio,
        volume_spike:        bando.volume_spike,
        ma20:                tech.ma20,
        ma50:                tech.ma50,
        rsi_14:              tech.rsi_14,
        macd_line:           tech.macd_line,
        macd_signal:         tech.macd_signal,
        macd_histogram:      tech.macd_histogram,
        technical_position:  tech.technical_position,
        macd_golden_cross:   tech.macd_golden_cross,
        support_level:       tech.support_level,
        resistance_level:    tech.resistance_level,
        entry_price:         plan.entry_price,
        cut_loss_price:      plan.cut_loss_price,
        take_profit_price:   plan.take_profit_price,
        risk_reward_ratio:   plan.risk_reward_ratio,
        signal_strength,
      };
    } catch (err) {
      this.logger.warn(`Error screening ${stock.code}: ${err.message}`);
      return null;
    }
  }

  async getLatestResults(date?: string) {
    return this.supabase.getLatestScreeningResults(date);
  }

  async getChartData(stockCode: string, days = 90) {
    return this.supabase.getChartData(stockCode, days);
  }

  async getAvailableDates() {
    return this.supabase.getAvailableScreeningDates();
  }
}
