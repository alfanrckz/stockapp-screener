import { Module } from '@nestjs/common';
import { ScreeningController } from './screening.controller';
import { ScreeningService } from './screening.service';
import { AntiGorenganEngine } from './engines/anti-gorengan.engine';
import { BandarmologyEngine } from './engines/bandarmology.engine';
import { TechnicalEngine } from './engines/technical.engine';
import { TradingPlanEngine } from './engines/trading-plan.engine';
import { SupabaseService } from '../../database/supabase.service';
import { EodProcessorService } from '../cron/eod-processor.service';

@Module({
  controllers: [ScreeningController],
  providers: [
    ScreeningService,
    EodProcessorService,
    AntiGorenganEngine,
    BandarmologyEngine,
    TechnicalEngine,
    TradingPlanEngine,
    SupabaseService,
  ],
  exports: [ScreeningService],
})
export class ScreeningModule {}
