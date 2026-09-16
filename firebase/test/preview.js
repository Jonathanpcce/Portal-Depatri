import {CasesStore, key} from '/public/cases-store.js';
import {integratePortalCases} from '/public/portal-integration.js';
const {tipos} = await (await fetch('/config/crimes.json')).json();
const cases = [], requests = new Map();
const store = new CasesStore(async (name, payload) => {
  if (name === 'obterBootstrapCasosPrioritarios') return {casos: structuredClone(cases), tipos, podeCadastrar: true, proximaPagina: null};
  if (name === 'salvarCasoPrioritarioSemEventos') {
    if (requests.has(payload.solicitacaoId)) return requests.get(payload.solicitacaoId);
    if (cases.some(c => key(c.nomeCaso) === key(payload.nomeCaso))) throw new Error('Já existe um caso com esse nome. Selecione o caso cadastrado.');
    const saved = {id: crypto.randomUUID(), nomeCaso: payload.nomeCaso.toUpperCase(), tipoCrime: payload.tipoCrime, subtipoCrime: payload.subtipoCrime};
    cases.push(saved); requests.set(payload.solicitacaoId, saved); return saved;
  }
  if (name === 'listarDemandasCasoPrioritario') return {demandas: [], proximaPagina: null};
  throw new Error('Operação indisponível na prévia.');
});
const integration = integratePortalCases({store, casesRoot: document.querySelector('#cases'),
  demandFormSelect: document.querySelector('#dem_caso'), demandSearchSelect: document.querySelector('#dem_busca_caso_especifico')});
await integration.refresh();
