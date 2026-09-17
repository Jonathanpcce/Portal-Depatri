'use strict';
const {id, fail} = require('./cases-core.cjs');
const {fields, counters, uuid, validateMenus, validateDemand, procedureKey, publicDemand, validateFilters, matches} = require('./demands-core.cjs');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;

function createDemandsService({db, hash, now, documentId, cases, attachments}) {
  async function config(reader = ref => ref.get()) {
    const snap = await reader(db.collection('configuracoes').doc('demandas'));
    const crimes = await cases.getCatalog(reader);
    return {menus: validateMenus(snap.exists ? snap.data() : null, crimes), crimes};
  }
  async function bootstrap(request) {
    const access = await cases.getAccess(request), {menus} = await config();
    return {menus, campos: fields, contadores: counters, podeEditar: access.podeCadastrar};
  }
  function mayRead(access, d) {
    if (!access.todasUnidades && d.unidadeChave !== access.unidadeChave) fail('permission-denied', 'Demanda indisponível para sua unidade.');
  }
  async function get(request) {
    const access = await cases.getAccess(request), demandaId = id(request.data?.demandaId, 'Demanda');
    const snap = await db.collection('demandas').doc(demandaId).get();
    if (!snap.exists) fail('not-found', 'Demanda não encontrada.');
    mayRead(access, snap.data()); return publicDemand(snap);
  }
  async function save(request) {
    const access = await cases.getAccess(request);
    if (!access.podeCadastrar) fail('permission-denied', 'Apenas ADMIN e NUIP podem cadastrar ou editar demandas.');
    const payload = request.data || {}, token = uuid(payload.solicitacaoId);
    const editing = !!payload.demandaId;
    const ref = editing ? db.collection('demandas').doc(id(payload.demandaId, 'Demanda')) : db.collection('demandas').doc();
    if (editing && (!Number.isSafeInteger(payload.versao) || payload.versao < 0)) fail('invalid-argument', 'Reabra a demanda para editar.');
    if (!payload.dados || Buffer.byteLength(JSON.stringify(payload.dados), 'utf8') > 700000) fail('invalid-argument', 'Dados da demanda inválidos ou muito extensos.');
    const signature = hash(JSON.stringify(stable({demandaId: payload.demandaId || null, versao: payload.versao ?? null, dados: payload.dados})));
    const requestRef = db.collection('solicitacoesDemandas').doc(hash(`${access.uid}:${token}`));
    return db.runTransaction(async tx => {
      const repeated = await tx.get(requestRef);
      if (repeated.exists) {
        if (repeated.data().assinatura !== signature) fail('already-exists', 'Solicitação já usada. Reabra o formulário antes de alterar os dados.');
        return {...repeated.data().resultado, repetida: true};
      }
      const snap = editing ? await tx.get(ref) : null;
      if (editing && !snap.exists) fail('not-found', 'Demanda não encontrada.');
      const previous = snap?.data();
      if (previous) {
        mayRead(access, previous);
        if ((previous.versao || 0) !== payload.versao) fail('aborted', 'Outro operador alterou esta demanda. Reabra o registro antes de salvar.');
      }
      const {menus} = await config(ref => tx.get(ref));
      const value = validateDemand(payload.dados, menus, previous);
      let relation;
      if (previous && (!Object.hasOwn(value, 'casoId') || value.casoId !== null && value.casoId === previous.casoId)) {
        relation = {casoId: previous.casoId || null, casoNome: previous.casoNome || '', casoNomeChave: previous.casoNomeChave || ''};
      } else relation = await cases.resolveCaseForDemand(tx, value.casoId ?? null);
      const claimRef = db.collection('procedimentosDemandas').doc(hash(procedureKey(value)));
      const claim = await tx.get(claimRef);
      if (claim.exists && claim.data().demandaId && claim.data().demandaId !== ref.id) fail('already-exists', 'O procedimento já foi cadastrado.');
      let oldClaimRef, oldClaim;
      if (previous?.tipoOcorrencia && previous.numOcorrencia && procedureKey(previous) !== procedureKey(value)) {
        oldClaimRef = db.collection('procedimentosDemandas').doc(hash(procedureKey(previous)));
        oldClaim = await tx.get(oldClaimRef);
      }
      const linkAttachments = await attachments.prepareLinks(tx, value, ref.id, access);
      const versao = (previous?.versao || 0) + 1;
      const saved = {...value, ...relation, versao, atualizadoPor: access.uid, atualizadoEm: now()};
      if (editing) tx.update(ref, saved);
      else tx.create(ref, {...saved, criadoPor: access.uid, criadoEm: now()});
      if (claim.exists) tx.update(claimRef, {demandaId: ref.id}); else tx.create(claimRef, {demandaId: ref.id});
      if (oldClaim?.exists && oldClaim.data().demandaId === ref.id) tx.update(oldClaimRef, {demandaId: null});
      linkAttachments();
      const result = {id: ref.id, versao, statusDemanda: saved.statusDemanda, casoId: saved.casoId, casoNome: saved.casoNome};
      tx.create(requestRef, {usuarioId: access.uid, assinatura: signature, resultado: result, criadoEm: now()});
      tx.create(db.collection('auditoriaEventos').doc(), {acao: editing ? 'DEMANDA_ATUALIZADA' : 'DEMANDA_CRIADA', demandaId: ref.id,
        usuarioId: access.uid, versao, casoAnterior: previous?.casoId || null, casoId: saved.casoId, data: now()});
      return result;
    });
  }
  async function search(request) {
    const access = await cases.getAccess(request), f = validateFilters(request.data?.filtros);
    const crimes = await cases.getCatalog();
    const signature = hash(JSON.stringify([access.uid, access.unidadeChave || '*', f]));
    let query = db.collection('demandas');
    if (!access.todasUnidades) query = query.where('unidadeChave', '==', access.unidadeChave);
    if (f.casoId) query = query.where('casoId', '==', f.casoId);
    query = query.orderBy(documentId()).limit(201);
    const cursor = request.data?.cursor;
    if (cursor) {
      if (cursor.filtrosChave !== signature) fail('invalid-argument', 'A pesquisa mudou. Faça uma nova busca.');
      query = query.startAfter(id(cursor.id, 'Página'));
    }
    const snapshot = await query.get(), scanned = snapshot.docs.slice(0, 200), results = [];
    let last = null, consumed = 0;
    for (const doc of scanned) {
      last = doc.id; consumed++;
      if (matches(doc.data(), f, crimes)) {
        const d = doc.data();
        results.push(Object.fromEntries(['dataOcorrencia', 'procedimentoConcat', 'numeroProcedimento', 'unidadeResponsavel', 'casoNome', 'casoId',
          'status', 'statusDemanda', 'crimeTipo', 'procedimentoInstaurado', 'procedimentoNaoInstaurado', 'suspeitosPresos'].map(k => [k, d[k] ?? '']).concat([['id', doc.id]])));
      }
      if (results.length === 50) break;
    }
    const hasMore = consumed < snapshot.docs.length;
    return {resultados: results, proximaPagina: hasMore && last ? {id: last, filtrosChave: signature} : null};
  }
  return {bootstrap, get, save, search};
}
module.exports = {createDemandsService};
