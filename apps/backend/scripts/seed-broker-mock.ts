/**
 * Script: Generate mock broker transaction data untuk dev/testing
 * Mensimulasikan akumulasi institusional (bandar) di saham pilihan.
 *
 * Jalankan: npx ts-node -P scripts/tsconfig.json scripts/seed-broker-mock.ts
 */
import { supabase } from './_supabase';

// Broker institusional asing (sering jadi "bandar" di IDX)
const FOREIGN_BROKERS   = ['DB', 'MS', 'CS', 'BK', 'AK', 'ZP', 'CLSA'];
// Broker ritel domestik (sering panic sell)
const RETAIL_BROKERS    = ['YP', 'CC', 'XL', 'NI', 'OD', 'HP', 'KK'];

// Saham yang diberi skenario akumulasi kuat
const ACCUMULATION_STOCKS = ['BBCA', 'BMRI', 'TLKM', 'GOTO', 'AMMN', 'BREN'];
// Saham yang netral
const NEUTRAL_STOCKS      = ['ASII', 'UNVR', 'KLBF', 'SMGR', 'CPIN'];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getLastNTradingDays(n: number): string[] {
  const dates: string[] = [];
  const d = new Date();
  while (dates.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      dates.push(d.toISOString().split('T')[0]);
    }
    d.setDate(d.getDate() - 1);
  }
  return dates;
}

function generateAccumulationRows(
  stockCode: string,
  closePrice: number,
  dates: string[],
  scenario: 'accumulation' | 'neutral',
) {
  const rows: object[] = [];

  for (const date of dates) {
    const allBrokers = [...FOREIGN_BROKERS, ...RETAIL_BROKERS];

    for (const broker of allBrokers) {
      const isForeign = FOREIGN_BROKERS.includes(broker);
      const isRetail  = RETAIL_BROKERS.includes(broker);

      let buyLot  = randomInt(1000, 5000);
      let sellLot = randomInt(1000, 5000);

      if (scenario === 'accumulation') {
        if (isForeign) {
          // Asing agresif beli
          buyLot  = randomInt(8000, 30000);
          sellLot = randomInt(500,  3000);
        } else if (isRetail) {
          // Ritel jual (panic / profit taking)
          buyLot  = randomInt(500,  2000);
          sellLot = randomInt(6000, 20000);
        }
      } else {
        // Neutral: acak imbang
        buyLot  = randomInt(2000, 8000);
        sellLot = randomInt(2000, 8000);
      }

      const buyValue  = buyLot  * 100 * closePrice;
      const sellValue = sellLot * 100 * closePrice;

      rows.push({
        stock_code:  stockCode,
        date,
        broker_code: broker,
        buy_lot:     buyLot,
        buy_value:   buyValue,
        sell_lot:    sellLot,
        sell_value:  sellValue,
      });
    }
  }

  return rows;
}

async function main() {
  console.log('\n🏦 Seeding mock broker transaction data...\n');

  const tradingDays = getLastNTradingDays(20);

  // Ambil harga penutupan terbaru untuk setiap saham
  const allStocks = [...ACCUMULATION_STOCKS, ...NEUTRAL_STOCKS];
  const { data: prices } = await supabase
    .from('daily_prices')
    .select('stock_code, close')
    .in('stock_code', allStocks)
    .order('date', { ascending: false });

  const latestPrices: Record<string, number> = {};
  for (const p of prices ?? []) {
    if (!latestPrices[p.stock_code]) {
      latestPrices[p.stock_code] = p.close;
    }
  }

  let totalRows = 0;

  for (const code of allStocks) {
    const close    = latestPrices[code] ?? 1000;
    const scenario = ACCUMULATION_STOCKS.includes(code) ? 'accumulation' : 'neutral';
    const rows     = generateAccumulationRows(code, close, tradingDays, scenario);

    const { error } = await supabase
      .from('broker_transactions')
      .upsert(rows, { onConflict: 'stock_code,date,broker_code' });

    if (error) {
      console.error(`  ❌ ${code}: ${error.message}`);
    } else {
      totalRows += rows.length;
      console.log(`  ✔ ${code.padEnd(6)} [${scenario.padEnd(13)}] ${rows.length} rows`);
    }
  }

  console.log(`\n✅ Selesai! ${totalRows} broker transaction rows di-seed.`);
  console.log('\nLangkah berikutnya — jalankan screening:');
  console.log('  curl -X POST http://localhost:3000/api/screening/run');
  console.log('\nAtau via browser:');
  console.log('  Buka http://localhost:4200 → klik tombol "Run Screening"');
}

main().catch(console.error);
