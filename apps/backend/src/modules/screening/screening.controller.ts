import { Controller, Get, Param, Query, Post, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ScreeningService } from './screening.service';
import { EodProcessorService } from '../cron/eod-processor.service';

@ApiTags('Screening')
@Controller('api/screening')
export class ScreeningController {
  private readonly logger = new Logger(ScreeningController.name);

  constructor(
    private readonly service: ScreeningService,
    private readonly eod: EodProcessorService,
  ) {}

  @Get('results')
  @ApiOperation({ summary: 'Ambil hasil screening terbaru' })
  @ApiQuery({ name: 'date', required: false, description: 'Format: YYYY-MM-DD' })
  async getResults(@Query('date') date?: string) {
    const results = await this.service.getLatestResults(date);
    return { success: true, count: results.length, data: results };
  }

  @Get('dates')
  @ApiOperation({ summary: 'Daftar tanggal hasil screening tersedia' })
  async getAvailableDates() {
    const dates = await this.service.getAvailableDates();
    return { success: true, data: dates };
  }

  @Get('chart/:code')
  @ApiOperation({ summary: 'OHLCV data untuk chart TradingView' })
  @ApiQuery({ name: 'days', required: false })
  async getChartData(
    @Param('code') code: string,
    @Query('days') days?: string,
  ) {
    const data = await this.service.getChartData(
      code.toUpperCase(),
      days ? parseInt(days, 10) : 90,
    );
    return { success: true, data };
  }

  @Post('run')
  @HttpCode(202)
  @ApiOperation({ summary: 'Trigger manual screening (fetch OHLCV + screen)' })
  @ApiQuery({ name: 'date', required: false })
  async triggerManual(@Query('date') _date?: string) {
    // Selalu fetch OHLCV terbaru dulu sebelum screening
    this.eod.runEOD().catch(err =>
      this.logger.error(`Manual EOD error: ${err.message}`),
    );
    return { success: true, message: 'Fetch OHLCV + screening berjalan di background' };
  }
}
