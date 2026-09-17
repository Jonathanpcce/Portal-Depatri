'use strict';
const {readFileSync} = require('node:fs');
const {demandMenusFromLegacy} = require('../functions/src/config-from-legacy.cjs');
const [projectId, source] = process.argv.slice(2), apply = process.argv.includes('--apply');
if (!projectId || !source || !/^[a-z][a-z0-9-]{4,62}$/.test(projectId)) throw new Error('Uso: node scripts/seed-demand-config.cjs ID_PROJETO data/DB_CONFIG.json [--apply]');
const menus = demandMenusFromLegacy(JSON.parse(readFileSync(source, 'utf8')));
console.log(JSON.stringify({projeto: projectId, gravar: apply, opcoes: Object.fromEntries(Object.entries(menus).filter(([,v]) => Array.isArray(v)).map(([k,v]) => [k, v.length]))}));
if (!apply) { console.log('Prévia concluída. Nenhuma gravação foi feita.'); process.exit(0); }
const {projects} = JSON.parse(readFileSync(require('node:path').join(__dirname, '../.firebaserc'), 'utf8'));
if (!process.env.FIRESTORE_EMULATOR_HOST && projectId !== projects.default) throw new Error('O projeto não corresponde ao destino deste repositório.');
const adminRequire = require('node:module').createRequire(require.resolve('../functions/package.json'));
const {initializeApp} = adminRequire('firebase-admin/app');
const {getFirestore, FieldValue} = adminRequire('firebase-admin/firestore');
initializeApp({projectId});
getFirestore().collection('configuracoes').doc('demandas').create({...menus, criadoEm: FieldValue.serverTimestamp()})
  .then(() => console.log('Menus de Demandas Ativas importados.'))
  .catch(error => { console.error(error.code === 6 ? 'A configuração já existe. Nenhum dado foi substituído.' : error.message); process.exitCode = 1; });
