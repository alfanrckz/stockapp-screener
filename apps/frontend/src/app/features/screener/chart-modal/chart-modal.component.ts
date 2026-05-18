import {
  Component, Input, Output, EventEmitter, OnChanges, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, inject, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import {
  createChart, IChartApi, ISeriesApi,
  CandlestickSeries, HistogramSeries,
  ColorType, CrosshairMode, Time,
} from 'lightweight-charts';
import { ScreeningService, CandlestickData } from '../../../core/services/screening.service';
import { ScreeningResult } from '../../../core/models/screening.model';

@Component({
  selector: 'app-chart-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TagModule, SkeletonModule],
  templateUrl: './chart-modal.component.html',
  styleUrls: ['./chart-modal.component.scss'],
})
export class ChartModalComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() stock: ScreeningResult | null = null;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef<HTMLDivElement>;

  private readonly screeningService = inject(ScreeningService);

  loading = false;
  chart: IChartApi | null = null;
  candleSeries: ISeriesApi<'Candlestick'> | null = null;
  volumeSeries: ISeriesApi<'Histogram'> | null = null;

  ngAfterViewInit() {
    // Chart diinisialisasi setelah dialog terbuka
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true && this.stock) {
      setTimeout(() => this.initAndLoadChart(), 100);
    }
    if (changes['visible']?.currentValue === false) {
      this.destroyChart();
    }
  }

  private initAndLoadChart() {
    if (!this.chartContainer?.nativeElement || !this.stock) return;

    this.destroyChart();
    this.loading = true;

    const container = this.chartContainer.nativeElement;
    container.innerHTML = '';

    this.chart = createChart(container, {
      width:  container.clientWidth || 800,
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: '#1e1e2e' },
        textColor:  '#cdd6f4',
      },
      grid: {
        vertLines:   { color: '#313244' },
        horzLines:   { color: '#313244' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#45475a' },
      timeScale: {
        borderColor: '#45475a',
        timeVisible: true,
      },
    });

    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor:          '#a6e3a1',
      downColor:        '#f38ba8',
      borderUpColor:    '#a6e3a1',
      borderDownColor:  '#f38ba8',
      wickUpColor:      '#a6e3a1',
      wickDownColor:    '#f38ba8',
    });

    this.volumeSeries = this.chart.addSeries(HistogramSeries, {
      color:  '#585b70',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    this.chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    this.screeningService.getChartData(this.stock.stock_code, 120).subscribe({
      next: (data) => {
        this.setChartData(data);
        this.addTradingLines();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private setChartData(data: CandlestickData[]) {
    if (!this.candleSeries || !this.volumeSeries) return;

    const candles = data.map(d => ({
      time:  d.date as Time,
      open:  d.open,
      high:  d.high,
      low:   d.low,
      close: d.close,
    }));

    const volumes = data.map(d => ({
      time:  d.date as Time,
      value: d.volume,
      color: d.close >= d.open ? '#a6e3a1' : '#f38ba8',
    }));

    this.candleSeries.setData(candles);
    this.volumeSeries.setData(volumes);
    this.chart!.timeScale().fitContent();
  }

  private addTradingLines() {
    if (!this.stock || !this.candleSeries) return;

    const lines = [
      { price: this.stock.entry_price,       color: '#89b4fa', title: 'Entry',     lineStyle: 0 },
      { price: this.stock.take_profit_price,  color: '#a6e3a1', title: 'TP',        lineStyle: 1 },
      { price: this.stock.cut_loss_price,     color: '#f38ba8', title: 'Cut Loss',  lineStyle: 1 },
      { price: this.stock.support_level,      color: '#fab387', title: 'Support',   lineStyle: 2 },
      { price: this.stock.resistance_level,   color: '#cba6f7', title: 'Resistance',lineStyle: 2 },
    ];

    for (const line of lines) {
      if (line.price > 0) {
        this.candleSeries.createPriceLine({
          price:     line.price,
          color:     line.color,
          lineWidth: 1,
          lineStyle: line.lineStyle as any,
          axisLabelVisible: true,
          title: line.title,
        });
      }
    }
  }

  private destroyChart() {
    if (this.chart) {
      this.chart.remove();
      this.chart        = null;
      this.candleSeries = null;
      this.volumeSeries = null;
    }
  }

  onHide() {
    this.destroyChart();
    this.visibleChange.emit(false);
  }

  ngOnDestroy() {
    this.destroyChart();
  }
}
