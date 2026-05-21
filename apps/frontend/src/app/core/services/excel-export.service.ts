import { Injectable } from '@angular/core';
import { Workbook, Cell, Style } from 'exceljs';
import { ScreeningResult } from '../models/screening.model';

// ── Palette (Catppuccin Mocha-inspired, Excel-compatible) ─────────────────────
const C = {
  // backgrounds
  headerBg:   'FF1E1E2E',
  rowBg:      'FF181825',
  rowAltBg:   'FF13131F',
  sectionBg:  'FF11111B',

  // text
  headerText: 'FFCDD6F4',
  textMain:   'FFCDD6F4',
  textMuted:  'FF585B70',
  textSub:    'FF45475A',

  // accents
  green:      'FFA6E3A1',
  blue:       'FF89B4FA',
  orange:     'FFFAB387',
  red:        'FFF38BA8',
  yellow:     'FFF9E2AF',
  purple:     'FFCBA6F7',
  teal:       'FF94E2D5',

  // borders
  border:     'FF313244',
  borderLight:'FF2A2B3D',
} as const;

// ── Column definitions ────────────────────────────────────────────────────────
const COLS = [
  { key: 'no',                  header: 'No',           width: 5  },
  { key: 'stock_code',          header: 'Kode',         width: 10 },
  { key: 'stock_name',          header: 'Nama Emiten',  width: 28 },
  { key: 'sector',              header: 'Sektor',       width: 22 },
  { key: 'streak',              header: 'Streak',       width: 9  },
  { key: 'bandarmology_status', header: 'Money Flow',   width: 20 },
  { key: 'cmf_20',              header: 'CMF',          width: 9  },
  { key: 'obv_trend',           header: 'OBV',          width: 10 },
  { key: 'technical_position',  header: 'Posisi Teknikal', width: 22 },
  { key: 'close_price',         header: 'Harga',        width: 10 },
  { key: 'change_pct',          header: 'Chg%',         width: 9  },
  { key: 'entry_price',         header: 'Entry',        width: 10 },
  { key: 'take_profit_price',   header: 'Target TP',    width: 10 },
  { key: 'cut_loss_price',      header: 'Cut Loss',     width: 10 },
  { key: 'risk_reward_ratio',   header: 'R/R',          width: 8  },
  { key: 'rsi_14',              header: 'RSI',          width: 8  },
  { key: 'volume_ratio',        header: 'Vol/VMA',      width: 10 },
  { key: 'signal_strength',     header: 'Score',        width: 9  },
  { key: 'macd_golden_cross',   header: 'GC',           width: 6  },
  { key: 'obv_divergence',      header: 'OBV Div',      width: 9  },
  { key: 'screening_date',      header: 'Tanggal',      width: 13 },
];

@Injectable({ providedIn: 'root' })
export class ExcelExportService {

  async export(rows: (ScreeningResult & { streak?: number })[], filename: string) {
    const wb   = new Workbook();
    wb.creator  = 'IDX Swing Screener';
    wb.created  = new Date();

    this.buildMainSheet(wb, rows);
    this.buildLegendSheet(wb);

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Main sheet ──────────────────────────────────────────────────────────────
  private buildMainSheet(wb: Workbook, rows: (ScreeningResult & { streak?: number })[]) {
    const ws = wb.addWorksheet('Hasil Screening', {
      views: [{ state: 'frozen', ySplit: 3 }],
      properties: { tabColor: { argb: C.blue.slice(2) } },
    });

    // Set column widths
    ws.columns = COLS.map(c => ({ key: c.key, width: c.width }));

    // ── Title row ──────────────────────────────────────────────────────────
    const titleRow = ws.addRow(['IDX Swing Screener — Hasil Screening']);
    ws.mergeCells(1, 1, 1, COLS.length);
    this.styleTitle(titleRow.getCell(1), rows[0]?.screening_date);

    // ── Sub-info row ───────────────────────────────────────────────────────
    const infoDate   = rows[0]?.screening_date ?? '—';
    const infoRow    = ws.addRow([
      `Tanggal: ${infoDate}   |   Total lolos: ${rows.length} saham   |   Export: ${new Date().toLocaleString('id-ID')}`,
    ]);
    ws.mergeCells(2, 1, 2, COLS.length);
    this.styleInfo(infoRow.getCell(1));

    // ── Header row ─────────────────────────────────────────────────────────
    const hdrRow = ws.addRow(COLS.map(c => c.header));
    hdrRow.height = 20;
    hdrRow.eachCell(cell => this.styleHeader(cell));

    // ── Data rows ──────────────────────────────────────────────────────────
    rows.forEach((r, i) => {
      const isAlt = i % 2 === 1;
      const dataRow = ws.addRow(this.rowValues(r, i));
      dataRow.height = 18;
      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        this.styleDataCell(cell, colNum, r, isAlt);
      });
    });

