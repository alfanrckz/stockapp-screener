# IDX Swing Screener — Arsitektur & Panduan Setup

## Stack
| Layer       | Teknologi                        | Deployment      |
|-------------|----------------------------------|-----------------|
| Frontend    | Angular 18 + PrimeNG + TV Charts | Vercel/Netlify  |
| Backend     | NestJS (TypeScript)              | Render Free     |
| Database    | Supabase (PostgreSQL)            | Supabase Free   |
| Data Source | Yahoo Finance (gratis)           | -               |

---

## Struktur Folder

```
stockapp/
├── apps/
│   ├── backend/                  # NestJS API
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── screening/    ← Core logic
│   │       │   │   └── engines/
│   │       │   │       ├── anti-gorengan.engine.ts
│   │       │   │       ├── bandarmology.engine.ts
│   │       │   │       ├── technical.engine.ts
│   │       │   │       └── trading-plan.engine.ts
│   │       │   ├── stocks/
│   │       │   └── cron/         ← EOD scheduler (16:15 WIB)
│   │       ├── database/
│   │       │   └── supabase.service.ts
│   │       └── shared/
│   │           ├── interfaces/
│   │           └── utils/
│   │               └── technical-indicators.util.ts
│   └── frontend/                 # Angular SPA
│       └── src/app/
│           ├── features/screener/
│           │   ├── screener.component.*
│           │   └── chart-modal/
│           ├── core/
│           │   ├── models/
│           │   └── services/
│           └── shared/pipes/
└── database/
    └── migrations/001_initial_schema.sql
```

---

## Alur Screening (4 Tahap)

```
Semua Saham Aktif (700+)
        │
        ▼
[1] Anti-Gorengan Filter
    ✗ Avg value 20d < Rp 5M → ELIMINASI
    ✗ Market cap < Rp 500M  → ELIMINASI
    ✗ Stagnan tanpa vol breakout → ELIMINASI
        │ LOLOS
        ▼
[2] Bandarmology Engine
    → Hitung net flow per broker (5/10/20 hari)
    → Klasifikasi: Big Accum / Small Accum / Neutral / Distribution
    → Deteksi Volume Spike (>1.5x VMA20)
    → Deteksi Retail Panic Selling
    ✗ Distribution aktif → SKIP
        │
        ▼
[3] Technical Validation
    → MA20, MA50, RSI(14), MACD(12,26,9)
    → Support & Resistance (Swing Pivot)
    ✗ Below All MA + RSI overbought → ELIMINASI
        │ LOLOS
        ▼
[4] Trading Plan Calculator
    → Entry: dekat support / avg top buyers
    → Cut Loss: 2 fraksi di bawah support
    → Take Profit: swing resistance
    → R/R Ratio (min 1:2)
    ✗ R/R < 2 → ELIMINASI
        │
        ▼
   Signal Strength Score (0-100)
   Simpan ke database
```

---

## Setup Development

### 1. Supabase
```bash
# Buat project baru di supabase.com
# Jalankan SQL di database/migrations/001_initial_schema.sql
# Copy SUPABASE_URL dan SUPABASE_SERVICE_KEY ke apps/backend/.env
```

### 2. Backend
```bash
cd apps/backend
cp .env.example .env
# Edit .env dengan kredensial Supabase
npm install
npm run dev
# API berjalan di http://localhost:3000
# Swagger: http://localhost:3000/docs
```

### 3. Frontend
```bash
cd apps/frontend
npm install
npm run dev
# App berjalan di http://localhost:4200
```

### 4. Seed Data Awal
Gunakan endpoint `POST /api/stocks` atau insert manual ke tabel `stocks`:
```sql
INSERT INTO stocks (code, name, sector, market_cap, listed_shares)
VALUES
  ('BBCA', 'Bank Central Asia Tbk', 'Keuangan', 1000000000000000, 123456789),
  ('TLKM', 'Telkom Indonesia Tbk', 'Telekomunikasi', 500000000000000, 100000000);
```

---

## API Endpoints

| Method | Path                          | Deskripsi                          |
|--------|-------------------------------|------------------------------------|
| GET    | /api/screening/results        | Hasil screening terbaru            |
| GET    | /api/screening/results?date=X | Hasil screening tanggal tertentu   |
| GET    | /api/screening/dates          | Daftar tanggal tersedia            |
| GET    | /api/screening/chart/:code    | OHLCV untuk TradingView chart      |
| POST   | /api/screening/run            | Trigger manual screening           |
| GET    | /api/stocks                   | Daftar semua saham aktif           |

---

## Konfigurasi Cron Job

Default: **Senin-Jumat 16:15 WIB** (09:15 UTC)

Ubah di `.env`:
```
EOD_CRON_SCHEDULE=15 9 * * 1-5
```

---

## Tentang Data Broker

Sumber data broker BEI:
- **Gratis (scraping):** idx.co.id/id/data-pasar/ringkasan-perdagangan/broker-summary
- **Berbayar:** RTI Business API, Stockbit API Pro
- **Development:** Seed manual via SQL insert ke tabel `broker_transactions`

Yahoo Finance digunakan untuk data OHLCV (gratis, format: BBCA.JK).
