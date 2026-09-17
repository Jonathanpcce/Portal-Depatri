'use strict';
const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue, FieldPath} = require('firebase-admin/firestore');
const {getStorage} = require('firebase-admin/storage');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {createHash} = require('node:crypto');
const {createCasesService} = require('./cases-service.cjs');
const {createDemandsService} = require('./demands-service.cjs');
const {createAttachmentsService} = require('./attachments-service.cjs');
initializeApp();
const dependencies = {db: getFirestore(), now: () => FieldValue.serverTimestamp(),
  hash: value => createHash('sha256').update(value, 'utf8').digest('hex'), documentId: () => FieldPath.documentId()};
const service = createCasesService(dependencies);
const attachments = createAttachmentsService({...dependencies, getAccess: service.getAccess, files: {
  async write(path, bytes) {
    try {
      await getStorage().bucket().file(path).save(bytes, {resumable: false, validation: 'crc32c',
        preconditionOpts: {ifGenerationMatch: 0}, metadata: {contentType: 'application/pdf', cacheControl: 'private, no-store'}});
    } catch (error) { if (Number(error.code) !== 412) throw error; }
  },
  async read(path) { const [bytes] = await getStorage().bucket().file(path).download(); return bytes; }
}});
const demands = createDemandsService({...dependencies, cases: service, attachments});
const project = process.env.GCLOUD_PROJECT;
const cors = ['https://portaldepatri.com.br', 'https://www.portaldepatri.com.br'];
if (project) cors.push(`https://${project}.web.app`, `https://${project}.firebaseapp.com`);
if (process.env.FUNCTIONS_EMULATOR === 'true') cors.push(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);
const known = new Set(['invalid-argument', 'permission-denied', 'unauthenticated', 'already-exists', 'not-found', 'failed-precondition', 'aborted']);
const expose = (handler, options = {}) => onCall({region: 'southamerica-east1', maxInstances: 5, timeoutSeconds: 60, cors, ...options}, async request => {
  try { return await handler(request); }
  catch (error) {
    if (known.has(error.code)) throw new HttpsError(error.code, error.message);
    console.error('Falha no Portal DEPATRI', {code: error.code || 'internal'});
    throw new HttpsError('internal', 'Não foi possível concluir. Tente novamente.');
  }
});
exports.obterBootstrapCasosPrioritarios = expose(service.bootstrap);
exports.salvarCasoPrioritarioSemEventos = expose(service.create);
exports.listarDemandasCasoPrioritario = expose(service.demands);
exports.vincularCasoDemanda = expose(service.bindDemand);
exports.obterBootstrapDemandasAtivas = expose(demands.bootstrap);
exports.obterDemandaAtiva = expose(demands.get);
exports.salvarDemandaAtiva = expose(demands.save);
exports.pesquisarDemandasAtivas = expose(demands.search);
const pdfOptions = {memory: '512MiB', concurrency: 4, timeoutSeconds: 120};
exports.enviarPdfDemanda = expose(attachments.upload, pdfOptions);
exports.baixarPdfDemanda = expose(attachments.download, pdfOptions);
