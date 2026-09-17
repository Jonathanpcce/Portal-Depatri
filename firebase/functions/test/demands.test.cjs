'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {setup, data} = require('./demands-harness.cjs');
const {demandMenusFromLegacy} = require('../src/config-from-legacy.cjs');
const {reasons} = require('../src/demands-core.cjs');
const {MAX_PDF_BYTES} = require('../src/attachments-service.cjs');
test('menus são importados da DB_CONFIG, sem nomes de unidades ou status inventados', async () => {
  const value = demandMenusFromLegacy({DB_CONFIG: [['CATEGORIA', 'NOME', 'VALOR_EXTRA'], ['STATUS', 'EM ANDAMENTO', ''], ['UNIDADE RESPONSÁVEL', 'UNIDADE A', ''],
    ['EQUIPE', 'IGNORAR NOME', 'EQUIPE TESTE'], ['TIPO DE OCORRÊNCIA', 'B.O', ''], ['STATUS', 'em andamento', ''], ['IGNORAR', 'VALOR', '']]});
  assert.deepEqual(value, {schemaVersion: 1, status: ['EM ANDAMENTO'], unidade: ['UNIDADE A'], equipe: ['EQUIPE TESTE'], tipoOcorrencia: ['B.O']});
  const {db, demands, request} = setup(); assert.equal((await demands.bootstrap(request())).podeEditar, true);
  delete db.rows['configuracoes/demandas']; await assert.rejects(demands.bootstrap(request()), {code: 'failed-precondition'});
});
test('salvar uma demanda confirma o nome do caso no servidor e mantém contadores e detalhes', async () => {
  const {cases, demands, request, save, db} = setup();
  const c = await cases.create(request({nomeCaso: 'FURTO DE HILUX', tipoCrime: 'FURTO', subtipoCrime: 'FURTO DE VEICULO', solicitacaoId: randomUUID()}));
  const saved = await save({casoId: c.id, nomeVitima: 'PESSOA FICTÍCIA', suspeitosIdent: 1, nomesSuspeitos: ['NOME DE TESTE'], veiculosRecuperados: 1,
    placasVeiculosRecuperados: ['AAA0A00'], marcasVeiculosRecuperados: ['MARCA TESTE'], observacoesVeiculosRecuperados: ['Observação do veículo'], observacoes: 'Linha 1\nLinha 2'});
  const full = await demands.get(request({demandaId: saved.id}));
  assert.equal(saved.casoNome, 'FURTO DE HILUX'); assert.equal(full.casoId, c.id); assert.equal(full.versao, 1);
  assert.deepEqual(full.nomesSuspeitos, ['NOME DE TESTE']); assert.equal(full.observacoes, 'Linha 1\nLinha 2');
  assert.deepEqual(full.observacoesVeiculosRecuperados, ['Observação do veículo']); assert.equal(saved.statusDemanda, 'DEMANDA EVOLUIDA');
  const linked = await cases.demands(request({casoId: c.id})); assert.equal(linked.demandas[0].id, saved.id);
  assert.equal(db.rows[`demandas/${saved.id}`].criadoPor, 'editor');
  await assert.rejects(save({numOcorrencia: '999', casoNome: 'NOME FORJADO'}), {code: 'invalid-argument'});
});
test('transação recusa cadastro simultâneo do mesmo procedimento', async () => {
  const {save, db} = setup(); const results = await Promise.allSettled([save(), save({}, {}, 'editor2')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'already-exists');
  assert.equal(Object.keys(db.rows).filter(k => k.startsWith('demandas/')).length, 1);
});
test('repetir solicitação após perda de resposta não duplica nem reaplica edição', async () => {
  const {save, demands, request, db} = setup(), token = randomUUID();
  const first = await save({}, {solicitacaoId: token});
  const edited = await save({nomeVitima: 'SEGUNDA VERSÃO'}, {demandaId: first.id, versao: first.versao});
  const repeated = await save({}, {solicitacaoId: token});
  assert.equal(repeated.id, first.id); assert.equal(repeated.repetida, true); assert.equal(edited.versao, 2);
  assert.equal((await demands.get(request({demandaId: first.id}))).nomeVitima, 'SEGUNDA VERSÃO');
  await assert.rejects(save({nomeVitima: 'ALTERADO'}, {solicitacaoId: token}), {code: 'already-exists'});
  assert.equal(Object.keys(db.rows).filter(k => k.startsWith('auditoriaEventos/')).length, 2);
});
test('edições concorrentes e mudança de vínculo por outra API não apagam a atualização anterior', async () => {
  const {save, cases, demands, request} = setup(), first = await save();
  const results = await Promise.allSettled([save({bairro: 'BAIRRO A'}, {demandaId: first.id, versao: 1}), save({bairro: 'BAIRRO B'}, {demandaId: first.id, versao: 1})]);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'aborted');
  const value = await demands.get(request({demandaId: first.id})); assert.equal(value.versao, 2);
  await cases.bindDemand(request({demandaId: first.id, casoId: null}));
  await assert.rejects(save({bairro: 'BAIRRO C'}, {demandaId: first.id, versao: 2}), {code: 'aborted'});
  assert.equal((await demands.get(request({demandaId: first.id}))).bairro, 'BAIRRO A');
});
test('alterar número do procedimento libera apenas o índice do registro editado', async () => {
  const {save} = setup(), original = await save();
  await save({numOcorrencia: '456/2026'}, {demandaId: original.id, versao: 1});
  const second = await save(); assert.notEqual(second.id, original.id);
  await assert.rejects(save({numOcorrencia: '456/2026'}), {code: 'already-exists'});
});
test('sessão, perfil ativo e unidade são verificados no servidor', async () => {
  const {save, demands, request} = setup(), a = await save(), b = await save({numOcorrencia: '987', unidade: 'UNIDADE B'});
  for (const uid of [null, 'inativo', 'direcao', 'unidade']) await assert.rejects(save({}, {}, uid), {code: uid ? 'permission-denied' : 'unauthenticated'});
  const read = await demands.search(request({filtros: {}}, 'unidade')); assert.deepEqual(read.resultados.map(d => d.id), [a.id]);
  await assert.rejects(demands.get(request({demandaId: b.id}, 'unidade')), {code: 'permission-denied'});
  assert.equal((await demands.search(request({}, 'direcao'))).resultados.length, 2);
  assert.equal((await demands.bootstrap(request({}, 'unidade'))).podeEditar, false);
});
test('filtros combinam nome pesquisado, tipo de crime, caso, status, equipe e data', async () => {
  const {cases, save, demands, request} = setup();
  const c = await cases.create(request({nomeCaso: 'CASO ALVO', tipoCrime: 'FURTO', subtipoCrime: 'FURTO DE VEICULO', solicitacaoId: randomUUID()}));
  const a = await save({casoId: c.id, nomeVitima: 'NOME FICTÍCIO', equipe: 'EQUIPE TESTE'}); await save({numOcorrencia: '888', crimeTipo: 'ROUBO DE CARGA'});
  const filt = {casoId: c.id, tipoCrime: 'FURTO', equipe: 'EQUIPE TESTE', status: 'EM ANDAMENTO', data: '2026-09-15', numeroProcedimento: '123', pesquisaGeral: 'ficticio'};
  assert.deepEqual((await demands.search(request({filtros: filt}))).resultados.map(d => d.id), [a.id]);
  assert.equal((await demands.search(request({filtros: {...filt, tipoCrime: 'ROUBO'}}))).resultados.length, 0);
});
test('paginação continua após páginas sem correspondência e recusa cursor de outra pesquisa', async () => {
  const {db, demands, request} = setup();
  for (let i = 0; i < 205; i++) db.rows[`demandas/item-${String(i).padStart(3, '0')}`] = {unidadeChave: 'UNIDADE A', crimeTipo: 'FURTO DE VEICULO', nomeVitima: i < 204 ? 'OUTRO' : 'ALVO'};
  const first = await demands.search(request({filtros: {pesquisaGeral: 'ALVO'}}));
  assert.equal(first.resultados.length, 0); assert.ok(first.proximaPagina);
  const second = await demands.search(request({filtros: {pesquisaGeral: 'ALVO'}, cursor: first.proximaPagina}));
  assert.equal(second.resultados[0].id, 'item-204'); assert.equal(second.proximaPagina, null);
  await assert.rejects(demands.search(request({filtros: {}, cursor: first.proximaPagina})), {code: 'invalid-argument'});
  const all = [], cursors = new Set(); let cursor = null;
  do { const page = await demands.search(request({cursor})); all.push(...page.resultados.map(d => d.id)); cursor = page.proximaPagina;
    if (cursor) { assert.ok(!cursors.has(cursor.id)); cursors.add(cursor.id); }
  } while (cursor);
  assert.equal(new Set(all).size, 205); assert.equal(all.length, 205);
});
test('edição conserva campos históricos não convertidos e casos sem correspondência', async () => {
  const {save, db, demands, request} = setup(), saved = await save();
  Object.assign(db.rows[`demandas/${saved.id}`], {origemLegada: {linha: 17, campoDesconhecido: 'MANTER'}, casoNome: 'CASO ANTIGO AMBÍGUO', casoId: null});
  await save({observacoes: 'Atualizado'}, {demandaId: saved.id, versao: 1});
  assert.equal((await demands.get(request({demandaId: saved.id}))).casoNome, 'CASO ANTIGO AMBÍGUO');
  assert.deepEqual(db.rows[`demandas/${saved.id}`].origemLegada, {linha: 17, campoDesconhecido: 'MANTER'});
  await save({casoId: null}, {demandaId: saved.id, versao: 2});
  assert.equal((await demands.get(request({demandaId: saved.id}))).casoNome, '');
});
test('validações recusam casos inexistentes, quantidades inconsistentes, menus forjados e datas impossíveis', async () => {
  const {save} = setup();
  for (const value of [{dataOcorrencia: '2026-02-30'}, {suspeitosIdent: '-1'}, {suspeitosIdent: '1.5'}, {suspeitosIdent: 501},
    {status: 'STATUS FORJADO'}, {unidade: 'UNIDADE FORJADA'}, {crimeTipo: 'CRIME FORJADO'}, {nomesSuspeitos: ['UM NOME'], suspeitosIdent: 0},
    {procedimentoNaoInstaurado: 'false'}, {observacoes: 'x\u0000'}, {criadoPor: 'outro'}]) await assert.rejects(save(value), {code: 'invalid-argument'});
  await assert.rejects(save({casoId: 'inexistente'}), {code: 'not-found'});
});
test('regra de evolução preserva os sete contadores do original e razões diversas', async () => {
  const {save} = setup();
  assert.equal((await save()).statusDemanda, 'DEMANDA NÃO EVOLUÍDA');
  assert.equal((await save({numOcorrencia: '2', relatorioMissao: 1})).statusDemanda, 'DEMANDA NÃO EVOLUÍDA');
  assert.equal((await save({numOcorrencia: '3', relatorioTecnico: 1})).statusDemanda, 'DEMANDA EVOLUIDA');
  assert.equal((await save({numOcorrencia: '4', motivoEvolucaoDiversa: reasons[1]})).statusDemanda, 'DEMANDA EVOLUIDA');
});
test('PDF fica privado, vinculado à demanda e acessível somente à unidade autorizada', async () => {
  const {attachments, request, save, objects} = setup(), bytes = Buffer.from('%PDF-1.4\nArquivo fictício\n%%EOF'), token = randomUUID();
  const upload = {nome: 'teste.pdf', base64: bytes.toString('base64'), solicitacaoId: token};
  const pdf = await attachments.upload(request(upload));
  assert.deepEqual(await attachments.upload(request(upload)), pdf); assert.equal(objects.size, 1);
  await assert.rejects(save({relatorioTecnico: 1, relatorioTecnicoPdfLinks: [pdf.referencia]}, {}, 'editor2'), {code: 'permission-denied'});
  const saved = await save({unidade: 'UNIDADE B', relatorioTecnico: 1, relatorioTecnicoPdfLinks: [pdf.referencia]});
  const downloaded = await attachments.download(request({anexoId: pdf.referencia.slice(6)})); assert.equal(downloaded.base64, bytes.toString('base64'));
  await assert.rejects(attachments.download(request({anexoId: pdf.referencia.slice(6)}, 'unidade')), {code: 'permission-denied'});
  await save({unidade: 'UNIDADE B'}, {demandaId: saved.id, versao: 1});
  await assert.rejects(attachments.download(request({anexoId: pdf.referencia.slice(6)})), {code: 'permission-denied'});
});
test('PDFs inválidos, referências de terceiros e links externos novos são recusados', async () => {
  const {attachments, request, save} = setup();
  for (const base64 of ['não base64', Buffer.from('<html>FAKE</html>').toString('base64')]) await assert.rejects(attachments.upload(request({nome: 'teste.pdf', base64, solicitacaoId: randomUUID()})), {code: 'invalid-argument'});
  await assert.rejects(save({relatorioTecnico: 1, relatorioTecnicoPdfLinks: ['https://example.com/arquivo.pdf']}), {code: 'invalid-argument'});
  await assert.rejects(save({relatorioTecnico: 1, relatorioTecnicoPdfLinks: ['anexo:ausente']}), {code: 'not-found'});
  const large = Buffer.alloc(MAX_PDF_BYTES + 1, 65); large.write('%PDF-');
  await assert.rejects(attachments.upload(request({nome: 'grande.pdf', base64: large.toString('base64'), solicitacaoId: randomUUID()})), {code: 'invalid-argument'});
});
