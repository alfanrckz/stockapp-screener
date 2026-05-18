import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ScreeningModule } from './modules/screening/screening.module';
import { StocksModule } from './modules/stocks/stocks.module';
import { CronModule } from './modules/cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ScreeningModule,
    StocksModule,
    CronModule,
  ],
})
export class AppModule {}
