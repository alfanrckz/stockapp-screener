import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StocksService } from './stocks.service';

@ApiTags('Stocks')
@Controller('api/stocks')
export class StocksController {
  constructor(private readonly service: StocksService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar semua saham aktif' })
  async getAll() {
    const data = await this.service.getAllStocks();
    return { success: true, count: data.length, data };
  }

  @Post('sync-sectors')
  @ApiOperation({ summary: 'Sinkronisasi data sektor dari Yahoo Finance (jalankan sekali)' })
  async syncSectors() {
    const result = await this.service.syncSectors();
    return { success: true, ...result };
  }

  @Get(':code/prices')
  @ApiOperation({ summary: 'Harga historis satu saham' })
  async getPrices(
    @Param('code') code: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.getDailyPrices(
      code,
      limit ? parseInt(limit, 10) : 60,
    );
    return { success: true, data };
  }
}
