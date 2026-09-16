import {mountCases, bindCaseSelector} from './cases-ui.js';

// Instalar após a autenticação Firebase e a montagem dos formulários do portal.
// O formulário legado continua exibindo nomes; casoId acompanha a seleção.
export function integratePortalCases({store, casesRoot, demandFormSelect, demandSearchSelect}) {
  const bindings = [];
  if (demandFormSelect) bindings.push(bindCaseSelector(store, demandFormSelect, {valueMode: 'nome', placeholder: 'Selecione'}));
  if (demandSearchSelect) bindings.push(bindCaseSelector(store, demandSearchSelect, {valueMode: 'nome', placeholder: 'Todos'}));
  const view = mountCases(casesRoot, store);
  function selectedCase(select) {
    if (!select || !select.value) return {casoId: null, casoNome: ''};
    const casoId = select.dataset.casoId;
    if (!casoId) throw new Error('O caso deste registro anterior precisa ser conferido antes de alterar o vínculo.');
    const selected = store.snapshot().casos.find(c => c.id === casoId);
    if (!selected) throw new Error('Atualize a lista e selecione o caso novamente.');
    return {casoId, casoNome: selected.nomeCaso};
  }
  return {
    refresh: () => view.refresh(),
    setMode: mode => view.setMode(mode === 'novo' || mode === 'NOVO' ? 'novo' : 'visualizar'),
    getDemandCase: () => selectedCase(demandFormSelect),
    getSearchCase: () => selectedCase(demandSearchSelect),
    destroy() { bindings.forEach(dispose => dispose()); view.destroy(); }
  };
}
