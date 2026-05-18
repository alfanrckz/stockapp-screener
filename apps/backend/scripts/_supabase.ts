/**
 * Shared Supabase client untuk scripts (Node.js 20 compatible)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Polyfill WebSocket sebelum Supabase dimuat (Node.js 20 tidak punya native WS)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WS = require('ws');
if (!(globalThis as any).WebSocket) {
  (globalThis as any).WebSocket = WS;
}

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('❌ SUPABASE_URL atau SUPABASE_SERVICE_KEY tidak ada di .env');
  process.exit(1);
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
