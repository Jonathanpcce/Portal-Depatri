import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import harness from '../functions/test/demands-harness.cjs';
import {CasesStore} from '../public/cases-store.js';
import {DemandsStore} from '../public/demands-store.js';
import {mountCases} from '../public/cases-ui.js';
import {mountDemands} from '../public/demands-ui.js';
const tick = () => new Promise(r => setImmediate(r));
async function setup({uid = 'editor', intercept} = {}) {
  const backend = harness.setup();
  const dom = new JSDOM('<div id="cases"></div><div id="demands"></div>'), doc = dom.window.document;
  const handlers = {
    obterBootstrapCasosPrioritarios: backend.cases.bootstrap, salvarCasoPrioritarioSemEventos: backend.cases.create,
    listarDemandasCasoPrioritario: backend.cases.demands, obterBootstrapDemandasAtivas: backend.demands.bootstrap,
    obterDemandaAtiva: backend.demands.get, salvarDemandaAtiva: backend.demands.save, pesquisarDemandasAtivas: backend.demands.search,
    enviarPdfDemanda: backend.attachments.upload, baixarPdfDemanda: backend.attachments.download
  };
  const calls = [], call = async (name, payload) => {
    calls.push({name, payload}); const run = () => handlers[name](backend.request(payload, uid));
    return intercept ? intercept(name, payload, run) : run();
  };
  const casesStore = new CasesStore(call, randomUUID), demandsStore = new DemandsStore(call, randomUUID);
  await casesStore.refresh();
  const caseView = mountCases(doc.querySelector('#cases'), casesStore);
  const demandView = await mountDemands(doc.querySelector('#demands'), demandsStore, casesStore);
  const root = doc.querySelector('#demands'), form = root.querySelector('[data-demand-form]');
  function fill(values = {}) {
    for (const [key, value] of Object.entries(harness.data(values))) {
      const input = form.elements.namedItem(key); if (!input) continue;
      if (input.type === 'checkbox') input.checked = value; else input.value = value;
      input.dispatchEvent(new dom.window.Event('change'));
    }
  }
  return {backend, dom, doc, root, form, calls, casesStore, demandsStore, caseView, demandView, fill};
}
test('fluxo integrado: cadastro de caso, três seletores, gravação da demanda e pesquisa pelo caso', async () => {
  const {backend, doc, dom, root, form, fill, calls} = await setup();
  const cp = doc.querySelector('#cases form'); doc.querySelector('[data-new]').click();
  cp.elements.nomeCaso.value = 'FURTO DE HILUX'; cp.elements.tipoCrime.value = 'FURTO'; cp.elements.tipoCrime.dispatchEvent(new dom.window.Event('change'));
  cp.elements.subtipoCrime.value = 'FURTO DE VEICULO'; await cp.onsubmit({preventDefault() {}});
  const c = Object.values(backend.db.rows).find(v => v.nomeCaso === 'FURTO DE HILUX' && v.ativo);
  assert.ok(c);
  for (const selector of ['[data-case]', '#dem_caso', '#dem_busca_caso_especifico']) assert.ok([...doc.querySelector(selector).options].some(o => o.textContent === 'FURTO DE HILUX'));
  const caseId = doc.querySelector('#dem_caso').options[1].value;
  fill({casoId: caseId, suspeitosIdent: 1}); form.elements.nomesSuspeitos_0.value = 'NOME FICTÍCIO';
  await form.onsubmit({preventDefault() {}});
  assert.match(root.querySelector('[data-message]').textContent, /Demanda salva/);
  const sent = calls.find(c => c.name === 'salvarDemandaAtiva').payload.dados;
  assert.equal(sent.casoId, caseId); assert.equal(Object.hasOwn(sent, 'casoNome'), false);
  assert.equal(Object.hasOwn(sent, 'usuarioLogin'), false);
  assert.deepEqual(sent.nomesSuspeitos, ['NOME FICTÍCIO']);
  const search = root.querySelector('[data-search-form]'); search.elements.casoId.value = caseId; search.elements.tipoCrime.value = 'FURTO';
  await search.onsubmit({preventDefault() {}});
  assert.match(root.querySelector('tbody').textContent, /FURTO DE HILUX/);
  assert.equal(calls.at(-1).payload.filtros.tipoCrime, 'FURTO');
  doc.querySelector('[data-case]').dispatchEvent(new dom.window.Event('change')); await tick();
  assert.match(doc.querySelector('#cases tbody').textContent, /123\/2026/);
});
test('editar demanda conserva detalhes, limpa procedimento não instaurado e usa a versão do servidor', async () => {
  const {backend, demandView, root, form, fill, calls, dom} = await setup();
  const saved = await backend.save({nomeVitima: 'NOME DE TESTE', veiculosRecuperados: 1, placasVeiculosRecuperados: ['AAA0A00'], procedimentoInstaurado: 'IP 1/2026'});
  await demandView.open(saved.id); assert.equal(form.elements.placasVeiculosRecuperados_0.value, 'AAA0A00');
  assert.equal(form.elements.nomeVitima.value, 'NOME DE TESTE');
  form.elements.procedimentoNaoInstaurado.checked = true; form.elements.procedimentoNaoInstaurado.dispatchEvent(new dom.window.Event('change'));
  assert.equal(form.elements.procedimentoInstaurado.value, ''); assert.equal(form.elements.procedimentoInstaurado.disabled, true);
  await form.onsubmit({preventDefault() {}});
  const sent = calls.find(c => c.name === 'salvarDemandaAtiva').payload; assert.equal(sent.demandaId, saved.id); assert.equal(sent.versao, 1);
  assert.deepEqual(sent.dados.placasVeiculosRecuperados, ['AAA0A00']);
  assert.match(root.querySelector('tbody').textContent, /NÃO INSTAURADO PELA DELEGACIA/);
});
test('retentativa do formulário após perda da resposta não duplica demanda nem PDF', async () => {
  let loseResponse = true;
  const {backend, root, form, fill, dom, calls} = await setup({intercept: async (name, payload, run) => {
    const value = await run(); if (name === 'salvarDemandaAtiva' && loseResponse) { loseResponse = false; throw new Error('Conexão perdida'); } return value;
  }});
  fill({relatorioTecnico: 1});
  const file = new dom.window.File(['%PDF-1.4\nFICTÍCIO\n%%EOF'], 'teste.pdf', {type: 'application/pdf'});
  Object.defineProperty(form.elements.relatorioTecnicoPdfLinks_0, 'files', {value: [file]});
  await form.onsubmit({preventDefault() {}}); assert.match(root.querySelector('[data-save-message]').textContent, /Conexão perdida/);
  await form.onsubmit({preventDefault() {}}); assert.match(root.querySelector('[data-message]').textContent, /Demanda salva/);
  assert.equal(calls.filter(c => c.name === 'enviarPdfDemanda').length, 1);
  const saves = calls.filter(c => c.name === 'salvarDemandaAtiva'); assert.equal(saves[0].payload.solicitacaoId, saves[1].payload.solicitacaoId);
  assert.equal(Object.keys(backend.db.rows).filter(k => k.startsWith('demandas/')).length, 1); assert.equal(backend.objects.size, 1);
});
test('perfil de delegacia consulta sua unidade e não recebe controles de cadastro habilitados', async () => {
  const {backend, root, form, demandView} = await setup({uid: 'unidade'});
  const saved = await backend.save();
  assert.equal(root.querySelector('[data-new-demand]').hidden, true); await demandView.open(saved.id);
  assert.equal(root.querySelector('[data-save]').hidden, true); assert.equal(form.elements.nomeVitima.disabled, true);
  await demandView.search(); assert.equal(root.querySelectorAll('tbody tr').length, 1);
});
test('caso histórico sem ID é mantido em edição, mesmo após atualização do catálogo', async () => {
  const {backend, demandView, form, casesStore, calls} = await setup(), saved = await backend.save();
  backend.db.rows[`demandas/${saved.id}`].casoNome = 'CASO HISTÓRICO AMBÍGUO';
  await demandView.open(saved.id); await casesStore.refresh();
  assert.match(form.elements.casoId.selectedOptions[0].textContent, /CASO HISTÓRICO AMBÍGUO/);
  await form.onsubmit({preventDefault() {}});
  assert.equal(Object.hasOwn(calls.find(c => c.name === 'salvarDemandaAtiva').payload.dados, 'casoId'), false);
  assert.equal(backend.db.rows[`demandas/${saved.id}`].casoNome, 'CASO HISTÓRICO AMBÍGUO');
});
test('resposta antiga de consulta não preenche um novo formulário aberto durante a espera', async () => {
  let finish;
  const {backend, demandView, root, form} = await setup({intercept: (name, payload, run) => name === 'obterDemandaAtiva' ? new Promise(resolve => { finish = async () => resolve(await run()); }) : run()});
  const saved = await backend.save({nomeVitima: 'REGISTRO ANTERIOR'});
  const loading = demandView.open(saved.id); root.querySelector('[data-new-demand]').click(); await finish(); await loading;
  assert.equal(form.elements.nomeVitima.value, ''); assert.match(root.querySelector('[data-editor-title]').textContent, /Nova demanda/);
});
test('logout durante bootstrap não restaura o formulário nem dados da sessão anterior', async () => {
  let finish;
  const dom = new JSDOM('<main></main>'), root = dom.window.document.querySelector('main');
  const backend = harness.setup();
  const demandsStore = new DemandsStore(() => new Promise(resolve => { finish = async () => resolve(await backend.demands.bootstrap(backend.request())); }));
  const casesStore = new CasesStore(() => {});
  const pending = mountDemands(root, demandsStore, casesStore);
  demandsStore.reset(); casesStore.reset(); root._destroyDemands(); await finish(); await pending;
  assert.equal(root.childElementCount, 0);
});
test('conteúdo semelhante a HTML aparece como texto nos resultados e não cria elementos', async () => {
  const {backend, root, demandView} = await setup();
  const saved = await backend.save(); backend.db.rows[`demandas/${saved.id}`].casoNome = '<img src=x onerror=alert(1)>';
  await demandView.search(); assert.equal(root.querySelector('tbody img'), null);
  assert.match(root.querySelector('tbody').textContent, /<img src=x/);
});
