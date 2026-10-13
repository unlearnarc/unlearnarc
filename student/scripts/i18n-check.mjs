#!/usr/bin/env node
/* Locale key-parity check. Compares every non-English locale against en.json.
   CLDR plural-suffix variants (_zero/_two/_few/_many) are treated as equivalent
   to a present _other (so Arabic's richer plural set doesn't flag as drift).
   Exits non-zero on any missing key so CI can block drift. */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'src', 'i18n', 'locales');

const PLURAL = /_(zero|one|two|few|many|other)$/;
const keys = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? keys(v, p + k + '.')
      : [p + k]);

const normalize = (k) => k.replace(PLURAL, '_PLURAL');

const en = JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8'));
const base = new Set(keys(en).map(normalize));

let bad = false;
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json') || f === 'en.json') continue;
  const t = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const have = new Set(keys(t).map(normalize));
  const missing = [...base].filter((k) => !have.has(k));
  if (missing.length) {
    bad = true;
    console.error(`✗ ${f} missing ${missing.length}:`, missing.slice(0, 20).join(', '));
  }
}
if (bad) { console.error('\nPARITY FAILED'); process.exit(1); }
console.log('PARITY OK: all locales in sync');
