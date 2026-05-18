import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ScreeningResult } from '../models/screening.model';

interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ScreeningService {
  private readonly api = inject(ApiService);

  getResults(date?: string): Observable<ScreeningResult[]> {
    const params: Record<string, string> = {};
    if (date) params['date'] = date;
    return this.api
      .get<ApiResponse<ScreeningResult[]>>('/api/screening/results', params)
      .pipe(map(r => r.data));
  }

  getAvailableDates(): Observable<string[]> {
    return this.api
      .get<ApiResponse<string[]>>('/api/screening/dates')
      .pipe(map(r => r.data));
  }

  getChartData(code: string, days = 90): Observable<CandlestickData[]> {
    return this.api
      .get<ApiResponse<CandlestickData[]>>(`/api/screening/chart/${code}`, {
        days: days.toString(),
      })
      .pipe(map(r => r.data));
  }

  triggerManualScreening(): Observable<{ message: string }> {
    return this.api
      .post<ApiResponse<{ message: string }>>('/api/screening/run')
      .pipe(map(r => r.data));
  }
}

export interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
