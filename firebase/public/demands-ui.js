import {bindCaseSelector} from './cases-ui.js';

export async function mountDemands(root, store, casesStore, {onSaved = async () => {}} = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  root.innerHTML = `<header class="section-heading"><div><p class="eyebrow">DEMANDAS ATIVAS</p><h1>Registro de Demandas</h1>
    <p>Cadastre ocorrências, selecione o fenômeno criminal e acompanhe os resultados.</p></div><button type="button" data-new-demand hidden>Nova demanda</button></header>
    <p data-message role="status" aria-live="polite">Carregando…</p>
    <section class="panel" data-search-panel hidden><h2>Buscar Ocorrência</h2><form data-search-form><div class="fields search-fields" data-filters></div>
      <div class="actions"><button type="submit">Buscar</button><button type="button" class="secondary" data-clear-search>Limpar busca</button></div></form></section>
    <section class="panel" data-editor hidden><h2 data-editor-title>Nova demanda</h2><form data-demand-form>
      <div class="fields demand-fields" data-fields></div><h2 class="subheading">Contadores e detalhes</h2><div class="fields" data-counters></div>
      <div data-details></div><div class="actions"><button type="submit" data-save>Salvar demanda</button><button type="button" class="secondary" data-cancel-edit>Fechar</button></div>
      <p data-save-message role="status" aria-live="polite"></p></form></section>
    <section class="panel" data-results hidden><h2>Demandas encontradas</h2><p data-search-message role="status" aria-live="polite"></p>
      <div class="table-scroll"><table><thead><tr><th>Data</th><th>Ocorrência</th><th>Unidade</th><th>Fenômeno Criminal</th><th>Evolução</th><th>Procedimento instaurado</th><th>Ações</th></tr></thead><tbody></tbody></table></div>
      <button type="button" class="secondary" data-more hidden>Carregar mais</button></section>`;
  const $ = s => root.querySelector(s), form = $('[data-demand-form]'), searchForm = $('[data-search-form]');
  let destroyed = false, current = null, editing = false, busy = false, loadVersion = 0, searchVersion = 0;
  let next = null, lastFilters = {}, searchBusy = false;
  const controls = new Map(), searchControls = new Map(), counterControls = new Map(), groups = new Map(), disposers = [];
  const view = {destroy() { if (destroyed) return; destroyed = true; loadVersion++; searchVersion++; disposers.forEach(fn => fn()); root.replaceChildren(); }};
  // destroy pode ser chamado antes do bootstrap terminar (logout/troca de usuário).
  root._destroyDemands = view.destroy;
  let setup;
  try { setup = await store.bootstrap(); }
  catch (error) { if (!destroyed) $('[data-message]').textContent = error.message; return view; }
  if (destroyed) return view;
  const {menus, campos, contadores, podeEditar} = setup;
  $('[data-message]').textContent = ''; $('[data-search-panel]').hidden = false; $('[data-new-demand]').hidden = !podeEditar;
  function element(tag, attrs = {}, text) {
    const el = doc.createElement(tag); Object.assign(el, attrs); if (text !== undefined) el.textContent = text; return el;
  }
  function options(select, values, placeholder = 'Selecione') {
    const previous = select.value; select.replaceChildren(element('option', {value: ''}, placeholder));
    values.forEach(value => select.append(element('option', {value}, value)));
    if (values.includes(previous)) select.value = previous;
  }
  function control(parent, spec, values, first) {
    const label = element('label', {}, spec.label), input = element(spec.menu ? 'select' : spec.type === 'textarea' ? 'textarea' : 'input', {name: spec.key});
    if (!spec.menu && spec.type !== 'textarea') input.type = spec.type || 'text';
    if (spec.menu) options(input, values || [], first);
    else if (spec.type !== 'checkbox') { input.maxLength = spec.max || 150; input.autocomplete = 'off'; }
    if (spec.type === 'textarea') { input.rows = 4; label.className = 'wide-field'; }
    if (spec.type === 'checkbox') label.className = 'check-label';
    input.required = !!spec.required; label.append(input); parent.append(label); return input;
  }
  for (const spec of campos) {
    const input = control($('[data-fields]'), spec, menus[spec.menu]); input.dataset.editable = 'true'; controls.set(spec.key, input);
  }
  const caseSelect = control($('[data-fields]'), {key: 'casoId', label: 'Fenômeno Criminal', menu: 'casos'});
  caseSelect.id = 'dem_caso'; caseSelect.dataset.editable = 'true'; controls.set('casoId', caseSelect);
  $('[data-fields]').insertBefore(caseSelect.parentElement, controls.get('crimeTipo').parentElement);
  disposers.push(bindCaseSelector(casesStore, caseSelect, {placeholder: 'Selecione'}));
  const filters = [
    {key: 'equipe', label: 'Equipe', menu: 'equipe'}, {key: 'status', label: 'Status', menu: 'status'},
    {key: 'data', label: 'Data', type: 'date'}, {key: 'numeroProcedimento', label: 'Nº do Procedimento'},
    {key: 'tipoCrime', label: 'Tipo de crime', menu: 'tipos'}, {key: 'casoId', label: 'Fenômeno criminal', menu: 'casos'},
    {key: 'pesquisaGeral', label: 'Pesquisa geral'}
  ];
  for (const spec of filters) searchControls.set(spec.key, control($('[data-filters]'), spec, menus[spec.menu], 'Todos'));
  searchControls.get('casoId').id = 'dem_busca_caso_especifico';
  disposers.push(bindCaseSelector(casesStore, searchControls.get('casoId'), {placeholder: 'Todos'}));
  disposers.push(casesStore.subscribe(s => options(searchControls.get('tipoCrime'), s.tipos.map(t => t.tipo), 'Todos')));
  function lock() {
    for (const input of root.querySelectorAll('[data-editable]')) input.disabled = busy || !podeEditar;
    controls.get('procedimentoInstaurado').disabled = busy || !podeEditar || controls.get('procedimentoNaoInstaurado').checked;
    $('[data-save]').hidden = !podeEditar; $('[data-save]').disabled = busy;
    $('[data-cancel-edit]').disabled = busy; $('[data-new-demand]').disabled = busy;
    for (const button of root.querySelectorAll('[data-open-demand]')) button.disabled = busy;
  }
  function conditions() {
    for (const spec of campos.filter(s => s.conditional === 'falseReport')) controls.get(spec.key).parentElement.hidden = controls.get('motivoEvolucaoDiversa').value !== menus.motivos[2];
    lock();
  }
  controls.get('procedimentoNaoInstaurado').onchange = () => { if (controls.get('procedimentoNaoInstaurado').checked) controls.get('procedimentoInstaurado').value = ''; lock(); };
  controls.get('motivoEvolucaoDiversa').onchange = conditions;
  function addDownload(parent, getReference) {
    const button = element('button', {type: 'button', className: 'secondary', hidden: !getReference()}, 'Baixar PDF');
    button.onclick = async () => {
      const ref = getReference(); if (!ref) return;
      button.disabled = true;
      try {
        if (!ref.startsWith('anexo:')) {
          const url = new URL(ref); if (url.protocol !== 'https:') throw new Error('Referência do PDF inválida.');
          win.open(url.href, '_blank', 'noopener,noreferrer'); return;
        }
        const saved = await store.download(ref); if (destroyed) return;
        const bytes = Uint8Array.from(win.atob(saved.base64), c => c.charCodeAt(0));
        const url = win.URL.createObjectURL(new win.Blob([bytes], {type: 'application/pdf'}));
        const link = element('a', {href: url, download: saved.nome}); doc.body.append(link); link.click(); link.remove();
        win.setTimeout(() => win.URL.revokeObjectURL(url), 1000);
      } catch (error) { if (!destroyed) $('[data-save-message]').textContent = error.message; }
      finally { if (!destroyed) button.disabled = false; }
    };
    parent.append(button); return button;
  }
  function renderDetails(counter, value) {
    const group = groups.get(counter.key), count = Number(counterControls.get(counter.key).value) || 0;
    if (count < 0 || count > 500 || !Number.isInteger(count)) return;
    if (value) { group.rows = []; group.root.replaceChildren(); }
    group.root.hidden = !count || !counter.details.length;
    for (let i = 0; i < count; i++) {
      if (group.rows[i]) { group.rows[i].node.hidden = false; continue; }
      const node = element('fieldset', {className: 'detail-row'}); node.append(element('legend', {}, `${counter.label} · ${i + 1}`));
      const grid = element('div', {className: 'fields'}); node.append(grid); const data = new Map();
      for (const detail of counter.details) {
        const input = control(grid, {...detail, key: `${detail.key}_${i}`, type: detail.type === 'pdf' ? 'file' : 'text', max: 500});
        input.dataset.editable = 'true';
        if (detail.type === 'pdf') {
          input.accept = 'application/pdf,.pdf'; input.dataset.reference = value?.[detail.key]?.[i] || '';
          const download = addDownload(input.parentElement, () => input.dataset.reference);
          const existing = element('span', {className: 'file-label'}, input.dataset.reference ? 'PDF já vinculado' : 'PDF opcional, até 10 MB');
          input.parentElement.append(existing); input._downloadButton = download; input._fileLabel = existing;
        } else input.value = value?.[detail.key]?.[i] || '';
        data.set(detail.key, input);
      }
      group.root.append(node); group.rows.push({node, data});
    }
    group.rows.forEach((row, i) => { row.node.hidden = i >= count; }); lock();
  }
  for (const c of contadores) {
    const input = control($('[data-counters]'), {key: c.key, label: c.label, type: 'number'});
    Object.assign(input, {min: '0', max: '500', step: '1', value: '0'}); input.dataset.editable = 'true'; counterControls.set(c.key, input);
    const section = element('div'); $('[data-details]').append(section); groups.set(c.key, {root: section, rows: []});
    input.onchange = () => renderDetails(c);
  }
  function setSelect(select, value) {
    select.querySelectorAll('[data-legacy-menu]').forEach(o => o.remove());
    if (value && ![...select.options].some(o => o.value === value)) {
      const old = element('option', {value}, `${value} (registro anterior)`); old.dataset.legacyMenu = 'true'; select.append(old);
    }
    select.value = value || '';
  }
  function openEditor(value = null) {
    loadVersion++; current = value; editing = !!value;
    $('[data-message]').textContent = '';
    form.reset();
    for (const spec of campos) {
      const input = controls.get(spec.key);
      if (spec.type === 'checkbox') input.checked = !!value?.[spec.key];
      else if (spec.menu) setSelect(input, value?.[spec.key]);
      else input.value = value?.[spec.key] || '';
    }
    caseSelect.querySelectorAll('[data-unmapped]').forEach(o => o.remove());
    if (value && (value.casoId || value.casoNome)) {
      const known = casesStore.snapshot().casos.find(c => c.id === value.casoId);
      if (known) caseSelect.value = known.id;
      else {
        const old = element('option', {value: `legacy:${value.id}`}, `${value.casoNome || value.casoId} (registro anterior)`);
        old.dataset.unmapped = 'true'; caseSelect.append(old); caseSelect.value = old.value;
      }
    } else caseSelect.value = '';
    caseSelect.dispatchEvent(new win.Event('change'));
    for (const c of contadores) { counterControls.get(c.key).value = String(value?.[c.key] || 0); renderDetails(c, value || {}); }
    $('[data-editor-title]').textContent = value ? podeEditar ? 'Editar demanda' : 'Consultar demanda' : 'Nova demanda';
    $('[data-editor]').hidden = false; $('[data-save-message]').textContent = ''; conditions();
  }
  async function load(id) {
    if (busy) return; const version = ++loadVersion; $('[data-message]').textContent = 'Carregando demanda…';
    try { const value = await store.get(id); if (destroyed || version !== loadVersion) return; openEditor(value); $('[data-message]').textContent = ''; }
    catch (error) { if (!destroyed && version === loadVersion) $('[data-message]').textContent = error.message; }
  }
  function drawResults(values) {
    for (const d of values) {
      const row = element('tr');
      for (const value of [d.dataOcorrencia?.split('-').reverse().join('/'), d.procedimentoConcat, d.unidadeResponsavel, d.casoNome, d.statusDemanda]) row.append(element('td', {}, value || '—'));
      const proc = element('td'), badge = element('span', {className: `badge ${d.procedimentoNaoInstaurado ? 'negative' : d.procedimentoInstaurado ? 'positive' : 'pending'}`},
        d.procedimentoNaoInstaurado ? 'NÃO INSTAURADO PELA DELEGACIA' : d.procedimentoInstaurado || 'NÃO INFORMADO');
      proc.append(badge); row.append(proc);
      const cell = element('td'), open = element('button', {type: 'button', className: 'secondary', disabled: busy}, podeEditar ? 'Abrir / editar' : 'Consultar');
      open.dataset.openDemand = d.id; open.onclick = () => load(d.id); cell.append(open); row.append(cell); $('tbody').append(row);
    }
  }
  async function search(append = false) {
    if (append && searchBusy) return;
    const version = ++searchVersion; searchBusy = true;
    if (!append) { lastFilters = Object.fromEntries([...searchControls].map(([k, v]) => [k, v.value])); next = null; $('tbody').replaceChildren(); }
    const cursor = append ? next : null; $('[data-results]').hidden = false; $('[data-more]').hidden = true; $('[data-search-message]').textContent = 'Buscando…';
    try {
      const result = await store.search(lastFilters, cursor);
      if (destroyed || version !== searchVersion) return;
      drawResults(result.resultados); next = result.proximaPagina; $('[data-more]').hidden = !next;
      $('[data-search-message]').textContent = next ? 'Há mais registros para pesquisar. Use Carregar mais.' : $('tbody').children.length ? '' : 'Nenhuma demanda encontrada para seu acesso e os filtros escolhidos.';
    } catch (error) { if (!destroyed && version === searchVersion) $('[data-search-message]').textContent = error.message; }
    finally { if (version === searchVersion) searchBusy = false; }
  }
  const readBase64 = file => new Promise((resolve, reject) => {
    const reader = new win.FileReader(); reader.onerror = () => reject(new Error('Não foi possível ler o PDF.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file);
  });
  form.onsubmit = async event => {
    event.preventDefault(); if (!podeEditar || busy || !form.reportValidity()) return;
    busy = true; lock(); $('[data-save-message]').textContent = 'Salvando demanda…';
    try {
      const data = Object.fromEntries(campos.map(s => [s.key, s.type === 'checkbox' ? controls.get(s.key).checked : controls.get(s.key).value]));
      if (!caseSelect.selectedOptions[0]?.dataset.unmapped) data.casoId = caseSelect.value || null;
      for (const c of contadores) {
        const count = Number(counterControls.get(c.key).value) || 0; data[c.key] = count;
        renderDetails(c); const rows = groups.get(c.key).rows.slice(0, count);
        for (const detail of c.details) {
          data[detail.key] = [];
          for (const row of rows) {
            const input = row.data.get(detail.key);
            if (detail.type === 'pdf') {
              if (input.files[0]) {
                $('[data-save-message]').textContent = 'Enviando PDF…';
                const uploaded = await store.upload(input.files[0], readBase64); if (destroyed) return;
                input.dataset.reference = uploaded.referencia; input._downloadButton.hidden = false; input._fileLabel.textContent = uploaded.nome;
              }
              data[detail.key].push(input.dataset.reference || '');
            } else data[detail.key].push(input.value.trim());
          }
        }
      }
      $('[data-save-message]').textContent = 'Salvando demanda…';
      const saved = await store.save(data, current); if (destroyed) return;
      $('[data-message]').textContent = `Demanda salva. ${saved.statusDemanda}.`;
      current = null; editing = false; $('[data-editor]').hidden = true;
      await search();
      try { await onSaved(saved); } catch { if (!destroyed) $('[data-message]').textContent += ' Atualize a consulta do caso para rever as demandas vinculadas.'; }
    } catch (error) { if (!destroyed) $('[data-save-message]').textContent = error.message; }
    finally { busy = false; if (!destroyed) lock(); }
  };
  $('[data-new-demand]').onclick = () => { if (!busy) openEditor(); };
  $('[data-cancel-edit]').onclick = () => { loadVersion++; current = null; editing = false; $('[data-editor]').hidden = true; };
  searchForm.onsubmit = event => { event.preventDefault(); return search(); };
  $('[data-clear-search]').onclick = () => { searchForm.reset(); return search(); };
  $('[data-more]').onclick = () => search(true);
  if (podeEditar) openEditor();
  return {...view, search, open: load, isEditing: () => editing};
}
