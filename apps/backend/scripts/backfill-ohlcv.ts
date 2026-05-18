/**
 * Script: Backfill 60 hari data OHLCV dari Yahoo Finance ke Supabase
 * Jalankan: npx ts-node -P scripts/tsconfig.json scripts/backfill-ohlcv.ts
 *
 * Yahoo Finance gratis, tidak perlu API key.
 * Format ticker IDX: BBCA.JK, TLKM.JK, dst.
 */
import axios from 'axios';
import { supabase } from './_supabase';

const DAYS_BACK  = 90;   // ambil 90 hari kalender = ~60 hari bursa
const BATCH_SIZE = 5;    // Yahoo Finance rate limit aman
const DELAY_MS   = 400;  // jeda antar request

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchYahooOHLCV(ticker: string) {
  const now     = Math.floor(Date.now() / 1000);
  const from    = now - DAYS_BACK * 86400;

  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`,
      {
        params: { period1: from, period2: now, interval: '1d' },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 12000,
      },
    );

    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp as number[];
    const q          = result.indicators?.quote?.[0] ?? {};
    const adjClose   = result.indicators?.adjclose?.[0]?.adjclose ?? q.close;

    return timestamps
      .map((ts, i) => {
        const close  = Math.round(q.close?.[i]   ?? 0);
        const open   = Math.round(q.open?.[i]    ?? 0);
        const high   = Math.round(q.high?.[i]    ?? 0);
        const low    = Math.round(q.low?.[i]     ?? 0);
        const volume = q.volume?.[i]             ?? 0;

        if (!close || !open) return null;

        return {
          date:      new Date(ts * 1000).toISOString().split('T')[0],
          open, high, low, close,
          volume:    Math.floor(volume / 100),   // lembar → lot
          value:     Math.round(close * volume),  // estimasi nilai IDR
          frequency: 0,
        };
      })
      .filter(Boolean);
  } catch (e: any) {
    return null; // rate limit atau saham tidak ada di Yahoo
  }
}

async function main() {
  console.log('\n📈 Backfill OHLCV dari Yahoo Finance...');

  // Ambil daftar saham dari DB
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select('code')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Gagal ambil daftar saham:', error.message);
    process.exit(1);
  }

  console.log(`Total saham: ${stocks.length}`);
  console.log(`Periode: ${DAYS_BACK} hari kalender (~60 hari bursa)\n`);

  let success = 0, failed = 0, skipped = 0;

  for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
    const batch = stocks.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async ({ code }) => {
        const rows = await fetchYahooOHLCV(`${code}.JK`);

        if (rows === null) {
          failed++;
          return;
        }
        if (rows.length === 0) {
          skipped++;
          return;
        }

        // Tambahkan stock_code ke setiap baris
        const rowsWithCode = rows.map(r => ({ ...r, stock_code: code }));

        const { error: upsertError } = await supabase
          .from('daily_prices')
          .upsert(rowsWithCode, { onConflict: 'stock_code,date' });

        if (upsertError) {
          console.error(`\n  ❌ ${code}: ${upsertError.message}`);
          failed++;
        } else {
          success++;
          process.stdout.write(
            `\r  [${i + batch.length}/${stocks.length}] ✔ ${code.padEnd(6)} ${rows.length} candles | ok:${success} fail:${failed}`,
          );
        }
      }),
    );

    await sleep(DELAY_MS);
  }

  console.log(`\n\n✅ Backfill selesai!`);
  console.log(`  Berhasil : ${success} saham`);
  console.log(`  Gagal    : ${failed} saham`);
  console.log(`  Dilewati : ${skipped} saham (data kosong)`);
  console.log('\nLangkah berikutnya:');
  console.log('  npx ts-node -P scripts/tsconfig.json scripts/seed-broker-mock.ts');
  console.log('  → (opsional) seed mock broker data untuk tes bandarmology');
  console.log('\nATAU langsung run screening:');
  console.log('  curl -X POST http://localhost:3000/api/screening/run');
}

main().catch(console.error);
