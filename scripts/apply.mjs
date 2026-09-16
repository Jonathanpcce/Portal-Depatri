import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
const root = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = process.argv[2] || process.env.DEPATRI_SOURCE_DIRECTORY;
if (!sourceDirectory) throw new Error('Os arquivos corrigidos já estão em apps-script. Para reaplicar as alterações aos originais, informe sua pasta: npm run build -- /caminho/dos/originais');
const sourceRoot = path.resolve(sourceDirectory);
const files = {
  'MAESTRO.gs': 'Texto colado(20260915-170738).txt',
  'INDEX.html': 'Código colado(20260915-170801).html',
  'JAVASCRIPT.html': 'Texto colado(20260915-170820).txt',
  'DASHBOARD.gs': 'Texto colado(20260915-170851).txt',
  'DASHBOARD_JS.html': 'Texto colado(20260915-170924).txt'
};
const original = {}, result = {}, report = {};
for (const [dest, src] of Object.entries(files)) {
  const bytes = await readFile(path.join(sourceRoot, src));
  original[dest] = bytes.toString('utf8').replace(/\r\n/g, '\n'); result[dest] = original[dest];
  report[dest] = {origem: src, sha256Origem: createHash('sha256').update(bytes).digest('hex')};
}
function exactly(source, old, replacement, name) {
  if (source.split(old).length !== 2) throw new Error('Trecho não encontrado de forma única: ' + name);
  return source.replace(old, () => replacement);
}
function modifyFunction(source, name, transform) {
  const ast = parse(source, {ecmaVersion: 'latest'});
  const nodes = ast.body.filter(n => n.type === 'FunctionDeclaration' && n.id.name === name);
  if (nodes.length !== 1) throw new Error('Função não encontrada de forma única: ' + name);
  const n = nodes[0]; return source.slice(0, n.start) + transform(source.slice(n.start, n.end)) + source.slice(n.end);
}
let back = result['MAESTRO.gs'];
back = modifyFunction(back, 'obterListasCasosDemandasAtivas_', () => `function obterListasCasosDemandasAtivas_(ss) {
  var catalogo = obterCatalogoCasosCadastro_(ss);
  var nomes = [], mapa = {};
  catalogo.casos.forEach(function(c) {
    if (nomes.indexOf(c.nomeCaso) < 0) nomes.push(c.nomeCaso);
    if (!c.duplicado && !c.nomePendente) mapa[normalizarDesenvDemandas_(c.nomeCaso)] = c.nomeLegado;
  });
  return {nomeCasos: nomes.slice(), casosEspecificos: nomes.slice(), mapaCasoEspecificoParaNome: mapa,
    catalogoCasos: catalogo.casos, catalogoCrimes: catalogo.tipos};
}`);
back = modifyFunction(back, 'carregarMenusDemandas', source => {
  const start = source.indexOf('  // FILTRO "CASO" ->'), end = source.indexOf('  menus.status =');
  if (start < 0 || end < start) throw new Error('Bloco de menus de casos ausente');
  const replacement = `  var catalogo = obterListasCasosDemandasAtivas_(ss);
  menus.catalogoCasos = catalogo.catalogoCasos;
  menus.catalogoCrimes = catalogo.catalogoCrimes;
  menus.tiposCrimes = catalogo.catalogoCrimes.map(function(c) { return c.tipo; });
  menus.casos = catalogo.nomeCasos.slice();
  menus.nomeCasos = catalogo.nomeCasos.slice();
  menus.casosEspecificos = catalogo.nomeCasos.slice();

`;
  return source.slice(0, start) + replacement + source.slice(end);
});
for (const name of ['salvarDemandaBanco', 'atualizarDemandaBanco']) {
  back = modifyFunction(back, name, source => {
    if (name === 'salvarDemandaBanco') source = exactly(source, '  try {', `  try {
    if (!dados || !usuarioPodeEditarDemandasAtivas_(dados.usuarioLogin)) {
      return { sucesso: false, erro: 'Apenas ADMIN e NUIP podem cadastrar demandas ativas.' };
    }`, name + ':permissao');
    const anchor = '    garantirColunasDemandasAtivasEvolucaoDiversa_(aba);';
    source = exactly(source, anchor, anchor + `
    garantirCabecalhosCasosCadastro_(aba, ['CASO_ID']);`, name + ':coluna');
    const header = '    const headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];';
    const relation = name === 'salvarDemandaBanco' ? `
    var vinculoCaso = resolverVinculoCasoDemanda_(dados, ss, null);` : `
    if (!Number.isInteger(linha) || linha > aba.getLastRow()) return { sucesso: false, erro: 'Linha inválida para atualização.' };
    var rowAnterior = aba.getRange(linha, 1, 1, aba.getLastColumn()).getValues()[0];
    var vinculoCaso = resolverVinculoCasoDemanda_(dados, ss, {id: String(rowAnterior[headers.indexOf('CASO_ID')] || ''), nome: String(rowAnterior[headers.indexOf('CASO')] || '')});`;
    source = exactly(source, header, header + relation, name + ':vinculo');
    return exactly(source, "      'CASO': textoMaiusculoDemandaAtiva_(dados.caso || ''),", "      'CASO': textoMaiusculoDemandaAtiva_(vinculoCaso.nome),\n      'CASO_ID': vinculoCaso.id,", name + ':mapa');
  });
}
back = modifyFunction(back, 'obterDemandaAtivaPorRowIndex', source => exactly(source,
  "      caso: String(val(['CASO']) || ''),", "      caso: String(val(['CASO']) || ''),\n      casoId: String(val(['CASO_ID']) || ''),", 'retornoID'));
