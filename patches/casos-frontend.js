// MÓDULO 5 — CADASTRO DE CASOS E LISTA COMPARTILHADA COM DEMANDAS ATIVAS
var CASOS_CADASTRO_STATE = {casos: [], tipos: [], podeCadastrar: false, versao: 0, busca: 0, consulta: 0,
  salvando: false, solicitacao: null, modo: 'EXISTENTE'};

function chaveNomeCasoFrontend_(valor) {
  return String(valor == null ? '' : valor).normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();
}
function usuarioCasosFrontend_() { return String((window.usuarioAtual || {}).login || ''); }
function limparEstadoCasosCadastro_() {
  CASOS_CADASTRO_STATE.versao++; CASOS_CADASTRO_STATE.busca++; CASOS_CADASTRO_STATE.consulta++;
  CASOS_CADASTRO_STATE.casos = []; CASOS_CADASTRO_STATE.tipos = []; CASOS_CADASTRO_STATE.podeCadastrar = false;
  CASOS_CADASTRO_STATE.solicitacao = null; CASOS_CADASTRO_STATE.salvando = false;
  ['cpCasoExistente', 'dem_caso', 'dem_busca_caso_especifico'].forEach(function(id) {
    var select = document.getElementById(id); if (select) { select.innerHTML = ''; adicionarOpcaoCasoFrontend_(select, '', 'Selecione'); }
  });
}
function adicionarOpcaoCasoFrontend_(select, valor, texto, nome, legado) {
  var option = document.createElement('option'); option.value = valor; option.textContent = texto;
  option.setAttribute('data-caso-nome', nome || ''); option.setAttribute('data-caso-legado', legado ? 'true' : 'false');
  select.appendChild(option); return option;
}
function obterSelecaoCasoDemandaFrontend_(idSelect) {
  var select = document.getElementById(idSelect), option = select && select.options[select.selectedIndex];
  if (!option || !option.value) return {id: '', nome: ''};
  if (option.getAttribute('data-caso-legado') === 'true') return {id: '', nome: option.getAttribute('data-caso-nome') || option.textContent};
  var caso = CASOS_CADASTRO_STATE.casos.filter(function(c) { return c.id === option.value; })[0];
  return caso ? {id: caso.id, nome: caso.nomeCaso} : {id: '', nome: option.getAttribute('data-caso-nome') || option.value};
}
function popularSeletorCasosCadastro_(idSelect, placeholder) {
  var select = document.getElementById(idSelect); if (!select) return;
  var anterior = obterSelecaoCasoDemandaFrontend_(idSelect);
  select.innerHTML = ''; adicionarOpcaoCasoFrontend_(select, '', placeholder);
  CASOS_CADASTRO_STATE.casos.forEach(function(c) {
    var rotulo = c.nomeCaso + (c.duplicado ? ' (cadastro ' + c.id + ')' : '');
    adicionarOpcaoCasoFrontend_(select, c.id, rotulo, c.nomeCaso, false);
  });
  if (anterior.id && CASOS_CADASTRO_STATE.casos.some(function(c) { return c.id === anterior.id; })) select.value = anterior.id;
  else if (anterior.nome && idSelect !== 'cpCasoExistente') selecionarCasoDemandaFrontend_(anterior.id, anterior.nome, idSelect);
}
function selecionarCasoDemandaFrontend_(id, nome, idSelect) {
  var select = document.getElementById(idSelect || 'dem_caso'); if (!select) return;
  id = String(id || ''); nome = String(nome || '');
  if (!id && !nome) { select.value = ''; return; }
  var casos = CASOS_CADASTRO_STATE.casos;
  var matches = id ? casos.filter(function(c) { return c.id === id; })
    : casos.filter(function(c) { return chaveNomeCasoFrontend_(c.nomeCaso) === chaveNomeCasoFrontend_(nome); });
  if (matches.length === 1 && !matches[0].nomePendente) {
    if (!Array.from(select.options).some(function(o) { return o.value === matches[0].id; }))
      adicionarOpcaoCasoFrontend_(select, matches[0].id, matches[0].nomeCaso, matches[0].nomeCaso, false);
    select.value = matches[0].id;
  } else {
    Array.from(select.options).filter(function(o) { return o.getAttribute('data-caso-legado') === 'true'; }).forEach(function(o) { o.remove(); });
    adicionarOpcaoCasoFrontend_(select, 'legacy:' + encodeURIComponent(nome), nome + ' (registro anterior)', nome, true);
    select.value = 'legacy:' + encodeURIComponent(nome);
  }
}
function atualizarCatalogoCompartilhadoCasos_(casos, tipos, mesclar) {
  var atuais = mesclar ? CASOS_CADASTRO_STATE.casos.slice() : [];
  (casos || []).forEach(function(c) {
    var i = atuais.findIndex(function(a) { return a.id === c.id; });
    if (i < 0) atuais.push(c); else atuais[i] = c;
  });
  CASOS_CADASTRO_STATE.casos = atuais.sort(function(a, b) { return a.nomeCaso.localeCompare(b.nomeCaso, 'pt-BR') || a.id.localeCompare(b.id); });
  if (tipos) CASOS_CADASTRO_STATE.tipos = tipos;
  popularSeletorCasosCadastro_('cpCasoExistente', 'Selecione um caso');
  popularSeletorCasosCadastro_('dem_caso', 'Selecione');
  popularSeletorCasosCadastro_('dem_busca_caso_especifico', 'Todos');
}
function preencherTiposCrimeCasosFrontend_() {
  var select = document.getElementById('cpTipoCrime'); if (!select) return;
  var anterior = select.value, sub = (document.getElementById('cpSubtipoCrime') || {}).value;
  select.innerHTML = ''; adicionarOpcaoCasoFrontend_(select, '', 'Selecione');
  CASOS_CADASTRO_STATE.tipos.forEach(function(c) { adicionarOpcaoCasoFrontend_(select, c.tipo, c.tipo); });
  if (CASOS_CADASTRO_STATE.tipos.some(function(c) { return c.tipo === anterior; })) select.value = anterior;
  preencherSubtiposCrimeCasosFrontend_(sub);
}
function preencherSubtiposCrimeCasosFrontend_(anterior) {
  var tipo = document.getElementById('cpTipoCrime'), sub = document.getElementById('cpSubtipoCrime'); if (!tipo || !sub) return;
  var categoria = CASOS_CADASTRO_STATE.tipos.filter(function(c) { return c.tipo === tipo.value; })[0];
  var lista = categoria ? categoria.subtipos : [];
  sub.innerHTML = ''; adicionarOpcaoCasoFrontend_(sub, '', !categoria ? 'Selecione o tipo primeiro' : lista.length ? 'Selecione' : 'Sem subtipo cadastrado');
  lista.forEach(function(s) { adicionarOpcaoCasoFrontend_(sub, s, s); });
  sub.required = lista.length > 0; sub.disabled = !lista.length;
  if (lista.indexOf(anterior) > -1) sub.value = anterior;
}
function montarInterfaceMod5(modoInicial) {
  var root = document.getElementById('mod5'); if (!root) return;
  CASOS_CADASTRO_STATE.consulta++;
  root.innerHTML = '<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 border-bottom border-warning pb-3 mb-4">'
    + '<div><h4 class="text-gold mb-1"><i class="fas fa-folder-open"></i> Casos prioritários</h4>'
    + '<div class="small text-muted">Cadastre um caso e consulte as demandas vinculadas.</div></div>'
    + '<button type="button" id="cpNovoCaso" class="btn btn-warning" onclick="alternarModoCasoCasosPrioritarios(\'NOVO\')" disabled>Novo caso</button></div>'
    + '<div class="card card-depatri mb-4" id="cpCadastroBox" style="display:none"><div class="card-header card-header-gold"><h5 class="mb-0">Cadastrar caso</h5></div><div class="card-body">'
    + '<form id="cpCadastroForm" onsubmit="return salvarCasoPrioritarioSemEventosFrontend(event)"><div class="row g-3">'
    + '<div class="col-lg-4"><label for="cpNomeCaso" class="form-label">Nome do caso</label><input id="cpNomeCaso" name="nomeCaso" class="form-control" maxlength="150" required autocomplete="off" placeholder="Ex.: FURTO DE HILUX"></div>'
    + '<div class="col-lg-3"><label for="cpTipoCrime" class="form-label">Tipo de crime</label><select id="cpTipoCrime" name="tipoCrime" class="form-select" required onchange="preencherSubtiposCrimeCasosFrontend_()"></select></div>'
    + '<div class="col-lg-5"><label for="cpSubtipoCrime" class="form-label">Subtipo de crime</label><select id="cpSubtipoCrime" name="subtipoCrime" class="form-select" disabled></select></div>'
    + '</div><div class="d-flex gap-2 mt-3"><button id="cpSalvarCaso" class="btn btn-warning" type="submit">Cadastrar caso</button>'
    + '<button class="btn btn-outline-secondary" type="button" onclick="alternarModoCasoCasosPrioritarios(\'EXISTENTE\')">Cancelar</button></div>'
    + '<div id="cpCadastroMensagem" class="small mt-3" role="status" aria-live="polite"></div></form></div></div>'
    + '<div class="card card-depatri mb-4"><div class="card-body"><div class="row g-3 align-items-end">'
    + '<div class="col-lg-9"><label for="cpCasoExistente" class="form-label">Selecione um caso</label><select class="form-select" id="cpCasoExistente" onchange="carregarDemandasCasoSelecionadoFrontend_()"></select></div>'
    + '<div class="col-lg-3"><button type="button" id="cpAtualizarLista" class="btn btn-outline-warning w-100" onclick="atualizarListaCasosPrioritariosFrontend_()">Atualizar lista</button></div></div>'
    + '<div id="cpListaMensagem" class="small text-muted mt-3" role="status" aria-live="polite"></div><div id="cpResumoCaso" class="mt-3"></div></div></div>'
    + '<div id="cpDemandasBox" class="card card-depatri" style="display:none"><div class="card-header card-header-gold"><h5 class="mb-0">Demandas vinculadas</h5></div>'
    + '<div class="card-body"><div id="cpDemandasMensagem" class="small text-muted mb-3" role="status" aria-live="polite"></div><div id="cpDemandasTabela" class="table-responsive"></div></div></div>';
  CASOS_CADASTRO_STATE.modo = modoInicial === 'NOVO' || modoInicial === 'cadastro' || (typeof DEPATRI_MODO_CASOS !== 'undefined' && DEPATRI_MODO_CASOS === 'cadastro') ? 'NOVO' : 'EXISTENTE';
  popularSeletorCasosCadastro_('cpCasoExistente', 'Selecione um caso'); preencherTiposCrimeCasosFrontend_();
  atualizarListaCasosPrioritariosFrontend_();
}
function alternarModoCasoCasosPrioritarios(modo) {
  if (modo) CASOS_CADASTRO_STATE.modo = modo === 'NOVO' || modo === 'cadastro' ? 'NOVO' : 'EXISTENTE';
  var box = document.getElementById('cpCadastroBox');
  if (box) box.style.display = CASOS_CADASTRO_STATE.modo === 'NOVO' && CASOS_CADASTRO_STATE.podeCadastrar ? '' : 'none';
  var button = document.getElementById('cpNovoCaso');
  if (button) { button.disabled = !CASOS_CADASTRO_STATE.podeCadastrar; button.style.display = CASOS_CADASTRO_STATE.podeCadastrar ? '' : 'none'; }
}
function atualizarListaCasosPrioritariosFrontend_() {
  var usuario = usuarioCasosFrontend_(), versao = CASOS_CADASTRO_STATE.versao, busca = ++CASOS_CADASTRO_STATE.busca;
  var button = document.getElementById('cpAtualizarLista'), msg = document.getElementById('cpListaMensagem');
  if (button) button.disabled = true; if (msg) msg.textContent = 'Carregando casos…';
  google.script.run.withSuccessHandler(function(ret) {
    if (usuario !== usuarioCasosFrontend_() || versao !== CASOS_CADASTRO_STATE.versao || busca !== CASOS_CADASTRO_STATE.busca) return;
    if (button) button.disabled = false;
    if (!ret || ret.sucesso === false) { if (msg) msg.textContent = ret && ret.erro || 'Não foi possível carregar a lista.'; return; }
    CASOS_CADASTRO_STATE.podeCadastrar = !!ret.podeCadastrar;
    atualizarCatalogoCompartilhadoCasos_(ret.casos, ret.tipos, false); preencherTiposCrimeCasosFrontend_(); alternarModoCasoCasosPrioritarios();
    if (msg) msg.textContent = ret.casos.length ? '' : 'Nenhum caso cadastrado.';
    carregarDemandasCasoSelecionadoFrontend_();
  }).withFailureHandler(function(erro) {
    if (usuario !== usuarioCasosFrontend_() || versao !== CASOS_CADASTRO_STATE.versao || busca !== CASOS_CADASTRO_STATE.busca) return;
    if (button) button.disabled = false; if (msg) msg.textContent = (erro && erro.message) || 'Não foi possível carregar os casos.';
  }).obterBootstrapCasosPrioritarios(usuario);
}
function novaSolicitacaoCasoFrontend_() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  var bytes = new Uint8Array(16); window.crypto.getRandomValues(bytes); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  var hex = Array.from(bytes).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
}
function salvarCasoPrioritarioSemEventosFrontend(event) {
  if (event) event.preventDefault();
  var form = document.getElementById('cpCadastroForm'), msg = document.getElementById('cpCadastroMensagem'), button = document.getElementById('cpSalvarCaso');
  if (!form || !form.reportValidity() || CASOS_CADASTRO_STATE.salvando) return false;
  if (!CASOS_CADASTRO_STATE.podeCadastrar) { msg.textContent = 'Seu perfil permite somente consultar casos.'; return false; }
  var payload = {nomeCaso: document.getElementById('cpNomeCaso').value.trim(), tipoCrime: document.getElementById('cpTipoCrime').value, subtipoCrime: document.getElementById('cpSubtipoCrime').value};
  var assinatura = JSON.stringify([chaveNomeCasoFrontend_(payload.nomeCaso), payload.tipoCrime, payload.subtipoCrime]);
  if (!CASOS_CADASTRO_STATE.solicitacao || CASOS_CADASTRO_STATE.solicitacao.assinatura !== assinatura)
    CASOS_CADASTRO_STATE.solicitacao = {assinatura: assinatura, id: novaSolicitacaoCasoFrontend_()};
  payload.solicitacaoId = CASOS_CADASTRO_STATE.solicitacao.id;
  var usuario = usuarioCasosFrontend_(), versao = CASOS_CADASTRO_STATE.versao;
  CASOS_CADASTRO_STATE.salvando = true; button.disabled = true; msg.textContent = 'Cadastrando…';
  function falhou(erro) {
    if (usuario !== usuarioCasosFrontend_() || versao !== CASOS_CADASTRO_STATE.versao) return;
    CASOS_CADASTRO_STATE.salvando = false; button.disabled = false; msg.textContent = (erro && erro.message) || 'Não foi possível cadastrar o caso.';
  }
  google.script.run.withSuccessHandler(function(ret) {
    if (usuario !== usuarioCasosFrontend_() || versao !== CASOS_CADASTRO_STATE.versao) return;
    if (!ret || !ret.sucesso || !ret.caso) { falhou({message: ret && ret.erro}); return; }
    CASOS_CADASTRO_STATE.salvando = false; CASOS_CADASTRO_STATE.solicitacao = null; CASOS_CADASTRO_STATE.busca++;
    atualizarCatalogoCompartilhadoCasos_(ret.casos || [ret.caso], ret.tipos, true);
    var atualizar = document.getElementById('cpAtualizarLista'); if (atualizar) atualizar.disabled = false;
    var listaMensagem = document.getElementById('cpListaMensagem'); if (listaMensagem) listaMensagem.textContent = '';
    if (document.getElementById('cpCadastroForm') !== form) return;
    button.disabled = false; msg.textContent = 'Caso cadastrado. A lista de Fenômeno Criminal foi atualizada.';
    var select = document.getElementById('cpCasoExistente'); if (select) select.value = ret.caso.id;
    form.reset(); preencherSubtiposCrimeCasosFrontend_(); carregarDemandasCasoSelecionadoFrontend_();
  }).withFailureHandler(falhou).salvarCasoPrioritarioSemEventos(usuario, payload);
  return false;
}
function carregarDemandasCasoSelecionadoFrontend_() {
  var select = document.getElementById('cpCasoExistente'), resumo = document.getElementById('cpResumoCaso'), box = document.getElementById('cpDemandasBox');
  if (!select || !resumo || !box) return;
  var caso = CASOS_CADASTRO_STATE.casos.filter(function(c) { return c.id === select.value; })[0];
  var consulta = ++CASOS_CADASTRO_STATE.consulta, usuario = usuarioCasosFrontend_(), versao = CASOS_CADASTRO_STATE.versao;
  resumo.innerHTML = ''; box.style.display = caso ? '' : 'none';
  if (!caso) return;
  var dl = document.createElement('dl'); dl.className = 'row border-top border-secondary pt-3';
  [['Nome do caso', caso.nomeCaso], ['Tipo de crime', caso.tipoCrime], ['Subtipo de crime', caso.subtipoCrime || 'Sem subtipo cadastrado']].forEach(function(par) {
    var column = document.createElement('div'); column.className = 'col-lg-4 mb-2';
    var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = par[0]; dd.textContent = par[1]; column.appendChild(dt); column.appendChild(dd); dl.appendChild(column);
  });
  resumo.appendChild(dl);
  if (caso.classificacaoPendente || caso.nomePendente) { var aviso = document.createElement('p'); aviso.className = 'small text-warning'; aviso.textContent = 'Este cadastro anterior contém dados que precisam ser conferidos.'; resumo.appendChild(aviso); }
  var msg = document.getElementById('cpDemandasMensagem'), tabela = document.getElementById('cpDemandasTabela');
  msg.textContent = 'Carregando demandas…'; tabela.innerHTML = '';
  google.script.run.withSuccessHandler(function(ret) {
    if (consulta !== CASOS_CADASTRO_STATE.consulta || usuario !== usuarioCasosFrontend_() || versao !== CASOS_CADASTRO_STATE.versao) return;
    if (!ret || ret.sucesso === false) { msg.textContent = ret && ret.erro || 'Não foi possível consultar as demandas.'; return; }
    msg.textContent = ret.demandas.length ? '' : 'Nenhuma demanda vinculada disponível para o seu acesso.';
    if (ret.vinculosPendentes) msg.textContent += ' Há ' + ret.vinculosPendentes + ' demanda(s) antiga(s) com esse nome aguardando identificação do cadastro correto.';
    if (!ret.demandas.length) return;
    var table = document.createElement('table'); table.className = 'table table-dark table-hover align-middle';
    table.innerHTML = '<thead><tr><th>Data</th><th>Procedimento</th><th>Unidade responsável</th><th>Status</th><th>Crime</th></tr></thead><tbody></tbody>';
    ret.demandas.forEach(function(d) { var tr = document.createElement('tr');
      [d.dataOcorrencia, d.procedimentoConcat, d.unidade, d.statusDemanda || d.status, d.crimeTipo].forEach(function(v) { var td = document.createElement('td'); td.textContent = v || '—'; tr.appendChild(td); });
      table.querySelector('tbody').appendChild(tr);
    }); tabela.appendChild(table);
  }).withFailureHandler(function(erro) {
    if (consulta !== CASOS_CADASTRO_STATE.consulta || usuario !== usuarioCasosFrontend_() || versao !== CASOS_CADASTRO_STATE.versao) return;
    msg.textContent = (erro && erro.message) || 'Não foi possível consultar as demandas.';
  }).obterDemandasVinculadasCasoPrioritario(usuario, caso.id);
}
