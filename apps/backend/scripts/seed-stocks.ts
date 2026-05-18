/**
 * Script: Seed master data saham IDX ke Supabase
 * Jalankan: npx ts-node -P scripts/tsconfig.json scripts/seed-stocks.ts
 */
import { supabase } from './_supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Master data saham IDX: LQ45 + IDX30 + saham populer lainnya
// market_cap dalam IDR (estimasi)
// listed_shares dalam lembar
// ─────────────────────────────────────────────────────────────────────────────
const IDX_STOCKS = [
  // Bank Big 4 + BCA
  { code: 'BBCA', name: 'Bank Central Asia Tbk',            sector: 'Keuangan',          market_cap: 1_155_000_000_000_000, listed_shares: 123_456_790_000 },
  { code: 'BBRI', name: 'Bank Rakyat Indonesia Tbk',         sector: 'Keuangan',          market_cap: 700_000_000_000_000,   listed_shares: 164_890_946_000 },
  { code: 'BMRI', name: 'Bank Mandiri (Persero) Tbk',        sector: 'Keuangan',          market_cap: 530_000_000_000_000,   listed_shares: 46_666_666_700 },
  { code: 'BBNI', name: 'Bank Negara Indonesia Tbk',         sector: 'Keuangan',          market_cap: 200_000_000_000_000,   listed_shares: 18_648_656_458 },
  { code: 'BBTN', name: 'Bank Tabungan Negara Tbk',          sector: 'Keuangan',          market_cap: 22_000_000_000_000,    listed_shares: 10_590_000_000 },
  // Telco
  { code: 'TLKM', name: 'Telkom Indonesia (Persero) Tbk',   sector: 'Teknologi',         market_cap: 315_000_000_000_000,   listed_shares: 99_062_216_600 },
  { code: 'ISAT', name: 'Indosat Tbk',                       sector: 'Teknologi',         market_cap: 90_000_000_000_000,    listed_shares: 8_064_000_000  },
  { code: 'EXCL', name: 'XL Axiata Tbk',                    sector: 'Teknologi',         market_cap: 30_000_000_000_000,    listed_shares: 10_687_000_000 },
  // Energi & Tambang
  { code: 'ADRO', name: 'Alamtri Resources Indonesia Tbk',   sector: 'Energi',            market_cap: 80_000_000_000_000,    listed_shares: 31_985_962_000 },
  { code: 'PTBA', name: 'Bukit Asam Tbk',                   sector: 'Energi',            market_cap: 40_000_000_000_000,    listed_shares: 11_521_000_000 },
  { code: 'ITMG', name: 'Indo Tambangraya Megah Tbk',        sector: 'Energi',            market_cap: 25_000_000_000_000,    listed_shares: 1_129_925_000  },
  { code: 'HRUM', name: 'Harum Energy Tbk',                  sector: 'Energi',            market_cap: 15_000_000_000_000,    listed_shares: 2_703_505_000  },
  { code: 'PGAS', name: 'Perusahaan Gas Negara Tbk',         sector: 'Energi',            market_cap: 50_000_000_000_000,    listed_shares: 24_241_508_200 },
  { code: 'INCO', name: 'Vale Indonesia Tbk',                sector: 'Tambang',           market_cap: 22_000_000_000_000,    listed_shares: 9_936_338_720  },
  { code: 'ANTM', name: 'Aneka Tambang Tbk',                 sector: 'Tambang',           market_cap: 35_000_000_000_000,    listed_shares: 24_030_764_000 },
  { code: 'TINS', name: 'Timah Tbk',                         sector: 'Tambang',           market_cap: 8_000_000_000_000,     listed_shares: 7_447_753_000  },
  // Infrastruktur & Konstruksi
  { code: 'JSMR', name: 'Jasa Marga (Persero) Tbk',          sector: 'Infrastruktur',     market_cap: 25_000_000_000_000,    listed_shares: 6_800_000_000  },
  { code: 'WIKA', name: 'Wijaya Karya (Persero) Tbk',        sector: 'Konstruksi',        market_cap: 5_000_000_000_000,     listed_shares: 8_970_000_000  },
  { code: 'PTPP', name: 'PP (Persero) Tbk',                  sector: 'Konstruksi',        market_cap: 5_500_000_000_000,     listed_shares: 8_200_000_000  },
  // Properti
  { code: 'BSDE', name: 'Bumi Serpong Damai Tbk',            sector: 'Properti',          market_cap: 28_000_000_000_000,    listed_shares: 19_246_696_192 },
  { code: 'CTRA', name: 'Ciputra Development Tbk',           sector: 'Properti',          market_cap: 22_000_000_000_000,    listed_shares: 18_562_852_800 },
  // Consumer
  { code: 'UNVR', name: 'Unilever Indonesia Tbk',            sector: 'Consumer',          market_cap: 85_000_000_000_000,    listed_shares: 38_150_000_000 },
  { code: 'ICBP', name: 'Indofood CBP Sukses Makmur Tbk',    sector: 'Consumer',          market_cap: 80_000_000_000_000,    listed_shares: 11_661_908_000 },
  { code: 'INDF', name: 'Indofood Sukses Makmur Tbk',        sector: 'Consumer',          market_cap: 55_000_000_000_000,    listed_shares: 8_780_000_000  },
  { code: 'MYOR', name: 'Mayora Indah Tbk',                  sector: 'Consumer',          market_cap: 35_000_000_000_000,    listed_shares: 22_358_699_725 },
  { code: 'SIDO', name: 'Industri Jamu & Farmasi Sido Muncul',sector: 'Consumer',         market_cap: 12_000_000_000_000,    listed_shares: 15_000_000_000 },
  { code: 'GGRM', name: 'Gudang Garam Tbk',                  sector: 'Consumer',          market_cap: 45_000_000_000_000,    listed_shares: 1_924_088_000  },
  { code: 'KLBF', name: 'Kalbe Farma Tbk',                   sector: 'Farmasi',           market_cap: 35_000_000_000_000,    listed_shares: 46_875_122_110 },
  // Otomotif & Industri
  { code: 'ASII', name: 'Astra International Tbk',           sector: 'Otomotif',          market_cap: 200_000_000_000_000,   listed_shares: 40_484_135_000 },
  { code: 'UNTR', name: 'United Tractors Tbk',               sector: 'Otomotif',          market_cap: 75_000_000_000_000,    listed_shares: 3_730_135_136  },
  { code: 'AUTO', name: 'Astra Otoparts Tbk',                sector: 'Otomotif',          market_cap: 8_000_000_000_000,     listed_shares: 4_819_733_000  },
  // Ritel & Consumer Staples
  { code: 'AMRT', name: 'Sumber Alfaria Trijaya Tbk',        sector: 'Ritel',             market_cap: 80_000_000_000_000,    listed_shares: 34_017_485_000 },
  { code: 'MAPI', name: 'Mitra Adiperkasa Tbk',              sector: 'Ritel',             market_cap: 18_000_000_000_000,    listed_shares: 3_878_986_000  },
  // Tech & Digital
  { code: 'GOTO', name: 'GoTo Gojek Tokopedia Tbk',          sector: 'Teknologi',         market_cap: 73_000_000_000_000,    listed_shares: 1_185_931_520_000 },
  { code: 'BUKA', name: 'Bukalapak.com Tbk',                 sector: 'Teknologi',         market_cap: 15_000_000_000_000,    listed_shares: 227_428_000_000 },
  { code: 'EMTK', name: 'Elang Mahkota Teknologi Tbk',       sector: 'Teknologi',         market_cap: 20_000_000_000_000,    listed_shares: 14_900_000_000 },
  // Semen & Material
  { code: 'SMGR', name: 'Semen Indonesia (Persero) Tbk',     sector: 'Material',          market_cap: 25_000_000_000_000,    listed_shares: 5_931_520_000  },
  { code: 'INTP', name: 'Indocement Tunggal Prakarsa Tbk',   sector: 'Material',          market_cap: 20_000_000_000_000,    listed_shares: 3_681_231_699  },
  // Agribisnis
  { code: 'AALI', name: 'Astra Agro Lestari Tbk',            sector: 'Agribisnis',        market_cap: 14_000_000_000_000,    listed_shares: 1_574_745_000  },
  { code: 'BUMI', name: 'Bumi Resources Tbk',                sector: 'Energi',            market_cap: 10_000_000_000_000,    listed_shares: 56_362_930_000 },
  // Tower & Menara
  { code: 'TBIG', name: 'Tower Bersama Infrastructure Tbk',  sector: 'Infrastruktur',     market_cap: 40_000_000_000_000,    listed_shares: 10_840_000_000 },
  { code: 'TOWR', name: 'Sarana Menara Nusantara Tbk',       sector: 'Infrastruktur',     market_cap: 32_000_000_000_000,    listed_shares: 49_868_300_000 },
  { code: 'MTEL', name: 'Dayamitra Telekomunikasi Tbk',      sector: 'Infrastruktur',     market_cap: 28_000_000_000_000,    listed_shares: 98_500_000_000 },
  // Kimia & Petrokimia
  { code: 'TPIA', name: 'Chandra Asri Pacific Tbk',          sector: 'Kimia',             market_cap: 45_000_000_000_000,    listed_shares: 7_185_992_000  },
  { code: 'BRPT', name: 'Barito Pacific Tbk',                sector: 'Kimia',             market_cap: 35_000_000_000_000,    listed_shares: 33_879_082_000 },
  { code: 'ESSA', name: 'PT Essa Industries Indonesia Tbk',  sector: 'Kimia',             market_cap: 6_000_000_000_000,     listed_shares: 8_000_000_000  },
  // Poultry & Agro
  { code: 'CPIN', name: 'Charoen Pokphand Indonesia Tbk',    sector: 'Agribisnis',        market_cap: 60_000_000_000_000,    listed_shares: 16_398_000_000 },
  { code: 'JPFA', name: 'Japfa Comfeed Indonesia Tbk',       sector: 'Agribisnis',        market_cap: 15_000_000_000_000,    listed_shares: 10_660_522_100 },
  // Asuransi & Multifinance
  { code: 'BBCA', name: 'Bank Central Asia Tbk',             sector: 'Keuangan',          market_cap: 1_155_000_000_000_000, listed_shares: 123_456_790_000 },
  // Lainnya LQ45
  { code: 'AKRA', name: 'AKR Corporindo Tbk',                sector: 'Distribusi',        market_cap: 20_000_000_000_000,    listed_shares: 3_912_000_000  },
  { code: 'ERAA', name: 'Erajaya Swasembada Tbk',            sector: 'Ritel',             market_cap: 7_000_000_000_000,     listed_shares: 2_890_000_000  },
  // Saham populer tambahan
  { code: 'BREN', name: 'Barito Renewables Energy Tbk',      sector: 'Energi',            market_cap: 150_000_000_000_000,   listed_shares: 97_814_000_000 },
  { code: 'AMMN', name: 'Amman Mineral Internasional Tbk',   sector: 'Tambang',           market_cap: 300_000_000_000_000,   listed_shares: 96_600_000_000 },
  { code: 'CUAN', name: 'Petrindo Jaya Kreasi Tbk',          sector: 'Energi',            market_cap: 50_000_000_000_000,    listed_shares: 8_800_000_000  },
  { code: 'DSSA', name: 'Dian Swastatika Sentosa Tbk',       sector: 'Energi',            market_cap: 45_000_000_000_000,    listed_shares: 610_000_000    },
  { code: 'MBMA', name: 'Merdeka Battery Materials Tbk',     sector: 'Tambang',           market_cap: 30_000_000_000_000,    listed_shares: 31_000_000_000 },
];