back = modifyFunction(back, 'pesquisarDemandasAtivas', source => {
  source = exactly(source, "  const idxCaso = obterIndiceColunaPorAlias_(headers, ['CASO']);", "  const idxCaso = obterIndiceColunaPorAlias_(headers, ['CASO']);\n  const idxCasoId = obterIndiceColunaPorAlias_(headers, ['CASO_ID']);", 'pesquisa:coluna');
  source = exactly(source, '  const listasCasosDemandas = obterListasCasosDemandasAtivas_(ss);', `  const listasCasosDemandas = obterListasCasosDemandasAtivas_(ss);
  const casoIdFiltro = String(filtros.casoId || '').trim();
  const tipoCrimeFiltro = normalizarNomeCasoCadastro_(filtros.tipoCrime || '');
  const catalogoCasos = listasCasosDemandas.catalogoCasos || [];
  const categoriaCrimeFiltro = (listasCasosDemandas.catalogoCrimes || []).filter(function(c) { return normalizarNomeCasoCadastro_(c.tipo) === tipoCrimeFiltro; })[0];
  if (casoIdFiltro && !catalogoCasos.some(function(c) { return c.id === casoIdFiltro; })) throw new Error('Caso não encontrado. Atualize a lista.');`, 'pesquisa:filtros');
  source = exactly(source, "    const caso = String(row[idxCaso] || '').trim();", "    const caso = String(row[idxCaso] || '').trim();\n    const casoId = String(idxCasoId > -1 ? row[idxCasoId] || '' : '').trim();", 'pesquisa:linha');
  const marker = "if (nomeCasoFiltro && normalizarDesenvDemandas_(nomeCasoDerivado).indexOf(nomeCasoFiltro) === -1) continue;";
  source = exactly(source, marker, `if (casoIdFiltro && !demandaCorrespondeAoCasoCadastro_(casoId, caso, casoIdFiltro, catalogoCasos)) continue;
if (tipoCrimeFiltro && normalizarNomeCasoCadastro_(crime) !== tipoCrimeFiltro && !(categoriaCrimeFiltro && categoriaCrimeFiltro.subtipos.some(function(s) { return normalizarNomeCasoCadastro_(s) === normalizarNomeCasoCadastro_(crime); }))) continue;
` + marker, 'pesquisa:aplicar');
  return exactly(source, '  caso: caso,', '  caso: caso,\n  casoId: casoId,', 'pesquisa:retorno');
});
const backendFragment = await readFile(path.join(root, 'patches/casos-backend.js'), 'utf8');
back = exactly(back, '// MÓDULO 5 - CASOS PRIORITÁRIOS (BACKEND: RELATÓRIOS)', backendFragment + '\n\n// MÓDULO 5 - CASOS PRIORITÁRIOS (BACKEND: RELATÓRIOS HISTÓRICOS)', 'backend:insercao');
result['MAESTRO.gs'] = back;

