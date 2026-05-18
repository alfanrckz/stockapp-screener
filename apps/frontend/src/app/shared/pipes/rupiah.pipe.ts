import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'rupiah', standalone: true, pure: true })
export class RupiahPipe implements PipeTransform {
  transform(value: number | null | undefined, unit: 'full' | 'billion' | 'million' = 'full'): string {
    if (value === null || value === undefined) return '-';

    if (unit === 'billion') {
      const bil = value / 1_000_000_000;
      return `Rp ${bil >= 1000 ? (bil / 1000).toFixed(1) + 'T' : bil.toFixed(1) + 'M'}`;
    }
    if (unit === 'million') {
      return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
    }

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
