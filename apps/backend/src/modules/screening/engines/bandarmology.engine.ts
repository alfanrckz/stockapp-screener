import { Injectable } from '@nestjs/common';
import { BandarmologyResult, BandarmologyStatus } from '../../../shared/interfaces/screening.interface';
import { DailyPrice } from '../../../shared/interfaces/stock.interface';
import { calculateOBV, calculateCMF } from '../../../shared/utils/technical-indicators.util';

// CMF classification thresholds
const CMF_BIG_ACCUMULATION   =  0.15;
const CMF_SMALL_ACCUMULATION =  0.05;
const CMF_DISTRIBUTION       = -0.10;

@Injectable()
export class BandarmologyEngine {
  /**
   * Tahap 2: Analisis aliran dana via OBV & CMF (Chaikin Money Flow)
   * Menggantikan broker transaction analysis — tidak perlu data berbayar RTI/Stockbit
   *
   * CMF > 0.15  → Big Accumulation (institusi agresif beli)
   * CMF > 0.05  → Small Accumulation
   * CMF < -0.10 → Distribution (institusi jual)
   * OBV rising while price flat/down → bullish divergence (smart money accumulating)
   */
  analyze(prices: DailyPrice[]): BandarmologyResult {
    const closes  = prices.map(p => p.close);
    const highs   = prices.map(p => p.high);
    const lows    = prices.map(p => p.low);
    const volumes = prices.map(p => p.volume);

    // CMF 20-period (latest value)
    const cmfSeries = calculateCMF(highs, lows, closes, volumes, 20);
    const cmf_20 = cmfSeries.length > 0 ? cmfSeries[cmfSeries.length - 1] : 0;

    // OBV trend — compare OBV of last 5 days vs 10 days ago
    const obvSeries = calculateOBV(closes, volumes);
    const obv_trend = this.detectOBVTrend(obvSeries);

    // OBV bullish divergence: price direction ↓ but OBV direction ↑
    const obv_divergence = this.detectOBVDivergence(closes, obvSeries);

    // Status classification based on CMF
    const status = this.classifyStatus(cmf_20);

    // Volume spike: today's volume > 1.5× VMA20
    const vma20 = volumes.slice(-20).reduce((s, v) => s + v, 0) / Math.min(20, volumes.length);
    const currentVolume = volumes[volumes.length - 1] ?? 0;
    const volumeRatio = vma20 > 0 ? currentVolume / vma20 : 0;
    const volume_spike = volumeRatio > 1.5;

    // retail_panic_selling analog: OBV bullish divergence = smart money buying while price falls
    const retail_panic_selling = obv_divergence;

    return {
      status,
      cmf_20: parseFloat(cmf_20.toFixed(4)),
      obv_trend,
      obv_divergence,
      volume_spike,
      volume_ratio: parseFloat(volumeRatio.toFixed(2)),
      vma_20: Math.round(vma20),
      retail_panic_selling,
    };
  }

  private classifyStatus(cmf: number): BandarmologyStatus {
    if (cmf >= CMF_BIG_ACCUMULATION)   return 'Big Accumulation';
    if (cmf >= CMF_SMALL_ACCUMULATION) return 'Small Accumulation';
    if (cmf <= CMF_DISTRIBUTION)       return 'Distribution';
    return 'Neutral';
  }

  private detectOBVTrend(obv: number[]): 'rising' | 'falling' | 'neutral' {
    if (obv.length < 10) return 'neutral';
    const recent = obv[obv.length - 1];
    const past   = obv[obv.length - 10];
    const delta  = (recent - past) / (Math.abs(past) || 1);
    if (delta >  0.02) return 'rising';
    if (delta < -0.02) return 'falling';
    return 'neutral';
  }

  /** Price falling but OBV rising over last 10 candles = bullish divergence */
  private detectOBVDivergence(closes: number[], obv: number[]): boolean {
    if (closes.length < 10 || obv.length < 10) return false;
    const priceDelta = closes[closes.length - 1] - closes[closes.length - 10];
    const obvDelta   = obv[obv.length - 1] - obv[obv.length - 10];
    return priceDelta < 0 && obvDelta > 0;
  }
}
