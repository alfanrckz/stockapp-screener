import { Injectable, Logger } from '@nestjs/common';
import { TechnicalResult, TechnicalPosition } from '../../../shared/interfaces/screening.interface';
import { DailyPrice } from '../../../shared/interfaces/stock.interface';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  findSwingSupport,
  findSwingResistance,
} from '../../../shared/utils/technical-indicators.util';

@Injectable()
export class TechnicalEngine {
  private readonly logger = new Logger(TechnicalEngine.name);

  /**
   * Tahap 3: Validasi teknikal
   *
   * Kriteria lolos:
   * - Harga di atas MA20 atau MA50, ATAU rebound dari support
   * - RSI(14) dalam range 30-60 (oversold recovery, bukan overbought)
   * - MACD siap/sudah golden cross, ATAU histogram membalik positif
   */
  analyze(prices: DailyPrice[]): TechnicalResult {
    if (prices.length < 26) {
      return this.emptyResult(false);
    }

    const closes  = prices.map(p => p.close);
    const highs   = prices.map(p => p.high);
    const lows    = prices.map(p => p.low);
    const lastClose = closes[closes.length - 1];

    // Moving Averages
    const sma20arr = calculateSMA(closes, 20);
    const sma50arr = calculateSMA(closes, 50);
    const ma20 = sma20arr.length > 0 ? sma20arr[sma20arr.length - 1] : 0;
    const ma50 = sma50arr.length > 0 ? sma50arr[sma50arr.length - 1] : 0;

    // RSI
    const rsiArr = calculateRSI(closes, 14);
    const rsi_14 = rsiArr.length > 0 ? parseFloat(rsiArr[rsiArr.length - 1].toFixed(2)) : 50;

    // MACD
    const macdData = calculateMACD(closes);
    const len = macdData.signalLine.length;
    const macd_line      = len > 0 ? macdData.macdLine[macdData.macdLine.length - 1]         : 0;
    const macd_signal    = len > 0 ? macdData.signalLine[len - 1]                             : 0;
    const macd_histogram = len > 0 ? macdData.histogram[macdData.histogram.length - 1]       : 0;
    const prevHistogram  = len > 1 ? macdData.histogram[macdData.histogram.length - 2]       : 0;

    // Golden cross: MACD line baru melewati signal dari bawah
    const macd_golden_cross =
      macd_line > macd_signal &&
      (len >= 2 ? macdData.macdLine[macdData.macdLine.length - 2] <= macd_signal : false);

    // Support & Resistance
    const support_level    = findSwingSupport(lows,  30);
    const resistance_level = findSwingResistance(highs, 30);

    // Tentukan posisi teknikal
    const technical_position = this.determineTechnicalPosition({
      lastClose,
      ma20,
      ma50,
      rsi_14,
      macd_golden_cross,
      macd_histogram,
      prevHistogram,
      support_level,
    });

    // Saham lolos jika tidak di bawah semua MA dengan RSI overbought
    const passed = technical_position !== 'Below All MA' && rsi_14 < 70;

    return {
      ma20: parseFloat(ma20.toFixed(2)),
      ma50: parseFloat(ma50.toFixed(2)),
      rsi_14,
      macd_line:      parseFloat(macd_line.toFixed(4)),
      macd_signal:    parseFloat(macd_signal.toFixed(4)),
      macd_histogram: parseFloat(macd_histogram.toFixed(4)),
      technical_position,
      macd_golden_cross,
      support_level:    parseFloat(support_level.toFixed(2)),
      resistance_level: parseFloat(resistance_level.toFixed(2)),
      passed,
    };
  }

  private determineTechnicalPosition(params: {
    lastClose: number;
    ma20: number;
    ma50: number;
    rsi_14: number;
    macd_golden_cross: boolean;
    macd_histogram: number;
    prevHistogram: number;
    support_level: number;
  }): TechnicalPosition {
    const { lastClose, ma20, ma50, rsi_14, macd_golden_cross, macd_histogram, prevHistogram, support_level } = params;

    const aboveMa20 = lastClose > ma20;
    const aboveMa50 = lastClose > ma50;

    // Rebound dari support: harga dekat support (dalam 3%) dan histogram membalik positif
    const nearSupport     = (lastClose - support_level) / support_level < 0.03;
    const histogramTurning = macd_histogram > prevHistogram && prevHistogram < 0;
    const reboundSignal   = nearSupport && histogramTurning;

    if (macd_golden_cross) return 'MACD Golden Cross';
    if (rsi_14 >= 30 && rsi_14 <= 45 && reboundSignal) return 'RSI Oversold Recovery';
    if (reboundSignal) return 'Rebound from Support';
    if (aboveMa20 && aboveMa50) return 'Above MA20 & MA50';
    if (aboveMa20) return 'Above MA20';
    if (aboveMa50) return 'Above MA50';
    return 'Below All MA';
  }

  private emptyResult(passed: boolean): TechnicalResult {
    return {
      ma20: 0, ma50: 0, rsi_14: 0,
      macd_line: 0, macd_signal: 0, macd_histogram: 0,
      technical_position: 'Below All MA',
      macd_golden_cross: false,
      support_level: 0, resistance_level: 0,
      passed,
    };
  }
}
