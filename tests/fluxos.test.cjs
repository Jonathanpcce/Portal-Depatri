const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {setupBackend, setupFrontend, read, plain} = require('./harness.cjs');
const payload = changes => ({nomeCaso: 'FURTO DE HILUX', tipoCrime: 'FURTO', subtipoCrime: 'FURTO DE VEICULO', solicitacaoId: crypto.randomUUID(), ...changes});
const save = (api, changes) => api.salvarCasoPrioritarioSemEventos('nuip', payload(changes));
test('fontes completos e combinação dos dois backends têm sintaxe válida', () => {
  new vm.Script(read('MAESTRO.gs') + '\n' + read('DASHBOARD.gs'));
  for (const name of ['JAVASCRIPT.html', 'DASHBOARD_JS.html']) new vm.Script(read(name).replace(/^\s*<script>\s*/, '').replace(/\s*<\/script>\s*$/, ''));
});
test('dashboard conferido no manifesto e referências ao mapa/assistente removidas', () => {
  const report = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/ARQUIVOS.json')));
  for (const name of ['DASHBOARD.gs', 'DASHBOARD_JS.html']) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../apps-script', name))).digest('hex');
    assert.equal(hash, report[name].sha256Entrega);
  }
  assert.doesNotMatch(read('INDEX.html') + read('JAVASCRIPT.html'), /maptiler|cpMapa|Plotar eventos|Assistente IA|aplicarVisibilidadeAssistenteIA/i);
  assert.match(read('INDEX.html'), /leaflet@1\.9\.4/);
});
test('nome cadastrado aparece no mesmo catálogo do bootstrap e dos menus de demandas', () => {
  const {api} = setupBackend(); const created = save(api).caso;
  assert.equal(created.nomeCaso, 'FURTO DE HILUX');
  assert.deepEqual(plain(api.obterBootstrapCasosPrioritarios('nuip').casos), plain(api.carregarMenusDemandas().catalogoCasos));
  assert.deepEqual(plain(api.carregarMenusDemandas().casos), ['FURTO DE HILUX']);
  assert.deepEqual(plain(api.carregarMenusDemandas().tiposCrimes), ['FURTO', 'ROUBO', 'OUTROS']);
});
test('subtipo incompatível, vazio e campos extras são recusados; OUTROS permite vazio', () => {
  const {api, sheets} = setupBackend();
  for (const patch of [{subtipoCrime: 'ROUBO A PESSOA'}, {subtipoCrime: ''}, {nomeCaso: ''}, {nomeCaso: '=IMPORTXML(A1)'}, {latitude: '-3.7'}])
    assert.throws(() => save(api, patch));
  assert.equal(sheets.INVEST_CASOS.getLastRow(), 1);
  assert.equal(save(api, {tipoCrime: 'OUTROS', subtipoCrime: ''}).caso.subtipoCrime, '');
});
test('duplicidade e retry não criam novos registros; lock é liberado', () => {
  const {api, sheets, lock} = setupBackend(); const request = payload();
  const first = api.salvarCasoPrioritarioSemEventos('nuip', request);
  const retry = api.salvarCasoPrioritarioSemEventos('nuip', request);
  assert.equal(first.caso.id, retry.caso.id);
  assert.throws(() => save(api, {nomeCaso: '  furto   de hilux '}), /Já existe/);
  assert.equal(sheets.INVEST_CASOS.getLastRow(), 2); assert.equal(lock.locked, false);
});
test('perfis de consulta não cadastram casos ou demandas', () => {
  const {api} = setupBackend();
  assert.throws(() => api.salvarCasoPrioritarioSemEventos('leitor', payload()), /Apenas ADMIN/);
  assert.equal(api.salvarDemandaBanco({usuarioLogin: 'leitor'}).sucesso, false);
  assert.throws(() => api.obterBootstrapCasosPrioritarios('inexistente'), /Usuário não encontrado/);
});
test('nomes históricos são lidos sem reescrever a origem ou fundir duplicados', () => {
  const {api, sheets} = setupBackend({caseRows: [['2', 'FURTO DE VEÍCULO', 'FURTO', '', 'FURTO DE HILUX', 'histórico A'],
    ['13', 'FURTO DE VEICULO', 'FURTO', 'CARRO', 'FURTO DE HILUX', 'histórico B']]});
  const before = structuredClone(sheets.INVEST_CASOS.rows);
  const list = api.obterBootstrapCasosPrioritarios('nuip').casos;
  assert.equal(list.length, 2); assert.ok(list.every(c => c.duplicado));
  assert.deepEqual(sheets.INVEST_CASOS.rows, before);
  assert.throws(() => save(api), /Já existe/);
});
test('demanda é gravada com ID e nome do caso; busca por caso e por tipo funciona', () => {
  const {api, sheets} = setupBackend(); const caso = save(api).caso;
  const ret = api.salvarDemandaBanco({usuarioLogin: 'nuip', tipoOcorrencia: 'BO', numOcorrencia: '123/2026', unidade: 'DRFV',
    crimeTipo: 'FURTO DE VEICULO', casoId: caso.id, caso: 'NOME NÃO CONFIÁVEL', dataOcorrencia: '2026-09-15'});
  assert.equal(ret.sucesso, true, ret.erro);
  const headers = sheets.DEMANDAS_ATIVAS.rows[0], row = sheets.DEMANDAS_ATIVAS.rows[1];
  assert.equal(row[headers.indexOf('CASO')], caso.nomeCaso); assert.equal(row[headers.indexOf('CASO_ID')], caso.id);
  assert.equal(api.pesquisarDemandasAtivas('nuip', {casoId: caso.id, tipoCrime: 'FURTO'}).resultados.length, 1);
  assert.equal(api.pesquisarDemandasAtivas('nuip', {tipoCrime: 'ROUBO'}).resultados.length, 0);
  assert.equal(api.obterDemandaAtivaPorRowIndex('nuip', 2).demanda.casoId, caso.id);
  assert.equal(api.obterDemandasVinculadasCasoPrioritario('nuip', caso.id).demandas.length, 1);
});
test('edição mantém vínculo histórico e colunas extras; pode trocar para um caso por ID', () => {
  const {api, sheets} = setupBackend({demands: [{CASO: 'FENÔMENO ANTIGO', CRIME_TIPO: 'ROUBO A PESSOA', TIPO_PROCEDIMENTO: 'BO', NUMERO_PROCEDIMENTO: '50/2026', COLUNA_EXTERNA: 'preservar'}]});
  const base = {usuarioLogin: 'nuip', rowIndex: 2, tipoOcorrencia: 'BO', numOcorrencia: '50/2026', crimeTipo: 'ROUBO A PESSOA', caso: 'FENÔMENO ANTIGO', casoId: ''};
  const updated = api.atualizarDemandaBanco(base); assert.equal(updated.sucesso, true, updated.erro);
  let h = sheets.DEMANDAS_ATIVAS.rows[0], r = sheets.DEMANDAS_ATIVAS.rows[1];
  assert.equal(r[h.indexOf('CASO')], 'FENÔMENO ANTIGO'); assert.equal(r[h.indexOf('COLUNA_EXTERNA')], 'preservar');
  const caso = save(api).caso;
  const result = api.atualizarDemandaBanco({...base, casoId: caso.id}); assert.equal(result.sucesso, true, result.erro);
  assert.equal(r[h.indexOf('CASO_ID')], caso.id); assert.equal(r[h.indexOf('CRIME_TIPO')], 'ROUBO A PESSOA');
});
test('demanda antiga com nome duplicado não é atribuída aos dois casos', () => {
  const {api} = setupBackend({caseRows: [['2', 'FURTO DE VEICULO', 'FURTO', '', 'FURTO DE HILUX'], ['13', 'FURTO DE VEICULO', 'FURTO', '', 'FURTO DE HILUX']],
    addIdColumn: true, demands: [{CASO: 'FURTO DE HILUX', UNIDADE_RESPONSAVEL: 'DRFV'}, {CASO: 'FURTO DE HILUX', CASO_ID: '2', UNIDADE_RESPONSAVEL: 'DRFV'}]});
  const one = api.obterDemandasVinculadasCasoPrioritario('nuip', '2'), two = api.obterDemandasVinculadasCasoPrioritario('nuip', '13');
  assert.equal(one.demandas.length, 1); assert.equal(two.demandas.length, 0); assert.equal(one.vinculosPendentes, 1);
});
test('consulta de demandas vinculadas respeita a lotação do perfil leitor', () => {
  const {api} = setupBackend({caseRows: [['1', 'FURTO DE VEICULO', 'FURTO', '', 'CASO TESTE']],
    demands: [{CASO: 'CASO TESTE', UNIDADE_RESPONSAVEL: 'DRFV'}, {CASO: 'CASO TESTE', UNIDADE_RESPONSAVEL: 'DAS'}]});
  assert.equal(api.obterDemandasVinculadasCasoPrioritario('leitor', '1').demandas.length, 1);
});
test('formulário real cadastra e atualiza seletores reais do INDEX e payload da demanda', () => {
  const backend = setupBackend(), ui = setupFrontend(backend), w = ui.window, d = ui.document;
  w.preencherMenusDemandas(plain(backend.api.carregarMenusDemandas())); w.montarInterfaceMod5('NOVO'); ui.flush();
  const form = d.getElementById('cpCadastroForm');
  assert.equal(d.getElementById('cpCadastroBox').style.display, '');
  assert.deepEqual([...form.querySelectorAll('input,select')].map(e => e.name), ['nomeCaso', 'tipoCrime', 'subtipoCrime']);
  d.getElementById('cpNomeCaso').value = 'FURTO DE HILUX'; d.getElementById('cpTipoCrime').value = 'FURTO'; w.preencherSubtiposCrimeCasosFrontend_();
  assert.equal(d.getElementById('cpSubtipoCrime').options.length, 3);
  d.getElementById('cpSubtipoCrime').value = 'FURTO DE VEICULO'; w.salvarCasoPrioritarioSemEventosFrontend({preventDefault() {}}); ui.flush();
  const id = backend.api.obterBootstrapCasosPrioritarios('nuip').casos[0].id;
  for (const name of ['cpCasoExistente', 'dem_caso', 'dem_busca_caso_especifico']) {
    assert.ok([...d.getElementById(name).options].some(o => o.value === id && o.textContent === 'FURTO DE HILUX'));
  }
  assert.match(d.getElementById('cpCadastroMensagem').textContent, /Caso cadastrado/);
  d.getElementById('dem_caso').value = id;
  const p = w.montarPayloadDemandaFrontend_({}); assert.equal(p.casoId, id); assert.equal(p.caso, 'FURTO DE HILUX');
  ui.dom.window.close();
});
test('edição carrega fenômeno por ID e busca envia casoId e tipoCrime separadamente', () => {
  const backend = setupBackend(); const caso = save(backend.api).caso;
  const ui = setupFrontend(backend), w = ui.window, d = ui.document;
  w.preencherMenusDemandas(plain(backend.api.carregarMenusDemandas())); w.selecionarCasoDemandaFrontend_(caso.id, caso.nomeCaso);
  assert.equal(d.getElementById('dem_caso').value, caso.id);
  d.getElementById('dem_busca_caso_especifico').value = caso.id; d.getElementById('dem_busca_nome_caso').value = 'FURTO';
  w.buscarDemandasAtivasFrontend();
  const call = ui.calls.at(-1); assert.equal(call.name, 'pesquisarDemandasAtivas'); assert.equal(call.args[1].casoId, caso.id); assert.equal(call.args[1].tipoCrime, 'FURTO');
  assert.equal(call.args[1].casoEspecifico, ''); ui.dom.window.close();
});
test('valores históricos fora do catálogo são preservados ao editar outros campos', () => {
  const ui = setupFrontend(setupBackend()), w = ui.window, d = ui.document;
  w.selecionarCasoDemandaFrontend_('', 'FENÔMENO ANTERIOR');
  assert.deepEqual(plain(w.obterSelecaoCasoDemandaFrontend_('dem_caso')), {id: '', nome: 'FENÔMENO ANTERIOR'});
  w.atualizarCatalogoCompartilhadoCasos_([], []);
  assert.deepEqual(plain(w.obterSelecaoCasoDemandaFrontend_('dem_caso')), {id: '', nome: 'FENÔMENO ANTERIOR'});
  assert.match(d.getElementById('dem_caso').selectedOptions[0].textContent, /registro anterior/); ui.dom.window.close();
});
test('resposta de lista após troca de usuário não restaura os dados anteriores', () => {
  const backend = setupBackend(); save(backend.api);
  const ui = setupFrontend(backend), w = ui.window;
  w.montarInterfaceMod5('NOVO'); w.limparEstadoCasosCadastro_(); w.usuarioAtual = {login: 'leitor', perfil: 'DELEGACIA'}; ui.flush();
  assert.equal(w.CASOS_CADASTRO_STATE.casos.length, 0); assert.equal(w.CASOS_CADASTRO_STATE.podeCadastrar, false); ui.dom.window.close();
});
