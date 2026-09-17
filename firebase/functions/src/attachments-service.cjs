'use strict';
const {id, field, fail} = require('./cases-core.cjs');
const {uuid, pdfFields} = require('./demands-core.cjs');
const MAX_PDF_BYTES = 10 * 1024 * 1024;
function attachmentIds(d) {
  return [...new Set(pdfFields.flatMap(key => d[key] || []).filter(v => v.startsWith('anexo:')).map(v => id(v.slice(6), 'Anexo')))];
}
function createAttachmentsService({db, files, hash, now, getAccess}) {
  async function upload(request) {
    const access = await getAccess(request);
    if (!access.podeCadastrar) fail('permission-denied', 'Seu perfil não pode enviar anexos.');
    const payload = request.data || {}, token = uuid(payload.solicitacaoId);
    const nome = field(payload.nome, 'Nome do PDF', 200).replace(/[\\/]/g, '_');
    if (!/\.pdf$/i.test(nome) || typeof payload.base64 !== 'string' || payload.base64.length > Math.ceil(MAX_PDF_BYTES / 3) * 4 ||
        payload.base64.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(payload.base64))
      fail('invalid-argument', 'Envie um PDF de até 10 MB.');
    const bytes = Buffer.from(payload.base64, 'base64');
    if (bytes.length < 5 || bytes.length > MAX_PDF_BYTES || bytes.toString('base64') !== payload.base64 || bytes.subarray(0, 5).toString() !== '%PDF-') fail('invalid-argument', 'O arquivo enviado não é um PDF válido.');
    const digest = hash(bytes), anexoId = hash(`${access.uid}:${token}`);
    const ref = db.collection('anexosDemandas').doc(anexoId), existing = await ref.get();
    const same = d => d.criadoPor === access.uid && d.sha256 === digest && d.nome === nome;
    if (existing.exists) {
      if (!same(existing.data())) fail('already-exists', 'Esta solicitação já foi usada para outro arquivo.');
      return {referencia: `anexo:${anexoId}`, nome};
    }
    // Nome imutável por conteúdo: falhas entre Storage e Firestore não sobrescrevem outro arquivo.
    const path = `demandas-pdfs/${anexoId}/${digest}.pdf`;
    await files.write(path, bytes);
    await db.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (current.exists) {
        if (!same(current.data())) fail('already-exists', 'Esta solicitação já foi usada para outro arquivo.');
        return;
      }
      tx.create(ref, {nome, path, sha256: digest, tamanho: bytes.length, criadoPor: access.uid, criadoEm: now(), demandaId: null});
    });
    return {referencia: `anexo:${anexoId}`, nome};
  }
  async function prepareLinks(tx, demand, demandaId, access) {
    const refs = [];
    for (const anexoId of attachmentIds(demand)) {
      const ref = db.collection('anexosDemandas').doc(anexoId), snap = await tx.get(ref);
      if (!snap.exists) fail('not-found', 'Um PDF não foi encontrado. Envie o arquivo novamente.');
      const d = snap.data();
      if (d.demandaId ? d.demandaId !== demandaId : d.criadoPor !== access.uid)
        fail('permission-denied', 'Um PDF não pertence a esta demanda ou à sua sessão de envio.');
      if (!d.demandaId) refs.push(ref);
    }
    return () => refs.forEach(ref => tx.update(ref, {demandaId, vinculadoEm: now()}));
  }
  async function download(request) {
    const access = await getAccess(request), anexoId = id(request.data?.anexoId, 'Anexo');
    const ref = await db.collection('anexosDemandas').doc(anexoId).get();
    if (!ref.exists) fail('not-found', 'PDF não encontrado.');
    const meta = ref.data();
    if (meta.demandaId) {
      const snap = await db.collection('demandas').doc(meta.demandaId).get(), d = snap.exists && snap.data();
      if (!d || !attachmentIds(d).includes(anexoId) || !access.todasUnidades && d.unidadeChave !== access.unidadeChave)
        fail('permission-denied', 'PDF indisponível para seu acesso.');
    } else if (meta.criadoPor !== access.uid || !access.podeCadastrar) fail('permission-denied', 'PDF indisponível para seu acesso.');
    const bytes = await files.read(meta.path);
    if (bytes.length > MAX_PDF_BYTES || hash(bytes) !== meta.sha256) fail('failed-precondition', 'Não foi possível verificar o PDF.');
    return {nome: meta.nome, base64: bytes.toString('base64'), mimeType: 'application/pdf'};
  }
  return {upload, download, prepareLinks};
}
module.exports = {createAttachmentsService, attachmentIds, MAX_PDF_BYTES};
