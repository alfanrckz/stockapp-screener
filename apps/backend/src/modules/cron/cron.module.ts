import { Module } from '@nestjs/common';
import { EodProcessorService } from './eod-processor.service';
import { ScreeningModule } from '../screening/screening.module';
import { SupabaseService } from '../../database/supabase.service';

@Module({
  imports: [ScreeningModule],
  providers: [EodProcessorService, SupabaseService],
})
export class CronModule {}
