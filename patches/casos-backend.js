// Cadastro simplificado e catálogo único de casos. Não exclui dados históricos.
function normalizarNomeCasoCadastro_(valor) {
  return String(valor == null ? '' : valor).normalize('NFKC').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function lerTabelaCasosCadastro_(ss, nome) {
  var aba = ss.getSheetByName(nome);
  if (!aba || aba.getLastRow() < 1) return [];
  var valores = aba.getDataRange().getValues(), headers = valores.shift() || [];
  return valores.map(function(row, index) {
    var item = {linhaOrigem: index + 2};
    headers.forEach(function(header, i) { item[String(header).trim()] = row[i]; });
    return item;
  });
}

function obterCatalogoCrimesCasosCadastro_(ss) {
  var tipos = [];
  lerTabelaCasosCadastro_(ss, 'DB_CONFIG').forEach(function(row) {
    if (normalizarNomeCasoCadastro_(row.CATEGORIA) !== 'CRIME_PRODUTIVIDADE') return;
    var nome = String(row.NOME || '').trim(), subtipo = String(row.VALOR_EXTRA || '').trim();
    if (!nome) return;
    var categoria = tipos.filter(function(c) { return normalizarNomeCasoCadastro_(c.tipo) === normalizarNomeCasoCadastro_(nome); })[0];
    if (!categoria) { categoria = {tipo: nome, subtipos: []}; tipos.push(categoria); }
    if (subtipo && !categoria.subtipos.some(function(s) { return normalizarNomeCasoCadastro_(s) === normalizarNomeCasoCadastro_(subtipo); }))
      categoria.subtipos.push(subtipo);
  });
  return tipos;
}

function obterCatalogoCasosCadastro_(ss) {
  ss = ss || SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var crimes = obterCatalogoCrimesCasosCadastro_(ss), especificos = {};
  lerTabelaCasosCadastro_(ss, 'CASO_ESPECIFICO').forEach(function(row) {
    var id = String(row.ID_CASO || '').trim(), nome = String(row.CASO_ESPECIFICO || '').trim();
    if (!id || !nome) return;
    var chave = '$' + id;
    if (!especificos[chave]) especificos[chave] = [];
    if (!especificos[chave].some(function(n) { return normalizarNomeCasoCadastro_(n) === normalizarNomeCasoCadastro_(nome); })) especificos[chave].push(nome);
  });
  var casos = lerTabelaCasosCadastro_(ss, 'INVEST_CASOS').filter(function(row) {
    return String(row.ID_CASO || '').trim() && String(row.NOME_CASO || row.CASO_ESPECIFICO || '').trim();
  }).map(function(row) {
    var id = String(row.ID_CASO).trim(), novo = !!String(row.TIPO_CRIME || '').trim();
    var nomes = (especificos['$' + id] || []).slice(), explicito = String(row.CASO_ESPECIFICO || '').trim();
    if (explicito && !nomes.some(function(n) { return normalizarNomeCasoCadastro_(n) === normalizarNomeCasoCadastro_(explicito); })) nomes.push(explicito);
    var nome = novo ? String(row.NOME_CASO || '').trim() : (nomes.length === 1 ? nomes[0] : explicito || String(row.NOME_CASO || '').trim());
    var tipoOriginal = String(row.TIPO_CRIME || row.TIPO_CASO || '').trim();
    var categoria = crimes.filter(function(c) { return normalizarNomeCasoCadastro_(c.tipo) === normalizarNomeCasoCadastro_(tipoOriginal); })[0];
    var subtipo = '';
    if (!categoria) {
      categoria = crimes.filter(function(c) { return c.subtipos.some(function(s) { return normalizarNomeCasoCadastro_(s) === normalizarNomeCasoCadastro_(tipoOriginal); }); })[0];
      if (categoria) subtipo = categoria.subtipos.filter(function(s) { return normalizarNomeCasoCadastro_(s) === normalizarNomeCasoCadastro_(tipoOriginal); })[0];
    }
    if (categoria && !subtipo) {
      var subtipoOriginal = String(row.SUBTIPO_CRIME || (!novo ? row.NOME_CASO : '') || '').trim();
      subtipo = categoria.subtipos.filter(function(s) { return normalizarNomeCasoCadastro_(s) === normalizarNomeCasoCadastro_(subtipoOriginal); })[0] || '';
      if (!novo && !subtipo && categoria.subtipos.length === 1) subtipo = categoria.subtipos[0];
    }
    return {id: id, nomeCaso: nome, nomeChave: normalizarNomeCasoCadastro_(nome),
      tipoCrime: categoria ? categoria.tipo : tipoOriginal, subtipoCrime: subtipo,
      nomeLegado: String(row.NOME_CASO || '').trim(), origemLegada: !novo,
      classificacaoPendente: !categoria || !!(categoria.subtipos.length && !subtipo),
      nomePendente: !novo && nomes.length > 1, duplicado: false};
  });
  var contagem = {};
  casos.forEach(function(c) { contagem['$' + c.nomeChave] = (contagem['$' + c.nomeChave] || 0) + 1; });
  casos.forEach(function(c) { c.duplicado = contagem['$' + c.nomeChave] > 1; });
  casos.sort(function(a, b) { return a.nomeCaso.localeCompare(b.nomeCaso, 'pt-BR') || a.id.localeCompare(b.id); });
  return {casos: casos, tipos: crimes};
}

function obterBootstrapCasosPrioritarios(usuarioLogin) {
  var usuario = validarAcessoDemandasAtivas_(usuarioLogin);
  var catalogo = obterCatalogoCasosCadastro_();
  return {sucesso: true, casos: catalogo.casos, tipos: catalogo.tipos,
    podeCadastrar: usuario._classeDemandasAtivas === 'ADMIN' || usuario._classeDemandasAtivas === 'NUIP'};
}

function garantirCabecalhosCasosCadastro_(aba, exigidos) {
  var headers = aba.getLastColumn() ? aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0] : [];
  if (headers.length === 1 && !headers[0]) headers = [];
  var faltantes = exigidos.filter(function(h) { return headers.indexOf(h) < 0; });
  if (faltantes.length) {
    var atualizados = headers.concat(faltantes);
    if (aba.getMaxColumns() < atualizados.length) aba.insertColumnsAfter(aba.getMaxColumns(), atualizados.length - aba.getMaxColumns());
    aba.getRange(1, 1, 1, atualizados.length).setValues([atualizados]);
    return atualizados;
  }
  return headers;
}

