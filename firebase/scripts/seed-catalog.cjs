'use strict';
const adminRequire = require('node:module').createRequire(require.resolve('../functions/package.json'));
const {initializeApp} = adminRequire('firebase-admin/app');
const {getFirestore, FieldValue} = adminRequire('firebase-admin/firestore');
const {tipos, schemaVersion} = require('../config/crimes.json');
const projectId = process.argv[2];
if (!projectId || !/^[a-z][a-z0-9-]{4,62}$/.test(projectId)) throw new Error('Informe o ID exato do projeto Firebase.');
if (!process.env.FIRESTORE_EMULATOR_HOST && !process.argv.includes('--apply'))
  throw new Error('Para gravar em produção, informe --apply junto ao ID do projeto.');
initializeApp({projectId});
getFirestore().collection('configuracoes').doc('crimes').create({schemaVersion, tipos, criadoEm: FieldValue.serverTimestamp()})
  .then(() => console.log(`Catálogo criado em ${projectId}.`))
  .catch(error => { console.error(error.code === 6 ? 'O catálogo já existe. Nenhum dado foi substituído.' : error.message); process.exitCode = 1; });
