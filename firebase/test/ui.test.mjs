import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {CasesStore} from '../public/cases-store.js';
import {integratePortalCases} from '../public/portal-integration.js';
const {tipos} = JSON.parse(await readFile(new URL('../config/crimes.json', import.meta.url)));
const tick = () => new Promise(resolve => setImmediate(resolve));
async function setup({casos = [], demandQuery = async () => ({demandas: [], proximaPagina: null})} = {}) {
  const dom = new JSDOM('<main id="cases"></main><select id="dem_caso"></select><select id="dem_busca_caso_especifico"></select>');
  const document = dom.window.document;
  const call = async (name, data) => {
    if (name === 'obterBootstrapCasosPrioritarios') return {casos: structuredClone(casos), tipos, podeCadastrar: true, proximaPagina: null};
    if (name === 'salvarCasoPrioritarioSemEventos') {
      const row = {id: `case-${casos.length + 1}`, nomeCaso: data.nomeCaso.toUpperCase(), tipoCrime: data.tipoCrime, subtipoCrime: data.subtipoCrime};
      casos.push(row); return row;
    }
    return demandQuery(name, data);
  };
  const store = new CasesStore(call, () => '0e0aa947-430d-44df-80df-7d3a26467436');
  const root = document.querySelector('#cases');
  const integration = integratePortalCases({store, casesRoot: root, demandFormSelect: document.querySelector('#dem_caso'),
    demandSearchSelect: document.querySelector('#dem_busca_caso_especifico')});
  await integration.refresh();
  return {dom, document, root, store, integration};
}
test('cadastro exibe apenas três campos e filtra os subtipos', async () => {
  const {root, dom} = await setup(); root.querySelector('[data-new]').click();
  const form = root.querySelector('form');
  assert.deepEqual([...form.querySelectorAll('input,select')].map(f => f.name), ['nomeCaso', 'tipoCrime', 'subtipoCrime']);
  form.elements.tipoCrime.value = 'FURTO'; form.elements.tipoCrime.dispatchEvent(new dom.window.Event('change'));
  assert.equal(form.elements.subtipoCrime.options.length, 8); assert.equal(form.elements.subtipoCrime.required, true);
  assert.ok([...form.elements.subtipoCrime.options].every(o => !o.textContent.startsWith('ROUBO')));
  form.elements.tipoCrime.value = 'OUTROS'; form.elements.tipoCrime.dispatchEvent(new dom.window.Event('change'));
  assert.equal(form.elements.subtipoCrime.disabled, true); assert.equal(form.elements.subtipoCrime.required, false);
});
test('enviar cadastro atualiza selecione um caso, fenômeno do formulário e fenômeno da busca', async () => {
  const {root, document, dom, integration} = await setup();
  root.querySelector('[data-new]').click();
  const form = root.querySelector('form'); form.elements.nomeCaso.value = 'FURTO DE HILUX';
  form.elements.tipoCrime.value = 'FURTO'; form.elements.tipoCrime.dispatchEvent(new dom.window.Event('change'));
  form.elements.subtipoCrime.value = 'FURTO DE VEICULO';
  await form.onsubmit({preventDefault() {}}); await tick();
  for (const selector of ['[data-case]', '#dem_caso', '#dem_busca_caso_especifico'])
    assert.ok([...document.querySelector(selector).options].some(o => o.textContent === 'FURTO DE HILUX'));
  assert.match(root.querySelector('[data-save-message]').textContent, /Caso cadastrado/);
  assert.equal(root.querySelector('[data-name]').textContent, 'FURTO DE HILUX');
  const dem = document.querySelector('#dem_caso'); dem.value = 'FURTO DE HILUX'; dem.dispatchEvent(new dom.window.Event('change'));
  assert.deepEqual(integration.getDemandCase(), {casoId: 'case-1', casoNome: 'FURTO DE HILUX'});
});
test('nome contendo HTML permanece texto nos seletores e no resumo', async () => {
  const name = '<img src=x onerror=alert(1)>', casos = [{id: 'case-1', nomeCaso: name, tipoCrime: 'OUTROS', subtipoCrime: ''}];
  const {root, dom} = await setup({casos});
  const select = root.querySelector('[data-case]'); select.value = 'case-1'; select.dispatchEvent(new dom.window.Event('change'));
  assert.equal(root.querySelectorAll('img').length, 0); assert.equal(root.querySelector('[data-name]').textContent, name);
});
test('logout limpa os seletores compartilhados', async () => {
  const {document, store, dom} = await setup({casos: [{id: 'case-1', nomeCaso: 'CASO TESTE', tipoCrime: 'OUTROS', subtipoCrime: ''}]});
  const dem = document.querySelector('#dem_caso'); dem.value = 'CASO TESTE'; dem.dispatchEvent(new dom.window.Event('change'));
  store.reset(); assert.equal(dem.value, ''); assert.equal(dem.options.length, 1); assert.equal(dem.dataset.casoId, '');
});
test('referência antiga é preservada para revisão e não vira vínculo arbitrário', async () => {
  const {document, store, integration} = await setup();
  const dem = document.querySelector('#dem_caso');
  const legacy = document.createElement('option'); legacy.value = 'FURTO DE VEICULO'; legacy.textContent = legacy.value; dem.append(legacy); dem.value = legacy.value;
  await store.refresh(); assert.equal(dem.value, 'FURTO DE VEICULO');
  assert.throws(() => integration.getDemandCase(), /registro anterior/);
});
test('resposta de demandas do caso anterior não aparece no caso recém-selecionado', async () => {
  let finishOld;
  const old = new Promise(resolve => { finishOld = resolve; });
  const cases = [{id: 'a', nomeCaso: 'CASO A'}, {id: 'b', nomeCaso: 'CASO B'}];
  const {root, dom} = await setup({casos: cases, demandQuery: async (_, data) => data.casoId === 'a' ? old : {demandas: [{id: 'b1', numeroProcedimento: 'PROCEDIMENTO B'}], proximaPagina: null}});
  const select = root.querySelector('[data-case]');
  select.value = 'a'; select.dispatchEvent(new dom.window.Event('change'));
  select.value = 'b'; select.dispatchEvent(new dom.window.Event('change')); await tick();
  finishOld({demandas: [{id: 'a1', numeroProcedimento: 'PROCEDIMENTO A'}], proximaPagina: null}); await tick();
  assert.match(root.querySelector('tbody').textContent, /PROCEDIMENTO B/);
  assert.doesNotMatch(root.querySelector('tbody').textContent, /PROCEDIMENTO A/);
});
