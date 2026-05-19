import { Module } from '@nestjs/common';
import { EodProcessorService } from './eod-processor.service';
import { CronController } from './cron.controller';
import { ScreeningModule } from '../screening/screening.module';
import { SupabaseService } from '../../database/supabase.service';

@Module({
  imports: [ScreeningModule],
  controllers: [CronController],
  providers: [EodProcessorService, SupabaseService],
})
export class CronModule {}
