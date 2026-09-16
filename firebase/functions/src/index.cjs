'use strict';
const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue, FieldPath} = require('firebase-admin/firestore');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {createHash} = require('node:crypto');
const {createCasesService} = require('./cases-service.cjs');
initializeApp();
const service = createCasesService({db: getFirestore(), now: () => FieldValue.serverTimestamp(),
  hash: value => createHash('sha256').update(value, 'utf8').digest('hex'), documentId: () => FieldPath.documentId()});
const project = process.env.GCLOUD_PROJECT;
const cors = ['https://portaldepatri.com.br', 'https://www.portaldepatri.com.br'];
if (project) cors.push(`https://${project}.web.app`, `https://${project}.firebaseapp.com`);
if (process.env.FUNCTIONS_EMULATOR === 'true') cors.push(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);
const known = new Set(['invalid-argument', 'permission-denied', 'unauthenticated', 'already-exists', 'not-found', 'failed-precondition']);
const expose = handler => onCall({region: 'southamerica-east1', maxInstances: 5, timeoutSeconds: 60, cors}, async request => {
  try { return await handler(request); }
  catch (error) {
    if (known.has(error.code)) throw new HttpsError(error.code, error.message);
    console.error('Falha no módulo de casos', {code: error.code || 'internal'});
    throw new HttpsError('internal', 'Não foi possível concluir. Tente novamente.');
  }
});
exports.obterBootstrapCasosPrioritarios = expose(service.bootstrap);
exports.salvarCasoPrioritarioSemEventos = expose(service.create);
exports.listarDemandasCasoPrioritario = expose(service.demands);
exports.vincularCasoDemanda = expose(service.bindDemand);