function salvarCasoPrioritarioSemEventos(usuarioLogin, payload) {
  if (!usuarioPodeEditarDemandasAtivas_(usuarioLogin)) throw new Error('Apenas ADMIN e NUIP podem cadastrar casos.');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Informe os dados do caso.');
  if (Object.keys(payload).some(function(k) { return ['nomeCaso', 'tipoCrime', 'subtipoCrime', 'solicitacaoId'].indexOf(k) < 0; }))
    throw new Error('O cadastro aceita apenas nome, tipo e subtipo de crime.');
  function texto(valor, campo, opcional) {
    if (opcional && (valor === undefined || valor === null || valor === '')) return '';
    if (typeof valor !== 'string' || /[\u0000-\u001f\u007f]/.test(valor)) throw new Error(campo + ' inválido.');
    var limpo = valor.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase();
    if ((!opcional && !limpo) || limpo.length > 150 || /^=/.test(limpo)) throw new Error(campo + ' inválido.');
    return limpo;
  }
  var nome = texto(payload.nomeCaso, 'Nome do caso'), tipo = texto(payload.tipoCrime, 'Tipo de crime');
  var subtipo = texto(payload.subtipoCrime, 'Subtipo de crime', true);
  var solicitacaoId = String(payload.solicitacaoId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(solicitacaoId)) throw new Error('Solicitação inválida. Atualize a página e tente novamente.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID), catalogo = obterCatalogoCasosCadastro_(ss);
    var categoria = catalogo.tipos.filter(function(c) { return normalizarNomeCasoCadastro_(c.tipo) === normalizarNomeCasoCadastro_(tipo); })[0];
    if (!categoria) throw new Error('Selecione um tipo de crime cadastrado.');
    var subtipoOficial = categoria.subtipos.filter(function(s) { return normalizarNomeCasoCadastro_(s) === normalizarNomeCasoCadastro_(subtipo); })[0] || '';
    if ((categoria.subtipos.length && !subtipoOficial) || (!categoria.subtipos.length && subtipo)) throw new Error('Selecione um subtipo compatível com o tipo de crime.');
    var anteriores = lerTabelaCasosCadastro_(ss, 'INVEST_CASOS');
    var repeticao = anteriores.filter(function(r) { return r.SOLICITACAO_ID === solicitacaoId && normalizarNomeCasoCadastro_(r.CRIADO_POR) === normalizarNomeCasoCadastro_(usuarioLogin); })[0];
    if (repeticao) {
      if (normalizarNomeCasoCadastro_(repeticao.NOME_CASO) !== normalizarNomeCasoCadastro_(nome) || repeticao.TIPO_CRIME !== categoria.tipo || String(repeticao.SUBTIPO_CRIME || '') !== subtipoOficial)
        throw new Error('Esta solicitação já foi usada com dados diferentes.');
      return {sucesso: true, caso: catalogo.casos.filter(function(c) { return c.id === String(repeticao.ID_CASO); })[0], casos: catalogo.casos, tipos: catalogo.tipos};
    }
    if (catalogo.casos.some(function(c) { return c.nomeChave === normalizarNomeCasoCadastro_(nome); })) throw new Error('Já existe um caso com esse nome. Selecione o caso cadastrado.');
    var aba = ss.getSheetByName('INVEST_CASOS') || ss.insertSheet('INVEST_CASOS');
    var headers = garantirCabecalhosCasosCadastro_(aba, ['ID_CASO', 'NOME_CASO', 'TIPO_CRIME', 'SUBTIPO_CRIME', 'SOLICITACAO_ID', 'CRIADO_POR', 'CRIADO_EM']);
    var id = Utilities.getUuid();
    var valores = {ID_CASO: id, NOME_CASO: nome, TIPO_CRIME: categoria.tipo, SUBTIPO_CRIME: subtipoOficial,
      SOLICITACAO_ID: solicitacaoId, CRIADO_POR: String(usuarioLogin), CRIADO_EM: new Date()};
    aba.appendRow(headers.map(function(h) { return Object.prototype.hasOwnProperty.call(valores, h) ? valores[h] : ''; }));
    SpreadsheetApp.flush();
    var salvo = {id: id, nomeCaso: nome, nomeChave: normalizarNomeCasoCadastro_(nome), tipoCrime: categoria.tipo,
      subtipoCrime: subtipoOficial, nomeLegado: nome, origemLegada: false, classificacaoPendente: false, nomePendente: false, duplicado: false};
    catalogo.casos.push(salvo);
    catalogo.casos.sort(function(a, b) { return a.nomeCaso.localeCompare(b.nomeCaso, 'pt-BR'); });
    return {sucesso: true, caso: salvo, casos: catalogo.casos, tipos: catalogo.tipos};
  } finally { lock.releaseLock(); }
}

