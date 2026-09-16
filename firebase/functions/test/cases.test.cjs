const test = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {validateCase, normalize, planLegacyMigration} = require('../src/cases-core.cjs');
const {createCasesService} = require('../src/cases-service.cjs');
const {FakeDB} = require('./fake-db.cjs');
const {tipos} = require('../../config/crimes.json');
const uuid = '0e0aa947-430d-44df-80df-7d3a26467436';
const payload = () => ({nomeCaso: 'FURTO DE HILUX', tipoCrime: 'FURTO', subtipoCrime: 'FURTO DE VEICULO', solicitacaoId: uuid});
function setup(extra = {}) {
  const db = new FakeDB({'configuracoes/crimes': {tipos}, 'usuarios/operador': {ativo: true, perfil: 'NUIP'},
    'usuarios/delegacia': {ativo: true, perfil: 'DELEGACIA', lotacao: 'DRFV'}, ...extra});
  const service = createCasesService({db, hash: s => createHash('sha256').update(s).digest('hex'), now: () => 123456,
    documentId: () => '__name__'});
  return {db, service};
}
const request = (data = {}, uid = 'operador') => ({auth: {uid}, data});
test('catálogo contém nove tipos, 25 subtipos e OUTROS sem subtipo', () => {
  assert.equal(tipos.length, 9); assert.equal(tipos.reduce((n, t) => n + t.subtipos.length, 0), 25);
  assert.equal(validateCase({...payload(), tipoCrime: 'OUTROS', subtipoCrime: ''}, tipos).subtipoCrime, '');
});
test('nome é normalizado; tipo e subtipo precisam ser compatíveis', () => {
  assert.equal(normalize('  Furto   de veículo '), 'FURTO DE VEICULO');
  assert.equal(validateCase({...payload(), subtipoCrime: 'furto de veículo'}, tipos).subtipoCrime, 'FURTO DE VEICULO');
  assert.throws(() => validateCase({...payload(), subtipoCrime: 'ROUBO A PESSOA'}, tipos), {code: 'invalid-argument'});
  assert.throws(() => validateCase({...payload(), subtipoCrime: ''}, tipos), {code: 'invalid-argument'});
});
test('rejeita campos administrativos, vazios, controles e valores excessivos', () => {
  for (const changes of [{perfil: 'ADMIN'}, {nomeCaso: ''}, {nomeCaso: 'A\nB'}, {nomeCaso: 'X'.repeat(151)}, {tipoCrime: 'INVENTADO'}])
    assert.throws(() => validateCase({...payload(), ...changes}, tipos), {code: 'invalid-argument'});
});
test('todas as operações exigem sessão; perfil do navegador não concede acesso', async () => {
  const {service} = setup();
  for (const method of ['bootstrap', 'create', 'demands', 'bindDemand'])
    await assert.rejects(service[method]({data: {...payload(), usuarioLogin: 'admin', perfil: 'ADMIN'}}), {code: 'unauthenticated'});
  await assert.rejects(service.create(request(payload(), 'inexistente')), {code: 'permission-denied'});
});
test('perfil de consulta e usuário inativo não cadastram', async () => {
  const {service} = setup({'usuarios/inativo': {ativo: false, perfil: 'ADMIN'}});
  await assert.rejects(service.create(request(payload(), 'delegacia')), {code: 'permission-denied'});
  await assert.rejects(service.bootstrap(request({}, 'inativo')), {code: 'permission-denied'});
});
test('grava caso, índice de nome e auditoria juntos; lista retorna o caso', async () => {
  const {service, db} = setup(); const saved = await service.create(request(payload()));
  assert.equal((await service.bootstrap(request())).casos[0].id, saved.id);
  for (const collection of ['casos', 'nomesCasos', 'auditoriaEventos'])
    assert.equal(Object.keys(db.rows).filter(p => p.startsWith(collection + '/')).length, 1);
  assert.equal(db.rows['casos/' + saved.id].criadoPor, 'operador');
});
test('solicitações concorrentes de mesmo nome produzem apenas um caso', async () => {
  const {service, db} = setup();
  const results = await Promise.allSettled([
    service.create(request(payload())),
    service.create(request({...payload(), nomeCaso: '  furto   de hilux ', solicitacaoId: '84f00a25-3a27-4a21-ae30-f2fa93dbd20a'}))
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'already-exists');
  assert.equal(Object.keys(db.rows).filter(p => p.startsWith('casos/')).length, 1);
});
test('repetição da mesma solicitação é idempotente; conteúdo alterado é recusado', async () => {
  const {service} = setup();
  const first = await service.create(request(payload()));
  assert.deepEqual(await service.create(request(payload())), first);
  await assert.rejects(service.create(request({...payload(), subtipoCrime: 'FURTO DE CARGA'})), {code: 'already-exists'});
});
test('classificação inválida não deixa gravações parciais', async () => {
  const {service, db} = setup(); const before = structuredClone(db.rows);
  await assert.rejects(service.create(request({...payload(), subtipoCrime: 'SEQUESTRO'})), {code: 'invalid-argument'});
  assert.deepEqual(db.rows, before);
});
test('demanda de outra unidade não é devolvida ao perfil DELEGACIA', async () => {
  const {service} = setup({'casos/caso1': {ativo: true},
    'demandas/d1': {casoId: 'caso1', unidadeChave: 'DRFV', unidadeResponsavel: 'DRFV', nomeVitima: 'não deve sair'},
    'demandas/d2': {casoId: 'caso1', unidadeChave: 'DAS', unidadeResponsavel: 'DAS'}});
  const result = await service.demands(request({casoId: 'caso1'}, 'delegacia'));
  assert.deepEqual(result.demandas.map(d => d.id), ['d1']);
  assert.equal('nomeVitima' in result.demandas[0], false);
  assert.equal((await service.demands(request({casoId: 'caso1'}))).demandas.length, 2);
});
test('paginação não perde casos nem demandas', async () => {
  const extra = {};
  for (let i = 0; i < 203; i++) extra[`casos/c${String(i).padStart(3, '0')}`] = {ativo: true, nomeCaso: `CASO ${i}`, nomeChave: `CASO ${String(i).padStart(3, '0')}`};
  for (let i = 0; i < 53; i++) extra[`demandas/d${String(i).padStart(3, '0')}`] = {casoId: 'c000'};
  const {service} = setup(extra), page1 = await service.bootstrap(request());
  const page2 = await service.bootstrap(request({cursor: page1.proximaPagina}));
  assert.equal(page1.casos.length, 200); assert.equal(page2.casos.length, 3); assert.equal(page2.proximaPagina, null);
  const d1 = await service.demands(request({casoId: 'c000'}));
  const d2 = await service.demands(request({casoId: 'c000', cursor: d1.proximaPagina}));
  assert.equal(d1.demandas.length, 50); assert.equal(d2.demandas.length, 3);
});
test('vincula demanda por ID sem alterar seu crime; vínculo inválido mantém original', async () => {
  const {service, db} = setup({'casos/caso1': {ativo: true, nomeCaso: 'CASO UM'},
    'demandas/d1': {crimeTipo: 'FURTO DE CARGA', casoId: null}});
  await service.bindDemand(request({demandaId: 'd1', casoId: 'caso1'}));
  assert.equal(db.rows['demandas/d1'].casoNome, 'CASO UM');
  assert.equal(db.rows['demandas/d1'].crimeTipo, 'FURTO DE CARGA');
  await assert.rejects(service.bindDemand(request({demandaId: 'd1', casoId: 'ausente'})), {code: 'not-found'});
  assert.equal(db.rows['demandas/d1'].casoId, 'caso1');
  await assert.rejects(service.bindDemand(request({demandaId: 'd1', casoId: null}, 'delegacia')), {code: 'permission-denied'});
});
test('migração preserva homônimos e referências sem correspondência', () => {
  const rows = [{ID_CASO: '2', NOME_CASO: 'FURTO DE VEICULO', TIPO_CASO: 'FURTO', CASO_ESPECIFICO: 'FURTO DE HILUX'},
    {ID_CASO: '13', NOME_CASO: 'FURTO DE VEICULO', TIPO_CASO: 'FURTO', CASO_ESPECIFICO: 'FURTO DE HILUX'}];
  const before = structuredClone(rows);
  const plan = planLegacyMigration(rows, [], [{CASO: 'FURTO DE HILUX'}, {CASO: 'FURTO DE VEICULO'}, {CASO: ''}], tipos);
  assert.equal(plan.aplicaAlteracoes, false); assert.deepEqual(rows, before);
  assert.equal(plan.duplicados.length, 1); assert.deepEqual(plan.duplicados[0].ids, ['2', '13']);
  assert.deepEqual(plan.demandas.map(d => d.estado), ['AMBIGUO', 'SEM_CORRESPONDENCIA', 'SEM_CASO']);
  assert.ok(plan.demandas.every(d => d.legacyCasoId === null));
});
