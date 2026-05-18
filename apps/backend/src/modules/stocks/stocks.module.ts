import { Module } from '@nestjs/common';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';
import { SupabaseService } from '../../database/supabase.service';

@Module({
  controllers: [StocksController],
  providers: [StocksService, SupabaseService],
})
export class StocksModule {}
