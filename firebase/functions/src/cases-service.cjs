'use strict';
const {normalize, fail, field, id, validateCase, accessFromProfile} = require('./cases-core.cjs');

function createCasesService({db, hash, now, documentId}) {
  const publicCase = doc => {
    const d = doc.data();
    return {id: doc.id, nomeCaso: d.nomeCaso, tipoCrime: d.tipoCrime, subtipoCrime: d.subtipoCrime};
  };
  async function context(request) {
    if (!request.auth?.uid) fail('unauthenticated', 'Entre no portal para continuar.');
    const profile = await db.collection('usuarios').doc(request.auth.uid).get();
    return {uid: request.auth.uid, ...accessFromProfile(profile.exists ? profile.data() : null)};
  }
  async function catalog(reader = ref => ref.get()) {
    const snap = await reader(db.collection('configuracoes').doc('crimes'));
    const types = snap.exists && snap.data().tipos;
    if (!Array.isArray(types) || !types.length || types.some(t => !t.tipo || !Array.isArray(t.subtipos)))
      fail('failed-precondition', 'O catálogo de crimes ainda não foi configurado.');
    return types;
  }
  async function bootstrap(request) {
    const access = await context(request);
    const tipos = await catalog();
    let query = db.collection('casos').where('ativo', '==', true)
      .orderBy('nomeChave').orderBy(documentId()).limit(201);
    const cursor = request.data?.cursor;
    if (cursor) query = query.startAfter(field(cursor.nomeChave, 'Página'), id(cursor.id));
    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, 200), last = docs.at(-1);
    return {casos: docs.map(publicCase), tipos, podeCadastrar: access.podeCadastrar,
      proximaPagina: snapshot.docs.length > 200 ? {nomeChave: last.data().nomeChave, id: last.id} : null};
  }
  async function create(request) {
    const access = await context(request);
    if (!access.podeCadastrar) fail('permission-denied', 'Seu perfil permite apenas consultar casos.');
    const caseRef = db.collection('casos').doc();
    const auditRef = db.collection('auditoriaEventos').doc();
    return db.runTransaction(async tx => {
      const value = validateCase(request.data, await catalog(ref => tx.get(ref)));
      const uniqueRef = db.collection('nomesCasos').doc(hash(value.nomeChave));
      const existing = await tx.get(uniqueRef);
      if (existing.exists) {
        const saved = await tx.get(db.collection('casos').doc(existing.data().casoId));
        const prev = saved.exists && saved.data();
        if (prev && prev.ativo === true && prev.criadoPor === access.uid && prev.solicitacaoId === value.solicitacaoId &&
            prev.nomeChave === value.nomeChave && prev.tipoCrime === value.tipoCrime && prev.subtipoCrime === value.subtipoCrime)
          return publicCase(saved);
        fail('already-exists', 'Já existe um caso com esse nome. Selecione o caso cadastrado.');
      }
      tx.create(caseRef, {...value, ativo: true, criadoPor: access.uid, criadoEm: now(), atualizadoEm: now()});
      tx.create(uniqueRef, {nomeChave: value.nomeChave, casoId: caseRef.id});
      tx.create(auditRef, {acao: 'CASO_CRIADO', casoId: caseRef.id, usuarioId: access.uid, data: now()});
      return {id: caseRef.id, nomeCaso: value.nomeCaso, tipoCrime: value.tipoCrime, subtipoCrime: value.subtipoCrime};
    });
  }
  async function demands(request) {
    const access = await context(request);
    const casoId = id(request.data?.casoId, 'Caso');
    const exists = await db.collection('casos').doc(casoId).get();
    if (!exists.exists) fail('not-found', 'Caso não encontrado.');
    let query = db.collection('demandas').where('casoId', '==', casoId);
    if (!access.todasUnidades) query = query.where('unidadeChave', '==', access.unidadeChave);
    query = query.orderBy(documentId()).limit(51);
    if (request.data.cursor) query = query.startAfter(id(request.data.cursor, 'Página'));
    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, 50);
    return {demandas: docs.map(doc => {
      const d = doc.data();
      return {id: doc.id, dataOcorrencia: d.dataOcorrencia || '', numeroProcedimento: d.numeroProcedimento || '',
        unidadeResponsavel: d.unidadeResponsavel || '', status: d.status || '', crimeTipo: d.crimeTipo || ''};
    }), proximaPagina: snapshot.docs.length > 50 ? docs.at(-1).id : null};
  }
  // Pode ser reutilizado pelo salvamento completo da demanda, na MESMA transação.
  async function resolveCaseForDemand(tx, casoId) {
    if (casoId === null) return {casoId: null, casoNome: '', casoNomeChave: ''};
    id(casoId, 'Caso');
    const snapshot = await tx.get(db.collection('casos').doc(casoId));
    if (!snapshot.exists || snapshot.data().ativo !== true) fail('not-found', 'Selecione um caso ativo.');
    const c = snapshot.data();
    return {casoId, casoNome: c.nomeCaso, casoNomeChave: normalize(c.nomeCaso)};
  }
  async function bindDemand(request) {
    const access = await context(request);
    if (!access.podeCadastrar) fail('permission-denied', 'Seu perfil não pode alterar demandas.');
    const demandaId = id(request.data?.demandaId, 'Demanda');
    if (request.data.casoId !== null) id(request.data.casoId, 'Caso');
    const ref = db.collection('demandas').doc(demandaId);
    return db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) fail('not-found', 'Demanda não encontrada.');
      const relation = await resolveCaseForDemand(tx, request.data.casoId);
      tx.update(ref, {...relation, versao: (snapshot.data().versao || 0) + 1, atualizadoPor: access.uid, atualizadoEm: now()});
      tx.create(db.collection('auditoriaEventos').doc(), {acao: 'CASO_DA_DEMANDA_ALTERADO', demandaId,
        casoAnterior: snapshot.data().casoId || null, casoId: relation.casoId, usuarioId: access.uid, data: now()});
      return {demandaId, ...relation};
    });
  }
  return {bootstrap, create, demands, bindDemand, resolveCaseForDemand, getAccess: context, getCatalog: catalog};
}
module.exports = {createCasesService};
