import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.scss'],
})
export class GuideComponent {
  readonly timeline = [
    {
      time: '08:00',
      label: 'Review Watchlist',
      desc: 'Buka screener, review hasil dari malam sebelumnya. Catat saham dengan score ≥ 60 dan CMF positif.',
      cls: 'review',
      icon: 'pi-list',
    },
    {
      time: '08:45',
      label: 'Pre-Opening',
      desc: 'Pasar mulai tawar menawar harga. Pasang order limit di entry_price yang tertera, jangan market order.',
      cls: 'pre',
      icon: 'pi-clock',
    },
    {
      time: '09:00 – 09:30',
      label: 'Entry Window',
      desc: 'Window terbaik untuk entry. Konfirmasi: harga menyentuh entry_price + volume ≥ 1.2× VMA. Jangan chase jika harga sudah naik > 2%.',
      cls: 'entry',
      icon: 'pi-arrow-circle-right',
      highlight: true,
    },
    {
      time: '11:00 – 11:30',
      label: 'Pantau Sesi 1',
      desc: 'Cek apakah harga bergerak sesuai arah. Jika sudah +3% pertimbangkan partial profit. Jika mendekati CL, siap exit.',
      cls: 'monitor',
      icon: 'pi-eye',
    },
    {
      time: '15:00 – 15:55',
      label: 'Pantau Penutupan',
      desc: 'Keputusan hold/exit berdasarkan harga penutupan, bukan intraday. Jika close < cut_loss_price → exit besok pagi.',
      cls: 'monitor',
      icon: 'pi-eye',
    },
    {
      time: '16:30 – 17:00',
      label: 'Screening Time',
      desc: 'Data EOD tersedia. Jalankan screening (cron otomatis atau manual). Hasil tersedia dalam 2–5 menit.',
      cls: 'screening',
      icon: 'pi-refresh',
      highlight: true,
    },
    {
      time: '19:00 – 21:00',
      label: 'Review Malam',
      desc: 'Waktu terbaik analisis tenang. Buka screener, pilih kandidat untuk besok. Tulis watchlist maksimal 3–5 saham.',
      cls: 'review',
      icon: 'pi-moon',
    },
  ];

  readonly criteria = [
    {
      step: '01',
      title: 'Filter Likuiditas',
      subtitle: 'Anti-Gorengan (Auto)',
      color: '#a6e3a1',
      icon: 'pi-shield',
      items: [
        { label: 'Avg transaksi harian ≥ Rp 5 Miliar', desc: 'Cukup likuid untuk keluar kapan saja tanpa slippage' },
        { label: 'Market cap ≥ Rp 500 Miliar', desc: 'Bukan saham microcap yang mudah dimanipulasi' },
        { label: 'Tidak stagnan', desc: 'Range harga ≥ 2% dalam 20 hari — ada pergerakan nyata' },
      ],
      note: 'Semua saham di hasil screener sudah lolos filter ini secara otomatis.',
    },
    {
      step: '02',
      title: 'Konfirmasi Dana Institusi',
      subtitle: 'CMF + OBV Analysis',
      color: '#89b4fa',
      icon: 'pi-building',
      items: [
        { label: 'CMF ≥ 0.05 (Small Accum)', desc: 'Tekanan beli mendominasi selama 20 hari' },
        { label: 'CMF ≥ 0.15 (Big Accum)', desc: 'Institusi sangat agresif beli — sinyal terkuat' },
        { label: 'OBV Trend: Rising', desc: 'Volume mengonfirmasi arah kenaikan harga' },
        { label: 'OBV Divergence', desc: 'Harga turun tapi OBV naik = smart money akumulasi diam-diam' },
      ],
      note: 'Hindari CMF < -0.10 (Distribution) kecuali ada volume spike ekstrem.',
    },
    {
      step: '03',
      title: 'Timing Teknikal',
      subtitle: 'RSI + MACD + Moving Average',
      color: '#f9e2af',
      icon: 'pi-chart-bar',
      items: [
        { label: 'RSI 14 antara 30 – 55', desc: 'Zona recovery oversold, bukan overbought. RSI > 70 = hindari' },
        { label: 'Posisi: Above MA20 / MA50', desc: 'Tren jangka menengah masih naik' },
        { label: 'Rebound from Support', desc: 'Harga memantul dari level support — momen entry ideal' },
        { label: 'MACD Golden Cross (bonus)', desc: 'Konfirmasi momentum naik mulai terbentuk' },
      ],
      note: 'Hindari saham dengan posisi "Below All MA" — tren sedang turun.',
    },
    {
      step: '04',
      title: 'Manajemen Risiko',
      subtitle: 'Trading Plan R:R ≥ 1:2',
      color: '#cba6f7',
      icon: 'pi-calculator',
      items: [
        { label: 'Entry dekat support + 1–2 fraksi buffer', desc: 'Harga entry terdekat dari level beli terbaik' },
        { label: 'Cut Loss di bawah swing support', desc: 'Paling jauh 5% dari entry — dibatasi otomatis' },
        { label: 'Take Profit di resistance terdekat', desc: 'Minimal 2× jarak entry ke CL' },
        { label: 'Max sizing: 5–10% modal per trade', desc: 'Diversifikasi, jangan all-in satu saham' },
      ],
      note: 'Semua saham di hasil screener sudah memenuhi R:R ≥ 1:2.',
    },
  ];

  readonly scoreBreakdown = [
    { cond: 'Volume Spike (> 1.5× VMA20)', pts: '+20', color: '#a6e3a1' },
    { cond: 'OBV Divergence (Smart Money Accumulating)', pts: '+15', color: '#89b4fa' },
    { cond: 'Big Accumulation (CMF ≥ 0.15)', pts: '+30', color: '#a6e3a1' },
    { cond: 'Small Accumulation (CMF ≥ 0.05)', pts: '+15', color: '#a6e3a1' },
    { cond: 'Distribution (CMF ≤ -0.10)', pts: '-20', color: '#f38ba8' },
    { cond: 'RSI 30 – 50 (Zona Ideal)', pts: '+15', color: '#f9e2af' },
    { cond: 'MACD Golden Cross', pts: '+10', color: '#f9e2af' },
    { cond: 'Risk/Reward ≥ 3:1', pts: '+10', color: '#cba6f7' },
    { cond: 'Risk/Reward ≥ 2:1', pts: '+5', color: '#cba6f7' },
  ];

  readonly dos = [
    'Pasang limit order, bukan market order — hindari slippage',
    'Set cut loss di aplikasi broker sejak awal masuk posisi',
    'Entry hanya jika harga masih ≤ entry_price + 2 fraksi',
    'Konfirmasi volume hari H entry ≥ 1.2× VMA sebelum beli',
    'Maksimal 3–5 saham aktif sekaligus untuk fokus monitoring',
    'Exit bertahap: partial profit di +5%, sisanya tunggu TP penuh',
  ];

  readonly donts = [
    'Jangan average down sebelum CL tercapai — ini bukan investasi',
    'Jangan chase harga yang sudah naik > 3% dari entry_price',
    'Jangan hold melewati cut_loss_price karena "yakin akan balik"',
    'Jangan entry saat IHSG sedang downtrend tajam (konteks makro)',
    'Jangan trading saham yang volume-nya < 0.5× VMA hari itu',
    'Jangan abaikan screening malam — keputusan terbaik dibuat tenang',
  ];
}
