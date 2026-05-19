import { Controller, Get, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { EodProcessorService } from './eod-processor.service';

@Controller('api/cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(private readonly eod: EodProcessorService) {}

  // Dipanggil oleh Vercel Cron setiap hari kerja 16:15 WIB (09:15 UTC)
  @Get('eod')
  async triggerEod(@Headers('authorization') auth: string) {
    const secret = process.env.CRON_SECRET;
    if (secret && auth !== `Bearer ${secret}`) {
      throw new UnauthorizedException();
    }

    this.logger.log('Vercel Cron trigger: EOD processing dimulai');
    // Fire-and-forget — Vercel cron timeout 25s, proses bisa lebih lama
    this.eod.runEOD().catch(e => this.logger.error('EOD error:', e.message));
    return { ok: true, message: 'EOD processing started' };
  }
}
