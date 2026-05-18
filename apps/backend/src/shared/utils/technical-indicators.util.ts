/**
 * IDX price tick/fraction per aturan BEI
 * Ref: SEOJK No.15/SEOJK.04/2023
 */
export function getIDXFraction(price: number): number {
  if (price < 200)   return 1;
  if (price < 500)   return 2;
  if (price < 2000)  return 5;
  if (price < 5000)  return 10;
  return 25;
}

/** Round ke harga valid sesuai fraksi IDX */
export function roundToFraction(price: number): number {
  const frac = getIDXFraction(price);
  return Math.round(price / frac) * frac;
}

/** Simple Moving Average */
export function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

/** Exponential Moving Average */
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];

  // seed dengan SMA pertama
  const seed = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(seed);

  for (let i = period; i < data.length; i++) {
    result.push(data[i] * k + result[result.length - 1] * (1 - k));
  }
  return result;
}

/** RSI (Wilder's smoothing / Cutler's RSI) */
export function calculateRSI(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return [];

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  // Initial average (SMA seed)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const rsi: number[] = [];
  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + firstRS));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }
  return rsi;
}

export interface MACDResult {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

/** MACD (12,26,9) */
export function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9): MACDResult {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);

  // align: emaSlow lebih pendek (slow - fast) bar
  const offset = emaFast.length - emaSlow.length;
  const macdLine: number[] = emaSlow.map((v, i) => emaFast[i + offset] - v);

  const signalLine = calculateEMA(macdLine, signal);
  const sigOffset = macdLine.length - signalLine.length;
  const histogram: number[] = signalLine.map((v, i) => macdLine[i + sigOffset] - v);

  return { macdLine, signalLine, histogram };
}

/** Deteksi support dari pivot low dalam N candle terakhir */
export function findSupportLevel(lows: number[], lookback = 20): number {
  const slice = lows.slice(-lookback);
  return Math.min(...slice);
}

/** Deteksi resistance dari pivot high dalam N candle terakhir */
export function findResistanceLevel(highs: number[], lookback = 20): number {
  const slice = highs.slice(-lookback);
  return Math.max(...slice);
}

/**
 * Pivot Support yang lebih robust: cari swing low
 * Swing low = titik dimana low[i] < low[i-1] && low[i] < low[i+1]
 */
export function findSwingSupport(lows: number[], lookback = 30): number {
  const slice = lows.slice(-lookback);
  const swingLows: number[] = [];

  for (let i = 1; i < slice.length - 1; i++) {
    if (slice[i] < slice[i - 1] && slice[i] < slice[i + 1]) {
      swingLows.push(slice[i]);
    }
  }

  if (swingLows.length === 0) return Math.min(...slice);

  // Ambil swing low terdekat (terbesar dari semua swing lows)
  return Math.max(...swingLows);
}

export function findSwingResistance(highs: number[], lookback = 30): number {
  const slice = highs.slice(-lookback);
  const swingHighs: number[] = [];

  for (let i = 1; i < slice.length - 1; i++) {
    if (slice[i] > slice[i - 1] && slice[i] > slice[i + 1]) {
      swingHighs.push(slice[i]);
    }
  }

  if (swingHighs.length === 0) return Math.max(...slice);

  // Ambil swing high terdekat (terkecil dari semua swing highs yang di atas harga saat ini)
  return Math.min(...swingHighs);
}

/** On-Balance Volume — confirms price trend with volume pressure */
export function calculateOBV(closes: number[], volumes: number[]): number[] {
  if (closes.length < 2 || closes.length !== volumes.length) return [];
  const obv: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1])      obv.push(obv[i - 1] + volumes[i]);
    else if (closes[i] < closes[i - 1]) obv.push(obv[i - 1] - volumes[i]);
    else                                 obv.push(obv[i - 1]);
  }
  return obv;
}

/**
 * Chaikin Money Flow (default 20-period)
 * Range -1 to +1: positive = buying pressure, negative = selling pressure
 */
export function calculateCMF(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period = 20,
): number[] {
  const n = closes.length;
  if (n < period) return [];
  const result: number[] = [];
  for (let i = period - 1; i < n; i++) {
    let sumMFV = 0;
    let sumVol = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const hl  = highs[j] - lows[j];
      const mfm = hl === 0 ? 0 : ((closes[j] - lows[j]) - (highs[j] - closes[j])) / hl;
      sumMFV += mfm * volumes[j];
      sumVol += volumes[j];
    }
    result.push(sumVol === 0 ? 0 : parseFloat((sumMFV / sumVol).toFixed(4)));
  }
  return result;
}

/** Hitung signal strength composite score 0-100 */
export function calcSignalStrength(params: {
  volumeSpike: boolean;
  retailPanic: boolean;
  bandarmologyStatus: string;
  rsi: number;
  macdGoldenCross: boolean;
  rrRatio: number;
}): number {
  let score = 0;

  if (params.volumeSpike) score += 20;
  if (params.retailPanic) score += 15;

  switch (params.bandarmologyStatus) {
    case 'Big Accumulation':   score += 30; break;
    case 'Small Accumulation': score += 15; break;
    case 'Distribution':       score -= 20; break;
  }

  if (params.rsi >= 30 && params.rsi <= 50) score += 15;
  if (params.macdGoldenCross) score += 10;
  if (params.rrRatio >= 3)    score += 10;
  else if (params.rrRatio >= 2) score += 5;

  return Math.max(0, Math.min(100, score));
}
