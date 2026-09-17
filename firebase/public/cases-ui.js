function option(select, value, label, caseId = '') {
  const el = select.ownerDocument.createElement('option');
  el.value = value; el.textContent = label; el.dataset.casoId = caseId;
  select.append(el); return el;
}
export function bindCaseSelector(store, select, {placeholder = 'Selecione um caso', valueMode = 'id'} = {}) {
  if (!['id', 'nome'].includes(valueMode)) throw new Error('Formato de seletor inválido.');
  const syncId = () => { select.dataset.casoId = select.selectedOptions[0]?.dataset.casoId || ''; };
  const unsubscribe = store.subscribe(({casos, sessionCleared}) => {
    const previous = sessionCleared ? '' : select.value, previousId = sessionCleared ? '' : select.dataset.casoId || '';
    const previousLabel = select.selectedOptions[0]?.textContent;
    select.replaceChildren(); option(select, '', placeholder);
    for (const c of casos) option(select, valueMode === 'id' ? c.id : c.nomeCaso, c.nomeCaso, c.id);
    const match = [...select.options].find(o => previousId ? o.dataset.casoId === previousId : o.value === previous);
    if (match) select.value = match.value;
    else if (previous) {
      // Preserva a referência histórica para revisão, sem convertê-la em um caso arbitrário.
      const old = option(select, previous, previousLabel || `${previous} (registro anterior)`);
      old.dataset.unmapped = 'true'; select.value = previous;
    }
    syncId();
  });
  select.addEventListener('change', syncId);
  return () => { unsubscribe(); select.removeEventListener('change', syncId); };
}
export function mountCases(root, store) {
  root.innerHTML = `
    <header class="section-heading"><div><p class="eyebrow">ACOMPANHAMENTO DE CASOS</p>
      <h1>Casos prioritários</h1><p>Cadastre um caso e consulte as demandas vinculadas.</p></div>
      <button type="button" data-new>Novo caso</button></header>
    <section class="panel" data-create hidden><h2>Cadastrar caso</h2>
      <form data-form><div class="fields">
        <label>Nome do caso<input name="nomeCaso" maxlength="150" required autocomplete="off" placeholder="Ex.: FURTO DE HILUX"></label>
        <label>Tipo de crime<select name="tipoCrime" required><option value="">Selecione</option></select></label>
        <label>Subtipo de crime<select name="subtipoCrime" required disabled><option value="">Selecione o tipo primeiro</option></select></label>
      </div><div class="actions"><button type="submit">Cadastrar caso</button><button type="button" class="secondary" data-cancel>Cancelar</button></div>
      <p data-save-message role="status" aria-live="polite"></p></form></section>
    <section class="panel"><div class="select-row"><label>Selecione um caso<select data-case></select></label>
      <button type="button" class="secondary" data-refresh>Atualizar lista</button></div>
      <p data-list-message role="status" aria-live="polite"></p>
      <div data-summary hidden><dl class="case-summary"><div><dt>Nome do caso</dt><dd data-name></dd></div>
        <div><dt>Tipo de crime</dt><dd data-type></dd></div><div><dt>Subtipo de crime</dt><dd data-subtype></dd></div></dl></div>
    </section>
    <section class="panel" data-linked hidden><h2>Demandas vinculadas</h2>
      <p data-demand-message role="status" aria-live="polite"></p>
      <div class="table-scroll"><table><thead><tr><th>Data</th><th>Procedimento</th><th>Unidade responsável</th><th>Status</th><th>Crime</th></tr></thead><tbody></tbody></table></div>
      <button type="button" class="secondary" data-more hidden>Carregar mais</button></section>`;
  const $ = selector => root.querySelector(selector);
  const form = $('[data-form]'), type = form.elements.tipoCrime, subtype = form.elements.subtipoCrime;
  const select = $('[data-case]'), saveMessage = $('[data-save-message]'), listMessage = $('[data-list-message]');
  const demandMessage = $('[data-demand-message]');
  let state = store.snapshot(), requestVersion = 0, next = null, destroyed = false, loading = false;
  const unbind = bindCaseSelector(store, select);
  function populateSubtypes(previous = '') {
    const types = state.tipos.find(c => c.tipo === type.value)?.subtipos || [];
    subtype.replaceChildren();
    option(subtype, '', !type.value ? 'Selecione o tipo primeiro' : types.length ? 'Selecione' : 'Sem subtipo cadastrado');
    types.forEach(s => option(subtype, s, s));
    subtype.disabled = !types.length; subtype.required = types.length > 0;
    if (types.includes(previous)) subtype.value = previous;
  }
  function summary() {
    const c = state.casos.find(row => row.id === select.value);
    $('[data-summary]').hidden = !c;
    if (c) { $('[data-name]').textContent = c.nomeCaso; $('[data-type]').textContent = c.tipoCrime; $('[data-subtype]').textContent = c.subtipoCrime || 'Sem subtipo cadastrado'; }
  }
  const unsubscribe = store.subscribe(s => {
    state = s; const previousType = type.value, previousSubtype = subtype.value;
    type.replaceChildren(); option(type, '', 'Selecione'); state.tipos.forEach(c => option(type, c.tipo, c.tipo));
    if (state.tipos.some(c => c.tipo === previousType)) type.value = previousType;
    populateSubtypes(previousSubtype); $('[data-new]').hidden = !state.podeCadastrar;
    if (!state.podeCadastrar) $('[data-create]').hidden = true;
    summary();
  });
  async function queryDemands(append = false) {
    const caseId = select.dataset.casoId;
    const current = ++requestVersion;
    if (!append) { $('tbody').replaceChildren(); next = null; }
    $('[data-linked]').hidden = !caseId; $('[data-more]').hidden = true; summary();
    if (!caseId) return;
    loading = true; demandMessage.textContent = 'Carregando demandas…';
    try {
      const response = await store.demands(caseId, append ? next : null);
      if (destroyed || current !== requestVersion || select.dataset.casoId !== caseId) return;
      for (const d of response.demandas) {
        const tr = root.ownerDocument.createElement('tr');
        for (const value of [d.dataOcorrencia, d.numeroProcedimento, d.unidadeResponsavel, d.status, d.crimeTipo]) {
          const td = root.ownerDocument.createElement('td'); td.textContent = value || '—'; tr.append(td);
        }
        $('tbody').append(tr);
      }
      next = response.proximaPagina; $('[data-more]').hidden = !next;
      demandMessage.textContent = $('tbody').children.length ? '' : 'Nenhuma demanda vinculada a este caso para o seu acesso.';
    } catch (error) { if (!destroyed && current === requestVersion) demandMessage.textContent = error.message; }
    finally { if (current === requestVersion) loading = false; }
  }
  function setMode(mode) {
    $('[data-create]').hidden = mode !== 'novo' || !state.podeCadastrar;
    if (!$('[data-create]').hidden) form.elements.nomeCaso.focus();
  }
  $('[data-new]').onclick = () => setMode('novo');
  $('[data-cancel]').onclick = () => setMode('visualizar');
  type.onchange = () => populateSubtypes();
  select.addEventListener('change', () => queryDemands());
  $('[data-more]').onclick = () => { if (!loading) queryDemands(true); };
  async function refresh() {
    $('[data-refresh]').disabled = true; listMessage.textContent = 'Atualizando lista…';
    try { await store.refresh(); if (!destroyed) { listMessage.textContent = ''; await queryDemands(); } }
    catch (error) { if (!destroyed) listMessage.textContent = error.message; }
    finally { if (!destroyed) $('[data-refresh]').disabled = false; }
  }
  $('[data-refresh]').onclick = refresh;
  form.onsubmit = async event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true;
    saveMessage.textContent = 'Cadastrando…';
    try {
      const saved = await store.create({nomeCaso: form.elements.nomeCaso.value, tipoCrime: type.value, subtipoCrime: subtype.value});
      if (destroyed) return;
      select.value = saved.id; select.dispatchEvent(new select.ownerDocument.defaultView.Event('change'));
      saveMessage.textContent = saved.listaAtualizada ? 'Caso cadastrado. A lista de fenômenos criminais foi atualizada.'
        : 'Caso cadastrado. A atualização dos demais casos falhou; use Atualizar lista.';
      form.reset(); populateSubtypes();
    } catch (error) { if (!destroyed) saveMessage.textContent = error.message; }
    finally { if (!destroyed) submit.disabled = false; }
  };
  return {refresh, setMode, destroy() { destroyed = true; requestVersion++; unbind(); unsubscribe(); root.replaceChildren(); }};
}
