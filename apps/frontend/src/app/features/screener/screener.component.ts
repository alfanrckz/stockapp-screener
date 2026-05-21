import {
  Component, OnInit, signal, computed, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ChipModule } from 'primeng/chip';
import { MessageService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';

import { ScreeningService } from '../../core/services/screening.service';
import { ExcelExportService } from '../../core/services/excel-export.service';
import {
  ScreeningResult, BandarmologyStatus,
} from '../../core/models/screening.model';
import { RupiahPipe } from '../../shared/pipes/rupiah.pipe';
import { ChartModalComponent } from './chart-modal/chart-modal.component';

type SeverityType = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

@Component({
  selector: 'app-screener',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, DropdownModule, ButtonModule, InputTextModule,
    TagModule, BadgeModule, TooltipModule, ProgressSpinnerModule,
    ToastModule, ChipModule, DividerModule,
    RupiahPipe, ChartModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './screener.component.html',
  styleUrls: ['./screener.component.scss'],
})
export class ScreenerComponent implements OnInit {
  private readonly screeningService = inject(ScreeningService);
  private readonly messageService   = inject(MessageService);
  private readonly excelExport      = inject(ExcelExportService);

  results       = signal<ScreeningResult[]>([]);
  streakMap     = signal<Record<string, number>>({});
  loading       = signal(false);
  runningScreen = signal(false);
  selectedDates = signal<string[]>([]);
  selectedDate  = signal<string | null>(null);
  globalFilter  = signal('');

  selectedStock = signal<ScreeningResult | null>(null);
  chartVisible  = signal(false);

  selectedBandoFilter  = signal<BandarmologyStatus | null>(null);
  selectedSector       = signal<string | null>(null);
  syncingSectors       = signal(false);
  exporting            = signal(false);

  readonly bandoFilterOptions = [
    { label: 'Semua Status', value: null },
    { label: '🟢 Big Accumulation', value: 'Big Accumulation' },
    { label: '🔵 Small Accumulation', value: 'Small Accumulation' },
    { label: '⚪ Neutral', value: 'Neutral' },
    { label: '🔴 Distribution', value: 'Distribution' },
  ];

  sectorOptions = computed(() => {
    const sectors = [...new Set(
      this.results()
        .map(r => r.sector)
        .filter((s): s is string => !!s)
        .sort(),
    )];
    return [
      { label: 'Semua Sektor', value: null },
      ...sectors.map(s => ({ label: s, value: s })),
    ];
  });

  hasSectorData = computed(() =>
    this.results().some(r => !!r.sector),
  );

  filteredResults = computed(() => {
    const streaks = this.streakMap();
    let data = this.results().map(r => ({
      ...r,
      streak: streaks[r.stock_code] ?? 1,
    }));

    const bando = this.selectedBandoFilter();
    if (bando) data = data.filter(r => r.bandarmology_status === bando);

    const sector = this.selectedSector();
    if (sector) data = data.filter(r => r.sector === sector);

    const q = this.globalFilter().trim().toLowerCase();
    if (q) data = data.filter(r =>
      r.stock_code.toLowerCase().includes(q) ||
      (r.stock_name ?? '').toLowerCase().includes(q) ||
      (r.bandarmology_status ?? '').toLowerCase().includes(q) ||
      (r.technical_position ?? '').toLowerCase().includes(q) ||
      (r.sector ?? '').toLowerCase().includes(q),
    );

    return data;
  });

  summary = computed(() => {
    const d = this.results();
    return {
      total:       d.length,
      bigAccum:    d.filter(r => r.bandarmology_status === 'Big Accumulation').length,
      smallAccum:  d.filter(r => r.bandarmology_status === 'Small Accumulation').length,
      volSpike:    d.filter(r => r.volume_spike).length,
      obvDiverg:   d.filter(r => r.obv_divergence).length,
      goldenCross: d.filter(r => r.macd_golden_cross).length,
    };
  });

  ngOnInit() { this.loadDates(); }

  loadDates() {
    this.screeningService.getAvailableDates().subscribe({
      next: (dates) => {
        this.selectedDates.set(dates);
        if (dates.length > 0) {
          this.selectedDate.set(dates[0]);
          this.loadResults(dates[0]);
        }
      },
      error: () => this.showError('Gagal memuat daftar tanggal'),
    });
  }

  loadResults(date?: string | null) {
    this.loading.set(true);
    this.screeningService.getResults(date ?? undefined).subscribe({
      next:  (data) => { this.results.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.showError('Gagal memuat hasil screening'); },
    });
    this.screeningService.getStreaks().subscribe({
      next:  (data) => this.streakMap.set(data),
      error: () => {},   // streak is non-critical, silently ignore
    });
  }

  onDateChange(date: string) { this.selectedDate.set(date); this.loadResults(date); }
  onRefresh()                { this.loadResults(this.selectedDate()); }

  onRunScreening() {
    this.runningScreen.set(true);
    this.screeningService.triggerManualScreening().subscribe({
      complete: () => {
        this.runningScreen.set(false);
        this.messageService.add({
          severity: 'info',
          summary: 'Screening Dimulai',
          detail: 'Proses berjalan di background. Refresh dalam 2–5 menit.',
          life: 6000,
        });
      },
      error: () => this.runningScreen.set(false),
    });
  }

  async onExportExcel() {
    this.exporting.set(true);
    try {
      const rows     = this.filteredResults();
      const date     = this.selectedDate() ?? new Date().toISOString().split('T')[0];
      const suffix   = this.selectedSector()    ? `_${this.selectedSector()}`           : '';
      const bando    = this.selectedBandoFilter()?.replace(/\s+/g, '-') ?? '';
      const bandoSfx = bando ? `_${bando}` : '';
      const filename = `IDX_Screener_${date}${suffix}${bandoSfx}.xlsx`;
      await this.excelExport.export(rows, filename);
    } finally {
      this.exporting.set(false);
    }
  }

  onSyncSectors() {
    this.syncingSectors.set(true);
    this.screeningService.syncSectors().subscribe({
      next: ({ updated, failed }) => {
        this.syncingSectors.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Sektor Tersinkronisasi',
          detail: `${updated} saham berhasil diperbarui, ${failed} tidak ada data.`,
          life: 6000,
        });
        this.loadResults(this.selectedDate());
      },
      error: () => {
        this.syncingSectors.set(false);
        this.showError('Gagal sinkronisasi data sektor');
      },
    });
  }

  openChart(stock: ScreeningResult) {
    this.selectedStock.set(stock);
    this.chartVisible.set(true);
  }

  // ── Styling helpers ──────────────────────────────────────────────────────

  getBandoSeverity(status: BandarmologyStatus): SeverityType {
    const map: Record<BandarmologyStatus, SeverityType> = {
      'Big Accumulation':   'success',
      'Small Accumulation': 'info',
      'Neutral':            'warn',
      'Distribution':       'danger',
    };
    return map[status] ?? 'secondary';
  }

  getChangeSeverity(change: number): SeverityType {
    if (change > 2)  return 'success';
    if (change < -2) return 'danger';
    return 'warn';
  }

  getRRSeverity(rr: number): SeverityType {
    if (rr >= 3) return 'success';
    if (rr >= 2) return 'info';
    return 'warn';
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#a6e3a1';
    if (score >= 50) return '#89b4fa';
    if (score >= 30) return '#fab387';
    return '#f38ba8';
  }

  getScoreLabel(score: number): string {
    if (score >= 70) return 'Strong';
    if (score >= 50) return 'Moderate';
    if (score >= 30) return 'Weak';
    return 'Skip';
  }

  getCMFColor(cmf: number | undefined): string {
    if (cmf === undefined || cmf === null) return '#585b70';
    if (cmf >= 0.15) return '#a6e3a1';
    if (cmf >= 0.05) return '#89b4fa';
    if (cmf <= -0.10) return '#f38ba8';
    return '#585b70';
  }

  getCMFLabel(cmf: number | undefined): string {
    if (cmf === undefined || cmf === null) return '—';
    return (cmf >= 0 ? '+' : '') + cmf.toFixed(2);
  }

  getOBVIcon(trend: string | undefined): string {
    if (trend === 'rising')  return 'pi-arrow-up-right';
    if (trend === 'falling') return 'pi-arrow-down-right';
    return 'pi-minus';
  }

  getOBVColor(trend: string | undefined): string {
    if (trend === 'rising')  return '#a6e3a1';
    if (trend === 'falling') return '#f38ba8';
    return '#45475a';
  }

  getStreakLabel(streak: number): string {
    if (streak >= 5) return 'On Fire';
    if (streak >= 3) return 'Hot';
    if (streak >= 2) return 'Repeat';
    return 'New';
  }

  getStreakColor(streak: number): string {
    if (streak >= 5) return '#f38ba8';
    if (streak >= 3) return '#a6e3a1';
    if (streak >= 2) return '#89b4fa';
    return '#585b70';
  }

  private showError(detail: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }

  dateDropdownOptions = computed(() =>
    this.selectedDates().map(d => ({ label: d, value: d })),
  );
}
