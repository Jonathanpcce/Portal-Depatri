import {CasesStore, key} from '/public/cases-store.js';
import {mountCases} from '/public/cases-ui.js';
import {DemandsStore} from '/public/demands-store.js';
import {mountDemands} from '/public/demands-ui.js';
const {tipos} = await (await fetch('/config/crimes.json')).json();
const schema = await (await fetch('/test/preview.schema.json')).json();
// Adaptador de demonstração: todos os registros e PDFs ficam somente em memória nesta aba.
const cases = [], demands = new Map(), requests = new Map(), pdfs = new Map();
async function call(name, payload = {}) {
  if (name === 'obterBootstrapCasosPrioritarios') return {casos: structuredClone(cases), tipos, podeCadastrar: true, proximaPagina: null};
  if (name === 'salvarCasoPrioritarioSemEventos') {
    if (requests.has(payload.solicitacaoId)) return requests.get(payload.solicitacaoId);
    if (cases.some(c => key(c.nomeCaso) === key(payload.nomeCaso))) throw new Error('Já existe um caso com esse nome. Selecione o caso cadastrado.');
    const saved = {id: crypto.randomUUID(), nomeCaso: payload.nomeCaso.toUpperCase(), tipoCrime: payload.tipoCrime, subtipoCrime: payload.subtipoCrime};
    cases.push(saved); requests.set(payload.solicitacaoId, saved); return saved;
  }
  if (name === 'listarDemandasCasoPrioritario') return {demandas: [...demands.values()].filter(d => d.casoId === payload.casoId), proximaPagina: null};
  if (name === 'obterBootstrapDemandasAtivas') return structuredClone(schema);
  if (name === 'obterDemandaAtiva') return structuredClone(demands.get(payload.demandaId));
  if (name === 'salvarDemandaAtiva') {
    if (requests.has(payload.solicitacaoId)) return requests.get(payload.solicitacaoId);
    const d = structuredClone(payload.dados);
    if ([...demands.values()].some(old => old.id !== payload.demandaId && key(old.tipoOcorrencia) === key(d.tipoOcorrencia) && key(old.numOcorrencia) === key(d.numOcorrencia))) throw new Error('O procedimento já foi cadastrado.');
    const c = cases.find(c => c.id === d.casoId);
    const saved = {...d, id: payload.demandaId || crypto.randomUUID(), versao: (payload.versao || 0) + 1, casoNome: c?.nomeCaso || '',
      numeroProcedimento: d.numOcorrencia, procedimentoConcat: `${d.tipoOcorrencia} Nº ${d.numOcorrencia}`, unidadeResponsavel: d.unidade,
      statusDemanda: d.motivoEvolucaoDiversa || schema.contadores.slice(0, 7).some(c => d[c.key] >= 1) ? 'DEMANDA EVOLUIDA' : 'DEMANDA NÃO EVOLUÍDA'};
    demands.set(saved.id, saved); requests.set(payload.solicitacaoId, saved); return structuredClone(saved);
  }
  if (name === 'pesquisarDemandasAtivas') {
    const f = payload.filtros || {};
    return {resultados: [...demands.values()].filter(d => {
      if (f.casoId && d.casoId !== f.casoId || f.equipe && d.equipe !== f.equipe || f.status && d.status !== f.status || f.data && d.dataOcorrencia !== f.data) return false;
      if (f.numeroProcedimento && !key(d.procedimentoConcat).includes(key(f.numeroProcedimento))) return false;
      if (f.tipoCrime && key(d.crimeTipo) !== key(f.tipoCrime) && !tipos.find(t => t.tipo === f.tipoCrime)?.subtipos.includes(d.crimeTipo)) return false;
      return !f.pesquisaGeral || key(Object.values(d).join(' ')).includes(key(f.pesquisaGeral));
    }), proximaPagina: null};
  }
  if (name === 'enviarPdfDemanda') {
    pdfs.set(payload.solicitacaoId, {nome: payload.nome, base64: payload.base64});
    return {referencia: `anexo:${payload.solicitacaoId}`, nome: payload.nome};
  }
  if (name === 'baixarPdfDemanda') return pdfs.get(payload.anexoId);
  throw new Error('Operação indisponível na prévia.');
}
const store = new CasesStore(call), demandsStore = new DemandsStore(call);
await store.refresh();
const caseView = mountCases(document.querySelector('#cases'), store);
await mountDemands(document.querySelector('#demands'), demandsStore, store, {onSaved: () => caseView.refresh()});
document.querySelectorAll('[data-module]').forEach(button => {
  button.onclick = () => {
    document.querySelector('#cases').hidden = button.dataset.module !== 'cases';
    document.querySelector('#demands').hidden = button.dataset.module !== 'demands';
    document.querySelectorAll('[data-module]').forEach(b => { b.classList.toggle('secondary', b !== button); b.setAttribute('aria-pressed', String(b === button)); });
  };
});
