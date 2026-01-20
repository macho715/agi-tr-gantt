#!/usr/bin/env node
/*
  Convert an hourly tide TSV (like "water tide(jan to march).tsv") into a JSON dataset
  usable by the AGI TR Gantt Generator UI.

  Usage:
    node convert-tide-tsv-to-json.mjs <input.tsv> <output.json>

  Output schema:
    {
      meta: {...},
      hours: [0..23],
      days: [{date: "YYYY-MM-DD", values: number[24], min, max, minHour, maxHour}]
    }
*/

import fs from 'node:fs';
import path from 'node:path';

function parseDateDDMonYYYY(s) {
  // ex: 01-Jan-2026
  const m = s.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) throw new Error(`Invalid date: ${s}`);
  const day = Number(m[1]);
  const monStr = m[2].toLowerCase();
  const year = Number(m[3]);
  const monMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const month = monMap[monStr];
  if (month === undefined) throw new Error(`Invalid month: ${m[2]}`);
  // Use UTC to avoid timezone shifts.
  const d = new Date(Date.UTC(year, month, day));
  return d.toISOString().slice(0, 10);
}

function toNumberMaybe(s) {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseTsvToJson(tsvText) {
  const lines = tsvText.split(/\r?\n/);

  const meta = {};
  const dataLines = [];

  for (const ln of lines) {
    const line = ln.trimEnd();
    if (!line.trim()) continue;

    if (line.startsWith('#')) {
      const s = line.replace(/^#+\s*/, '');
      const kv = s.match(/^([^:]+):\s*(.*)$/);
      if (kv) {
        const key = kv[1].trim().toLowerCase().replace(/\s+/g, '_');
        meta[key] = kv[2].trim();
      } else {
        // Title line
        if (!meta.title) meta.title = s.trim();
      }
      continue;
    }

    dataLines.push(line);
  }

  if (!dataLines.length) throw new Error('No data lines found (expected TSV header + rows).');

  // First non-comment line is the header
  const header = dataLines[0];
  const rows = dataLines.slice(1);

  // Expect 24 hourly columns; header may contain empty cells because of extra tabs.
  const headerParts = header.split('\t').filter(p => p !== '');
  if (headerParts.length < 25) {
    throw new Error(`Header has too few columns: ${headerParts.length}.`);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const days = [];
  for (const ln of rows) {
    const parts = ln.split('\t').filter(p => p !== '');
    if (parts.length !== 25) {
      // Skip malformed line (some tide tables include spacing columns)
      continue;
    }

    const dateIso = parseDateDDMonYYYY(parts[0]);
    const values = parts.slice(1).map(v => {
      const n = toNumberMaybe(v);
      if (n === null) throw new Error(`Non-numeric value for ${dateIso}: ${v}`);
      return n;
    });

    if (values.length !== 24) throw new Error(`Expected 24 values for ${dateIso}, got ${values.length}`);

    let min = Infinity;
    let max = -Infinity;
    let minHour = 0;
    let maxHour = 0;

    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v < min) {
        min = v;
        minHour = i;
      }
      if (v > max) {
        max = v;
        maxHour = i;
      }
    }

    days.push({ date: dateIso, values, min, max, minHour, maxHour });
  }

  if (!days.length) throw new Error('No valid tide rows parsed.');

  meta.start_date = meta.start_date ?? days[0].date;
  meta.end_date = meta.end_date ?? days[days.length - 1].date;

  // Try to extract mean sea level numeric value if present
  const msl = meta.mean_sea_level;
  if (typeof msl === 'string') {
    const m = msl.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (m) meta.meanSeaLevelMeters = Number(m[1]);
  }

  return { meta, hours, days };
}

function main() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    console.error('Usage: node convert-tide-tsv-to-json.mjs <input.tsv> <output.json>');
    process.exit(1);
  }

  const tsvText = fs.readFileSync(inputPath, 'utf8');
  const dataset = parseTsvToJson(tsvText);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf8');

  console.log(`Wrote ${outputPath}`);
  console.log(`Days: ${dataset.days.length}`);
  console.log(`Range: ${dataset.meta.start_date} .. ${dataset.meta.end_date}`);
}

main();
