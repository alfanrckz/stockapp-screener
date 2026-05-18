import { Injectable, Logger } from '@nestjs/common';
import { TradingPlanResult } from '../../../shared/interfaces/screening.interface';
import { roundToFraction, getIDXFraction } from '../../../shared/utils/technical-indicators.util';

const MIN_RR_RATIO = 2.0;

@Injectable()
export class TradingPlanEngine {
  private readonly logger = new Logger(TradingPlanEngine.name);

  calculate(params: {
    currentClose: number;
    supportLevel: number;
    resistanceLevel: number;
    avgValue20d: number;
  }): TradingPlanResult {
    const { currentClose, supportLevel, resistanceLevel } = params;

    if (supportLevel <= 0 || resistanceLevel <= 0) {
      return this.invalidPlan();
    }

    const fraction   = getIDXFraction(supportLevel);
    const entryPrice = roundToFraction(Math.max(currentClose, supportLevel + fraction * 2));

    // Cut Loss: 2 fraksi di bawah support
    const clFractions  = Math.max(2, Math.ceil(supportLevel * 0.02 / fraction)); // min 2%, min 2 fraksi
    const cutLossPrice = roundToFraction(supportLevel - fraction * clFractions);

    // Pastikan CL tidak terlalu jauh (max -5% dari entry)
    const adjustedCL = Math.max(cutLossPrice, entryPrice * 0.95);

    // Risk per share
    const risk = entryPrice - adjustedCL;
    if (risk <= 0) return this.invalidPlan();

    // TP: level resistance, pastikan R:R minimal 1:2
    const minTP = entryPrice + risk * MIN_RR_RATIO;
    const rawTP = Math.max(resistanceLevel, minTP);
    const takeProfitPrice = roundToFraction(rawTP);

    // Hitung actual R:R
    const reward = takeProfitPrice - entryPrice;
    const rrRatio = parseFloat((reward / risk).toFixed(2));

    const valid = rrRatio >= MIN_RR_RATIO;

    return {
      entry_price:       roundToFraction(entryPrice),
      cut_loss_price:    roundToFraction(adjustedCL),
      take_profit_price: takeProfitPrice,
      risk_reward_ratio: rrRatio,
      valid,
    };
  }

  private invalidPlan(): TradingPlanResult {
    return {
      entry_price: 0,
      cut_loss_price: 0,
      take_profit_price: 0,
      risk_reward_ratio: 0,
      valid: false,
    };
  }
}