function resolverVinculoCasoDemanda_(dados, ss, original) {
  var id = String(dados.casoId || '').trim(), nome = String(dados.caso || '').trim();
  if (id) {
    var matches = obterCatalogoCasosCadastro_(ss).casos.filter(function(c) { return c.id === id; });
    if (matches.length !== 1) throw new Error('O caso selecionado não foi encontrado de forma única. Atualize a lista.');
    return {id: matches[0].id, nome: matches[0].nomeCaso};
  }
  if (!nome) return {id: '', nome: ''};
  // Uma edição de outros campos não apaga nem adivinha a referência histórica.
  if (original && normalizarNomeCasoCadastro_(nome) === normalizarNomeCasoCadastro_(original.nome)) return {id: original.id || '', nome: original.nome};
  var casos = obterCatalogoCasosCadastro_(ss).casos.filter(function(c) { return c.nomeChave === normalizarNomeCasoCadastro_(nome); });
  if (casos.length !== 1 || casos[0].nomePendente) throw new Error('Selecione um caso cadastrado para vincular a demanda.');
  return {id: casos[0].id, nome: casos[0].nomeCaso};
}

function demandaCorrespondeAoCasoCadastro_(idDaLinha, nomeDaLinha, casoId, casos) {
  if (idDaLinha) return String(idDaLinha) === String(casoId);
  var matches = casos.filter(function(c) { return c.nomeChave === normalizarNomeCasoCadastro_(nomeDaLinha); });
  return matches.length === 1 && !matches[0].nomePendente && matches[0].id === String(casoId);
}

function obterDemandasVinculadasCasoPrioritario(usuarioLogin, casoId) {
  var usuario = validarAcessoDemandasAtivas_(usuarioLogin);
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID), catalogo = obterCatalogoCasosCadastro_(ss);
  var alvo = catalogo.casos.filter(function(c) { return c.id === String(casoId); })[0];
  if (!alvo) throw new Error('Caso não encontrado.');
  var todas = usuario._classeDemandasAtivas !== 'LEITURA';
  var unidade = normalizarNomeCasoCadastro_(usuario.delegacia || usuario.lotacao);
  var pendentes = 0;
  var demandas = lerTabelaCasosCadastro_(ss, 'DEMANDAS_ATIVAS').filter(function(row) {
    if (!todas && (!unidade || normalizarNomeCasoCadastro_(row.UNIDADE_RESPONSAVEL) !== unidade)) return false;
    if (!row.CASO_ID && normalizarNomeCasoCadastro_(row.CASO) === alvo.nomeChave && (alvo.duplicado || alvo.nomePendente)) pendentes++;
    return demandaCorrespondeAoCasoCadastro_(String(row.CASO_ID || ''), row.CASO, alvo.id, catalogo.casos);
  }).map(function(row) {
    return {rowIndex: row.linhaOrigem, dataOcorrencia: dataDemandaAtivaParaBr_(row.DATA_DA_OCORRENCIA),
      procedimentoConcat: String(row.PROCEDIMENTO_CONCAT || ''), unidade: String(row.UNIDADE_RESPONSAVEL || ''),
      status: String(row.STATUS || ''), statusDemanda: String(row.STATUS_DEMANDA || ''), crimeTipo: String(row.CRIME_TIPO || '')};
  });
  return {sucesso: true, demandas: demandas, vinculosPendentes: pendentes};
}
