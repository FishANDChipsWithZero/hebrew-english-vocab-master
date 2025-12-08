#!/usr/bin/env node
// Simple converter: take a plain text or CSV file and convert to JSON array suitable for public/bands
// Usage: node scripts/convert_gemini_to_json.js input.txt output.json

const fs = require('fs');
const path = require('path');

if (process.argv.length < 4) {
  console.error('Usage: node scripts/convert_gemini_to_json.js <input-file> <output-file.json>');
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!fs.existsSync(inputPath)) {
  console.error('Input file not found:', inputPath);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');
const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

const items = [];
let idCounter = 1;

for (const line of lines) {
  // Try to parse CSV-like: english,hebrew
  // If the line contains a comma, split at the first comma
  const commaIdx = line.indexOf(',');
  if (commaIdx !== -1) {
    const english = line.slice(0, commaIdx).trim();
    const hebrew = line.slice(commaIdx + 1).trim();
    items.push({ id: `item-${idCounter++}`, english, hebrew, successCount: 0 });
    continue;
  }

  // If no comma, maybe it's tab-separated
  const tabIdx = line.indexOf('\t');
  if (tabIdx !== -1) {
    const english = line.slice(0, tabIdx).trim();
    const hebrew = line.slice(tabIdx + 1).trim();
    items.push({ id: `item-${idCounter++}`, english, hebrew, successCount: 0 });
    continue;
  }

  // If the line contains ' - ' or ' — ' or ' : ' try to split
  const separators = [' - ', ' — ', ' : ', ':', '\u2014'];
  let parsed = false;
  for (const sep of separators) {
    if (line.includes(sep)) {
      const [english, hebrew] = line.split(sep).map(s => s.trim());
      items.push({ id: `item-${idCounter++}`, english, hebrew, successCount: 0 });
      parsed = true;
      break;
    }
  }
  if (parsed) continue;

  // Otherwise, if line seems like single word, push with empty hebrew
  // Or if the line has slash-separated english/hebrew
  const slashIdx = line.indexOf('/');
  if (slashIdx !== -1) {
    const [english, hebrew] = line.split('/').map(s => s.trim());
    items.push({ id: `item-${idCounter++}`, english, hebrew, successCount: 0 });
    continue;
  }

  // fallback: put whole line into english
  items.push({ id: `item-${idCounter++}`, english: line, hebrew: '', successCount: 0 });
}

// Ensure output directory exists
const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf8');
console.log('Wrote', items.length, 'items to', outputPath);
