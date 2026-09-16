'use strict';

const normalize = value => String(value ?? '').normalize('NFKC').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();

function fail(code, message) {
  const error = new Error(message); error.code = code; throw error;
}
function field(value, name, max = 150, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return '';
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/u.test(value))
    fail('invalid-argument', `${name} inválido.`);
  const clean = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if ((!optional && !clean) || clean.length > max) fail('invalid-argument', `${name} inválido.`);
  return clean;
}
function id(value, label = 'Identificador') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/.test(value))
    fail('invalid-argument', `${label} inválido.`);
  return value;
}
function validateCase(payload, catalog) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('invalid-argument', 'Informe o caso.');
  if (Object.keys(payload).some(k => !['nomeCaso', 'tipoCrime', 'subtipoCrime', 'solicitacaoId'].includes(k)))
    fail('invalid-argument', 'O cadastro aceita apenas nome, tipo e subtipo.');
  const nomeCaso = field(field(payload.nomeCaso, 'Nome do caso').toLocaleUpperCase('pt-BR'), 'Nome do caso');
  const tipo = field(payload.tipoCrime, 'Tipo de crime');
  const subtipo = field(payload.subtipoCrime, 'Subtipo de crime', 150, true);
  const found = catalog.find(c => normalize(c.tipo) === normalize(tipo));
  if (!found) fail('invalid-argument', 'Selecione um tipo de crime do cadastro.');
  const foundSub = found.subtipos.find(s => normalize(s) === normalize(subtipo));
  if ((found.subtipos.length && !foundSub) || (!found.subtipos.length && subtipo))
    fail('invalid-argument', 'Selecione um subtipo compatível com o tipo de crime.');
  if (typeof payload.solicitacaoId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.solicitacaoId))
    fail('invalid-argument', 'Identificador da solicitação inválido.');
  return {nomeCaso, nomeChave: normalize(nomeCaso), tipoCrime: found.tipo,
    subtipoCrime: foundSub || '', solicitacaoId: payload.solicitacaoId};
}
function accessFromProfile(profile) {
  if (!profile || profile.ativo !== true) fail('permission-denied', 'Usuário sem acesso ativo ao portal.');
  const role = normalize(profile.perfil);
  if (['ADMIN', 'ADMINISTRADOR', 'CRIADOR', 'NUIP'].includes(role))
    return {podeCadastrar: true, todasUnidades: true};
  if (['DIRECAO', 'DIRETORIA'].includes(role)) return {podeCadastrar: false, todasUnidades: true};
  if (role === 'DELEGACIA' && normalize(profile.lotacao))
    return {podeCadastrar: false, todasUnidades: false, unidadeChave: normalize(profile.lotacao)};
  fail('permission-denied', 'Perfil ainda não habilitado para este módulo.');
}

// Produz somente um plano. Não altera nem exclui registros da origem.
function planLegacyMigration(caseRows, specificRows, demandRows, catalog) {
  const specific = new Map();
  for (const r of specificRows) {
    const caseId = String(r.ID_CASO ?? '').trim();
    if (!caseId || !String(r.CASO_ESPECIFICO ?? '').trim()) continue;
    if (!specific.has(caseId)) specific.set(caseId, new Map());
    specific.get(caseId).set(normalize(r.CASO_ESPECIFICO), String(r.CASO_ESPECIFICO).trim());
  }
  const cases = caseRows.filter(r => String(r.ID_CASO ?? '').trim()).map(r => {
    const legacyId = String(r.ID_CASO).trim();
    const options = new Map(specific.get(legacyId) || []);
    if (r.CASO_ESPECIFICO) options.set(normalize(r.CASO_ESPECIFICO), String(r.CASO_ESPECIFICO).trim());
    const nomeCaso = (options.size === 1 ? [...options.values()][0] : String(r.NOME_CASO || '')).trim();
    let category = catalog.find(c => normalize(c.tipo) === normalize(r.TIPO_CRIME || r.TIPO_CASO));
    if (!category) category = catalog.find(c => c.subtipos.some(s => normalize(s) === normalize(r.TIPO_CASO)));
    const subtype = category?.subtipos.find(s => normalize(s) === normalize(r.SUBTIPO_CRIME || r.NOME_CASO))
      || (category?.subtipos.length === 1 ? category.subtipos[0] : '');
    const pendencias = [];
    if (!nomeCaso) pendencias.push('NOME_AUSENTE');
    if (options.size > 1) pendencias.push('NOMES_DIVERGENTES_POR_ID');
    if (!category || (category.subtipos.length > 0 && !subtype)) pendencias.push('CLASSIFICACAO_A_REVISAR');
    return {legacyId, nomeCaso, nomeChave: normalize(nomeCaso), tipoCrime: category?.tipo || '',
      subtipoCrime: subtype, pendencias, original: {...r}};
  });
  const byName = new Map();
  for (const c of cases) {
    if (!byName.has(c.nomeChave)) byName.set(c.nomeChave, []);
    byName.get(c.nomeChave).push(c);
  }
  const duplicados = [...byName.entries()].filter(([n, rows]) => n && rows.length > 1)
    .map(([nomeChave, rows]) => ({nomeChave, ids: rows.map(r => r.legacyId)}));
  for (const d of duplicados) for (const c of byName.get(d.nomeChave)) c.pendencias.push('NOME_DUPLICADO');
  const demandas = demandRows.map((r, index) => {
    const casoOriginal = String(r.CASO ?? '').trim();
    const candidates = byName.get(normalize(casoOriginal)) || [];
    const estado = !casoOriginal ? 'SEM_CASO' : candidates.length === 1 ? 'EXATO'
      : candidates.length > 1 ? 'AMBIGUO' : 'SEM_CORRESPONDENCIA';
    return {linhaOrigem: r.linhaOrigem ?? index + 2, casoOriginal, estado,
      legacyCasoId: estado === 'EXATO' ? candidates[0].legacyId : null};
  });
  return {aplicaAlteracoes: false, casos: cases, duplicados, demandas};
}
module.exports = {normalize, fail, field, id, validateCase, accessFromProfile, planLegacyMigration};
