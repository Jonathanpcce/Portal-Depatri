import test from 'node:test';
import assert from 'node:assert/strict';
import {CasesStore} from '../public/cases-store.js';
const empty = {casos: [], tipos: [{tipo: 'FURTO', subtipos: ['FURTO DE VEICULO']}], podeCadastrar: true, proximaPagina: null};
const saved = {id: 'caso1', nomeCaso: 'FURTO DE HILUX', tipoCrime: 'FURTO', subtipoCrime: 'FURTO DE VEICULO'};
const defer = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; };
test('cadastro confirmado atualiza todos os observadores do catálogo', async () => {
  let wrote = false;
  const store = new CasesStore(async name => name === 'salvarCasoPrioritarioSemEventos' ? (wrote = true, saved) : {...empty, casos: wrote ? [saved] : []}, () => 'uuid');
  const selector1 = [], selector2 = [];
  store.subscribe(s => selector1.push(s.casos.map(c => c.id)));
  store.subscribe(s => selector2.push(s.casos.map(c => c.id)));
  await store.refresh(); await store.create(saved);
  assert.deepEqual(selector1.at(-1), ['caso1']); assert.deepEqual(selector2.at(-1), ['caso1']);
});
test('falha de gravação não inclui caso e a repetição mantém o identificador', async () => {
  const ids = []; let tries = 0;
  const store = new CasesStore(async (name, data) => {
    if (name !== 'salvarCasoPrioritarioSemEventos') return empty;
    ids.push(data.solicitacaoId); if (++tries === 1) throw new Error('offline'); return saved;
  }, () => 'mesma-solicitacao');
  await store.refresh(); await assert.rejects(store.create(saved), /offline/);
  assert.equal(store.snapshot().casos.length, 0); await store.create(saved);
  assert.deepEqual(ids, ['mesma-solicitacao', 'mesma-solicitacao']);
});
test('falha na atualização após gravação mantém sucesso e caso confirmado', async () => {
  let count = 0;
  const store = new CasesStore(async name => {
    if (name === 'salvarCasoPrioritarioSemEventos') return saved;
    if (++count > 1) throw new Error('offline'); return empty;
  }, () => 'uuid');
  await store.refresh(); const result = await store.create(saved);
  assert.equal(result.listaAtualizada, false); assert.equal(store.snapshot().casos[0].id, 'caso1');
});
test('resposta antiga e resposta após logout não restauram dados anteriores', async () => {
  const pending = [], store = new CasesStore(() => { const d = defer(); pending.push(d); return d.promise; });
  const old = store.refresh(), recent = store.refresh();
  pending[1].resolve({...empty, casos: [saved]}); await recent;
  pending[0].resolve(empty); await old; assert.equal(store.snapshot().casos.length, 1);
  const after = store.refresh(); store.reset(); pending[2].resolve({...empty, casos: [saved]}); await after;
  assert.equal(store.snapshot().casos.length, 0); assert.equal(store.snapshot().podeCadastrar, false);
});
test('troca de sessão durante cadastro descarta a resposta da sessão anterior', async () => {
  const d = defer(); const store = new CasesStore(async name => name === 'salvarCasoPrioritarioSemEventos' ? d.promise : empty, () => 'uuid');
  await store.refresh(); const create = store.create(saved); store.reset(); d.resolve(saved);
  await assert.rejects(create, /sessão mudou/); assert.equal(store.snapshot().casos.length, 0);
});
test('paginação completa e cursor repetido tratado como falha', async () => {
  const store = new CasesStore(async (_, {cursor}) => !cursor ? {...empty, casos: [saved], proximaPagina: {id: 'caso1', nomeChave: 'A'}} : empty);
  assert.equal((await store.refresh()).casos.length, 1);
  const broken = new CasesStore(async () => ({...empty, proximaPagina: {id: 'x'}}));
  await assert.rejects(broken.refresh(), /lista completa/);
});
