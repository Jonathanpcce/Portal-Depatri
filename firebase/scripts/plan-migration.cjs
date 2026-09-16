'use strict';
const fs = require('node:fs');
const {planLegacyMigration} = require('../functions/src/cases-core.cjs');
const {tipos} = require('../config/crimes.json');
function asObjects(rows) {
  if (!Array.isArray(rows)) throw new Error('Cada aba deve ser um array.');
  if (!rows.length || !Array.isArray(rows[0])) return rows;
  const [headers, ...values] = rows;
  return values.map((row, index) => ({...Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])), linhaOrigem: index + 2}));
}
try {
  const input = process.argv[2];
  if (!input) throw new Error('Uso: node scripts/plan-migration.cjs data/origem.json > migration-output/plano.json');
  const data = JSON.parse(fs.readFileSync(input, 'utf8'));
  const result = planLegacyMigration(asObjects(data.INVEST_CASOS), asObjects(data.CASO_ESPECIFICO), asObjects(data.DEMANDAS_ATIVAS), tipos);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} catch (error) { console.error(error.message); process.exitCode = 1; }