// Hapus duplikat berdasarkan code
const uniqueStocks = Array.from(
  new Map(IDX_STOCKS.map(s => [s.code, s])).values()
).map(s => ({ ...s, is_active: true }));

async function main() {
  console.log(`\n🌱 Seeding ${uniqueStocks.length} saham IDX ke Supabase...`);

  // Test koneksi
  const { error: testError } = await supabase
    .from('stocks')
    .select('code')
    .limit(1);

  if (testError) {
    console.error('❌ Koneksi Supabase gagal:', testError.message);
    console.error('\nPastikan:');
    console.error('  1. SUPABASE_URL sudah benar (tanpa /rest/v1/)');
    console.error('  2. SUPABASE_SERVICE_KEY sudah benar (satu baris penuh)');
    console.error('  3. SQL migration (001_initial_schema.sql) sudah dijalankan di Supabase');
    process.exit(1);
  }

  // Upsert stocks
  const BATCH_SIZE = 20;
  let inserted = 0;

  for (let i = 0; i < uniqueStocks.length; i += BATCH_SIZE) {
    const batch = uniqueStocks.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('stocks')
      .upsert(batch, { onConflict: 'code' });

    if (error) {
      console.error(`❌ Error batch ${i}-${i + BATCH_SIZE}:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  Progress: ${inserted}/${uniqueStocks.length} saham`);
    }
  }

  console.log(`\n✅ Selesai! ${inserted} saham berhasil di-seed.`);
  console.log('\nLangkah berikutnya:');
  console.log('  npx ts-node -P scripts/tsconfig.json scripts/backfill-ohlcv.ts');
}

main().catch(console.error);