    // ── Auto-filter on header row ──────────────────────────────────────────
    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to:   { row: 3, column: COLS.length },
    };
  }

  // ── Legend sheet ────────────────────────────────────────────────────────────
  private buildLegendSheet(wb: Workbook) {
    const ws = wb.addWorksheet('Panduan Warna', {
      properties: { tabColor: { argb: C.purple.slice(2) } },
    });
    ws.columns = [{ width: 24 }, { width: 18 }, { width: 42 }];

    const addSection = (title: string) => {
      const r = ws.addRow([title]);
      ws.mergeCells(r.number, 1, r.number, 3);
      r.getCell(1).font   = { bold: true, size: 11, color: { argb: C.yellow.slice(2) } };
      r.getCell(1).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sectionBg.slice(2) } };
      r.getCell(1).border = this.thinBorder();
      ws.addRow([]);
    };

    const addLegendRow = (label: string, colorArgb: string, desc: string) => {
      const r = ws.addRow([label, '', desc]);
      const c = r.getCell(1);
      c.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorArgb.slice(2) } };
      c.font   = { bold: true, color: { argb: 'FF11111B' } };
      c.border = this.thinBorder();
      r.getCell(2).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rowBg.slice(2) } };
      r.getCell(3).font   = { color: { argb: C.textMain.slice(2) } };
      r.getCell(3).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.rowBg.slice(2) } };
      [r.getCell(2), r.getCell(3)].forEach(x => x.border = this.thinBorder());
    };

    ws.addRow(['IDX Screener — Panduan Warna & Kolom']).getCell(1).font =
      { bold: true, size: 13, color: { argb: C.headerText.slice(2) } };
    ws.addRow([]);

    addSection('Money Flow (Kolom F)');
    addLegendRow('Big Accumulation',   C.green,  'CMF ≥ 0.15 — Institusi agresif beli');
    addLegendRow('Small Accumulation', C.blue,   'CMF ≥ 0.05 — Akumulasi moderat');
    addLegendRow('Neutral',            C.yellow, 'CMF antara -0.10 dan 0.05');
    addLegendRow('Distribution',       C.red,    'CMF ≤ -0.10 — Tekanan jual');
    ws.addRow([]);

    addSection('Signal Score (Kolom R)');
    addLegendRow('70 – 100  Strong',   C.green,  'Semua sinyal konfirmasi — entry optimal');
    addLegendRow('50 – 69   Moderate', C.blue,   'Gunakan sizing lebih kecil (50%)');
    addLegendRow('30 – 49   Weak',     C.orange, 'Tunggu konfirmasi tambahan');
    addLegendRow('< 30      Skip',     C.red,    'Tidak direkomendasikan untuk entry');
    ws.addRow([]);

    addSection('Streak (Kolom E)');
    addLegendRow('1 hari   New',     C.textSub, 'Pertama kali muncul hari ini');
    addLegendRow('2 hari   Repeat',  C.blue,    'Lolos 2 hari berturut');
    addLegendRow('3–4 hari Hot',     C.green,   'Sinyal semakin terkonfirmasi');
    addLegendRow('5+ hari  On Fire', C.red,     'Konsisten 5 hari atau lebih — momentum kuat');
    ws.addRow([]);

    addSection('Chg% (Kolom K)');
    addLegendRow('> +2%',   C.green,  'Naik signifikan');
    addLegendRow('-2% – +2%', C.yellow, 'Pergerakan normal');
    addLegendRow('< -2%',   C.red,    'Turun signifikan');
  }

  // ── Row value builder ───────────────────────────────────────────────────────
  private rowValues(r: ScreeningResult & { streak?: number }, i: number): any[] {
    return [
      i + 1,
      r.stock_code,
      r.stock_name ?? '',
      r.sector ?? '—',
      r.streak ?? 1,
      r.bandarmology_status,
      r.cmf_20 != null ? +r.cmf_20.toFixed(3) : 0,
      r.obv_trend ?? '—',
      r.technical_position,
      r.close_price,
      r.change_pct != null ? +r.change_pct.toFixed(2) : 0,
      r.entry_price,
      r.take_profit_price,
      r.cut_loss_price,
      r.risk_reward_ratio != null ? +r.risk_reward_ratio.toFixed(2) : 0,
      r.rsi_14 != null ? +r.rsi_14.toFixed(1) : 0,
      r.volume_ratio != null ? +r.volume_ratio.toFixed(2) : 0,
      r.signal_strength,
      r.macd_golden_cross ? '✓' : '',
      r.obv_divergence    ? '✓' : '',
      r.screening_date,
    ];
  }

  // ── Cell styler ─────────────────────────────────────────────────────────────
  private styleDataCell(
    cell: Cell,
    colNum: number,
    r: ScreeningResult & { streak?: number },
    isAlt: boolean,
  ) {
    const baseBg = isAlt ? C.rowAltBg : C.rowBg;

    cell.font   = { name: 'Calibri', size: 10, color: { argb: C.textMain.slice(2) } };
    cell.border = this.thinBorder();
    cell.alignment = { vertical: 'middle', horizontal: 'left' };

    let bg: string        = baseBg;
    let textColor: string = C.textMain;
    let bold              = false;

    switch (colNum) {
      // No
      case 1:
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        textColor = C.textMuted;
        break;

      // Kode saham
      case 2:
        textColor = C.blue;
        bold = true;
        cell.font = { name: 'Courier New', size: 10, bold: true, color: { argb: C.blue.slice(2) } };
        break;

      // Streak
      case 5: {
        const s = r.streak ?? 1;
        const sc = s >= 5 ? C.red : s >= 3 ? C.green : s >= 2 ? C.blue : C.textSub;
        bg = this.alphaBlend(sc, baseBg, 0.18);
        textColor = sc;
        bold = true;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        break;
      }

      // Money Flow
      case 6: {
        const bmap: Record<string, string> = {
          'Big Accumulation':   C.green,
          'Small Accumulation': C.blue,
          'Neutral':            C.yellow,
          'Distribution':       C.red,
        };
        const bc = bmap[r.bandarmology_status] ?? C.textMuted;
        bg = this.alphaBlend(bc, baseBg, 0.2);
        textColor = bc;
        bold = true;
        break;
      }

      // CMF
      case 7: {
        const cmf = r.cmf_20 ?? 0;
        textColor = cmf >= 0.15 ? C.green : cmf >= 0.05 ? C.blue : cmf <= -0.1 ? C.red : C.textMuted;
        cell.font = { name: 'Courier New', size: 10, bold: true, color: { argb: textColor.slice(2) } };
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '+0.000;-0.000;0.000';
        break;
      }

      // OBV
      case 8: {
        const oc = r.obv_trend === 'rising' ? C.green : r.obv_trend === 'falling' ? C.red : C.textMuted;
        textColor = oc;
        break;
      }

      // Harga, Entry, TP, CL
      case 10:
      case 12:
      case 13:
      case 14:
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (colNum === 12) textColor = C.blue;
        if (colNum === 13) textColor = C.green;
        if (colNum === 14) textColor = C.red;
        bold = colNum !== 10;
        break;

      // Chg%
      case 11: {
        const chg = r.change_pct ?? 0;
        const cc  = chg > 2 ? C.green : chg < -2 ? C.red : C.yellow;
        bg = this.alphaBlend(cc, baseBg, 0.18);
        textColor = cc;
        bold = true;
        cell.numFmt = '+0.00%;-0.00%;0.00%';
        cell.value  = (r.change_pct ?? 0) / 100;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        break;
      }

      // R/R
      case 15: {
        const rr = r.risk_reward_ratio ?? 0;
        const rc = rr >= 3 ? C.green : rr >= 2 ? C.blue : C.yellow;
        textColor = rc;
        bold = true;
        cell.numFmt = '"1:"0.0';
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        break;
      }

      // RSI
      case 16: {
        const rsi = r.rsi_14 ?? 0;
        textColor = rsi >= 30 && rsi <= 55 ? C.blue : rsi < 30 ? C.green : C.red;
        cell.numFmt = '0.0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        break;
      }

      // Vol/VMA
      case 17:
        textColor = r.volume_spike ? C.green : C.textMuted;
        bold = r.volume_spike;
        cell.numFmt = '0.00"×"';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        break;

      // Score
      case 18: {
        const sc  = r.signal_strength ?? 0;
        const scc = sc >= 70 ? C.green : sc >= 50 ? C.blue : sc >= 30 ? C.orange : C.red;
        bg = this.alphaBlend(scc, baseBg, 0.22);
        textColor = scc;
        bold = true;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        break;
      }

      // GC + OBV Div
      case 19:
      case 20:
        textColor = cell.value === '✓' ? C.green : C.textSub;
        bold = cell.value === '✓';
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        break;

      // Tanggal
      case 21:
        textColor = C.textMuted;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        break;
    }

    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg.slice(2) } };
    if (!['Courier New'].includes((cell.font as any)?.name)) {
      cell.font = { name: 'Calibri', size: 10, bold, color: { argb: textColor.slice(2) } };
    }
  }

  // ── Style helpers ───────────────────────────────────────────────────────────
  private styleTitle(cell: Cell, date?: string) {
    cell.value = `IDX Swing Screener  —  Hasil Screening ${date ?? ''}`;
    cell.font  = { name: 'Calibri', size: 14, bold: true, color: { argb: C.headerText.slice(2) } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: '221A1A2E' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    (cell.worksheet.getRow(Number(cell.row)) as any).height = 26;
  }

  private styleInfo(cell: Cell) {
    cell.font  = { name: 'Calibri', size: 9, italic: true, color: { argb: C.textSub.slice(2) } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sectionBg.slice(2) } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    (cell.worksheet.getRow(Number(cell.row)) as any).height = 16;
  }

  private styleHeader(cell: Cell) {
    cell.font      = { name: 'Calibri', size: 10, bold: true, color: { argb: C.headerText.slice(2) } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg.slice(2) } };
    cell.border    = this.thinBorder(C.border);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  }

  private thinBorder(color: string = C.borderLight): Partial<Style['border']> {
    const s = { style: 'thin' as const, color: { argb: color.slice(2) } };
    return { top: s, bottom: s, left: s, right: s };
  }

  // Blend accent color onto dark base at given opacity
  private alphaBlend(accent: string, base: string, alpha: number): string {
    const parse = (hex: string) => {
      const h = hex.replace(/^FF/, '');
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    };
    const a = parse(accent), b = parse(base);
    const r = Math.round(a[0] * alpha + b[0] * (1 - alpha));
    const g = Math.round(a[1] * alpha + b[1] * (1 - alpha));
    const bl= Math.round(a[2] * alpha + b[2] * (1 - alpha));
    return `FF${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`.toUpperCase();
  }
}
