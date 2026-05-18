import { Injectable, Logger } from '@nestjs/common';
import { AntiGorenganResult } from '../../../shared/interfaces/screening.interface';
import { DailyPrice } from '../../../shared/interfaces/stock.interface';

const MIN_AVG_VALUE_20D = 5_000_000_000;   // Rp 5 Miliar
const MIN_MARKET_CAP    = 500_000_000_000; // Rp 500 Miliar

@Injectable()
export class AntiGorenganEngine {
  private readonly logger = new Logger(AntiGorenganEngine.name);

  /**
   * Tahap 1: Filter saham tidak layak untuk swing trading
   *
   * Kriteria eliminasi:
   * 1. Avg daily value 20 hari < Rp 5 Miliar
   * 2. Market cap < Rp 500 Miliar
   * 3. Saham stagnan (range harga < 2% dalam 20 hari & volume rendah)
   */
  analyze(prices: DailyPrice[], marketCap: number): AntiGorenganResult {
    if (prices.length < 5) {
      return {
        passed: false,
        avg_value_20d: 0,
        market_cap: marketCap,
        reject_reason: 'Data harga tidak cukup (< 5 hari)',
      };
    }

    const last20 = prices.slice(-20);

    // 1. Cek rata-rata nilai transaksi
    const totalValue = last20.reduce((sum, p) => sum + p.value, 0);
    const avgValue20d = totalValue / last20.length;

    if (avgValue20d < MIN_AVG_VALUE_20D) {
      return {
        passed: false,
        avg_value_20d: avgValue20d,
        market_cap: marketCap,
        reject_reason: `Avg value 20d terlalu rendah: Rp ${this.formatBillion(avgValue20d)}M (min: Rp 5M)`,
      };
    }

    // 2. Cek market cap
    if (marketCap < MIN_MARKET_CAP) {
      return {
        passed: false,
        avg_value_20d: avgValue20d,
        market_cap: marketCap,
        reject_reason: `Market cap terlalu kecil: Rp ${this.formatBillion(marketCap)}M (min: Rp 500M)`,
      };
    }

    // 3. Deteksi saham stagnan (range < 2% & volume rendah)
    const highs  = last20.map(p => p.high);
    const lows   = last20.map(p => p.low);
    const maxHigh = Math.max(...highs);
    const minLow  = Math.min(...lows);
    const priceRange = (maxHigh - minLow) / minLow;

    const avgVolume = last20.reduce((s, p) => s + p.volume, 0) / last20.length;
    const todayVol  = prices[prices.length - 1].volume;
    const hasVolumeBreakout = todayVol > avgVolume * 2;

    if (priceRange < 0.02 && !hasVolumeBreakout) {
      return {
        passed: false,
        avg_value_20d: avgValue20d,
        market_cap: marketCap,
        reject_reason: `Saham stagnan: range harga 20d hanya ${(priceRange * 100).toFixed(1)}% tanpa volume breakout`,
      };
    }

    return {
      passed: true,
      avg_value_20d: avgValue20d,
      market_cap: marketCap,
    };
  }

  private formatBillion(value: number): string {
    return (value / 1_000_000_000).toFixed(1);
  }
}