let front = result['JAVASCRIPT.html'].replace(/^\s*<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');
const cpStart = front.indexOf('// MÓDULO 5 - CASOS PRIORITÁRIOS (FRONTEND)');
const cpEnd = front.indexOf('// MÓDULO 6 - RELATÓRIO DE SERVIÇO EXTRAORDINÁRIO (FRONTEND COMPLETO)');
if (cpStart < 0 || cpEnd < cpStart) throw new Error('Bloco frontend de casos não localizado');
const oldCp = front.slice(cpStart, cpEnd);
const oldFunctions = parse(oldCp, {ecmaVersion: 'latest'}).body.filter(n => n.type === 'FunctionDeclaration').map(n => n.id.name);
const outside = front.slice(0, cpStart) + front.slice(cpEnd);
const referenced = oldFunctions.filter(name => new RegExp('\\b' + name + '\\b').test(outside));
if (referenced.some(name => !['montarInterfaceMod5', 'alternarModoCasoCasosPrioritarios'].includes(name))) throw new Error('Referências externas inesperadas: ' + referenced.join(', '));
front = front.slice(0, cpStart) + await readFile(path.join(root, 'patches/casos-frontend.js'), 'utf8') + '\n\n' + front.slice(cpEnd);
front = modifyFunction(front, 'iniciarLoadingIA', () => '');
front = modifyFunction(front, 'chamarBackendIA', () => '');
front = exactly(front, 'aplicarVisibilidadeAssistenteIA();', 'limparEstadoCasosCadastro_();', 'remover:assistente');
front = modifyFunction(front, 'limparLoginPersistentePortal_', source => exactly(source,
  'function limparLoginPersistentePortal_() {', 'function limparLoginPersistentePortal_() {\n    limparEstadoCasosCadastro_();', 'logout:casos'));

front = modifyFunction(front, 'preencherMenusDemandas', source => {
  source = exactly(source, '            opt.innerHTML = item;', '            opt.textContent = item;', 'opcao:texto');
  source = exactly(source, "    popular('dem_caso', menus.casos, 'Selecione.');", '', 'menus:fenomeno');
  source = exactly(source, "    popular('dem_busca_nome_caso', menus.nomeCasos || [], 'Todos');", "    popular('dem_busca_nome_caso', menus.tiposCrimes || [], 'Todos');", 'menus:tipo');
  return exactly(source, "    popular('dem_busca_caso_especifico', menus.casosEspecificos || menus.casos || [], 'Todos');", "    atualizarCatalogoCompartilhadoCasos_(menus.catalogoCasos || [], menus.catalogoCrimes || [], true);", 'menus:catalogo');
});
front = modifyFunction(front, 'buscarDemandasAtivasFrontend', source => {
  source = exactly(source, '        var filtros = {', "    var casoSelecionado = obterSelecaoCasoDemandaFrontend_('dem_busca_caso_especifico');\n    var filtros = {", 'busca:selecao');
  source = exactly(source, "        nomeCaso: ((document.getElementById('dem_busca_nome_caso') || {}).value || ''),", "        tipoCrime: ((document.getElementById('dem_busca_nome_caso') || {}).value || ''),", 'busca:tipo');
  return exactly(source, "        casoEspecifico: ((document.getElementById('dem_busca_caso_especifico') || {}).value || ''),", "        casoId: casoSelecionado.id,\n        casoEspecifico: casoSelecionado.id ? '' : casoSelecionado.nome,", 'busca:caso');
});
front = modifyFunction(front, 'preencherFormularioDemandaFrontend', source => exactly(source,
  "    document.getElementById('dem_caso').value = d.caso || '';", "    selecionarCasoDemandaFrontend_(d.casoId, d.caso);", 'editar:caso'));
front = modifyFunction(front, 'montarPayloadDemandaFrontend_', source => {
  source = exactly(source, '    return {', "    var casoSelecionado = obterSelecaoCasoDemandaFrontend_('dem_caso');\n    return {", 'payload:selecao');
  return exactly(source, "        caso: ((document.getElementById('dem_caso') || {}).value || ''),", "        caso: casoSelecionado.nome,\n        casoId: casoSelecionado.id,", 'payload:caso');
});
front = modifyFunction(front, 'iniciarWatcherModoCasosDepatri_', () => `function iniciarWatcherModoCasosDepatri_() {
  aplicarModoCasosPrioritariosDepatri_();
}`);
front = modifyFunction(front, 'aplicarModoCasosPrioritariosDepatri_', () => `function aplicarModoCasosPrioritariosDepatri_() {
  if (document.getElementById('cpCadastroForm')) alternarModoCasoCasosPrioritarios(DEPATRI_MODO_CASOS === 'cadastro' ? 'NOVO' : 'EXISTENTE');
}`);
front = exactly(front, 'Cadastrar novo caso prioritário e eventos vinculados', 'Cadastrar caso com nome, tipo e subtipo de crime', 'home:cadastro');
front = exactly(front, 'Consultar casos cadastrados e relatórios consolidados', 'Consultar casos cadastrados e demandas vinculadas', 'home:consulta');
result['JAVASCRIPT.html'] = '<script>\n' + front + '\n</script>\n';

let index = result['INDEX.html'];
index = index.replace(/^.*https:\/\/cdn\.maptiler\.com[^\n]*\n/gm, '');
const styleStart = index.indexOf('/* =========================================================\n   MENU ASSISTENTE IA');
const styleEnd = index.indexOf('/* ========================================================================\n   HOME DEPATRI — AMPLIAÇÃO', styleStart);
if (styleStart < 0 || styleEnd < styleStart) throw new Error('CSS do assistente não localizado');
index = index.slice(0, styleStart) + index.slice(styleEnd);
const menuStart = index.indexOf('  <a href="javascript:void(0)" class="nav-link ai-menu-trigger"');
const menuEnd = index.indexOf('            <li class="nav-item"><a class="nav-link" href="javascript:void(0)" onclick="navegar(\'mod-demandas\')">', menuStart);
if (menuStart < 0 || menuEnd < menuStart) throw new Error('Menu do assistente não localizado');
index = index.slice(0, menuStart) + index.slice(menuEnd);
const scripts = [...index.matchAll(/<script>([\s\S]*?)<\/script>/g)].filter(m => m[1].includes('normalizarAssistenteIA_'));
if (scripts.length !== 1) throw new Error('Script do assistente não localizado');
index = index.replace(scripts[0][0], '');
result['INDEX.html'] = index;
parse(back, {ecmaVersion: 'latest'}); parse(front, {ecmaVersion: 'latest'});
await mkdir(path.join(root, 'apps-script'), {recursive: true});
for (const [name, text] of Object.entries(result)) {
  const unchanged = name.startsWith('DASHBOARD');
  const bytes = unchanged ? await readFile(path.join(sourceRoot, files[name])) : Buffer.from(text, 'utf8');
  await writeFile(path.join(root, 'apps-script', name), bytes);
  report[name].sha256Entrega = createHash('sha256').update(bytes).digest('hex');
  report[name].alterado = !unchanged;
}
await mkdir(path.join(root, 'docs'), {recursive: true});
await writeFile(path.join(root, 'docs/ARQUIVOS.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Cinco arquivos completos gerados. Alterações concentradas em MAESTRO, INDEX e JAVASCRIPT.');
await import('./sanitize-public.mjs');
