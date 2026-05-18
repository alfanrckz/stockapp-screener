import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  currentTime = signal('');
  marketStatus = signal(this.calcMarketStatus());

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.tick();
    this.timer = setInterval(() => this.tick(), 30_000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private tick() {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 3600_000);
    this.currentTime.set(
      wib.toUTCString().slice(17, 22) + ' WIB',
    );
    this.marketStatus.set(this.calcMarketStatus());
  }

  private calcMarketStatus(): { label: string; cls: string } {
    const now  = new Date();
    const wib  = new Date(now.getTime() + 7 * 3600_000);
    const day  = wib.getUTCDay(); // 0=Sun 6=Sat
    const mins = wib.getUTCHours() * 60 + wib.getUTCMinutes();

    if (day === 0 || day === 6) return { label: 'LIBUR', cls: 'closed' };

    const isFriday   = day === 5;
    const sesi2Close = isFriday ? 15 * 60 + 15 : 15 * 60 + 55;

    if (mins >= 8 * 60 + 45  && mins < 9 * 60)          return { label: 'PRE-OPENING', cls: 'pre' };
    if (mins >= 9 * 60        && mins < 11 * 60 + 30)    return { label: 'SESI 1 — BUKA', cls: 'open' };
    if (mins >= 11 * 60 + 30  && mins < 13 * 60 + 30)   return { label: 'ISTIRAHAT', cls: 'break' };
    if (mins >= 13 * 60 + 30  && mins < sesi2Close)      return { label: 'SESI 2 — BUKA', cls: 'open' };
    if (mins >= sesi2Close     && mins < sesi2Close + 20) return { label: 'POST-CLOSING', cls: 'post' };
    if (mins >= 16 * 60 + 30  && mins < 20 * 60)         return { label: 'SCREENING TIME', cls: 'screening' };
    return { label: 'TUTUP', cls: 'closed' };
  }
}
