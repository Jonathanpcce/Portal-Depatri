// ============================================================================
// MAPA OFICIAL DOS MÓDULOS DO PORTAL DEPATRI
// modHomeDepatri          - Início / Home
// mod-demandas            - Demandas Ativas
// modDemandasGerais       - Demandas Gerais (NUIP)
// telaProdutividade       - Produtividade
// modAdministrativo       - Administrativo
// mod3                    - Gerador de Ofícios
// mod4                    - Desenvolvimento de Demandas Ativas
// mod5                    - Casos Prioritários
// mod6                    - Relatório de Serviço Extraordinário
// modDashboardDemandas    - Dashboard Demandas
// modDashboard            - Dashboard
// modRelatorioGerencial   - Relatório Gerencial
// modSirp                 - Análise de Rotas e Cobertura de Câmeras
// mod7                    - Numerador
// modUsuarios             - Gerenciamento de Usuários
// ============================================================================

// ============================================================================
// MÓDULO 1 - DEMANDAS ATIVAS (BACKEND) 
// ============================================================================

function toIntDemandaAtiva_(v) {
  var n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

function textoMaiusculoDemandaAtiva_(valor) {
  return String(valor === null || valor === undefined ? '' : valor).trim().toUpperCase();
}

function textoLivreDemandaAtiva_(valor) {
  return String(valor === null || valor === undefined ? '' : valor).trim();
}

function numeroProcedimentoDemandaAtiva_(valor) {
  return String(valor === null || valor === undefined ? '' : valor).replace(/\s+/g, '').trim();
}

function procedimentoConcatDemandaAtiva_(tipo, numero) {
  var t = textoMaiusculoDemandaAtiva_(tipo);
  var n = numeroProcedimentoDemandaAtiva_(numero);
  if (!t && !n) return '';
  if (!t) return n;
  if (!n) return t;
  return t + ' Nº ' + n;
}

function procedimentoInstauradoDemandaAtiva_(dados) {
  dados = dados || {};
  var naoInstaurado = dados.procedimentoNaoInstaurado === true ||
    String(dados.procedimentoNaoInstaurado || '').toLowerCase() === 'true';
  if (naoInstaurado) return 'PROCEDIMENTO NÃO INSTAURADO PELA DELEGACIA';
  return textoLivreDemandaAtiva_(dados.procedimentoInstaurado || '');
}


var DEMANDAS_ATIVAS_RAZOES_DIVERSAS = {
  INCONSISTENCIA: 'INCONSISTÊNCIA INVOLUNTÁRIA NAS INFORMAÇÕES INICIAIS DA VÍTIMA',
  VITIMA_NAO_COLABORATIVA: 'VÍTIMA NÃO COLABORATIVA',
  DENUNCIACAO_FALSA: 'DENUNCIAÇÃO FALSA DE CRIME'
};

function normalizarMotivoEvolucaoDiversaDemandaAtiva_(valor) {
  var normalizado = normalizarDesenvDemandas_(valor || '');
  if (!normalizado) return '';
  if (normalizado === 'INCONSISTENCIA INVOLUNTARIA NAS INFORMACOES INICIAIS DA VITIMA') {
    return DEMANDAS_ATIVAS_RAZOES_DIVERSAS.INCONSISTENCIA;
  }
  if (normalizado === 'VITIMA NAO COLABORATIVA') {
    return DEMANDAS_ATIVAS_RAZOES_DIVERSAS.VITIMA_NAO_COLABORATIVA;
  }
  if (normalizado === 'DENUNCIACAO FALSA DE CRIME') {
    return DEMANDAS_ATIVAS_RAZOES_DIVERSAS.DENUNCIACAO_FALSA;
  }
  return '';
}

function garantirColunasDemandasAtivasEvolucaoDiversa_(aba) {
  if (!aba) return [];
  var obrigatorias = [
    'MOTIVO_EVOLUCAO_DIVERSA',
    'VITIMA_NAO_COLABORATIVA',
    'DENUNCIACAO_FALSA_CRIME',
    'DENUNCIACAO_FALSA_INFRATOR',
    'DENUNCIACAO_FALSA_TIPO_PROCEDIMENTO',
    'DENUNCIACAO_FALSA_NUMERO_PROCEDIMENTO'
  ];
  var lastCol = Math.max(1, aba.getLastColumn());
  var headers = aba.getRange(1, 1, 1, lastCol).getValues()[0];
  obrigatorias.forEach(function(nome) {
    if (headers.indexOf(nome) === -1) {
      aba.getRange(1, headers.length + 1).setValue(nome);
      headers.push(nome);
    }
  });
  return headers;
}

function obterDadosEvolucaoDiversaDemandaAtiva_(dados) {
  dados = dados || {};
  var motivo = normalizarMotivoEvolucaoDiversaDemandaAtiva_(dados.motivoEvolucaoDiversa || '');
  if (!motivo && dados.inconsistenciaInicialVitima === true) {
    motivo = DEMANDAS_ATIVAS_RAZOES_DIVERSAS.INCONSISTENCIA;
  }

  var ehInconsistencia = motivo === DEMANDAS_ATIVAS_RAZOES_DIVERSAS.INCONSISTENCIA;
  var ehVitimaNaoColaborativa = motivo === DEMANDAS_ATIVAS_RAZOES_DIVERSAS.VITIMA_NAO_COLABORATIVA;
  var ehDenunciacaoFalsa = motivo === DEMANDAS_ATIVAS_RAZOES_DIVERSAS.DENUNCIACAO_FALSA;

  return {
    motivo: motivo,
    ehInconsistencia: ehInconsistencia,
    ehVitimaNaoColaborativa: ehVitimaNaoColaborativa,
    ehDenunciacaoFalsa: ehDenunciacaoFalsa,
    infratorDenunciacaoFalsa: ehDenunciacaoFalsa ? textoMaiusculoDemandaAtiva_(dados.denunciacaoFalsaInfrator || '') : '',
    tipoProcedimentoDenunciacaoFalsa: ehDenunciacaoFalsa ? textoMaiusculoDemandaAtiva_(dados.denunciacaoFalsaTipoProcedimento || '') : '',
    numeroProcedimentoDenunciacaoFalsa: ehDenunciacaoFalsa ? textoLivreDemandaAtiva_(dados.denunciacaoFalsaNumeroProcedimento || '') : ''
  };
}

// ============================================================================
// MÓDULO - DEMANDAS GERAIS (ACESSO EXCLUSIVO NUIP)
// ============================================================================
var DEMANDAS_GERAIS_CFG = {
  SHEET: 'DEMANDAS_GERAIS',
  HEADERS: [
    'TIMESTAMP',
    'USUARIO',
    'EQUIPE',
    'TIPO_DEMANDA',
    'TIPO_PROCEDIMENTO',
    'NUMERO_PROCEDIMENTO'
  ],
  EQUIPES: ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO'],
  TIPOS_DEMANDA: ['DEMANDA ATIVA', 'CUMPRIMENTO DE MANDADO DE PRISÃO', 'LEVANTAMENTOS INVESTIGATIVOS'],
  TIPOS_PROCEDIMENTO: ['B.O', 'T.C.O', 'INQUERITO POLICIAL', 'PROCESSO JUDICIAL', 'TDN', 'ATO INFRACIONAL', 'OCORRENCIA CIOPS', 'OUTRO']
};

function validarAcessoDemandasGerais_(usuarioLogin) {
  var usuario = obterUsuarioPortalPorLogin_(usuarioLogin);
  var classe = classificarPermissaoDemandasAtivas_(usuario);

  if (classe !== 'NUIP' && classe !== 'ADMIN') {
    throw new Error('O módulo Demandas Gerais é de acesso exclusivo do NUIP e ADMIN.');
  }

  return usuario;
}

function obterOuCriarAbaDemandasGerais_() {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName(DEMANDAS_GERAIS_CFG.SHEET);
  if (!aba) aba = ss.insertSheet(DEMANDAS_GERAIS_CFG.SHEET);

  if (aba.getLastColumn() < 1 || !String(aba.getRange(1, 1).getValue() || '').trim()) {
    aba.getRange(1, 1, 1, DEMANDAS_GERAIS_CFG.HEADERS.length).setValues([DEMANDAS_GERAIS_CFG.HEADERS]);
    return aba;
  }

  var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  DEMANDAS_GERAIS_CFG.HEADERS.forEach(function(nome) {
    if (headers.indexOf(nome) === -1) {
      aba.getRange(1, headers.length + 1).setValue(nome);
      headers.push(nome);
    }
  });
  return aba;
}

function salvarDemandaGeralPortal(dados) {
  dados = dados || {};
  var usuario = validarAcessoDemandasGerais_(dados.usuarioLogin);
  var equipe = textoMaiusculoDemandaAtiva_(dados.equipe || '');
  var tipoDemanda = textoMaiusculoDemandaAtiva_(dados.tipoDemanda || '');
  var tipoProcedimento = textoMaiusculoDemandaAtiva_(dados.tipoProcedimento || '');
  var numeroProcedimento = textoLivreDemandaAtiva_(dados.numeroProcedimento || '');

  if (DEMANDAS_GERAIS_CFG.EQUIPES.indexOf(equipe) === -1) throw new Error('Selecione uma equipe válida.');
  if (DEMANDAS_GERAIS_CFG.TIPOS_DEMANDA.indexOf(tipoDemanda) === -1) throw new Error('Selecione um tipo de demanda válido.');
  if (DEMANDAS_GERAIS_CFG.TIPOS_PROCEDIMENTO.indexOf(tipoProcedimento) === -1) throw new Error('Selecione um tipo de procedimento válido.');
  if (!numeroProcedimento) throw new Error('Informe o Nº do procedimento.');

  var aba = obterOuCriarAbaDemandasGerais_();
  var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var mapa = {
    'TIMESTAMP': Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy HH:mm:ss'),
    'USUARIO': textoMaiusculoDemandaAtiva_(usuario.login || dados.usuarioLogin || ''),
    'EQUIPE': equipe,
    'TIPO_DEMANDA': tipoDemanda,
    'TIPO_PROCEDIMENTO': tipoProcedimento,
    'NUMERO_PROCEDIMENTO': numeroProcedimento
  };
  aba.appendRow(headers.map(function(h) { return Object.prototype.hasOwnProperty.call(mapa, h) ? mapa[h] : ''; }));
  return { sucesso: true, mensagem: 'Demanda geral cadastrada com sucesso.' };
}

function obterDashboardDemandasGeraisPortal(usuarioLogin) {
  validarAcessoDemandasGerais_(usuarioLogin);

  var aba = obterOuCriarAbaDemandasGerais_();

  var equipes = DEMANDAS_GERAIS_CFG.EQUIPES.slice();

  var geral = {
    total: 0,
    demandaAtiva: 0,
    mandadoPrisao: 0,
    levantamentoInvestigativo: 0
  };

  var mapaEquipes = {};

  equipes.forEach(function(equipe) {
    mapaEquipes[equipe] = {
      equipe: equipe,
      total: 0,
      demandaAtiva: 0,
      mandadoPrisao: 0,
      levantamentoInvestigativo: 0
    };
  });

  if (aba.getLastRow() < 2) {
    return {
      sucesso: true,
      geral: geral,
      porEquipe: equipes.map(function(equipe) {
        return mapaEquipes[equipe];
      })
    };
  }

  var ultimaColuna = aba.getLastColumn();

  var headers = aba
    .getRange(1, 1, 1, ultimaColuna)
    .getValues()[0]
    .map(function(h) {
      return String(h || '').trim().toUpperCase();
    });

  var idxEquipe = headers.indexOf('EQUIPE');
  var idxTipo = headers.indexOf('TIPO_DEMANDA');

  if (idxEquipe === -1 || idxTipo === -1) {
    throw new Error('A aba DEMANDAS_GERAIS não possui as colunas EQUIPE e TIPO_DEMANDA.');
  }

  var dados = aba
    .getRange(2, 1, aba.getLastRow() - 1, ultimaColuna)
    .getValues();

  dados.forEach(function(linha) {
    var equipe = textoMaiusculoDemandaAtiva_(linha[idxEquipe] || '');
    var tipo = textoMaiusculoDemandaAtiva_(linha[idxTipo] || '');

    if (!equipe || !tipo) return;
    if (!mapaEquipes[equipe]) return;

    geral.total++;
    mapaEquipes[equipe].total++;

    if (tipo === 'DEMANDA ATIVA') {
      geral.demandaAtiva++;
      mapaEquipes[equipe].demandaAtiva++;
    }

    else if (tipo === 'CUMPRIMENTO DE MANDADO DE PRISÃO') {
      geral.mandadoPrisao++;
      mapaEquipes[equipe].mandadoPrisao++;
    }

    else if (tipo === 'LEVANTAMENTOS INVESTIGATIVOS') {
      geral.levantamentoInvestigativo++;
      mapaEquipes[equipe].levantamentoInvestigativo++;
    }
  });

  return {
    sucesso: true,
    geral: geral,
    porEquipe: equipes.map(function(equipe) {
      return mapaEquipes[equipe];
    })
  };
}

function dataDemandaAtivaParaBr_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, 'America/Fortaleza', 'dd/MM/yyyy');
  }
  var txt = String(valor).trim();
  var mIso = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mIso) return mIso[3] + '/' + mIso[2] + '/' + mIso[1];
  var mBr = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mBr) return txt;
  return txt;
}

function quebrarLinhasDemandaAtiva_(lista, converterMaiusculo) {
  return (lista || []).map(function(item) {
    return converterMaiusculo ? textoMaiusculoDemandaAtiva_(item) : textoLivreDemandaAtiva_(item);
  }).filter(function(item) { return !!item; }).join('\n');
}

function splitLinhasDemandaAtiva_(valor) {
  return String(valor || '').split(/\r?\n/).map(function(item) {
    return String(item || '').trim();
  }).filter(function(item) { return !!item; });
}

function normalizarComparacaoProcedimentoDemandaAtiva_(valor) {
  return String(valor || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function verificarDuplicidadeProcedimentoDemandaAtiva_(aba, headers, tipoProcedimento, numeroProcedimento, linhaIgnorada) {
  var idxTipo = headers.indexOf('TIPO_PROCEDIMENTO');
  var idxNumero = headers.indexOf('NUMERO_PROCEDIMENTO');
  var idxConcat = headers.indexOf('PROCEDIMENTO_CONCAT');
  if (idxTipo < 0 || idxNumero < 0) return false;

  var tipoAlvo = textoMaiusculoDemandaAtiva_(tipoProcedimento);
  var numeroAlvo = numeroProcedimentoDemandaAtiva_(numeroProcedimento);
  var concatAlvo = procedimentoConcatDemandaAtiva_(tipoAlvo, numeroAlvo);

  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    var linhaReal = i + 1;
    if (linhaIgnorada && Number(linhaIgnorada) === linhaReal) continue;
    var row = dados[i];
    var tipoRow = textoMaiusculoDemandaAtiva_(row[idxTipo]);
    var numeroRow = numeroProcedimentoDemandaAtiva_(row[idxNumero]);
    var concatRow = idxConcat > -1 ? normalizarComparacaoProcedimentoDemandaAtiva_(row[idxConcat]) : '';
    if (tipoRow === tipoAlvo && numeroRow === numeroAlvo) return true;
    if (concatRow && concatRow === normalizarComparacaoProcedimentoDemandaAtiva_(concatAlvo)) return true;
  }
  return false;
}

function uploadArquivosDemandasAtivas(usuarioLogin, arquivos) {
  try {
    if (!usuarioPodeEditarDemandasAtivas_(usuarioLogin)) {
      return { sucesso: false, erro: 'Apenas ADMIN e NUIP podem enviar PDFs das demandas ativas.' };
    }
    arquivos = arquivos || [];
    if (!arquivos.length) return { sucesso: true, arquivos: [] };
    var pastaRaiz = DriveApp.getFolderById(CONFIG.PASTA_DRIVE_ID);
    var nomeSubpasta = 'DEMANDAS_ATIVAS_PDFS';
    var pastas = pastaRaiz.getFoldersByName(nomeSubpasta);
    var pasta = pastas.hasNext() ? pastas.next() : pastaRaiz.createFolder(nomeSubpasta);
    var retorno = [];
    for (var i = 0; i < arquivos.length; i++) {
      var arq = arquivos[i] || {};
      var nomeOriginal = String(arq.nome || ('arquivo_' + (i + 1) + '.pdf')).trim();
      if (!/\.pdf$/i.test(nomeOriginal)) nomeOriginal += '.pdf';
      var bytes = Utilities.base64Decode(String(arq.base64 || ''));
      var blob = Utilities.newBlob(bytes, String(arq.mimeType || 'application/pdf'), nomeOriginal);
      var arquivoDrive = pasta.createFile(blob);
      try { arquivoDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      retorno.push({ campo: String(arq.campo || ''), indice: toIntDemandaAtiva_(arq.indice), url: arquivoDrive.getUrl(), fileId: arquivoDrive.getId(), nome: arquivoDrive.getName() });
    }
    return { sucesso: true, arquivos: retorno };
  } catch (erro) {
    return { sucesso: false, erro: erro.toString() };
  }
}

function obterListasCasosDemandasAtivas_(ss) {
  var catalogo = obterCatalogoCasosCadastro_(ss);
  var nomes = [], mapa = {};
  catalogo.casos.forEach(function(c) {
    if (nomes.indexOf(c.nomeCaso) < 0) nomes.push(c.nomeCaso);
    if (!c.duplicado && !c.nomePendente) mapa[normalizarDesenvDemandas_(c.nomeCaso)] = c.nomeLegado;
  });
  return {nomeCasos: nomes.slice(), casosEspecificos: nomes.slice(), mapaCasoEspecificoParaNome: mapa,
    catalogoCasos: catalogo.casos, catalogoCrimes: catalogo.tipos};
}

function carregarMenusDemandas() {
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const abaConfig = ss.getSheetByName('DB_CONFIG');
  if (!abaConfig) throw new Error("Aba 'DB_CONFIG' não encontrada.");

  const dadosConfig = abaConfig.getDataRange().getValues();

  const menus = {
    status: [],
    unidade: [],
    equipe: [],
    tipoOcorrencia: [],
    crimeTipo: [],
    casos: [],
    nomeCasos: [],
    casosEspecificos: []
  };

  if (dadosConfig.length) {
    const headersConfig = dadosConfig[0];
    const idxCat = headersConfig.indexOf('CATEGORIA');
    const idxNome = headersConfig.indexOf('NOME');
    const idxValorExtra = headersConfig.indexOf('VALOR_EXTRA');

    if (idxCat > -1) {
      for (let i = 1; i < dadosConfig.length; i++) {
        const categoria = String(dadosConfig[i][idxCat] || '').trim();
        const nome = idxNome > -1 ? String(dadosConfig[i][idxNome] || '').trim() : '';
        const valorExtra = idxValorExtra > -1 ? String(dadosConfig[i][idxValorExtra] || '').trim() : '';

        if (!categoria) continue;

        if (categoria === 'STATUS' && nome) {
          menus.status.push(nome);
        }

        if (categoria === 'UNIDADE RESPONSÁVEL' && nome) {
          menus.unidade.push(nome);
        }

        if (categoria === 'EQUIPE') {
          if (valorExtra) {
            menus.equipe.push(valorExtra);
          } else if (nome) {
            menus.equipe.push(nome);
          }
        }

        if (categoria === 'TIPO DE OCORRÊNCIA' && nome) {
          menus.tipoOcorrencia.push(nome);
        }

        if (normalizarDesenvDemandas_(categoria) === 'CRIME_PRODUTIVIDADE' && valorExtra) {
          menus.crimeTipo.push(valorExtra);
        }
      }
    }
  }

  var catalogo = obterListasCasosDemandasAtivas_(ss);
  menus.catalogoCasos = catalogo.catalogoCasos;
  menus.catalogoCrimes = catalogo.catalogoCrimes;
  menus.tiposCrimes = catalogo.catalogoCrimes.map(function(c) { return c.tipo; });
  menus.casos = catalogo.nomeCasos.slice();
  menus.nomeCasos = catalogo.nomeCasos.slice();
  menus.casosEspecificos = catalogo.nomeCasos.slice();

  menus.status = [...new Set(menus.status)].sort();
  menus.unidade = [...new Set(menus.unidade)].sort();
  menus.equipe = [...new Set(menus.equipe)].sort();
  menus.tipoOcorrencia = [...new Set(menus.tipoOcorrencia)].sort();
  menus.crimeTipo = [...new Set(menus.crimeTipo)].sort();
  menus.casos = [...new Set(menus.casos)].sort();
  menus.nomeCasos = [...new Set(menus.nomeCasos)].sort();
  menus.casosEspecificos = [...new Set(menus.casosEspecificos)].sort();

  return menus;
}
function salvarDemandaBanco(dados) {
  try {
    if (!dados || !usuarioPodeEditarDemandasAtivas_(dados.usuarioLogin)) {
      return { sucesso: false, erro: 'Apenas ADMIN e NUIP podem cadastrar demandas ativas.' };
    }
    const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    const aba = ss.getSheetByName('DEMANDAS_ATIVAS');
    if (!aba) throw new Error("Aba 'DEMANDAS_ATIVAS' não encontrada na planilha.");
    garantirColunasDemandasAtivasEvolucaoDiversa_(aba);
    garantirCabecalhosCasosCadastro_(aba, ['CASO_ID']);
    const headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    var vinculoCaso = resolverVinculoCasoDemanda_(dados, ss, null);
    var tipoProcedimento = textoMaiusculoDemandaAtiva_(dados.tipoOcorrencia);
    var numeroProcedimento = numeroProcedimentoDemandaAtiva_(dados.numOcorrencia);
    var procedimentoConcat = procedimentoConcatDemandaAtiva_(tipoProcedimento, numeroProcedimento);
    if (verificarDuplicidadeProcedimentoDemandaAtiva_(aba, headers, tipoProcedimento, numeroProcedimento, 0)) {
      return { sucesso: false, erro: 'O procedimento já foi cadastrado.' };
    }
    const suspeitosIdentificados = toIntDemandaAtiva_(dados.suspeitosIdent);
    const suspeitosPresos = toIntDemandaAtiva_(dados.suspeitosPresos);
    const veiculosIdentificados = toIntDemandaAtiva_(dados.veiculosIdentificados);
    const veiculosRecuperados = toIntDemandaAtiva_(dados.veiculosRecuperados);
    const veiculosApreendidos = toIntDemandaAtiva_(dados.veiculosApreendidos);
    const armasApreendidas = toIntDemandaAtiva_(dados.armasApreendidas);
    const relatorioTecnico = toIntDemandaAtiva_(dados.relatorioTecnico);
    const relatorioMissao = toIntDemandaAtiva_(dados.relatorioMissao);
    const relatorioExtracao = toIntDemandaAtiva_(dados.relatorioExtracao);
    const relatoriosQtd = relatorioTecnico + relatorioMissao + relatorioExtracao;
    const evolucaoDiversa = obterDadosEvolucaoDiversaDemandaAtiva_(dados);
    const camposEvolucao = [suspeitosIdentificados, suspeitosPresos, veiculosIdentificados, veiculosRecuperados, veiculosApreendidos, armasApreendidas, relatorioTecnico];
    let evoluiu = !!evolucaoDiversa.motivo || camposEvolucao.some(function(v) { return v >= 1; });
    const statusEvolucao = evoluiu ? 'DEMANDA EVOLUIDA' : 'DEMANDA NÃO EVOLUÍDA';
    const mapa = {
      'TIMESTAMP': Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy'),
      'USUARIO': textoMaiusculoDemandaAtiva_(dados.usuarioLogin || dados.usuario || ''),
      'DATA_DA_OCORRENCIA': dataDemandaAtivaParaBr_(dados.dataOcorrencia || ''),
      'UNIDADE_RESPONSAVEL': textoMaiusculoDemandaAtiva_(dados.unidade || ''),
      'UNIDADE_OUTRO': textoMaiusculoDemandaAtiva_(dados.unidadeOutro || ''),
      'TIPO_PROCEDIMENTO': tipoProcedimento,
      'NUMERO_PROCEDIMENTO': numeroProcedimento,
      'PROCEDIMENTO_CONCAT': procedimentoConcat,
      'CRIME_TIPO': textoMaiusculoDemandaAtiva_(dados.crimeTipo || ''),
      'PROC_INSTAURADO': procedimentoInstauradoDemandaAtiva_(dados),
      'MOTIVO_EVOLUCAO_DIVERSA': evolucaoDiversa.motivo,
      'INCONSISTENCIA_INICIAL_VITIMA': evolucaoDiversa.ehInconsistencia ? 'SIM' : 'NÃO',
      'VITIMA_NAO_COLABORATIVA': evolucaoDiversa.ehVitimaNaoColaborativa ? 'SIM' : 'NÃO',
      'DENUNCIACAO_FALSA_CRIME': evolucaoDiversa.ehDenunciacaoFalsa ? 'SIM' : 'NÃO',
      'DENUNCIACAO_FALSA_INFRATOR': evolucaoDiversa.infratorDenunciacaoFalsa,
      'DENUNCIACAO_FALSA_TIPO_PROCEDIMENTO': evolucaoDiversa.tipoProcedimentoDenunciacaoFalsa,
      'DENUNCIACAO_FALSA_NUMERO_PROCEDIMENTO': evolucaoDiversa.numeroProcedimentoDenunciacaoFalsa,
      'CRIME_OUTRO': textoMaiusculoDemandaAtiva_(dados.crimeOutro || ''),
      'SUSPEITOS_IDENTIFICADOS_QTD': suspeitosIdentificados,
      'SUSPEITOS_PRESOS_QTD': suspeitosPresos,
      'VEICULOS_SUSPEITOS_IDENTIFICADOS_QTD': veiculosIdentificados,
      'VEICULOS_RECUPERADOS_QTD': veiculosRecuperados,
      'VEICULOS_APREENDIDOS_QTD': veiculosApreendidos,
      'ARMAS_APREENDIDAS_QTD': armasApreendidas,
      'RELATORIO_TECNICO_QTD': relatorioTecnico,
      'RELATORIO_MISSAO_QTD': relatorioMissao,
      'RELATORIO_EXTRACAO_QTD': relatorioExtracao,
      'RELATORIOS_QTD': relatoriosQtd,
      'OBSERVACOES': textoLivreDemandaAtiva_(dados.observacoes || ''),
      'NOME_VITIMA': textoMaiusculoDemandaAtiva_(dados.nomeVitima || ''),
      'ENDERECO_OCORRENCIA': textoMaiusculoDemandaAtiva_(dados.endereco || ''),
      'BAIRRO': textoMaiusculoDemandaAtiva_(dados.bairro || ''),
      'CASO': textoMaiusculoDemandaAtiva_(vinculoCaso.nome),
      'CASO_ID': vinculoCaso.id,
      'STATUS_DEMANDA': statusEvolucao,
      'EQUIPE_DIRETORIA': textoMaiusculoDemandaAtiva_(dados.equipe || ''),
      'TIPO_OCORRENCIA_OUTRO': textoMaiusculoDemandaAtiva_(dados.tipoOcorrenciaOutro || ''),
      'STATUS': textoMaiusculoDemandaAtiva_(dados.status || ''),
      'DEPARTAMENTO': textoMaiusculoDemandaAtiva_(dados.departamento || 'DEPATRI'),
      'NOME_SUSPEITOS': quebrarLinhasDemandaAtiva_(dados.nomesSuspeitos || [], true),
      'NOME_PRESOS': quebrarLinhasDemandaAtiva_(dados.nomesPresos || [], true),
      'PLACA_VEICULO_IDENTIFICADO': quebrarLinhasDemandaAtiva_(dados.placasVeiculosIdentificados || [], true),
      'PLACA_VEICULO_RECUPERADO': quebrarLinhasDemandaAtiva_(dados.placasVeiculosRecuperados || [], true),
      'TIPO_DO_VEÍCULO': quebrarLinhasDemandaAtiva_(dados.tiposVeiculosRecuperados || [], true),
      'MARCA': quebrarLinhasDemandaAtiva_(dados.marcasVeiculosRecuperados || [], true),
      'MODELO': quebrarLinhasDemandaAtiva_(dados.modelosVeiculosRecuperados || [], true),
      'ANO': quebrarLinhasDemandaAtiva_(dados.anosVeiculosRecuperados || [], true),
      'VALOR_RS': quebrarLinhasDemandaAtiva_(dados.valoresVeiculosRecuperados || [], false),
      'FONTE_DE_DADOS': quebrarLinhasDemandaAtiva_(dados.fontesVeiculosRecuperados || [], true),
      'PLACA_VEICULO_APREENDIDO': quebrarLinhasDemandaAtiva_(dados.placasVeiculosApreendidos || [], true),
      'RELATORIO_TECNICO_PDF': quebrarLinhasDemandaAtiva_(dados.relatorioTecnicoPdfLinks || [], false),
      'RELATORIO_MISSAO_PDF': quebrarLinhasDemandaAtiva_(dados.relatorioMissaoPdfLinks || [], false),
      'RELATORIO_EXTRACAO_PDF': quebrarLinhasDemandaAtiva_(dados.relatorioExtracaoPdfLinks || [], false)
    };
    const linha = headers.map(function(header) { return Object.prototype.hasOwnProperty.call(mapa, header) ? mapa[header] : ''; });
    aba.appendRow(linha);
    return { sucesso: true, mensagem: 'Demanda salva com sucesso! O status processado foi: ' + statusEvolucao };
  } catch (erro) {
    return { sucesso: false, erro: erro.toString() };
  }
}

function obterQuantitativosRazoesDiversasDemandasAtivas(usuarioLogin) {
  validarAcessoDemandasAtivas_(usuarioLogin);
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName('DEMANDAS_ATIVAS');
  if (!aba) throw new Error("Aba 'DEMANDAS_ATIVAS' não encontrada.");
  garantirColunasDemandasAtivasEvolucaoDiversa_(aba);
  var dados = aba.getDataRange().getValues();
  var resultado = { sucesso: true, totalRazoesDiversas: 0, inconsistenciaInvoluntaria: 0, vitimaNaoColaborativa: 0, denunciacaoFalsaCrime: 0 };
  if (dados.length <= 1) return resultado;
  var headers = dados[0] || [];
  var idxMotivo = headers.indexOf('MOTIVO_EVOLUCAO_DIVERSA');
  var idxLegacy = headers.indexOf('INCONSISTENCIA_INICIAL_VITIMA');
  for (var r = 1; r < dados.length; r++) {
    var motivo = idxMotivo > -1 ? normalizarMotivoEvolucaoDiversaDemandaAtiva_(dados[r][idxMotivo]) : '';
    if (!motivo && idxLegacy > -1 && normalizarDesenvDemandas_(dados[r][idxLegacy]) === 'SIM') motivo = DEMANDAS_ATIVAS_RAZOES_DIVERSAS.INCONSISTENCIA;
    if (!motivo) continue;
    resultado.totalRazoesDiversas++;
    if (motivo === DEMANDAS_ATIVAS_RAZOES_DIVERSAS.INCONSISTENCIA) resultado.inconsistenciaInvoluntaria++;
    if (motivo === DEMANDAS_ATIVAS_RAZOES_DIVERSAS.VITIMA_NAO_COLABORATIVA) resultado.vitimaNaoColaborativa++;
    if (motivo === DEMANDAS_ATIVAS_RAZOES_DIVERSAS.DENUNCIACAO_FALSA) resultado.denunciacaoFalsaCrime++;
  }
  return resultado;
}

function classificarPermissaoDemandasAtivas_(usuario) {
  var perfil = normalizarDesenvDemandas_(usuario && usuario.perfil);

  if (perfil === 'ADMIN' || perfil === 'CRIADOR/ADMIN' || perfil === 'CRIADOR ADMIN') return 'ADMIN';
  if (perfil.indexOf('NUIP') > -1) return 'NUIP';
  if (perfil.indexOf('DIRECAO') > -1 || perfil.indexOf('DIRETORIA') > -1) return 'DIRECAO';
  return 'LEITURA';
}

function validarAcessoDemandasAtivas_(usuarioLogin) {
  var usuario = obterUsuarioPortalPorLogin_(usuarioLogin);
  usuario._classeDemandasAtivas = classificarPermissaoDemandasAtivas_(usuario);
  return usuario;
}

function usuarioPodeEditarDemandasAtivas_(usuarioLogin) {
  var usuario = validarAcessoDemandasAtivas_(usuarioLogin);
  return usuario._classeDemandasAtivas === 'ADMIN' || usuario._classeDemandasAtivas === 'NUIP';
}

function normalizarDataDemandasAtivasParaIso_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, 'America/Fortaleza', 'yyyy-MM-dd');
  }
  var txt = String(valor).trim();
  var mIso = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mIso) return mIso[1] + '-' + mIso[2] + '-' + mIso[3];
  var mBr = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mBr) return mBr[3] + '-' + mBr[2] + '-' + mBr[1];
  return '';
}

function pesquisarDemandasAtivas(usuarioLogin, filtros) {
  validarAcessoDemandasAtivas_(usuarioLogin);
  filtros = filtros || {};
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const aba = ss.getSheetByName('DEMANDAS_ATIVAS');
  if (!aba) throw new Error("Aba 'DEMANDAS_ATIVAS' não encontrada.");
  const dados = aba.getDataRange().getValues();
  if (!dados.length) return { sucesso: true, resultados: [] };
  const headers = dados[0];
  const idxData = obterIndiceColunaPorAlias_(headers, ['DATA_DA_OCORRENCIA']);
  const idxEquipe = obterIndiceColunaPorAlias_(headers, ['EQUIPE_DIRETORIA', 'EQUIPE']);
  const idxStatus = obterIndiceColunaPorAlias_(headers, ['STATUS']);
  const idxStatusDemanda = obterIndiceColunaPorAlias_(headers, ['STATUS_DEMANDA', 'STATUS_DEMANDAS', 'STATUS DEMANDA']);
  const idxTipo = obterIndiceColunaPorAlias_(headers, ['TIPO_PROCEDIMENTO']);
  const idxNumero = obterIndiceColunaPorAlias_(headers, ['NUMERO_PROCEDIMENTO']);
  const idxConcat = obterIndiceColunaPorAlias_(headers, ['PROCEDIMENTO_CONCAT']);
  const idxVitima = obterIndiceColunaPorAlias_(headers, ['NOME_VITIMA']);
  const idxBairro = obterIndiceColunaPorAlias_(headers, ['BAIRRO']);
  const idxEndereco = obterIndiceColunaPorAlias_(headers, ['ENDERECO_OCORRENCIA']);
  const idxCaso = obterIndiceColunaPorAlias_(headers, ['CASO']);
  const idxCasoId = obterIndiceColunaPorAlias_(headers, ['CASO_ID']);
    const idxNomeCaso = obterIndiceColunaPorAlias_(headers, ['NOME_CASO', 'NOME_DO_CASO']);
  const idxCasoEspecifico = obterIndiceColunaPorAlias_(headers, ['CASO_ESPECIFICO', 'CASO ESPECIFICO', 'CASO']);
  const idxCrime = obterIndiceColunaPorAlias_(headers, ['CRIME_TIPO']);
  const idxProcInstaurado = obterIndiceColunaPorAlias_(headers, ['PROC_INSTAURADO', 'PROCEDIMENTO_INSTAURADO']);
  const idxPrisoes = obterIndiceColunaPorAlias_(headers, ['SUSPEITOS_PRESOS_QTD', 'QUANTIDADE_PRISOES', 'QUANTIDADE DE PRISOES']);
  const idxObs = obterIndiceColunaPorAlias_(headers, ['OBSERVACOES']);
  const equipeFiltro = normalizarDesenvDemandas_(filtros.equipe || '');
  const statusFiltro = textoMaiusculoDemandaAtiva_(filtros.status || '');
  const dataFiltro = normalizarDataDemandasAtivasParaIso_(filtros.data || '');
  const numeroFiltro = numeroProcedimentoDemandaAtiva_(filtros.numeroProcedimento || '').toUpperCase();
  const textoFiltro = normalizarDesenvDemandas_(filtros.pesquisaGeral || '');
    const nomeCasoFiltro = normalizarDesenvDemandas_(filtros.nomeCaso || '');
  const casoEspecificoFiltro = normalizarDesenvDemandas_(filtros.casoEspecifico || '');

  const listasCasosDemandas = obterListasCasosDemandasAtivas_(ss);
  const casoIdFiltro = String(filtros.casoId || '').trim();
  const tipoCrimeFiltro = normalizarNomeCasoCadastro_(filtros.tipoCrime || '');
  const catalogoCasos = listasCasosDemandas.catalogoCasos || [];
  const categoriaCrimeFiltro = (listasCasosDemandas.catalogoCrimes || []).filter(function(c) { return normalizarNomeCasoCadastro_(c.tipo) === tipoCrimeFiltro; })[0];
  if (casoIdFiltro && !catalogoCasos.some(function(c) { return c.id === casoIdFiltro; })) throw new Error('Caso não encontrado. Atualize a lista.');
  const mapaCasoEspecificoParaNome = listasCasosDemandas.mapaCasoEspecificoParaNome || {};
  const resultados = [];
  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    const dataOriginal = row[idxData];
    const dataIso = normalizarDataDemandasAtivasParaIso_(dataOriginal);
    const data = dataDemandaAtivaParaBr_(dataOriginal);
    const equipe = String(row[idxEquipe] || '').trim();
    const status = String(idxStatus > -1 ? row[idxStatus] : '').trim();
    const statusDemanda = String(idxStatusDemanda > -1 ? row[idxStatusDemanda] : '').trim();
    const tipo = String(row[idxTipo] || '').trim();
    const numero = String(row[idxNumero] || '').trim();
    const concat = String(row[idxConcat] || '').trim();
    const vitima = String(row[idxVitima] || '').trim();
    const bairro = String(row[idxBairro] || '').trim();
    const endereco = String(row[idxEndereco] || '').trim();
    const caso = String(row[idxCaso] || '').trim();
    const casoId = String(idxCasoId > -1 ? row[idxCasoId] || '' : '').trim();
        const nomeCasoPlanilha = idxNomeCaso > -1 ? String(row[idxNomeCaso] || '').trim() : '';
    const casoEspecificoPlanilha = idxCasoEspecifico > -1 ? String(row[idxCasoEspecifico] || '').trim() : caso;

    const nomeCasoDerivado = nomeCasoPlanilha || mapaCasoEspecificoParaNome[normalizarDesenvDemandas_(casoEspecificoPlanilha)] || '';
    const crime = String(row[idxCrime] || '').trim();
    const procedimentoInstaurado = idxProcInstaurado > -1 ? String(row[idxProcInstaurado] || '').trim() : '';
    const quantidadePrisoes = idxPrisoes > -1 ? toIntDemandaAtiva_(row[idxPrisoes]) : 0;
    const obs = String(row[idxObs] || '').trim();
    if (equipeFiltro && normalizarDesenvDemandas_(equipe) !== equipeFiltro) continue;
if (statusFiltro && textoMaiusculoDemandaAtiva_(status) !== statusFiltro) continue;
if (dataFiltro && dataIso !== dataFiltro) continue;
if (numeroFiltro && numeroProcedimentoDemandaAtiva_(numero).toUpperCase().indexOf(numeroFiltro) === -1 && normalizarComparacaoProcedimentoDemandaAtiva_(concat).indexOf(numeroFiltro) === -1) continue;

if (casoIdFiltro && !demandaCorrespondeAoCasoCadastro_(casoId, caso, casoIdFiltro, catalogoCasos)) continue;
if (tipoCrimeFiltro && normalizarNomeCasoCadastro_(crime) !== tipoCrimeFiltro && !(categoriaCrimeFiltro && categoriaCrimeFiltro.subtipos.some(function(s) { return normalizarNomeCasoCadastro_(s) === normalizarNomeCasoCadastro_(crime); }))) continue;
if (nomeCasoFiltro && normalizarDesenvDemandas_(nomeCasoDerivado).indexOf(nomeCasoFiltro) === -1) continue;

if (casoEspecificoFiltro && normalizarDesenvDemandas_(casoEspecificoPlanilha).indexOf(casoEspecificoFiltro) === -1) continue;

const textoBase = normalizarDesenvDemandas_([status, statusDemanda, equipe, tipo, numero, concat, vitima, bairro, endereco, caso, crime, procedimentoInstaurado, obs].join(' '));
if (textoFiltro && textoBase.indexOf(textoFiltro) === -1) continue;
    resultados.push({
  rowIndex: i + 1,
  dataOcorrencia: data,
  equipe: equipe,
  status: status,
  statusDemanda: statusDemanda,
  tipoProcedimento: tipo,
  numeroProcedimento: numero,
  procedimentoConcat: concat,
  bairro: bairro,
  procedimentoInstaurado: procedimentoInstaurado,
  quantidadePrisoes: quantidadePrisoes,
  endereco: endereco,
  caso: caso,
  casoId: casoId,
  crimeTipo: crime
});
  }
  resultados.sort(function(a, b) { return normalizarDataDemandasAtivasParaIso_(b.dataOcorrencia || '').localeCompare(normalizarDataDemandasAtivasParaIso_(a.dataOcorrencia || '')); });
  return { sucesso: true, resultados: resultados };
}

function obterDemandaAtivaPorRowIndex(usuarioLogin, rowIndex) {
  validarAcessoDemandasAtivas_(usuarioLogin);
  const linha = Number(rowIndex || 0);
  if (!linha || linha < 2) throw new Error('Linha inválida para consulta.');
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const aba = ss.getSheetByName('DEMANDAS_ATIVAS');
  if (!aba) throw new Error("Aba 'DEMANDAS_ATIVAS' não encontrada.");
  garantirColunasDemandasAtivasEvolucaoDiversa_(aba);
  const headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const row = aba.getRange(linha, 1, 1, aba.getLastColumn()).getValues()[0];
  function val(alias) { var idx = obterIndiceColunaPorAlias_(headers, alias); return idx > -1 ? row[idx] : ''; }
  var dataOriginal = val(['DATA_DA_OCORRENCIA']);
  var motivoEvolucaoDiversa = normalizarMotivoEvolucaoDiversaDemandaAtiva_(val(['MOTIVO_EVOLUCAO_DIVERSA']));
  if (!motivoEvolucaoDiversa && normalizarDesenvDemandas_(val(['INCONSISTENCIA_INICIAL_VITIMA'])) === 'SIM') {
    motivoEvolucaoDiversa = DEMANDAS_ATIVAS_RAZOES_DIVERSAS.INCONSISTENCIA;
  }
  return { sucesso: true, demanda: {
      rowIndex: linha,
      dataOcorrenciaBr: dataDemandaAtivaParaBr_(dataOriginal),
      dataOcorrenciaIso: normalizarDataDemandasAtivasParaIso_(dataOriginal),
      status: String(val(['STATUS']) || ''),
      unidade: String(val(['UNIDADE_RESPONSAVEL']) || ''),
      equipe: String(val(['EQUIPE_DIRETORIA', 'EQUIPE']) || ''),
      tipoOcorrencia: String(val(['TIPO_PROCEDIMENTO']) || ''),
      numeroProcedimento: String(val(['NUMERO_PROCEDIMENTO']) || ''),
      nomeVitima: String(val(['NOME_VITIMA']) || ''),
      endereco: String(val(['ENDERECO_OCORRENCIA']) || ''),
      bairro: String(val(['BAIRRO']) || ''),
      caso: String(val(['CASO']) || ''),
      casoId: String(val(['CASO_ID']) || ''),
      crimeTipo: String(val(['CRIME_TIPO']) || ''),
      procedimentoInstaurado: String(val(['PROC_INSTAURADO', 'PROCEDIMENTO_INSTAURADO']) || ''),
      procedimentoNaoInstaurado: normalizarDesenvDemandas_(val(['PROC_INSTAURADO', 'PROCEDIMENTO_INSTAURADO'])) === 'PROCEDIMENTO NAO INSTAURADO PELA DELEGACIA',
      motivoEvolucaoDiversa: motivoEvolucaoDiversa,
      inconsistenciaInicialVitima: motivoEvolucaoDiversa === DEMANDAS_ATIVAS_RAZOES_DIVERSAS.INCONSISTENCIA,
      vitimaNaoColaborativa: motivoEvolucaoDiversa === DEMANDAS_ATIVAS_RAZOES_DIVERSAS.VITIMA_NAO_COLABORATIVA,
      denunciacaoFalsaCrime: motivoEvolucaoDiversa === DEMANDAS_ATIVAS_RAZOES_DIVERSAS.DENUNCIACAO_FALSA,
      denunciacaoFalsaInfrator: String(val(['DENUNCIACAO_FALSA_INFRATOR']) || ''),
      denunciacaoFalsaTipoProcedimento: String(val(['DENUNCIACAO_FALSA_TIPO_PROCEDIMENTO']) || ''),
      denunciacaoFalsaNumeroProcedimento: String(val(['DENUNCIACAO_FALSA_NUMERO_PROCEDIMENTO']) || ''),
      observacoes: String(val(['OBSERVACOES']) || ''),
      suspeitosIdent: String(val(['SUSPEITOS_IDENTIFICADOS_QTD']) || '0'),
      suspeitosPresos: String(val(['SUSPEITOS_PRESOS_QTD']) || '0'),
      veiculosIdentificados: String(val(['VEICULOS_SUSPEITOS_IDENTIFICADOS_QTD']) || '0'),
      veiculosRecuperados: String(val(['VEICULOS_RECUPERADOS_QTD']) || '0'),
      veiculosApreendidos: String(val(['VEICULOS_APREENDIDOS_QTD']) || '0'),
      armasApreendidas: String(val(['ARMAS_APREENDIDAS_QTD']) || '0'),
      relatorioTecnico: String(val(['RELATORIO_TECNICO_QTD']) || '0'),
      relatorioMissao: String(val(['RELATORIO_MISSAO_QTD']) || '0'),
      relatorioExtracao: String(val(['RELATORIO_EXTRACAO_QTD']) || '0'),
      nomesSuspeitos: splitLinhasDemandaAtiva_(val(['NOME_SUSPEITOS'])),
      nomesPresos: splitLinhasDemandaAtiva_(val(['NOME_PRESOS'])),
      placasVeiculosIdentificados: splitLinhasDemandaAtiva_(val(['PLACA_VEICULO_IDENTIFICADO'])),
      placasVeiculosRecuperados: splitLinhasDemandaAtiva_(val(['PLACA_VEICULO_RECUPERADO'])),
      tiposVeiculosRecuperados: splitLinhasDemandaAtiva_(val(['TIPO_DO_VEÍCULO', 'TIPO_DO_VEICULO'])),
      marcasVeiculosRecuperados: splitLinhasDemandaAtiva_(val(['MARCA'])),
      modelosVeiculosRecuperados: splitLinhasDemandaAtiva_(val(['MODELO'])),
      anosVeiculosRecuperados: splitLinhasDemandaAtiva_(val(['ANO'])),
      valoresVeiculosRecuperados: splitLinhasDemandaAtiva_(val(['VALOR_RS'])),
      fontesVeiculosRecuperados: splitLinhasDemandaAtiva_(val(['FONTE_DE_DADOS'])),
      descricoesVeiculosRecuperados: splitLinhasDemandaAtiva_(val(['MODELO'])),
      observacoesVeiculosRecuperados: [],
      placasVeiculosApreendidos: splitLinhasDemandaAtiva_(val(['PLACA_VEICULO_APREENDIDO'])),
      relatorioTecnicoPdfLinks: splitLinhasDemandaAtiva_(val(['RELATORIO_TECNICO_PDF'])),
      relatorioMissaoPdfLinks: splitLinhasDemandaAtiva_(val(['RELATORIO_MISSAO_PDF'])),
      relatorioExtracaoPdfLinks: splitLinhasDemandaAtiva_(val(['RELATORIO_EXTRACAO_PDF']))
  }};
}

function atualizarDemandaBanco(dados) {
  try {
    if (!usuarioPodeEditarDemandasAtivas_(dados.usuarioLogin)) {
      return { sucesso: false, erro: 'Apenas ADMIN e NUIP podem editar demandas ativas.' };
    }
    const linha = Number(dados.rowIndex || 0);
    if (!linha || linha < 2) return { sucesso: false, erro: 'Linha inválida para atualização.' };
    const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    const aba = ss.getSheetByName('DEMANDAS_ATIVAS');
    if (!aba) throw new Error("Aba 'DEMANDAS_ATIVAS' não encontrada na planilha.");
    garantirColunasDemandasAtivasEvolucaoDiversa_(aba);
    garantirCabecalhosCasosCadastro_(aba, ['CASO_ID']);
    const headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    if (!Number.isInteger(linha) || linha > aba.getLastRow()) return { sucesso: false, erro: 'Linha inválida para atualização.' };
    var rowAnterior = aba.getRange(linha, 1, 1, aba.getLastColumn()).getValues()[0];
    var vinculoCaso = resolverVinculoCasoDemanda_(dados, ss, {id: String(rowAnterior[headers.indexOf('CASO_ID')] || ''), nome: String(rowAnterior[headers.indexOf('CASO')] || '')});
    var tipoProcedimento = textoMaiusculoDemandaAtiva_(dados.tipoOcorrencia);
    var numeroProcedimento = numeroProcedimentoDemandaAtiva_(dados.numOcorrencia);
    var procedimentoConcat = procedimentoConcatDemandaAtiva_(tipoProcedimento, numeroProcedimento);
    if (verificarDuplicidadeProcedimentoDemandaAtiva_(aba, headers, tipoProcedimento, numeroProcedimento, linha)) {
      return { sucesso: false, erro: 'O procedimento já foi cadastrado.' };
    }
    const suspeitosIdentificados = toIntDemandaAtiva_(dados.suspeitosIdent);
    const suspeitosPresos = toIntDemandaAtiva_(dados.suspeitosPresos);
    const veiculosIdentificados = toIntDemandaAtiva_(dados.veiculosIdentificados);
    const veiculosRecuperados = toIntDemandaAtiva_(dados.veiculosRecuperados);
    const veiculosApreendidos = toIntDemandaAtiva_(dados.veiculosApreendidos);
    const armasApreendidas = toIntDemandaAtiva_(dados.armasApreendidas);
    const relatorioTecnico = toIntDemandaAtiva_(dados.relatorioTecnico);
    const relatorioMissao = toIntDemandaAtiva_(dados.relatorioMissao);
    const relatorioExtracao = toIntDemandaAtiva_(dados.relatorioExtracao);
    const relatoriosQtd = relatorioTecnico + relatorioMissao + relatorioExtracao;
    const evolucaoDiversa = obterDadosEvolucaoDiversaDemandaAtiva_(dados);
    const camposEvolucao = [suspeitosIdentificados, suspeitosPresos, veiculosIdentificados, veiculosRecuperados, veiculosApreendidos, armasApreendidas, relatorioTecnico];
    let evoluiu = !!evolucaoDiversa.motivo || camposEvolucao.some(function(v) { return v >= 1; });
    const statusEvolucao = evoluiu ? 'DEMANDA EVOLUIDA' : 'DEMANDA NÃO EVOLUÍDA';
    const mapa = {
      'DATA_DA_OCORRENCIA': dataDemandaAtivaParaBr_(dados.dataOcorrencia || ''),
      'UNIDADE_RESPONSAVEL': textoMaiusculoDemandaAtiva_(dados.unidade || ''),
      'UNIDADE_OUTRO': textoMaiusculoDemandaAtiva_(dados.unidadeOutro || ''),
      'TIPO_PROCEDIMENTO': tipoProcedimento,
      'NUMERO_PROCEDIMENTO': numeroProcedimento,
      'PROCEDIMENTO_CONCAT': procedimentoConcat,
      'CRIME_TIPO': textoMaiusculoDemandaAtiva_(dados.crimeTipo || ''),
      'PROC_INSTAURADO': procedimentoInstauradoDemandaAtiva_(dados),
      'MOTIVO_EVOLUCAO_DIVERSA': evolucaoDiversa.motivo,
      'INCONSISTENCIA_INICIAL_VITIMA': evolucaoDiversa.ehInconsistencia ? 'SIM' : 'NÃO',
      'VITIMA_NAO_COLABORATIVA': evolucaoDiversa.ehVitimaNaoColaborativa ? 'SIM' : 'NÃO',
      'DENUNCIACAO_FALSA_CRIME': evolucaoDiversa.ehDenunciacaoFalsa ? 'SIM' : 'NÃO',
      'DENUNCIACAO_FALSA_INFRATOR': evolucaoDiversa.infratorDenunciacaoFalsa,
      'DENUNCIACAO_FALSA_TIPO_PROCEDIMENTO': evolucaoDiversa.tipoProcedimentoDenunciacaoFalsa,
      'DENUNCIACAO_FALSA_NUMERO_PROCEDIMENTO': evolucaoDiversa.numeroProcedimentoDenunciacaoFalsa,
      'CRIME_OUTRO': textoMaiusculoDemandaAtiva_(dados.crimeOutro || ''),
      'SUSPEITOS_IDENTIFICADOS_QTD': suspeitosIdentificados,
      'SUSPEITOS_PRESOS_QTD': suspeitosPresos,
      'VEICULOS_SUSPEITOS_IDENTIFICADOS_QTD': veiculosIdentificados,
      'VEICULOS_RECUPERADOS_QTD': veiculosRecuperados,
      'VEICULOS_APREENDIDOS_QTD': veiculosApreendidos,
      'ARMAS_APREENDIDAS_QTD': armasApreendidas,
      'RELATORIO_TECNICO_QTD': relatorioTecnico,
      'RELATORIO_MISSAO_QTD': relatorioMissao,
      'RELATORIO_EXTRACAO_QTD': relatorioExtracao,
      'RELATORIOS_QTD': relatoriosQtd,
      'OBSERVACOES': textoLivreDemandaAtiva_(dados.observacoes || ''),
      'NOME_VITIMA': textoMaiusculoDemandaAtiva_(dados.nomeVitima || ''),
      'ENDERECO_OCORRENCIA': textoMaiusculoDemandaAtiva_(dados.endereco || ''),
      'BAIRRO': textoMaiusculoDemandaAtiva_(dados.bairro || ''),
      'CASO': textoMaiusculoDemandaAtiva_(vinculoCaso.nome),
      'CASO_ID': vinculoCaso.id,
      'STATUS_DEMANDA': statusEvolucao,
      'EQUIPE_DIRETORIA': textoMaiusculoDemandaAtiva_(dados.equipe || ''),
      'TIPO_OCORRENCIA_OUTRO': textoMaiusculoDemandaAtiva_(dados.tipoOcorrenciaOutro || ''),
      'STATUS': textoMaiusculoDemandaAtiva_(dados.status || ''),
      'DEPARTAMENTO': textoMaiusculoDemandaAtiva_(dados.departamento || 'DEPATRI'),
      'NOME_SUSPEITOS': quebrarLinhasDemandaAtiva_(dados.nomesSuspeitos || [], true),
      'NOME_PRESOS': quebrarLinhasDemandaAtiva_(dados.nomesPresos || [], true),
      'PLACA_VEICULO_IDENTIFICADO': quebrarLinhasDemandaAtiva_(dados.placasVeiculosIdentificados || [], true),
      'PLACA_VEICULO_RECUPERADO': quebrarLinhasDemandaAtiva_(dados.placasVeiculosRecuperados || [], true),
      'TIPO_DO_VEÍCULO': quebrarLinhasDemandaAtiva_(dados.tiposVeiculosRecuperados || [], true),
      'MARCA': quebrarLinhasDemandaAtiva_(dados.marcasVeiculosRecuperados || [], true),
      'MODELO': quebrarLinhasDemandaAtiva_(dados.modelosVeiculosRecuperados || [], true),
      'ANO': quebrarLinhasDemandaAtiva_(dados.anosVeiculosRecuperados || [], true),
      'VALOR_RS': quebrarLinhasDemandaAtiva_(dados.valoresVeiculosRecuperados || [], false),
      'FONTE_DE_DADOS': quebrarLinhasDemandaAtiva_(dados.fontesVeiculosRecuperados || [], true),
      'PLACA_VEICULO_APREENDIDO': quebrarLinhasDemandaAtiva_(dados.placasVeiculosApreendidos || [], true),
      'RELATORIO_TECNICO_PDF': quebrarLinhasDemandaAtiva_(dados.relatorioTecnicoPdfLinks || [], false),
      'RELATORIO_MISSAO_PDF': quebrarLinhasDemandaAtiva_(dados.relatorioMissaoPdfLinks || [], false),
      'RELATORIO_EXTRACAO_PDF': quebrarLinhasDemandaAtiva_(dados.relatorioExtracaoPdfLinks || [], false)
    };
    Object.keys(mapa).forEach(function(headerNome) { var idx = headers.indexOf(headerNome); if (idx > -1) aba.getRange(linha, idx + 1).setValue(mapa[headerNome]); });
    return { sucesso: true, mensagem: 'Demanda atualizada com sucesso.' };
  } catch (erro) {
    return { sucesso: false, erro: erro.toString() };
  }
}

// ============================================================================
// PORTAL DEPATRI - MAESTRO.gs (NÚCLEO DO SISTEMA COMPLETO)
// =========================================================================

const CONFIG = {
  PLANILHA_MAE_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_PLANILHA_MAE_ID"),
  PASTA_DRIVE_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_PASTA_DRIVE_ID"),
  MODELO_DOC_OFICIO_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_MODELO_DOC_OFICIO_ID"),
  PASTA_BACKUP_PLANILHA_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_PASTA_BACKUP_PLANILHA_ID")
};

// =========================================================================
// 1. INICIALIZAÇÃO DO SISTEMA E UTILITÁRIOS
// =========================================================================

function doGet(e) {
  return HtmlService.createTemplateFromFile('INDEX')
    .evaluate()
    .setTitle('Portal DEPATRI - PCCE')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function padronizarCargo(cargoBruto) {
  if (!cargoBruto) return "Oficial Investigador";
  let cargoUpper = cargoBruto.toString().toUpperCase();
  if (cargoUpper.includes("INSPETOR") || cargoUpper.includes("ESCRIVÃO") || cargoUpper.includes("ESCRIVAO")) {
    return "Oficial Investigador";
  }
  return cargoBruto;
}

function gerarHash(texto) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) { hashVal += 256; }
    if (hashVal.toString(16).length == 1) { txtHash += '0'; }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}


function obterOpcoesCadastroPortal() {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var abaConfig = ss.getSheetByName('DB_CONFIG');
  if (!abaConfig) throw new Error("Aba 'DB_CONFIG' não encontrada.");

  var dados = abaConfig.getDataRange().getValues();
  if (!dados || !dados.length) {
    return { lotacoes: [], equipesPorLotacao: {} };
  }

  var headers = dados[0];
  var idxCategoria = headers.indexOf('CATEGORIA');
  var idxNome = headers.indexOf('NOME');
  var idxValorExtra = headers.indexOf('VALOR_EXTRA');
  if (idxCategoria === -1 || idxNome === -1 || idxValorExtra === -1) {
    throw new Error("A aba 'DB_CONFIG' precisa conter CATEGORIA, NOME e VALOR_EXTRA.");
  }

  var lotacoes = [];
  var mapaEquipes = {};
  var vistosLotacao = {};
  var vistosEquipe = {};

  for (var i = 1; i < dados.length; i++) {
    var categoria = normalizarDesenvDemandas_(dados[i][idxCategoria]);
    if (categoria !== 'LOTACAO_LOGIN') continue;

    var lotacao = String(dados[i][idxNome] || '').trim();
    var equipe = String(dados[i][idxValorExtra] || '').trim();
    if (!lotacao) continue;

    var lotacaoNorm = normalizarDesenvDemandas_(lotacao);
    if (!vistosLotacao[lotacaoNorm]) {
      vistosLotacao[lotacaoNorm] = true;
      lotacoes.push(lotacao);
    }

    if (equipe) {
      if (!mapaEquipes[lotacao]) mapaEquipes[lotacao] = [];
      var chaveEq = lotacaoNorm + '::' + normalizarDesenvDemandas_(equipe);
      if (!vistosEquipe[chaveEq]) {
        vistosEquipe[chaveEq] = true;
        mapaEquipes[lotacao].push(equipe);
      }
    }
  }

  lotacoes.sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
  Object.keys(mapaEquipes).forEach(function(lotacao) {
    mapaEquipes[lotacao].sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
  });

  return {
    lotacoes: lotacoes,
    equipesPorLotacao: mapaEquipes
  };
}

function garantirColunaEquipeUsuariosPortal_(aba) {
  if (!aba) return;
  if (aba.getLastColumn() < 11) {
    aba.getRange(1, 11).setValue('EQUIPE');
  } else {
    var cabecalhoAtual = String(aba.getRange(1, 11).getValue() || '').trim();
    if (!cabecalhoAtual) {
      aba.getRange(1, 11).setValue('EQUIPE');
    }
  }
}

function validarCadastroPortal_(dados) {
  var nome = String(dados && dados.nome || '').trim();
  var email = String(dados && dados.email || '').trim().toLowerCase();
  var matricula = String(dados && dados.matricula || '').trim();
  var lotacao = String((dados && (dados.lotacao || dados.delegacia)) || '').trim();
  var equipe = String(dados && dados.equipe || '').trim();

  if (!nome || !email || !matricula || !lotacao) {
    throw new Error('Preencha todos os campos obrigatórios do cadastro.');
  }

  if (!/@pc\.ce\.gov\.br$/i.test(email)) {
    throw new Error('Apenas e-mails institucionais (@pc.ce.gov.br) são permitidos.');
  }

  var opcoes = obterOpcoesCadastroPortal();
  var lotacaoEscolhida = '';
  var lotacaoNorm = normalizarDesenvDemandas_(lotacao);

  (opcoes.lotacoes || []).some(function(item) {
    if (normalizarDesenvDemandas_(item) === lotacaoNorm) {
      lotacaoEscolhida = item;
      return true;
    }
    return false;
  });

  if (!lotacaoEscolhida) {
    throw new Error('A lotação/delegacia informada não é válida.');
  }

  var equipeFinal = '';
  if (lotacaoNorm === 'NUCLEO OPERACIONAL') {
    var listaEquipes = opcoes.equipesPorLotacao[lotacaoEscolhida] || [];
    if (!equipe) {
      throw new Error('Selecione a equipe do Núcleo Operacional.');
    }

    var equipeNorm = normalizarDesenvDemandas_(equipe);
    listaEquipes.some(function(item) {
      if (normalizarDesenvDemandas_(item) === equipeNorm) {
        equipeFinal = item;
        return true;
      }
      return false;
    });

    if (!equipeFinal) {
      throw new Error('A equipe informada para o Núcleo Operacional não é válida.');
    }
  }

  return {
    nome: nome.toUpperCase(),
    email: email,
    matricula: matricula,
    lotacao: lotacaoEscolhida.toUpperCase(),
    equipe: equipeFinal.toUpperCase()
  };
}

// =========================================================================
// 2. SISTEMA DE AUTENTICAÇÃO, REGISTRO E SENHAS
// =========================================================================

function autenticarUsuario(loginDigitado, senhaDigitada) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    const abaUsuarios = ss.getSheetByName('USUARIOS');
    const dados = abaUsuarios.getDataRange().getValues();
    const hashDigitado = gerarHash(senhaDigitada);

    for (let i = 1; i < dados.length; i++) {
      if (dados[i][0].toString().toLowerCase() === loginDigitado.toLowerCase()) {
        let perfil = dados[i][4]; 

        const perfilNormalizado = String(perfil || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();

        if (perfilNormalizado === "PENDENTE") {
          return { sucesso: false, erro: 'Seu cadastro está em análise. Aguarde a aprovação do Administrador.' };
        }

        if (perfilNormalizado === "REJEITADO") {
          return { sucesso: false, erro: 'Seu cadastro foi rejeitado. Procure o administrador do sistema.' };
        }
        
        let hashBanco = dados[i][8]; 
        
        if (hashBanco !== hashDigitado) {
          return { sucesso: false, erro: 'Senha incorreta. Tente novamente.' };
        }
        
        let forcarTroca = dados[i][9] === true;
        let cargoPadronizado = padronizarCargo(dados[i][3]); 

        return {
          sucesso: true,
          forcarTroca: forcarTroca,
          usuario: {
            login: dados[i][0],
            nome: dados[i][1],
            email: dados[i][2],
            cargo: cargoPadronizado,
            perfil: perfil,
            delegacia: dados[i][5],
            lotacao: dados[i][5],
            idAssinatura: dados[i][6],
            matricula: dados[i][7],
            equipe: dados[i][10] || ''
          }
        };
      }
    }
    return { sucesso: false, erro: 'Usuário não encontrado. Verifique seu login.' };
  } catch (erro) {
    return { sucesso: false, erro: 'Erro ao conectar com o banco de dados.' };
  }
}

function restaurarLoginPersistentePortal(loginSalvo) {
  try {
    loginSalvo = String(loginSalvo || '').trim();
    if (!loginSalvo) {
      return { sucesso: false, erro: 'Login persistente não informado.' };
    }

    const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    const abaUsuarios = ss.getSheetByName('USUARIOS');
    if (!abaUsuarios) throw new Error("Aba 'USUARIOS' não encontrada.");

    const dados = abaUsuarios.getDataRange().getValues();

    for (let i = 1; i < dados.length; i++) {
      const loginLinha = String(dados[i][0] || '').trim();

      if (loginLinha.toLowerCase() !== loginSalvo.toLowerCase()) continue;

      const perfil = dados[i][4];
      const perfilNormalizado = String(perfil || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();

      if (perfilNormalizado === 'PENDENTE') {
        return { sucesso: false, erro: 'Seu cadastro ainda está pendente de aprovação.' };
      }

      if (perfilNormalizado === 'REJEITADO') {
        return { sucesso: false, erro: 'Seu cadastro foi rejeitado.' };
      }

      const forcarTroca = dados[i][9] === true;

      if (forcarTroca) {
        return { sucesso: false, erro: 'É necessário realizar login novamente para troca de senha.' };
      }

      return {
        sucesso: true,
        usuario: {
          login: dados[i][0],
          nome: dados[i][1],
          email: dados[i][2],
          cargo: padronizarCargo(dados[i][3]),
          perfil: perfil,
          delegacia: dados[i][5],
          lotacao: dados[i][5],
          idAssinatura: dados[i][6],
          matricula: dados[i][7],
          equipe: dados[i][10] || ''
        }
      };
    }

    return { sucesso: false, erro: 'Usuário não encontrado.' };

  } catch (erro) {
    return { sucesso: false, erro: 'Erro ao restaurar login: ' + erro.toString() };
  }
}

function registrarNovoUsuario(dados) {
  try {
    var dadosValidados = validarCadastroPortal_(dados || {});

    const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    const abaUsuarios = ss.getSheetByName('USUARIOS');
    garantirColunaEquipeUsuariosPortal_(abaUsuarios);
    const dadosSheet = abaUsuarios.getDataRange().getValues();

    let partesNome = dadosValidados.nome.trim().split(/\s+/);
    let primeiraLetra = partesNome[0].charAt(0).toLowerCase();
    let ultimoSobrenome = partesNome[partesNome.length - 1].toLowerCase();
    let baseLogin = primeiraLetra + ultimoSobrenome;

    let loginFinal = baseLogin;
    let contador = 1;
    let loginExiste = true;

    while (loginExiste) {
      loginExiste = false;
      for (let i = 1; i < dadosSheet.length; i++) {
        if (String(dadosSheet[i][0] || '').toLowerCase() === loginFinal) {
          loginExiste = true;
          loginFinal = baseLogin + contador;
          contador++;
          break;
        }
      }
    }

    const senhaTemp = Math.random().toString(36).slice(-6).toUpperCase();
    const hashSenhaTemp = gerarHash(senhaTemp);

    abaUsuarios.appendRow([
      loginFinal,
      dadosValidados.nome,
      dadosValidados.email,
      "Oficial Investigador",
      "PENDENTE",
      dadosValidados.lotacao,
      "",
      dadosValidados.matricula,
      hashSenhaTemp,
      true,
      dadosValidados.equipe || ''
    ]);

    return { sucesso: true, loginGerado: loginFinal, senhaTemp: senhaTemp };
  } catch (erro) {
    return { sucesso: false, erro: 'Erro ao gerar o cadastro: ' + erro.toString() };
  }
}

function atualizarSenhaBD(login, novaSenha) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    const abaUsuarios = ss.getSheetByName('USUARIOS');
    const dados = abaUsuarios.getDataRange().getValues();
    const novoHash = gerarHash(novaSenha);

    for (let i = 1; i < dados.length; i++) {
      if (dados[i][0].toString().toLowerCase() === login.toLowerCase()) {
        abaUsuarios.getRange(i + 1, 9).setValue(novoHash);
        abaUsuarios.getRange(i + 1, 10).setValue(false); 
        return { sucesso: true };
      }
    }
    return { sucesso: false, erro: 'Usuário não encontrado.' };
  } catch (erro) {
    return { sucesso: false, erro: 'Erro ao atualizar a senha.' };
  }
}

function alterarSenhaUsuarioLogado(login, senhaAtual, novaSenha) {
  try {
    login = String(login || '').trim();
    senhaAtual = String(senhaAtual || '');
    novaSenha = String(novaSenha || '');

    if (!login) {
      return { sucesso: false, erro: 'Usuário não identificado.' };
    }

    if (!senhaAtual) {
      return { sucesso: false, erro: 'Informe a senha atual.' };
    }

    if (!novaSenha || novaSenha.length < 6) {
      return { sucesso: false, erro: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    if (senhaAtual === novaSenha) {
      return { sucesso: false, erro: 'A nova senha deve ser diferente da senha atual.' };
    }

    const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    const abaUsuarios = ss.getSheetByName('USUARIOS');
    if (!abaUsuarios) throw new Error("Aba 'USUARIOS' não encontrada.");

    const dados = abaUsuarios.getDataRange().getValues();
    const hashAtualInformado = gerarHash(senhaAtual);
    const novoHash = gerarHash(novaSenha);

    for (let i = 1; i < dados.length; i++) {
      const loginLinha = String(dados[i][0] || '').trim().toLowerCase();
      if (loginLinha !== login.toLowerCase()) continue;

      const hashBanco = String(dados[i][8] || '');
      if (hashBanco !== hashAtualInformado) {
        return { sucesso: false, erro: 'A senha atual está incorreta.' };
      }

      abaUsuarios.getRange(i + 1, 9).setValue(novoHash);
      abaUsuarios.getRange(i + 1, 10).setValue(false);

      return { sucesso: true, mensagem: 'Senha alterada com sucesso.' };
    }

    return { sucesso: false, erro: 'Usuário não encontrado.' };
  } catch (erro) {
    return { sucesso: false, erro: 'Erro ao alterar a senha: ' + erro.toString() };
  }
}

// =========================================================================
// MÓDULO 2 - PRODUTIVIDADE (BACKEND ATUALIZADO)
// =========================================================================

function obterDadosConfigProdutividade() {
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const abaConfig = ss.getSheetByName('DB_CONFIG');
  const dadosConfig = abaConfig.getDataRange().getValues();
  const headers = dadosConfig[0];

  const idxCat = headers.indexOf('CATEGORIA');
  const idxNome = headers.indexOf('NOME');
  const idxValorExtra = headers.indexOf('VALOR_EXTRA');
  const idxModalidade = headers.indexOf('MODALIDADE');

  let resultado = { meses: [], unidades: [], crimes: [] };

  for (let i = 1; i < dadosConfig.length; i++) {
    const categoria = dadosConfig[i][idxCat];

    if (categoria === 'MES') {
      resultado.meses.push(dadosConfig[i][idxNome]);
    } else if (categoria === 'UNID RESP PRODUTIVIDADE') {
      resultado.unidades.push(dadosConfig[i][idxNome]);
    } else if (categoria === 'CRIME_PRODUTIVIDADE') {
      resultado.crimes.push({
        crime: (dadosConfig[i][idxNome] || '').toString().trim(),
        subtipo: (dadosConfig[i][idxValorExtra] || '').toString().trim(),
        modalidade: idxModalidade > -1 ? (dadosConfig[i][idxModalidade] || '').toString().trim() : ''
      });
    }
  }

  resultado.meses = resultado.meses.filter(Boolean);
  resultado.unidades = resultado.unidades.filter(Boolean);
  resultado.crimes = resultado.crimes.filter(c => c.crime || c.subtipo);
  return resultado;
}

function baseUrlFipeProdutividade_() {
  return 'https://fipe.parallelum.com.br/api/v2';
}

function tipoVeiculoFipeProdutividade_(valor) {
  var txt = String(valor || '').trim().toUpperCase();
  if (txt === 'CARS' || txt === 'CARRO') return 'cars';
  if (txt === 'MOTORCYCLES' || txt === 'MOTO' || txt === 'MOTOS') return 'motorcycles';
  if (txt === 'TRUCKS' || txt === 'CAMINHÃO' || txt === 'CAMINHAO' || txt === 'CAMINHÕES' || txt === 'CAMINHOES') return 'trucks';
  throw new Error('Tipo de veículo inválido para consulta FIPE.');
}

function requisicaoFipeProdutividade_(caminho, query) {
  var url = baseUrlFipeProdutividade_() + caminho;
  if (query && Object.keys(query).length) {
    var params = [];
    Object.keys(query).forEach(function(chave) {
      if (query[chave] === null || query[chave] === undefined || query[chave] === '') return;
      params.push(encodeURIComponent(chave) + '=' + encodeURIComponent(String(query[chave])));
    });
    if (params.length) url += '?' + params.join('&');
  }
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { accept: 'application/json' } });
  var code = resp.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Falha na consulta FIPE (' + code + ').');
  return JSON.parse(resp.getContentText() || 'null');
}

function listarMarcasFipeProdutividade(tipoVeiculo) {
  var tipo = tipoVeiculoFipeProdutividade_(tipoVeiculo);
  var lista = requisicaoFipeProdutividade_('/' + tipo + '/brands', {});
  return (lista || []).map(function(item) { return { code: String(item.code || ''), name: String(item.name || '') }; });
}

function listarModelosFipeProdutividade(tipoVeiculo, brandId) {
  var tipo = tipoVeiculoFipeProdutividade_(tipoVeiculo);
  var lista = requisicaoFipeProdutividade_('/' + tipo + '/brands/' + encodeURIComponent(String(brandId || '')) + '/models', {});
  return (lista || []).map(function(item) { return { code: String(item.code || ''), name: String(item.name || '') }; });
}

function listarAnosFipeProdutividade(tipoVeiculo, brandId, modelId) {
  var tipo = tipoVeiculoFipeProdutividade_(tipoVeiculo);
  var lista = requisicaoFipeProdutividade_('/' + tipo + '/brands/' + encodeURIComponent(String(brandId || '')) + '/models/' + encodeURIComponent(String(modelId || '')) + '/years', {});
  return (lista || []).map(function(item) { return { code: String(item.code || ''), name: String(item.name || '') }; });
}

function normalizarNumeroFipeProdutividade_(valor) {
  var txt = String(valor || '').replace(/[^\d,.-]/g, '').trim();
  if (!txt) return '';
  txt = txt.replace(/\./g, '').replace(',', '.');
  var n = Number(txt);
  return isNaN(n) ? '' : n.toFixed(2);
}

function consultarValorFipeProdutividade(tipoVeiculo, brandId, modelId, yearId) {
  var tipo = tipoVeiculoFipeProdutividade_(tipoVeiculo);
  var info = requisicaoFipeProdutividade_('/' + tipo + '/brands/' + encodeURIComponent(String(brandId || '')) + '/models/' + encodeURIComponent(String(modelId || '')) + '/years/' + encodeURIComponent(String(yearId || '')), {});
  var priceLabel = String(info.price || info.Price || '').trim();
  return {
    priceLabel: priceLabel,
    priceValue: normalizarNumeroFipeProdutividade_(priceLabel),
    brand: String(info.brand || info.Brand || '').trim(),
    model: String(info.model || info.Model || '').trim(),
    modelYear: String(info.modelYear || info.year || info.Year || '').trim()
  };
}

function classificarPermissaoProdutividade_(usuario) {
  var perfil = String((usuario && usuario.perfil) || '').trim().toUpperCase();

  if (perfil === 'ADMIN' || perfil === 'CRIADOR/ADMIN' || perfil === 'CRIADOR ADMIN') return 'TOTAL';
  if (perfil === 'DIREÇÃO' || perfil === 'DIRECAO') return 'TOTAL';
  if (perfil === 'ADMINISTRATIVO') return 'TOTAL';
  if (perfil === 'DELEGACIA') return 'PROPRIA';

  return 'NEGADO';
}

function validarAcessoProdutividade_(usuarioLogin, delegaciaInformada) {
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const abaUsuarios = ss.getSheetByName('USUARIOS');
  const dados = abaUsuarios.getDataRange().getValues();

  var usuario = null;
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0] || '').trim().toLowerCase() === String(usuarioLogin || '').trim().toLowerCase()) {
      usuario = {
        login: dados[i][0],
        nome: dados[i][1],
        email: dados[i][2],
        cargo: dados[i][3],
        perfil: dados[i][4],
        delegacia: dados[i][5]
      };
      break;
    }
  }

  if (!usuario) throw new Error('Usuário não encontrado.');
  var classe = classificarPermissaoProdutividade_(usuario);

  if (classe === 'NEGADO') {
    throw new Error('Seu perfil não possui acesso ao módulo Produtividade.');
  }

  var delegaciaUsuario = String(usuario.delegacia || '').trim().toUpperCase();
  var delegaciaPayload = String(delegaciaInformada || '').trim().toUpperCase();

  if (classe === 'PROPRIA' && delegaciaUsuario !== delegaciaPayload) {
    throw new Error('Usuário DELEGACIA só pode gravar produtividade da própria delegacia.');
  }

  return { usuario: usuario, classe: classe };
}

function normalizarControleEnviosProd_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function obterIndiceControleEnviosProd_(headers, aliases) {
  aliases = aliases || [];

  for (var i = 0; i < aliases.length; i++) {
    var alvo = normalizarControleEnviosProd_(aliases[i]);

    for (var j = 0; j < headers.length; j++) {
      if (normalizarControleEnviosProd_(headers[j]) === alvo) {
        return j;
      }
    }
  }

  return -1;
}

function garantirAbaControleEnviosProd_(ss) {
  var nomeAba = 'CONTROLE_ENVIOS';
  var headersObrigatorios = [
    'DELEGACIA',
    'MÊS',
    'ANO',
    'DATA_ENVIO',
    'USUARIO',
    'CELULAR',
    'EMAIL'
  ];

  var aba = ss.getSheetByName(nomeAba);

  if (!aba) {
    aba = ss.insertSheet(nomeAba);
    aba.getRange(1, 1, 1, headersObrigatorios.length).setValues([headersObrigatorios]);
    aba.setFrozenRows(1);
    return aba;
  }

  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, headersObrigatorios.length).setValues([headersObrigatorios]);
    aba.setFrozenRows(1);
    return aba;
  }

  var lastCol = Math.max(aba.getLastColumn(), 1);
  var headers = aba.getRange(1, 1, 1, lastCol).getValues()[0];

  headersObrigatorios.forEach(function(headerObrigatorio) {
    var existe = obterIndiceControleEnviosProd_(headers, [headerObrigatorio]) > -1;

    if (!existe) {
      aba.getRange(1, aba.getLastColumn() + 1).setValue(headerObrigatorio);
      headers.push(headerObrigatorio);
    }
  });

  aba.setFrozenRows(1);
  return aba;
}

function obterDadosUsuarioControleEnviosProd_(ss, usuarioLogin) {
  var aba = ss.getSheetByName('USUARIOS');

  var retorno = {
    usuario: String(usuarioLogin || '').trim(),
    celular: '',
    email: ''
  };

  if (!aba || aba.getLastRow() < 2) {
    return retorno;
  }

  var dados = aba.getDataRange().getValues();
  var headers = dados[0] || [];

  var idxLogin = obterIndiceControleEnviosProd_(headers, ['LOGIN', 'USUARIO', 'USUÁRIO']);
  var idxNome = obterIndiceControleEnviosProd_(headers, ['NOME', 'NOME_COMPLETO', 'NOME COMPLETO']);
  var idxEmail = obterIndiceControleEnviosProd_(headers, ['EMAIL', 'E-MAIL']);
  var idxCelular = obterIndiceControleEnviosProd_(headers, ['CELULAR', 'TELEFONE', 'WHATSAPP', 'CONTATO']);

  // Fallback conforme estrutura atual da aba USUARIOS:
  // A = login, B = nome, C = email
  if (idxLogin < 0) idxLogin = 0;
  if (idxNome < 0) idxNome = 1;
  if (idxEmail < 0) idxEmail = 2;

  var loginNorm = normalizarControleEnviosProd_(usuarioLogin);

  for (var i = 1; i < dados.length; i++) {
    var loginLinha = normalizarControleEnviosProd_(dados[i][idxLogin]);

    if (loginLinha !== loginNorm) continue;

    retorno.usuario = String(dados[i][idxNome] || usuarioLogin || '').trim();
    retorno.email = String(dados[i][idxEmail] || '').trim();
    retorno.celular = idxCelular > -1 ? String(dados[i][idxCelular] || '').trim() : '';

    return retorno;
  }

  return retorno;
}

function verificarProdutividadeJaEnviada_(ss, delegacia, mes, ano) {
  delegacia = normalizarControleEnviosProd_(delegacia);
  mes = normalizarControleEnviosProd_(mes);
  ano = String(ano || '').trim();

  if (!delegacia || !mes || !ano) {
    return false;
  }

  // =========================================================
  // 1. VERIFICA O CONTROLE DE ENVIOS
  // =========================================================
  var abaControle = garantirAbaControleEnviosProd_(ss);

  if (abaControle && abaControle.getLastRow() > 1) {
    var dadosControle = abaControle.getDataRange().getValues();
    var headersControle = dadosControle[0] || [];

    var idxDelegacia = obterIndiceControleEnviosProd_(
      headersControle,
      ['DELEGACIA']
    );

    var idxMes = obterIndiceControleEnviosProd_(
      headersControle,
      ['MÊS', 'MES']
    );

    var idxAno = obterIndiceControleEnviosProd_(
      headersControle,
      ['ANO']
    );

    if (idxDelegacia > -1 && idxMes > -1 && idxAno > -1) {
      for (var i = 1; i < dadosControle.length; i++) {

        var delegaciaLinha =
          normalizarControleEnviosProd_(dadosControle[i][idxDelegacia]);

        var mesLinha =
          normalizarControleEnviosProd_(dadosControle[i][idxMes]);

        var anoLinha =
          String(dadosControle[i][idxAno] || '').trim();

        if (
          delegaciaLinha === delegacia &&
          mesLinha === mes &&
          anoLinha === ano
        ) {
          return true;
        }
      }
    }
  }

  // =========================================================
  // 2. SEGURANÇA EXTRA:
  // VERIFICA TAMBÉM O BANCO DE PRODUTIVIDADE
  // =========================================================
  var abaRegistros = ss.getSheetByName('REGISTROS_PRODUTIVIDADE');

  if (abaRegistros && abaRegistros.getLastRow() > 1) {

    /*
      Estrutura atual:
      A = DATA/HORA
      B = DELEGACIA
      C = ANO
      D = MÊS
    */

    var qtdLinhas = abaRegistros.getLastRow() - 1;

    var dadosRegistros =
      abaRegistros.getRange(2, 2, qtdLinhas, 3).getValues();

    for (var j = 0; j < dadosRegistros.length; j++) {

      var delegaciaRegistro =
        normalizarControleEnviosProd_(dadosRegistros[j][0]);

      var anoRegistro =
        String(dadosRegistros[j][1] || '').trim();

      var mesRegistro =
        normalizarControleEnviosProd_(dadosRegistros[j][2]);

      if (
        delegaciaRegistro === delegacia &&
        mesRegistro === mes &&
        anoRegistro === ano
      ) {
        return true;
      }
    }
  }

  return false;
}

function registrarControleEnvioProdutividade_(ss, usuarioLogin, payload, dataHoraAtual) {
  payload = payload || {};

  var delegacia = String(payload.delegacia || '').trim().toUpperCase();
  var mes = String(payload.mes || '').trim().toUpperCase();
  var ano = String(payload.ano || '').trim();

  if (!delegacia || !mes || !ano) return;

  var aba = garantirAbaControleEnviosProd_(ss);
  var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];

  var idxDelegacia = obterIndiceControleEnviosProd_(headers, ['DELEGACIA']);
  var idxMes = obterIndiceControleEnviosProd_(headers, ['MÊS', 'MES']);
  var idxAno = obterIndiceControleEnviosProd_(headers, ['ANO']);
  var idxDataEnvio = obterIndiceControleEnviosProd_(headers, ['DATA_ENVIO', 'DATA ENVIO']);
  var idxUsuario = obterIndiceControleEnviosProd_(headers, ['USUARIO', 'USUÁRIO']);
  var idxCelular = obterIndiceControleEnviosProd_(headers, ['CELULAR']);
  var idxEmail = obterIndiceControleEnviosProd_(headers, ['EMAIL', 'E-MAIL']);

  var usuarioInfo = obterDadosUsuarioControleEnviosProd_(ss, usuarioLogin);

  var dados = aba.getDataRange().getValues();
  var linhaEncontrada = 0;

  for (var i = 1; i < dados.length; i++) {
    var delegaciaLinha = normalizarControleEnviosProd_(dados[i][idxDelegacia]);
    var mesLinha = normalizarControleEnviosProd_(dados[i][idxMes]);
    var anoLinha = String(dados[i][idxAno] || '').trim();

    if (
      delegaciaLinha === normalizarControleEnviosProd_(delegacia) &&
      mesLinha === normalizarControleEnviosProd_(mes) &&
      anoLinha === ano
    ) {
      linhaEncontrada = i + 1;
      break;
    }
  }

  var linha = Array(headers.length).fill('');

  if (linhaEncontrada) {
    linha = aba.getRange(linhaEncontrada, 1, 1, headers.length).getValues()[0];
  }

  linha[idxDelegacia] = delegacia;
  linha[idxMes] = mes;
  linha[idxAno] = ano;
  linha[idxDataEnvio] = dataHoraAtual || new Date();
  linha[idxUsuario] = usuarioInfo.usuario || usuarioLogin || '';
  linha[idxCelular] = usuarioInfo.celular || '';
  linha[idxEmail] = usuarioInfo.email || '';

  if (linhaEncontrada) {
    aba.getRange(linhaEncontrada, 1, 1, headers.length).setValues([linha]);
    aba.getRange(linhaEncontrada, idxDataEnvio + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  } else {
    aba.appendRow(linha);
    var novaLinha = aba.getLastRow();
    aba.getRange(novaLinha, idxDataEnvio + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }
}

function salvarNoBancoProdutividade(usuarioLogin, payload) {
  var lock = LockService.getScriptLock();
  var lockObtido = false;

  try {
    payload = payload || {};

    validarAcessoProdutividade_(usuarioLogin, payload.delegacia);

    // Evita dois envios simultâneos da mesma produtividade
    lockObtido = lock.tryLock(15000);

    if (!lockObtido) {
      return {
        sucesso: false,
        erro: 'Existe outro envio de produtividade sendo processado neste momento. Aguarde alguns segundos e tente novamente.'
      };
    }

    const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);

    // ============================================================
    // IMPEDE DUPLICIDADE: DELEGACIA + MÊS + ANO
    // ============================================================
    var jaEnviada = verificarProdutividadeJaEnviada_(
      ss,
      payload.delegacia,
      payload.mes,
      payload.ano
    );

    if (jaEnviada) {
      return {
        sucesso: false,
        duplicado: true,
        erro:
          'A produtividade do mês de ' +
          String(payload.mes || '').toUpperCase() +
          ' de ' +
          String(payload.ano || '') +
          ' já foi enviada. Caso necessite alteração de algum dado, entre em contato com o Administrativo do DEPATRI.'
      };
    }

    const aba = ss.getSheetByName('REGISTROS_PRODUTIVIDADE');
    const abaConfig = ss.getSheetByName('DB_CONFIG');
    const dataHoraAtual = new Date();
    const dadosConfig = abaConfig.getDataRange().getValues();
    const configHeaders = dadosConfig[0];
    const idxCat = configHeaders.indexOf('CATEGORIA');
    const idxNome = configHeaders.indexOf('NOME');
    const idxValorExtra = configHeaders.indexOf('VALOR_EXTRA');

    function toNumber(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;

  var txt = String(valor).trim().replace(/[^\d,.-]/g, '');
  if (!txt) return 0;

  // caso brasileiro: 184.592,00
  if (txt.indexOf(',') > -1 && txt.indexOf('.') > -1) {
    txt = txt.replace(/\./g, '').replace(',', '.');
  }
  // caso americano/interno do sistema: 184592.00
  else if (txt.indexOf(',') === -1 && txt.indexOf('.') > -1) {
    // mantém como está
  }
  // caso com vírgula decimal: 184592,00
  else if (txt.indexOf(',') > -1) {
    txt = txt.replace(',', '.');
  }

  var n = Number(txt);
  return isNaN(n) ? 0 : n;
}

    function normalizarUnidade(unidade) {
      if (!unidade) return '';
      if (String(unidade).toLowerCase() === 'unid') return 'UNIDADE';
      return unidade;
    }

    function buscarValorFiosRelacionados() {
      for (let i = 1; i < dadosConfig.length; i++) {
        const cat = (dadosConfig[i][idxCat] || '').toString().trim().toUpperCase();
        const nome = (dadosConfig[i][idxNome] || '').toString().trim().toUpperCase();
        if (cat === 'VALORES' && nome === 'VALOR DE FIOS E RELACIONADOS') {
          return toNumber(dadosConfig[i][idxValorExtra]);
        }
      }
      return 0;
    }

    const valorFiosRelacionados = buscarValorFiosRelacionados();
    let matrizParaInsercao = [];

    function novaLinhaBase(reg, categoriaOverride, tipoOverride) {
      const linha = Array(23).fill('');
      linha[0] = dataHoraAtual;
      linha[1] = payload.delegacia;
      linha[2] = payload.ano;
      linha[3] = payload.mes;
      linha[4] = categoriaOverride || reg.categoria;
      linha[5] = tipoOverride || reg.tipo_produtividade;
      return linha;
    }

    payload.registros.forEach(reg => {
      const unidade = normalizarUnidade(reg.unidade);
      const qtd = toNumber(reg.quantidade);
      const qtdModalidade = toNumber(reg.qtd_modalidade);

      if (reg.nao_contabilizado) {
        const linhaNC = novaLinhaBase(reg);
        linhaNC[8] = 'NAO CONTABILIZADO';
        matrizParaInsercao.push(linhaNC);
        return;
      }

      if (reg.categoria === 'INQUERITO') {
        const crime = reg.crime || '';
        const subtipo = reg.subtipo || '';
        const modalidade = reg.modalidade || '';
        const tipoProdNorm = String(reg.tipo_produtividade || '').trim().toUpperCase();
        if (tipoProdNorm === 'INQUÉRITO CONCLUÍDO' || tipoProdNorm === 'INQUERITO CONCLUIDO') {
          const linhaConcluido = novaLinhaBase(reg);
          linhaConcluido[6] = reg.inq_origem || '';
          linhaConcluido[7] = reg.inq_autoria || '';
          linhaConcluido[10] = crime;
          linhaConcluido[11] = subtipo;
          linhaConcluido[12] = modalidade;
          linhaConcluido[13] = qtd;
          linhaConcluido[14] = 'UNIDADE';
          matrizParaInsercao.push(linhaConcluido);
          return;
        }
        if (modalidade && qtdModalidade > 0) {
          const qtdSemModalidade = Math.max(qtd - qtdModalidade, 0);
          if (qtdSemModalidade > 0) {
            const linhaBase = novaLinhaBase(reg);
            linhaBase[10] = crime;
            linhaBase[11] = subtipo;
            linhaBase[12] = '';
            linhaBase[13] = qtdSemModalidade;
            linhaBase[14] = 'UNIDADE';
            matrizParaInsercao.push(linhaBase);
          }
          const linhaModalidade = novaLinhaBase(reg);
          linhaModalidade[10] = crime;
          linhaModalidade[11] = subtipo;
          linhaModalidade[12] = modalidade;
          linhaModalidade[13] = qtdModalidade;
          linhaModalidade[14] = 'UNIDADE';
          matrizParaInsercao.push(linhaModalidade);
        } else {
          const linhaInq = novaLinhaBase(reg);
          linhaInq[10] = crime;
          linhaInq[11] = subtipo;
          linhaInq[12] = '';
          linhaInq[13] = qtd;
          linhaInq[14] = 'UNIDADE';
          matrizParaInsercao.push(linhaInq);
        }
        return;
      }

      if (reg.categoria === 'REPRESENTACAO' && reg.tipo_produtividade === 'PRISÃO CAUTELAR') {
        const linhaRep = novaLinhaBase(reg);
        linhaRep[10] = reg.crime || '';
        linhaRep[11] = reg.subtipo || '';
        linhaRep[12] = reg.modalidade || '';
        linhaRep[13] = qtd;
        linhaRep[14] = 'UNIDADE';
        matrizParaInsercao.push(linhaRep);
        return;
      }

      if (reg.categoria === 'CONTADORES' && String(reg.tipo_produtividade || '').trim().toUpperCase() === 'VEÍCULOS RECUPERADOS') {
        const linhaVeiculo = novaLinhaBase(reg);
        linhaVeiculo[8] = reg.descricao_outros || '';
        linhaVeiculo[13] = qtd || 1;
        linhaVeiculo[14] = 'UNIDADE';
        linhaVeiculo[15] = toNumber(reg.valor_rs);
        linhaVeiculo[18] = reg.marca || '';
        linhaVeiculo[19] = reg.modelo || '';
        linhaVeiculo[20] = reg.ano || '';
        linhaVeiculo[21] = reg.fonte_de_dados || 'TABELA FIPE';
        linhaVeiculo[22] = reg.tipo_do_veiculo || '';
        matrizParaInsercao.push(linhaVeiculo);
        return;
      }

      if (reg.categoria === 'APREENSAO' && reg.tipo_produtividade === 'DINHEIRO EM ESPÉCIE') {
        const linhaDinheiro = novaLinhaBase(reg);
        linhaDinheiro[16] = qtd;
        matrizParaInsercao.push(linhaDinheiro);
        return;
      }

      if (reg.categoria === 'VALORES') {
        const linhaValor = novaLinhaBase(reg);
        linhaValor[15] = qtd;
        matrizParaInsercao.push(linhaValor);
        return;
      }

      const linha = novaLinhaBase(reg);
      linha[8] = reg.descricao_outros || '';
      linha[9] = reg.obs_processual || '';
      linha[13] = qtd;
      linha[14] = unidade;
      matrizParaInsercao.push(linha);

      if (reg.categoria === 'APREENSAO' && reg.tipo_produtividade === 'FIOS E RELACIONADOS' && valorFiosRelacionados > 0) {
        const linhaValorFios = novaLinhaBase(reg, 'VALORES', 'VALOR EM REAIS DE FIOS APREENDIDOS');
        linhaValorFios[15] = Number((qtd * valorFiosRelacionados).toFixed(2));
        matrizParaInsercao.push(linhaValorFios);
      }
    });

   if (matrizParaInsercao.length > 0) {
  var proximaLinha = aba.getLastRow() + 1;

  // grava os dados em A:W
  aba.getRange(proximaLinha, 1, matrizParaInsercao.length, 23).setValues(matrizParaInsercao);

  // grava valores calculados em X e Y (sem fórmula)
  var valoresXY = [];

  for (var i = 0; i < matrizParaInsercao.length; i++) {
    var linha = matrizParaInsercao[i];

    // K = índice 10 | N = índice 13
    var crime = String(linha[10] || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

    var quantidade = Number(linha[13] || 0) || 0;

    var valorX = (crime === 'ROUBO') ? quantidade : 0;

    var valorY = (
      crime === 'ROUBO' ||
      crime === 'FURTO' ||
      crime === 'EXTORSAO' ||
      crime === 'DANO' ||
      crime === 'APROPRIACAO INDEBITA' ||
      crime === 'ESTELIONATO' ||
      crime === 'RECEPTACAO'
    ) ? quantidade : 0;

    valoresXY.push([valorX, valorY]);
  }

  // X = 24 | Y = 25
  aba.getRange(proximaLinha, 24, valoresXY.length, 2).setValues(valoresXY);
  registrarControleEnvioProdutividade_(ss, usuarioLogin, payload, dataHoraAtual);
}

        return {
      sucesso: true,
      linhas: matrizParaInsercao.length
    };

  } catch (erro) {

    return {
      sucesso: false,
      erro: 'Erro ao gravar lote: ' + erro.toString()
    };

  } finally {

    if (lockObtido) {
      try {
        lock.releaseLock();
      } catch (e) {}
    }
  }
}
// MÓDULO 3 - GERADOR DE OFÍCIOS (BACKEND)
// Inclui as rotinas compartilhadas pelo MÓDULO 7 - NUMERADOR.
// =========================================================================

function normalizarIntelTexto_(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function escapeRegexIntel_(texto) {
  return String(texto || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function obterIndiceColunaPorAlias_(headers, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    const aliasNorm = normalizarIntelTexto_(aliases[i]);
    for (let j = 0; j < headers.length; j++) {
      if (normalizarIntelTexto_(headers[j]) === aliasNorm) return j;
    }
  }
  return -1;
}

function obterValorCampoPorAlias_(row, headers, aliases) {
  const idx = obterIndiceColunaPorAlias_(headers, aliases);
  return idx > -1 ? row[idx] : '';
}

function formatarDataIntel_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor)) {
    return Utilities.formatDate(valor, 'America/Fortaleza', 'dd/MM/yyyy');
  }
  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const partes = texto.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) return texto;
  return texto;
}

function formatarHoraIntel_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor)) {
    return Utilities.formatDate(valor, 'America/Fortaleza', 'HH:mm');
  }
  const texto = String(valor).trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(texto)) return texto.slice(0, 5);
  return texto;
}

function hojeIntelBR_() {
  return Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy');
}


function dataExtensoIntel_(data) {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const d = (Object.prototype.toString.call(data) === '[object Date]' && !isNaN(data)) ? data : new Date();
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

function obterInfoEmpresaIntel_(nomeBusca) {
  const nomeAlvo = String(nomeBusca || '').trim();
  if (!nomeAlvo) return null;

  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const aba = ss.getSheetByName('DB_EMPRESAS');
  if (!aba) return null;

  const dados = aba.getDataRange().getValues();
  if (!dados.length) return null;

  const headers = dados[0];
  const idxNomeEmpresa = obterIndiceColunaPorAlias_(headers, ['NOME_EMPRESA', 'NOME EMPRESA']);
  const idxTelefonia = obterIndiceColunaPorAlias_(headers, ['TELEFONIA']);
  const idxSetor = obterIndiceColunaPorAlias_(headers, ['SETOR']);
  const idxDest = obterIndiceColunaPorAlias_(headers, ['DESTINATARIO_PADRAO', 'DESTINATARIO PADRAO']);

  const alvoNorm = normalizarIntelTexto_(nomeAlvo);

  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    const nomeEmpresa = idxNomeEmpresa > -1 ? String(row[idxNomeEmpresa] || '').trim() : '';
    const nomeTel = idxTelefonia > -1 ? String(row[idxTelefonia] || '').trim() : '';

    if (normalizarIntelTexto_(nomeEmpresa) === alvoNorm || normalizarIntelTexto_(nomeTel) === alvoNorm) {
      return {
        nomeEmpresa: nomeEmpresa || nomeTel,
        setor: idxSetor > -1 ? String(row[idxSetor] || '').trim() : '',
        destinatarioPadrao: idxDest > -1 ? String(row[idxDest] || '').trim() : ''
      };
    }
  }
  return null;
}

function obterDestinatarioIntel_(payload, tipoSelecionado) {
  const dados = payload.dadosEspecificos || {};
  const categoria = classificarTipoDocumentoIntel_(`${tipoSelecionado.nome || ''} ${tipoSelecionado.id || ''}`);
  if (categoria === 'MANDADO' && dados.alvo) return dados.alvo;

  const infoEmpresa = obterInfoEmpresaIntel_(dados.empresa || dados.nomeEmpresa || '');
  if (infoEmpresa && infoEmpresa.destinatarioPadrao) return infoEmpresa.destinatarioPadrao;

  if (dados.delegacia) return dados.delegacia;
  return 'Gerente ou Responsável';
}

function substituirTagsContainerIntel_(container, tags) {
  if (!container) return;

  const tagsSemNegrito = ['CORPO_DINAMICO', 'TEXTO_BASE', 'ASSUNTO', 'LISTA_IFOOD', 'LISTA_INTERNET', 'LISTA_TELEFONIA', 'TABELA_DADOS', 'LISTA_DADOS'];

  Object.keys(tags || {}).forEach(function(chave) {
    const valor = tags[chave] == null ? '' : String(tags[chave]);
    const padrao = '\\{\\{\\s*' + escapeRegexIntel_(chave) + '\\s*\\}\\}';

    let achou = container.findText(padrao);
    
    while (achou !== null) {
      const textElement = achou.getElement().asText();
      const inicio = achou.getStartOffset();
      const fim = achou.getEndOffsetInclusive();

      textElement.deleteText(inicio, fim);

      if (valor.length > 0) {
        textElement.insertText(inicio, valor);
        if (!tagsSemNegrito.includes(chave)) {
          textElement.setBold(inicio, inicio + valor.length - 1, true);
        }
      }

      achou = container.findText(padrao);
    }
  });

  try { container.replaceText('<p[^>]*>', ''); } catch(e) {}
  try { container.replaceText('</p>', ''); } catch(e) {}
  try { container.replaceText('&nbsp;', ' '); } catch(e) {}
}

function inferirRotuloIdentificadorIntel_(valor) {
  const txt = String(valor || '').trim();
  if (!txt) return 'Identificador';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(txt)) return 'IPV4';
  if (txt.indexOf(':') > -1) return 'IPV6';
  if (/^\d{14,16}$/.test(txt.replace(/\D/g, ''))) return 'IMEI';
  if (/[+()]/.test(txt) || /\d{2}\)\s*\d/.test(txt) || /\+\d{2}/.test(txt)) return 'Terminal';
  if (txt.indexOf('.') > -1) return 'CPF';
  return 'Identificador';
}

function montarListaNumeradaIntel_(categoria, dadosEspecificos) {
  const dados = dadosEspecificos || {};
  const linhas = [];
  
  const tabela = Array.isArray(dados.tabelaDados) ? dados.tabelaDados : [];

  if (categoria === 'IFOOD') {
    tabela.forEach(function(item, idx) {
      const nome = String(item['NOME'] || item.nome || '').trim();
      const valor = String(item['CPF/TERMINAL'] || item.identificador || item.valor || '').trim();
      if (!nome && !valor) return;
      const rotulo = inferirRotuloIdentificadorIntel_(valor);
      if (nome && valor) linhas.push((idx + 1) + '. ' + nome + ', ' + rotulo + ' ' + valor);
      else if (nome) linhas.push((idx + 1) + '. ' + nome);
      else linhas.push((idx + 1) + '. ' + rotulo + ' ' + valor);
    });
  }

  if (categoria === 'PROVEDOR') {
  tabela.forEach(function(item, idx) {
    const tipo = String(item.IDENTIFICADOR || item.Tipo || item.TIPO || inferirRotuloIdentificadorIntel_(item.VALOR || '')).trim();
    const valor = String(item.VALOR || item.CPF || item.IPV4 || item.IPV6 || '').trim();
    if (!tipo && !valor) return;

    let textoLinha = (idx + 1) + '. ' + (tipo ? (tipo + ' ') : '') + valor;

    const porta = String(item['PORTA LÓGICA'] || item.portaLogica || '').trim();
    const dataInicial = String(item['DATA INICIAL'] || item.dataInicial || '').trim();
    const horaInicial = String(item['HORA INICIAL'] || item.horaInicial || '').trim();
    const dataFinal = String(item['DATA FINAL'] || item.dataFinal || '').trim();
    const horaFinal = String(item['HORA FINAL'] || item.horaFinal || '').trim();

    if (porta) textoLinha += ', Porta lógica ' + porta;
    if (dataInicial) textoLinha += ', Data: ' + dataInicial;
    if (horaInicial) textoLinha += ', Hora: ' + horaInicial;
    if (dataFinal) textoLinha += ', Data final ' + dataFinal;
    if (horaFinal) textoLinha += ', Hora final ' + horaFinal;

    linhas.push(textoLinha);
  });
}

  if (categoria === 'TELEFONIA') {
    tabela.forEach(function(item, idx) {
      const tipo = String(item.IDENTIFICADOR || item.Tipo || item.TIPO || inferirRotuloIdentificadorIntel_(item.VALOR || '')).trim();
      const valor = String(item.VALOR || item.CPF || item.IMEI || item.TERMINAL || '').trim();
      if (!tipo && !valor) return;
      linhas.push((idx + 1) + '. ' + (tipo ? (tipo + ' ') : '') + valor);
    });
  }

  return linhas.join('\n');
}

function aplicarListaPlaceholderNoContainerIntel_(container, placeholders, textoLista) {
  if (!container || !placeholders || !placeholders.length) return false;
  
  const linhas = String(textoLista || '').split(/\r?\n/).map(function(s) { return String(s || '').trim(); }).filter(Boolean);

  function formatarParagrafoLista_(p) {
    try { p.setSpacingBefore(0); } catch (e) {}
    try { p.setSpacingAfter(4); } catch (e) {}
    try { p.setLineSpacing(1.15); } catch (e) {}
  }

  function inserirAposParagrafo_(paragrafo, textos) {
    if (!paragrafo || !textos || !textos.length) return [];
    const pai = paragrafo.getParent();
    const baseIndex = pai.getChildIndex(paragrafo);
    const criados = [];
    for (var i = 0; i < textos.length; i++) {
      var novo = pai.insertParagraph(baseIndex + 1 + i, textos[i]);
      formatarParagrafoLista_(novo);
      criados.push(novo);
    }
    return criados;
  }

  for (var i = 0; i < placeholders.length; i++) {
    var nome = placeholders[i];
    var padrao = '\\{\\{\\s*' + escapeRegexIntel_(nome) + '\\s*\\}\\}';
    var achou = container.findText(padrao);
    if (!achou) continue;

    var textElement = achou.getElement().asText();
    var inicio = achou.getStartOffset();
    var fim = achou.getEndOffsetInclusive();

    var paragrafo = null;
    var atual = textElement.getParent();
    while (atual) {
      try {
        if (atual.getType && atual.getType() === DocumentApp.ElementType.PARAGRAPH) {
          paragrafo = atual.asParagraph();
          break;
        }
      } catch (e) {}
      try { atual = atual.getParent(); } catch (e) { atual = null; }
    }

    if (!paragrafo) {
      textElement.deleteText(inicio, fim);
      if (linhas.length) { textElement.insertText(inicio, linhas.join('\n')); }
      return true;
    }

    var textoCompleto = paragrafo.getText();
    var antes = textoCompleto.substring(0, inicio);
    var depois = textoCompleto.substring(fim + 1);

    var antesLimpo = antes.replace(/\u00A0/g, ' ');
    var depoisLimpo = depois.replace(/\u00A0/g, ' ');

    var soPlaceholder = antesLimpo.trim() === '' && depoisLimpo.trim() === '';

    if (soPlaceholder) {
      if (linhas.length) {
        paragrafo.setText(linhas[0]);
        formatarParagrafoLista_(paragrafo);
        if (linhas.length > 1) { inserirAposParagrafo_(paragrafo, linhas.slice(1)); }
      } else {
        paragrafo.setText('');
      }
      return true;
    }

    paragrafo.setText(antes.replace(/\s+$/, ''));
    try { paragrafo.setSpacingAfter(6); } catch (e) {}

    var inseridos = [];
    if (linhas.length) { inseridos = inserirAposParagrafo_(paragrafo, linhas); }

    if (depois.replace(/\s+/g, '').trim()) {
      var referencia = inseridos.length ? inseridos[inseridos.length - 1] : paragrafo;
      var pai = referencia.getParent();
      var idx = pai.getChildIndex(referencia);
      var pDepois = pai.insertParagraph(idx + 1, depois.replace(/^\s+/, ''));
      try { pDepois.setSpacingBefore(0); } catch (e) {}
      try { pDepois.setSpacingAfter(6); } catch (e) {}
      try { pDepois.setLineSpacing(1.15); } catch (e) {}
    }
    return true;
  }
  return false;
}

function aplicarListaDadosIntel_(doc, categoria, dadosEspecificos) {
  var placeholders = [];
  
  if (categoria === 'IFOOD') placeholders = ['LISTA_IFOOD', 'TABELA_DADOS', 'LISTA_DADOS'];
  if (categoria === 'PROVEDOR') placeholders = ['LISTA_INTERNET', 'TABELA_INTERNET', 'TABELA_DADOS', 'LISTA_DADOS'];
  if (categoria === 'TELEFONIA') placeholders = ['LISTA_TELEFONIA', 'TABELA_TELEFONIA', 'TABELA_DADOS', 'LISTA_DADOS'];

  if (!placeholders.length) return false;

  var textoLista = montarListaNumeradaIntel_(categoria, dadosEspecificos);
  if (!textoLista) return false;

  var aplicou = false;
  try { aplicou = aplicarListaPlaceholderNoContainerIntel_(doc.getBody(), placeholders, textoLista) || aplicou; } catch (e) {}
  try { aplicou = aplicarListaPlaceholderNoContainerIntel_(doc.getHeader(), placeholders, textoLista) || aplicou; } catch (e) {}
  try { aplicou = aplicarListaPlaceholderNoContainerIntel_(doc.getFooter(), placeholders, textoLista) || aplicou; } catch (e) {}
  
  return aplicou;
}

function aplicarTagsDocumentoIntel_(doc, tags, categoria, tabelaDados, dadosEspecificos) {
  // Os modelos atuais já possuem o texto-base definitivo de cada tipo de ofício.
  // Aqui fazemos apenas a substituição das tags existentes no modelo.
  // Não inserimos mais CORPO_DINAMICO e não reconstruímos LISTA_* por parágrafos,
  // evitando manipulações estruturais desnecessárias no Google Docs.
  substituirTagsContainerIntel_(doc.getBody(), tags);
  try { substituirTagsContainerIntel_(doc.getHeader(), tags); } catch (e) {}
  try { substituirTagsContainerIntel_(doc.getFooter(), tags); } catch (e) {}
}

function classificarTipoDocumentoIntel_(texto) {
  const n = normalizarIntelTexto_(texto);
  if (n.includes('MANDADO')) return 'MANDADO';
  if (n.includes('IFOOD')) return 'IFOOD';
  if (n.includes('IMAGEM') || n.includes('IMAGENS') || n.includes('VIDEO') || n.includes('VIDEOS') || n.includes('CFTV') || n.includes('CAMERA') || n.includes('CAMERAS') || n.includes('NUVID')) return 'IMAGENS';
  if (n.includes('LOCADORA') && (n.includes('ENDERECO') || n.includes('RAIO'))) return 'LOCADORA_ENDERECO';
  if (n.includes('LOCADORA')) return n.includes('ENDERECO') ? 'LOCADORA_ENDERECO' : 'LOCADORA_PLACA';
  if (n.includes('PROVEDOR')) return 'PROVEDOR';
  if (n.includes('TELEFON')) return 'TELEFONIA';
  return 'OUTRO';
}

function obterTiposDocumentoIntel_() {
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const aba = ss.getSheetByName('DB_TEXTOS_DOCS');
  if (!aba) throw new Error("Aba 'DB_TEXTOS_DOCS' não encontrada.");

  const dados = aba.getDataRange().getValues();
  if (!dados.length) return [];

  const headers = dados[0];
  const lista = [];

  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    const identificador = String(obterValorCampoPorAlias_(row, headers, ['IDENTIFICADOR', 'ID', 'CHAVE']) || '').trim();
    const nome = String(obterValorCampoPorAlias_(row, headers, ['NOMES', 'NOME', 'TIPO DE DOCUMENTO', 'TIPO_DOCUMENTO']) || '').trim();
    const assunto = String(obterValorCampoPorAlias_(row, headers, ['ASSUNTO']) || '').trim();
    const textoBase = String(obterValorCampoPorAlias_(row, headers, ['TEXTO_BASE', 'TEXTO BASE']) || '').trim();
    const modeloDocId = String(obterValorCampoPorAlias_(row, headers, [
      'MODELO_DOC_ID',
      'MODELO DOC ID',
      'ID_MODELO_DOC',
      'ID MODELO DOC'
    ]) || '').trim();

    if (!identificador && !nome) continue;

    lista.push({
      id: identificador || nome,
      nome: nome || identificador,
      assunto: assunto,
      textoBase: textoBase,
      modeloDocId: modeloDocId,
      categoria: classificarTipoDocumentoIntel_(`${nome || ''} ${identificador || ''}`)
    });
  }
  return lista;
}

function obterItensConfigIntel_(categoria) {
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const aba = ss.getSheetByName('DB_CONFIG');
  if (!aba) return [];

  const dados = aba.getDataRange().getValues();
  if (!dados.length) return [];

  const headers = dados[0];
  const idxCategoria = obterIndiceColunaPorAlias_(headers, ['CATEGORIA']);
  const idxNome = obterIndiceColunaPorAlias_(headers, ['NOME']);
  const idxValorExtra = obterIndiceColunaPorAlias_(headers, ['VALOR_EXTRA', 'VALOR EXTRA']);
  const idxModalidade = obterIndiceColunaPorAlias_(headers, ['MODALIDADE']);

  if (idxCategoria === -1 || idxNome === -1) return [];

  const alvo = normalizarIntelTexto_(categoria);
  const itens = [];

  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    if (normalizarIntelTexto_(row[idxCategoria]) !== alvo) continue;

    const nomeOriginal = String(row[idxNome] || '').trim();
    const valorExtra = idxValorExtra > -1 ? String(row[idxValorExtra] || '').trim() : '';
    const modalidade = idxModalidade > -1 ? String(row[idxModalidade] || '').trim() : '';

    const nomeFinal = alvo === 'EQUIPE' ? valorExtra : nomeOriginal;
    if (!nomeFinal) continue;

    itens.push({
      nome: nomeFinal,
      valorExtra: valorExtra,
      modalidade: modalidade
    });
  }

  return itens;
}
function obterEmpresasIntel_(setor) {
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const aba = ss.getSheetByName('DB_EMPRESAS');
  if (!aba) return [];

  const dados = aba.getDataRange().getValues();
  if (!dados.length) return [];

  const headers = dados[0];
  const idxSetor = obterIndiceColunaPorAlias_(headers, ['SETOR']);
  const idxNomeEmpresa = obterIndiceColunaPorAlias_(headers, ['NOME_EMPRESA', 'NOME EMPRESA']);
  const idxTelefonia = obterIndiceColunaPorAlias_(headers, ['TELEFONIA']);
  const idxDest = obterIndiceColunaPorAlias_(headers, ['DESTINATARIO_PADRAO', 'DESTINATARIO PADRAO']);

  const setorNorm = normalizarIntelTexto_(setor);
  const mapa = {};

  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    const setorLinha = idxSetor > -1 ? normalizarIntelTexto_(row[idxSetor]) : '';
    let nome = '';

    if (setorNorm === 'TELEFONIA') {
      nome = idxTelefonia > -1 ? String(row[idxTelefonia] || '').trim() : '';
      if (!nome && setorLinha === 'TELEFONIA' && idxNomeEmpresa > -1) nome = String(row[idxNomeEmpresa] || '').trim();
    } else {
      if (setorLinha !== setorNorm) continue;
      nome = idxNomeEmpresa > -1 ? String(row[idxNomeEmpresa] || '').trim() : '';
    }

    if (!nome) continue;
    mapa[nome] = { nome: nome, valorExtra: idxDest > -1 ? String(row[idxDest] || '').trim() : '' };
  }
  return Object.keys(mapa).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(chave => mapa[chave]);
}

function obterAbaNumeradorIntel_(ss) {
  const aba = ss.getSheetByName('INTEL_NUMERADOR');
  if (!aba) throw new Error("Aba 'INTEL_NUMERADOR' não encontrada.");
  return aba;
}

function garantirLinhaNumeradorIntel_(tipoDoc) {
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const aba = obterAbaNumeradorIntel_(ss);
  const dados = aba.getDataRange().getValues();
  const anoAtual = new Date().getFullYear();

  if (!dados.length) { aba.appendRow(['TIPO_DOC', 'ANO', 'ULTIMO_NUMERO']); }

  const dadosAtualizados = aba.getDataRange().getValues();
  const headers = dadosAtualizados[0];
  const idxTipo = obterIndiceColunaPorAlias_(headers, ['TIPO_DOC', 'TIPO DOC']);
  const idxAno = obterIndiceColunaPorAlias_(headers, ['ANO']);
  const idxUltimo = obterIndiceColunaPorAlias_(headers, ['ULTIMO_NUMERO', 'ULTIMO NUMERO']);

  if (idxTipo === -1 || idxAno === -1 || idxUltimo === -1) {
    throw new Error("Aba 'INTEL_NUMERADOR' precisa conter as colunas TIPO_DOC, ANO e ULTIMO_NUMERO.");
  }

  const tipoNorm = normalizarIntelTexto_(tipoDoc || 'GERAL');

  for (let i = 1; i < dadosAtualizados.length; i++) {
    const row = dadosAtualizados[i];
    if (normalizarIntelTexto_(row[idxTipo]) === tipoNorm && Number(row[idxAno]) === Number(anoAtual)) {
      return { aba, linha: i + 1, idxUltimo, tipoDoc: String(row[idxTipo] || tipoDoc || 'GERAL').trim(), ano: Number(row[idxAno]) || anoAtual, ultimo: Number(row[idxUltimo]) || 0 };
    }
  }

  const novaLinha = new Array(headers.length).fill('');
  novaLinha[idxTipo] = tipoDoc || 'GERAL';
  novaLinha[idxAno] = anoAtual;
  novaLinha[idxUltimo] = 0;
  aba.appendRow(novaLinha);

  return { aba, linha: aba.getLastRow(), idxUltimo, tipoDoc: tipoDoc || 'GERAL', ano: anoAtual, ultimo: 0 };
}

function listarNumeradorIntel() {
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const aba = obterAbaNumeradorIntel_(ss);
  const dados = aba.getDataRange().getValues();
  if (dados.length <= 1) return [];

  const headers = dados[0];
  const idxTipo = obterIndiceColunaPorAlias_(headers, ['TIPO_DOC', 'TIPO DOC']);
  const idxAno = obterIndiceColunaPorAlias_(headers, ['ANO']);
  const idxUltimo = obterIndiceColunaPorAlias_(headers, ['ULTIMO_NUMERO', 'ULTIMO NUMERO']);

  if (idxTipo === -1 || idxAno === -1 || idxUltimo === -1) return [];

  const lista = [];
  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    const tipoDoc = String(row[idxTipo] || '').trim();
    if (!tipoDoc) continue;
    const ano = Number(row[idxAno]) || new Date().getFullYear();
    const ultimo = Number(row[idxUltimo]) || 0;
    lista.push({ tipoDoc, ano, ultimoNumero: ultimo, proximoNumero: `${ultimo + 1}/${ano}` });
  }
  return lista.sort((a, b) => a.tipoDoc.localeCompare(b.tipoDoc, 'pt-BR'));
}

function resolverTipoNumeradorIntel_(categoria) {
  return categoria === 'MANDADO' ? 'MANDADO DE INTIMACAO' : 'OFICIO';
}

function obterProximoNumerador(tipoDoc) {
  if (!tipoDoc) return 'Selecione o tipo de documento';
  const info = garantirLinhaNumeradorIntel_(tipoDoc);
  return `${Number(info.ultimo) + 1}/${info.ano}`;
}

function incrementarNumeradorIntel(tipoDoc) {
  if (!tipoDoc) throw new Error('Informe o tipo de documento para incrementar o numerador.');
  const info = garantirLinhaNumeradorIntel_(tipoDoc);
  const novoNumero = Number(info.ultimo) + 1;
  info.aba.getRange(info.linha, info.idxUltimo + 1).setValue(novoNumero);
  return { sucesso: true, tipoDoc: info.tipoDoc, numeroAtual: `${novoNumero}/${info.ano}`, numeradores: listarNumeradorIntel() };
}

function consumirNumeradorIntel_(tipoDoc) {
  const info = garantirLinhaNumeradorIntel_(tipoDoc);
  const novoNumero = Number(info.ultimo) + 1;
  info.aba.getRange(info.linha, info.idxUltimo + 1).setValue(novoNumero);
  return `${novoNumero}/${info.ano}`;
}

function carregarDadosModuloOficios() {
  return {
    tiposDocumento: obterTiposDocumentoIntel_(),
    equipes: obterItensConfigIntel_('EQUIPE'),
    tiposProcedimento: obterItensConfigIntel_('TIPO DE OCORRÊNCIA'),
    identificadores: obterItensConfigIntel_('IDENTIFICADOR'),
    delegacias: obterItensConfigIntel_('DELEGACIA'),
    empresas: {
      delivery: obterEmpresasIntel_('DELIVERY'),
      locadora: obterEmpresasIntel_('LOCADORA'),
      provedor: obterEmpresasIntel_('PROVEDOR'),
      telefonia: obterEmpresasIntel_('TELEFONIA')
    },
    numeradores: listarNumeradorIntel()
  };
}

function aplicarTagsTextoIntel_(texto, tags) {
  let saida = String(texto || '');
  Object.keys(tags || {}).forEach(function(chave) {
    const valor = tags[chave] == null ? '' : String(tags[chave]);
    const regex = new RegExp('\\{\\{\\s*' + escapeRegexIntel_(chave) + '\\s*\\}\\}', 'gi');
    saida = saida.replace(regex, valor);
  });
  return saida;
}

function limparCorpoDinamicoIntel_(texto) {
  let saida = String(texto || '').trim();
  saida = saida.replace(/^\s*Senhor\(a\)\s+RESPONS[ÁA]VEL,?\s*/i, '').trim();
  saida = saida.replace(/^\s*Ao\s+Senhor\(a\)\s+[^\n\r]+\s*/i, '').trim();
  return saida;
}

function montarTagMapIntel_(payload, numeroOficio, tipoSelecionado, assuntoBase, textoBase) {
  const dados = payload.dadosEspecificos || {};
  const categoria = classificarTipoDocumentoIntel_(`${tipoSelecionado.nome || ''} ${tipoSelecionado.id || ''}`);
  const proprietarioPreferencial = dados.proprietario || dados.nomeEmpresa || dados.empresa || '';
  const destinatario = obterDestinatarioIntel_(payload, tipoSelecionado);
  const corpoDinamico = limparCorpoDinamicoIntel_(textoBase || '');

  const dataInicialFmt = formatarDataIntel_(dados.dataInicial);
  const horaInicialFmt = formatarHoraIntel_(dados.horaInicial);
  const dataFinalFmt = formatarDataIntel_(dados.dataFinal);
  const horaFinalFmt = formatarHoraIntel_(dados.horaFinal);
  const telemetriaInicialFmt = formatarDataIntel_(dados.telemetriaInicial);
  const telemetriaFinalFmt = formatarDataIntel_(dados.telemetriaFinal);

  const periodoDados = (dataInicialFmt && dataFinalFmt)
    ? `${dataInicialFmt} a ${dataFinalFmt}`
    : (dataInicialFmt || dataFinalFmt || '');

  const periodoTelemetria = (telemetriaInicialFmt && telemetriaFinalFmt)
    ? `${telemetriaInicialFmt} a ${telemetriaFinalFmt}`
    : (telemetriaInicialFmt || telemetriaFinalFmt || '');

  const horarioAlvo = (dataInicialFmt && horaInicialFmt && dataFinalFmt && horaFinalFmt)
    ? `${dataInicialFmt} às ${horaInicialFmt} e ${dataFinalFmt} às ${horaFinalFmt}`
    : `${dataInicialFmt} ${horaInicialFmt} a ${dataFinalFmt} ${horaFinalFmt}`.trim();

  const anoDoc = numeroOficio.includes('/') ? numeroOficio.split('/')[1] : String(new Date().getFullYear());
  const numDocApenas = numeroOficio.split('/')[0];
  const agendamentoDataHora = (dataInicialFmt && horaInicialFmt)
    ? `${dataInicialFmt} às ${horaInicialFmt}`
    : (dataInicialFmt || '');

  const listaCategoria = (categoria === 'PROVEDOR' || categoria === 'TELEFONIA' || categoria === 'IFOOD')
    ? montarListaNumeradaIntel_(categoria, dados)
    : '';

  return {
    NUM_OFICIO: numeroOficio,
    NUMERO_OFICIO: numeroOficio,
    NUM_DOC: numDocApenas,
    ANO: anoDoc,

    TIPO_DOCUMENTO: tipoSelecionado.nome || tipoSelecionado.id || payload.tipoDocumento,
    EQUIPE: payload.equipe || '',
    EQUIPE_NOME: payload.equipe || '',

    PROCEDIMENTO: payload.tipoProcedimento || '',
    PROC_NUMERO: payload.numeroProcedimento || '',
    TIPO_PROCEDIMENTO: payload.tipoProcedimento || '',
    NUMERO_PROCEDIMENTO: payload.numeroProcedimento || '',
    PROC_TIPO: payload.tipoProcedimento || '',

    ASSUNTO: assuntoBase || '',
    TEXTO_BASE: textoBase || '',
    CORPO_DINAMICO: corpoDinamico,

    DESTINATARIO: destinatario,
    DESTINATARIO_PADRAO: destinatario,
    'DESTINATARIO PADRAO': destinatario,

    DATA_EXTENSO: dataExtensoIntel_(new Date()),
    DATA_ATUAL_EXTENSO: dataExtensoIntel_(new Date()),
    'DATA EXTENSO': dataExtensoIntel_(new Date()),

    ALVO: dados.alvo || '',

    ENDERECO: dados.endereco || '',
    ENDEREÇO: dados.endereco || '',
    LOCAL_ALVO: dados.endereco || '',
    'LOCAL ALVO': dados.endereco || '',

    DATA_INICIAL: dataInicialFmt,
    'DATA INICIAL': dataInicialFmt,
    HORA_INICIAL: horaInicialFmt,
    'HORA INICIAL': horaInicialFmt,
    DATA_FINAL: dataFinalFmt,
    'DATA FINAL': dataFinalFmt,
    HORA_FINAL: horaFinalFmt,
    'HORA FINAL': horaFinalFmt,

    CPF: dados.cpf || '',
    TERMINAL: dados.terminal || '',
    IMEI: dados.imei || '',
    EMAIL: dados.email || '',
    'E-MAIL': dados.email || '',

    IPV4: dados.ipv4 || '',
    IPV6: dados.ipv6 || '',
    PORTA_LOGICA: dados.portaLogica || '',
    'PORTA LÓGICA': dados.portaLogica || '',
    'PORTA LOGICA': dados.portaLogica || '',

    VEICULO_PLACA: dados.placaVeiculo || '',
    'PLACA DO VEÍCULO': dados.placaVeiculo || '',
    'PLACA DO VEICULO': dados.placaVeiculo || '',

    MODELO_VEICULO: dados.modeloVeiculo || '',
    VEICULO_MODELO: dados.modeloVeiculo || '',
    'MODELO DO VEÍCULO': dados.modeloVeiculo || '',
    'MODELO DO VEICULO': dados.modeloVeiculo || '',

    PROPRIETARIO_NOME: proprietarioPreferencial,
    PROPRIETÁRIO: proprietarioPreferencial,
    PROPRIETARIO: proprietarioPreferencial,

    NOME_EMPRESA: dados.empresa || '',
    'NOME DA EMPRESA': dados.empresa || '',
    EMPRESA_NOME: dados.empresa || '',

    TELEMETRIA_INICIAL: telemetriaInicialFmt,
    'TELEMETRIA INICIAL': telemetriaInicialFmt,
    TELEMETRIA_FINAL: telemetriaFinalFmt,
    'TELEMETRIA FINAL': telemetriaFinalFmt,

    PERIODO_DADOS: periodoDados,
    PERIODO: periodoDados,
    PERIODO_FORMATADO: periodoDados,
    PERIODO_TELEMETRIA: periodoTelemetria,
    HORARIO_ALVO: horarioAlvo,

    RAIO: dados.raio || '',
    RAIO_METROS: dados.raio ? `${dados.raio}m` : '',

    INTIMADO_NOME: dados.intimadoNome || dados.alvo || '',
    INTIMADO_ENDERECO: dados.intimadoEndereco || dados.endereco || '',
    INTIMADO_ENDEREÇO: dados.intimadoEndereco || dados.endereco || '',
    INTIMADO_FONE: dados.intimadoFone || dados.terminal || '',
    INTIMADO_EMAIL: dados.intimadoEmail || dados.email || '',

    AGENDAMENTO_DATA_HORA: agendamentoDataHora,
    'AGENDAMENTO DATA HORA': agendamentoDataHora,

    DELEGACIA: dados.delegacia || '',
    LOCAL_INTIMACAO: dados.delegacia || '',
    'LOCAL INTIMACAO': dados.delegacia || '',
    'LOCAL INTIMAÇÃO': dados.delegacia || '',

    ENDERECO_DELEGACIA: dados.enderecoDelegacia || '',
    'ENDEREÇO DA DELEGACIA': dados.enderecoDelegacia || '',
    'ENDERECO DA DELEGACIA': dados.enderecoDelegacia || '',
    LOCAL_ENDERECO: dados.enderecoDelegacia || '',
    'LOCAL ENDERECO': dados.enderecoDelegacia || '',
    'LOCAL ENDEREÇO': dados.enderecoDelegacia || '',

    LISTA_IFOOD: categoria === 'IFOOD' ? listaCategoria : '',
    LISTA_INTERNET: categoria === 'PROVEDOR' ? listaCategoria : '',
    TABELA_INTERNET: categoria === 'PROVEDOR' ? listaCategoria : '',
    LISTA_TELEFONIA: categoria === 'TELEFONIA' ? listaCategoria : '',
    TABELA_TELEFONIA: categoria === 'TELEFONIA' ? listaCategoria : '',
    LISTA_DADOS: (categoria === 'PROVEDOR' || categoria === 'TELEFONIA') ? listaCategoria : '',
    TABELA_DADOS: (categoria === 'PROVEDOR' || categoria === 'TELEFONIA') ? listaCategoria : ''
  };
}

function obterMapaCamposIntelOficios_() {
  return {
    id: ['ID'],
    criadoPor: ['CRIADO_POR', 'CRIADO POR'],
    dataGeracao: ['DATA_GERACAO', 'DATA GERACAO'],
    numOficio: ['NUM_OFICIO', 'NUM OFICIO'],
    tipoDocumento: ['TIPO DE DOCUMENTO'],
    equipe: ['EQUIPE'],
    tipoProcedimento: ['TIPO DE PROCEDIMENTO'],
    numeroProcedimento: ['NUMERO DO PROCEDIMENTO', 'NÚMERO DO PROCEDIMENTO'],
    alvo: ['ALVO'],
    endereco: ['ENDERECO', 'ENDEREÇO'],
    dataInicial: ['DATA INICIAL'],
    horaInicial: ['HORA INICIAL'],
    dataFinal: ['DATA FINAL'],
    horaFinal: ['HORA FINAL'],
    cpf: ['CPF'],
    terminal: ['TERMINAL'],
    imei: ['IMEI'],
    email: ['E-MAIL', 'EMAIL'],
    ipv4: ['IPV4'],
    portaLogica: ['PORTA LOGICA', 'PORTA LÓGICA'],
    ipv6: ['IPV6'],
    modeloVeiculo: ['MODELO DO VEICULO', 'MODELO DO VEÍCULO'],
    placaVeiculo: ['PLACA DO VEICULO', 'PLACA DO VEÍCULO'],
    nomeEmpresa: ['NOME DA EMPRESA', 'EMPRESA'],
    telemetriaInicial: ['TELEMETRIA INICIAL'],
    telemetriaFinal: ['TELEMETRIA FINAL'],
    delegacia: ['DELEGACIA'],
    enderecoDelegacia: ['ENDERECO DA DELEGACIA', 'ENDEREÇO DA DELEGACIA'],
    proprietario: ['PROPRIETÁRIO', 'PROPRIETARIO'],
    linkPdf: ['LINK_PDF', 'LINK PDF'],
    linkDoc: ['LINK_DOC', 'LINK DOC'],
    statusGeracao: ['STATUS_GERACAO', 'STATUS GERACAO'],
    erroGeracao: ['ERRO_GERACAO', 'ERRO GERACAO'],
    modeloDocId: ['MODELO_DOC_ID', 'MODELO DOC ID']
  };
}

function garantirColunasControleIntelOficios_(aba) {
  if (!aba) return [];

  var obrigatorias = [
    'LINK_DOC',
    'STATUS_GERACAO',
    'ERRO_GERACAO',
    'MODELO_DOC_ID'
  ];

  var ultimaColuna = Math.max(1, aba.getLastColumn());
  var headers = aba.getRange(1, 1, 1, ultimaColuna).getValues()[0];

  obrigatorias.forEach(function(nome) {
    if (obterIndiceColunaPorAlias_(headers, [nome, nome.replace(/_/g, ' ')]) === -1) {
      aba.getRange(1, headers.length + 1).setValue(nome);
      headers.push(nome);
    }
  });

  return headers;
}

function escreverRegistroIntelOficios_(registro) {
  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  let aba = ss.getSheetByName('INTEL_OFICIOS');

  if (!aba) {
    aba = ss.insertSheet('INTEL_OFICIOS');
    aba.appendRow([
      'ID', 'CRIADO_POR', 'DATA_GERACAO', 'NUM_OFICIO', 'TIPO DE DOCUMENTO',
      'EQUIPE', 'TIPO DE PROCEDIMENTO', 'NUMERO DO PROCEDIMENTO', 'ALVO',
      'ENDEREÇO', 'DATA INICIAL', 'HORA INICIAL', 'DATA FINAL', 'HORA FINAL',
      'CPF', 'TERMINAL', 'IMEI', 'E-MAIL', 'IPV4', 'PORTA LÓGICA', 'IPV6',
      'MODELO DO VEÍCULO', 'PLACA DO VEÍCULO', 'NOME DA EMPRESA',
      'TELEMETRIA INICIAL', 'TELEMETRIA FINAL', 'DELEGACIA',
      'ENDEREÇO DA DELEGACIA', 'PROPRIETÁRIO', 'LINK_PDF',
      'LINK_DOC', 'STATUS_GERACAO', 'ERRO_GERACAO', 'MODELO_DOC_ID'
    ]);
  }

  const headers = garantirColunasControleIntelOficios_(aba);
  const novaLinha = new Array(headers.length).fill('');
  const mapa = obterMapaCamposIntelOficios_();

  Object.keys(mapa).forEach(function(campo) {
    const idx = obterIndiceColunaPorAlias_(headers, mapa[campo]);
    if (idx === -1) return;

    let valor = registro[campo];
    if (valor === null || valor === undefined) valor = '';
    if (campo === 'nomeEmpresa' && !valor) valor = registro.empresa || registro.proprietario || '';
    if (campo === 'proprietario' && !valor) valor = registro.nomeEmpresa || registro.empresa || '';

    novaLinha[idx] = valor;
  });

  aba.appendRow(novaLinha);
  return { linha: aba.getLastRow(), id: registro.id || '' };
}

function atualizarRegistroIntelOficiosPorId_(idRegistro, alteracoes) {
  idRegistro = String(idRegistro || '').trim();
  if (!idRegistro) return false;

  const ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  const aba = ss.getSheetByName('INTEL_OFICIOS');
  if (!aba || aba.getLastRow() < 2) return false;

  const headers = garantirColunasControleIntelOficios_(aba);
  const idxId = obterIndiceColunaPorAlias_(headers, ['ID']);
  if (idxId === -1) return false;

  const valoresId = aba.getRange(2, idxId + 1, aba.getLastRow() - 1, 1).getValues();
  var linhaAlvo = 0;

  for (var i = 0; i < valoresId.length; i++) {
    if (String(valoresId[i][0] || '').trim() === idRegistro) {
      linhaAlvo = i + 2;
      break;
    }
  }

  if (!linhaAlvo) return false;

  const mapa = obterMapaCamposIntelOficios_();
  alteracoes = alteracoes || {};

  Object.keys(alteracoes).forEach(function(campo) {
    if (!Object.prototype.hasOwnProperty.call(mapa, campo)) return;
    const idx = obterIndiceColunaPorAlias_(headers, mapa[campo]);
    if (idx === -1) return;
    var valor = alteracoes[campo];
    if (valor === null || valor === undefined) valor = '';
    aba.getRange(linhaAlvo, idx + 1).setValue(valor);
  });

  return true;
}

function perfilPortalOficios_(usuario) {
  return normalizarDesenvDemandas_(usuario && usuario.perfil);
}

function usuarioPodeGerarCategoriaOficio_(usuario, categoria) {
  var perfil = perfilPortalOficios_(usuario);

  if (perfil !== 'NUCLEO OPERACIONAL') return true;

  return ['IMAGENS', 'LOCADORA_ENDERECO', 'LOCADORA_PLACA', 'MANDADO'].indexOf(String(categoria || '').trim()) > -1;
}

function abrirDocumentoIntelComTentativas_(arquivoDoc) {
  const id = arquivoDoc.getId();
  const tipo = arquivoDoc.getMimeType();

  if (tipo !== MimeType.GOOGLE_DOCS) {
    throw new Error(
      'O modelo selecionado não é um Documento Google nativo. Tipo encontrado: ' + tipo
    );
  }

  const esperas = [500, 1000, 2000, 4000, 8000];
  let ultimoErro = null;

  for (let tentativa = 0; tentativa < esperas.length; tentativa++) {
    try {
      const doc = DocumentApp.openById(id);
      // Confirma que o serviço Documents já consegue acessar o corpo do arquivo.
      doc.getBody().getText();
      return doc;
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa < esperas.length - 1) Utilities.sleep(esperas[tentativa]);
    }
  }

  throw new Error(
    'A cópia do modelo foi criada, mas o Google Docs não conseguiu abrir o documento. ' +
    'ID: ' + id + '. Erro original: ' + String(ultimoErro)
  );
}

function processarGeracaoOficio(payload) {
  var registroId = '';
  var numeroOficio = '';
  var urlDocGerado = '';

  try {
    payload = payload || {};

    const tipos = obterTiposDocumentoIntel_();
    const tipoSelecionado = tipos.find(item => String(item.id) === String(payload.tipoDocumentoId || ''));
    if (!tipoSelecionado) throw new Error('Tipo de documento não encontrado na aba DB_TEXTOS_DOCS.');

    if (!payload.equipe || !payload.tipoProcedimento || !payload.numeroProcedimento) {
      throw new Error('Equipe, Tipo de Procedimento e Número do Procedimento são obrigatórios.');
    }

    const categoria = classificarTipoDocumentoIntel_(`${tipoSelecionado.nome || ''} ${tipoSelecionado.id || ''}`);
    const dadosEspecificos = payload.dadosEspecificos || {};
    const modeloDocId = String(tipoSelecionado.modeloDocId || '').trim();

    if (!modeloDocId) {
      throw new Error(
        'O tipo de documento "' + (tipoSelecionado.nome || tipoSelecionado.id || '') +
        '" não possui MODELO_DOC_ID definido na aba DB_TEXTOS_DOCS.'
      );
    }

    if (categoria === 'TELEFONIA') {
      const dataInicial = String(dadosEspecificos.dataInicial || '').trim();
      const dataFinal = String(dadosEspecificos.dataFinal || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicial) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFinal)) {
        throw new Error('Data inicial e data final são obrigatórias para gerar ofício de telefonia.');
      }
      if (dataInicial > dataFinal) throw new Error('A data inicial não pode ser posterior à data final.');
    }

    const usuarioSolicitante = obterUsuarioPortalPorLogin_(payload.usuario || '');
    if (!usuarioPodeGerarCategoriaOficio_(usuarioSolicitante, categoria)) {
      throw new Error('Seu perfil só pode gerar Ofício de Imagens, Ofício de Locadora (GPS/Raio e Placa) e Mandado de Intimação.');
    }

    // Reserva o número antes de iniciar a geração.
    numeroOficio = consumirNumeradorIntel_(resolverTipoNumeradorIntel_(categoria));
    registroId = Utilities.getUuid();

    // Registra imediatamente em INTEL_OFICIOS. Se ocorrer qualquer falha posterior,
    // o número continuará visível no controle com STATUS_GERACAO = FALHA.
    escreverRegistroIntelOficios_({
      id: registroId,
      criadoPor: payload.usuario || '',
      dataGeracao: hojeIntelBR_(),
      numOficio: numeroOficio,
      tipoDocumento: tipoSelecionado.nome || tipoSelecionado.id,
      equipe: payload.equipe || '',
      tipoProcedimento: payload.tipoProcedimento || '',
      numeroProcedimento: payload.numeroProcedimento || '',
      alvo: dadosEspecificos.alvo || '',
      endereco: dadosEspecificos.endereco || '',
      dataInicial: dadosEspecificos.dataInicial || '',
      horaInicial: dadosEspecificos.horaInicial || '',
      dataFinal: dadosEspecificos.dataFinal || '',
      horaFinal: dadosEspecificos.horaFinal || '',
      cpf: dadosEspecificos.cpf || '',
      terminal: dadosEspecificos.terminal || '',
      imei: dadosEspecificos.imei || '',
      email: dadosEspecificos.email || '',
      ipv4: dadosEspecificos.ipv4 || '',
      portaLogica: dadosEspecificos.portaLogica || '',
      ipv6: dadosEspecificos.ipv6 || '',
      modeloVeiculo: dadosEspecificos.modeloVeiculo || '',
      placaVeiculo: dadosEspecificos.placaVeiculo || '',
      nomeEmpresa: dadosEspecificos.empresa || '',
      proprietario: dadosEspecificos.proprietario || dadosEspecificos.nomeEmpresa || dadosEspecificos.empresa || '',
      telemetriaInicial: dadosEspecificos.telemetriaInicial || '',
      telemetriaFinal: dadosEspecificos.telemetriaFinal || '',
      delegacia: dadosEspecificos.delegacia || '',
      enderecoDelegacia: dadosEspecificos.enderecoDelegacia || '',
      linkPdf: '',
      linkDoc: '',
      statusGeracao: 'EM GERAÇÃO',
      erroGeracao: '',
      modeloDocId: modeloDocId
    });

    // O assunto continua vindo da DB_TEXTOS_DOCS, porém o corpo textual já está
    // no modelo específico. Não usamos mais TEXTO_BASE/CORPO_DINAMICO na geração.
    const tagsBase = montarTagMapIntel_(
      payload,
      numeroOficio,
      tipoSelecionado,
      tipoSelecionado.assunto || '',
      ''
    );

    const assuntoProcessado = aplicarTagsTextoIntel_(tipoSelecionado.assunto || '', tagsBase);
    const tagsFinais = montarTagMapIntel_(
      payload,
      numeroOficio,
      tipoSelecionado,
      assuntoProcessado,
      ''
    );

    const nomeBase = `${categoria}_${numeroOficio.replace('/', '-')}`;
    const pastaDestino = DriveApp.getFolderById(CONFIG.PASTA_DRIVE_ID);

    const arquivoModelo = DriveApp.getFileById(modeloDocId);
    if (arquivoModelo.getMimeType() !== MimeType.GOOGLE_DOCS) {
      throw new Error(
        'O MODELO_DOC_ID informado para "' + (tipoSelecionado.nome || tipoSelecionado.id || '') +
        '" não corresponde a um Documento Google nativo.'
      );
    }

    const arquivoDoc = arquivoModelo.makeCopy(nomeBase, pastaDestino);
    urlDocGerado = arquivoDoc.getUrl();

    atualizarRegistroIntelOficiosPorId_(registroId, {
      linkDoc: urlDocGerado
    });

    const doc = abrirDocumentoIntelComTentativas_(arquivoDoc);
    aplicarTagsDocumentoIntel_(doc, tagsFinais, categoria, dadosEspecificos.tabelaDados || [], dadosEspecificos);
    doc.saveAndClose();

    // Reabre o arquivo pelo Drive após o fechamento do DocumentApp para a conversão.
    const arquivoDocFinal = DriveApp.getFileById(arquivoDoc.getId());
    const arquivoPdf = pastaDestino.createFile(
      arquivoDocFinal.getAs(MimeType.PDF).setName(`${nomeBase}.pdf`)
    );

    const urlPdf = arquivoPdf.getUrl();

    atualizarRegistroIntelOficiosPorId_(registroId, {
      linkDoc: urlDocGerado,
      linkPdf: urlPdf,
      statusGeracao: 'GERADO',
      erroGeracao: ''
    });

    return {
      sucesso: true,
      numero: numeroOficio,
      urlDoc: urlDocGerado,
      urlPdf: urlPdf,
      nomeDocumento: nomeBase,
      numeradores: listarNumeradorIntel()
    };

  } catch (erro) {
    var mensagemErro = erro && erro.message ? erro.message : String(erro);

    if (registroId) {
      try {
        atualizarRegistroIntelOficiosPorId_(registroId, {
          linkDoc: urlDocGerado,
          statusGeracao: 'FALHA',
          erroGeracao: mensagemErro
        });
      } catch (erroControle) {
        // Não mascara o erro principal caso também haja falha ao atualizar o controle.
      }
    }

    return {
      sucesso: false,
      erro: 'Erro na geração do ofício: ' + mensagemErro,
      numero: numeroOficio || ''
    };
  }
}

// =========================================================================
// MÓDULO 4 - DESENVOLVIMENTO DE DEMANDAS ATIVAS (BACKEND)
// =========================================================================

var DESENV_DEMANDAS_CFG = {
  SHEET_DEMANDAS: 'INVEST_EVOLUCOES',
  SHEET_EVOLUCOES: 'ADD_EVOLUCOES',
  SHEET_DB_CONFIG: 'DB_CONFIG',
  PROP_GEMINI_KEY: 'PORTAL_DEPATRI_GEMINI_KEY',
  PROP_GEMINI_ACTIVE: 'PORTAL_DEPATRI_GEMINI_ACTIVE'
};

function normalizarDesenvDemandas_(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function abrirPlanilhaMaeDesenv_() {
  return SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
}

function garantirAbaDesenvDemandas_(nomeAba, headersEsperados) {
  var ss = abrirPlanilhaMaeDesenv_();
  var aba = ss.getSheetByName(nomeAba);
  if (!aba) {
    aba = ss.insertSheet(nomeAba);
    aba.appendRow(headersEsperados);
    aba.setFrozenRows(1);
  } else if (aba.getLastRow() === 0) {
    aba.appendRow(headersEsperados);
    aba.setFrozenRows(1);
  }
  return aba;
}

function obterUsuarioPortalPorLogin_(login) {
  if (!login) throw new Error('Login do usuário não informado.');
  var ss = abrirPlanilhaMaeDesenv_();
  var aba = ss.getSheetByName('USUARIOS');
  if (!aba) throw new Error("Aba 'USUARIOS' não encontrada.");
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0] || '').toLowerCase() === String(login).toLowerCase()) {
      return {
        login: dados[i][0],
        nome: dados[i][1],
        email: dados[i][2],
        cargo: padronizarCargo(dados[i][3]),
        perfil: dados[i][4],
        delegacia: dados[i][5],
        lotacao: dados[i][5],
        idAssinatura: dados[i][6],
        matricula: dados[i][7],
        equipe: dados[i][10] || ''
      };
    }
  }
  throw new Error('Usuário não encontrado para validação de acesso.');
}


function listarUsuariosPortal(usuarioLogin) {
  var admin = obterUsuarioPortalPorLogin_(usuarioLogin);
  var perfil = normalizarDesenvDemandas_(admin && admin.perfil);
  if (!(perfil === 'ADMIN' || perfil === 'CRIADOR/ADMIN' || perfil === 'CRIADOR ADMIN')) {
    throw new Error('Apenas administradores podem gerenciar usuários.');
  }

  var ss = abrirPlanilhaMaeDesenv_();
  var aba = ss.getSheetByName('USUARIOS');
  if (!aba) throw new Error("Aba 'USUARIOS' não encontrada.");

  var dados = aba.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < dados.length; i++) {
    if (!String(dados[i][0] || '').trim()) continue;
    lista.push({
      rowIndex: i + 1,
      login: String(dados[i][0] || '').trim(),
      nome: String(dados[i][1] || '').trim(),
      email: String(dados[i][2] || '').trim(),
      cargo: String(dados[i][3] || '').trim(),
      perfil: String(dados[i][4] || '').trim(),
      delegacia: String(dados[i][5] || '').trim(),
      lotacao: String(dados[i][5] || '').trim(),
      equipe: String(dados[i][10] || '').trim(),
      idAssinatura: String(dados[i][6] || '').trim(),
      matricula: String(dados[i][7] || '').trim(),
      forcarTroca: dados[i][9] === true
    });
  }

  return lista.sort(function(a, b) {
    var perfilA = normalizarDesenvDemandas_(a.perfil);
    var perfilB = normalizarDesenvDemandas_(b.perfil);
    if (perfilA === 'PENDENTE' && perfilB !== 'PENDENTE') return -1;
    if (perfilA !== 'PENDENTE' && perfilB === 'PENDENTE') return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

function aprovarUsuarioPortal(usuarioLogin, loginAlvo, perfilNovo, lotacaoNova, equipeNova) {
  var admin = obterUsuarioPortalPorLogin_(usuarioLogin);
  var perfilAdmin = normalizarDesenvDemandas_(admin && admin.perfil);

  if (!(perfilAdmin === 'ADMIN' || perfilAdmin === 'CRIADOR/ADMIN' || perfilAdmin === 'CRIADOR ADMIN')) {
    throw new Error('Apenas administradores podem aprovar usuários.');
  }

  if (String(usuarioLogin || '').toLowerCase() === String(loginAlvo || '').toLowerCase()) {
    throw new Error('Você não pode alterar o próprio cadastro por esta tela.');
  }

  var perfisPermitidos = ['ADMIN', 'DIRECAO', 'ADMINISTRATIVO', 'NUIP', 'DELEGACIA', 'NUCLEO OPERACIONAL'];
  var perfilEscolhidoNormalizado = normalizarDesenvDemandas_(perfilNovo);

  if (perfisPermitidos.indexOf(perfilEscolhidoNormalizado) === -1) {
    throw new Error('Perfil informado é inválido para aprovação.');
  }

  var mapaPerfis = {
    'ADMIN': 'ADMIN',
    'DIRECAO': 'DIREÇÃO',
    'ADMINISTRATIVO': 'ADMINISTRATIVO',
    'NUIP': 'NUIP',
    'DELEGACIA': 'DELEGACIA',
    'NUCLEO OPERACIONAL': 'NUCLEO OPERACIONAL'
  };

  var opcoes = obterOpcoesCadastroPortal();
  var lotacaoInformada = String(lotacaoNova || '').trim();
  var equipeInformada = String(equipeNova || '').trim();

  if (!lotacaoInformada) {
    throw new Error('Confirme ou informe a lotação do usuário.');
  }

  var lotacaoEscolhida = '';
  var lotacaoNorm = normalizarDesenvDemandas_(lotacaoInformada);

  (opcoes.lotacoes || []).some(function(item) {
    if (normalizarDesenvDemandas_(item) === lotacaoNorm) {
      lotacaoEscolhida = item;
      return true;
    }
    return false;
  });

  if (!lotacaoEscolhida) {
    throw new Error('A lotação informada não consta na lista válida da aba DB_CONFIG.');
  }

  var equipeFinal = '';
  var lotacaoEscolhidaNorm = normalizarDesenvDemandas_(lotacaoEscolhida);

  if (lotacaoEscolhidaNorm === 'NUCLEO OPERACIONAL') {
    var listaEquipes = opcoes.equipesPorLotacao[lotacaoEscolhida] || [];

    if (!equipeInformada) {
      throw new Error('Selecione a equipe do Núcleo Operacional.');
    }

    var equipeNorm = normalizarDesenvDemandas_(equipeInformada);

    listaEquipes.some(function(item) {
      if (normalizarDesenvDemandas_(item) === equipeNorm) {
        equipeFinal = item;
        return true;
      }
      return false;
    });

    if (!equipeFinal) {
      throw new Error('A equipe informada para o Núcleo Operacional não consta na lista válida da aba DB_CONFIG.');
    }
  }

  if (perfilEscolhidoNormalizado === 'NUCLEO OPERACIONAL' && lotacaoEscolhidaNorm !== 'NUCLEO OPERACIONAL') {
    throw new Error('Para aprovar com perfil NÚCLEO OPERACIONAL, a lotação também deve ser NÚCLEO OPERACIONAL.');
  }

  var ss = abrirPlanilhaMaeDesenv_();
  var aba = ss.getSheetByName('USUARIOS');
  if (!aba) throw new Error("Aba 'USUARIOS' não encontrada.");

  garantirColunaEquipeUsuariosPortal_(aba);

  var dados = aba.getDataRange().getValues();

  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0] || '').toLowerCase() === String(loginAlvo || '').toLowerCase()) {
      var perfilAlvo = normalizarDesenvDemandas_(dados[i][4] || '');

      if (perfilAlvo === 'ADMIN' || perfilAlvo === 'CRIADOR/ADMIN' || perfilAlvo === 'CRIADOR ADMIN') {
        throw new Error('Contas ADMIN/CRIADOR são protegidas e não podem ser alteradas por esta tela.');
      }

      aba.getRange(i + 1, 5).setValue(mapaPerfis[perfilEscolhidoNormalizado]); // PERFIL
      aba.getRange(i + 1, 6).setValue(lotacaoEscolhida.toUpperCase());        // LOTAÇÃO / DELEGACIA
      aba.getRange(i + 1, 11).setValue(equipeFinal.toUpperCase());            // EQUIPE

      return { sucesso: true, mensagem: 'Usuário aprovado/atualizado com sucesso.' };
    }
  }

  throw new Error('Usuário não encontrado para aprovação.');
}

function rejeitarUsuarioPortal(usuarioLogin, loginAlvo) {
  var admin = obterUsuarioPortalPorLogin_(usuarioLogin);
  var perfilAdmin = normalizarDesenvDemandas_(admin && admin.perfil);
  if (!(perfilAdmin === 'ADMIN' || perfilAdmin === 'CRIADOR/ADMIN' || perfilAdmin === 'CRIADOR ADMIN')) {
    throw new Error('Apenas administradores podem rejeitar usuários.');
  }

  if (String(usuarioLogin || '').toLowerCase() === String(loginAlvo || '').toLowerCase()) {
    throw new Error('Você não pode rejeitar o próprio cadastro.');
  }

  var ss = abrirPlanilhaMaeDesenv_();
  var aba = ss.getSheetByName('USUARIOS');
  if (!aba) throw new Error("Aba 'USUARIOS' não encontrada.");

  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0] || '').toLowerCase() === String(loginAlvo || '').toLowerCase()) {
      var perfilAlvo = normalizarDesenvDemandas_(dados[i][4] || '');
      if (perfilAlvo === 'ADMIN' || perfilAlvo === 'CRIADOR/ADMIN' || perfilAlvo === 'CRIADOR ADMIN') {
        throw new Error('Contas ADMIN/CRIADOR são protegidas e não podem ser rejeitadas por esta tela.');
      }

      aba.getRange(i + 1, 5).setValue('REJEITADO');
      return { sucesso: true, mensagem: 'Cadastro rejeitado com sucesso.' };
    }
  }

  throw new Error('Usuário não encontrado para rejeição.');
}

function criarBackupManualPlanilhaPortal(usuarioLogin) {
  try {
    var admin = obterUsuarioPortalPorLogin_(usuarioLogin);
    var perfilAdmin = normalizarDesenvDemandas_(admin && admin.perfil);

    if (!(perfilAdmin === 'ADMIN' || perfilAdmin === 'CRIADOR/ADMIN' || perfilAdmin === 'CRIADOR ADMIN')) {
      throw new Error('Apenas administradores podem criar backup da planilha.');
    }

    var arquivoOrigem = DriveApp.getFileById(CONFIG.PLANILHA_MAE_ID);
    var pastaDestino = DriveApp.getFolderById(CONFIG.PASTA_BACKUP_PLANILHA_ID);

    var agora = new Date();
    var fuso = Session.getScriptTimeZone() || 'America/Fortaleza';
    var carimbo = Utilities.formatDate(agora, fuso, 'yyyy-MM-dd_HH-mm-ss');

    var nomeBackup = 'BACKUP_PORTAL_DEPATRI_' + carimbo;

    var copia = arquivoOrigem.makeCopy(nomeBackup, pastaDestino);

    return {
      sucesso: true,
      mensagem: 'Backup criado com sucesso.',
      nomeArquivo: copia.getName(),
      urlArquivo: copia.getUrl(),
      idArquivo: copia.getId()
    };
  } catch (erro) {
    return {
      sucesso: false,
      erro: erro.toString()
    };
  }
}

function solicitarRecuperacaoSenha(emailInformado) {
  try {
    var emailBusca = String(emailInformado || '').trim().toLowerCase();
    if (!emailBusca) {
      return { sucesso: false, erro: 'Informe o e-mail institucional cadastrado.' };
    }

    var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    var abaUsuarios = ss.getSheetByName('USUARIOS');
    if (!abaUsuarios) throw new Error("Aba 'USUARIOS' não encontrada.");

    var dados = abaUsuarios.getDataRange().getValues();
    for (var i = 1; i < dados.length; i++) {
      var emailLinha = String(dados[i][2] || '').trim().toLowerCase();
      var perfilLinha = normalizarDesenvDemandas_(dados[i][4] || '');
      if (emailLinha !== emailBusca) continue;

      if (perfilLinha === 'PENDENTE') {
        return { sucesso: false, erro: 'Seu cadastro ainda está pendente de aprovação.' };
      }
      if (perfilLinha === 'REJEITADO') {
        return { sucesso: false, erro: 'Seu cadastro foi rejeitado. Procure o administrador.' };
      }

      var senhaTemp = Math.random().toString(36).slice(-8).toUpperCase();
      var hashSenhaTemp = gerarHash(senhaTemp);
      var hashAnterior = dados[i][8];
      var flagAnterior = dados[i][9];

      abaUsuarios.getRange(i + 1, 9).setValue(hashSenhaTemp);
      abaUsuarios.getRange(i + 1, 10).setValue(true);

      try {
        MailApp.sendEmail({
          to: emailLinha,
          subject: 'Portal DEPATRI - Recuperação de senha',
          htmlBody: '<p>Foi solicitada a recuperação de senha do <b>Portal DEPATRI</b>.</p>' +
                    '<p><b>Usuário:</b> ' + String(dados[i][0] || '') + '<br>' +
                    '<b>Senha temporária:</b> ' + senhaTemp + '</p>' +
                    '<p>No próximo acesso, o sistema exigirá a troca imediata da senha.</p>' +
                    '<p>Se você não solicitou esta recuperação, procure o administrador do sistema.</p>',
          name: 'Portal DEPATRI'
        });
      } catch (erroEmail) {
        abaUsuarios.getRange(i + 1, 9).setValue(hashAnterior);
        abaUsuarios.getRange(i + 1, 10).setValue(flagAnterior);
        return { sucesso: false, erro: 'Não foi possível enviar o e-mail automático no momento. Verifique a autorização do MailApp no Apps Script.' };
      }

      return { sucesso: true, mensagem: 'Uma senha temporária foi enviada para o e-mail informado.' };
    }

    return { sucesso: false, erro: 'Nenhum usuário encontrado com esse e-mail institucional.' };
  } catch (erro) {
    return { sucesso: false, erro: 'Erro ao processar recuperação de senha: ' + erro.toString() };
  }
}

function classificarPermissaoDesenvDemandas_(usuario) {
  var perfil = normalizarDesenvDemandas_(usuario && usuario.perfil);
  var lotacao = normalizarDesenvDemandas_((usuario && (usuario.delegacia || usuario.lotacao)) || '');

  if (perfil === 'ADMIN' || perfil === 'ADMINISTRADOR' || perfil === 'CRIADOR/ADMIN' || perfil === 'CRIADOR ADMIN') return 'ADMIN';
  if (perfil.indexOf('NUIP') > -1 || lotacao.indexOf('NUIP') > -1) return 'NUIP';
  if (perfil.indexOf('DIRECAO') > -1 || perfil.indexOf('DIRETORIA') > -1 || lotacao.indexOf('DIRECAO') > -1 || lotacao.indexOf('DIRETORIA') > -1) return 'DIRECAO';
  if (perfil.indexOf('DELEGACIA') > -1 || lotacao.indexOf('DELEGACIA') > -1) return 'NEGADO';
  if (perfil.indexOf('ADMINISTRATIVO') > -1 || lotacao.indexOf('ADMINISTRATIVO') > -1) return 'NEGADO';
  if (perfil.indexOf('NUCLEO OPERACIONAL') > -1 || lotacao.indexOf('NUCLEO OPERACIONAL') > -1) return 'NEGADO';
  return 'NEGADO';
}

function validarAcessoDesenvDemandas_(usuarioLogin) {
  var usuario = obterUsuarioPortalPorLogin_(usuarioLogin);
  var classe = classificarPermissaoDesenvDemandas_(usuario);
  if (classe === 'NEGADO') {
    throw new Error('Acesso negado ao módulo Desenvolvimento de Demandas Ativas.');
  }
  usuario._classeDesenv = classe;
  return usuario;
}

function validarAdminGeminiDesenv_(usuarioLogin) {
  var usuario = validarAcessoDesenvDemandas_(usuarioLogin);
  if (usuario._classeDesenv !== 'ADMIN') {
    throw new Error('Somente ADMINISTRADOR pode gerenciar a configuração do Gemini.');
  }
  return usuario;
}

function obterValoresCategoriaDbConfigDesenv_(categoria) {
  var ss = abrirPlanilhaMaeDesenv_();
  var aba = ss.getSheetByName(DESENV_DEMANDAS_CFG.SHEET_DB_CONFIG);
  if (!aba) return [];

  var dados = aba.getDataRange().getValues();
  if (!dados.length) return [];

  var headers = dados[0];
  var idxCat = obterIndiceColunaPorAlias_(headers, ['CATEGORIA']);
  var idxNome = obterIndiceColunaPorAlias_(headers, ['NOME']);
  var idxValorExtra = obterIndiceColunaPorAlias_(headers, ['VALOR_EXTRA']);

  if (idxCat === -1) return [];

  var categoriaNorm = normalizarDesenvDemandas_(categoria);
  var usarValorExtra = categoriaNorm === normalizarDesenvDemandas_('EQUIPE');

  var mapa = {};
  for (var i = 1; i < dados.length; i++) {
    var cat = normalizarDesenvDemandas_(dados[i][idxCat]);
    if (cat !== categoriaNorm) continue;

    var valor = '';
    if (usarValorExtra) {
      valor = idxValorExtra > -1 ? String(dados[i][idxValorExtra] || '').trim() : '';
    } else {
      valor = idxNome > -1 ? String(dados[i][idxNome] || '').trim() : '';
    }

    if (!valor) continue;
    mapa[valor] = true;
  }

  return Object.keys(mapa).sort(function(a, b) {
    return a.localeCompare(b, 'pt-BR');
  });
}

function obterTextoBaseCategoriaDbConfigDesenv_(categoria) {
  var ss = abrirPlanilhaMaeDesenv_();
  var aba = ss.getSheetByName(DESENV_DEMANDAS_CFG.SHEET_DB_CONFIG);
  if (!aba) throw new Error("Aba 'DB_CONFIG' não encontrada.");
  var dados = aba.getDataRange().getValues();
  if (!dados.length) throw new Error("Aba 'DB_CONFIG' está vazia.");

  var headers = dados[0];
  var idxCat = obterIndiceColunaPorAlias_(headers, ['CATEGORIA']);
  var idxModalidade = obterIndiceColunaPorAlias_(headers, ['MODALIDADE']);
  if (idxCat === -1 || idxModalidade === -1) {
    throw new Error("A aba 'DB_CONFIG' precisa conter as colunas CATEGORIA e MODALIDADE.");
  }

  var categoriaNorm = normalizarDesenvDemandas_(categoria);

  for (var i = 1; i < dados.length; i++) {
    if (normalizarDesenvDemandas_(dados[i][idxCat]) === categoriaNorm) {
      var texto = String(dados[i][idxModalidade] || '').trim();
      if (texto) return texto;
    }
  }
  throw new Error('Texto base não encontrado para a categoria ' + categoria + '.');
}

function resolverCargoDelegadoDesenv_(delegado) {
  var nome = normalizarDesenvDemandas_(delegado);
  if (nome.indexOf('GEORGE MONTEIRO') > -1) {
    return 'Diretor do Departamento de Combate aos Crimes Contra o Patrimônio – DEPATRI';
  }
  if (nome.indexOf('OSMAR BERTO') > -1) {
    return 'Diretor Adjunto do Departamento de Combate aos Crimes Contra o Patrimônio – DEPATRI';
  }
  return 'Delegado de Polícia Civil';
}

function montarIdentificadorOcorrenciaDesenv_(tipoOcorrencia, numeroProcedimento) {
  var tipo = String(tipoOcorrencia || '').trim();
  var numero = String(numeroProcedimento || '').trim();
  var tipoNorm = normalizarDesenvDemandas_(tipo);

  if (!tipo || !numero) return '';
  if (tipoNorm === 'CIOPS' || tipoNorm.indexOf('CIOPS') > -1) return 'OCORRÊNCIA CIOPS Nº ' + numero;
  if (tipoNorm === 'BO' || tipoNorm === 'B.O' || tipoNorm.indexOf('BOLETIM') > -1) return 'B.O Nº ' + numero;
  if (tipoNorm === 'IP' || tipoNorm.indexOf('INQUERITO') > -1) return 'IP Nº ' + numero;
  return tipo + ' Nº ' + numero;
}

function extrairTipoProcedimentoDesenv_(numOcorrencia) {
  var valor = String(numOcorrencia || '').trim();
  var norm = normalizarDesenvDemandas_(valor);
  if (!norm) return '';
  if (norm.indexOf('OCORRENCIA CIOPS N') === 0) return 'CIOPS';
  if (norm.indexOf('B.O N') === 0 || norm.indexOf('BO N') === 0) return 'BO';
  if (norm.indexOf('IP N') === 0) return 'IP';
  var partes = valor.split(/\s+N[ºO]\s+/i);
  return partes.length ? partes[0].trim() : valor;
}

function extrairNumeroProcedimentoDesenv_(numOcorrencia) {
  var valor = String(numOcorrencia || '').trim();
  var partes = valor.split(/\s+N[ºO]\s+/i);
  return partes.length > 1 ? partes.slice(1).join(' Nº ').trim() : '';
}

function formatarDataDesenvDemandas_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor)) {
    return Utilities.formatDate(valor, 'America/Fortaleza', 'dd/MM/yyyy');
  }
  var texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto.substring(8, 10) + '/' + texto.substring(5, 7) + '/' + texto.substring(0, 4);
  }
  return texto;
}

function formatarHoraDesenvDemandas_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor)) {
    return Utilities.formatDate(valor, 'America/Fortaleza', 'HH:mm');
  }
  var texto = String(valor).trim();
  var m = texto.match(/^(\d{1,2}):(\d{2})/);
  if (m) return ('0' + m[1]).slice(-2) + ':' + m[2];
  var m2 = texto.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (m2) return ('0' + m2[1]).slice(-2) + ':' + m2[2];
  return texto;
}

function obterDelegadosDesenvDemandas_() {
  return ['GEORGE MONTEIRO', 'OSMAR BERTO'];
}

function inferirMetadadosDescricaoDesenv_(descricao) {
  var texto = String(descricao || '');
  var textoNorm = normalizarDesenvDemandas_(texto);
  var delegado = '';

  var delegados = obterDelegadosDesenvDemandas_();
  for (var i = 0; i < delegados.length; i++) {
    if (textoNorm.indexOf(normalizarDesenvDemandas_(delegados[i])) > -1) {
      delegado = delegados[i];
      break;
    }
  }

  var demandaIninterrupta = 'NAO';
  try {
    var textoIninterrupta = obterTextoBaseCategoriaDbConfigDesenv_('DEMANDA ININTERRUPTA');
    if (textoIninterrupta && textoNorm.indexOf(normalizarDesenvDemandas_(textoIninterrupta)) > -1) {
      demandaIninterrupta = 'SIM';
    }
  } catch (e) {}

  return {
    delegado: delegado,
    demandaIninterrupta: demandaIninterrupta
  };
}

function obterConfiguracaoGeminiInternaDesenv_() {
  var props = PropertiesService.getScriptProperties();
  var key = String(props.getProperty(DESENV_DEMANDAS_CFG.PROP_GEMINI_KEY) || '').trim();
  var ativo = String(props.getProperty(DESENV_DEMANDAS_CFG.PROP_GEMINI_ACTIVE) || 'false').toLowerCase() === 'true';
  return { key: key, ativo: ativo, configurada: !!key };
}

function mascararChaveDesenv_(key) {
  var valor = String(key || '');
  if (!valor) return '';
  if (valor.length <= 8) return '********';
  return valor.substring(0, 4) + '••••••••' + valor.substring(valor.length - 4);
}

function montarDescricaoBaseDesenvDemandas(usuarioLogin, payload) {
  validarAcessoDesenvDemandas_(usuarioLogin);
  payload = payload || {};

  var textoPrincipal = obterTextoBaseCategoriaDbConfigDesenv_('DESENVOLVIMENTO DE DEMANDA ATIVA');
  var textoComplementar = '';
  var incluirIninterrupta = normalizarDesenvDemandas_(payload.demandaIninterrupta) === 'SIM';

  if (incluirIninterrupta) {
    textoComplementar = obterTextoBaseCategoriaDbConfigDesenv_('DEMANDA ININTERRUPTA');
  }

  var delegado = String(payload.delegado || '').trim();
  var equipe = String(payload.equipe || '').trim();
  var cargo = resolverCargoDelegadoDesenv_(delegado);

  var textoFinal = textoPrincipal
    .replace(/\{cargo\}/gi, cargo)
    .replace(/\{delegado\}/gi, delegado)
    .replace(/\{equipe\}/gi, equipe);

  if (textoComplementar) {
    textoFinal += '\n\n' + textoComplementar;
  }

  return {
    sucesso: true,
    descricao: textoFinal,
    cargoAplicado: cargo,
    incluiuIninterrupta: incluirIninterrupta
  };
}

function obterConfigGeminiDesenvDemandas(usuarioLogin) {
  validarAdminGeminiDesenv_(usuarioLogin);
  var cfg = obterConfiguracaoGeminiInternaDesenv_();
  return {
    sucesso: true,
    configurada: cfg.configurada,
    ativa: cfg.ativo,
    chaveMascarada: mascararChaveDesenv_(cfg.key)
  };
}

function salvarConfigGeminiDesenvDemandas(usuarioLogin, chave) {
  validarAdminGeminiDesenv_(usuarioLogin);
  var key = String(chave || '').trim();
  if (!key) throw new Error('Informe uma chave válida do Gemini.');
  var props = PropertiesService.getScriptProperties();
  props.setProperty(DESENV_DEMANDAS_CFG.PROP_GEMINI_KEY, key);
  if (!props.getProperty(DESENV_DEMANDAS_CFG.PROP_GEMINI_ACTIVE)) {
    props.setProperty(DESENV_DEMANDAS_CFG.PROP_GEMINI_ACTIVE, 'false');
  }
  return { sucesso: true, mensagem: 'Chave do Gemini salva com sucesso.', chaveMascarada: mascararChaveDesenv_(key) };
}

function definirAtivacaoGeminiDesenvDemandas(usuarioLogin, ativo) {
  validarAdminGeminiDesenv_(usuarioLogin);
  var props = PropertiesService.getScriptProperties();
  props.setProperty(DESENV_DEMANDAS_CFG.PROP_GEMINI_ACTIVE, ativo ? 'true' : 'false');
  return { sucesso: true, ativo: !!ativo };
}


function construirPromptRelatorioFinalDesenvDemandas_(demanda) {
  var prompt = [];

  prompt.push('Você atua no Portal DEPATRI.');
  prompt.push('Transforme o compilado abaixo em um relatório narrativo final técnico, fluido, objetivo e em texto corrido.');
  prompt.push('');
  prompt.push('REGRAS OBRIGATÓRIAS DE SAÍDA:');
  prompt.push('1. NÃO escreva os marcadores [DESCRICAO_BASE], [/DESCRICAO_BASE], [RESUMO_SALVO], [/RESUMO_SALVO], [EVOLUCOES] ou [/EVOLUCOES] na resposta.');
  prompt.push('2. NÃO escreva o título "RELATÓRIO TÉCNICO NARRATIVO – PORTAL DEPATRI".');
  prompt.push('3. A resposta deve começar obrigatoriamente pelo conteúdo do RESUMO_SALVO.');
  prompt.push('4. Logo abaixo do RESUMO_SALVO, insira o texto que começa com "Em razão dos fatos, o Diretor do Departamento...".');
  prompt.push('5. Logo após esse texto, insira o parágrafo que começa com "Ressalta-se que o DEPATRI atua em regime...".');
  prompt.push('6. Somente depois desses três blocos, desenvolva a narrativa complementar com base nas evoluções registradas.');
  prompt.push('7. Preserve o conteúdo do resumo e da descrição base sem inventar fatos novos.');
  prompt.push('8. Não acrescente saudações, cabeçalhos institucionais, tópicos, listas, markdown, asteriscos ou observações finais.');
prompt.push('9. O texto final deve ser dividido em parágrafos visivelmente separados por uma linha em branco.');
prompt.push('10. O RESUMO_SALVO deve formar um primeiro parágrafo próprio.');
prompt.push('11. O texto que começa com "Em razão dos fatos, o Diretor do Departamento..." deve formar um segundo parágrafo próprio.');
prompt.push('12. O texto que começa com "Ressalta-se que o DEPATRI atua em regime..." deve formar um terceiro parágrafo próprio.');
prompt.push('13. As demais informações das evoluções devem ser organizadas em novos parágrafos, sem juntar tudo em um bloco único.');
prompt.push('14. Cada mudança relevante de assunto deve iniciar um novo parágrafo.');
prompt.push('15. Não entregar a resposta em bloco único.');
  prompt.push('');
  prompt.push('ORDEM EXATA OBRIGATÓRIA DO TEXTO FINAL:');
  prompt.push('a) Primeiro: RESUMO_SALVO');
  prompt.push('b) Segundo: DESCRICAO_BASE');
  prompt.push('c) Terceiro: continuação narrativa a partir das EVOLUCOES');
  prompt.push('');
  prompt.push('RESUMO_SALVO:');
  prompt.push(demanda.resumo || '');
  prompt.push('');
  prompt.push('DESCRICAO_BASE:');
  prompt.push(demanda.descricao || '');
  prompt.push('');
  prompt.push('EVOLUCOES:');

  if (demanda.evolucoes && demanda.evolucoes.length) {
    for (var i = 0; i < demanda.evolucoes.length; i++) {
      prompt.push('- [' + demanda.evolucoes[i].hora + '] ' + demanda.evolucoes[i].equipe + ': ' + demanda.evolucoes[i].desenvolvimento);
    }
  } else {
    prompt.push('- Sem evoluções registradas.');
  }

  return {
    contents: [{
      parts: [{
        text: prompt.join('\n')
      }]
    }]
  };
}




// ============================================================================
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


// MÓDULO 5 - CASOS PRIORITÁRIOS (BACKEND: RELATÓRIOS HISTÓRICOS)
// ============================================================================

function dataDocumentoExtensoCasosPrioritarios_() {
  var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var agora = new Date();
  return 'Fortaleza, ' + Utilities.formatDate(agora, 'America/Fortaleza', 'dd') + ' de ' + meses[agora.getMonth()] + ' de ' + Utilities.formatDate(agora, 'America/Fortaleza', 'yyyy');
}

function limparMetadadosRotaCasosPrioritarios_(texto) {
  var linhas = String(texto || '').split(/\n+/);
  var filtradas = [];
  for (var i = 0; i < linhas.length; i++) {
    var linha = String(linhas[i] || '').trim();
    if (!linha) continue;
    if (/^__COORD__:/i.test(linha)) continue;
    filtradas.push(linha);
  }
  return filtradas.join('\n');
}

function limparExcessosRelatorioCasosPrioritarios_(texto) {
  var t = String(texto || '');
  if (!t) return '';
  t = t.replace(/\bCPF\s*[:\-]?\s*[0-9\.\-\/]+/gi, '');
  t = t.replace(/\bRG\s*[:\-]?\s*[^,;\n\.]+/gi, '');
  t = t.replace(/\bCEP\s*[:\-]?\s*\d{5}-?\d{3}/gi, '');
  t = t.replace(/\bRENAVAM\s*[:\-]?\s*[^,;\n\.]+/gi, '');
  t = t.replace(/\bCHASSI\s*[:\-]?\s*[^,;\n\.]+/gi, '');
  t = t.replace(/\bDATA\/HORA DA COMUNICAÇÃO DO BO\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\bIDENTIDADE DE GÊNERO\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\bORIENTAÇÃO SEXUAL\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\bFILIAÇÃO\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\bE[- ]?MAIL\s*[:\-]?\s*\S+/gi, '');
  t = t.replace(/\bDATA DE NASCIMENTO\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\(\s*nascid[oa][^\)]*\)/gi, '');
  t = t.replace(/\bUNIDADE ADMINISTRATIVA DESTINO\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\bRESPONSÁVEL PELO REGISTRO\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\bVISTO DO DELEGADO\(A\)\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\bPONTO DE REFERÊNCIA DO CRIME\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\bENCAMINHAMENTO\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\bCASO VINCULADO\s*[:\-]?\s*[^\.\n]+/gi, '');
  t = t.replace(/\s{2,}/g, ' ').replace(/\s+\./g,'.').replace(/\s+,/g,',').trim();
  return t;
}

function extrairHistoricoOcorrenciaRelatorioCasosPrioritarios_(evento) {
  var obsOriginal = String((evento && evento.observacoes) || '');
  if (!obsOriginal) return '';
  var texto = obsOriginal.replace(/\r/g, '\n');
  var match = texto.match(/Hist[oó]rico\s+da\s+ocorr[eê]ncia\s*:\s*([\s\S]*)/i);
  if (match && match[1]) {
    texto = match[1];
    texto = texto.split(/\n\s*(?:Encaminhamento|Unidade Administrativa Destino|Responsável pelo Registro|Visto do Delegado\(a\)|Caso vinculado)\s*:/i)[0];
  }
  texto = limparExcessosRelatorioCasosPrioritarios_(texto);
  return texto;
}

function sintetizarModusOperandiRelatorioCasosPrioritarios_(evento) {
  var partes = [];
  var suspeito = limparTextoCasosPrioritarios_(evento.nomeSuspeito || evento.descricaoSuspeito);
  var arma = limparTextoCasosPrioritarios_(evento.arma);
  var veiculo = limparTextoCasosPrioritarios_(evento.veiculoSuspeito);
  var historico = extrairHistoricoOcorrenciaRelatorioCasosPrioritarios_(evento);
  if (suspeito) partes.push(suspeito);
  if (arma && normalizarTextoRelatorioCasosPrioritarios_(arma) !== 'NAO INFORMADO') partes.push('arma: ' + arma);
  if (veiculo) partes.push('veículo: ' + veiculo);
  if (!partes.length && historico) {
    var resumo = historico.substring(0, 180);
    if (historico.length > 180) resumo += '...';
    partes.push(resumo);
  }
  return partes.join(' | ') || 'Não informado';
}

function construirConclusaoRelatorioCasosPrioritarios_(pacote) {
  var bairros = [];
  for (var i = 0; i < pacote.rowsTabela.length; i++) {
    var bairro = limparTextoCasosPrioritarios_(pacote.rowsTabela[i][2]);
    if (bairro && bairros.indexOf(bairro) === -1 && bairro !== 'Não informado') {
      bairros.push(bairro);
    }
  }

  var trechoBairros = bairros.length
    ? (' com registros concentrados em ' + bairros.slice(0, 4).join(', ') + (bairros.length > 4 ? ', entre outros' : ''))
    : '';

  return 'Diante do conjunto de ' + pacote.qtdOcorrencias +
    ' ocorrência(s) analisada(s), o material consolidado evidencia elementos úteis ao mapeamento do padrão de atuação investigado' +
    trechoBairros +
    ', oferecendo subsídios objetivos para o direcionamento de diligências, cruzamento de informações e aprofundamento das ações de inteligência policial.';
}

function montarPeriodoRelatorioCasosPrioritarios_(payload, eventosFiltrados) {
  var ini = payload && payload.dataInicial ? formatarDataIsoParaBrCasosPrioritarios_(payload.dataInicial) : '';
  var fim = payload && payload.dataFinal ? formatarDataIsoParaBrCasosPrioritarios_(payload.dataFinal) : '';
  if (!ini && eventosFiltrados && eventosFiltrados.length) ini = eventosFiltrados[0].data || '';
  if (!fim && eventosFiltrados && eventosFiltrados.length) fim = eventosFiltrados[eventosFiltrados.length - 1].data || '';
  if (ini && fim) return ini + ' a ' + fim;
  return ini || fim || 'Período não informado';
}

function escapeRegexCasosPrioritarios_(texto) {
  return String(texto || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function localizarParagrafoTagCasosPrioritarios_(body, tag) {
  var achou = body.findText(escapeRegexCasosPrioritarios_(tag));
  if (!achou) return null;

  var el = achou.getElement();
  while (el && el.getType() !== DocumentApp.ElementType.PARAGRAPH) {
    el = el.getParent();
  }
  return el ? el.asParagraph() : null;
}


function limparLixoFinalDetalhamentoCasosPrioritarios_(texto) {
  var t = limparExcessosRelatorioCasosPrioritarios_(texto || '');

  t = t.replace(/\s+/g, ' ').trim();

  // remove restos finais do tipo 134009-1-1)..: 300513-1-9).
  t = t.replace(/(?:\s*[:;\-–—]*\s*(?:\d{3,}(?:-\d+){1,5}[).:]*)\s*)+$/g, '');

  // remove pontuação quebrada sobrando no final
  t = t.replace(/\s*[):;.,\-–—]+$/g, '').trim();

  return t;
}

function construirDescricaoFatosRelatorioCasosPrioritarios_(evento) {
  var historico = extrairHistoricoOcorrenciaRelatorioCasosPrioritarios_(evento);
  historico = limparLixoFinalDetalhamentoCasosPrioritarios_(historico);
  if (historico) return historico;

  var obs = limparLixoFinalDetalhamentoCasosPrioritarios_(evento && evento.observacoes);
  if (obs) return obs;

  var frases = [];
  if (evento.nomeVitima) frases.push('A vítima relacionada ao registro é ' + evento.nomeVitima + '.');
  if (evento.nomeSuspeito || evento.descricaoSuspeito) frases.push('Suspeito(s): ' + (evento.nomeSuspeito || evento.descricaoSuspeito) + '.');
  if (evento.objetoSubtraido) frases.push('Objeto(s) subtraído(s): ' + evento.objetoSubtraido + '.');
  if (evento.veiculoSuspeito) frases.push('Veículo suspeito: ' + evento.veiculoSuspeito + '.');
  if (evento.arma && normalizarTextoRelatorioCasosPrioritarios_(evento.arma) !== 'NAO INFORMADO') {
    frases.push('Houve referência ao uso de arma: ' + evento.arma + '.');
  }

  return limparLixoFinalDetalhamentoCasosPrioritarios_(
    frases.join(' ').trim() || 'Sem descrição dos fatos disponível nos campos estruturados.'
  );
}




function construirPacoteRelatorioCasosPrioritarios_(meta, eventosFiltrados) {
  meta = meta || {};
  eventosFiltrados = eventosFiltrados || [];
  var pacote = {
    nomeCaso: limparTextoCasosPrioritarios_(meta.nomeCaso) || 'Pesquisa de ocorrências',
    tipoCaso: limparTextoCasosPrioritarios_(meta.tipoCaso) || 'Ocorrências filtradas',
    qtdOcorrencias: String(eventosFiltrados.length),
    dataPeriodo: limparTextoCasosPrioritarios_(meta.dataPeriodo) || 'Período não informado',
    dataDocumento: dataDocumentoExtensoCasosPrioritarios_(),
    rowsTabela: [],
    detalhes: [],
    conclusao: ''
  };
  for (var i = 0; i < eventosFiltrados.length; i++) {
    var ev = eventosFiltrados[i] || {};
    pacote.rowsTabela.push([
      montarProcedimentoRelatorioCasosPrioritarios_(ev),
      (ev.data || '') + (ev.hora ? (' - ' + ev.hora) : ''),
      ev.bairro || 'Não informado',
      ev.objetoSubtraido || 'Não informado',
      (ev.nomeSuspeito || ev.descricaoSuspeito || 'Não informado'),
      sintetizarModusOperandiRelatorioCasosPrioritarios_(ev)
    ]);
    pacote.detalhes.push({
      procedimento: montarProcedimentoRelatorioCasosPrioritarios_(ev),
      dataHora: (ev.data || 'Não informado') + (ev.hora ? (' por volta das ' + ev.hora) : ''),
      local: [ev.endereco || '', ev.bairro || ''].filter(Boolean).join(', ') || 'Não informado',
      vitima: ev.nomeVitima || 'Não informado',
      suspeitos: ev.nomeSuspeito || ev.descricaoSuspeito || 'Não informado',
      descricaoFatos: construirDescricaoFatosRelatorioCasosPrioritarios_(ev)
    });
  }
  pacote.conclusao = construirConclusaoRelatorioCasosPrioritarios_(pacote);
  return pacote;
}

function textoRelatorioNaTelaCasosPrioritarios_(pacote) {
  var linhas = [];
  linhas.push('O presente documento visa consolidar as ocorrências referentes a ' + pacote.tipoCaso + ', compilando-as em um dossiê único. Para efeitos de alinhamento estratégico e controle organizacional, o escopo unificado foi designado como ' + pacote.nomeCaso + '. A presente análise consolida ' + pacote.qtdOcorrencias + ' ocorrência(s) alinhada(s) ao escopo da investigação, fornecendo subsídios estratégicos para o mapeamento de padrões criminais e suporte às ações de inteligência.');
  linhas.push('');
  linhas.push(pacote.dataDocumento);
  linhas.push('');
  linhas.push('Quadro Consolidado de Ocorrências');
  linhas.push('PROCEDIMENTO | DATA/HORA | BAIRRO | OBJETO SUBTRAÍDO | SUSPEITO | MODUS OPERANDI');
  for (var i = 0; i < pacote.rowsTabela.length; i++) linhas.push(pacote.rowsTabela[i].join(' | '));
  linhas.push('');
  linhas.push('Detalhamento dos Casos');
  linhas.push('');
  for (var j = 0; j < pacote.detalhes.length; j++) {
    var d = pacote.detalhes[j];
    linhas.push(d.procedimento);
    linhas.push('DATA e HORA: ' + d.dataHora);
    linhas.push('LOCAL DA OCORRÊNCIA: ' + d.local);
    linhas.push('VÍTIMA: ' + d.vitima);
    linhas.push('SUSPEITO(S): ' + d.suspeitos);
    linhas.push('DESCRIÇÃO DOS FATOS: ' + d.descricaoFatos);
    linhas.push('');
  }
  linhas.push('Conclusão');
  linhas.push(pacote.conclusao);
  return linhas.join('\n');
}

function normalizarTextoRelatorioCasosPrioritarios_(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

function parseDataBrCasosPrioritarios_(valor) {
  var txt = String(valor || '').trim();
  if (!txt) return null;
  var m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDataIsoCasosPrioritarios_(valor) {
  var txt = String(valor || '').trim();
  if (!txt) return null;
  var m = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatarDataIsoParaBrCasosPrioritarios_(valor) {
  var d = parseDataIsoCasosPrioritarios_(valor);
  if (!d) return '';
  var dia = ('0' + d.getDate()).slice(-2);
  var mes = ('0' + (d.getMonth() + 1)).slice(-2);
  return dia + '/' + mes + '/' + d.getFullYear();
}

function eventoDentroPeriodoRelatorioCasosPrioritarios_(evento, dataIni, dataFim) {
  if (!dataIni && !dataFim) return true;
  var d = parseDataBrCasosPrioritarios_(evento && evento.data);
  if (!d) return false;
  if (dataIni && d.getTime() < dataIni.getTime()) return false;
  if (dataFim && d.getTime() > dataFim.getTime()) return false;
  return true;
}

function textoEventoRelatorioCasosPrioritarios_(evento) {
  return [
    evento.tipoProc,
    evento.numProc,
    evento.bairro,
    evento.endereco,
    limparMetadadosRotaCasosPrioritarios_(evento.rotaFuga),
    evento.nomeVitima,
    evento.objetoSubtraido,
    evento.arma,
    evento.veiculoSuspeito,
    evento.nomeSuspeito,
    evento.descricaoSuspeito,
    evento.observacoes
  ].join(' ');
}


function montarProcedimentoRelatorioCasosPrioritarios_(evento) {
  var tipo = limparTextoCasosPrioritarios_(evento && evento.tipoProc);
  var num = limparTextoCasosPrioritarios_(evento && evento.numProc);
  return (tipo && num) ? (tipo + ' ' + num) : (tipo || num || 'Não informado');
}

function construirDinamicaRelatorioCasosPrioritarios_(evento) {
  var obs = limparTextoCasosPrioritarios_(evento && evento.observacoes);
  if (obs) return obs;
  var partes = [];
  if (evento && evento.nomeVitima) partes.push('A vítima relacionada ao registro é ' + evento.nomeVitima + '.');
  if (evento && evento.objetoSubtraido) partes.push('Objeto subtraído: ' + evento.objetoSubtraido + '.');
  if (evento && evento.arma && evento.arma !== 'NÃO INFORMADO') partes.push('Há referência ao uso de arma: ' + evento.arma + '.');
  if (evento && evento.veiculoSuspeito) partes.push('Veículo suspeito: ' + evento.veiculoSuspeito + '.');
  if (evento && evento.nomeSuspeito) partes.push('Suspeito apontado: ' + evento.nomeSuspeito + '.');
  if (evento && evento.descricaoSuspeito) partes.push('Descrição do suspeito: ' + evento.descricaoSuspeito + '.');
  return partes.join(' ').trim() || 'Sem descrição detalhada disponível nos campos estruturados.';
}

function normalizarNomeArquivoRelatorioCasosPrioritarios_(texto) {
  return String(texto || 'relatorio').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 _-]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 80) || 'relatorio';
}

function substituirTagSimplesCasosPrioritarios_(body, tag, valor) {
  body.replaceText(tag, String(valor == null ? '' : valor));
}

function inserirCorpoRelatorioNoTemplateCasosPrioritarios_(docId, pacote) {
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();

  substituirTagSimplesCasosPrioritarios_(body, '{{NOME_CASO}}', pacote.nomeCaso);
  substituirTagSimplesCasosPrioritarios_(body, '{{TIPO_CASO}}', pacote.tipoCaso);
  substituirTagSimplesCasosPrioritarios_(body, '{{QTD_OCORRENCIAS}}', pacote.qtdOcorrencias);
  substituirTagSimplesCasosPrioritarios_(body, '{{DATA_PERIODO}}', pacote.dataPeriodo);
  substituirTagSimplesCasosPrioritarios_(body, '{{DATA_INI}}', pacote.dataIni || '');
  substituirTagSimplesCasosPrioritarios_(body, '{{DATA_FIM}}', pacote.dataFim || '');
  substituirTagSimplesCasosPrioritarios_(body, '{{DATA_DOCUMENTO}}', pacote.dataDocumento);

  var styleBase = {};
  styleBase[DocumentApp.Attribute.FONT_FAMILY] = 'Garamond';
  styleBase[DocumentApp.Attribute.FONT_SIZE] = 13;
  styleBase[DocumentApp.Attribute.BOLD] = false;

  var styleProc = {};
  styleProc[DocumentApp.Attribute.FONT_FAMILY] = 'Garamond';
  styleProc[DocumentApp.Attribute.FONT_SIZE] = 13;
  styleProc[DocumentApp.Attribute.BOLD] = true;

  // =========================
  // TABELA
  // =========================
  var parTabela = localizarParagrafoTagCasosPrioritarios_(body, '{{AREA_TABELA}}');
  var idxTabela = parTabela ? body.getChildIndex(parTabela) : body.getNumChildren();
  if (parTabela) parTabela.removeFromParent();

  var matrizTabela = [[
    'Nº PROCEDIMENTO',
    'DATA/HORA',
    'BAIRRO',
    'OBJETO SUBTRAÍDO',
    'SUSPEITO',
    'MODUS OPERANDI'
  ]].concat(pacote.rowsTabela || []);

  var tabela = body.insertTable(idxTabela, matrizTabela);

  for (var r = 0; r < tabela.getNumRows(); r++) {
    var row = tabela.getRow(r);

    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);

      // Fundo do cabeçalho azul claro
      cell.setBackgroundColor(r === 0 ? '#D9EAF7' : '#FFFFFF');

      try {
        var txt = cell.editAsText();
        txt.setFontFamily('Garamond');
        txt.setFontSize(10);
        txt.setBold(r === 0); // só cabeçalho em negrito
      } catch (e) {}

      for (var k = 0; k < cell.getNumChildren(); k++) {
        try {
          var child = cell.getChild(k);
          if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
            var p = child.asParagraph();
            p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
            p.setSpacingBefore(0);
            p.setSpacingAfter(0);
            p.setLineSpacing(1.0);
          }
        } catch (e) {}
      }
    }
  }

  // =========================
  // DETALHAMENTO
  // =========================
  var parDetalhamento = localizarParagrafoTagCasosPrioritarios_(body, '{{AREA_DETALHAMENTO}}');
  var idxDetalhamento = parDetalhamento ? body.getChildIndex(parDetalhamento) : body.getNumChildren();
  if (parDetalhamento) parDetalhamento.removeFromParent();

  for (var i = 0; i < pacote.detalhes.length; i++) {
    var d = pacote.detalhes[i];
    var pos = idxDetalhamento + (i * 6);

    body.insertParagraph(pos, d.procedimento)
      .setAttributes(styleProc).setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(10);

    body.insertParagraph(pos + 1, 'DATA e HORA: ' + d.dataHora)
      .setAttributes(styleBase).setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(10);

    body.insertParagraph(pos + 2, 'LOCAL DA OCORRÊNCIA: ' + d.local)
      .setAttributes(styleBase).setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(10);

    body.insertParagraph(pos + 3, 'VÍTIMA: ' + d.vitima)
      .setAttributes(styleBase).setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(10);

    body.insertParagraph(pos + 4, 'SUSPEITO(S): ' + d.suspeitos)
      .setAttributes(styleBase).setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(10);

    body.insertParagraph(pos + 5, 'DESCRIÇÃO DOS FATOS: ' + d.descricaoFatos)
      .setAttributes(styleBase).setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(14);
  }

  // =========================
  // CONCLUSÃO
  // =========================
  var parConclusao = localizarParagrafoTagCasosPrioritarios_(body, '{{AREA_CONCLUSAO}}') ||
                     localizarParagrafoTagCasosPrioritarios_(body, '{{AREA_CONCLUSÃO}}');
  var idxConclusao = parConclusao ? body.getChildIndex(parConclusao) : body.getNumChildren();
  if (parConclusao) parConclusao.removeFromParent();

  body.insertParagraph(idxConclusao, pacote.conclusao)
    .setAttributes(styleBase).setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(10);

  substituirTagSimplesCasosPrioritarios_(body, '{{AREA_TABELA}}', '');
  substituirTagSimplesCasosPrioritarios_(body, '{{AREA_DETALHAMENTO}}', '');
  substituirTagSimplesCasosPrioritarios_(body, '{{AREA_CONCLUSAO}}', '');
  substituirTagSimplesCasosPrioritarios_(body, '{{AREA_CONCLUSÃO}}', '');
  substituirTagSimplesCasosPrioritarios_(body, '{{CORPO_RELATORIO}}', '');

  doc.saveAndClose();
  return doc;
}

function exportarGoogleDocFormatoCasosPrioritarios_(docId, nomeBase, formato) {
  formato = String(formato || 'PDF').toUpperCase();
  var folder = DriveApp.getFolderById(CASOS_PRIORITARIOS_CFG.REPORT_OUTPUT_FOLDER_ID), token = ScriptApp.getOAuthToken(), ext = formato === 'DOCX' ? 'docx' : 'pdf';
  var url = 'https://docs.google.com/document/d/' + encodeURIComponent(docId) + '/export?format=' + ext;
  var resp = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  if (resp.getResponseCode() >= 400) throw new Error('Falha ao exportar o relatório. Código HTTP: ' + resp.getResponseCode());
  return folder.createFile(resp.getBlob().setName(nomeBase + '.' + ext));
}

function criarDocumentoRelatorioCasosPrioritarios_(titulo, pacote) {
  var folder = DriveApp.getFolderById(CASOS_PRIORITARIOS_CFG.REPORT_OUTPUT_FOLDER_ID);
  var template = DriveApp.getFileById(CASOS_PRIORITARIOS_CFG.REPORT_TEMPLATE_DOC_ID);
  var nomeBase = normalizarNomeArquivoRelatorioCasosPrioritarios_(titulo) + ' - ' + Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd-MM-yyyy HH.mm.ss');
  var copy = template.makeCopy(nomeBase, folder);
  inserirCorpoRelatorioNoTemplateCasosPrioritarios_(copy.getId(), pacote);
  return { nomeBase: nomeBase, arquivoDoc: copy };
}

function gerarRelatorioCasoPrioritario(usuarioLogin, payload) {
  validarAcessoCasosPrioritarios_(usuarioLogin);
  payload = payload || {};
  var idCaso = limparTextoCasosPrioritarios_(payload.idCaso);
  if (!idCaso) throw new Error('Selecione um caso para gerar o relatório.');
  var caso = obterCasosPrioritariosInterno_().filter(function(item){ return String(item.idCaso) === String(idCaso); })[0] || null;
  if (!caso) throw new Error('Caso prioritário não encontrado.');
  var eventos = (listarEventosPorCasoPrioritario(usuarioLogin, idCaso).eventos) || [];
  if (!eventos.length) throw new Error('Nenhum evento encontrado para o caso selecionado.');
  var dataIni = parseDataIsoCasosPrioritarios_(payload.dataInicial), dataFim = parseDataIsoCasosPrioritarios_(payload.dataFinal), filtro = limparTextoCasosPrioritarios_(payload.filtroPalavra), filtroNorm = normalizarTextoRelatorioCasosPrioritarios_(filtro);
  var eventosFiltrados = eventos.filter(function(ev){
    if (!eventoDentroPeriodoRelatorioCasosPrioritarios_(ev, dataIni, dataFim)) return false;
    if (!filtroNorm) return true;
    return normalizarTextoRelatorioCasosPrioritarios_(textoEventoRelatorioCasosPrioritarios_(ev)).indexOf(filtroNorm) > -1;
  });
  if (!eventosFiltrados.length) throw new Error('Nenhum evento encontrado com os filtros informados.');
  var pacote = construirPacoteRelatorioCasosPrioritarios_({
    nomeCaso: caso.nomeCaso || idCaso,
    tipoCaso: caso.tipoCrime || caso.tipoCaso || 'Ocorrências',
    dataPeriodo: montarPeriodoRelatorioCasosPrioritarios_(payload, eventosFiltrados)
  }, eventosFiltrados);
  return { sucesso: true, modo: 'CASO', idCaso: idCaso, totalEventos: eventosFiltrados.length, titulo: 'Relatório - ' + (caso.nomeCaso || idCaso), texto: textoRelatorioNaTelaCasosPrioritarios_(pacote), pacote: pacote };
}

function normalizarListaIdsEventoRelatorioCasosPrioritarios_(ids) {
  if (!ids) return [];
  if (Object.prototype.toString.call(ids) !== '[object Array]') ids = [ids];
  return ids
    .map(function(v){ return String(v == null ? '' : v).trim(); })
    .filter(function(v){ return !!v; });
}

function obterOcorrenciasPorIdsRelatorioCasosPrioritarios_(idsEvento) {
  var ids = normalizarListaIdsEventoRelatorioCasosPrioritarios_(idsEvento);
  if (!ids.length) return [];

  var mapa = {};
  var todas = obterTodasOcorrenciasPesquisaCasosPrioritarios_();
  for (var i = 0; i < todas.length; i++) {
    mapa[String(todas[i].idEvento)] = todas[i];
  }

  var lista = [];
  for (var j = 0; j < ids.length; j++) {
    if (mapa[ids[j]]) lista.push(mapa[ids[j]]);
  }

  return lista;
}

function gerarRelatorioPesquisaOcorrencias(usuarioLogin, payload) {
  validarAcessoCasosPrioritarios_(usuarioLogin);
  payload = payload || {};

  var query = limparTextoCasosPrioritarios_(payload.query || payload.consulta || '');
  var idsEvento = normalizarListaIdsEventoRelatorioCasosPrioritarios_(payload.idsEvento || payload.ids_evento || []);
  var eventosFiltrados = [];

  // PRIORIDADE: se vierem os IDs da tela, usa exatamente eles.
  if (idsEvento.length) {
    eventosFiltrados = obterOcorrenciasPorIdsRelatorioCasosPrioritarios_(idsEvento);
    if (!eventosFiltrados.length) {
      throw new Error('Nenhuma ocorrência correspondente aos IDs enviados foi encontrada.');
    }
  } else {
    if (!query) throw new Error('Informe a pesquisa antes de gerar o relatório.');

    var modoBusca = String(payload.modo || 'LOGICA').toUpperCase();
    var exec;

    if (modoBusca === 'GEMINI') {
      validarAdminCasosPrioritarios_(usuarioLogin);
      exec = executarPesquisaOcorrenciasCasosPrioritariosGemini_(payload);
    } else {
      exec = executarPesquisaOcorrenciasCasosPrioritariosLogica_(payload);
    }

    eventosFiltrados = exec.ocorrencias || [];
    if (!eventosFiltrados.length) {
      throw new Error('Nenhuma ocorrência encontrada para a pesquisa informada.');
    }
  }

  var nomeCaso = 'Pesquisa de ocorrências';
  var tipoCaso = 'Ocorrências filtradas';
  var unicosCaso = [], unicosTipo = [];

  for (var i = 0; i < eventosFiltrados.length; i++) {
    var nc = limparTextoCasosPrioritarios_(eventosFiltrados[i].nomeCaso);
    var tc = limparTextoCasosPrioritarios_(eventosFiltrados[i].tipoCrime || eventosFiltrados[i].tipoCaso);
    if (nc && unicosCaso.indexOf(nc) === -1) unicosCaso.push(nc);
    if (tc && unicosTipo.indexOf(tc) === -1) unicosTipo.push(tc);
  }

  if (unicosCaso.length === 1) nomeCaso = unicosCaso[0];
  if (unicosTipo.length === 1) tipoCaso = unicosTipo[0];

  var pacote = construirPacoteRelatorioCasosPrioritarios_({
    nomeCaso: nomeCaso,
    tipoCaso: tipoCaso,
    dataPeriodo: montarPeriodoRelatorioCasosPrioritarios_(payload, eventosFiltrados),
    dataInicial: payload.dataInicial || '',
    dataFinal: payload.dataFinal || ''
  }, eventosFiltrados);

  var tituloRel = 'Pesquisa de ocorrências';
  if (query) tituloRel += ' - ' + query;

  return {
    sucesso: true,
    modo: 'BUSCA',
    query: query,
    totalEventos: eventosFiltrados.length,
    titulo: tituloRel,
    texto: textoRelatorioNaTelaCasosPrioritarios_(pacote),
    pacote: pacote
  };
}
function exportarRelatorioCasoPrioritario(usuarioLogin, payload) {
  payload = payload || {};
  var formato = String(payload.formato || 'PDF').toUpperCase();
  var rel = gerarRelatorioCasoPrioritario(usuarioLogin, payload);
  var docPack = criarDocumentoRelatorioCasosPrioritarios_(rel.titulo, rel.pacote);
  var arquivoExportado = exportarGoogleDocFormatoCasosPrioritarios_(docPack.arquivoDoc.getId(), docPack.nomeBase, formato);
  return { sucesso: true, formato: formato, titulo: rel.titulo, texto: rel.texto, urlDocGoogle: docPack.arquivoDoc.getUrl(), urlArquivo: arquivoExportado.getUrl(), nomeArquivo: arquivoExportado.getName() };
}

function exportarRelatorioPesquisaOcorrencias(usuarioLogin, payload) {
  payload = payload || {};
  var formato = String(payload.formato || 'PDF').toUpperCase();
  var rel = gerarRelatorioPesquisaOcorrencias(usuarioLogin, payload);
  var docPack = criarDocumentoRelatorioCasosPrioritarios_(rel.titulo, rel.pacote);
  var arquivoExportado = exportarGoogleDocFormatoCasosPrioritarios_(docPack.arquivoDoc.getId(), docPack.nomeBase, formato);
  return { sucesso: true, formato: formato, titulo: rel.titulo, texto: rel.texto, urlDocGoogle: docPack.arquivoDoc.getUrl(), urlArquivo: arquivoExportado.getUrl(), nomeArquivo: arquivoExportado.getName() };
}

// ============================================================================
// ============================================================================
// MÓDULO 6 - RELATÓRIO DE SERVIÇO EXTRAORDINÁRIO (BACKEND COMPLETO)
// Integrado ao frontend mod6 e aos indicadores de horas extras da Home.
// ============================================================================

var SERVICO_EXTRAORDINARIO_RECUPERACAO_BUILD = 'DEPATRI-RECUPERA-HOME-EXTRAS-20260805-01';

var SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG = {
  MODELO_DOC_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_MODELO_DOC_ID"),
  ABA_CONFIG: 'DB_CONFIG',
  ABA_DEMANDAS: 'DEMANDAS_ATIVAS',
  ABA_RELATORIOS: 'OPER_HORAS_EXTRAS',
  ABA_ITENS: 'OPER_HORAS_EXTRAS_ITENS',
  TIMEZONE: 'America/Fortaleza',
  MAX_POLICIAIS: 6,
  MAX_MODALIDADES_NUIP: 8
};

// ============================================================================
// API PÚBLICA CHAMADA PELO FRONTEND/HOME
// ============================================================================

function carregarDadosServicoExtraordinario(usuarioLogin) {
  var minhasHoras = listarMinhasHorasExtrasServicoExtra_(usuarioLogin);

  return {
    equipes: obterEquipesServicoExtra_(),
    equipesPorSetor: obterSetorPorEquipeServicoExtra_(),
    policiais: obterItensConfigIntel_('POLICIAIS_EXTRAS').map(function(item) {
      return item.nome;
    }),
    extraNuip: obterItensConfigIntel_('EXTRA_NUIP').map(function(item) {
      return item.nome;
    }),
    equipesApoiadas: obterItensConfigIntel_('APOIO_EQUIPE_EXTRA').map(function(item) {
      return item.nome;
    }),
    ocorrenciasRecentes: obterOcorrenciasRecentesServicoExtra_(),
    minhasHorasExtras: (minhasHoras && minhasHoras.itens) || [],
    minhasHorasAviso: (minhasHoras && minhasHoras.aviso) || '',
    resumoCicloAtual: obterResumoHorasExtrasCicloAtualUsuario_(usuarioLogin),
    build: SERVICO_EXTRAORDINARIO_RECUPERACAO_BUILD
  };
}

function obterResumoHorasExtrasCicloAtualUsuario_(usuarioLogin) {
  var cicloAtual = obterCicloExtraServicoExtra_(new Date());
  var leitura = lerHorasExtrasUsuarioServicoExtra_(usuarioLogin);

  if (!leitura.sucesso) {
    return {
      cicloAtual: cicloAtual,
      totalHoras: 0,
      quantidadeLancamentos: 0
    };
  }

  var totalHoras = 0;
  var quantidadeLancamentos = 0;

  (leitura.itens || []).forEach(function(item) {
    if (String(item.cicloExtra || '').trim() !== cicloAtual) return;
    totalHoras += numeroHorasServicoExtra_(item.totalHoras);
    quantidadeLancamentos++;
  });

  return {
    cicloAtual: cicloAtual,
    totalHoras: totalHoras,
    quantidadeLancamentos: quantidadeLancamentos
  };
}

function excluirMinhaHoraExtraServicoExtra(usuarioLogin, rowIndex) {
  try {
    var usuario = obterUsuarioPortalPorLogin_(usuarioLogin);
    var matriculaAlvo = normalizarMatriculaServicoExtra_(usuario && usuario.matricula);

    if (!matriculaAlvo) {
      return { sucesso: false, erro: 'Sua matrícula não está cadastrada na aba USUARIOS.' };
    }

    var linha = Number(rowIndex || 0);
    if (!linha || linha < 2) {
      return { sucesso: false, erro: 'Registro inválido para exclusão.' };
    }

    var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    var aba = ss.getSheetByName(SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.ABA_ITENS);
    if (!aba) {
      return { sucesso: false, erro: "Aba 'OPER_HORAS_EXTRAS_ITENS' não encontrada." };
    }

    if (linha > aba.getLastRow()) {
      return { sucesso: false, erro: 'A linha informada não existe mais.' };
    }

    var headersOriginais = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    var mapaHeaders = mapaHeadersServicoExtra_(headersOriginais);
    var idxMatricula = indiceHeaderServicoExtra_(mapaHeaders, ['MATRICULA_POLICIAL', 'MATRICULA']);

    if (idxMatricula < 0) {
      return {
        sucesso: false,
        erro: 'A aba OPER_HORAS_EXTRAS_ITENS não possui a coluna MATRICULA_POLICIAL.'
      };
    }

    var matriculaLinha = normalizarMatriculaServicoExtra_(
      aba.getRange(linha, idxMatricula + 1).getValue()
    );

    if (matriculaLinha !== matriculaAlvo) {
      return {
        sucesso: false,
        erro: 'Você só pode excluir registros vinculados à sua própria matrícula.'
      };
    }

    aba.deleteRow(linha);
    return { sucesso: true, mensagem: 'Registro excluído com sucesso.' };
  } catch (erro) {
    return { sucesso: false, erro: erro.toString() };
  }
}

function gerarPDFExtraordinario(payload) {
  var copiaTemporaria = null;

  try {
    payload = payload || {};
    validarPayloadServicoExtraordinario_(payload);
    validarEstruturaPersistenciaServicoExtra_();

    var modeloId = SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.MODELO_DOC_ID;
    var arquivoModelo = DriveApp.getFileById(modeloId);
    copiaTemporaria = arquivoModelo.makeCopy('TMP_SERVICO_EXTRA_' + new Date().getTime());

    var doc = DocumentApp.openById(copiaTemporaria.getId());
    var body = doc.getBody();
    var concatenacaoInformacoes = montarConcatenacaoInformacoesServicoExtra_(payload);
    var setorInferido = obterSetorInferidoServicoExtra_(payload.equipe);
    var dataMissaoBr = formatarDataBrServicoExtra_(payload.dataMissao);

    substituirTodasTagsServicoExtra_(body, {
      'SETOR': String(setorInferido || '').trim(),
      'EQUIPE': String(payload.equipe || '').trim(),
      'DATA INICIAL DA MISSÃO': dataMissaoBr,
      'DATA_INICIAL_DA_MISSAO': dataMissaoBr,
      'HORA_INICIO': String(payload.horaInicio || '').trim(),
      'DATA_INICIO': formatarDataBrServicoExtra_(payload.dataInicio),
      'HORA_TERMINO': String(payload.horaFim || '').trim(),
      'DATA_TERMINO': formatarDataBrServicoExtra_(payload.dataFim),
      'DATA_PREENCHIMENTO': formatarDataExtensoServicoExtra_(new Date())
    });

    preencherTextoTagMultiLinhaServicoExtra_(body, [
      'CONCATENACAO_INFORMACOES',
      'DESCRIÇÃO_ATIVIDADES',
      'DESCRICAO_ATIVIDADES'
    ], concatenacaoInformacoes);

    preencherPoliciaisNoTemplateServicoExtra_(body, payload.policiais || []);
    doc.saveAndClose();

    // Valida toda a gravação antes de criar registros permanentes.
    var linhasItens = prepararLinhasItensHorasExtrasServicoExtra_(payload);

    var arquivoPdf = DriveApp.getFileById(copiaTemporaria.getId()).getAs(MimeType.PDF);
    var nomeFinal = 'RELATORIO_SERVICO_EXTRAORDINARIO_' +
      Utilities.formatDate(new Date(), SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.TIMEZONE, 'yyyyMMdd_HHmmss') +
      '.pdf';

    var pasta = DriveApp.getFolderById(CONFIG.PASTA_DRIVE_ID);
    var pdfSalvo = pasta.createFile(arquivoPdf).setName(nomeFinal);

    salvarLinhaServicoExtraordinario_(payload, concatenacaoInformacoes);
    salvarItensHorasExtrasServicoExtra_(linhasItens);

    try { copiaTemporaria.setTrashed(true); } catch (ignorar) {}

    return {
      sucesso: true,
      url: pdfSalvo.getUrl(),
      nomeArquivo: nomeFinal,
      idArquivo: pdfSalvo.getId(),
      build: SERVICO_EXTRAORDINARIO_RECUPERACAO_BUILD
    };
  } catch (erro) {
    try {
      if (copiaTemporaria) copiaTemporaria.setTrashed(true);
    } catch (ignorarLimpeza) {}

    return { sucesso: false, erro: erro.toString() };
  }
}


function validarEstruturaPersistenciaServicoExtra_() {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var abaRelatorios = ss.getSheetByName(SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.ABA_RELATORIOS);
  var abaItens = ss.getSheetByName(SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.ABA_ITENS);

  if (!abaRelatorios) throw new Error("Aba 'OPER_HORAS_EXTRAS' não encontrada.");
  if (!abaItens) throw new Error("Aba 'OPER_HORAS_EXTRAS_ITENS' não encontrada.");
  if (abaRelatorios.getLastColumn() < 1) throw new Error("Aba 'OPER_HORAS_EXTRAS' sem cabeçalhos.");
  if (abaItens.getLastColumn() < 1) throw new Error("Aba 'OPER_HORAS_EXTRAS_ITENS' sem cabeçalhos.");

  var headersItens = abaItens.getRange(1, 1, 1, abaItens.getLastColumn()).getValues()[0];
  var mapaItens = mapaHeadersServicoExtra_(headersItens);
  var faltantes = [];

  if (indiceHeaderServicoExtra_(mapaItens, ['MATRICULA_POLICIAL', 'MATRICULA']) < 0) faltantes.push('MATRICULA_POLICIAL');
  if (indiceHeaderServicoExtra_(mapaItens, ['TOTAL_HORAS', 'HORAS']) < 0) faltantes.push('TOTAL_HORAS');
  if (indiceHeaderServicoExtra_(mapaItens, ['CICLO_EXTRA', 'CICLO']) < 0) faltantes.push('CICLO_EXTRA');
  if (indiceHeaderServicoExtra_(mapaItens, ['DATA_EXTRA', 'DATA_DA_EXTRA', 'DATA']) < 0) faltantes.push('DATA_EXTRA');

  if (faltantes.length) {
    throw new Error('A aba OPER_HORAS_EXTRAS_ITENS não possui: ' + faltantes.join(', ') + '.');
  }
}

// ============================================================================
// LEITURA ÚNICA DAS HORAS EXTRAS — USADA PELA HOME E PELO MÓDULO
// ============================================================================

function lerHorasExtrasUsuarioServicoExtra_(usuarioLogin) {
  var usuario;

  try {
    usuario = obterUsuarioPortalPorLogin_(usuarioLogin);
  } catch (erroUsuario) {
    return {
      sucesso: false,
      itens: [],
      aviso: 'Não foi possível identificar o usuário: ' + erroUsuario.toString()
    };
  }

  var matriculaAlvo = normalizarMatriculaServicoExtra_(usuario && usuario.matricula);
  if (!matriculaAlvo) {
    return {
      sucesso: false,
      itens: [],
      aviso: 'Sua matrícula não está cadastrada na aba USUARIOS.'
    };
  }

  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName(SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.ABA_ITENS);

  if (!aba) {
    return {
      sucesso: false,
      itens: [],
      aviso: "Aba 'OPER_HORAS_EXTRAS_ITENS' não encontrada."
    };
  }

  if (aba.getLastRow() < 2 || aba.getLastColumn() < 1) {
    return { sucesso: true, itens: [], aviso: '' };
  }

  var dados = aba.getDataRange().getValues();
  var headers = dados[0] || [];
  var mapaHeaders = mapaHeadersServicoExtra_(headers);

  var idxMatricula = indiceHeaderServicoExtra_(mapaHeaders, ['MATRICULA_POLICIAL', 'MATRICULA']);
  var idxData = indiceHeaderServicoExtra_(mapaHeaders, ['DATA_EXTRA', 'DATA_DA_EXTRA', 'DATA']);
  var idxHoras = indiceHeaderServicoExtra_(mapaHeaders, ['TOTAL_HORAS', 'HORAS']);
  var idxCiclo = indiceHeaderServicoExtra_(mapaHeaders, ['CICLO_EXTRA', 'CICLO']);

  var ausentes = [];
  if (idxMatricula < 0) ausentes.push('MATRICULA_POLICIAL');
  if (idxData < 0) ausentes.push('DATA_EXTRA');
  if (idxHoras < 0) ausentes.push('TOTAL_HORAS');
  if (idxCiclo < 0) ausentes.push('CICLO_EXTRA');

  if (ausentes.length) {
    return {
      sucesso: false,
      itens: [],
      aviso: 'A aba OPER_HORAS_EXTRAS_ITENS não possui: ' + ausentes.join(', ') + '.'
    };
  }

  var itens = [];

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    if (normalizarMatriculaServicoExtra_(row[idxMatricula]) !== matriculaAlvo) continue;

    itens.push({
      rowIndex: i + 1,
      dataExtra: formatarDataBrServicoExtra_(row[idxData]),
      totalHoras: numeroHorasServicoExtra_(row[idxHoras]),
      cicloExtra: String(row[idxCiclo] || '').trim()
    });
  }

  itens.sort(function(a, b) {
    var dataA = converterValorParaDataServicoExtra_(a.dataExtra);
    var dataB = converterValorParaDataServicoExtra_(b.dataExtra);
    var timeA = dataA ? dataA.getTime() : 0;
    var timeB = dataB ? dataB.getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    return Number(b.rowIndex || 0) - Number(a.rowIndex || 0);
  });

  return { sucesso: true, itens: itens, aviso: '' };
}

function listarMinhasHorasExtrasServicoExtra_(usuarioLogin) {
  var leitura = lerHorasExtrasUsuarioServicoExtra_(usuarioLogin);
  return {
    itens: (leitura && leitura.itens) || [],
    aviso: (leitura && leitura.aviso) || ''
  };
}

// ============================================================================
// CONFIGURAÇÕES E DADOS AUXILIARES DO MÓDULO
// ============================================================================

function obterEquipesServicoExtra_() {
  var mapa = obterSetorPorEquipeServicoExtra_();
  return Object.keys(mapa).sort(function(a, b) {
    return a.localeCompare(b, 'pt-BR');
  });
}

function obterSetorPorEquipeServicoExtra_() {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName(SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.ABA_CONFIG);
  if (!aba) throw new Error("Aba 'DB_CONFIG' não encontrada.");

  var dados = aba.getDataRange().getValues();
  if (!dados.length) return {};

  var headers = dados[0] || [];
  var mapaHeaders = mapaHeadersServicoExtra_(headers);
  var idxCategoria = indiceHeaderServicoExtra_(mapaHeaders, ['CATEGORIA']);
  var idxNome = indiceHeaderServicoExtra_(mapaHeaders, ['NOME']);
  var idxValorExtra = indiceHeaderServicoExtra_(mapaHeaders, ['VALOR_EXTRA']);

  if (idxCategoria < 0 || idxNome < 0 || idxValorExtra < 0) {
    throw new Error("A aba 'DB_CONFIG' precisa conter CATEGORIA, NOME e VALOR_EXTRA.");
  }

  var mapa = {};

  for (var i = 1; i < dados.length; i++) {
    var categoria = normalizarServicoExtra_(dados[i][idxCategoria]);
    var setor = String(dados[i][idxNome] || '').trim();
    var equipe = String(dados[i][idxValorExtra] || '').trim();

    if (categoria !== 'EQUIPE') continue;
    if (!setor || !equipe) continue;
    mapa[equipe] = setor;
  }

  return mapa;
}

function obterSetorInferidoServicoExtra_(equipe) {
  var mapa = obterSetorPorEquipeServicoExtra_();
  var equipeAlvo = normalizarServicoExtra_(equipe);
  var chaves = Object.keys(mapa);

  for (var i = 0; i < chaves.length; i++) {
    if (normalizarServicoExtra_(chaves[i]) === equipeAlvo) {
      return String(mapa[chaves[i]] || '').trim();
    }
  }

  return '';
}

function ehSetorNuipServicoExtra_(valor) {
  var txt = normalizarServicoExtra_(valor);
  return txt === 'NUIP' ||
    txt.indexOf('NUIP') !== -1 ||
    txt.indexOf('NUCLEO DE INTELIGENCIA') !== -1;
}

function obterOcorrenciasRecentesServicoExtra_() {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName(SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.ABA_DEMANDAS);
  if (!aba || aba.getLastRow() < 2) return [];

  var dados = aba.getDataRange().getValues();
  var headers = dados[0] || [];
  var mapaHeaders = mapaHeadersServicoExtra_(headers);

  var idxData = indiceHeaderServicoExtra_(mapaHeaders, ['DATA_DA_OCORRENCIA']);
  var idxConcat = indiceHeaderServicoExtra_(mapaHeaders, ['PROCEDIMENTO_CONCAT']);
  var idxTipo = indiceHeaderServicoExtra_(mapaHeaders, ['TIPO_PROCEDIMENTO']);
  var idxNumero = indiceHeaderServicoExtra_(mapaHeaders, ['NUMERO_PROCEDIMENTO']);

  var lista = [];
  var vistos = {};

  for (var i = 1; i < dados.length; i++) {
    var procedimento = idxConcat > -1 ? String(dados[i][idxConcat] || '').trim() : '';

    if (!procedimento && (idxTipo > -1 || idxNumero > -1)) {
      procedimento = [
        idxTipo > -1 ? String(dados[i][idxTipo] || '').trim() : '',
        idxNumero > -1 ? String(dados[i][idxNumero] || '').trim() : ''
      ].filter(Boolean).join(' Nº ');
    }

    if (!procedimento) continue;

    var chave = normalizarServicoExtra_(procedimento);
    if (vistos[chave]) continue;
    vistos[chave] = true;

    lista.push({
      procedimento: procedimento,
      data: idxData > -1 ? converterValorParaDataServicoExtra_(dados[i][idxData]) : null
    });
  }

  lista.sort(function(a, b) {
    var ta = a.data ? a.data.getTime() : 0;
    var tb = b.data ? b.data.getTime() : 0;
    return tb - ta;
  });

  return lista.slice(0, 150).map(function(item) {
    return item.procedimento;
  });
}

// ============================================================================
// CICLOS, HORAS, MATRÍCULAS E DATAS
// ============================================================================

function numeroHorasServicoExtra_(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;

  var txt = String(valor).trim();
  if (!txt) return 0;

  // Formatos HH:MM ou HH:MM:SS, caso existam em registros antigos.
  var hora = txt.match(/^(\d{1,3}):(\d{2})(?::(\d{2}))?$/);
  if (hora) {
    return Number(hora[1] || 0) +
      (Number(hora[2] || 0) / 60) +
      (Number(hora[3] || 0) / 3600);
  }

  txt = txt.replace(/\s*h(?:oras?)?\s*$/i, '').replace(',', '.');
  var n = Number(txt);
  return isNaN(n) ? 0 : n;
}

function formatarTotalHorasIndividualServicoExtra_(valor) {
  var horas = numeroHorasServicoExtra_(valor);
  if (Math.abs(horas % 1) < 0.000001) return String(Math.round(horas));
  return String(Math.round(horas * 100) / 100).replace('.', ',');
}

function normalizarMatriculaServicoExtra_(valor) {
  return String(valor || '').trim().toUpperCase().replace(/\s+/g, '');
}

function extrairMatriculaServicoExtra_(textoPolicial) {
  var texto = String(textoPolicial || '');
  var match = texto.match(/MATR[IÍ]CULA\s*[:\-]?\s*([0-9.\-Xx]+)/i);
  return match ? normalizarMatriculaServicoExtra_(match[1]) : '';
}

function extrairNomeServicoExtra_(textoPolicial) {
  var txt = String(textoPolicial || '').trim();
  if (!txt) return '';

  txt = txt.replace(/\s*[-–—]?\s*MATR[IÍ]CULA\s*[:\-]?\s*[0-9.\-Xx]+\s*$/i, '').trim();
  return txt;
}

function converterValorParaDataServicoExtra_(valor) {
  if (!valor && valor !== 0) return null;

  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
    return new Date(valor.getTime());
  }

  if (typeof valor === 'number' && isFinite(valor)) {
    // Serial de data do Google Sheets/Excel.
    var base = new Date(Date.UTC(1899, 11, 30));
    return new Date(base.getTime() + Math.round(valor * 86400000));
  }

  var txt = String(valor).trim();
  if (!txt) return null;

  var iso = txt.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (iso) {
    return new Date(
      Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]),
      Number(iso[4] || 0), Number(iso[5] || 0), Number(iso[6] || 0)
    );
  }

  var br = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    return new Date(
      Number(br[3]), Number(br[2]) - 1, Number(br[1]),
      Number(br[4] || 0), Number(br[5] || 0), Number(br[6] || 0)
    );
  }

  var interpretada = new Date(txt);
  return isNaN(interpretada.getTime()) ? null : interpretada;
}

function formatarDataBrServicoExtra_(valor) {
  var data = converterValorParaDataServicoExtra_(valor);
  if (!data) return String(valor || '');
  return Utilities.formatDate(
    data,
    SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.TIMEZONE,
    'dd/MM/yyyy'
  );
}

function formatarDataExtensoServicoExtra_(valor) {
  var data = converterValorParaDataServicoExtra_(valor);
  if (!data) return String(valor || '');

  var meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  return data.getDate() + ' de ' + meses[data.getMonth()] + ' de ' + data.getFullYear();
}

function formatarDataHoraBrServicoExtra_(data, hora) {
  return formatarDataBrServicoExtra_(data) + ' ' + String(hora || '').trim();
}

function obterCicloExtraServicoExtra_(valor) {
  var data = converterValorParaDataServicoExtra_(valor);
  if (!data) return '';

  var dia = data.getDate();
  var mes = data.getMonth() + 1;

  if ((mes === 12 && dia >= 21) || (mes === 1 && dia <= 20)) return '21/DEZ a 20/JAN – CICLO 1';
  if ((mes === 1 && dia >= 21) || (mes === 2 && dia <= 20)) return '21/JAN a 20/FEV – CICLO 2';
  if ((mes === 2 && dia >= 21) || (mes === 3 && dia <= 20)) return '21/FEV a 20/MAR – CICLO 3';
  if ((mes === 3 && dia >= 21) || (mes === 4 && dia <= 20)) return '21/MAR a 20/ABR – CICLO 4';
  if ((mes === 4 && dia >= 21) || (mes === 5 && dia <= 20)) return '21/ABR a 20/MAI – CICLO 5';
  if ((mes === 5 && dia >= 21) || (mes === 6 && dia <= 20)) return '21/MAI a 20/JUN – CICLO 6';
  if ((mes === 6 && dia >= 21) || (mes === 7 && dia <= 20)) return '21/JUN a 20/JUL – CICLO 7';
  if ((mes === 7 && dia >= 21) || (mes === 8 && dia <= 20)) return '21/JUL a 20/AGO – CICLO 8';
  if ((mes === 8 && dia >= 21) || (mes === 9 && dia <= 20)) return '21/AGO a 20/SET – CICLO 9';
  if ((mes === 9 && dia >= 21) || (mes === 10 && dia <= 20)) return '21/SET a 20/OUT – CICLO 10';
  if ((mes === 10 && dia >= 21) || (mes === 11 && dia <= 20)) return '21/OUT a 20/NOV – CICLO 11';
  return '21/NOV a 20/DEZ – CICLO 12';
}

// ============================================================================
// VALIDAÇÃO E DESCRIÇÃO DAS ATIVIDADES
// ============================================================================

function validarPayloadServicoExtraordinario_(payload) {
  if (!payload) throw new Error('Dados do serviço extraordinário não informados.');

  if (!String(payload.equipe || '').trim()) throw new Error('Informe a equipe.');
  if (!String(payload.dataMissao || '').trim()) throw new Error('Informe a data da missão.');
  if (!String(payload.dataInicio || '').trim()) throw new Error('Informe a data de início.');
  if (!String(payload.horaInicio || '').trim()) throw new Error('Informe a hora de início.');
  if (!String(payload.dataFim || '').trim()) throw new Error('Informe a data de término.');
  if (!String(payload.horaFim || '').trim()) throw new Error('Informe a hora de término.');

  var inicio = dataHoraServicoExtra_(payload.dataInicio, payload.horaInicio);
  var fim = dataHoraServicoExtra_(payload.dataFim, payload.horaFim);
  if (!inicio || !fim) throw new Error('Data ou hora inválida no período informado.');
  if (fim.getTime() <= inicio.getTime()) {
    throw new Error('O término deve ser posterior ao início do serviço.');
  }

  var policiais = payload.policiais || [];
  if (!policiais.length) throw new Error('Informe ao menos um policial.');
  if (policiais.length > SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.MAX_POLICIAIS) {
    throw new Error('O limite máximo é de 6 policiais.');
  }

  var vistos = {};
  policiais.forEach(function(policial, indice) {
    var nome = String(policial && policial.nome || '').trim();
    var horas = numeroHorasServicoExtra_(policial && policial.totalHoras);

    if (!nome) throw new Error('Informe o policial ' + (indice + 1) + '.');
    if (!(horas > 0)) throw new Error('Informe as horas do policial ' + (indice + 1) + '.');

    var chave = normalizarServicoExtra_(nome);
    if (vistos[chave]) throw new Error('O mesmo policial foi informado mais de uma vez.');
    vistos[chave] = true;

    var matricula = resolverMatriculaPolicialServicoExtra_(nome);
    if (!matricula) {
      throw new Error('Não foi possível identificar a matrícula de: ' + nome + '.');
    }
  });

  var setorInferido = obterSetorInferidoServicoExtra_(payload.equipe);
  var descricaoLivre = String(payload.descricaoLivre || '').trim();
  var nuipItens = obterNuipItensServicoExtra_(payload);

  if (nuipItens.length > SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.MAX_MODALIDADES_NUIP) {
    throw new Error('O limite máximo é de 8 modalidades NUIP.');
  }

  if (ehSetorNuipServicoExtra_(setorInferido) || ehSetorNuipServicoExtra_(payload.equipe)) {
    if (!nuipItens.length && !descricaoLivre) {
      throw new Error('No NUIP, preencha ao menos uma modalidade ou a descrição das atividades.');
    }

    nuipItens.forEach(function(item, idx) {
      var opcaoNorm = normalizarServicoExtra_(item.opcaoNuip);
      if (!opcaoNorm) throw new Error('Selecione a modalidade NUIP ' + (idx + 1) + '.');

      if (opcaoNorm === normalizarServicoExtra_('APOIO EM INVESTIGAÇÃO DE SEGUIMENTO')) {
        if (!String(item.equipeApoiada || '').trim()) {
          throw new Error('Informe a equipe apoiada da modalidade NUIP ' + (idx + 1) + '.');
        }
        if (normalizarServicoExtra_(item.equipeApoiada) === 'OUTRA' && !String(item.equipeApoiadaOutra || '').trim()) {
          throw new Error('Informe qual é a equipe apoiada da modalidade NUIP ' + (idx + 1) + '.');
        }
        if (!obterOcorrenciaResolvidaServicoExtra_(item)) {
          throw new Error('Informe a ocorrência da modalidade NUIP ' + (idx + 1) + '.');
        }
      }

      if (opcaoNorm === normalizarServicoExtra_('PRODUÇÃO DE RT')) {
        if (!String(item.numRt || '').trim()) {
          throw new Error('Informe o número do RT da modalidade NUIP ' + (idx + 1) + '.');
        }
        if (!obterOcorrenciaResolvidaServicoExtra_(item)) {
          throw new Error('Informe a ocorrência da modalidade NUIP ' + (idx + 1) + '.');
        }
      }
    });
  } else if (!descricaoLivre) {
    throw new Error('Descreva as atividades desenvolvidas.');
  }
}

function dataHoraServicoExtra_(dataTexto, horaTexto) {
  var data = converterValorParaDataServicoExtra_(dataTexto);
  var match = String(horaTexto || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!data || !match) return null;

  data.setHours(Number(match[1]), Number(match[2]), Number(match[3] || 0), 0);
  return isNaN(data.getTime()) ? null : data;
}

function obterNuipItensServicoExtra_(payload) {
  var itens = Array.isArray(payload && payload.nuipItens) ? payload.nuipItens : [];

  return itens.map(function(item) {
    return {
      opcaoNuip: String(item && item.opcaoNuip || '').trim(),
      equipeApoiada: String(item && item.equipeApoiada || '').trim(),
      equipeApoiadaOutra: String(item && item.equipeApoiadaOutra || '').trim(),
      numOcorrencia: String(item && item.numOcorrencia || '').trim(),
      numOcorrenciaOutro: String(item && item.numOcorrenciaOutro || '').trim(),
      numRt: String(item && item.numRt || '').trim()
    };
  }).filter(function(item) {
    return !!(
      item.opcaoNuip || item.equipeApoiada || item.equipeApoiadaOutra ||
      item.numOcorrencia || item.numOcorrenciaOutro || item.numRt
    );
  });
}

function obterOcorrenciaResolvidaServicoExtra_(item) {
  var valor = String(item && item.numOcorrencia || '').trim();
  if (normalizarServicoExtra_(valor) === 'OUTRO') {
    return String(item && item.numOcorrenciaOutro || '').trim();
  }
  return valor;
}

function montarConcatenacaoInformacoesServicoExtra_(payload) {
  return numerarLinhasServicoExtra_(montarLinhasConcatenadasServicoExtra_(payload));
}

function montarDescricaoServicoExtraordinario_(payload) {
  return montarConcatenacaoInformacoesServicoExtra_(payload);
}

function montarLinhasConcatenadasServicoExtra_(payload) {
  var setorInferido = obterSetorInferidoServicoExtra_(payload.equipe);
  var descricaoLivre = String(payload.descricaoLivre || '').trim();
  var linhas = [];

  if (ehSetorNuipServicoExtra_(setorInferido) || ehSetorNuipServicoExtra_(payload.equipe)) {
    obterNuipItensServicoExtra_(payload).forEach(function(item) {
      var texto = montarTextoModalidadeNuipServicoExtra_(item);
      if (texto) linhas.push(texto);
    });
  }

  if (descricaoLivre) linhas.push(descricaoLivre);
  return linhas;
}

function numerarLinhasServicoExtra_(linhas) {
  return (linhas || [])
    .map(function(texto) { return String(texto || '').trim(); })
    .filter(Boolean)
    .map(function(texto, indice) { return (indice + 1) + '. ' + texto; })
    .join('\n');
}

function montarTextoModalidadeNuipServicoExtra_(item) {
  var textoBase = obterTextoBaseCategoriaENomeServicoExtra_('EXTRA_NUIP', item.opcaoNuip);
  var equipeApoiada = item.equipeApoiadaOutra
    ? String(item.equipeApoiadaOutra || '').trim()
    : String(item.equipeApoiada || '').trim();

  return substituirTagsServicoExtra_(textoBase, {
    '{{NOME_DA_EQUIPE}}': equipeApoiada,
    '{{NUMERO_DA_OCORRENCIA}}': obterOcorrenciaResolvidaServicoExtra_(item),
    '{{NUMERO_DO_PROCEDIMENTO}}': obterOcorrenciaResolvidaServicoExtra_(item),
    '{{Nº_RT}}': String(item.numRt || '').trim(),
    '{{NUM_RT}}': String(item.numRt || '').trim(),
    '{{NUMERO_DO_RT}}': String(item.numRt || '').trim()
  }).trim();
}

function obterTextoBaseCategoriaENomeServicoExtra_(categoria, nome) {
  var itens = obterItensConfigIntel_(categoria);
  var nomeNorm = normalizarServicoExtra_(nome);

  for (var i = 0; i < itens.length; i++) {
    if (normalizarServicoExtra_(itens[i].nome) === nomeNorm) {
      return String(itens[i].valorExtra || itens[i].modalidade || itens[i].nome || '').trim();
    }
  }

  return String(nome || '').trim();
}

function substituirTagsServicoExtra_(texto, mapa) {
  var saida = String(texto || '');
  Object.keys(mapa || {}).forEach(function(chave) {
    saida = saida.split(chave).join(String(mapa[chave] || ''));
  });
  return saida;
}

// ============================================================================
// DOCUMENTO, ASSINATURAS E TAGS
// ============================================================================

function substituirTodasTagsServicoExtra_(body, mapaTags) {
  Object.keys(mapaTags || {}).forEach(function(chave) {
    body.replaceText(
      escaparRegexServicoExtra_('{{' + chave + '}}'),
      String(mapaTags[chave] == null ? '' : mapaTags[chave])
    );
  });
}

function preencherTextoTagMultiLinhaServicoExtra_(body, tags, texto) {
  (tags || []).forEach(function(tag) {
    body.replaceText(
      escaparRegexServicoExtra_('{{' + tag + '}}'),
      String(texto || '')
    );
  });
}

function preencherPoliciaisNoTemplateServicoExtra_(body, policiais) {
  for (var i = 1; i <= SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.MAX_POLICIAIS; i++) {
    var policial = (policiais || [])[i - 1] || null;
    var nomeSelecionado = policial ? String(policial.nome || '').trim() : '';

    body.replaceText(
      escaparRegexServicoExtra_('{{DADOS_POLICIAL_' + i + '}}'),
      nomeSelecionado ? montarDadosPolicialServicoExtra_(nomeSelecionado) : ''
    );

    body.replaceText(
      escaparRegexServicoExtra_('{{TOTAL_HORAS_' + i + '}}'),
      policial ? formatarTotalHorasIndividualServicoExtra_(policial.totalHoras) : ''
    );

    var assinaturaBlob = nomeSelecionado
      ? obterAssinaturaPolicialServicoExtra_(nomeSelecionado)
      : null;

    if (assinaturaBlob) {
      inserirImagemNaTagServicoExtra_(body, '{{ASSINATURA_POLICIAL_' + i + '}}', assinaturaBlob);
    } else {
      body.replaceText(
        escaparRegexServicoExtra_('{{ASSINATURA_POLICIAL_' + i + '}}'),
        ''
      );
    }
  }
}

function montarDadosPolicialServicoExtra_(nomeSelecionado) {
  var itens = obterItensConfigIntel_('POLICIAIS_EXTRAS');
  var alvo = normalizarServicoExtra_(nomeSelecionado);

  for (var i = 0; i < itens.length; i++) {
    if (normalizarServicoExtra_(itens[i].nome) === alvo) {
      return String(itens[i].nome || '').trim();
    }
  }

  return String(nomeSelecionado || '').trim();
}

function obterAssinaturaPolicialServicoExtra_(nomeSelecionado) {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName(SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.ABA_CONFIG);
  if (!aba) return null;

  var dados = aba.getDataRange().getValues();
  if (!dados.length) return null;

  var headers = dados[0] || [];
  var mapaHeaders = mapaHeadersServicoExtra_(headers);
  var idxCategoria = indiceHeaderServicoExtra_(mapaHeaders, ['CATEGORIA']);
  var idxNome = indiceHeaderServicoExtra_(mapaHeaders, ['NOME']);
  var idxValorExtra = indiceHeaderServicoExtra_(mapaHeaders, ['VALOR_EXTRA']);

  if (idxCategoria < 0 || idxNome < 0 || idxValorExtra < 0) return null;

  var alvo = normalizarServicoExtra_(nomeSelecionado);

  for (var i = 1; i < dados.length; i++) {
    if (normalizarServicoExtra_(dados[i][idxCategoria]) !== 'POLICIAIS_EXTRAS') continue;
    if (normalizarServicoExtra_(dados[i][idxNome]) !== alvo) continue;
    return blobDaAssinaturaServicoExtra_(dados[i][idxValorExtra]);
  }

  return null;
}

function blobDaAssinaturaServicoExtra_(valor) {
  try {
    if (!valor) return null;

    if (typeof valor === 'object' && typeof valor.getContentUrl === 'function') {
      var urlImagem = valor.getContentUrl();
      return urlImagem ? UrlFetchApp.fetch(urlImagem).getBlob() : null;
    }

    var txt = String(valor || '').trim();
    if (!txt) return null;

    var matchDrive = txt.match(/[-\w]{25,}/);
    if (/drive\.google\.com|docs\.google\.com/i.test(txt) && matchDrive) {
      return DriveApp.getFileById(matchDrive[0]).getBlob();
    }

    if (/^[-\w]{25,}$/.test(txt)) {
      return DriveApp.getFileById(txt).getBlob();
    }

    if (/^data:image\//i.test(txt)) {
      var partes = txt.split(',');
      var mime = (partes[0].match(/^data:(.*?);base64$/i) || [])[1] || 'image/png';
      return Utilities.newBlob(Utilities.base64Decode(partes[1]), mime, 'assinatura');
    }

    if (/^https?:\/\//i.test(txt)) {
      return UrlFetchApp.fetch(txt).getBlob();
    }
  } catch (ignorar) {}

  return null;
}

function inserirImagemNaTagServicoExtra_(body, tag, blob) {
  try {
    var encontrado = body.findText(escaparRegexServicoExtra_(tag));
    if (!encontrado) return;

    var elementoTexto = encontrado.getElement().asText();
    var pai = elementoTexto.getParent();

    if (pai && pai.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var paragrafo = pai.asParagraph();
      paragrafo.clear();
      paragrafo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      paragrafo.setSpacingBefore(0);
      paragrafo.setSpacingAfter(0);
      redimensionarAssinaturaServicoExtra_(paragrafo.appendInlineImage(blob));
      return;
    }

    elementoTexto.deleteText(encontrado.getStartOffset(), encontrado.getEndOffsetInclusive());
  } catch (ignorar) {}
}

function redimensionarAssinaturaServicoExtra_(imagem) {
  if (!imagem) return;

  var larguraOriginal = Number(imagem.getWidth() || 0);
  var alturaOriginal = Number(imagem.getHeight() || 0);
  if (!(larguraOriginal > 0) || !(alturaOriginal > 0)) return;

  var novaLargura = 180;
  var novaAltura = Math.round((alturaOriginal / larguraOriginal) * novaLargura);
  imagem.setWidth(novaLargura);
  imagem.setHeight(novaAltura);
}

function escaparRegexServicoExtra_(texto) {
  return String(texto || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// GRAVAÇÃO NAS ABAS EXISTENTES
// ============================================================================

function salvarLinhaServicoExtraordinario_(payload, concatenacaoInformacoes) {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName(SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.ABA_RELATORIOS);
  if (!aba) throw new Error("Aba 'OPER_HORAS_EXTRAS' não encontrada.");
  if (aba.getLastColumn() < 1) throw new Error("Aba 'OPER_HORAS_EXTRAS' sem cabeçalhos.");

  var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var mapaHeaders = mapaHeadersServicoExtra_(headers);
  var linha = new Array(headers.length).fill('');
  var policiais = payload.policiais || [];
  var nuipItens = obterNuipItensServicoExtra_(payload);

  function setCampo(aliases, valor) {
    var idx = indiceHeaderServicoExtra_(mapaHeaders, aliases);
    if (idx < 0) return;
    linha[idx] = valor == null ? '' : valor;
  }

  for (var p = 0; p < SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.MAX_POLICIAIS; p++) {
    setCampo(['CHAVE_POLICIAL_' + (p + 1)], policiais[p] ? String(policiais[p].nome || '').trim() : '');
  }

  setCampo(['CHAVE_POLICIAL'], policiais.map(function(item) {
    return String(item.nome || '').trim();
  }).filter(Boolean).join(' | '));

  setCampo(['CHAVE_SETOR', 'SETOR'], String(obterSetorInferidoServicoExtra_(payload.equipe) || '').trim());
  setCampo(['CHAVE_EQUIPE', 'EQUIPE'], String(payload.equipe || '').trim());
  setCampo(['DATA_EXTRA'], formatarDataBrServicoExtra_(payload.dataMissao));
  setCampo(['INICIO'], formatarDataHoraBrServicoExtra_(payload.dataInicio, payload.horaInicio));
  setCampo(['FIM'], formatarDataHoraBrServicoExtra_(payload.dataFim, payload.horaFim));
  setCampo(['TOTAL_HORAS'], policiais.map(function(item, idx) {
    return 'P' + (idx + 1) + ': ' + formatarTotalHorasIndividualServicoExtra_(item.totalHoras);
  }).join(' | '));
  setCampo(['RESUMO_OU_SEGUIMENTO'], concatenacaoInformacoes);
  setCampo(['DESCRICAO_ATIVIDADES', 'DESCRIÇÃO_ATIVIDADES'], String(payload.descricaoLivre || '').trim());
  setCampo(['EQUIPE_APOIADA'], nuipItens.map(function(item) {
    return item.equipeApoiadaOutra || item.equipeApoiada || '';
  }).filter(Boolean).join(' | '));
  setCampo(['NUM_OCORRENCIA'], nuipItens.map(function(item) {
    return obterOcorrenciaResolvidaServicoExtra_(item);
  }).filter(Boolean).join(' | '));
  setCampo(['NUM_RT'], nuipItens.map(function(item) {
    return String(item.numRt || '').trim();
  }).filter(Boolean).join(' | '));
  setCampo(['USUARIO', 'USUARIO_LOGIN'], String(payload.usuarioLogin || '').trim());
  setCampo(['DATA_REGISTRO', 'TIMESTAMP'], new Date());

  for (var m = 0; m < SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.MAX_MODALIDADES_NUIP; m++) {
    setCampo(['MODALIDADE_NUIP_' + (m + 1)], nuipItens[m] ? montarTextoModalidadeNuipServicoExtra_(nuipItens[m]) : '');
  }

  aba.appendRow(linha);
}

function prepararLinhasItensHorasExtrasServicoExtra_(payload) {
  var usuarioLogin = String(payload.usuarioLogin || '').trim();
  var setor = String(obterSetorInferidoServicoExtra_(payload.equipe) || '').trim();
  var equipe = String(payload.equipe || '').trim();
  var dataExtra = formatarDataBrServicoExtra_(payload.dataMissao);
  var cicloExtra = obterCicloExtraServicoExtra_(payload.dataMissao);

  return (payload.policiais || []).map(function(policial) {
    var nomeCompleto = String(policial.nome || '').trim();
    var matricula = resolverMatriculaPolicialServicoExtra_(nomeCompleto);

    if (!matricula) {
      throw new Error('Não foi possível identificar a matrícula de: ' + nomeCompleto + '.');
    }

    return {
      matricula: matricula,
      nome: extrairNomeServicoExtra_(nomeCompleto),
      policialCompleto: nomeCompleto,
      totalHoras: numeroHorasServicoExtra_(policial.totalHoras),
      dataExtra: dataExtra,
      cicloExtra: cicloExtra,
      setor: setor,
      equipe: equipe,
      usuarioLogin: usuarioLogin,
      inicio: formatarDataHoraBrServicoExtra_(payload.dataInicio, payload.horaInicio),
      fim: formatarDataHoraBrServicoExtra_(payload.dataFim, payload.horaFim)
    };
  });
}

function salvarItensHorasExtrasServicoExtra_(itens) {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName(SERVICO_EXTRAORDINARIO_RECUPERACAO_CFG.ABA_ITENS);
  if (!aba) throw new Error("Aba 'OPER_HORAS_EXTRAS_ITENS' não encontrada.");
  if (aba.getLastColumn() < 1) throw new Error("Aba 'OPER_HORAS_EXTRAS_ITENS' sem cabeçalhos.");

  var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var mapaHeaders = mapaHeadersServicoExtra_(headers);
  var obrigatorios = {
    matricula: indiceHeaderServicoExtra_(mapaHeaders, ['MATRICULA_POLICIAL', 'MATRICULA']),
    horas: indiceHeaderServicoExtra_(mapaHeaders, ['TOTAL_HORAS', 'HORAS']),
    ciclo: indiceHeaderServicoExtra_(mapaHeaders, ['CICLO_EXTRA', 'CICLO']),
    data: indiceHeaderServicoExtra_(mapaHeaders, ['DATA_EXTRA', 'DATA_DA_EXTRA', 'DATA'])
  };

  var faltantes = [];
  if (obrigatorios.matricula < 0) faltantes.push('MATRICULA_POLICIAL');
  if (obrigatorios.horas < 0) faltantes.push('TOTAL_HORAS');
  if (obrigatorios.ciclo < 0) faltantes.push('CICLO_EXTRA');
  if (obrigatorios.data < 0) faltantes.push('DATA_EXTRA');
  if (faltantes.length) {
    throw new Error('A aba OPER_HORAS_EXTRAS_ITENS não possui: ' + faltantes.join(', ') + '.');
  }

  var linhas = (itens || []).map(function(item) {
    var linha = new Array(headers.length).fill('');

    function setCampo(aliases, valor) {
      var idx = indiceHeaderServicoExtra_(mapaHeaders, aliases);
      if (idx < 0) return;
      linha[idx] = valor == null ? '' : valor;
    }

    setCampo(['MATRICULA_POLICIAL', 'MATRICULA'], item.matricula);
    setCampo(['NOME_POLICIAL', 'POLICIAL', 'CHAVE_POLICIAL'], item.policialCompleto || item.nome);
    setCampo(['TOTAL_HORAS', 'HORAS'], item.totalHoras);
    setCampo(['CICLO_EXTRA', 'CICLO'], item.cicloExtra);
    setCampo(['DATA_EXTRA', 'DATA_DA_EXTRA', 'DATA'], item.dataExtra);
    setCampo(['CHAVE_SETOR', 'SETOR'], item.setor);
    setCampo(['CHAVE_EQUIPE', 'EQUIPE'], item.equipe);
    setCampo(['USUARIO', 'USUARIO_LOGIN'], item.usuarioLogin);
    setCampo(['INICIO'], item.inicio);
    setCampo(['FIM'], item.fim);
    setCampo(['DATA_REGISTRO', 'TIMESTAMP'], new Date());

    return linha;
  });

  if (linhas.length) {
    aba.getRange(aba.getLastRow() + 1, 1, linhas.length, headers.length).setValues(linhas);
  }
}

function resolverMatriculaPolicialServicoExtra_(nomeSelecionado) {
  var direta = extrairMatriculaServicoExtra_(nomeSelecionado);
  if (direta) return direta;

  var nomeAlvo = normalizarServicoExtra_(extrairNomeServicoExtra_(nomeSelecionado));
  if (!nomeAlvo) return '';

  // Primeiro procura na própria configuração usada para montar a lista de policiais.
  var itens = obterItensConfigIntel_('POLICIAIS_EXTRAS');
  for (var i = 0; i < itens.length; i++) {
    if (normalizarServicoExtra_(extrairNomeServicoExtra_(itens[i].nome)) !== nomeAlvo) continue;
    var matriculaConfig = extrairMatriculaServicoExtra_(itens[i].nome);
    if (matriculaConfig) return matriculaConfig;
  }

  // Fallback na estrutura já existente da aba USUARIOS.
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var abaUsuarios = ss.getSheetByName('USUARIOS');
  if (!abaUsuarios || abaUsuarios.getLastRow() < 2) return '';

  var dados = abaUsuarios.getDataRange().getValues();
  var headers = dados[0] || [];
  var mapaHeaders = mapaHeadersServicoExtra_(headers);
  var idxNome = indiceHeaderServicoExtra_(mapaHeaders, ['NOME', 'NOME_COMPLETO']);
  var idxMatricula = indiceHeaderServicoExtra_(mapaHeaders, ['MATRICULA', 'MATRÍCULA']);

  // Fallback compatível com a estrutura atual: B = nome; H = matrícula.
  if (idxNome < 0) idxNome = 1;
  if (idxMatricula < 0) idxMatricula = 7;

  for (var u = 1; u < dados.length; u++) {
    if (normalizarServicoExtra_(dados[u][idxNome]) === nomeAlvo) {
      return normalizarMatriculaServicoExtra_(dados[u][idxMatricula]);
    }
  }

  return '';
}

// ============================================================================
// UTILITÁRIOS DE CABEÇALHOS/NORMALIZAÇÃO
// ============================================================================

function normalizarServicoExtra_(valor) {
  if (typeof normalizarDesenvDemandas_ === 'function') {
    return normalizarDesenvDemandas_(valor);
  }

  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function mapaHeadersServicoExtra_(headers) {
  var mapa = {};
  (headers || []).forEach(function(header, indice) {
    var chave = normalizarServicoExtra_(header).replace(/\s+/g, '_');
    if (chave && mapa[chave] === undefined) mapa[chave] = indice;
  });
  return mapa;
}

function indiceHeaderServicoExtra_(mapa, aliases) {
  for (var i = 0; i < (aliases || []).length; i++) {
    var chave = normalizarServicoExtra_(aliases[i]).replace(/\s+/g, '_');
    if (mapa[chave] !== undefined) return mapa[chave];
  }
  return -1;
}

// ============================================================================
// MÓDULO DASHBOARD DEMANDAS - DEMANDAS ATIVAS + APOIOS TÉCNICOS NUIP
// ============================================================================

var DASH_DEMANDAS_CFG = {
  APOIOS_NUIP_SHEET_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_APOIOS_NUIP_SHEET_ID"),
  MESES: ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'],
  DELEGACIAS: ['MEU CELULAR', 'DRFV', 'DRF', 'DAS', 'DDF'],
  EQUIPES_NO: ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO']
};

function normDashDemandas_(v) {
  return String(v || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function validarAcessoDashboardDemandas_(usuarioLogin) {
  var usuario = obterUsuarioPortalPorLogin_(usuarioLogin);
  var perfil = normalizarDesenvDemandas_(usuario && usuario.perfil);
  var lotacao = normalizarDesenvDemandas_((usuario && (usuario.lotacao || usuario.delegacia)) || '');

  var permitido =
    perfil === 'ADMIN' ||
    perfil === 'CRIADOR/ADMIN' ||
    perfil === 'CRIADOR ADMIN' ||
    perfil === 'ADMINISTRADOR' ||
    perfil.indexOf('DIRECAO') > -1 ||
    perfil.indexOf('DIRETORIA') > -1 ||
    perfil.indexOf('ADMINISTRATIVO') > -1 ||
    perfil.indexOf('NUIP') > -1 ||
    lotacao.indexOf('NUIP') > -1;

  if (!permitido) {
    throw new Error('Seu perfil não possui acesso ao Dashboard Demandas.');
  }

  return usuario;
}

function numDashDemandas_(v) {
  var n = Number(String(v || '0').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function dataDashDemandas_(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return v;

  var txt = String(v).trim();
  var iso = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  var br = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));

  return null;
}

function passaPeriodoDashDemandas_(data, filtros) {
  if (!data) return false;
  filtros = filtros || {};

  if (filtros.dataInicio || filtros.dataFim) {
    var ini = filtros.dataInicio ? dataDashDemandas_(filtros.dataInicio) : null;
    var fim = filtros.dataFim ? dataDashDemandas_(filtros.dataFim) : null;
    if (ini && data < ini) return false;
    if (fim) {
      fim.setHours(23, 59, 59, 999);
      if (data > fim) return false;
    }
    return true;
  }

  if (filtros.ano) {
    if (data.getFullYear() !== Number(filtros.ano)) return false;
  }

  if (filtros.mes) {
    var mesNorm = normDashDemandas_(filtros.mes);
    var idxMes = DASH_DEMANDAS_CFG.MESES.indexOf(mesNorm);
    if (idxMes > -1 && data.getMonth() !== idxMes) return false;
  }

  return true;
}

function obterValorLinhaDashDemandas_(row, headers, aliases) {
  var idx = obterIndiceColunaPorAlias_(headers, aliases);
  return idx > -1 ? row[idx] : '';
}

function contarApoioNuipPorTipo_(solicitacaoNorm, tipo) {
  var t = normDashDemandas_(tipo);

  if (t === 'ANÁLISE DE IMAGENS' || t === 'ANALISE DE IMAGENS') {
    return solicitacaoNorm.indexOf('ANALISE DE IMAGEM') > -1 || solicitacaoNorm.indexOf('ANALISE DE IMAGENS') > -1;
  }

  if (t === 'CONFECÇÃO DE RELATÓRIOS' || t === 'CONFECCAO DE RELATORIOS') {
    return solicitacaoNorm.indexOf('RELATORIO') > -1;
  }

  if (t.indexOf('CONSULTAS SISTEMAS POLICIAIS') > -1) {
    return ['SIP', 'SPORTAL', 'SIGEPEN', 'SIP3W', 'CONSULTA INTEGRADA', 'INFOSEG'].some(function(x) {
      return solicitacaoNorm.indexOf(normDashDemandas_(x)) > -1;
    });
  }

  if (t.indexOf('LEVANTAMENTO DE ALVO') > -1) {
    return solicitacaoNorm.indexOf('LEVANTAMENTO') > -1 || solicitacaoNorm.indexOf('ALVO') > -1 || solicitacaoNorm.indexOf('DISTRIBUICAO') > -1;
  }

  if (t.indexOf('OPERADORAS') > -1 || t.indexOf('PROVEDORAS') > -1) {
    return solicitacaoNorm.indexOf('OPERADORA') > -1 || solicitacaoNorm.indexOf('TELEFONE') > -1 || solicitacaoNorm.indexOf('TELEFONIA') > -1 || solicitacaoNorm.indexOf('PROVEDOR') > -1 || solicitacaoNorm.indexOf('INTERNET') > -1;
  }

  if (t.indexOf('EMPRESAS') > -1 || t.indexOf('ORGAOS PUBLICOS') > -1) {
    return solicitacaoNorm.indexOf('OFICIO') > -1 && !(
      solicitacaoNorm.indexOf('OPERADORA') > -1 ||
      solicitacaoNorm.indexOf('TELEFON') > -1 ||
      solicitacaoNorm.indexOf('PROVEDOR') > -1 ||
      solicitacaoNorm.indexOf('INTERNET') > -1
    );
  }

  if (t.indexOf('RECONHECIMENTO FACIAL') > -1) {
    return solicitacaoNorm.indexOf('RECONHECIMENTO FACIAL') > -1 || solicitacaoNorm.indexOf('CEOS') > -1 || solicitacaoNorm.indexOf('PCA') > -1;
  }

  if (t.indexOf('AGILIS') > -1 || t.indexOf('ALERTA') > -1 || t.indexOf('CORTEX') > -1) {
    return solicitacaoNorm.indexOf('AGILIS') > -1 || solicitacaoNorm.indexOf('ALERTA') > -1 || solicitacaoNorm.indexOf('CORTEX') > -1;
  }

  return false;
}

function obterBootstrapDashboardDemandas(usuarioLogin) {
  var usuario = validarAcessoDashboardDemandas_(usuarioLogin);

  var solicitantes = [];
  var vistos = {};

  function addSolicitante_(valor) {
    var nome = String(valor || '').trim();
    if (!nome) return;

    var chave = normDashDemandas_(nome);
    if (!vistos[chave]) {
      vistos[chave] = true;
      solicitantes.push(nome);
    }
  }

  // PLANILHA EXTERNA NUIP
  try {
    var ssApoios = SpreadsheetApp.openById(DASH_DEMANDAS_CFG.APOIOS_NUIP_SHEET_ID);
    var abaApoios = ssApoios.getSheets()[0];
    var dadosApoios = abaApoios.getDataRange().getValues();

    for (var i = 1; i < dadosApoios.length; i++) {
      addSolicitante_(dadosApoios[i][2]); // COLUNA C - SOLICITANTE
    }
  } catch (e) {}

  // PLANILHA MÃE - INTEL_OFICIOS
  try {
    var idMae = (typeof CONFIG !== 'undefined' && CONFIG.PLANILHA_MAE_ID)
      ? CONFIG.PLANILHA_MAE_ID
      : obterConfiguracaoPrivadaPortal_("DEPATRI_PLANILHA_MAE_ID");

    var ssMae = SpreadsheetApp.openById(idMae);
    var abaOficios = ssMae.getSheetByName('INTEL_OFICIOS');
    if (abaOficios) {
      var dadosOficios = abaOficios.getDataRange().getValues();

      for (var j = 1; j < dadosOficios.length; j++) {
        addSolicitante_(dadosOficios[j][5]); // COLUNA F - EQUIPE
      }
    }
  } catch (e2) {}

  solicitantes.sort(function(a, b) {
    return a.localeCompare(b, 'pt-BR');
  });

  return {
    sucesso: true,
    meses: DASH_DEMANDAS_CFG.MESES,
    anos: [2024, 2025, 2026, 2027],
    delegacias: DASH_DEMANDAS_CFG.DELEGACIAS,
    equipes: DASH_DEMANDAS_CFG.EQUIPES_NO,
    solicitantes: solicitantes,
    usuario: {
      perfil: usuario.perfil,
      lotacao: usuario.lotacao || usuario.delegacia || '',
      equipe: usuario.equipe || ''
    }
  };
}

function obterDashboardDemandasDados(usuarioLogin, filtros) {
  filtros = filtros || {};
  var usuario = validarAcessoDashboardDemandas_(usuarioLogin);

  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName('DEMANDAS_ATIVAS');
  if (!aba) throw new Error("Aba 'DEMANDAS_ATIVAS' não encontrada.");

  var dados = aba.getDataRange().getValues();
  var headers = dados[0];

  var idxData = obterIndiceColunaPorAlias_(headers, ['DATA_DA_OCORRENCIA']);
  var idxUnidade = obterIndiceColunaPorAlias_(headers, ['UNIDADE_RESPONSAVEL']);
  var idxEquipe = obterIndiceColunaPorAlias_(headers, ['EQUIPE_DIRETORIA', 'EQUIPE']);

  var k = {
    demandas: 0,
    suspeitosIdentificados: 0,
    suspeitosPresos: 0,
    ocorrenciasComPrisao: 0,
    veiculosIdentificados: 0,
    veiculosRecuperados: 0,
    veiculosApreendidos: 0,
    armasApreendidas: 0,
    relatoriosTecnicos: 0
  };

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var data = dataDashDemandas_(idxData > -1 ? row[idxData] : '');
    if (!passaPeriodoDashDemandas_(data, filtros)) continue;

    var unidade = normDashDemandas_(idxUnidade > -1 ? row[idxUnidade] : '');
    var equipe = normDashDemandas_(idxEquipe > -1 ? row[idxEquipe] : '');

    var tipoFiltro = normDashDemandas_(filtros.tipoFiltro);
    var valorFiltro = normDashDemandas_(filtros.valorFiltro);

    if (tipoFiltro === 'DELEGACIA' && valorFiltro && unidade !== valorFiltro) continue;
    if (tipoFiltro === 'NUCLEO OPERACIONAL' && valorFiltro && equipe !== valorFiltro) continue;
    if (tipoFiltro === 'NUIP' && unidade.indexOf('NUIP') === -1 && equipe.indexOf('NUIP') === -1) continue;

    var suspeitosPresos = numDashDemandas_(obterValorLinhaDashDemandas_(row, headers, ['SUSPEITOS_PRESOS_QTD']));
    k.demandas++;
    k.suspeitosIdentificados += numDashDemandas_(obterValorLinhaDashDemandas_(row, headers, ['SUSPEITOS_IDENTIFICADOS_QTD']));
    k.suspeitosPresos += suspeitosPresos;
    if (suspeitosPresos > 0) k.ocorrenciasComPrisao++;
    k.veiculosIdentificados += numDashDemandas_(obterValorLinhaDashDemandas_(row, headers, ['VEICULOS_SUSPEITOS_IDENTIFICADOS_QTD']));
    k.veiculosRecuperados += numDashDemandas_(obterValorLinhaDashDemandas_(row, headers, ['VEICULOS_RECUPERADOS_QTD']));
    k.veiculosApreendidos += numDashDemandas_(obterValorLinhaDashDemandas_(row, headers, ['VEICULOS_APREENDIDOS_QTD']));
    k.armasApreendidas += numDashDemandas_(obterValorLinhaDashDemandas_(row, headers, ['ARMAS_APREENDIDAS_QTD']));
    k.relatoriosTecnicos += numDashDemandas_(obterValorLinhaDashDemandas_(row, headers, ['RELATORIO_TECNICO_QTD']));
  }

  var apoios = obterApoiosTecnicosNuipDashboard_(filtros);

  return {
    sucesso: true,
    atualizadoEm: Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy HH:mm'),
    demandas: k,
    apoiosNuip: apoios
  };
}

function obterApoiosTecnicosNuipDashboard_(filtros) {
  filtros = filtros || {};

  var tiposExternos = [
    'ANÁLISE DE IMAGENS',
    'CONFECÇÃO DE RELATÓRIOS',
    'CONSULTAS SISTEMAS POLICIAIS',
    'LEVANTAMENTO DE ALVO / DISTRIBUIÇÃO DE LEVANTAMENTO',
    'RECONHECIMENTO FACIAL - CÉOS / PCA',
    'SISTEMA AGILIS, ALERTA, CÓRTEX'
  ];

  var tiposOficios = [
    'OFÍCIOS OPERADORAS DE TELEFONE E PROVEDORAS DE INTERNET',
    'OFÍCIO DE SOLICITAÇÃO DE DADOS PARA EMPRESAS OU ÓRGÃOS PÚBLICOS',
    'OFÍCIOS DE SOLICITAÇÃO DE IMAGENS'
  ];

  var todosTipos = tiposExternos.concat(tiposOficios);

  var contagem = {};
  todosTipos.forEach(function(t) {
    contagem[t] = 0;
  });

  var total = 0;
  var rankingSolicitantes = {};

  var solicitanteFiltro = normDashDemandas_(filtros.solicitanteNuip);
  var tipoSolicitacaoFiltro = normDashDemandas_(filtros.tipoSolicitacaoNuip);

  function normalizarNomeRankingNuip_(nome) {
  var original = String(nome || '').trim();
  var n = normDashDemandas_(original);

  if (n === 'ALFA' || n === 'EQUIPE ALFA') return 'EQUIPE ALFA';
  if (n === 'BRAVO' || n === 'EQUIPE BRAVO') return 'EQUIPE BRAVO';
  if (n === 'CHARLIE' || n === 'EQUIPE CHARLIE') return 'EQUIPE CHARLIE';
  if (n === 'DELTA' || n === 'EQUIPE DELTA') return 'EQUIPE DELTA';
  if (n === 'ECHO' || n === 'EQUIPE ECHO') return 'EQUIPE ECHO';

  if (n === 'NUIP' || n === 'EQUIPE NUIP' || n === 'NUCLEO DE INTELIGENCIA') return 'NUIP';

  if (n === 'DIRETORIA DEPATRI' || n === 'DIRECAO DEPATRI' || n === 'DIREÇÃO DEPATRI') {
    return 'DIRETORIA DEPATRI';
  }

  return original || 'NÃO INFORMADO';
}

function somarRanking_(nome, qtd) {
  nome = normalizarNomeRankingNuip_(nome);
  qtd = Number(qtd || 0);

  var chave = normDashDemandas_(nome);

  if (!rankingSolicitantes[chave]) {
    rankingSolicitantes[chave] = {
      nome: nome,
      qtd: 0
    };
  }

  rankingSolicitantes[chave].qtd += qtd;
}

  function cardOficioIntel_(tipoDocumento) {
    var tipo = normDashDemandas_(tipoDocumento);

    if (
      tipo === 'OFICIO EMPRESA DE TELEFONIA' ||
      tipo === 'OFICIO PROVEDOR DE INTERNET'
    ) {
      return 'OFÍCIOS OPERADORAS DE TELEFONE E PROVEDORAS DE INTERNET';
    }

    if (
      tipo === 'OFICIO IFOOD' ||
      tipo === 'OFICIO LOCADORA PELA PLACA' ||
      tipo === 'OFICIO LOCADORA PELO ENDERECO'
    ) {
      return 'OFÍCIO DE SOLICITAÇÃO DE DADOS PARA EMPRESAS OU ÓRGÃOS PÚBLICOS';
    }

    if (
      tipo === 'OFICIO DE IMAGENS' ||
      tipo === 'OFICIOS DE IMAGENS'
    ) {
      return 'OFÍCIOS DE SOLICITAÇÃO DE IMAGENS';
    }

    return '';
  }

  // ========================================================================
  // 1) PLANILHA EXTERNA NUIP
  // ID: configurar nas propriedades do projeto
  // B = DATA | C = SOLICITANTE | D = SOLICITAÇÃO
  // ========================================================================

  var ssApoios = SpreadsheetApp.openById(DASH_DEMANDAS_CFG.APOIOS_NUIP_SHEET_ID);
  var abaApoios = ssApoios.getSheets()[0];
  var dadosApoios = abaApoios.getDataRange().getValues();

  for (var i = 1; i < dadosApoios.length; i++) {
    var dataApoio = dataDashDemandas_(dadosApoios[i][1]);       // COLUNA B
    var solicitante = String(dadosApoios[i][2] || '').trim();   // COLUNA C
    var solicitacao = String(dadosApoios[i][3] || '').trim();   // COLUNA D

    if (!solicitacao) continue;
    if (!passaPeriodoDashDemandas_(dataApoio, filtros)) continue;
    if (solicitanteFiltro && normDashDemandas_(solicitante) !== solicitanteFiltro) continue;

    var solNorm = normDashDemandas_(solicitacao);
    var qtdLinha = 0;

    tiposExternos.forEach(function(tipoCard) {
      if (tipoSolicitacaoFiltro && normDashDemandas_(tipoCard) !== tipoSolicitacaoFiltro) return;

      if (contarApoioNuipPorTipo_(solNorm, tipoCard)) {
        contagem[tipoCard]++;
        qtdLinha++;
      }
    });

    if (qtdLinha > 0) {
      total += qtdLinha;
      somarRanking_(solicitante, qtdLinha);
    }
  }

  // ========================================================================
  // 2) PLANILHA MÃE - INTEL_OFICIOS
  // ID: configurar nas propriedades do projeto
  // C = DATA_GERACAO | E = TIPO DE DOCUMENTO | F = EQUIPE
  // ========================================================================

  var idMae = (typeof CONFIG !== 'undefined' && CONFIG.PLANILHA_MAE_ID)
    ? CONFIG.PLANILHA_MAE_ID
    : obterConfiguracaoPrivadaPortal_("DEPATRI_PLANILHA_MAE_ID");

  var ssMae = SpreadsheetApp.openById(idMae);
  var abaOficios = ssMae.getSheetByName('INTEL_OFICIOS');

  if (abaOficios) {
    var dadosOficios = abaOficios.getDataRange().getValues();

    for (var j = 1; j < dadosOficios.length; j++) {
      var dataOficio = dataDashDemandas_(dadosOficios[j][2]);        // COLUNA C
      var tipoDocumento = String(dadosOficios[j][4] || '').trim();   // COLUNA E
      var equipe = String(dadosOficios[j][5] || '').trim();          // COLUNA F

      if (!tipoDocumento) continue;
      if (!passaPeriodoDashDemandas_(dataOficio, filtros)) continue;
      if (solicitanteFiltro && normDashDemandas_(equipe) !== solicitanteFiltro) continue;

      var cardOficio = cardOficioIntel_(tipoDocumento);
      if (!cardOficio) continue;

      if (tipoSolicitacaoFiltro && normDashDemandas_(cardOficio) !== tipoSolicitacaoFiltro) continue;

      contagem[cardOficio]++;
      total++;
      somarRanking_(equipe, 1);
    }
  }

  var rankingOrdenado = Object.keys(rankingSolicitantes).map(function(k) {
    return rankingSolicitantes[k];
  }).sort(function(a, b) {
    if (b.qtd !== a.qtd) return b.qtd - a.qtd;
    return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
  });

  return {
    total: total,
    cards: todosTipos.map(function(t) {
      return {
        titulo: t,
        valor: contagem[t] || 0
      };
    }),
    rankingSolicitantes: rankingOrdenado
  };
}

// ============================================================================
// MÓDULO RELATÓRIO GERENCIAL - ATIVIDADES OPERACIONAIS E APOIO TÉCNICO
// ============================================================================

var REL_GERENCIAL_CFG = {
  TEMPLATE_PROP: 'TEMPLATE_RELATORIO_GERENCIAL_DOC_ID',
  OUTPUT_FOLDER_PROP: 'OUTPUT_RELATORIO_GERENCIAL_FOLDER_ID',

  // IDs informados pelo usuário
  TEMPLATE_PADRAO_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_TEMPLATE_PADRAO_ID"),
  OUTPUT_FOLDER_PADRAO_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_OUTPUT_FOLDER_PADRAO_ID"),

  PLANILHA_APOIOS_NUIP_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_APOIOS_NUIP_SHEET_ID"),
  TIMEZONE: 'America/Fortaleza'
};

function validarPermissaoRelatorioGerencial_(usuarioLogin) {
  if (!usuarioLogin) throw new Error('Usuário não identificado.');

  var usuario = obterUsuarioPortalPorLogin_(usuarioLogin);
  var perfil = normalizarTextoRelGerencial_(usuario && usuario.perfil);
  var lotacao = normalizarTextoRelGerencial_((usuario && (usuario.lotacao || usuario.delegacia)) || '');

  var permitido =
    perfil === 'ADMIN' ||
    perfil === 'CRIADOR/ADMIN' ||
    perfil === 'CRIADOR ADMIN' ||
    perfil.indexOf('DIRECAO') > -1 ||
    perfil.indexOf('DIRETORIA') > -1 ||
    perfil.indexOf('NUIP') > -1 ||
    perfil.indexOf('ADMINISTRATIVO') > -1 ||
    lotacao.indexOf('DIRECAO') > -1 ||
    lotacao.indexOf('DIRETORIA') > -1 ||
    lotacao.indexOf('NUIP') > -1 ||
    lotacao.indexOf('ADMINISTRATIVO') > -1;

  if (!permitido) {
    throw new Error('Seu perfil não possui permissão para gerar o Relatório Gerencial.');
  }

  return usuario;
}

function coletarApoiosNuipRelGerencial_(periodo) {
  var ret = {
    total: 0,
    porTipo: {},
    porSolicitante: {},
    linhasDetalhadas: []
  };

  try {
    var ss = SpreadsheetApp.openById(REL_GERENCIAL_CFG.PLANILHA_APOIOS_NUIP_ID);
    var aba = ss.getSheets()[0];
    var dados = aba.getDataRange().getValues();

    for (var i = 1; i < dados.length; i++) {
      var data = parseDataFlexRelGerencial_(dados[i][1]);       // B = DATA
      var solicitante = textoRelGerencial_(dados[i][2]);        // C = SOLICITANTE
      var solicitacao = textoRelGerencial_(dados[i][3]);        // D = SOLICITAÇÃO

      if (!solicitacao) continue;
      if (!dataDentroPeriodoRelGerencial_(data, periodo)) continue;

      var tipo = classificarApoioNuipRelGerencial_(solicitacao);
      ret.total++;

      if (!ret.porTipo[tipo]) ret.porTipo[tipo] = 0;
      ret.porTipo[tipo]++;

      var solicitanteFinal = solicitante || 'NÃO INFORMADO';
      if (!ret.porSolicitante[solicitanteFinal]) ret.porSolicitante[solicitanteFinal] = 0;
      ret.porSolicitante[solicitanteFinal]++;

      ret.linhasDetalhadas.push({
        data: formatarDataRelGerencial_(data),
        solicitante: solicitanteFinal,
        tipo: tipo,
        solicitacao: solicitacao
      });
    }
  } catch (e) {
    ret.erro = 'Não foi possível acessar a planilha externa de apoios NUIP: ' + e.toString();
  }

  ret.listaTipos = ordenarMapaRelGerencial_(ret.porTipo, 20);
  ret.listaSolicitantes = ordenarMapaRelGerencial_(ret.porSolicitante, 20);

  return ret;
}

function classificarApoioNuipRelGerencial_(solicitacao) {
  var t = normalizarTextoRelGerencial_(solicitacao);

  if (t.indexOf('IMAGEM') > -1 || t.indexOf('VIDEO') > -1 || t.indexOf('CAMERA') > -1 || t.indexOf('CFTV') > -1) {
    return 'ANÁLISE DE IMAGENS';
  }

  if (t.indexOf('RELATORIO') > -1) {
    return 'CONFECÇÃO DE RELATÓRIOS NUIP';
  }

  if (t.indexOf('CONSULTA') > -1 || t.indexOf('SISTEMA') > -1 || t.indexOf('INFOSEG') > -1 || t.indexOf('SINESP') > -1) {
    return 'CONSULTAS A SISTEMAS POLICIAIS';
  }

  if (t.indexOf('LEVANTAMENTO') > -1 || t.indexOf('ALVO') > -1 || t.indexOf('DISTRIBUICAO') > -1) {
    return 'LEVANTAMENTO DE ALVO / DISTRIBUIÇÃO';
  }

  if (t.indexOf('RECONHECIMENTO') > -1 || t.indexOf('FACIAL') > -1 || t.indexOf('CEOS') > -1 || t.indexOf('PCA') > -1) {
    return 'RECONHECIMENTO FACIAL CÉOS/PCA';
  }

  if (t.indexOf('AGILIS') > -1 || t.indexOf('ALERTA') > -1 || t.indexOf('CORTEX') > -1) {
    return 'AGILIS / ALERTA / CÓRTEX';
  }

  if (t.indexOf('TORNOZEL') > -1) {
    return 'VERIFICAÇÃO DE TORNOZELADOS';
  }

  if (t.indexOf('SIP3W') > -1 || (t.indexOf('MANDADO') > -1 && t.indexOf('CADAST') > -1)) {
    return 'CADASTRO DE MANDADO NO SIP3W';
  }

  if (t.indexOf('SIMPE') > -1) {
    return 'CONSULTA SIMPE';
  }

  return 'OUTROS APOIOS TÉCNICOS';
}

function montarIndicadoresRelGerencial_(demAt, demAnt, nuipAt, nuipAnt, ofAt, ofAnt) {
  function metrica(atual, anterior) {
    return {
      atual: atual,
      anterior: anterior,
      variacaoTexto: variacaoTextoRelGerencial_(atual, anterior),
      tendencia: tendenciaRelGerencial_(atual, anterior)
    };
  }

  return {
    demandas: metrica(demAt.total, demAnt.total),
    suspeitosIdentificados: metrica(demAt.suspeitosIdentificados, demAnt.suspeitosIdentificados),
    suspeitosPresos: metrica(demAt.suspeitosPresos, demAnt.suspeitosPresos),
    ocorrenciasComPrisao: metrica(demAt.ocorrenciasComPrisao, demAnt.ocorrenciasComPrisao),
    veiculosIdentificados: metrica(demAt.veiculosIdentificados, demAnt.veiculosIdentificados),
    veiculosRecuperados: metrica(demAt.veiculosRecuperados, demAnt.veiculosRecuperados),
    veiculosApreendidos: metrica(demAt.veiculosApreendidos, demAnt.veiculosApreendidos),
    armasApreendidas: metrica(demAt.armasApreendidas, demAnt.armasApreendidas),
    relatoriosTecnicos: metrica(demAt.relatoriosTecnicos, demAnt.relatoriosTecnicos),
    apoiosNuip: metrica(nuipAt.total, nuipAnt.total),
    oficios: metrica(ofAt.total, ofAnt.total)
  };
}


function tabelaExecutivaRelGerencial_(dados) {
  var i = dados.indicadores;

  return [
    ['Indicador', 'Período atual', 'Período anterior', 'Variação', 'Tendência'],
    ['Demandas ativas trabalhadas', i.demandas.atual, i.demandas.anterior, i.demandas.variacaoTexto, i.demandas.tendencia],
    ['Suspeitos identificados', i.suspeitosIdentificados.atual, i.suspeitosIdentificados.anterior, i.suspeitosIdentificados.variacaoTexto, i.suspeitosIdentificados.tendencia],
    ['Suspeitos presos', i.suspeitosPresos.atual, i.suspeitosPresos.anterior, i.suspeitosPresos.variacaoTexto, i.suspeitosPresos.tendencia],
    ['Ocorrências com prisão', i.ocorrenciasComPrisao.atual, i.ocorrenciasComPrisao.anterior, i.ocorrenciasComPrisao.variacaoTexto, i.ocorrenciasComPrisao.tendencia],
    ['Veículos identificados', i.veiculosIdentificados.atual, i.veiculosIdentificados.anterior, i.veiculosIdentificados.variacaoTexto, i.veiculosIdentificados.tendencia],
    ['Veículos recuperados', i.veiculosRecuperados.atual, i.veiculosRecuperados.anterior, i.veiculosRecuperados.variacaoTexto, i.veiculosRecuperados.tendencia],
    ['Veículos apreendidos', i.veiculosApreendidos.atual, i.veiculosApreendidos.anterior, i.veiculosApreendidos.variacaoTexto, i.veiculosApreendidos.tendencia],
    ['Armas apreendidas', i.armasApreendidas.atual, i.armasApreendidas.anterior, i.armasApreendidas.variacaoTexto, i.armasApreendidas.tendencia],
    ['Relatórios técnicos produzidos', i.relatoriosTecnicos.atual, i.relatoriosTecnicos.anterior, i.relatoriosTecnicos.variacaoTexto, i.relatoriosTecnicos.tendencia],
    ['Apoios técnicos NUIP', i.apoiosNuip.atual, i.apoiosNuip.anterior, i.apoiosNuip.variacaoTexto, i.apoiosNuip.tendencia],
    ['Ofícios e mandados gerados', i.oficios.atual, i.oficios.anterior, i.oficios.variacaoTexto, i.oficios.tendencia]
  ];
}


function tabelaCrimesRelGerencial_(lista) {
  var rows = [['Crime mais investigado', 'Quantidade de demandas']];
  (lista || []).forEach(function(item) {
    rows.push([item.nome, item.valor]);
  });
  return rows;
}

function tabelaMapaComparativoRelGerencial_(mapAtual, mapAnterior, tituloPrimeiraColuna) {
  var rows = [[tituloPrimeiraColuna, 'Período atual', 'Período anterior', 'Variação', 'Tendência']];
  var chaves = {};

  Object.keys(mapAtual || {}).forEach(function(k) { chaves[k] = true; });
  Object.keys(mapAnterior || {}).forEach(function(k) { chaves[k] = true; });

  var lista = Object.keys(chaves).map(function(k) {
    return {
      nome: k,
      atual: Number(mapAtual[k] || 0),
      anterior: Number(mapAnterior[k] || 0)
    };
  });

  lista.sort(function(a, b) {
    if (b.atual !== a.atual) return b.atual - a.atual;
    return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  });

  lista.forEach(function(item) {
    rows.push([
      item.nome,
      item.atual,
      item.anterior,
      variacaoTextoRelGerencial_(item.atual, item.anterior),
      tendenciaRelGerencial_(item.atual, item.anterior)
    ]);
  });

  return rows;
}

function graficoVeiculosRelGerencial_(dados) {
  return criarGraficoColunaRelGerencial_(
    'Veículos identificados x veículos apreendidos',
    ['Indicador', 'Quantidade'],
    [
      ['Veículos identificados', dados.demandas.atual.veiculosIdentificados],
      ['Veículos apreendidos', dados.demandas.atual.veiculosApreendidos]
    ]
  );
}


function inserirGraficoNaTagRelGerencial_(body, tag, blob) {
  if (!blob) {
    substituirTagUnicaRelGerencial_(body, tag, 'Não houve dados suficientes para gerar o gráfico.');
    return;
  }

  var found = body.findText('\\{\\{' + tag + '\\}\\}');
  if (!found) return;

  var text = found.getElement().asText();
  text.deleteText(found.getStartOffset(), found.getEndOffsetInclusive());

  var paragraph = found.getElement().getParent();
  var parent = paragraph.getParent();

  if (parent.getType() !== DocumentApp.ElementType.BODY_SECTION) {
    paragraph.appendInlineImage(blob);
    return;
  }

  var bodyParent = parent.asBody();
  var idx = bodyParent.getChildIndex(paragraph);
  var imagem = bodyParent.insertImage(idx + 1, blob);

  try {
    imagem.setWidth(620);
  } catch (e) {}

  if (paragraph.asParagraph().getText().trim() === '') {
    bodyParent.removeChild(paragraph);
  }
}

function substituirTagsSimplesRelGerencial_(body, tags) {
  Object.keys(tags || {}).forEach(function(tag) {
    substituirTagUnicaRelGerencial_(body, tag, tags[tag]);
  });
}

function substituirTagUnicaRelGerencial_(body, tag, valor) {
  var texto = String(valor === null || valor === undefined || valor === '' ? 'Não houve registro no período' : valor);
  body.replaceText('\\{\\{' + tag + '\\}\\}', texto);
}

function aplicarEstiloTabelaRelGerencial_(tabela) {
  if (!tabela) return;

  for (var r = 0; r < tabela.getNumRows(); r++) {
    var row = tabela.getRow(r);

    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      cell.setPaddingTop(3);
      cell.setPaddingBottom(3);
      cell.setPaddingLeft(4);
      cell.setPaddingRight(4);

      try {
        cell.editAsText().setFontSize(8);
      } catch (e) {}

      if (r === 0) {
        cell.setBackgroundColor('#D9EAF7');
        try {
          cell.editAsText().setBold(true);
        } catch (e2) {}
      }
    }
  }
}

function normalizarRowsTabelaRelGerencial_(rows) {
  rows = rows || [];

  return rows.map(function(row) {
    row = row || [];

    return row.map(function(cell) {
      if (typeof cell === 'number') {
        return formatarNumeroRelGerencial_(cell, 0);
      }

      var texto = String(cell === null || cell === undefined ? '' : cell).trim();

      // O Google Docs não aceita célula de tabela totalmente vazia.
      // Por isso, quando não houver informação, usamos travessão.
      if (!texto) return '—';

      return texto;
    });
  });
}


function sheetToObjectsRelGerencial_(sheet) {
  if (!sheet) return [];

  var dados = sheet.getDataRange().getValues();
  if (!dados || dados.length <= 1) return [];

  var headers = dados[0].map(function(h) { return String(h || '').trim(); });
  var lista = [];

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var vazio = true;
    var obj = {};

    for (var j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;
      obj[headers[j]] = row[j];

      if (row[j] !== '' && row[j] !== null && row[j] !== undefined) {
        vazio = false;
      }
    }

    if (!vazio) lista.push(obj);
  }

  return lista;
}

function valorObjRelGerencial_(obj, aliases) {
  aliases = aliases || [];
  var keys = Object.keys(obj || {});

  for (var a = 0; a < aliases.length; a++) {
    var alvo = normalizarTextoRelGerencial_(aliases[a]);

    for (var k = 0; k < keys.length; k++) {
      if (normalizarTextoRelGerencial_(keys[k]) === alvo) {
        return obj[keys[k]];
      }
    }
  }

  return '';
}

function textoRelGerencial_(valor) {
  return String(valor === null || valor === undefined ? '' : valor).trim();
}

function dataObjRelGerencial_(obj, aliases) {
  return parseDataFlexRelGerencial_(valorObjRelGerencial_(obj, aliases));
}

function parseDataIsoRelGerencial_(valor) {
  var txt = String(valor || '').trim();
  var m = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function parseDataFlexRelGerencial_(valor) {
  if (!valor) return null;

  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
    return inicioDiaRelGerencial_(valor);
  }

  var txt = String(valor).trim();

  var mIso = txt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) {
    return new Date(Number(mIso[1]), Number(mIso[2]) - 1, Number(mIso[3]));
  }

  var mBr = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (mBr) {
    return new Date(Number(mBr[3]), Number(mBr[2]) - 1, Number(mBr[1]));
  }

  return null;
}

function dataDentroPeriodoRelGerencial_(data, periodo) {
  if (!data) return false;

  var d = inicioDiaRelGerencial_(data).getTime();
  var ini = inicioDiaRelGerencial_(periodo.inicio).getTime();
  var fim = inicioDiaRelGerencial_(periodo.fim).getTime();

  return d >= ini && d <= fim;
}

function inicioDiaRelGerencial_(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function formatarDataRelGerencial_(data) {
  if (!data) return '';
  return Utilities.formatDate(data, REL_GERENCIAL_CFG.TIMEZONE, 'dd/MM/yyyy');
}

function numeroRelGerencial_(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;

  var txt = String(valor).trim().replace(/[^\d,.-]/g, '');
  if (!txt) return 0;

  if (txt.indexOf(',') > -1 && txt.indexOf('.') > -1) {
    txt = txt.replace(/\./g, '').replace(',', '.');
  } else if (txt.indexOf(',') > -1) {
    txt = txt.replace(',', '.');
  }

  var n = Number(txt);
  return isNaN(n) ? 0 : n;
}

function normalizarTextoRelGerencial_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function formatarNumeroRelGerencial_(valor, casas) {
  var n = Number(valor || 0);
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: casas || 0,
    maximumFractionDigits: casas || 0
  });
}

function formatarPercentualRelGerencial_(valor) {
  return formatarNumeroRelGerencial_(valor || 0, 2) + '%';
}

function variacaoTextoRelGerencial_(atual, anterior) {
  atual = Number(atual || 0);
  anterior = Number(anterior || 0);

  if (anterior === 0 && atual > 0) return 'novo registro no período';
  if (anterior === 0 && atual === 0) return '0,00%';

  var v = ((atual - anterior) / anterior) * 100;
  return formatarNumeroRelGerencial_(v, 2) + '%';
}

function tendenciaRelGerencial_(atual, anterior) {
  atual = Number(atual || 0);
  anterior = Number(anterior || 0);

  if (atual === anterior) return 'ESTÁVEL';
  if (atual > anterior) return 'AUMENTO';
  return 'REDUÇÃO';
}

function ordenarMapaRelGerencial_(mapa, limite) {
  var lista = Object.keys(mapa || {}).map(function(k) {
    return { nome: k, valor: Number(mapa[k] || 0) };
  });

  lista.sort(function(a, b) {
    if (b.valor !== a.valor) return b.valor - a.valor;
    return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  });

  if (limite && lista.length > limite) lista = lista.slice(0, limite);
  return lista;
}

function mapToArrayRelGerencial_(mapa) {
  return Object.keys(mapa || {}).map(function(k) {
    return mapa[k];
  });
}

function ordenarObjetosRelGerencial_(lista, campo) {
  lista = lista || [];
  lista.sort(function(a, b) {
    var va = Number(a[campo] || 0);
    var vb = Number(b[campo] || 0);
    if (vb !== va) return vb - va;
    return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
  });
  return lista;
}

function temValorGraficoRelGerencial_(rows) {
  for (var i = 0; i < rows.length; i++) {
    for (var j = 1; j < rows[i].length; j++) {
      if (Number(rows[i][j] || 0) > 0) return true;
    }
  }
  return false;
}

function extrairJsonRelGerencial_(texto) {
  texto = String(texto || '').trim();
  var ini = texto.indexOf('{');
  var fim = texto.lastIndexOf('}');
  if (ini === -1 || fim === -1 || fim <= ini) throw new Error('Resposta da IA não trouxe JSON válido.');
  return texto.slice(ini, fim + 1);
}

function limparTextoIaRelGerencial_(texto) {
  return String(texto || '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .trim();
}

// ============================================================================
// CORREÇÃO RELATÓRIO GERENCIAL - COMPATIBILIDADE COM TEMPLATE REAL DE TAGS
// Observação: este bloco sobrescreve as funções anteriores do relatório gerencial
// para preencher as tags do modelo Modelo_Relatorio_Gerencial_DEPATRI_TAGS.
// ============================================================================

function estruturaDemandasRelGerencial_(rows) {
  var ret = {
    total: rows.length,
    evoluidas: 0,
    naoEvoluidas: 0,
    suspeitosIdentificados: 0,
    suspeitosPresos: 0,
    ocorrenciasComPrisao: 0,
    veiculosIdentificados: 0,
    veiculosRecuperados: 0,
    veiculosApreendidos: 0,
    armasApreendidas: 0,
    relatoriosTecnicos: 0,
    taxaPrisaoSuspeitos: 0,
    porEquipe: {},
    porUnidade: {},
    crimes: {},
    linhasDetalhadas: []
  };

  rows.forEach(function(row) {
    var suspeitosIdent = numeroRelGerencial_(valorObjRelGerencial_(row, ['SUSPEITOS_IDENTIFICADOS_QTD']));
    var suspeitosPresos = numeroRelGerencial_(valorObjRelGerencial_(row, ['SUSPEITOS_PRESOS_QTD']));
    var veiculosIdent = numeroRelGerencial_(valorObjRelGerencial_(row, ['VEICULOS_SUSPEITOS_IDENTIFICADOS_QTD']));
    var veiculosRec = numeroRelGerencial_(valorObjRelGerencial_(row, ['VEICULOS_RECUPERADOS_QTD']));
    var veiculosApr = numeroRelGerencial_(valorObjRelGerencial_(row, ['VEICULOS_APREENDIDOS_QTD']));
    var armas = numeroRelGerencial_(valorObjRelGerencial_(row, ['ARMAS_APREENDIDAS_QTD']));
    var relTec = numeroRelGerencial_(valorObjRelGerencial_(row, ['RELATORIO_TECNICO_QTD']));

    var statusDemanda = normalizarTextoRelGerencial_(valorObjRelGerencial_(row, ['STATUS_DEMANDA']));
    var evoluida = statusDemanda === 'DEMANDA EVOLUIDA';
    if (!statusDemanda) evoluida = (suspeitosPresos + veiculosIdent + veiculosRec + veiculosApr + armas + relTec) > 0;

    ret.evoluidas += evoluida ? 1 : 0;
    ret.naoEvoluidas += evoluida ? 0 : 1;
    ret.suspeitosIdentificados += suspeitosIdent;
    ret.suspeitosPresos += suspeitosPresos;
    ret.ocorrenciasComPrisao += suspeitosPresos > 0 ? 1 : 0;
    ret.veiculosIdentificados += veiculosIdent;
    ret.veiculosRecuperados += veiculosRec;
    ret.veiculosApreendidos += veiculosApr;
    ret.armasApreendidas += armas;
    ret.relatoriosTecnicos += relTec;

    var equipeBruta = textoRelGerencial_(valorObjRelGerencial_(row, ['EQUIPE_DIRETORIA', 'EQUIPE']));
    var unidadeBruta = textoRelGerencial_(valorObjRelGerencial_(row, ['UNIDADE_RESPONSAVEL', 'UNIDADE RESPONSAVEL']));
    var equipe = normalizarEquipeUnidadeRelGerencial_(equipeBruta || unidadeBruta || 'NÃO INFORMADO');
    var unidade = normalizarEquipeUnidadeRelGerencial_(unidadeBruta || equipeBruta || 'NÃO INFORMADO');

    somarGrupoDemandasRelGerencial_(ret.porEquipe, equipe, evoluida, suspeitosIdent, suspeitosPresos, veiculosIdent, veiculosRec, veiculosApr, armas, relTec);
    somarGrupoDemandasRelGerencial_(ret.porUnidade, unidade, evoluida, suspeitosIdent, suspeitosPresos, veiculosIdent, veiculosRec, veiculosApr, armas, relTec);

    var crime = textoRelGerencial_(valorObjRelGerencial_(row, ['CRIME_TIPO', 'CRIME']));
    var crimeOutro = textoRelGerencial_(valorObjRelGerencial_(row, ['CRIME_OUTRO']));
    if (normalizarTextoRelGerencial_(crime) === 'OUTRO' && crimeOutro) crime = crimeOutro;
    crime = crime || 'NÃO INFORMADO';
    if (!ret.crimes[crime]) ret.crimes[crime] = 0;
    ret.crimes[crime]++;

    ret.linhasDetalhadas.push({
      equipeUnidade: equipe,
      unidade: unidade,
      crime: crime,
      procedimento: textoRelGerencial_(valorObjRelGerencial_(row, ['PROCEDIMENTO_CONCAT', 'NUMERO_PROCEDIMENTO'])),
      suspeitosIdentificados: suspeitosIdent,
      suspeitosPresos: suspeitosPresos,
      veiculosIdentificados: veiculosIdent,
      veiculosRecuperados: veiculosRec,
      veiculosApreendidos: veiculosApr,
      armasApreendidas: armas,
      relatoriosTecnicos: relTec
    });
  });

  ret.taxaPrisaoSuspeitos = ret.suspeitosIdentificados > 0 ? (ret.suspeitosPresos / ret.suspeitosIdentificados) * 100 : 0;
  ret.listaEquipes = ordenarObjetosRelGerencial_(mapToArrayRelGerencial_(ret.porEquipe), 'demandas');
  ret.listaUnidades = ordenarObjetosRelGerencial_(mapToArrayRelGerencial_(ret.porUnidade), 'demandas');
  ret.listaCrimes = ordenarMapaRelGerencial_(ret.crimes, 10);
  return ret;
}

function somarGrupoDemandasRelGerencial_(mapa, nome, evoluida, suspeitosIdent, suspeitosPresos, veiculosIdent, veiculosRec, veiculosApr, armas, relTec) {
  nome = nome || 'NÃO INFORMADO';
  if (!mapa[nome]) {
    mapa[nome] = { nome: nome, demandas: 0, evoluidas: 0, naoEvoluidas: 0, suspeitosIdentificados: 0, suspeitosPresos: 0, veiculosIdentificados: 0, veiculosRecuperados: 0, veiculosApreendidos: 0, armasApreendidas: 0, relatoriosTecnicos: 0 };
  }
  mapa[nome].demandas++;
  mapa[nome].evoluidas += evoluida ? 1 : 0;
  mapa[nome].naoEvoluidas += evoluida ? 0 : 1;
  mapa[nome].suspeitosIdentificados += suspeitosIdent;
  mapa[nome].suspeitosPresos += suspeitosPresos;
  mapa[nome].veiculosIdentificados += veiculosIdent;
  mapa[nome].veiculosRecuperados += veiculosRec;
  mapa[nome].veiculosApreendidos += veiculosApr;
  mapa[nome].armasApreendidas += armas;
  mapa[nome].relatoriosTecnicos += relTec;
}

function coletarOficiosRelGerencial_(ss, periodo) {
  var ret = { total: 0, porTipo: {}, porEquipe: {}, linhasDetalhadas: [] };
  var aba = ss.getSheetByName('INTEL_OFICIOS');
  if (!aba) {
    ret.listaTipos = [];
    ret.listaEquipes = [];
    return ret;
  }

  sheetToObjectsRelGerencial_(aba).forEach(function(row) {
    var data = dataObjRelGerencial_(row, ['DATA_GERACAO', 'DATA GERACAO', 'TIMESTAMP', 'DATA']);
    if (!dataDentroPeriodoRelGerencial_(data, periodo)) return;

    var tipoDocumento = textoRelGerencial_(valorObjRelGerencial_(row, ['TIPO DE DOCUMENTO', 'TIPO_DOCUMENTO']));
    if (!tipoDocumento) return;

    var tipo = classificarOficioRelGerencial_(tipoDocumento);
    var equipe = normalizarEquipeUnidadeRelGerencial_(textoRelGerencial_(valorObjRelGerencial_(row, ['EQUIPE'])) || 'NÃO INFORMADO');

    ret.total++;
    ret.porTipo[tipo] = (ret.porTipo[tipo] || 0) + 1;
    ret.porEquipe[equipe] = (ret.porEquipe[equipe] || 0) + 1;
    ret.linhasDetalhadas.push({
      data: formatarDataRelGerencial_(data),
      tipo: tipo,
      tipoOriginal: tipoDocumento,
      equipe: equipe,
      numero: textoRelGerencial_(valorObjRelGerencial_(row, ['NUM_OFICIO', 'NUM OFICIO'])),
      procedimento: textoRelGerencial_(valorObjRelGerencial_(row, ['NUMERO DO PROCEDIMENTO', 'NÚMERO DO PROCEDIMENTO']))
    });
  });

  ret.listaTipos = ordenarMapaRelGerencial_(ret.porTipo, 20);
  ret.listaEquipes = ordenarMapaRelGerencial_(ret.porEquipe, 20);
  return ret;
}

function gerarTextoSumarioRelGerencial_(dados) {
  var d = dados.demandas.atual, n = dados.nuip.atual, o = dados.oficios.atual;
  return 'No período analisado, foram registradas ' + d.total + ' demandas ativas trabalhadas, ' + d.evoluidas + ' demandas evoluídas, ' + d.suspeitosIdentificados + ' suspeitos identificados, ' + d.suspeitosPresos + ' suspeitos presos, ' + n.total + ' apoios técnicos NUIP e ' + o.total + ' ofícios/mandados gerados. Os números refletem exclusivamente os registros localizados nas bases oficiais no intervalo selecionado.';
}

function gerarTextoLeituraRapidaRelGerencial_(dados) {
  return 'A leitura rápida resume os principais indicadores do período atual e a respectiva variação em relação ao período imediatamente anterior de mesma duração.';
}

function gerarTextoPatrimonialRelGerencial_(dados) {
  var d = dados.demandas.atual;
  return 'Foram registrados ' + d.veiculosIdentificados + ' veículos identificados, ' + d.veiculosRecuperados + ' veículos recuperados, ' + d.veiculosApreendidos + ' veículos apreendidos e ' + d.armasApreendidas + ' armas apreendidas nas demandas do período.';
}

function gerarTextoIndicadoresDerivadosRelGerencial_(dados) {
  var d = dados.demandas.atual;
  var relPorDemanda = d.total > 0 ? d.relatoriosTecnicos / d.total : 0;
  return 'A taxa de prisão sobre suspeitos identificados foi de ' + formatarPercentualRelGerencial_(d.taxaPrisaoSuspeitos) + '. A média de relatórios técnicos por demanda trabalhada foi de ' + formatarNumeroRelGerencial_(relPorDemanda, 2) + '.';
}

function tabelaDemandasEvoluidasRelGerencial_(dados) {
  return [
    ['Situação', 'Período atual', 'Período anterior'],
    ['Demandas evoluídas', dados.demandas.atual.evoluidas, dados.demandas.anterior.evoluidas],
    ['Demandas não evoluídas', dados.demandas.atual.naoEvoluidas, dados.demandas.anterior.naoEvoluidas]
  ];
}

function tabelaVeiculosArmasRelGerencial_(listaEquipes) {
  var rows = [['Equipe/unidade', 'Veíc. identificados', 'Veíc. recuperados', 'Veíc. apreendidos', 'Armas apreendidas']];
  (listaEquipes || []).forEach(function(item) {
    rows.push([item.nome, item.veiculosIdentificados, item.veiculosRecuperados, item.veiculosApreendidos, item.armasApreendidas]);
  });
  return rows;
}

function tabelaIndicadoresDerivadosRelGerencial_(dados) {
  var d = dados.demandas.atual;
  var taxaApreensao = d.veiculosIdentificados > 0 ? (d.veiculosApreendidos / d.veiculosIdentificados) * 100 : 0;
  var relPorDemanda = d.total > 0 ? d.relatoriosTecnicos / d.total : 0;
  return [
    ['Indicador derivado', 'Resultado'],
    ['Taxa de prisão sobre suspeitos identificados', formatarPercentualRelGerencial_(d.taxaPrisaoSuspeitos)],
    ['Taxa de apreensão de veículos identificados', formatarPercentualRelGerencial_(taxaApreensao)],
    ['Relatórios técnicos por demanda trabalhada', formatarNumeroRelGerencial_(relPorDemanda, 2)]
  ];
}

function graficoDemandasEvoluidasRelGerencial_(dados) {
  return criarGraficoColunaRelGerencial_('Demandas evoluídas x não evoluídas', ['Situação', 'Quantidade'], [
    ['Evoluídas', dados.demandas.atual.evoluidas],
    ['Não evoluídas', dados.demandas.atual.naoEvoluidas]
  ]);
}


function inserirTabelaNaTagRelGerencial_(body, tag, rows) {
  rows = rows || [];
  if (!rows.length || rows.length === 1) {
    substituirTagUnicaRelGerencial_(body, tag, 'Não houve registro no período.');
    return;
  }

  var found = body.findText('\\{\\{' + tag + '\\}\\}');
  if (!found) return;

  var text = found.getElement().asText();
  text.deleteText(found.getStartOffset(), found.getEndOffsetInclusive());

  var paragraph = found.getElement().getParent();
  var parent = paragraph.getParent();
  var tabela = null;

  if (parent.getType() === DocumentApp.ElementType.BODY_SECTION) {
    var bodyParent = parent.asBody();
    var idx = bodyParent.getChildIndex(paragraph);
    tabela = bodyParent.insertTable(idx + 1, normalizarRowsTabelaRelGerencial_(rows));
    if (paragraph.asParagraph().getText().trim() === '') bodyParent.removeChild(paragraph);
  } else if (parent.getType() === DocumentApp.ElementType.TABLE_CELL) {
    var cell = parent.asTableCell();
    tabela = cell.appendTable(normalizarRowsTabelaRelGerencial_(rows));
    try {
      if (paragraph.asParagraph().getText().trim() === '') cell.removeChild(paragraph);
    } catch (e) {}
  } else {
    paragraph.appendText('Tabela inserida no relatório.');
  }

  if (tabela) aplicarEstiloTabelaRelGerencial_(tabela);
}

// ============================================================================
// RELATÓRIO GERENCIAL - AJUSTES GERENCIAIS V2
// ============================================================================
// Ajustes solicitados:
// - Uma única data de referência no frontend.
// - Período atual = data de referência + 15 dias anteriores.
// - Período anterior = intervalo imediatamente anterior, com mesma duração.
// - Não usar TIMESTAMP para Demandas Ativas; priorizar DATA_DA_OCORRENCIA.
// - Remover linguagem técnica e apêndice de tags do documento final.
// - Melhorar textos do Vertex AI com foco operacional.
// - Apêndices em formato quantitativo para NUIP e ofícios.

function apiGerarRelatorioGerencial(payload) {
  try {
    payload = payload || {};

    var usuarioLogin = String(payload.usuarioLogin || '').trim();
    var usuario = validarPermissaoRelatorioGerencial_(usuarioLogin);

    var dataReferencia = parseDataIsoRelGerencial_(payload.dataReferencia || payload.dataFinal || payload.dataInicial);
    if (!dataReferencia) {
      throw new Error('Informe uma data de referência válida.');
    }

    var periodo = montarPeriodosRelGerencialPorReferencia_(dataReferencia);
    var jsonConsolidado = montarJsonRelatorioGerencial_(periodo, payload.observacoesQualitativas || '', usuario);
    var textosIa = gerarTextosRelatorioGerencialVertex_(jsonConsolidado);
    jsonConsolidado.textos = textosIa;

    var arquivos = gerarDocumentoRelatorioGerencial_(jsonConsolidado);

    return {
      ok: true,
      docUrl: arquivos.docUrl,
      pdfUrl: arquivos.pdfUrl,
      mensagem: 'Relatório gerencial gerado com sucesso.'
    };
  } catch (erro) {
    return { ok: false, erro: erro && erro.message ? erro.message : String(erro) };
  }
}

function montarNomeUsuarioRelGerencial_(usuario) {
  if (!usuario) return 'Usuário autenticado no Portal DEPATRI';
  var cargo = textoRelGerencial_(usuario.cargo || '');
  var nome = textoRelGerencial_(usuario.nome || '');
  if (cargo && nome) return cargo + ' ' + nome;
  return nome || textoRelGerencial_(usuario.login || '') || 'Usuário autenticado no Portal DEPATRI';
}

function coletarDemandasRelGerencial_(ss, periodo) {
  var aba = ss.getSheetByName('DEMANDAS_ATIVAS');
  if (!aba) return estruturaDemandasRelGerencial_([]);

  var objetos = sheetToObjectsRelGerencial_(aba);
  var filtrados = objetos.filter(function(row) {
    // REGRA: não usar TIMESTAMP para o relatório gerencial de demandas.
    // O filtro deve representar a data real da ocorrência/fato.
    var data = dataObjRelGerencial_(row, [
  'TIMESTAMP',
  'DATA_REGISTRO',
  'DATA DE REGISTRO',
  'CRIADO_EM',
  'DATA',
  'DATA_DA_OCORRENCIA',
  'DATA DA OCORRÊNCIA',
  'DATA OCORRÊNCIA',
  'DATA_OCORRENCIA'
]);
    return dataDentroPeriodoRelGerencial_(data, periodo);
  });

  return estruturaDemandasRelGerencial_(filtrados);
}

function normalizarEquipeUnidadeRelGerencial_(valor) {
  var original = textoRelGerencial_(valor) || 'NÃO INFORMADO';
  var n = normalizarTextoRelGerencial_(original);

  if (n.indexOf('DIRETORIA DEPATRI') > -1 || n === 'DIRETORIA') return 'N.O/NUIP - DEPATRI';
  if (n === 'EQUIPE ALFA' || n === 'ALFA') return 'ALFA';
  if (n === 'EQUIPE BRAVO' || n === 'BRAVO') return 'BRAVO';
  if (n === 'EQUIPE CHARLIE' || n === 'CHARLIE') return 'CHARLIE';
  if (n === 'EQUIPE DELTA' || n === 'DELTA') return 'DELTA';
  if (n === 'EQUIPE ECHO' || n === 'ECHO') return 'ECHO';
  return original;
}

function montarPeriodosRelGerencialPorReferencia_(dataReferencia) {
  var fim = inicioDiaRelGerencial_(dataReferencia);
  var inicio = new Date(fim.getTime());
  inicio.setDate(inicio.getDate() - 15);

  var anteriorFim = new Date(inicio.getTime());
  anteriorFim.setDate(anteriorFim.getDate() - 1);

  var anteriorInicio = new Date(anteriorFim.getTime());
  anteriorInicio.setDate(anteriorInicio.getDate() - 15);

  return {
    dias: 16,
    isQuinzena: true,
    atual: {
      inicio: inicio,
      fim: fim,
      label: formatarDataRelGerencial_(inicio) + ' a ' + formatarDataRelGerencial_(fim),
      labelArquivo: Utilities.formatDate(inicio, REL_GERENCIAL_CFG.TIMEZONE, 'yyyyMMdd') + '_a_' + Utilities.formatDate(fim, REL_GERENCIAL_CFG.TIMEZONE, 'yyyyMMdd')
    },
    anterior: {
      inicio: anteriorInicio,
      fim: anteriorFim,
      label: formatarDataRelGerencial_(anteriorInicio) + ' a ' + formatarDataRelGerencial_(anteriorFim)
    }
  };
}


function gerarDocumentoRelatorioGerencial_(dados) {
  var props = PropertiesService.getScriptProperties();
  var templateId = props.getProperty(REL_GERENCIAL_CFG.TEMPLATE_PROP) || REL_GERENCIAL_CFG.TEMPLATE_PADRAO_ID;
  var folderId = props.getProperty(REL_GERENCIAL_CFG.OUTPUT_FOLDER_PROP) || REL_GERENCIAL_CFG.OUTPUT_FOLDER_PADRAO_ID;
  if (!templateId) throw new Error('Configure TEMPLATE_RELATORIO_GERENCIAL_DOC_ID nas propriedades do script.');
  if (!folderId) throw new Error('Configure OUTPUT_RELATORIO_GERENCIAL_FOLDER_ID nas propriedades do script.');

  var pasta = DriveApp.getFolderById(folderId);
  var nomeArquivo = 'Relatório Gerencial DEPATRI - ' + dados.periodos.atual.labelArquivo + ' - ' + Utilities.formatDate(new Date(), REL_GERENCIAL_CFG.TIMEZONE, 'yyyyMMdd_HHmmss');
  var copia = DriveApp.getFileById(templateId).makeCopy(nomeArquivo, pasta);
  var doc = DocumentApp.openById(copia.getId());
  var body = doc.getBody();

  prepararModeloRelGerencialV2_(body);
  substituirTagsSimplesRelGerencial_(body, montarTagsSimplesRelGerencial_(dados));

  inserirTabelaNaTagRelGerencial_(body, 'TABELA_QUADRO_EXECUTIVO_COMPARATIVO', tabelaExecutivaRelGerencial_(dados));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_INDICADORES_OPERACIONAIS', tabelaExecutivaRelGerencial_(dados));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_DEMANDAS_EVOLUIDAS', tabelaDemandasEvoluidasRelGerencial_(dados));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_CRIMES_MAIS_INVESTIGADOS', tabelaCrimesRelGerencial_(dados.demandas.atual.listaCrimes));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_DEMANDAS_POR_EQUIPE', tabelaEquipeUnidadeRelGerencial_(filtrarEquipesComValorRelGerencial_(dados.demandas.atual.listaEquipes)));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_DEMANDAS_POR_UNIDADE', tabelaEquipeUnidadeRelGerencial_(filtrarEquipesComValorRelGerencial_(dados.demandas.atual.listaUnidades)));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_VEICULOS_IDENTIFICADOS_APREENDIDOS', tabelaVeiculosArmasRelGerencial_(filtrarEquipesComValorRelGerencial_(dados.demandas.atual.listaEquipes)));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_NUIP_POR_TIPO', tabelaMapaComparativoRelGerencial_(dados.nuip.atual.porTipo, dados.nuip.anterior.porTipo, 'Tipo de apoio NUIP'));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_NUIP_POR_SOLICITANTE', tabelaMapaComparativoRelGerencial_(dados.nuip.atual.porSolicitante, dados.nuip.anterior.porSolicitante, 'Solicitante'));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_OFICIOS_POR_TIPO', tabelaMapaComparativoRelGerencial_(dados.oficios.atual.porTipo, dados.oficios.anterior.porTipo, 'Tipo de ofício'));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_OFICIOS_POR_EQUIPE', tabelaMapaComparativoRelGerencial_(dados.oficios.atual.porEquipe, dados.oficios.anterior.porEquipe, 'Equipe/unidade'));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_INDICADORES_DERIVADOS', tabelaIndicadoresDerivadosRelGerencial_(dados));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_APENDICE_DEMANDAS', tabelaEquipeUnidadeRelGerencial_(filtrarEquipesComValorRelGerencial_(dados.demandas.atual.listaEquipes)));
  inserirTabelaNaTagRelGerencial_(body, 'TABELA_APENDICE_NUIP', tabelaApendiceNuipRelGerencial_(dados));
  substituirTagUnicaRelGerencial_(body, 'TABELA_APENDICE_OFICIOS', '');

  inserirGraficoNaTagRelGerencial_(body, 'GRAFICO_INDICADORES_OPERACIONAIS', graficoComparativoGeralRelGerencial_(dados));
  inserirGraficoNaTagRelGerencial_(body, 'GRAFICO_DEMANDAS_EVOLUIDAS', graficoDemandasEvoluidasRelGerencial_(dados));
  inserirGraficoNaTagRelGerencial_(body, 'GRAFICO_CRIMES_MAIS_INVESTIGADOS', graficoCrimesRelGerencial_(dados));
  inserirGraficoNaTagRelGerencial_(body, 'GRAFICO_DEMANDAS_POR_EQUIPE', graficoMapaRelGerencial_('Demandas por equipe/unidade', dados.demandas.atual.porEquipe, 'demandas'));
  inserirGraficoNaTagRelGerencial_(body, 'GRAFICO_VEICULOS_IDENTIFICADOS_APREENDIDOS', graficoVeiculosRelGerencial_(dados));
  inserirGraficoNaTagRelGerencial_(body, 'GRAFICO_NUIP_POR_TIPO', graficoMapaSimplesRelGerencial_('Apoios NUIP por tipo', dados.nuip.atual.porTipo));
  inserirGraficoNaTagRelGerencial_(body, 'GRAFICO_NUIP_POR_SOLICITANTE', graficoMapaSimplesRelGerencial_('Apoios NUIP por solicitante', dados.nuip.atual.porSolicitante));
  inserirGraficoNaTagRelGerencial_(body, 'GRAFICO_OFICIOS_POR_TIPO', graficoMapaSimplesRelGerencial_('Ofícios por tipo', dados.oficios.atual.porTipo));
  inserirGraficoNaTagRelGerencial_(body, 'GRAFICO_OFICIOS_POR_EQUIPE', graficoMapaSimplesRelGerencial_('Ofícios por equipe/unidade', dados.oficios.atual.porEquipe));

  removerSecaoBodyRelGerencial_(body, '13.3 Base de ofícios detalhada', 'Apêndice técnico - mapa resumido de tags');
  removerSecaoBodyRelGerencial_(body, 'Apêndice técnico - mapa resumido de tags', null);

  body.replaceText('\{\{[^}]+\}\}', '');
  removerParagrafosVaziosRepetidosRelGerencial_(body);

  doc.saveAndClose();

  var pdfBlob = DriveApp.getFileById(copia.getId()).getAs(MimeType.PDF);
  var pdf = pasta.createFile(pdfBlob).setName(nomeArquivo + '.pdf');
  return { docUrl: copia.getUrl(), pdfUrl: pdf.getUrl(), docId: copia.getId(), pdfId: pdf.getId() };
}

function prepararModeloRelGerencialV2_(body) {
  removerParagrafosQueComecamComRelGerencial_(body, [
    'Observação: este modelo foi estruturado para ser usado como corpo do relatório'
  ]);

  substituirParagrafosPorInicioRelGerencial_(body, {
    'O relatório considera o período selecionado pelo usuário como quinzena atual': 'O presente relatório consolida os registros operacionais e de apoio técnico vinculados ao DEPATRI no período analisado, utilizando como referência os bancos de dados oficiais mantidos pelo Departamento.',
    'A variação percentual é calculada pela fórmula': 'Para fins de comparação gerencial, os resultados do período atual são confrontados com o período imediatamente anterior, de igual duração, permitindo identificar variações relevantes na atuação operacional, no apoio técnico prestado e na produção documental.',
    'As equipes do Núcleo Operacional devem ser normalizadas': '',
    'Tabela detalhada da aba DEMANDAS_ATIVAS': 'Tabela quantitativa do Banco de Dados do Portal DEPATRI por equipe/unidade e indicadores selecionados.',
    'Tabela detalhada da planilha externa NUIP': 'Tabela quantitativa dos apoios NUIP e dos ofícios consolidados no período.',
    'Os dados consolidados neste relatório foram extraídos das planilhas oficiais': 'Os dados consolidados neste relatório foram extraídos dos bancos oficiais utilizados pelo DEPATRI, observando o período analisado e os critérios gerenciais definidos para acompanhamento da atividade operacional.'
  });
}

function substituirParagrafosPorInicioRelGerencial_(body, mapa) {
  var prefixes = Object.keys(mapa || {});
  for (var i = 0; i < body.getNumChildren(); i++) {
    var child = body.getChild(i);
    if (child.getType() !== DocumentApp.ElementType.PARAGRAPH && child.getType() !== DocumentApp.ElementType.LIST_ITEM) continue;
    var p = child.asParagraph();
    var txt = normalizarEspacosRelGerencial_(p.getText());
    for (var j = 0; j < prefixes.length; j++) {
      if (txt.indexOf(prefixes[j]) === 0) {
        p.setText(mapa[prefixes[j]] || '');
        break;
      }
    }
  }
}

function removerParagrafosQueComecamComRelGerencial_(body, prefixos) {
  prefixos = prefixos || [];
  for (var i = body.getNumChildren() - 1; i >= 0; i--) {
    var child = body.getChild(i);
    if (child.getType() !== DocumentApp.ElementType.PARAGRAPH && child.getType() !== DocumentApp.ElementType.LIST_ITEM) continue;
    var txt = normalizarEspacosRelGerencial_(child.asParagraph().getText());
    var remover = prefixos.some(function(prefixo) { return txt.indexOf(prefixo) === 0; });
    if (remover) body.removeChild(child);
  }
}

function removerSecaoBodyRelGerencial_(body, tituloInicio, tituloFim) {
  var idxInicio = -1;
  var idxFim = -1;
  for (var i = 0; i < body.getNumChildren(); i++) {
    var txt = '';
    try { txt = normalizarEspacosRelGerencial_(body.getChild(i).getText()); } catch (e) { txt = ''; }
    if (idxInicio === -1 && txt.indexOf(tituloInicio) === 0) idxInicio = i;
    if (idxInicio > -1 && tituloFim && txt.indexOf(tituloFim) === 0) { idxFim = i; break; }
  }
  if (idxInicio === -1) return;
  if (idxFim === -1) idxFim = body.getNumChildren();
  for (var r = idxFim - 1; r >= idxInicio; r--) {
    try { body.removeChild(body.getChild(r)); } catch (e2) {}
  }
}

function removerParagrafosVaziosRepetidosRelGerencial_(body) {
  for (var i = body.getNumChildren() - 2; i >= 0; i--) {
    var child = body.getChild(i);
    var next = body.getChild(i + 1);
    if (child.getType() !== DocumentApp.ElementType.PARAGRAPH || next.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    if (!child.asParagraph().getText().trim() && !next.asParagraph().getText().trim()) {
      try { body.removeChild(child); } catch (e) {}
    }
  }
}

function normalizarEspacosRelGerencial_(txt) {
  return String(txt || '').replace(/\s+/g, ' ').trim();
}

function montarTagsSimplesRelGerencial_(dados) {
  var i = dados.indicadores;
  var d = dados.demandas.atual;
  var n = dados.nuip.atual;
  var o = dados.oficios.atual;
  var t = dados.textos || {};
  var taxaApreensaoVeiculos = d.veiculosIdentificados > 0 ? (d.veiculosApreendidos / d.veiculosIdentificados) * 100 : 0;

  return {
    PERIODO_ATUAL: dados.periodos.atual.label,
    PERIODO_ANTERIOR: dados.periodos.anterior.label,
    DATA_GERACAO: dados.meta.geradoEm,
    GERADO_POR: dados.meta.geradoPor || 'Usuário autenticado no Portal DEPATRI',
    FONTE_DADOS: dados.meta.fonteDados || 'Banco de Dados do Portal DEPATRI, Banco de Dados Produtividade NUIP e Banco de Dados DEPATRI.',

    TEXTO_SUMARIO_EXECUTIVO_IA: t.sumarioExecutivo || gerarTextoSumarioRelGerencial_(dados),
    TEXTO_LEITURA_RAPIDA_IA: gerarTextoLeituraRapidaRelGerencial_(dados),
    TEXTO_ANALISE_OPERACIONAL_IA: t.analiseOperacional || gerarTextoAnaliseOperacionalRelGerencial_(dados),
    TEXTO_DEMANDAS_EVOLUIDAS_IA: gerarTextoDemandasEvoluidasRelGerencial_(dados),
    TEXTO_CRIMES_MAIS_INVESTIGADOS_IA: gerarTextoCrimesRelGerencial_(dados),
    TEXTO_DISTRIBUICAO_EQUIPE_IA: t.analiseEquipeUnidade || gerarTextoEquipeRelGerencial_(dados),
    TEXTO_LEITURA_INDIVIDUAL_EQUIPE_IA: gerarTextoLeituraEquipeRelGerencial_(dados),
    TEXTO_PATRIMONIAL_IA: gerarTextoPatrimonialRelGerencial_(dados),
    TEXTO_APOIOS_NUIP_IA: t.analiseNuip || '',
    TEXTO_OFICIOS_IA: t.analiseOficios || '',
    TEXTO_INDICADORES_DERIVADOS_IA: gerarTextoIndicadoresDerivadosRelGerencial_(dados),
    PONTOS_DESTAQUE_IA: t.principaisDestaques || '',
    PONTOS_ATENCAO_IA: t.pontosAtencao || '',
    RECOMENDACOES_GERENCIAIS_IA: t.recomendacoesGerenciais || '',
    CONCLUSAO_IA: t.conclusaoInstitucional || '',
    OBSERVACOES_QUALITATIVAS: dados.observacoesQualitativas || 'Não houve observações qualitativas informadas pelo usuário.',

    K1: formatarNumeroRelGerencial_(i.demandas.atual, 0), V1: i.demandas.variacaoTexto,
    K2: formatarNumeroRelGerencial_(i.suspeitosIdentificados.atual, 0), V2: i.suspeitosIdentificados.variacaoTexto,
    K3: formatarNumeroRelGerencial_(i.suspeitosPresos.atual, 0), V3: i.suspeitosPresos.variacaoTexto,
    K4: formatarNumeroRelGerencial_(i.ocorrenciasComPrisao.atual, 0), V4: i.ocorrenciasComPrisao.variacaoTexto,
    K5: formatarNumeroRelGerencial_(i.veiculosIdentificados.atual, 0), V5: i.veiculosIdentificados.variacaoTexto,
    K6: formatarNumeroRelGerencial_(i.veiculosApreendidos.atual, 0), V6: i.veiculosApreendidos.variacaoTexto,
    K7: formatarNumeroRelGerencial_(i.apoiosNuip.atual, 0), V7: i.apoiosNuip.variacaoTexto,
    K8: formatarNumeroRelGerencial_(i.oficios.atual, 0), V8: i.oficios.variacaoTexto,

    TAXA_APREENSAO_VEICULOS_IDENTIFICADOS: formatarPercentualRelGerencial_(taxaApreensaoVeiculos)
  };
}

function gerarTextoAnaliseOperacionalRelGerencial_(dados) {
  var d = dados.demandas.atual;
  return 'No período analisado, foram consolidadas ' + d.total + ' demandas trabalhadas no Banco de Dados do Portal DEPATRI, com ' + d.evoluidas + ' evoluções registradas, ' + d.suspeitosIdentificados + ' suspeitos identificados e ' + d.suspeitosPresos + ' suspeitos presos. A leitura desses indicadores permite acompanhar a intensidade da atividade operacional e os resultados diretamente vinculados às ocorrências analisadas.';
}

function gerarTextoCrimesRelGerencial_(dados) {
  var lista = dados.demandas.atual.listaCrimes || [];
  if (!lista.length) return 'Não houve registros suficientes para apontar os crimes mais investigados no período.';
  var top = lista[0];
  var palavra = Number(top.valor || 0) === 1 ? 'demanda' : 'demandas';
  return 'Os crimes mais investigados no período foram identificados a partir dos registros constantes no Banco de Dados do Portal DEPATRI, considerando a classificação informada em cada demanda. A consolidação tem finalidade exclusivamente gerencial e estatística, sem juízo de valor ou criação de categorias não existentes na base. No período analisado, o crime com maior número de registros foi ' + top.nome + ', com ' + top.valor + ' ' + palavra + '.';
}


function gerarTextoDemandasEvoluidasRelGerencial_(dados) {
  var d = dados.demandas.atual;
  return 'No período atual, foram identificadas ' + d.evoluidas + ' demandas evoluídas e ' + d.naoEvoluidas + ' demandas sem evolução registrada. Esse comparativo permite avaliar o avanço das apurações e a necessidade de acompanhamento das ocorrências que permaneceram sem evolução operacional no intervalo analisado.';
}


function filtrarEquipesComValorRelGerencial_(lista) {
  return (lista || []).filter(function(item) {
    return Number(item.demandas || 0) > 0 ||
      Number(item.evoluidas || 0) > 0 ||
      Number(item.naoEvoluidas || 0) > 0 ||
      Number(item.suspeitosIdentificados || 0) > 0 ||
      Number(item.suspeitosPresos || 0) > 0 ||
      Number(item.veiculosIdentificados || 0) > 0 ||
      Number(item.veiculosRecuperados || 0) > 0 ||
      Number(item.veiculosApreendidos || 0) > 0 ||
      Number(item.armasApreendidas || 0) > 0 ||
      Number(item.relatoriosTecnicos || 0) > 0;
  });
}

function graficoMapaRelGerencial_(titulo, mapa, campo) {
  var lista = mapToArrayRelGerencial_(mapa || {});
  lista.sort(function(a, b) { return Number(b[campo] || 0) - Number(a[campo] || 0); });
  lista = lista.slice(0, 12);
  var rows = lista.map(function(item) { return [rotuloCurtoRelGerencial_(item.nome), Number(item[campo] || 0)]; });
  return criarGraficoBarraRelGerencial_(titulo, ['Item', 'Quantidade'], rows);
}

function graficoMapaSimplesRelGerencial_(titulo, mapa) {
  var lista = ordenarMapaRelGerencial_(mapa || {}, 12);
  var rows = lista.map(function(item) { return [rotuloCurtoRelGerencial_(item.nome), Number(item.valor || 0)]; });
  return criarGraficoBarraRelGerencial_(titulo, ['Item', 'Quantidade'], rows);
}

function graficoCrimesRelGerencial_(dados) {
  var rows = (dados.demandas.atual.listaCrimes || []).map(function(item) { return [rotuloCurtoRelGerencial_(item.nome), item.valor]; });
  return criarGraficoBarraRelGerencial_('Crimes mais investigados', ['Crime', 'Quantidade'], rows);
}

function graficoComparativoGeralRelGerencial_(dados) {
  var i = dados.indicadores;
  var rows = [
    ['Demandas', i.demandas.atual, i.demandas.anterior],
    ['Suspeitos ident.', i.suspeitosIdentificados.atual, i.suspeitosIdentificados.anterior],
    ['Suspeitos presos', i.suspeitosPresos.atual, i.suspeitosPresos.anterior],
    ['Veíc. identificados', i.veiculosIdentificados.atual, i.veiculosIdentificados.anterior],
    ['Veíc. apreendidos', i.veiculosApreendidos.atual, i.veiculosApreendidos.anterior],
    ['Apoios NUIP', i.apoiosNuip.atual, i.apoiosNuip.anterior],
    ['Ofícios', i.oficios.atual, i.oficios.anterior]
  ];
  return criarGraficoColunaRelGerencial_('Comparativo geral dos principais indicadores', ['Indicador', 'Período atual', 'Período anterior'], rows);
}


function criarGraficoColunaRelGerencial_(titulo, headers, rows) {
  rows = rows || [];
  if (!rows.length || !temValorGraficoRelGerencial_(rows)) return null;

  var dataTable = Charts.newDataTable();
  dataTable.addColumn(Charts.ColumnType.STRING, headers[0]);
  for (var i = 1; i < headers.length; i++) dataTable.addColumn(Charts.ColumnType.NUMBER, headers[i]);

  rows.forEach(function(row) {
    var nova = [String(row[0] || '')];
    for (var c = 1; c < headers.length; c++) nova.push(Number(row[c] || 0));
    dataTable.addRow(nova);
  });

  return Charts.newColumnChart()
    .setDataTable(dataTable.build())
    .setTitle(titulo)
    .setDimensions(900, 420)
    .setLegendPosition(Charts.Position.BOTTOM)
    .setOption('fontSize', 10)
    .setOption('hAxis.textStyle.fontSize', 9)
    .setOption('vAxis.textStyle.fontSize', 9)
    .build()
    .getAs('image/png')
    .setName(titulo + '.png');
}

function criarGraficoBarraRelGerencial_(titulo, headers, rows) {
  rows = rows || [];
  if (!rows.length || !temValorGraficoRelGerencial_(rows)) return null;

  var dataTable = Charts.newDataTable();
  dataTable.addColumn(Charts.ColumnType.STRING, headers[0]);
  dataTable.addColumn(Charts.ColumnType.NUMBER, headers[1]);
  rows.forEach(function(row) { dataTable.addRow([String(row[0] || ''), Number(row[1] || 0)]); });

  var altura = Math.max(420, 70 + rows.length * 34);
  return Charts.newBarChart()
    .setDataTable(dataTable.build())
    .setTitle(titulo)
    .setDimensions(900, altura)
    .setLegendPosition(Charts.Position.NONE)
    .setOption('fontSize', 10)
    .setOption('hAxis.textStyle.fontSize', 9)
    .setOption('vAxis.textStyle.fontSize', 9)
    .build()
    .getAs('image/png')
    .setName(titulo + '.png');
}

// ============================================================================
// RELATÓRIO GERENCIAL - AJUSTES GERENCIAIS V3
// ============================================================================
// Ajustes desta versão:
// - Reforça análise das equipes ALFA, BRAVO, CHARLIE, DELTA e ECHO.
// - Usa sempre o indicador "suspeitos presos", não "prisões cumpridas".
// - Inclui comparativo por equipe com a quinzena anterior no JSON enviado ao Vertex AI.
// - NUIP e ofícios passam a aparecer no apêndice apenas como quadros quantitativos.
// - OFÍCIO IFOOD passa a ser classificado como OFÍCIO DE SOLICITAÇÃO DE DADOS PARA EMPRESAS OU ÓRGÃOS PÚBLICOS.

function montarJsonRelatorioGerencial_(periodo, observacoesQualitativas, usuario) {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);

  var demandasAtual = coletarDemandasRelGerencial_(ss, periodo.atual);
  var demandasAnterior = coletarDemandasRelGerencial_(ss, periodo.anterior);

  var nuipAtual = coletarApoiosNuipRelGerencial_(periodo.atual);
  var nuipAnterior = coletarApoiosNuipRelGerencial_(periodo.anterior);

  var oficiosAtual = coletarOficiosRelGerencial_(ss, periodo.atual);
  var oficiosAnterior = coletarOficiosRelGerencial_(ss, periodo.anterior);

  var indicadores = montarIndicadoresRelGerencial_(demandasAtual, demandasAnterior, nuipAtual, nuipAnterior, oficiosAtual, oficiosAnterior);
  var comparativoEquipes = montarComparativoEquipesRelGerencial_(demandasAtual, demandasAnterior, oficiosAtual, oficiosAnterior);

  return {
    meta: {
      geradoEm: Utilities.formatDate(new Date(), REL_GERENCIAL_CFG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss'),
      geradoPor: montarNomeUsuarioRelGerencial_(usuario),
      fonteDados: 'Banco de Dados do Portal DEPATRI, Banco de Dados Produtividade NUIP e Banco de Dados DEPATRI.'
    },
    periodos: periodo,
    observacoesQualitativas: String(observacoesQualitativas || '').trim(),
    demandas: { atual: demandasAtual, anterior: demandasAnterior },
    nuip: { atual: nuipAtual, anterior: nuipAnterior },
    oficios: { atual: oficiosAtual, anterior: oficiosAnterior },
    indicadores: indicadores,
    comparativoEquipes: comparativoEquipes
  };
}

function montarComparativoEquipesRelGerencial_(demandasAtual, demandasAnterior, oficiosAtual, oficiosAnterior) {
  var ordem = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO'];
  var mapa = {};

  function garantir(nome) {
    nome = normalizarEquipeUnidadeRelGerencial_(nome || 'NÃO INFORMADO');
    if (!mapa[nome]) {
      mapa[nome] = {
        equipe: nome,
        operacional: ordem.indexOf(nome) > -1,
        atual: criarMetricasEquipeRelGerencial_(),
        anterior: criarMetricasEquipeRelGerencial_(),
        variacoes: {}
      };
    }
    return mapa[nome];
  }

  ordem.forEach(function(nome) { garantir(nome); });

  Object.keys((demandasAtual && demandasAtual.porEquipe) || {}).forEach(function(nome) {
    var item = demandasAtual.porEquipe[nome] || {};
    var alvo = garantir(nome).atual;
    copiarMetricasEquipeRelGerencial_(alvo, item);
  });

  Object.keys((demandasAnterior && demandasAnterior.porEquipe) || {}).forEach(function(nome) {
    var item = demandasAnterior.porEquipe[nome] || {};
    var alvo = garantir(nome).anterior;
    copiarMetricasEquipeRelGerencial_(alvo, item);
  });

  Object.keys((oficiosAtual && oficiosAtual.porEquipe) || {}).forEach(function(nome) {
    garantir(nome).atual.oficios = Number(oficiosAtual.porEquipe[nome] || 0);
  });

  Object.keys((oficiosAnterior && oficiosAnterior.porEquipe) || {}).forEach(function(nome) {
    garantir(nome).anterior.oficios = Number(oficiosAnterior.porEquipe[nome] || 0);
  });

  var lista = Object.keys(mapa).map(function(nome) {
    var item = mapa[nome];
    item.variacoes = {
      demandas: variacaoTextoRelGerencial_(item.atual.demandas, item.anterior.demandas),
      evoluidas: variacaoTextoRelGerencial_(item.atual.evoluidas, item.anterior.evoluidas),
      suspeitosIdentificados: variacaoTextoRelGerencial_(item.atual.suspeitosIdentificados, item.anterior.suspeitosIdentificados),
      suspeitosPresos: variacaoTextoRelGerencial_(item.atual.suspeitosPresos, item.anterior.suspeitosPresos),
      veiculosIdentificados: variacaoTextoRelGerencial_(item.atual.veiculosIdentificados, item.anterior.veiculosIdentificados),
      veiculosRecuperados: variacaoTextoRelGerencial_(item.atual.veiculosRecuperados, item.anterior.veiculosRecuperados),
      veiculosApreendidos: variacaoTextoRelGerencial_(item.atual.veiculosApreendidos, item.anterior.veiculosApreendidos),
      relatoriosTecnicos: variacaoTextoRelGerencial_(item.atual.relatoriosTecnicos, item.anterior.relatoriosTecnicos),
      oficios: variacaoTextoRelGerencial_(item.atual.oficios, item.anterior.oficios)
    };
    item.scoreAtual = item.atual.demandas + item.atual.evoluidas + item.atual.suspeitosIdentificados + item.atual.suspeitosPresos + item.atual.veiculosIdentificados + item.atual.veiculosRecuperados + item.atual.veiculosApreendidos + item.atual.relatoriosTecnicos + item.atual.oficios;
    item.scoreAnterior = item.anterior.demandas + item.anterior.evoluidas + item.anterior.suspeitosIdentificados + item.anterior.suspeitosPresos + item.anterior.veiculosIdentificados + item.anterior.veiculosRecuperados + item.anterior.veiculosApreendidos + item.anterior.relatoriosTecnicos + item.anterior.oficios;
    return item;
  }).filter(function(item) {
    return item.operacional || item.scoreAtual > 0 || item.scoreAnterior > 0;
  });

  lista.sort(function(a, b) {
    var ia = ordem.indexOf(a.equipe);
    var ib = ordem.indexOf(b.equipe);
    if (ia > -1 && ib > -1) return ia - ib;
    if (ia > -1) return -1;
    if (ib > -1) return 1;
    if (b.scoreAtual !== a.scoreAtual) return b.scoreAtual - a.scoreAtual;
    return String(a.equipe || '').localeCompare(String(b.equipe || ''), 'pt-BR');
  });

  return lista;
}

function criarMetricasEquipeRelGerencial_() {
  return {
    demandas: 0,
    evoluidas: 0,
    naoEvoluidas: 0,
    suspeitosIdentificados: 0,
    suspeitosPresos: 0,
    veiculosIdentificados: 0,
    veiculosRecuperados: 0,
    veiculosApreendidos: 0,
    armasApreendidas: 0,
    relatoriosTecnicos: 0,
    oficios: 0
  };
}

function copiarMetricasEquipeRelGerencial_(alvo, origem) {
  alvo.demandas = Number(origem.demandas || 0);
  alvo.evoluidas = Number(origem.evoluidas || 0);
  alvo.naoEvoluidas = Number(origem.naoEvoluidas || 0);
  alvo.suspeitosIdentificados = Number(origem.suspeitosIdentificados || 0);
  alvo.suspeitosPresos = Number(origem.suspeitosPresos || 0);
  alvo.veiculosIdentificados = Number(origem.veiculosIdentificados || 0);
  alvo.veiculosRecuperados = Number(origem.veiculosRecuperados || 0);
  alvo.veiculosApreendidos = Number(origem.veiculosApreendidos || 0);
  alvo.armasApreendidas = Number(origem.armasApreendidas || 0);
  alvo.relatoriosTecnicos = Number(origem.relatoriosTecnicos || 0);
}

function gerarTextosRelatorioGerencialVertex_(jsonConsolidado) {
  var fallback = gerarTextosFallbackRelGerencial_(jsonConsolidado);

  try {
    if (typeof obterVertexProjectId !== 'function') return fallback;

    var projectId = obterVertexProjectId();
    var location = 'us-central1';
    var model = 'projects/' + projectId + '/locations/' + location + '/publishers/google/models/gemini-3.6-flash';

    var prompt = ''
      + 'Você é redator institucional da Polícia Civil do Estado do Ceará, DEPATRI. O relatório é para subsidiar a gestão do delegado.\n'
      + 'Elabore textos executivos com foco nas ocorrências registradas, nos resultados operacionais e no desempenho das equipes.\n\n'
      + 'REGRAS ABSOLUTAS:\n'
      + '1. Use somente os números e informações existentes no JSON consolidado.\n'
      + '2. Não invente dados, fatos, ocorrências, conclusões ou nomes.\n'
      + '3. Não calcule novos números nem altere os quantitativos recebidos.\n'
      + '4. Não mencione alimentação, atualização, preenchimento, cadastro, qualidade da planilha, padronização de registros, campos não informados, funcionamento do sistema, abas ou colunas técnicas.\n'
      + '5. Não use nomes técnicos como DEMANDAS_ATIVAS, INTEL_OFICIOS, CRIME_TIPO ou TIMESTAMP.\n'
      + '6. Use sempre a expressão "suspeitos presos". Não use "prisões cumpridas".\n'
      + '7. Dê destaque especial às equipes ALFA, BRAVO, CHARLIE, DELTA e ECHO, quando houver dados.\n'
      + '8. Para cada equipe operacional com dados, mencione demandas trabalhadas, demandas evoluídas, suspeitos identificados, suspeitos presos, veículos identificados, veículos recuperados, veículos apreendidos e relatórios técnicos, comparando com o período anterior quando o JSON trouxer base comparativa.\n'
      + '9. Aponte contrastes: equipe com aumento, equipe com redução, equipe com maior concentração de demandas e equipe com maior efetividade em suspeitos presos ou veículos.\n'
      + '10. Para NUIP e ofícios, faça leitura quantitativa por tipo. Não descreva ações individuais.\n'
      + '11. Use tom profissional, analítico, institucional e útil para tomada de decisão.\n'
      + '12. Não use markdown, asteriscos ou cabeçalhos fora das chaves pedidas.\n'
      + '13. Retorne somente JSON válido, sem texto antes e sem texto depois.\n\n'
      + 'Retorne exatamente estas chaves:\n'
      + '{'
      + '"sumarioExecutivo":"",'
      + '"analiseOperacional":"",'
      + '"analiseEquipeUnidade":"",'
      + '"analiseNuip":"",'
      + '"analiseOficios":"",'
      + '"principaisDestaques":"",'
      + '"pontosAtencao":"",'
      + '"recomendacoesGerenciais":"",'
      + '"conclusaoInstitucional":""'
      + '}\n\n'
      + 'JSON CONSOLIDADO:\n'
      + JSON.stringify(jsonConsolidado);

    var req = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.0, maxOutputTokens: 8192 }
    };

    var resposta = VertexAI.Projects.Locations.Publishers.Models.generateContent(req, model);
    var partes = ((((resposta || {}).candidates || [])[0] || {}).content || {}).parts || [];
    var texto = partes.map(function(p) { return p && p.text ? String(p.text) : ''; }).join('').trim();
    if (!texto) return fallback;

    var obj = JSON.parse(extrairJsonRelGerencial_(texto));
    return {
      sumarioExecutivo: limparTextoIaRelGerencial_(obj.sumarioExecutivo) || fallback.sumarioExecutivo,
      analiseOperacional: limparTextoIaRelGerencial_(obj.analiseOperacional) || fallback.analiseOperacional,
      analiseEquipeUnidade: limparTextoIaRelGerencial_(obj.analiseEquipeUnidade) || fallback.analiseEquipeUnidade,
      analiseNuip: limparTextoIaRelGerencial_(obj.analiseNuip) || fallback.analiseNuip,
      analiseOficios: limparTextoIaRelGerencial_(obj.analiseOficios) || fallback.analiseOficios,
      principaisDestaques: limparTextoIaRelGerencial_(obj.principaisDestaques) || fallback.principaisDestaques,
      pontosAtencao: limparTextoIaRelGerencial_(obj.pontosAtencao) || fallback.pontosAtencao,
      recomendacoesGerenciais: limparTextoIaRelGerencial_(obj.recomendacoesGerenciais) || fallback.recomendacoesGerenciais,
      conclusaoInstitucional: limparTextoIaRelGerencial_(obj.conclusaoInstitucional) || fallback.conclusaoInstitucional
    };
  } catch (e) {
    return fallback;
  }
}

function gerarTextosFallbackRelGerencial_(dados) {
  var d = dados.demandas.atual;
  var n = dados.nuip.atual;
  var o = dados.oficios.atual;
  var textoEquipes = gerarTextoLeituraEquipeRelGerencial_(dados);

  return {
    sumarioExecutivo:
      'No período analisado, foram consolidadas ' + d.total + ' demandas trabalhadas, com ' + d.evoluidas + ' demandas evoluídas, ' + d.suspeitosIdentificados + ' suspeitos identificados, ' + d.suspeitosPresos + ' suspeitos presos, ' + d.veiculosIdentificados + ' veículos identificados, ' + d.veiculosRecuperados + ' veículos recuperados e ' + d.veiculosApreendidos + ' veículos apreendidos. Também foram registrados ' + n.total + ' apoios técnicos NUIP e ' + o.total + ' ofícios ou documentos vinculados à atividade operacional.',

    analiseOperacional:
      'A leitura operacional do período indica o volume de ocorrências trabalhadas e os resultados decorrentes da atuação das equipes, com destaque para demandas evoluídas, suspeitos identificados, suspeitos presos e veículos vinculados às investigações.',

    analiseEquipeUnidade: textoEquipes,

    analiseNuip: gerarTextoQuadroNuipRelGerencial_(dados),

    analiseOficios: gerarTextoQuadroOficiosRelGerencial_(dados),

    principaisDestaques: gerarTextoDestaquesEquipesRelGerencial_(dados),

    pontosAtencao:
      'Os pontos de atenção devem ser avaliados a partir das equipes com redução de desempenho em relação ao período anterior ou com concentração de demandas sem evolução, especialmente quando houver queda em suspeitos presos, veículos identificados ou veículos apreendidos.',

    recomendacoesGerenciais:
      'Recomenda-se utilizar o comparativo por equipe para orientar a distribuição de esforços, reforçar acompanhamento sobre ocorrências sem evolução e priorizar equipes ou áreas com maior carga operacional no período.',

    conclusaoInstitucional:
      'Conclui-se que os indicadores consolidados permitem acompanhar o desempenho operacional do DEPATRI na quinzena, com leitura comparativa das equipes e apoio à tomada de decisão pela gestão do Departamento.'
  };
}

function gerarTextoEquipeRelGerencial_(dados) {
  var lista = dados.comparativoEquipes || [];
  var comValor = lista.filter(function(item) { return item.scoreAtual > 0 || item.scoreAnterior > 0; });
  if (!comValor.length) return 'Não houve registros por equipe ou unidade no período.';

  var topDemandas = comValor.slice().sort(function(a, b) { return b.atual.demandas - a.atual.demandas; })[0];
  var topPresos = comValor.slice().sort(function(a, b) { return b.atual.suspeitosPresos - a.atual.suspeitosPresos; })[0];

  var texto = 'A análise por equipe/unidade permite comparar o desempenho operacional da quinzena com o período anterior. ';
  texto += 'A maior concentração de demandas no período foi registrada por ' + topDemandas.equipe + ', com ' + topDemandas.atual.demandas + ' demanda(s), frente a ' + topDemandas.anterior.demandas + ' no período anterior (' + topDemandas.variacoes.demandas + '). ';

  if (topPresos && topPresos.atual.suspeitosPresos > 0) {
    texto += 'Em relação a suspeitos presos, o maior quantitativo foi registrado por ' + topPresos.equipe + ', com ' + topPresos.atual.suspeitosPresos + ' suspeito(s) preso(s), frente a ' + topPresos.anterior.suspeitosPresos + ' no período anterior (' + topPresos.variacoes.suspeitosPresos + ').';
  }

  return texto;
}

function gerarTextoLeituraEquipeRelGerencial_(dados) {
  var lista = dados.comparativoEquipes || [];
  var comValor = lista.filter(function(item) { return item.scoreAtual > 0 || item.scoreAnterior > 0; });
  if (!comValor.length) return 'Não houve dados suficientes para leitura individual por equipe ou unidade.';

  return comValor.map(function(item) {
    var a = item.atual;
    var p = item.anterior;
    var v = item.variacoes || {};
    return item.equipe + ': no período atual, registrou ' + a.demandas + ' demanda(s), ' + a.evoluidas + ' demanda(s) evoluída(s), ' + a.suspeitosIdentificados + ' suspeito(s) identificado(s), ' + a.suspeitosPresos + ' suspeito(s) preso(s), ' + a.veiculosIdentificados + ' veículo(s) identificado(s), ' + a.veiculosRecuperados + ' veículo(s) recuperado(s), ' + a.veiculosApreendidos + ' veículo(s) apreendido(s) e ' + a.relatoriosTecnicos + ' relatório(s) técnico(s). No período anterior, havia ' + p.demandas + ' demanda(s), ' + p.suspeitosIdentificados + ' suspeito(s) identificado(s), ' + p.suspeitosPresos + ' suspeito(s) preso(s), ' + p.veiculosIdentificados + ' veículo(s) identificado(s), ' + p.veiculosRecuperados + ' recuperado(s) e ' + p.veiculosApreendidos + ' apreendido(s). Variações principais: demandas ' + (v.demandas || '0,00%') + ', suspeitos presos ' + (v.suspeitosPresos || '0,00%') + ', veículos identificados ' + (v.veiculosIdentificados || '0,00%') + ' e veículos apreendidos ' + (v.veiculosApreendidos || '0,00%') + '.';
  }).join('\n\n');
}

function gerarTextoDestaquesEquipesRelGerencial_(dados) {
  var lista = (dados.comparativoEquipes || []).filter(function(item) { return item.scoreAtual > 0 || item.scoreAnterior > 0; });
  if (!lista.length) return 'Não houve base suficiente para destacar desempenho por equipe no período.';

  var topDemandas = lista.slice().sort(function(a, b) { return b.atual.demandas - a.atual.demandas; })[0];
  var topEvoluidas = lista.slice().sort(function(a, b) { return b.atual.evoluidas - a.atual.evoluidas; })[0];
  var topPresos = lista.slice().sort(function(a, b) { return b.atual.suspeitosPresos - a.atual.suspeitosPresos; })[0];
  var topVeiculos = lista.slice().sort(function(a, b) { return (b.atual.veiculosIdentificados + b.atual.veiculosRecuperados + b.atual.veiculosApreendidos) - (a.atual.veiculosIdentificados + a.atual.veiculosRecuperados + a.atual.veiculosApreendidos); })[0];

  var partes = [];
  if (topDemandas) partes.push(topDemandas.equipe + ' concentrou o maior volume de demandas, com ' + topDemandas.atual.demandas + ' registro(s).');
  if (topEvoluidas) partes.push(topEvoluidas.equipe + ' apresentou o maior número de demandas evoluídas, com ' + topEvoluidas.atual.evoluidas + ' evolução(ões).');
  if (topPresos && topPresos.atual.suspeitosPresos > 0) partes.push(topPresos.equipe + ' registrou o maior resultado em suspeitos presos, com ' + topPresos.atual.suspeitosPresos + ' preso(s).');
  if (topVeiculos) partes.push(topVeiculos.equipe + ' teve destaque nos indicadores de veículos, somando ' + (topVeiculos.atual.veiculosIdentificados + topVeiculos.atual.veiculosRecuperados + topVeiculos.atual.veiculosApreendidos) + ' registro(s) entre identificados, recuperados e apreendidos.');

  return partes.join(' ');
}

function gerarTextoQuadroNuipRelGerencial_(dados) {
  var lista = ordenarMapaRelGerencial_((dados.nuip && dados.nuip.atual && dados.nuip.atual.porTipo) || {}, 20);
  if (!lista.length) return 'Não houve registro de apoios técnicos NUIP no período.';
  var total = (dados.nuip && dados.nuip.atual && dados.nuip.atual.total) || 0;
  var top = lista[0];
  return 'O quadro quantitativo dos apoios técnicos NUIP registrou ' + total + ' apoio(s) no período. A categoria com maior volume foi ' + top.nome + ', com ' + top.valor + ' registro(s). A leitura é apresentada de forma consolidada por tipo de apoio, sem detalhamento individual das solicitações.';
}

function gerarTextoQuadroOficiosRelGerencial_(dados) {
  var lista = ordenarMapaRelGerencial_((dados.oficios && dados.oficios.atual && dados.oficios.atual.porTipo) || {}, 20);
  if (!lista.length) return 'Não houve ofícios ou documentos gerados no período.';
  var total = (dados.oficios && dados.oficios.atual && dados.oficios.atual.total) || 0;
  var top = lista[0];
  return 'O quadro quantitativo de ofícios e solicitações registrou ' + total + ' documento(s) no período. O tipo com maior volume foi ' + top.nome + ', com ' + top.valor + ' registro(s).';
}

function classificarOficioRelGerencial_(tipoDocumento) {
  var t = normalizarTextoRelGerencial_(tipoDocumento);

  if (t.indexOf('TELEFONIA') > -1 || t.indexOf('TELEFONE') > -1 || t.indexOf('OPERADORA') > -1) {
    return 'OFÍCIO EMPRESA DE TELEFONIA';
  }

  if (t.indexOf('PROVEDOR') > -1 || t.indexOf('INTERNET') > -1) {
    return 'OFÍCIO PROVEDOR DE INTERNET';
  }

  if (t.indexOf('IFOOD') > -1 || t.indexOf('DADOS') > -1 || t.indexOf('EMPRESA') > -1 || t.indexOf('ORGAO') > -1 || t.indexOf('ÓRGAO') > -1) {
    return 'OFÍCIO DE SOLICITAÇÃO DE DADOS PARA EMPRESAS OU ÓRGÃOS PÚBLICOS';
  }

  if (t.indexOf('LOCADORA') > -1) {
    return 'OFÍCIO A LOCADORA DE VEÍCULO';
  }

  if (t.indexOf('IMAGEM') > -1 || t.indexOf('IMAGENS') > -1) {
    return 'OFÍCIOS DE SOLICITAÇÃO DE IMAGENS';
  }

  if (t.indexOf('MANDADO') > -1 && t.indexOf('INTIM') > -1) {
    return 'MANDADOS DE INTIMAÇÃO';
  }

  return 'OUTROS OFÍCIOS';
}

function tabelaApendiceNuipRelGerencial_(dados) {
  var rows = [['Quadro', 'Tipo/Categoria', 'Quantidade']];

  rows.push(['APOIOS TÉCNICOS NUIP', 'Total geral', (dados.nuip && dados.nuip.atual && dados.nuip.atual.total) || 0]);
  (ordenarMapaRelGerencial_((dados.nuip && dados.nuip.atual && dados.nuip.atual.porTipo) || {}, 50) || []).forEach(function(item) {
    rows.push(['APOIOS TÉCNICOS NUIP', item.nome, item.valor]);
  });

  rows.push(['OFÍCIOS E SOLICITAÇÕES', 'Total geral', (dados.oficios && dados.oficios.atual && dados.oficios.atual.total) || 0]);
  (ordenarMapaRelGerencial_((dados.oficios && dados.oficios.atual && dados.oficios.atual.porTipo) || {}, 50) || []).forEach(function(item) {
    rows.push(['OFÍCIOS E SOLICITAÇÕES', item.nome, item.valor]);
  });

  return rows;
}

function tabelaEquipeUnidadeRelGerencial_(lista) {
  var rows = [[
    'Equipe/unidade',
    'Demandas',
    'Evoluídas',
    'Não evoluídas',
    'Suspeitos identificados',
    'Suspeitos presos',
    'Veíc. identificados',
    'Veíc. recuperados',
    'Veíc. apreendidos',
    'Armas',
    'Relatórios técnicos'
  ]];

  (lista || []).forEach(function(item) {
    rows.push([
      normalizarEquipeUnidadeRelGerencial_(item.nome),
      item.demandas,
      item.evoluidas,
      item.naoEvoluidas,
      item.suspeitosIdentificados,
      item.suspeitosPresos,
      item.veiculosIdentificados,
      item.veiculosRecuperados,
      item.veiculosApreendidos,
      item.armasApreendidas,
      item.relatoriosTecnicos
    ]);
  });

  return rows;
}

function rotuloCurtoRelGerencial_(valor) {
  var t = String(valor || '').trim();
  var n = normalizarTextoRelGerencial_(t);
  if (n.indexOf('OFICIO EMPRESA DE TELEFONIA') > -1) return 'Telefonia';
  if (n.indexOf('OFICIO PROVEDOR') > -1) return 'Provedor';
  if (n.indexOf('SOLICITACAO DE DADOS') > -1 || n.indexOf('IFOOD') > -1) return 'Dados empresas/órgãos';
  if (n.indexOf('LOCADORA') > -1) return 'Locadora veículo';
  if (n.indexOf('SOLICITACAO DE IMAGENS') > -1 || n.indexOf('IMAGENS') > -1) return 'Imagens';
  if (n.indexOf('MANDADOS DE INTIMACAO') > -1) return 'Mandado intimação';
  if (n.indexOf('CONFECCAO DE RELATORIOS') > -1) return 'Relatórios NUIP';
  if (n.indexOf('CONSULTAS A SISTEMAS') > -1) return 'Consultas sistemas';
  if (n.indexOf('LEVANTAMENTO DE ALVO') > -1) return 'Levant. alvo';
  if (n.indexOf('RECONHECIMENTO FACIAL') > -1) return 'Reconh. facial';
  if (n.indexOf('AGILIS') > -1) return 'AGILIS/ALERTA/CÓRTEX';
  if (t.length > 34) return t.substring(0, 31) + '...';
  return t;
}

// ============================================================================
// MÓDULO ANÁLISE DE ROTAS E COBERTURA DE CÂMERAS (BACKEND)
// Os nomes internos SIRP foram preservados para manter compatibilidade com o portal.
// ============================================================================

var SIRP_CFG = {
  SHEET_CAMERAS: 'SIRP_CAMERAS',
  SHEET_ANALISES: 'SIRP_ANALISES',
  TZ: 'America/Fortaleza',
  HEADERS_CAMERAS: [
    'ID_REGISTRO',
    'NOME_REFERENCIA',
    'NOME_CAMERA_ESPECIFICA',
    'ORGAO_GESTOR_CAMERA',
    'TIPO_CAMERA',
    'TIPO_FLUXO_VIA',
    'SENTIDO_FLUXO_ANGULO',
    'SENTIDO_FLUXO_TEXTO',
    'ACESSO_NUIP',
    'LATITUDE_CAMERA',
    'LONGITUDE_CAMERA',
    'STATUS_CAMERA',
    'ENDERECO_CAMERA',
    'OBS_CAMERA',
    'OBS_FLUXO_VIA'
  ],
  HEADERS_ANALISES: [
    'ID_ANALISE',
    'DATA_HORA_ANALISE',
    'USUARIO_LOGIN',
    'ID_DEMANDA',
    'TIPO_PROCEDIMENTO',
    'NUMERO_PROCEDIMENTO',
    'PROCEDIMENTO_CONCAT',
    'FONTE_LOCALIZACAO',
    'ENDERECO_BUSCADO',
    'LATITUDE_ORIGEM',
    'LONGITUDE_ORIGEM',
    'RAIO_METROS',
    'SENTIDO_ANGULO',
    'SENTIDO_TEXTO',
    'CAMERAS_NO_RAIO',
    'CAMERAS_PROBABILIDADE_ALTA',
    'CAMERAS_PROBABILIDADE_MEDIA',
    'CAMERAS_PROBABILIDADE_BAIXA',
    'RESULTADO_PROBABILIDADE_JSON',
    'OBS_ANALISE',
    'CAMERAS_COM_ACESSO',
    'CAMERAS_SEM_ACESSO',
    'CAMERAS_ACESSO_NAO_INFORMADO',
    'TOTAL_TRECHOS',
    'TRECHOS_COM_CAMERA',
    'TRECHOS_SEM_CAMERA',
    'RESULTADO_ROTAS_JSON'
  ]
};

function normalizarSirp_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function numeroSirp_(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;

  var txt = String(valor).trim().replace(/[^\d,.-]/g, '');
  if (!txt) return 0;

  if (txt.indexOf(',') > -1 && txt.indexOf('.') > -1) {
    txt = txt.replace(/\./g, '').replace(',', '.');
  } else if (txt.indexOf(',') > -1) {
    txt = txt.replace(',', '.');
  }

  var n = Number(txt);
  return isNaN(n) ? 0 : n;
}

function classificarAcessoCameraSirp_(valor) {
  var acesso = normalizarSirp_(valor);

  if (acesso === 'AGILIS') {
    return 'AGILIS';
  }

  if (!acesso || acesso === 'NAO INFORMADO' || acesso === 'DESCONHECIDO' || acesso === 'IGNORADO') {
    return 'NAO_INFORMADO';
  }

  if (
    acesso === 'SIM' ||
    acesso === 'S' ||
    acesso === 'TEM ACESSO' ||
    acesso === 'COM ACESSO' ||
    acesso === 'DISPONIVEL' ||
    acesso === 'COM_ACESSO'
  ) {
    return 'COM_ACESSO';
  }

  if (
    acesso === 'NAO' ||
    acesso === 'N' ||
    acesso === 'SEM ACESSO' ||
    acesso === 'INDISPONIVEL' ||
    acesso === 'SEM_ACESSO'
  ) {
    return 'SEM_ACESSO';
  }

  return 'NAO_INFORMADO';
}

function jsonSeguroCelulaSirp_(valor) {
  var limite = 45000;
  var json = JSON.stringify(valor || []);
  if (json.length <= limite) return json;

  var lista = Array.isArray(valor) ? valor : [];
  var amostra = [];

  for (var i = 0; i < lista.length; i++) {
    amostra.push(lista[i]);
    var parcial = JSON.stringify({
      truncado: true,
      totalRegistros: lista.length,
      amostra: amostra
    });

    if (parcial.length > limite) {
      amostra.pop();
      break;
    }
  }

  return JSON.stringify({
    truncado: true,
    totalRegistros: lista.length,
    amostra: amostra
  });
}

function abrirPlanilhaSirp_() {
  return SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
}

function indiceSirp_(headers, nome) {
  var alvo = normalizarSirp_(nome);
  for (var i = 0; i < headers.length; i++) {
    if (normalizarSirp_(headers[i]) === alvo) return i;
  }
  return -1;
}

function valorPorHeaderSirp_(row, headers, nome) {
  var idx = indiceSirp_(headers, nome);
  return idx > -1 ? row[idx] : '';
}

function garantirAbaComCabecalhoSirp_(nomeAba, headers) {
  var ss = abrirPlanilhaSirp_();
  var aba = ss.getSheetByName(nomeAba);

  if (!aba) {
    aba = ss.insertSheet(nomeAba);
  }

  if (aba.getLastColumn() < headers.length) {
    aba.insertColumnsAfter(Math.max(aba.getLastColumn(), 1), headers.length - Math.max(aba.getLastColumn(), 1));
  }

  var primeiraLinha = aba.getRange(1, 1, 1, headers.length).getValues()[0];
  var vazia = primeiraLinha.every(function(v) { return String(v || '').trim() === ''; });

  if (vazia || aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);
    aba.setFrozenRows(1);
    return aba;
  }

  var precisaAjustar = false;
  for (var i = 0; i < headers.length; i++) {
    if (String(primeiraLinha[i] || '').trim() !== headers[i]) {
      precisaAjustar = true;
      break;
    }
  }

  if (precisaAjustar) {
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);
    aba.setFrozenRows(1);
  }

  return aba;
}

function garantirAbaSirpCameras_() {
  return garantirAbaComCabecalhoSirp_(SIRP_CFG.SHEET_CAMERAS, SIRP_CFG.HEADERS_CAMERAS);
}

function garantirAbaSirpAnalises_() {
  return garantirAbaComCabecalhoSirp_(SIRP_CFG.SHEET_ANALISES, SIRP_CFG.HEADERS_ANALISES);
}

function validarAcessoSirp_(usuarioLogin) {
  var usuario = obterUsuarioPortalPorLogin_(usuarioLogin);
  var perfil = normalizarSirp_(usuario && usuario.perfil);
  var lotacao = normalizarSirp_((usuario && (usuario.lotacao || usuario.delegacia)) || '');

  var permitido =
    perfil === 'ADMIN' ||
    perfil === 'CRIADOR/ADMIN' ||
    perfil === 'CRIADOR ADMIN' ||
    perfil.indexOf('DIRECAO') > -1 ||
    perfil.indexOf('DIRETORIA') > -1 ||
    perfil.indexOf('NUIP') > -1 ||
    perfil.indexOf('NUCLEO OPERACIONAL') > -1 ||
    lotacao.indexOf('NUIP') > -1 ||
    lotacao.indexOf('NUCLEO OPERACIONAL') > -1 ||
    lotacao.indexOf('DIRECAO') > -1 ||
    lotacao.indexOf('DIRETORIA') > -1;

  if (!permitido) {
    throw new Error('Seu perfil não possui acesso ao módulo Análise de Rotas e Cobertura de Câmeras.');
  }

  return usuario;
}

function usuarioPodeEditarCameraSirp_(usuario) {
  var perfil = normalizarSirp_(usuario && usuario.perfil);
  var lotacao = normalizarSirp_((usuario && (usuario.lotacao || usuario.delegacia)) || '');

  var admin =
    perfil === 'ADMIN' ||
    perfil === 'CRIADOR/ADMIN' ||
    perfil === 'CRIADOR ADMIN';

  var nuip =
    perfil.indexOf('NUIP') > -1 ||
    lotacao.indexOf('NUIP') > -1 ||
    perfil === 'NUCLEO OPERACIONAL' ||
    lotacao === 'NUCLEO OPERACIONAL';

  return admin || nuip;
}

function validarEdicaoCameraSirp_(usuarioLogin) {
  var usuario = validarAcessoSirp_(usuarioLogin);
  if (!usuarioPodeEditarCameraSirp_(usuario)) {
    throw new Error('Somente usuários ADMIN e integrantes do NUIP podem alterar os dados das câmeras.');
  }
  return usuario;
}

function obterDemandasSirp(usuarioLogin) {
  validarAcessoSirp_(usuarioLogin);

  var ss = abrirPlanilhaSirp_();
  var aba = ss.getSheetByName('DEMANDAS_ATIVAS');
  if (!aba) return { sucesso: true, demandas: [] };

  var dados = aba.getDataRange().getValues();
  if (!dados || dados.length <= 1) return { sucesso: true, demandas: [] };

  var headers = dados[0];

  var idxTipo = indiceSirp_(headers, 'TIPO_PROCEDIMENTO');
  var idxNumero = indiceSirp_(headers, 'NUMERO_PROCEDIMENTO');
  var idxConcat = indiceSirp_(headers, 'PROCEDIMENTO_CONCAT');
  var idxData = indiceSirp_(headers, 'DATA_DA_OCORRENCIA');
  var idxVitima = indiceSirp_(headers, 'NOME_VITIMA');
  var idxBairro = indiceSirp_(headers, 'BAIRRO');
  var idxStatus = indiceSirp_(headers, 'STATUS');

  var lista = [];

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];

    var tipo = idxTipo > -1 ? String(row[idxTipo] || '').trim() : '';
    var numero = idxNumero > -1 ? String(row[idxNumero] || '').trim() : '';
    var concat = idxConcat > -1 ? String(row[idxConcat] || '').trim() : '';

    if (!concat) {
      if (tipo && numero) concat = tipo + ' Nº ' + numero;
      else concat = tipo || numero;
    }

    if (!concat) continue;

    lista.push({
      idDemanda: String(i + 1),
      rowIndex: i + 1,
      tipoProcedimento: tipo,
      numeroProcedimento: numero,
      procedimentoConcat: concat,
      dataOcorrencia: idxData > -1 ? String(row[idxData] || '').trim() : '',
      nomeVitima: idxVitima > -1 ? String(row[idxVitima] || '').trim() : '',
      bairro: idxBairro > -1 ? String(row[idxBairro] || '').trim() : '',
      status: idxStatus > -1 ? String(row[idxStatus] || '').trim() : ''
    });
  }

  lista.sort(function(a, b) {
    return String(b.rowIndex || '').localeCompare(String(a.rowIndex || ''));
  });

  return { sucesso: true, demandas: lista };
}

function obterCamerasSirp(usuarioLogin) {
  var usuario = validarAcessoSirp_(usuarioLogin);
  var podeEditar = usuarioPodeEditarCameraSirp_(usuario);

  var aba = garantirAbaSirpCameras_();
  var dados = aba.getDataRange().getValues();
  if (!dados || dados.length <= 1) {
    return { sucesso: true, cameras: [], podeEditar: podeEditar };
  }

  var headers = dados[0];
  var cameras = [];

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];

    var lat = numeroSirp_(valorPorHeaderSirp_(row, headers, 'LATITUDE_CAMERA'));
    var lng = numeroSirp_(valorPorHeaderSirp_(row, headers, 'LONGITUDE_CAMERA'));
    if (!lat || !lng) continue;

    var status = String(valorPorHeaderSirp_(row, headers, 'STATUS_CAMERA') || '').trim();
    if (normalizarSirp_(status) === 'INATIVA') continue;

    cameras.push({
      rowIndex: i + 1,
      idRegistro: String(valorPorHeaderSirp_(row, headers, 'ID_REGISTRO') || '').trim(),
      nomeReferencia: String(valorPorHeaderSirp_(row, headers, 'NOME_REFERENCIA') || '').trim(),
      nomeCameraEspecifica: String(valorPorHeaderSirp_(row, headers, 'NOME_CAMERA_ESPECIFICA') || '').trim(),
      orgaoGestorCamera: String(valorPorHeaderSirp_(row, headers, 'ORGAO_GESTOR_CAMERA') || '').trim(),
      tipoCamera: String(valorPorHeaderSirp_(row, headers, 'TIPO_CAMERA') || '').trim(),
      tipoFluxoVia: String(valorPorHeaderSirp_(row, headers, 'TIPO_FLUXO_VIA') || '').trim(),
      sentidoFluxoAngulo: numeroSirp_(valorPorHeaderSirp_(row, headers, 'SENTIDO_FLUXO_ANGULO')),
      sentidoFluxoTexto: String(valorPorHeaderSirp_(row, headers, 'SENTIDO_FLUXO_TEXTO') || '').trim(),
      acessoNuip: String(valorPorHeaderSirp_(row, headers, 'ACESSO_NUIP') || '').trim(),
      statusAcesso: classificarAcessoCameraSirp_(valorPorHeaderSirp_(row, headers, 'ACESSO_NUIP')),
      latitudeCamera: lat,
      longitudeCamera: lng,
      statusCamera: status,
      enderecoCamera: String(valorPorHeaderSirp_(row, headers, 'ENDERECO_CAMERA') || '').trim(),
      obsCamera: String(valorPorHeaderSirp_(row, headers, 'OBS_CAMERA') || '').trim(),
      obsFluxoVia: String(valorPorHeaderSirp_(row, headers, 'OBS_FLUXO_VIA') || '').trim()
    });
  }

  return {
    sucesso: true,
    cameras: cameras,
    podeEditar: podeEditar
  };
}

function limitarTextoCameraSirp_(valor, limite, nomeCampo) {
  var texto = String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim();
  if (texto.length > limite) {
    throw new Error(nomeCampo + ' ultrapassa o limite de ' + limite + ' caracteres.');
  }
  return texto;
}

function atualizarCameraSirp(usuarioLogin, identificador, alteracoes) {
  validarEdicaoCameraSirp_(usuarioLogin);

  identificador = identificador || {};
  alteracoes = alteracoes || {};

  var tipo = normalizarSirp_(alteracoes.tipoCamera);
  if (['LPR', 'PTZ', 'FOTOSSENSOR'].indexOf(tipo) === -1) {
    throw new Error('O tipo da câmera deve ser LPR, PTZ ou FOTOSSENSOR.');
  }

  var statusAcesso = classificarAcessoCameraSirp_(alteracoes.acessoNuip);
  var valorAcesso = statusAcesso === 'COM_ACESSO'
    ? 'SIM'
    : statusAcesso === 'SEM_ACESSO'
      ? 'NÃO'
      : statusAcesso === 'AGILIS'
        ? 'AGILIS'
        : '';

  var orgao = limitarTextoCameraSirp_(alteracoes.orgaoGestorCamera, 120, 'Órgão');
  var obsCamera = limitarTextoCameraSirp_(alteracoes.obsCamera, 1000, 'OBS_CAMERA');
  var idRegistro = String(identificador.idRegistro || '').trim();
  var rowIndex = Number(identificador.rowIndex || 0);
  var lock = LockService.getScriptLock();
  var lockAdquirido = false;

  if (!lock || typeof lock.tryLock !== 'function') {
    throw new Error('Não foi possível iniciar o controle de atualização da câmera.');
  }

  lockAdquirido = lock.tryLock(10000);
  if (!lockAdquirido) {
    throw new Error('A câmera está sendo atualizada por outro usuário. Tente novamente em instantes.');
  }

  try {
    var aba = garantirAbaSirpCameras_();
    var dados = aba.getDataRange().getValues();
    if (!dados || dados.length <= 1) {
      throw new Error('Nenhuma câmera foi encontrada para atualização.');
    }

    var headers = dados[0];
    var idxId = indiceSirp_(headers, 'ID_REGISTRO');
    var idxTipo = indiceSirp_(headers, 'TIPO_CAMERA');
    var idxOrgao = indiceSirp_(headers, 'ORGAO_GESTOR_CAMERA');
    var idxAcesso = indiceSirp_(headers, 'ACESSO_NUIP');
    var idxObs = indiceSirp_(headers, 'OBS_CAMERA');

    if ([idxTipo, idxOrgao, idxAcesso, idxObs].some(function(idx) { return idx < 0; })) {
      throw new Error('A aba SIRP_CAMERAS não possui todas as colunas necessárias para edição.');
    }

    var linhaAlvo = 0;
    if (idRegistro && idxId > -1) {
      var correspondencias = [];
      for (var i = 1; i < dados.length; i++) {
        if (String(dados[i][idxId] || '').trim() === idRegistro) {
          correspondencias.push(i + 1);
        }
      }

      if (correspondencias.length > 1) {
        throw new Error('O ID_REGISTRO desta câmera está duplicado. Corrija a planilha antes de editar.');
      }
      if (correspondencias.length === 1) linhaAlvo = correspondencias[0];
      if (correspondencias.length === 0) {
        throw new Error('O ID_REGISTRO da câmera não foi encontrado. Atualize a página e tente novamente.');
      }
    }

    if (!linhaAlvo) {
      if (!Number.isInteger(rowIndex) || rowIndex < 2 || rowIndex > dados.length) {
        throw new Error('Não foi possível identificar com segurança a linha da câmera.');
      }
      linhaAlvo = rowIndex;
    }

    aba.getRange(linhaAlvo, idxTipo + 1).setValue(tipo);
    aba.getRange(linhaAlvo, idxOrgao + 1).setValue(orgao);
    if (valorAcesso) {
      aba.getRange(linhaAlvo, idxAcesso + 1).setValue(valorAcesso);
    } else {
      aba.getRange(linhaAlvo, idxAcesso + 1).clearContent();
    }
    aba.getRange(linhaAlvo, idxObs + 1).setValue(obsCamera);
    SpreadsheetApp.flush();

    return {
      sucesso: true,
      mensagem: 'Dados da câmera atualizados com sucesso.',
      camera: {
        rowIndex: linhaAlvo,
        idRegistro: idRegistro || (idxId > -1 ? String(dados[linhaAlvo - 1][idxId] || '').trim() : ''),
        tipoCamera: tipo,
        tipoCameraNormalizado: tipo,
        orgaoGestorCamera: orgao,
        acessoNuip: valorAcesso,
        statusAcesso: statusAcesso,
        obsCamera: obsCamera
      }
    };
  } finally {
    if (lockAdquirido && lock && typeof lock.releaseLock === 'function') {
      lock.releaseLock();
    }
  }
}

function buscarSugestoesEnderecoSirp(usuarioLogin, consulta) {
  validarAcessoSirp_(usuarioLogin);

  consulta = String(consulta || '').replace(/\s+/g, ' ').trim();
  if (consulta.length < 4) {
    return { sucesso: true, sugestoes: [] };
  }

  if (consulta.length > 180) {
    throw new Error('O endereço informado é muito longo.');
  }

  var cache = CacheService.getScriptCache();
  var chaveCache = 'SIRP_END_' + normalizarSirp_(consulta)
    .replace(/[^A-Z0-9]/g, '_')
    .slice(0, 190);
  var cacheado = cache.get(chaveCache);

  if (cacheado) {
    try {
      return JSON.parse(cacheado);
    } catch (e) {}
  }

  var geocoder = Maps.newGeocoder()
    .setLanguage('pt-BR')
    .setRegion('br')
    .setBounds(-4.05, -38.85, -3.45, -38.30);

  var consultaCompleta = consulta;
  if (!/(?:FORTALEZA|CEARA|CEARÁ|,\s*CE\b)/i.test(consultaCompleta)) {
    consultaCompleta += ', Fortaleza, Ceará, Brasil';
  }

  var resposta;
  try {
    resposta = geocoder.geocode(consultaCompleta);
  } catch (erro) {
    throw new Error('Não foi possível consultar o endereço agora: ' + (erro && erro.message ? erro.message : erro));
  }

  var resultados = (resposta && resposta.results) || [];
  var vistos = {};
  var sugestoes = [];

  for (var i = 0; i < resultados.length && sugestoes.length < 6; i++) {
    var item = resultados[i] || {};
    var geometria = item.geometry || {};
    var local = geometria.location || {};
    var endereco = String(item.formatted_address || '').trim();
    var lat = Number(local.lat);
    var lng = Number(local.lng);

    if (!endereco || isNaN(lat) || isNaN(lng)) continue;

    var chave = normalizarSirp_(endereco);
    if (vistos[chave]) continue;
    vistos[chave] = true;

    sugestoes.push({
      endereco: endereco,
      lat: lat,
      lng: lng,
      correspondenciaParcial: !!item.partial_match,
      precisao: String(geometria.location_type || '').trim(),
      tipos: item.types || []
    });
  }

  var retorno = {
    sucesso: true,
    consulta: consulta,
    sugestoes: sugestoes
  };

  cache.put(chaveCache, JSON.stringify(retorno), 21600);
  return retorno;
}

function obterMalhaViariaSirp(usuarioLogin, latitude, longitude, raio) {
  validarAcessoSirp_(usuarioLogin);

  latitude = Number(latitude);
  longitude = Number(longitude);
  raio = Number(raio);

  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('A localização informada para a malha viária é inválida.');
  }

  if ([200, 500, 1000].indexOf(raio) === -1) {
    throw new Error('O raio da malha viária deve ser 200, 500 ou 1.000 metros.');
  }

  var cache = CacheService.getScriptCache();
  var chaveCache = [
    'SIRP_MALHA',
    latitude.toFixed(4).replace(/[^0-9-]/g, '_'),
    longitude.toFixed(4).replace(/[^0-9-]/g, '_'),
    raio
  ].join('_');
  var cacheado = cache.get(chaveCache);

  if (cacheado) {
    try {
      return JSON.parse(cacheado);
    } catch (e) {}
  }

  var consultaRaio = raio + 100;
  var query = '[out:json][timeout:15];'
    + 'way(around:' + consultaRaio + ',' + latitude + ',' + longitude + ')'
    + '["highway"]["area"!="yes"]'
    + '["highway"!~"^(footway|path|steps|cycleway|pedestrian|bridleway|corridor|construction|proposed|platform|raceway)$"];'
    + '(._;>;);out body qt;';

  var endpoints = [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];
  var ultimoErro = '';

  for (var i = 0; i < endpoints.length; i++) {
    try {
      var resposta = UrlFetchApp.fetch(endpoints[i], {
        method: 'post',
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        payload: { data: query },
        headers: { Accept: 'application/json' },
        muteHttpExceptions: true,
        followRedirects: true
      });

      var codigo = resposta.getResponseCode();
      var texto = resposta.getContentText('UTF-8');

      if (codigo < 200 || codigo >= 300) {
        ultimoErro = 'HTTP ' + codigo;
        continue;
      }

      var dados = JSON.parse(texto);
      if (!dados || !Array.isArray(dados.elements)) {
        ultimoErro = 'resposta inválida';
        continue;
      }

      dados.fonteMalha = endpoints[i];

      try {
        var jsonCache = JSON.stringify(dados);
        if (jsonCache.length <= 90000) {
          cache.put(chaveCache, jsonCache, 3600);
        }
      } catch (eCache) {}

      return dados;
    } catch (erro) {
      ultimoErro = erro && erro.message ? erro.message : String(erro);
    }
  }

  throw new Error(
    'Não foi possível carregar a malha viária nos servidores disponíveis.'
    + (ultimoErro ? ' Último retorno: ' + ultimoErro + '.' : '')
  );
}

function salvarAnaliseSirp(usuarioLogin, payload) {
  validarAcessoSirp_(usuarioLogin);
  payload = payload || {};

  var aba = garantirAbaSirpAnalises_();
  var headers = SIRP_CFG.HEADERS_ANALISES;

  var demanda = payload.demanda || {};
  var origem = payload.origem || {};
  var resultados = payload.resultados || [];
  var rotas = payload.rotas || [];
  var totalTrechos = Number(payload.totalTrechos);
  var totalTrechosComCamera = Number(payload.trechosComCamera);
  var totalTrechosSemCamera = Number(payload.trechosSemCamera);

  var camsAlta = resultados.filter(function(item) {
    return normalizarSirp_(item.classificacaoProbabilidade) === 'ALTA';
  });

  var camsMedia = resultados.filter(function(item) {
    return normalizarSirp_(item.classificacaoProbabilidade) === 'MEDIA' || normalizarSirp_(item.classificacaoProbabilidade) === 'MÉDIA';
  });

  var camsBaixa = resultados.filter(function(item) {
    return normalizarSirp_(item.classificacaoProbabilidade) === 'BAIXA';
  });

  var camsComAcesso = resultados.filter(function(item) {
    var status = classificarAcessoCameraSirp_(item.acessoNuip || item.statusAcesso);
    return status === 'COM_ACESSO' || status === 'AGILIS';
  });

  var camsSemAcesso = resultados.filter(function(item) {
    return classificarAcessoCameraSirp_(item.acessoNuip || item.statusAcesso) === 'SEM_ACESSO';
  });

  var camsAcessoNaoInformado = resultados.filter(function(item) {
    return classificarAcessoCameraSirp_(item.acessoNuip || item.statusAcesso) === 'NAO_INFORMADO';
  });

  var trechosComCamera = rotas.filter(function(item) {
    return !!item.comCamera;
  });

  var trechosSemCamera = rotas.filter(function(item) {
    return !item.comCamera;
  });

  if (!isFinite(totalTrechos) || totalTrechos < 0) totalTrechos = rotas.length;
  if (!isFinite(totalTrechosComCamera) || totalTrechosComCamera < 0) totalTrechosComCamera = trechosComCamera.length;
  if (!isFinite(totalTrechosSemCamera) || totalTrechosSemCamera < 0) totalTrechosSemCamera = trechosSemCamera.length;

  function nomes(lista) {
    return (lista || []).map(function(item) {
      return String(item.nomeReferencia || item.nomeCameraEspecifica || item.idRegistro || '').trim();
    }).filter(Boolean).join('\n');
  }

  var mapa = {
    'ID_ANALISE': Utilities.getUuid(),
    'DATA_HORA_ANALISE': Utilities.formatDate(new Date(), SIRP_CFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    'USUARIO_LOGIN': String(usuarioLogin || '').trim(),
    'ID_DEMANDA': String(demanda.idDemanda || demanda.rowIndex || '').trim(),
    'TIPO_PROCEDIMENTO': String(demanda.tipoProcedimento || '').trim(),
    'NUMERO_PROCEDIMENTO': String(demanda.numeroProcedimento || '').trim(),
    'PROCEDIMENTO_CONCAT': String(demanda.procedimentoConcat || '').trim(),
    'FONTE_LOCALIZACAO': String(payload.fonteLocalizacao || '').trim(),
    'ENDERECO_BUSCADO': String(payload.enderecoBuscado || '').trim(),
    'LATITUDE_ORIGEM': numeroSirp_(origem.lat),
    'LONGITUDE_ORIGEM': numeroSirp_(origem.lng),
    'RAIO_METROS': Number(payload.raioMetros || 0),
    'SENTIDO_ANGULO': Number(payload.sentidoAngulo || 0),
    'SENTIDO_TEXTO': String(payload.sentidoTexto || '').trim(),
    'CAMERAS_NO_RAIO': nomes(resultados),
    'CAMERAS_PROBABILIDADE_ALTA': nomes(camsAlta),
    'CAMERAS_PROBABILIDADE_MEDIA': nomes(camsMedia),
    'CAMERAS_PROBABILIDADE_BAIXA': nomes(camsBaixa),
    'RESULTADO_PROBABILIDADE_JSON': jsonSeguroCelulaSirp_(resultados),
    'OBS_ANALISE': String(payload.obsAnalise || '').trim(),
    'CAMERAS_COM_ACESSO': nomes(camsComAcesso),
    'CAMERAS_SEM_ACESSO': nomes(camsSemAcesso),
    'CAMERAS_ACESSO_NAO_INFORMADO': nomes(camsAcessoNaoInformado),
    'TOTAL_TRECHOS': totalTrechos,
    'TRECHOS_COM_CAMERA': totalTrechosComCamera,
    'TRECHOS_SEM_CAMERA': totalTrechosSemCamera,
    'RESULTADO_ROTAS_JSON': jsonSeguroCelulaSirp_(rotas)
  };

  var linha = headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(mapa, header) ? mapa[header] : '';
  });

  aba.appendRow(linha);

  return {
    sucesso: true,
    mensagem: 'Análise de rotas salva com sucesso.',
    totalCameras: resultados.length,
    comAcesso: camsComAcesso.length,
    semAcesso: camsSemAcesso.length,
    acessoNaoInformado: camsAcessoNaoInformado.length,
    totalTrechos: totalTrechos
  };
}



// ============================================================================
// MÓDULO ADMINISTRATIVO (BACKEND V2) - PRODUTIVIDADE + CAUTELAS + PDF
// ============================================================================

var ADMINISTRATIVO_V2_CFG = {
  MODELO_CAUTELA_DOC_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_MODELO_CAUTELA_DOC_ID"),
  PASTA_CAUTELAS_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_PASTA_DRIVE_ID"),
  ABA_DB_CONFIG: 'DB_CONFIG',
  ABA_CONTROLE_ENVIOS: 'CONTROLE_ENVIOS',
  ABA_CONTROLE_CAUTELAS: 'CONTROLE_CAUTELAS',
  DELEGACIAS_PRODUTIVIDADE: ['DAS', 'DRF', 'DRFV', 'DDF', 'MEU CELULAR'],
  ANO_MINIMO: 2026
};

function normalizarAdmV2_(valor) {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function textoAdmV2_(valor) {
  return String(valor == null ? '' : valor).trim();
}

function indiceAdmV2_(headers, aliases) {
  aliases = aliases || [];

  for (var a = 0; a < aliases.length; a++) {
    var alvo = normalizarAdmV2_(aliases[a]);

    for (var i = 0; i < headers.length; i++) {
      if (normalizarAdmV2_(headers[i]) === alvo) return i;
    }
  }

  return -1;
}

function usuarioAdmV2_(usuarioLogin) {
  var usuario = obterUsuarioPortalPorLogin_(usuarioLogin);
  if (!usuario) throw new Error('Usuário não encontrado.');

  var perfil = normalizarAdmV2_(usuario.perfil);
  var lotacao = normalizarAdmV2_(usuario.delegacia || usuario.lotacao || '');

  var podeVerTudo =
    perfil === 'ADMIN' ||
    perfil === 'CRIADOR/ADMIN' ||
    perfil === 'CRIADOR ADMIN' ||
    perfil === 'DIRECAO' ||
    perfil === 'DIRETORIA' ||
    perfil === 'ADMINISTRATIVO';

  usuario._classeAdmV2 = podeVerTudo ? 'GESTAO' : 'USUARIO';
  usuario._podeVerTudoCautelas = podeVerTudo;
  usuario._podeCadastrarCautelas = podeVerTudo;
  usuario._podeVerPendenciasProdutividade =
    perfil === 'ADMINISTRATIVO' || lotacao.indexOf('ADMINISTRATIVO') > -1;

  return usuario;
}

function mesesAdmV2_() {
  return [
    'JANEIRO',
    'FEVEREIRO',
    'MARÇO',
    'ABRIL',
    'MAIO',
    'JUNHO',
    'JULHO',
    'AGOSTO',
    'SETEMBRO',
    'OUTUBRO',
    'NOVEMBRO',
    'DEZEMBRO'
  ];
}

function formatarDataCautelaAdmV2_() {
  var agora = new Date();

  var meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro'
  ];

  var dia = Utilities.formatDate(agora, 'America/Fortaleza', 'd');
  var mes = meses[Number(Utilities.formatDate(agora, 'America/Fortaleza', 'M')) - 1];
  var ano = Utilities.formatDate(agora, 'America/Fortaleza', 'yyyy');

  return 'Fortaleza, ' + dia + ' de ' + mes + ' de ' + ano + '.';
}

function obterPendenciasProdutividadeAdmV2_(ss) {
  ss = ss || SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);

  var hoje = new Date();
  var anoAtual = Number(Utilities.formatDate(hoje, 'America/Fortaleza', 'yyyy'));
  var mesAtualNumero = Number(Utilities.formatDate(hoje, 'America/Fortaleza', 'M'));

  var mesesBase = mesesAdmV2_();

  if (anoAtual < ADMINISTRATIVO_V2_CFG.ANO_MINIMO) {
    return {
      anoAtual: anoAtual,
      mesAtual: '',
      mesesAvaliados: [],
      totalPendencias: 0,
      todasEnviaram: true,
      mensagem: 'A verificação de produtividade será iniciada a partir de 2026.'
    };
  }

  var mesesAteAtual = mesesBase.slice(0, mesAtualNumero);
  var enviados = {};

  var aba = ss.getSheetByName(ADMINISTRATIVO_V2_CFG.ABA_CONTROLE_ENVIOS);

  if (aba && aba.getLastRow() > 1) {
    var dados = aba.getDataRange().getValues();
    var headers = dados[0] || [];

    var idxDelegacia = indiceAdmV2_(headers, ['DELEGACIA', 'UNIDADE', 'UNIDADE_RESPONSAVEL']);
    var idxMes = indiceAdmV2_(headers, ['MÊS', 'MES']);
    var idxAno = indiceAdmV2_(headers, ['ANO']);

    if (idxDelegacia > -1 && idxMes > -1 && idxAno > -1) {
      for (var i = 1; i < dados.length; i++) {
        var delegacia = normalizarAdmV2_(dados[i][idxDelegacia]);
        var mes = normalizarAdmV2_(dados[i][idxMes]);
        var ano = Number(String(dados[i][idxAno] || '').replace(/\D/g, ''));

        if (!delegacia || !mes || ano !== anoAtual) continue;

        enviados[mes + '::' + delegacia] = true;
      }
    }
  }

  var mesesAvaliados = [];
  var totalPendencias = 0;

  for (var m = 0; m < mesesAteAtual.length; m++) {
    var mesNome = mesesAteAtual[m];
    var pendentes = [];
    var enviadas = [];

    for (var d = 0; d < ADMINISTRATIVO_V2_CFG.DELEGACIAS_PRODUTIVIDADE.length; d++) {
      var unidade = ADMINISTRATIVO_V2_CFG.DELEGACIAS_PRODUTIVIDADE[d];
      var chave = normalizarAdmV2_(mesNome) + '::' + normalizarAdmV2_(unidade);

      if (enviados[chave]) {
        enviadas.push(unidade);
      } else {
        pendentes.push(unidade);
      }
    }

    totalPendencias += pendentes.length;

    mesesAvaliados.push({
      mes: mesNome,
      enviadas: enviadas,
      pendentes: pendentes,
      completo: pendentes.length === 0
    });
  }

  return {
    anoAtual: anoAtual,
    mesAtual: mesesBase[mesAtualNumero - 1],
    mesesAvaliados: mesesAvaliados,
    totalPendencias: totalPendencias,
    todasEnviaram: totalPendencias === 0,
    mensagem: totalPendencias === 0
      ? 'Não há delegacia pendente cadastrada no Sistema DEPATRI.'
      : 'Existem pendências de produtividade em ' + anoAtual + '.'
  };
}

function categoriaObjetoCautelaAdmV2_(item) {
  var itemNorm = normalizarAdmV2_(item);

  if (
    itemNorm === 'FUZIL' ||
    itemNorm === 'ESPINGARDA' ||
    itemNorm === 'METRALHADORA' ||
    itemNorm === 'SUBMETRALHADORA'
  ) {
    return 'Arma';
  }

  if (itemNorm.indexOf('CAMERA') > -1 || itemNorm.indexOf('GOPRO') > -1) {
    return 'Camera';
  }

  if (itemNorm.indexOf('RADIO') > -1) {
    return 'Rádio';
  }

  if (itemNorm.indexOf('RASTREADOR') > -1 || itemNorm.indexOf('TAG') > -1) {
    return 'Rastreador';
  }

  return item || '';
}

function lerDbConfigCautelasAdmV2_() {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName(ADMINISTRATIVO_V2_CFG.ABA_DB_CONFIG);

  if (!aba) throw new Error("Aba 'DB_CONFIG' não encontrada.");

  var dados = aba.getDataRange().getValues();

  var retorno = {
    itens: [],
    modelosPorItem: {},
    seriesPorItem: {},
    tombosPorItemSerie: {},
    policiais: [],
    itensAdicionais: []
  };

  if (!dados.length) return retorno;

  var headers = dados[0] || [];

  var idxCategoria = indiceAdmV2_(headers, ['CATEGORIA']);
  var idxNome = indiceAdmV2_(headers, ['NOME']);
  var idxValorExtra = indiceAdmV2_(headers, ['VALOR_EXTRA']);
  var idxValorAdicional = indiceAdmV2_(headers, ['VALOR_ADICIONAL']);
  var idxModalidade = indiceAdmV2_(headers, ['MODALIDADE']);

  if (idxCategoria < 0 || idxNome < 0) {
    throw new Error("A aba 'DB_CONFIG' precisa conter CATEGORIA e NOME.");
  }

  function addUnico(lista, valor) {
    valor = textoAdmV2_(valor);
    if (valor && lista.indexOf(valor) === -1) lista.push(valor);
  }

  for (var i = 1; i < dados.length; i++) {
    var categoria = textoAdmV2_(dados[i][idxCategoria]);
    var categoriaNorm = normalizarAdmV2_(categoria);
    var nome = textoAdmV2_(dados[i][idxNome]);
    var valorExtra = idxValorExtra > -1 ? textoAdmV2_(dados[i][idxValorExtra]) : '';
    var valorAdicional = idxValorAdicional > -1 ? textoAdmV2_(dados[i][idxValorAdicional]) : '';
    var modalidade = idxModalidade > -1 ? textoAdmV2_(dados[i][idxModalidade]) : '';

    if (!categoria || !nome) continue;

    if (categoriaNorm === 'ITEM') {
      addUnico(retorno.itens, nome);
      continue;
    }

    if (categoriaNorm === 'POLICIAIS_CAUTELAS') {
      retorno.policiais.push({
        nome: nome,
        policial: valorAdicional,
        cargo: valorExtra,
        matricula: modalidade
      });
      continue;
    }

    if (categoriaNorm === 'ITEM_ADICIONAL') {
      addUnico(retorno.itensAdicionais, nome);
      continue;
    }
  }

  for (var it = 0; it < retorno.itens.length; it++) {
    var item = retorno.itens[it];
    var itemNorm = normalizarAdmV2_(item);
    var serieNorm = itemNorm + '_SERIE';

    retorno.modelosPorItem[item] = [];
    retorno.seriesPorItem[item] = [];
    retorno.tombosPorItemSerie[item] = {};

    for (var r = 1; r < dados.length; r++) {
      var catLinha = textoAdmV2_(dados[r][idxCategoria]);
      var catNorm = normalizarAdmV2_(catLinha);
      var nomeLinha = textoAdmV2_(dados[r][idxNome]);
      var tomboLinha = idxValorExtra > -1 ? textoAdmV2_(dados[r][idxValorExtra]) : '';

      if (!nomeLinha) continue;

      if (catNorm === itemNorm) {
        addUnico(retorno.modelosPorItem[item], nomeLinha);
      }

      if (catNorm === serieNorm) {
        addUnico(retorno.seriesPorItem[item], nomeLinha);
        retorno.tombosPorItemSerie[item][nomeLinha] = tomboLinha;
      }
    }

    retorno.modelosPorItem[item].sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
    retorno.seriesPorItem[item].sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
  }

  retorno.itens.sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
  retorno.policiais.sort(function(a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  retorno.itensAdicionais.sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });

  return retorno;
}

function garantirAbaControleCautelasAdmV2_(ss) {
  ss = ss || SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);

  var headersObrigatorios = [
    'Categoria',
    'ITEM/NOME',
    'MODELO',
    'Nº SÉRIE/PLACA',
    'RESPONSÁVEL',
    'PLACA_SIGILOSA',
    'CONFIRMAÇÃO',
    'CAUTELA_FIXA',
    'DATA_CADASTRO',
    'USUARIO_CADASTRO',
    'LINK_PDF_CAUTELA'
  ];

  var aba = ss.getSheetByName(ADMINISTRATIVO_V2_CFG.ABA_CONTROLE_CAUTELAS);

  if (!aba) {
    aba = ss.insertSheet(ADMINISTRATIVO_V2_CFG.ABA_CONTROLE_CAUTELAS);
    aba.getRange(1, 1, 1, headersObrigatorios.length).setValues([headersObrigatorios]);
    aba.setFrozenRows(1);
    return aba;
  }

  if (aba.getLastRow() === 0 || aba.getLastColumn() === 0) {
    aba.getRange(1, 1, 1, headersObrigatorios.length).setValues([headersObrigatorios]);
    aba.setFrozenRows(1);
    return aba;
  }

  var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];

  headersObrigatorios.forEach(function(h) {
    if (indiceAdmV2_(headers, [h]) === -1) {
      aba.getRange(1, aba.getLastColumn() + 1).setValue(h);
      headers.push(h);
    }
  });

  aba.setFrozenRows(1);
  return aba;
}

function mapaHeadersControleCautelasAdmV2_(headers) {
  return {
    categoria: indiceAdmV2_(headers, ['Categoria', 'CATEGORIA']),
    item: indiceAdmV2_(headers, ['ITEM/NOME', 'ITEM', 'NOME']),
    modelo: indiceAdmV2_(headers, ['MODELO']),
    serie: indiceAdmV2_(headers, ['Nº SÉRIE/PLACA', 'N SERIE PLACA', 'SERIE', 'SÉRIE', 'PLACA']),
    responsavel: indiceAdmV2_(headers, ['RESPONSÁVEL', 'RESPONSAVEL']),
    placaSigilosa: indiceAdmV2_(headers, ['PLACA_SIGILOSA', 'PLACA SIGILOSA']),
    confirmacao: indiceAdmV2_(headers, ['CONFIRMAÇÃO', 'CONFIRMACAO']),
    cautelaFixa: indiceAdmV2_(headers, ['CAUTELA_FIXA', 'CAUTELA FIXA']),
    dataCadastro: indiceAdmV2_(headers, ['DATA_CADASTRO', 'DATA CADASTRO']),
    usuarioCadastro: indiceAdmV2_(headers, ['USUARIO_CADASTRO', 'USUÁRIO_CADASTRO', 'USUARIO CADASTRO']),
    linkPdf: indiceAdmV2_(headers, ['LINK_PDF_CAUTELA', 'LINK PDF CAUTELA'])
  };
}

function usuarioEhResponsavelCautelaAdmV2_(usuario, responsavel) {
  var resp = normalizarAdmV2_(responsavel);
  var nome = normalizarAdmV2_(usuario && usuario.nome);
  var login = normalizarAdmV2_(usuario && usuario.login);
  var email = normalizarAdmV2_(usuario && usuario.email);

  if (!resp) return false;
  if (nome && resp === nome) return true;
  if (nome && (resp.indexOf(nome) > -1 || nome.indexOf(resp) > -1)) return true;
  if (login && resp === login) return true;
  if (email && resp === email) return true;

  return false;
}

function lerControleCautelasAdmV2_(usuarioLogin, termo) {
  var usuario = usuarioAdmV2_(usuarioLogin);
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = garantirAbaControleCautelasAdmV2_(ss);

  if (aba.getLastRow() < 2) {
    return [];
  }

  var dados = aba.getDataRange().getValues();
  var headers = dados[0] || [];
  var idx = mapaHeadersControleCautelasAdmV2_(headers);

  var termoNorm = normalizarAdmV2_(termo);
  var lista = [];

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];

    var item = {
      rowIndex: i + 1,
      categoria: textoAdmV2_(row[idx.categoria]),
      itemNome: textoAdmV2_(row[idx.item]),
      modelo: textoAdmV2_(row[idx.modelo]),
      seriePlaca: textoAdmV2_(row[idx.serie]),
      responsavel: textoAdmV2_(row[idx.responsavel]),
      placaSigilosa: textoAdmV2_(row[idx.placaSigilosa]),
      confirmacao: textoAdmV2_(row[idx.confirmacao]),
      cautelaFixa: textoAdmV2_(row[idx.cautelaFixa]),
      dataCadastro: idx.dataCadastro > -1 && row[idx.dataCadastro]
        ? Utilities.formatDate(new Date(row[idx.dataCadastro]), 'America/Fortaleza', 'dd/MM/yyyy HH:mm')
        : '',
      usuarioCadastro: idx.usuarioCadastro > -1 ? textoAdmV2_(row[idx.usuarioCadastro]) : '',
      linkPdf: idx.linkPdf > -1 ? textoAdmV2_(row[idx.linkPdf]) : ''
    };

    if (!usuario._podeVerTudoCautelas && !usuarioEhResponsavelCautelaAdmV2_(usuario, item.responsavel)) {
      continue;
    }

    if (termoNorm) {
      var base = normalizarAdmV2_([
        item.categoria,
        item.itemNome,
        item.modelo,
        item.seriePlaca,
        item.responsavel,
        item.placaSigilosa,
        item.confirmacao,
        item.cautelaFixa,
        item.dataCadastro,
        item.usuarioCadastro
      ].join(' '));

      if (base.indexOf(termoNorm) === -1) continue;
    }

    lista.push(item);
  }

  return lista;
}

function pesquisarCautelasAdministrativoV2(usuarioLogin, termo) {
  try {
    var usuario = usuarioAdmV2_(usuarioLogin);

    return {
      sucesso: true,
      classe: usuario._classeAdmV2,
      podeVerTudo: usuario._podeVerTudoCautelas,
      cautelas: lerControleCautelasAdmV2_(usuarioLogin, termo || '')
    };

  } catch (erro) {
    return {
      sucesso: false,
      erro: erro.toString()
    };
  }
}

function obterBootstrapAdministrativoV2(usuarioLogin) {
  try {
    var usuario = usuarioAdmV2_(usuarioLogin);
    var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);

    return {
      sucesso: true,
      classe: usuario._classeAdmV2,
      podeVerTudo: usuario._podeVerTudoCautelas,
      podeCadastrar: usuario._podeCadastrarCautelas,
      podeVerPendencias: usuario._podeVerPendenciasProdutividade,
      pendencias: usuario._podeVerPendenciasProdutividade ? obterPendenciasProdutividadeAdmV2_(ss) : null,
      cautelasConfig: usuario._podeCadastrarCautelas ? lerDbConfigCautelasAdmV2_() : null,
      cautelas: lerControleCautelasAdmV2_(usuarioLogin, '')
    };

  } catch (erro) {
    return {
      sucesso: false,
      erro: erro.toString()
    };
  }
}

// ============================================================================
// MÓDULO INÍCIO / HOME DEPATRI - INDICADORES DO USUÁRIO
// ============================================================================

function usuarioEhDelegaciaHomeDepatri_(usuario) {
  var perfil = normalizarAdmV2_(usuario && usuario.perfil);
  var lotacao = normalizarAdmV2_(usuario && (usuario.lotacao || usuario.delegacia));
  if (perfil.indexOf('DELEGACIA') > -1 || lotacao.indexOf('DELEGACIA') > -1) return true;

  var delegacias = (ADMINISTRATIVO_V2_CFG.DELEGACIAS_PRODUTIVIDADE || []).slice();
  for (var i = 0; i < delegacias.length; i++) {
    var unidade = normalizarAdmV2_(delegacias[i]);
    if (!unidade) continue;
    if (lotacao === unidade) return true;
    var re = new RegExp('(^|[^A-Z0-9])' + unidade.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '([^A-Z0-9]|$)');
    if (re.test(lotacao)) return true;
  }
  return false;
}

function usuarioEhAdministrativoHomeDepatri_(usuario) {
  var perfil = normalizarAdmV2_(usuario && usuario.perfil);
  var lotacao = normalizarAdmV2_(usuario && (usuario.lotacao || usuario.delegacia));
  return perfil === 'ADMINISTRATIVO' || lotacao.indexOf('ADMINISTRATIVO') > -1;
}

function lerAcervoPessoalHomeDepatri_(usuario, ss) {
  ss = ss || SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = garantirAbaControleCautelasAdmV2_(ss);
  var retorno = {
    total: 0,
    itens: [],
    mensagem: 'Não há acervo acautelado em seu nome.'
  };
  if (aba.getLastRow() < 2) return retorno;

  var dados = aba.getDataRange().getValues();
  var headers = dados[0] || [];
  var idx = mapaHeadersControleCautelasAdmV2_(headers);
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var responsavel = idx.responsavel > -1 ? textoAdmV2_(row[idx.responsavel]) : '';
    if (!usuarioEhResponsavelCautelaAdmV2_(usuario, responsavel)) continue;

    var item = {
      nome: idx.item > -1 ? textoAdmV2_(row[idx.item]) : '',
      modelo: idx.modelo > -1 ? textoAdmV2_(row[idx.modelo]) : '',
      seriePlaca: idx.serie > -1 ? textoAdmV2_(row[idx.serie]) : ''
    };
    if (!item.nome && !item.modelo && !item.seriePlaca) continue;
    retorno.total++;
    if (retorno.itens.length < 5) retorno.itens.push(item);
  }

  if (retorno.total > 0) {
    retorno.mensagem = retorno.total + ' item(ns) acautelado(s) em seu nome.';
  }
  return retorno;
}

function obterPainelUsuarioHomeDepatri(usuarioLogin) {
  try {
    var usuario = obterUsuarioPortalPorLogin_(usuarioLogin);
    if (!usuario) throw new Error('Usuário não encontrado.');

    var ehDelegacia = usuarioEhDelegaciaHomeDepatri_(usuario);
    var ehAdministrativo = usuarioEhAdministrativoHomeDepatri_(usuario);
    var retorno = {
      sucesso: true,
      usuario: {
        nome: textoAdmV2_(usuario.nome),
        cargo: textoAdmV2_(usuario.cargo),
        perfil: textoAdmV2_(usuario.perfil),
        lotacao: textoAdmV2_(usuario.lotacao || usuario.delegacia)
      },
      visibilidade: {
        horasExtras: !ehDelegacia,
        acervoAcautelado: !ehDelegacia,
        pendenciasProdutividade: ehAdministrativo
      },
      horasExtras: null,
      acervoAcautelado: null,
      pendenciasProdutividade: null
    };

    if (!ehDelegacia) {
      var horas = obterResumoHorasExtrasCicloAtualUsuario_(usuarioLogin);
      horas.mensagem = Number(horas.totalHoras || 0) > 0
        ? 'Horas extras registradas no ciclo atual.'
        : 'Não há hora extra cadastrada no ciclo atual.';
      retorno.horasExtras = horas;

      var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
      retorno.acervoAcautelado = lerAcervoPessoalHomeDepatri_(usuario, ss);
      if (ehAdministrativo) {
        retorno.pendenciasProdutividade = obterPendenciasProdutividadeAdmV2_(ss);
        if (retorno.pendenciasProdutividade.todasEnviaram) {
          retorno.pendenciasProdutividade.mensagem = 'Não há delegacia pendente cadastrada no Sistema DEPATRI.';
        }
      }
    } else if (ehAdministrativo) {
      // Mantém a regra explícita caso o cadastro possua perfil e lotação conflitantes.
      retorno.pendenciasProdutividade = obterPendenciasProdutividadeAdmV2_();
    }

    return retorno;
  } catch (erro) {
    return { sucesso: false, erro: erro.toString() };
  }
}

function substituirDocAdmV2_(body, tag, valor) {
  valor = String(valor == null ? '' : valor);
  var regex = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  body.replaceText(regex, valor);
}

function gerarPdfCautelaAdmV2_(dados) {
  var pasta = DriveApp.getFolderById(ADMINISTRATIVO_V2_CFG.PASTA_CAUTELAS_ID);
  var modeloArquivo = DriveApp.getFileById(ADMINISTRATIVO_V2_CFG.MODELO_CAUTELA_DOC_ID);

  var dataNome = Utilities.formatDate(new Date(), 'America/Fortaleza', 'yyyyMMdd_HHmmss');
  var nomeBase = 'TERMO DE CAUTELA - ' + dados.responsavel + ' - ' + dados.modelo + ' - ' + dataNome;

  var copia = modeloArquivo.makeCopy(nomeBase, pasta);
  var doc = DocumentApp.openById(copia.getId());
  var body = doc.getBody();

  substituirDocAdmV2_(body, '<<ITEM>>', dados.item);
  substituirDocAdmV2_(body, '<<MODELO>>', dados.modelo);
  substituirDocAdmV2_(body, '<<SERIE>>', dados.serie);
  substituirDocAdmV2_(body, '<<TOMBO>>', dados.tombo);
  substituirDocAdmV2_(body, '<<RESPONSAVEL>>', dados.responsavel);
  substituirDocAdmV2_(body, '<<DATA>>', formatarDataCautelaAdmV2_());
  substituirDocAdmV2_(body, '<<POLICIAL>>', dados.policial);
  substituirDocAdmV2_(body, '<<CARGO>>', dados.cargo);
  substituirDocAdmV2_(body, '<<MATRICULA>', dados.matricula);
  substituirDocAdmV2_(body, '<<ITEM ADICIONAIS>>', dados.itensAdicionaisTexto);

  doc.saveAndClose();

  var pdfBlob = DriveApp.getFileById(copia.getId()).getAs(MimeType.PDF);
  pdfBlob.setName(nomeBase + '.pdf');

  var arquivoPdf = pasta.createFile(pdfBlob);

  // Mantém somente o PDF final. O Google Docs fica como temporário.
  try {
    DriveApp.getFileById(copia.getId()).setTrashed(true);
  } catch (e) {}

  return {
    nomeArquivo: nomeBase + '.pdf',
    pdfId: arquivoPdf.getId(),
    pdfUrl: arquivoPdf.getUrl()
  };
}

function procurarLinhaCautelaPorSerieAdmV2_(aba, idx, dados, seriePlaca) {
  var serieNorm = normalizarAdmV2_(seriePlaca);
  if (!serieNorm || idx.serie < 0) return 0;

  for (var i = 1; i < dados.length; i++) {
    var serieLinha = normalizarAdmV2_(dados[i][idx.serie]);
    if (serieLinha && serieLinha === serieNorm) {
      return i + 1;
    }
  }

  return 0;
}

function gravarLinhaCautelaAdmV2_(aba, headers, idx, objeto) {
  var dados = aba.getDataRange().getValues();
  var linhaExistente = procurarLinhaCautelaPorSerieAdmV2_(aba, idx, dados, objeto.seriePlaca);

  var linha = Array(headers.length).fill('');

  if (linhaExistente) {
    linha = aba.getRange(linhaExistente, 1, 1, headers.length).getValues()[0];
  }

  if (idx.categoria > -1) linha[idx.categoria] = objeto.categoria || '';
  if (idx.item > -1) linha[idx.item] = objeto.itemNome || '';
  if (idx.modelo > -1) linha[idx.modelo] = objeto.modelo || '';
  if (idx.serie > -1) linha[idx.serie] = objeto.seriePlaca || '';
  if (idx.responsavel > -1) linha[idx.responsavel] = objeto.responsavel || '';
  if (idx.placaSigilosa > -1) linha[idx.placaSigilosa] = objeto.placaSigilosa || '';
  if (idx.confirmacao > -1) linha[idx.confirmacao] = objeto.confirmacao || 'Pendente';
  if (idx.cautelaFixa > -1) linha[idx.cautelaFixa] = objeto.cautelaFixa || 'NÃO';
  if (idx.dataCadastro > -1) linha[idx.dataCadastro] = objeto.dataCadastro || new Date();
  if (idx.usuarioCadastro > -1) linha[idx.usuarioCadastro] = objeto.usuarioCadastro || '';
  if (idx.linkPdf > -1) linha[idx.linkPdf] = objeto.linkPdf || '';

  if (linhaExistente) {
    aba.getRange(linhaExistente, 1, 1, headers.length).setValues([linha]);
    if (idx.dataCadastro > -1) {
      aba.getRange(linhaExistente, idx.dataCadastro + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    }
    return linhaExistente;
  }

  aba.appendRow(linha);
  var novaLinha = aba.getLastRow();

  if (idx.dataCadastro > -1) {
    aba.getRange(novaLinha, idx.dataCadastro + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }

  return novaLinha;
}

function salvarCautelaAdministrativoV2(usuarioLogin, payload) {
  try {
    var usuario = usuarioAdmV2_(usuarioLogin);

    if (!usuario._podeCadastrarCautelas) {
      throw new Error('Seu perfil não possui permissão para cadastrar cautelas.');
    }

    payload = payload || {};

    var item = textoAdmV2_(payload.item);
    var modelo = textoAdmV2_(payload.modelo);
    var serie = textoAdmV2_(payload.serie);
    var responsavel = textoAdmV2_(payload.responsavel);
    var placaSigilosa = textoAdmV2_(payload.placaSigilosa || '');
    var confirmacao = textoAdmV2_(payload.confirmacao || 'Pendente');
    var cautelaFixa = normalizarAdmV2_(payload.cautelaFixa || 'NÃO') === 'SIM' ? 'SIM' : 'NÃO';
    var itensAdicionais = payload.itensAdicionais || [];

    if (!item) throw new Error('Selecione o item principal.');
    if (!modelo) throw new Error('Selecione o modelo.');
    if (!serie) throw new Error('Selecione a série.');
    if (!responsavel) throw new Error('Selecione o responsável.');

    var cfg = lerDbConfigCautelasAdmV2_();

    var tombo = '';
    if (cfg.tombosPorItemSerie[item] && cfg.tombosPorItemSerie[item][serie]) {
      tombo = cfg.tombosPorItemSerie[item][serie];
    }

    var policialInfo = null;

    for (var p = 0; p < cfg.policiais.length; p++) {
      if (normalizarAdmV2_(cfg.policiais[p].nome) === normalizarAdmV2_(responsavel)) {
        policialInfo = cfg.policiais[p];
        break;
      }
    }

    if (!policialInfo) {
      throw new Error('Responsável não encontrado na categoria POLICIAIS_CAUTELAS da DB_CONFIG.');
    }

    var itensAdicionaisTexto = (itensAdicionais || [])
      .map(function(x) { return textoAdmV2_(x); })
      .filter(function(x) { return !!x; })
      .join('\n');

    var linkPdf = '';
    var nomePdf = '';

    if (cautelaFixa === 'SIM') {
      var pdf = gerarPdfCautelaAdmV2_({
        item: item,
        modelo: modelo,
        serie: serie,
        tombo: tombo,
        responsavel: responsavel,
        policial: policialInfo.policial || '',
        cargo: policialInfo.cargo || '',
        matricula: policialInfo.matricula || '',
        itensAdicionaisTexto: itensAdicionaisTexto
      });

      linkPdf = pdf.pdfUrl;
      nomePdf = pdf.nomeArquivo;
    }

    var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    var aba = garantirAbaControleCautelasAdmV2_(ss);
    var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    var idx = mapaHeadersControleCautelasAdmV2_(headers);

    var dataCadastro = new Date();
    var usuarioCadastro = usuario.nome || usuario.login || usuarioLogin;

    var linhasGravadas = [];

    var objetoPrincipal = {
      categoria: categoriaObjetoCautelaAdmV2_(item),
      itemNome: item,
      modelo: modelo,
      seriePlaca: serie,
      responsavel: responsavel,
      placaSigilosa: placaSigilosa,
      confirmacao: confirmacao,
      cautelaFixa: cautelaFixa,
      dataCadastro: dataCadastro,
      usuarioCadastro: usuarioCadastro,
      linkPdf: linkPdf
    };

    linhasGravadas.push(gravarLinhaCautelaAdmV2_(aba, headers, idx, objetoPrincipal));

    (itensAdicionais || []).forEach(function(itemAdd) {
      itemAdd = textoAdmV2_(itemAdd);
      if (!itemAdd) return;

      var objetoAdicional = {
        categoria: 'Item adicional',
        itemNome: itemAdd,
        modelo: '',
        seriePlaca: '',
        responsavel: responsavel,
        placaSigilosa: placaSigilosa,
        confirmacao: confirmacao,
        cautelaFixa: cautelaFixa,
        dataCadastro: dataCadastro,
        usuarioCadastro: usuarioCadastro,
        linkPdf: linkPdf
      };

      linhasGravadas.push(gravarLinhaCautelaAdmV2_(aba, headers, idx, objetoAdicional));
    });

    return {
      sucesso: true,
      mensagem: cautelaFixa === 'SIM'
        ? 'Cautela registrada e PDF gerado com sucesso.'
        : 'Cautela registrada na planilha. Como não é cautela fixa, nenhum PDF foi gerado.',
      cautelaFixa: cautelaFixa,
      linkPdf: linkPdf,
      nomePdf: nomePdf,
      linhasGravadas: linhasGravadas,
      cautelas: lerControleCautelasAdmV2_(usuarioLogin, '')
    };

  } catch (erro) {
    return {
      sucesso: false,
      erro: erro.toString()
    };
  }
}

function confirmarCautelaAdministrativoV2(usuarioLogin, rowIndex) {
  try {
    var usuario = usuarioAdmV2_(usuarioLogin);

    rowIndex = Number(rowIndex || 0);
    if (!rowIndex || rowIndex < 2) throw new Error('Linha inválida.');

    var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
    var aba = garantirAbaControleCautelasAdmV2_(ss);

    var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    var idx = mapaHeadersControleCautelasAdmV2_(headers);

    var row = aba.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    var responsavel = idx.responsavel > -1 ? textoAdmV2_(row[idx.responsavel]) : '';

    if (!usuario._podeVerTudoCautelas && !usuarioEhResponsavelCautelaAdmV2_(usuario, responsavel)) {
      throw new Error('Você só pode confirmar cautelas vinculadas ao seu nome.');
    }

    if (idx.confirmacao < 0) throw new Error('Coluna CONFIRMAÇÃO não encontrada.');

    aba.getRange(rowIndex, idx.confirmacao + 1).setValue('Confirmado');

    return {
      sucesso: true,
      mensagem: 'Cautela confirmada com sucesso.',
      cautelas: lerControleCautelasAdmV2_(usuarioLogin, '')
    };

  } catch (erro) {
    return {
      sucesso: false,
      erro: erro.toString()
    };
  }
}

// ============================================================================
// COMPATIBILIDADE DO MÓDULO ADMINISTRATIVO COM O FRONTEND
// ============================================================================

function obterBootstrapAdministrativo(usuarioLogin) {
  return obterBootstrapAdministrativoV2(usuarioLogin);
}

function pesquisarCautelasAdministrativo(usuarioLogin, termo) {
  return pesquisarCautelasAdministrativoV2(usuarioLogin, termo);
}

function gerarCautelaAdministrativo(usuarioLogin, payload) {
  return salvarCautelaAdministrativoV2(usuarioLogin, payload);
}

function confirmarCautelaAdministrativo(usuarioLogin, rowIndex) {
  return confirmarCautelaAdministrativoV2(usuarioLogin, rowIndex);
}

// ============================================================================
// MÓDULO EXTRAÇÃO REMOVIDO DO PORTAL DEPATRI
// ============================================================================

// ============================================================================
// MÓDULO 4 - NÚCLEO OPERACIONAL DO DESENVOLVIMENTO DE DEMANDAS ATIVAS
// Implementação consolidada das funções chamadas pelo JAVASCRIPT.html.
// Mantém o código de navegador fora do MAESTRO.gs.
// ============================================================================

var DESENV_CORE_CFG = {
  SHEET_IMAGENS: 'ADD_EVOLUCOES_IMAGENS',
  ROOT_FOLDER_NAME: 'RT - DESENVOLVIMENTO DE DEMANDAS ATIVAS',
  PROP_TEMPLATE_RT_ID: 'PORTAL_DEPATRI_RT_TEMPLATE_ID',
  TEMPLATE_RT_FALLBACK_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_TEMPLATE_RT_FALLBACK_ID"),
  PROP_BRASAO_FILE_ID: 'PORTAL_DEPATRI_BRASAO_FILE_ID',
  BRASAO_FALLBACK_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_BRASAO_FALLBACK_ID")
};

function desenvCoreHeadersDemandas_() {
  return [
    'ID_DEMANDA', 'NUM_OCORRENCIA', 'TIPO_OCORRENCIA', 'NUMERO_PROCEDIMENTO',
    'DELEGADO', 'DEMANDA_ININTERRUPTA', 'DESCRICAO', 'INFORMACOES_INICIAIS',
    'RESUMO', 'DATA', 'HORA', 'EQUIPE', 'STATUS', 'CRIME', 'DIFUSAO',
    'COMPILADO', 'NUM_RT', 'PASTA_RT_ID', 'LINK_DRIVE_IMAGENS',
    'URL_DOC_RT', 'URL_PDF_RT', 'USUARIO_CRIADOR', 'DATA_CRIACAO',
    'DATA_ATUALIZACAO', 'EXCLUIDO'
  ];
}

function desenvCoreHeadersEvolucoes_() {
  return [
    'ID_EVOLUCAO', 'NUM_OCORRENCIA', 'ORDEM', 'HORA', 'EQUIPE',
    'DESENVOLVIMENTO', 'USUARIO', 'DATA_CRIACAO', 'DATA_ATUALIZACAO', 'EXCLUIDO'
  ];
}

function desenvCoreHeadersImagens_() {
  return [
    'ID_IMAGEM', 'ID_EVOLUCAO', 'NUM_OCORRENCIA', 'ORDEM', 'NOME',
    'MIME_TYPE', 'FILE_ID', 'URL', 'LEGENDA', 'USUARIO',
    'DATA_CRIACAO', 'DATA_ATUALIZACAO', 'EXCLUIDO'
  ];
}

function desenvCoreGarantirAba_(nome, headers) {
  var ss = abrirPlanilhaMaeDesenv_();
  var aba = ss.getSheetByName(nome);
  if (!aba) aba = ss.insertSheet(nome);

  if (aba.getLastRow() === 0 || aba.getLastColumn() === 0) {
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);
    aba.setFrozenRows(1);
    return aba;
  }

  var atuais = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var mapa = {};
  atuais.forEach(function(h) {
    mapa[normalizarDesenvDemandas_(h)] = true;
  });

  headers.forEach(function(h) {
    var chave = normalizarDesenvDemandas_(h);
    if (!mapa[chave]) {
      aba.getRange(1, aba.getLastColumn() + 1).setValue(h);
      mapa[chave] = true;
    }
  });
  aba.setFrozenRows(1);
  return aba;
}

function desenvCoreEstrutura_() {
  return {
    demandas: desenvCoreGarantirAba_(DESENV_DEMANDAS_CFG.SHEET_DEMANDAS, desenvCoreHeadersDemandas_()),
    evolucoes: desenvCoreGarantirAba_(DESENV_DEMANDAS_CFG.SHEET_EVOLUCOES, desenvCoreHeadersEvolucoes_()),
    imagens: desenvCoreGarantirAba_(DESENV_CORE_CFG.SHEET_IMAGENS, desenvCoreHeadersImagens_())
  };
}

function desenvCoreMapaHeaders_(aba) {
  var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var mapa = {};
  headers.forEach(function(h, i) {
    mapa[normalizarDesenvDemandas_(h)] = i;
  });
  return { headers: headers, mapa: mapa };
}

function desenvCoreIndice_(pack, aliases) {
  aliases = aliases || [];
  for (var i = 0; i < aliases.length; i++) {
    var idx = pack.mapa[normalizarDesenvDemandas_(aliases[i])];
    if (idx !== undefined) return idx;
  }
  return -1;
}

function desenvCoreValor_(row, pack, aliases) {
  var idx = desenvCoreIndice_(pack, aliases);
  return idx > -1 ? row[idx] : '';
}

function desenvCoreAtualizarLinha_(aba, rowIndex, valores) {
  var pack = desenvCoreMapaHeaders_(aba);
  Object.keys(valores || {}).forEach(function(header) {
    var idx = desenvCoreIndice_(pack, [header]);
    if (idx > -1) aba.getRange(rowIndex, idx + 1).setValue(valores[header]);
  });
}

function desenvCoreNovaLinha_(aba, valores) {
  var pack = desenvCoreMapaHeaders_(aba);
  var row = new Array(pack.headers.length).fill('');
  Object.keys(valores || {}).forEach(function(header) {
    var idx = desenvCoreIndice_(pack, [header]);
    if (idx > -1) row[idx] = valores[header];
  });
  aba.appendRow(row);
  return aba.getLastRow();
}

function desenvCoreAgora_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Fortaleza', 'dd/MM/yyyy HH:mm:ss');
}

function desenvCoreDataBr_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, 'America/Fortaleza', 'dd/MM/yyyy');
  }
  var txt = String(valor).trim();
  var m = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + '/' + m[2] + '/' + m[1]) : txt;
}

function desenvCoreHora_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, 'America/Fortaleza', 'HH:mm');
  }
  var txt = String(valor).trim();
  var m = txt.match(/(\d{1,2}):(\d{2})/);
  return m ? (('0' + m[1]).slice(-2) + ':' + m[2]) : txt;
}

function desenvCoreExcluido_(valor) {
  var n = normalizarDesenvDemandas_(valor);
  return n === 'SIM' || n === 'TRUE' || n === '1' || n === 'EXCLUIDO';
}

function desenvCoreValoresDbConfig_(categorias, preferirValorExtra) {
  categorias = (categorias || []).map(normalizarDesenvDemandas_);
  var ss = abrirPlanilhaMaeDesenv_();
  var aba = ss.getSheetByName(DESENV_DEMANDAS_CFG.SHEET_DB_CONFIG);
  if (!aba || aba.getLastRow() < 2) return [];
  var dados = aba.getDataRange().getValues();
  var headers = dados[0];
  var idxCat = obterIndiceColunaPorAlias_(headers, ['CATEGORIA']);
  var idxNome = obterIndiceColunaPorAlias_(headers, ['NOME']);
  var idxExtra = obterIndiceColunaPorAlias_(headers, ['VALOR_EXTRA']);
  if (idxCat < 0) return [];

  var mapa = {};
  for (var i = 1; i < dados.length; i++) {
    if (categorias.indexOf(normalizarDesenvDemandas_(dados[i][idxCat])) === -1) continue;
    var nome = idxNome > -1 ? String(dados[i][idxNome] || '').trim() : '';
    var extra = idxExtra > -1 ? String(dados[i][idxExtra] || '').trim() : '';
    var valor = preferirValorExtra ? (extra || nome) : (nome || extra);
    if (valor) mapa[valor] = true;
  }
  return Object.keys(mapa).sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
}

function desenvCoreLocalizarDemanda_(numOcorrencia, rowIndex) {
  var estrutura = desenvCoreEstrutura_();
  var aba = estrutura.demandas;
  var dados = aba.getDataRange().getValues();
  var pack = desenvCoreMapaHeaders_(aba);
  var alvo = normalizarDesenvDemandas_(numOcorrencia || '');

  if (rowIndex && Number(rowIndex) >= 2 && Number(rowIndex) <= aba.getLastRow()) {
    var rowDireta = aba.getRange(Number(rowIndex), 1, 1, aba.getLastColumn()).getValues()[0];
    return { aba: aba, pack: pack, row: rowDireta, rowIndex: Number(rowIndex) };
  }

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    if (desenvCoreExcluido_(desenvCoreValor_(row, pack, ['EXCLUIDO']))) continue;
    if (normalizarDesenvDemandas_(desenvCoreValor_(row, pack, ['NUM_OCORRENCIA', 'NUMERO_OCORRENCIA'])) === alvo) {
      return { aba: aba, pack: pack, row: row, rowIndex: i + 1 };
    }
  }
  return null;
}

function desenvCoreDemandRowToObject_(packDemanda) {
  var row = packDemanda.row;
  var p = packDemanda.pack;
  return {
    rowIndex: packDemanda.rowIndex,
    idDemanda: String(desenvCoreValor_(row, p, ['ID_DEMANDA']) || ''),
    numOcorrencia: String(desenvCoreValor_(row, p, ['NUM_OCORRENCIA', 'NUMERO_OCORRENCIA']) || ''),
    tipoOcorrencia: String(desenvCoreValor_(row, p, ['TIPO_OCORRENCIA', 'TIPO_PROCEDIMENTO']) || ''),
    numeroProcedimento: String(desenvCoreValor_(row, p, ['NUMERO_PROCEDIMENTO']) || ''),
    delegado: String(desenvCoreValor_(row, p, ['DELEGADO']) || ''),
    demandaIninterrupta: String(desenvCoreValor_(row, p, ['DEMANDA_ININTERRUPTA']) || 'NAO'),
    descricao: String(desenvCoreValor_(row, p, ['DESCRICAO']) || ''),
    informacoesIniciais: String(desenvCoreValor_(row, p, ['INFORMACOES_INICIAIS', 'INFORMACOES INICIAIS', 'RESUMO']) || ''),
    resumo: String(desenvCoreValor_(row, p, ['RESUMO', 'INFORMACOES_INICIAIS']) || ''),
    data: desenvCoreDataBr_(desenvCoreValor_(row, p, ['DATA', 'DATA_OCORRENCIA'])),
    hora: desenvCoreHora_(desenvCoreValor_(row, p, ['HORA'])),
    equipe: String(desenvCoreValor_(row, p, ['EQUIPE']) || ''),
    status: String(desenvCoreValor_(row, p, ['STATUS']) || 'PENDENTE'),
    crime: String(desenvCoreValor_(row, p, ['CRIME']) || ''),
    difusao: String(desenvCoreValor_(row, p, ['DIFUSAO', 'DIFUSÃO']) || ''),
    compilado: String(desenvCoreValor_(row, p, ['COMPILADO']) || ''),
    numeroRt: String(desenvCoreValor_(row, p, ['NUM_RT', 'NUMERO_RT']) || ''),
    pastaRtId: String(desenvCoreValor_(row, p, ['PASTA_RT_ID']) || ''),
    linkDriveImagens: String(desenvCoreValor_(row, p, ['LINK_DRIVE_IMAGENS']) || ''),
    urlDoc: String(desenvCoreValor_(row, p, ['URL_DOC_RT']) || ''),
    urlPdf: String(desenvCoreValor_(row, p, ['URL_PDF_RT']) || '')
  };
}

function carregarConfigDesenvDemandas(usuarioLogin) {
  var usuario = validarAcessoDesenvDemandas_(usuarioLogin);
  desenvCoreEstrutura_();
  var ia = obterConfiguracaoGeminiInternaDesenv_();
  return {
    sucesso: true,
    usuario: {
      login: usuario.login || '',
      nome: usuario.nome || '',
      perfil: usuario.perfil || '',
      classeDesenv: usuario._classeDesenv || classificarPermissaoDesenvDemandas_(usuario)
    },
    podeGerenciarGemini: usuario._classeDesenv === 'ADMIN',
    delegados: obterDelegadosDesenvDemandas_(),
    equipes: desenvCoreValoresDbConfig_(['EQUIPE'], true),
    tiposOcorrencia: desenvCoreValoresDbConfig_(['TIPO DE OCORRÊNCIA', 'TIPO DE OCORRENCIA'], false),
    crimesRt: desenvCoreValoresDbConfig_(['CRIME_PRODUTIVIDADE', 'CRIME RT', 'CRIME_RT'], true),
    difusoesRt: desenvCoreValoresDbConfig_(['DIFUSÃO', 'DIFUSAO', 'DIFUSÃO RT', 'DIFUSAO RT', 'DIFUSAO_RT'], false),
    ia: {
      configurada: ia.configurada,
      ativa: ia.ativo,
      chaveMascarada: mascararChaveDesenv_(ia.key)
    }
  };
}

function listarDemandasDesenvDemandas(usuarioLogin, filtros) {
  validarAcessoDesenvDemandas_(usuarioLogin);
  filtros = filtros || {};
  var estrutura = desenvCoreEstrutura_();
  var aba = estrutura.demandas;
  var dados = aba.getDataRange().getValues();
  var pack = desenvCoreMapaHeaders_(aba);
  var lista = [];

  var fEquipe = normalizarDesenvDemandas_(filtros.equipe || '');
  var fTipo = normalizarDesenvDemandas_(filtros.tipoOcorrencia || '');
  var fNum = normalizarDesenvDemandas_(filtros.numeroProcedimento || '');
  var fStatus = normalizarDesenvDemandas_(filtros.statusLista || 'TODAS');

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    if (desenvCoreExcluido_(desenvCoreValor_(row, pack, ['EXCLUIDO']))) continue;
    var obj = desenvCoreDemandRowToObject_({ row: row, pack: pack, rowIndex: i + 1 });
    if (!obj.numOcorrencia) continue;
    if (fEquipe && normalizarDesenvDemandas_(obj.equipe) !== fEquipe) continue;
    if (fTipo && normalizarDesenvDemandas_(obj.tipoOcorrencia) !== fTipo) continue;
    if (fNum && normalizarDesenvDemandas_(obj.numeroProcedimento + ' ' + obj.numOcorrencia).indexOf(fNum) === -1) continue;
    var statusNorm = normalizarDesenvDemandas_(obj.status || 'PENDENTE');
    if (fStatus === 'PENDENTES' && statusNorm && statusNorm !== 'PENDENTE') continue;
    if (fStatus === 'CONCLUIDAS' && (!statusNorm || statusNorm === 'PENDENTE')) continue;
    lista.push(obj);
  }

  lista.sort(function(a, b) {
    var ka = String(a.data || '').split('/').reverse().join('-') + ' ' + (a.hora || '');
    var kb = String(b.data || '').split('/').reverse().join('-') + ' ' + (b.hora || '');
    return kb.localeCompare(ka);
  });
  return { sucesso: true, demandas: lista };
}

function salvarDemandaDesenvDemandas(payload) {
  payload = payload || {};
  var usuario = validarAcessoDesenvDemandas_(payload.usuarioLogin);
  var estrutura = desenvCoreEstrutura_();
  var aba = estrutura.demandas;
  var agora = desenvCoreAgora_();
  var tipo = String(payload.tipoOcorrencia || '').trim();
  var numero = String(payload.numeroProcedimento || '').trim();
  var num = String(payload.numOcorrencia || montarIdentificadorOcorrenciaDesenv_(tipo, numero) || '').trim();
  if (!tipo || !numero || !num) throw new Error('Informe o tipo e o número do procedimento.');

  var existente = desenvCoreLocalizarDemanda_(payload.numOcorrenciaOriginal || num, payload.rowIndex);
  var editando = normalizarDesenvDemandas_(payload.acao) === 'EDITAR_DEMANDA' || !!payload.rowIndex;
  var duplicada = desenvCoreLocalizarDemanda_(num, 0);
  if (duplicada && (!editando || !existente || duplicada.rowIndex !== existente.rowIndex)) {
    throw new Error('Já existe uma demanda cadastrada para ' + num + '.');
  }

  var valores = {
    NUM_OCORRENCIA: num,
    TIPO_OCORRENCIA: tipo,
    NUMERO_PROCEDIMENTO: numero,
    DELEGADO: String(payload.delegado || '').trim(),
    DEMANDA_ININTERRUPTA: normalizarDesenvDemandas_(payload.demandaIninterrupta) === 'SIM' ? 'SIM' : 'NAO',
    DESCRICAO: String(payload.descricao || ''),
    INFORMACOES_INICIAIS: String(payload.informacoesIniciais || payload.resumo || ''),
    RESUMO: String(payload.resumo || payload.informacoesIniciais || ''),
    DATA: desenvCoreDataBr_(payload.data),
    HORA: desenvCoreHora_(payload.hora),
    EQUIPE: String(payload.equipe || '').trim(),
    STATUS: String(payload.status || 'PENDENTE').trim() || 'PENDENTE',
    CRIME: String(payload.crime || '').trim(),
    DIFUSAO: String(payload.difusao || '').trim(),
    // Qualquer alteração na demanda invalida o consolidado anterior.
    COMPILADO: '',
    DATA_ATUALIZACAO: agora,
    EXCLUIDO: 'NAO'
  };

  var rowIndex;
  var numAnterior = '';
  if (existente && editando) {
    numAnterior = String(desenvCoreValor_(existente.row, existente.pack, ['NUM_OCORRENCIA']) || '');
    desenvCoreAtualizarLinha_(aba, existente.rowIndex, valores);
    rowIndex = existente.rowIndex;
  } else {
    valores.ID_DEMANDA = 'DEM-' + Utilities.getUuid();
    valores.USUARIO_CRIADOR = usuario.login || payload.usuarioLogin || '';
    valores.DATA_CRIACAO = agora;
    rowIndex = desenvCoreNovaLinha_(aba, valores);
  }

  if (numAnterior && normalizarDesenvDemandas_(numAnterior) !== normalizarDesenvDemandas_(num)) {
    [estrutura.evolucoes, estrutura.imagens].forEach(function(sheet) {
      var dados = sheet.getDataRange().getValues();
      var p = desenvCoreMapaHeaders_(sheet);
      var idxNum = desenvCoreIndice_(p, ['NUM_OCORRENCIA']);
      if (idxNum < 0) return;
      for (var i = 1; i < dados.length; i++) {
        if (normalizarDesenvDemandas_(dados[i][idxNum]) === normalizarDesenvDemandas_(numAnterior)) {
          sheet.getRange(i + 1, idxNum + 1).setValue(num);
        }
      }
    });
  }

  return {
    sucesso: true,
    mensagem: editando ? 'Demanda atualizada com sucesso.' : 'Demanda cadastrada com sucesso.',
    rowIndex: rowIndex,
    numOcorrencia: num
  };
}

function desenvCoreListarImagens_(idEvolucao, numOcorrencia) {
  var aba = desenvCoreEstrutura_().imagens;
  var dados = aba.getDataRange().getValues();
  var pack = desenvCoreMapaHeaders_(aba);
  var lista = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    if (desenvCoreExcluido_(desenvCoreValor_(row, pack, ['EXCLUIDO']))) continue;
    if (idEvolucao && String(desenvCoreValor_(row, pack, ['ID_EVOLUCAO']) || '') !== String(idEvolucao)) continue;
    if (numOcorrencia && normalizarDesenvDemandas_(desenvCoreValor_(row, pack, ['NUM_OCORRENCIA'])) !== normalizarDesenvDemandas_(numOcorrencia)) continue;
    lista.push({
      rowIndex: i + 1,
      idImagem: String(desenvCoreValor_(row, pack, ['ID_IMAGEM']) || ''),
      idEvolucao: String(desenvCoreValor_(row, pack, ['ID_EVOLUCAO']) || ''),
      ordem: Number(desenvCoreValor_(row, pack, ['ORDEM']) || 0),
      nome: String(desenvCoreValor_(row, pack, ['NOME']) || ''),
      mimeType: String(desenvCoreValor_(row, pack, ['MIME_TYPE']) || ''),
      fileId: String(desenvCoreValor_(row, pack, ['FILE_ID']) || ''),
      url: String(desenvCoreValor_(row, pack, ['URL']) || ''),
      legenda: String(desenvCoreValor_(row, pack, ['LEGENDA']) || '')
    });
  }
  return lista.sort(function(a, b) { return a.ordem - b.ordem; });
}

function desenvCoreListarEvolucoes_(numOcorrencia) {
  var aba = desenvCoreEstrutura_().evolucoes;
  var dados = aba.getDataRange().getValues();
  var pack = desenvCoreMapaHeaders_(aba);
  var lista = [];
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    if (desenvCoreExcluido_(desenvCoreValor_(row, pack, ['EXCLUIDO']))) continue;
    if (normalizarDesenvDemandas_(desenvCoreValor_(row, pack, ['NUM_OCORRENCIA'])) !== normalizarDesenvDemandas_(numOcorrencia)) continue;
    var id = String(desenvCoreValor_(row, pack, ['ID_EVOLUCAO']) || '');
    lista.push({
      rowIndex: i + 1,
      idEvolucao: id,
      ordem: Number(desenvCoreValor_(row, pack, ['ORDEM']) || 0),
      hora: desenvCoreHora_(desenvCoreValor_(row, pack, ['HORA'])),
      equipe: String(desenvCoreValor_(row, pack, ['EQUIPE']) || ''),
      desenvolvimento: String(desenvCoreValor_(row, pack, ['DESENVOLVIMENTO']) || ''),
      usuario: String(desenvCoreValor_(row, pack, ['USUARIO']) || ''),
      imagens: desenvCoreListarImagens_(id, '')
    });
  }
  return lista.sort(function(a, b) {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return a.rowIndex - b.rowIndex;
  });
}

function desenvCoreLimparMarcadoresEvolucao_(texto) {
  return String(texto || '')
    // Remove marcadores antigos isolados: "18:36 — ALFA".
    .replace(/^\s*\(?\s*\d{1,2}:\d{2}\s*[\-–—|]\s*[^\n\)]{1,100}\)?\s*$/gmi, '')
    // Remove o mesmo marcador quando foi gravado antes do texto da ocorrência.
    .replace(/^\s*\(?\s*\d{1,2}:\d{2}\s*[\-–—|]\s*[A-ZÀ-ÖØ-Þ0-9][A-ZÀ-ÖØ-Þ0-9 ._\/\-]{0,60}\)?\s*[:\-–—]?\s+(?=\S)/gm, '')
    // Remove rótulos eventualmente produzidos por versões anteriores da IA.
    .replace(/^\s*(?:EVOLU[CÇ][AÃ]O\s*\d*|EQUIPE|ORDEM|HOR[ÁA]RIO|HORA)\s*[:\-–—].*$/gmi, '')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function desenvCoreCompilar_(demanda, evolucoes) {
  var partes = [];
  if (demanda.informacoesIniciais) partes.push(demanda.informacoesIniciais);
  if (demanda.descricao) partes.push(demanda.descricao);
  (evolucoes || []).forEach(function(ev) {
    var ocorrencia = desenvCoreLimparMarcadoresEvolucao_(ev.desenvolvimento || '');
    if (ocorrencia) partes.push(ocorrencia);
  });
  return desenvCoreLimparMarcadoresEvolucao_(partes.filter(Boolean).join('\n\n'));
}

function obterDemandaCompletaDesenvDemandas(usuarioLogin, numOcorrencia) {
  validarAcessoDesenvDemandas_(usuarioLogin);
  var encontrada = desenvCoreLocalizarDemanda_(numOcorrencia, 0);
  if (!encontrada) return { sucesso: false, erro: 'Demanda não encontrada.' };
  var demanda = desenvCoreDemandRowToObject_(encontrada);
  demanda.evolucoes = desenvCoreListarEvolucoes_(demanda.numOcorrencia);
  demanda.compilado = demanda.compilado
    ? desenvCoreLimparMarcadoresEvolucao_(demanda.compilado)
    : desenvCoreCompilar_(demanda, demanda.evolucoes);
  return { sucesso: true, demanda: demanda };
}

function desenvCoreFolderName_(texto) {
  return String(texto || 'demanda')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|#%{}]/g, ' ')
    .replace(/\s+/g, ' ').trim().substring(0, 120) || 'demanda';
}

function desenvCoreGarantirNumeroRt_(encontrada) {
  var demanda = desenvCoreDemandRowToObject_(encontrada);
  if (demanda.numeroRt) return demanda.numeroRt;
  var numero;
  try {
    numero = consumirNumeradorIntel_('RELATÓRIO TÉCNICO');
  } catch (e) {
    numero = Utilities.formatDate(new Date(), 'America/Fortaleza', 'yyyyMMdd-HHmmss');
  }
  desenvCoreAtualizarLinha_(encontrada.aba, encontrada.rowIndex, { NUM_RT: numero, DATA_ATUALIZACAO: desenvCoreAgora_() });
  return numero;
}

function desenvCoreGarantirPastaRt_(encontrada) {
  var demanda = desenvCoreDemandRowToObject_(encontrada);
  if (demanda.pastaRtId) {
    try {
      var existente = DriveApp.getFolderById(demanda.pastaRtId);
      return { pasta: existente, numeroRt: demanda.numeroRt || desenvCoreGarantirNumeroRt_(encontrada) };
    } catch (e) {}
  }

  var numeroRt = desenvCoreGarantirNumeroRt_(encontrada);
  var raiz = DriveApp.getFolderById(CONFIG.PASTA_DRIVE_ID);
  var itRaiz = raiz.getFoldersByName(DESENV_CORE_CFG.ROOT_FOLDER_NAME);
  var pastaModulo = itRaiz.hasNext() ? itRaiz.next() : raiz.createFolder(DESENV_CORE_CFG.ROOT_FOLDER_NAME);
  var nome = 'RT ' + String(numeroRt).replace(/\//g, '.') + ' - IMAGENS - ' + desenvCoreFolderName_(demanda.numOcorrencia);
  var it = pastaModulo.getFoldersByName(nome);
  var pasta = it.hasNext() ? it.next() : pastaModulo.createFolder(nome);
  desenvCoreAtualizarLinha_(encontrada.aba, encontrada.rowIndex, {
    NUM_RT: numeroRt,
    PASTA_RT_ID: pasta.getId(),
    LINK_DRIVE_IMAGENS: pasta.getUrl(),
    DATA_ATUALIZACAO: desenvCoreAgora_()
  });
  return { pasta: pasta, numeroRt: numeroRt };
}

function desenvCoreBlobArquivo_(arquivo, nomePadrao) {
  arquivo = arquivo || {};
  var conteudo = String(arquivo.base64 || arquivo.dataUrl || '');
  var mime = String(arquivo.mimeType || 'application/octet-stream');
  var match = conteudo.match(/^data:([^;]+);base64,(.+)$/);
  var base64 = conteudo;
  if (match) {
    mime = match[1] || mime;
    base64 = match[2] || '';
  }
  if (!base64) throw new Error('Arquivo sem conteúdo Base64.');
  return Utilities.newBlob(Utilities.base64Decode(base64), mime, String(arquivo.nome || nomePadrao || 'arquivo'));
}

function criarOuAbrirPastaRtDesenvDemandas(usuarioLogin, numOcorrencia) {
  validarAcessoDesenvDemandas_(usuarioLogin);
  var encontrada = desenvCoreLocalizarDemanda_(numOcorrencia, 0);
  if (!encontrada) throw new Error('Demanda não encontrada.');
  var pack = desenvCoreGarantirPastaRt_(encontrada);
  return {
    sucesso: true,
    numeroRt: pack.numeroRt,
    nomePasta: pack.pasta.getName(),
    pastaId: pack.pasta.getId(),
    linkDriveImagens: pack.pasta.getUrl()
  };
}

function uploadArquivosPastaRtDesenvDemandas(usuarioLogin, numOcorrencia, arquivos) {
  validarAcessoDesenvDemandas_(usuarioLogin);
  var encontrada = desenvCoreLocalizarDemanda_(numOcorrencia, 0);
  if (!encontrada) throw new Error('Demanda não encontrada.');
  var pack = desenvCoreGarantirPastaRt_(encontrada);
  var retorno = [];
  (arquivos || []).forEach(function(arq, i) {
    var blob = desenvCoreBlobArquivo_(arq, 'arquivo_' + (i + 1));
    var file = pack.pasta.createFile(blob);
    retorno.push({ nome: file.getName(), fileId: file.getId(), url: file.getUrl() });
  });
  return {
    sucesso: true,
    numeroRt: pack.numeroRt,
    nomePasta: pack.pasta.getName(),
    pastaId: pack.pasta.getId(),
    linkDriveImagens: pack.pasta.getUrl(),
    arquivos: retorno
  };
}

function salvarEvolucaoDesenvDemandas(payload) {
  payload = payload || {};
  var usuario = validarAcessoDesenvDemandas_(payload.usuarioLogin);
  var num = String(payload.numOcorrencia || '').trim();
  if (!num) throw new Error('Número da demanda não informado.');
  var demanda = desenvCoreLocalizarDemanda_(num, 0);
  if (!demanda) throw new Error('Demanda não encontrada.');

  var estrutura = desenvCoreEstrutura_();
  var aba = estrutura.evolucoes;
  var agora = desenvCoreAgora_();
  var editando = !!payload.editar || normalizarDesenvDemandas_(payload.acao) === 'EDITAR_EVOLUCAO';
  var idEvolucao = String(payload.idEvolucao || '').trim();
  var rowIndex = Number(payload.rowIndex || 0);
  var ordem = 1;

  var dados = aba.getDataRange().getValues();
  var p = desenvCoreMapaHeaders_(aba);
  for (var i = 1; i < dados.length; i++) {
    if (desenvCoreExcluido_(desenvCoreValor_(dados[i], p, ['EXCLUIDO']))) continue;
    if (normalizarDesenvDemandas_(desenvCoreValor_(dados[i], p, ['NUM_OCORRENCIA'])) === normalizarDesenvDemandas_(num)) {
      ordem = Math.max(ordem, Number(desenvCoreValor_(dados[i], p, ['ORDEM']) || 0) + 1);
      if (!rowIndex && idEvolucao && String(desenvCoreValor_(dados[i], p, ['ID_EVOLUCAO']) || '') === idEvolucao) rowIndex = i + 1;
    }
  }

  if (editando && rowIndex >= 2) {
    var rowExist = aba.getRange(rowIndex, 1, 1, aba.getLastColumn()).getValues()[0];
    idEvolucao = idEvolucao || String(desenvCoreValor_(rowExist, p, ['ID_EVOLUCAO']) || '');
    desenvCoreAtualizarLinha_(aba, rowIndex, {
      DESENVOLVIMENTO: String(payload.desenvolvimento || ''),
      DATA_ATUALIZACAO: agora,
      EXCLUIDO: 'NAO'
    });
  } else {
    idEvolucao = idEvolucao || ('EVO-' + Utilities.getUuid());
    rowIndex = desenvCoreNovaLinha_(aba, {
      ID_EVOLUCAO: idEvolucao,
      NUM_OCORRENCIA: num,
      ORDEM: ordem,
      HORA: Utilities.formatDate(new Date(), 'America/Fortaleza', 'HH:mm'),
      EQUIPE: usuario.equipe || usuario.lotacao || usuario.delegacia || '',
      DESENVOLVIMENTO: String(payload.desenvolvimento || ''),
      USUARIO: usuario.login || payload.usuarioLogin || '',
      DATA_CRIACAO: agora,
      DATA_ATUALIZACAO: agora,
      EXCLUIDO: 'NAO'
    });
  }

  var folderPack = desenvCoreGarantirPastaRt_(demanda);
  var existentes = desenvCoreListarImagens_(idEvolucao, '');
  var proxOrdem = existentes.length ? Math.max.apply(null, existentes.map(function(x) { return x.ordem || 0; })) + 1 : 1;
  var abaImg = estrutura.imagens;

  (payload.imagens || []).forEach(function(img, idx) {
    var nome = String(img.nome || ('imagem_' + (proxOrdem + idx) + '.png'));
    var blob = desenvCoreBlobArquivo_(img, nome);
    var file = folderPack.pasta.createFile(blob);
    desenvCoreNovaLinha_(abaImg, {
      ID_IMAGEM: 'IMG-' + Utilities.getUuid(),
      ID_EVOLUCAO: idEvolucao,
      NUM_OCORRENCIA: num,
      ORDEM: proxOrdem + idx,
      NOME: file.getName(),
      MIME_TYPE: blob.getContentType(),
      FILE_ID: file.getId(),
      URL: file.getUrl(),
      LEGENDA: String(img.legenda || ''),
      USUARIO: usuario.login || '',
      DATA_CRIACAO: agora,
      DATA_ATUALIZACAO: agora,
      EXCLUIDO: 'NAO'
    });
  });

  var completa = obterDemandaCompletaDesenvDemandas(payload.usuarioLogin, num);
  if (completa && completa.sucesso) {
    desenvCoreAtualizarLinha_(demanda.aba, demanda.rowIndex, {
      COMPILADO: desenvCoreCompilar_(completa.demanda, completa.demanda.evolucoes || []),
      DATA_ATUALIZACAO: agora
    });
  }

  return { sucesso: true, mensagem: editando ? 'Evolução atualizada com sucesso.' : 'Evolução salva com sucesso.', idEvolucao: idEvolucao, rowIndex: rowIndex };
}

function desenvCoreTrashFile_(fileId) {
  if (!fileId) return;
  try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) {}
}

function excluirEvolucaoDesenvDemandas(usuarioLogin, rowIndex, idEvolucao) {
  validarAcessoDesenvDemandas_(usuarioLogin);
  var estrutura = desenvCoreEstrutura_();
  var aba = estrutura.evolucoes;
  var dados = aba.getDataRange().getValues();
  var p = desenvCoreMapaHeaders_(aba);
  var linha = Number(rowIndex || 0);
  var id = String(idEvolucao || '').trim();
  if (!linha && id) {
    for (var i = 1; i < dados.length; i++) {
      if (String(desenvCoreValor_(dados[i], p, ['ID_EVOLUCAO']) || '') === id) { linha = i + 1; break; }
    }
  }
  if (!linha || linha < 2) throw new Error('Evolução não encontrada.');
  var row = aba.getRange(linha, 1, 1, aba.getLastColumn()).getValues()[0];
  id = id || String(desenvCoreValor_(row, p, ['ID_EVOLUCAO']) || '');
  var numOcorrencia = String(desenvCoreValor_(row, p, ['NUM_OCORRENCIA']) || '');
  desenvCoreAtualizarLinha_(aba, linha, { EXCLUIDO: 'SIM', DATA_ATUALIZACAO: desenvCoreAgora_() });

  var abaImg = estrutura.imagens;
  var dadosImg = abaImg.getDataRange().getValues();
  var pi = desenvCoreMapaHeaders_(abaImg);
  for (var j = 1; j < dadosImg.length; j++) {
    if (String(desenvCoreValor_(dadosImg[j], pi, ['ID_EVOLUCAO']) || '') !== id) continue;
    desenvCoreTrashFile_(desenvCoreValor_(dadosImg[j], pi, ['FILE_ID']));
    desenvCoreAtualizarLinha_(abaImg, j + 1, { EXCLUIDO: 'SIM', DATA_ATUALIZACAO: desenvCoreAgora_() });
  }
  if (numOcorrencia) {
    var completa = obterDemandaCompletaDesenvDemandas(usuarioLogin, numOcorrencia);
    var demandaPack = desenvCoreLocalizarDemanda_(numOcorrencia, 0);
    if (completa && completa.sucesso && demandaPack) {
      desenvCoreAtualizarLinha_(demandaPack.aba, demandaPack.rowIndex, {
        COMPILADO: desenvCoreCompilar_(completa.demanda, completa.demanda.evolucoes || []),
        DATA_ATUALIZACAO: desenvCoreAgora_()
      });
    }
  }
  return { sucesso: true, mensagem: 'Evolução excluída com sucesso.' };
}

function desenvCoreLocalizarImagem_(idImagem) {
  var aba = desenvCoreEstrutura_().imagens;
  var dados = aba.getDataRange().getValues();
  var p = desenvCoreMapaHeaders_(aba);
  for (var i = 1; i < dados.length; i++) {
    if (String(desenvCoreValor_(dados[i], p, ['ID_IMAGEM']) || '') === String(idImagem || '')) {
      return { aba: aba, pack: p, row: dados[i], rowIndex: i + 1 };
    }
  }
  return null;
}

function excluirImagemEvolucaoRtDesenvDemandas(usuarioLogin, idImagem) {
  validarAcessoDesenvDemandas_(usuarioLogin);
  var img = desenvCoreLocalizarImagem_(idImagem);
  if (!img) throw new Error('Imagem não encontrada.');
  desenvCoreTrashFile_(desenvCoreValor_(img.row, img.pack, ['FILE_ID']));
  desenvCoreAtualizarLinha_(img.aba, img.rowIndex, { EXCLUIDO: 'SIM', DATA_ATUALIZACAO: desenvCoreAgora_() });
  return { sucesso: true, mensagem: 'Imagem excluída com sucesso.' };
}

function desenvCoreExtrairJsonResposta_(texto) {
  var bruto = String(texto || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  try { return JSON.parse(bruto); } catch (e) {}
  var ini = bruto.indexOf('{');
  var fim = bruto.lastIndexOf('}');
  if (ini > -1 && fim > ini) {
    try { return JSON.parse(bruto.substring(ini, fim + 1)); } catch (e2) {}
  }
  return {};
}

function desenvCoreObterConfigVertex_() {
  var props = PropertiesService.getScriptProperties();
  var projectId = String(props.getProperty('VERTEX_PROJECT_ID') || '').trim();
  if (!projectId) throw new Error('VERTEX_PROJECT_ID não configurado nas Propriedades do Script.');
  var modelId = String(props.getProperty('VERTEX_MODEL_ID') || 'gemini-3.5-flash').trim();
  var location = String(props.getProperty('VERTEX_LOCATION') || 'global').trim();
  if (modelId === 'gemini-3.5-flash' || modelId === 'gemini-3.5-flash-lite') location = 'global';
  return {
    projectId: projectId,
    location: location,
    modelId: modelId,
    model: 'projects/' + projectId + '/locations/' + location + '/publishers/google/models/' + modelId
  };
}

function desenvCoreErroVertexRetentavel_(erro) {
  var mensagem = String((erro && (erro.message || erro.details)) || erro || '').toLowerCase();
  return /(?:\b429\b|resource exhausted|too many requests|\b503\b|service unavailable|temporarily unavailable|deadline exceeded)/i.test(mensagem);
}

function desenvCoreGerarVertexComRetentativas_(payload, model, opcoes) {
  opcoes = opcoes || {};
  var maxTentativas = Math.max(1, Math.min(5, Number(opcoes.maxTentativasVertex || 4)));
  var esperaBaseMs = Math.max(500, Math.min(10000, Number(opcoes.esperaBaseVertexMs || 2000)));
  var esperaMaximaMs = Math.max(esperaBaseMs, Math.min(30000, Number(opcoes.esperaMaximaVertexMs || 16000)));
  var ultimoErro = null;
  for (var tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      return VertexAI.Projects.Locations.Publishers.Models.generateContent(payload, model);
    } catch (erro) {
      ultimoErro = erro;
      if (!desenvCoreErroVertexRetentavel_(erro) || tentativa >= maxTentativas) break;
      var espera = Math.min(esperaMaximaMs, esperaBaseMs * Math.pow(2, tentativa - 1));
      espera += Math.floor(Math.random() * Math.min(1000, Math.max(1, esperaBaseMs / 2)));
      Utilities.sleep(espera);
    }
  }
  throw ultimoErro;
}

function desenvCoreChamarIaJson_(prompt, arquivos, opcoes) {
  var cfgVertex = desenvCoreObterConfigVertex_();
  opcoes = opcoes || {};
  arquivos = (arquivos || []).filter(function(arq) { return arq && arq.base64; }).slice(0, 8);
  var partes = [{ text: String(prompt || '') }];
  arquivos.forEach(function(arq, idx) {
    var nome = String(arq.nome || ('arquivo_' + (idx + 1))).trim();
    var mime = String(arq.mimeType || 'application/octet-stream').trim();
    partes.push({ text: 'ARQUIVO_' + (idx + 1) + ': ' + nome + ' | MIME: ' + mime });
    partes.push({ inlineData: { mimeType: mime, data: String(arq.base64 || '') } });
  });
  var generationConfig = {
    temperature: Number(opcoes.temperature === undefined ? 0 : opcoes.temperature),
    responseMimeType: 'application/json'
  };
  if (opcoes.maxOutputTokens) generationConfig.maxOutputTokens = Number(opcoes.maxOutputTokens);
  var resposta = desenvCoreGerarVertexComRetentativas_({
    contents: [{ role: 'user', parts: partes }],
    generationConfig: generationConfig
  }, cfgVertex.model, opcoes);
  if (!resposta || !resposta.candidates || !resposta.candidates.length) throw new Error('O Vertex AI não retornou candidatos.');
  var parts = (((resposta.candidates[0] || {}).content || {}).parts || []);
  var texto = parts.map(function(p) { return p && p.text ? p.text : ''; }).join('\n').trim();
  if (!texto) throw new Error('O Vertex AI não retornou texto na resposta.');
  return desenvCoreExtrairJsonResposta_(texto);
}

function testarGeminiDesenvDemandas(usuarioLogin) {
  validarAdminGeminiDesenv_(usuarioLogin);
  var cfg = obterConfiguracaoGeminiInternaDesenv_();
  if (!cfg.configurada) throw new Error('Cadastre a chave antes de testar.');
  var ret = desenvCoreChamarIaJson_('Responda somente JSON válido: {"resposta":"OK"}.', [], { temperature: 0, maxOutputTokens: 128 });
  return { sucesso: true, resposta: String((ret && ret.resposta) || 'OK') };
}

function processarIADesenvDemandas(usuarioLogin, acao, payload) {
  validarAcessoDesenvDemandas_(usuarioLogin);
  payload = payload || {};
  var cfg = obterConfiguracaoGeminiInternaDesenv_();
  if (!cfg.configurada || !cfg.ativo) {
    return { sucesso: false, erro: 'A IA do módulo está desativada ou sem configuração.' };
  }

  acao = normalizarDesenvDemandas_(acao);
  if (acao === 'MELHORAREVOLUCAO') {
    var r1 = desenvCoreChamarIaJson_(
      'Revise o texto policial abaixo, mantendo todos os fatos e sem inventar informações. Retorne somente JSON válido no formato {"texto":"..."}. TEXTO: ' + String(payload.texto || ''),
      [], { temperature: 0.1, maxOutputTokens: 1800 }
    );
    return { sucesso: true, textoGerado: String(r1.texto || payload.texto || '') };
  }

  if (acao === 'MELHORARLEGENDA') {
    var r2 = desenvCoreChamarIaJson_(
      'Melhore a legenda investigativa abaixo, deixando-a curta, objetiva e sem afirmar identidade ou correspondência não comprovada. Retorne somente JSON válido: {"texto":"..."}. LEGENDA: ' + String(payload.legenda || ''),
      [], { temperature: 0.1, maxOutputTokens: 600 }
    );
    return { sucesso: true, textoGerado: String(r2.texto || payload.legenda || '') };
  }

  if (acao === 'GERARINFORMACOESINICIAIS') {
    var arquivos = [];
    if (payload.arquivoBase64) arquivos.push({ nome: 'documento_inicial', mimeType: payload.mimeType || 'application/pdf', base64: payload.arquivoBase64 });
    var promptInfo = [
      'Leia integralmente o texto e/ou documento policial fornecido e extraia somente informações expressamente presentes.',
      'Sua resposta será usada no campo INFORMAÇÕES INICIAIS de um relatório técnico policial do DEPATRI.',
      '',
      'RETORNO OBRIGATÓRIO:',
      'Retorne somente JSON válido, sem markdown, com as chaves:',
      '{"tipoOcorrencia":"","numeroProcedimento":"","data":"yyyy-mm-dd","hora":"HH:mm","informacoes_iniciais":""}',
      '',
      'PADRÃO OBRIGATÓRIO PARA informacoes_iniciais:',
      '1. Escreva narrativa formal, objetiva e cronológica em parágrafos separados por uma linha em branco.',
      '2. Nunca produza somente um resumo curto ou um único parágrafo quando o documento trouxer dinâmica e dados do veículo/objeto.',
      '3. Primeiro parágrafo: comece obrigatoriamente por "No dia [data por extenso], por volta das [hora no padrão 00h00min], ocorreu...". Informe natureza do fato, endereço completo, bairro, município/UF, ponto de referência quando existente e finalize com "conforme Boletim de Ocorrência nº [número]".',
      '4. Para definir a hora do primeiro parágrafo, use o campo Data/Hora da Ocorrência do B.O. A hora em que o objeto foi estacionado ou visto pela última vez pertence à dinâmica do segundo parágrafo.',
      '5. Segundo parágrafo: comece por "De acordo com o noticiante [NOME COMPLETO EM CAIXA ALTA]," ou "De acordo com a vítima [NOME COMPLETO EM CAIXA ALTA]," e narre a dinâmica em ordem cronológica, incluindo horários intermediários, ação praticada e momento da constatação.',
      '6. Terceiro parágrafo obrigatório quando houver veículo: comece por "O veículo furtado trata-se de..." ou formulação equivalente adequada à natureza. Informe espécie, marca/modelo, cor, placa, ano de fabricação, ano do modelo, chassi, Renavam e proprietário, somente quando constarem no documento.',
      '7. Em ocorrências sem veículo, use o terceiro parágrafo somente quando existirem dados próprios dos bens, materiais ou objetos que devam ser individualizados.',
      '8. Escreva nomes de pessoas, marca/modelo e placa em CAIXA ALTA.',
      '9. Converta datas para português por extenso: 25/08/2026 = 25 de agosto de 2026.',
      '10. Formate horários como 19h00min e 18h30min. Não use 19:00 ou 18:30 no texto narrativo.',
      '11. Normalize o número do B.O. sem espaços indevidos, por exemplo: 134-7361/2026.',
      '12. Não inclua CPF, RG, telefone, e-mail, endereço residencial do noticiante ou filiação, salvo se forem necessários à dinâmica e expressamente solicitados.',
      '13. Não invente, complete ou presuma informações ausentes. Quando um dado não estiver no documento, simplesmente omita-o mantendo a frase gramaticalmente correta.',
      '14. Não use tópicos, títulos, negrito, marcadores ou frases conclusivas. Entregue apenas a narrativa em texto corrido dentro de informacoes_iniciais.',
      '',
      'EXEMPLO DO PADRÃO DE REDAÇÃO (a estrutura deve ser seguida, mas os dados abaixo são apenas demonstrativos):',
      'No dia 25 de agosto de 2026, por volta das 19h00min, ocorreu o furto de uma motocicleta na Rua Exemplo, nº 100, bairro Centro, em Fortaleza/CE, tendo como ponto de referência a Loja Exemplo, conforme Boletim de Ocorrência nº 000-0000/2026.',
      '',
      'De acordo com o noticiante NOME COMPLETO, ele estacionou a motocicleta MARCA/MODELO, cor preta, placa ABC1D23, no local por volta das 18h30min. Ao retornar, aproximadamente às 19h00min, constatou que o veículo não se encontrava mais onde havia sido deixado.',
      '',
      'O veículo furtado trata-se de uma MARCA/MODELO, cor preta, placa ABC1D23, ano de fabricação 2024, modelo 2025, chassi nº 00000000000000000 e Renavam nº 00000000000, registrada em nome de NOME DO PROPRIETÁRIO.',
      '',
      'TEXTO FORNECIDO:', String(payload.texto || '')
    ].join('\n');
    var r3 = desenvCoreChamarIaJson_(promptInfo, arquivos, { temperature: 0, maxOutputTokens: 4500 });
    var tipoOcorrencia = String(r3.tipoOcorrencia || r3.tipo_procedimento || r3.tipoProcedimento || '');
    var numeroProcedimento = String(r3.numeroProcedimento || r3.numero_procedimento || '');
    var informacoesIniciais = String(r3.informacoes_iniciais || r3.informacoesIniciais || r3.texto || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return {
      sucesso: true,
      dados: {
        tipoOcorrencia: tipoOcorrencia,
        numeroProcedimento: numeroProcedimento,
        tipo_procedimento: tipoOcorrencia,
        numero_procedimento: numeroProcedimento,
        data: String(r3.data || ''),
        hora: String(r3.hora || ''),
        informacoes_iniciais: informacoesIniciais
      },
      textoGerado: informacoesIniciais
    };
  }

  if (acao === 'GERARRELATORIOFINAL') {
    var completa = obterDemandaCompletaDesenvDemandas(usuarioLogin, payload.numOcorrencia);
    if (!completa || !completa.sucesso) return completa;
    var d = completa.demanda;
    var evolucoesSomenteTexto = (d.evolucoes || []).map(function(ev) {
      return desenvCoreLimparMarcadoresEvolucao_(ev.desenvolvimento || '');
    }).filter(Boolean);
    var promptFinal = [
      'Produza um relatório narrativo técnico policial, em texto corrido e parágrafos separados.',
      'Não use markdown, listas ou cabeçalho. Não invente informações.',
      'Comece pelas informações iniciais, depois o texto institucional e, por fim, incorpore as ocorrências das evoluções em ordem cronológica.',
      'As evoluções devem aparecer somente como narrativa. É proibido indicar equipe, hora, ordem, número da evolução ou criar marcadores como "18:36 — ALFA".',
      'DADOS:', JSON.stringify({ informacoesIniciais: d.informacoesIniciais, descricao: d.descricao, evolucoes: evolucoesSomenteTexto }) ,
      'Retorne somente JSON válido no formato {"texto":"..."}.'
    ].join('\n');
    var r4 = desenvCoreChamarIaJson_(promptFinal, [], { temperature: 0.1, maxOutputTokens: 5000 });
    var textoFinal = desenvCoreLimparMarcadoresEvolucao_(r4.texto || desenvCoreCompilar_(d, d.evolucoes || []));
    desenvCoreAtualizarLinha_(desenvCoreLocalizarDemanda_(d.numOcorrencia, 0).aba, d.rowIndex, { COMPILADO: textoFinal, DATA_ATUALIZACAO: desenvCoreAgora_() });
    return { sucesso: true, textoGerado: textoFinal };
  }

  return { sucesso: false, erro: 'Ação de IA não reconhecida: ' + acao };
}

function prepararRTDesenvDemandas(usuarioLogin, numOcorrencia) {
  validarAcessoDesenvDemandas_(usuarioLogin);
  var encontrada = desenvCoreLocalizarDemanda_(numOcorrencia, 0);
  if (!encontrada) return { sucesso: false, erro: 'Demanda não encontrada.' };
  var folderPack = desenvCoreGarantirPastaRt_(encontrada);
  return {
    sucesso: true,
    numeroRt: folderPack.numeroRt,
    nomePasta: folderPack.pasta.getName(),
    pastaId: folderPack.pasta.getId(),
    linkDriveImagens: folderPack.pasta.getUrl()
  };
}

function obterBrasaoRtDesenvBase64() {
  var props = PropertiesService.getScriptProperties();
  var fileId = String(props.getProperty(DESENV_CORE_CFG.PROP_BRASAO_FILE_ID) || DESENV_CORE_CFG.BRASAO_FALLBACK_ID || '').trim();
  if (fileId) {
    try {
      var blob = DriveApp.getFileById(fileId).getBlob();
      return { sucesso: true, dataUrl: 'data:' + (blob.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
    } catch (e) {}
  }
  return { sucesso: true, dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' };
}

function desenvCoreMoverArquivoParaPasta_(file, folder) {
  try {
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  } catch (e) {}
}

function desenvCoreAppendParagrafo_(body, texto, negrito) {
  if (!String(texto || '').trim()) return;
  var p = body.appendParagraph(String(texto));
  p.setFontFamily('Garamond').setFontSize(12).setLineSpacing(1.15).setSpacingAfter(8);
  if (negrito) p.setBold(true);
}

function desenvCoreEscapeRegexRt_(texto) {
  return String(texto || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function desenvCoreSubstituirTagTextoRt_(body, tag, valor) {
  var padrao = desenvCoreEscapeRegexRt_(tag);
  var encontrado = body.findText(padrao);
  var limite = 0;
  while (encontrado && limite < 50) {
    limite++;
    var texto = encontrado.getElement().asText();
    var inicio = encontrado.getStartOffset();
    var fim = encontrado.getEndOffsetInclusive();
    texto.deleteText(inicio, fim);
    var substituto = String(valor === null || valor === undefined ? '' : valor);
    if (substituto) texto.insertText(inicio, substituto);
    encontrado = body.findText(padrao);
  }
}

function desenvCoreSubstituirCorpoRelatorioRt_(body, textoCorpo) {
  var tag = '{{CORPO_RELATORIO}}';
  var encontrado = body.findText(desenvCoreEscapeRegexRt_(tag));
  if (!encontrado) return false;

  var elementoTexto = encontrado.getElement().asText();
  var pai = elementoTexto.getParent();
  var tagSozinha = pai.getType() === DocumentApp.ElementType.PARAGRAPH &&
    String(pai.asParagraph().getText() || '').trim() === tag &&
    pai.getParent() && pai.getParent().getType() === DocumentApp.ElementType.BODY_SECTION;

  if (!tagSozinha) {
    desenvCoreSubstituirTagTextoRt_(body, tag, textoCorpo);
    return true;
  }

  var paragrafoTag = pai.asParagraph();
  var indice = body.getChildIndex(paragrafoTag);
  body.removeChild(paragrafoTag);
  var blocos = String(textoCorpo || '').split(/\n\s*\n+/).filter(function(bloco) {
    return String(bloco || '').trim();
  });

  blocos.forEach(function(bloco, deslocamento) {
    var p = body.insertParagraph(indice + deslocamento, String(bloco || '').trim());
    p.setFontFamily('Garamond')
      .setFontSize(12)
      .setLineSpacing(1.15)
      .setSpacingAfter(8)
      .setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  });
  return true;
}

function desenvCoreInserirQrNaTagRt_(body, qrBase64) {
  var tag = '{{QR_CODE_IMAGENS}}';
  var encontrado = body.findText(desenvCoreEscapeRegexRt_(tag));
  if (!encontrado) return false;

  var texto = encontrado.getElement().asText();
  var inicio = encontrado.getStartOffset();
  var fim = encontrado.getEndOffsetInclusive();
  texto.deleteText(inicio, fim);
  if (!qrBase64) return true;

  var qrBlob = desenvCoreBlobArquivo_({
    base64: qrBase64,
    nome: 'QR_RT.png',
    mimeType: 'image/png'
  }, 'QR_RT.png');

  var pai = texto.getParent();
  var imagem;
  if (pai.getType() === DocumentApp.ElementType.PARAGRAPH) {
    var paragrafo = pai.asParagraph();
    imagem = paragrafo.insertInlineImage(paragrafo.getChildIndex(texto) + 1, qrBlob);
    paragrafo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  } else if (pai.getType() === DocumentApp.ElementType.LIST_ITEM) {
    var item = pai.asListItem();
    imagem = item.insertInlineImage(item.getChildIndex(texto) + 1, qrBlob);
  } else {
    imagem = body.appendImage(qrBlob);
  }

  if (imagem && imagem.getWidth() > 220) {
    var proporcao = 220 / imagem.getWidth();
    imagem.setWidth(220).setHeight(Math.round(imagem.getHeight() * proporcao));
  }
  return true;
}

function desenvCoreAppendCorpoFluidoRt_(body, texto) {
  String(texto || '').split(/\n\s*\n+/).forEach(function(bloco) {
    bloco = String(bloco || '').trim();
    if (!bloco) return;
    var p = body.appendParagraph(bloco);
    p.setFontFamily('Garamond')
      .setFontSize(12)
      .setLineSpacing(1.15)
      .setSpacingAfter(8)
      .setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  });
}

function desenvCoreResumoBasicoRt_(demanda) {
  demanda = demanda || {};
  var informacoes = String(demanda.informacoesIniciais || '').replace(/\s+/g, ' ').trim();
  var resumoSalvo = String(demanda.resumo || '').replace(/\s+/g, ' ').trim();

  // Se houver um resumo próprio diferente das informações iniciais, preserva-o.
  if (resumoSalvo && normalizarDesenvDemandas_(resumoSalvo) !== normalizarDesenvDemandas_(informacoes)) {
    return resumoSalvo;
  }

  var base = informacoes || resumoSalvo;
  if (!base) return '';
  var frases = base.match(/[^.!?]+[.!?]+/g) || [];
  var resumo = frases.slice(0, 2).join(' ').trim() || base;
  if (resumo.length > 700) {
    resumo = resumo.substring(0, 700).replace(/\s+\S*$/, '').trim();
    if (resumo && !/[.!?]$/.test(resumo)) resumo += '.';
  }
  return resumo;
}

function finalizarRTDesenvDemandas(usuarioLogin, numOcorrencia, qrBase64) {
  validarAcessoDesenvDemandas_(usuarioLogin);
  var completa = obterDemandaCompletaDesenvDemandas(usuarioLogin, numOcorrencia);
  if (!completa || !completa.sucesso) return completa;
  var d = completa.demanda;
  var encontrada = desenvCoreLocalizarDemanda_(numOcorrencia, 0);
  var folderPack = desenvCoreGarantirPastaRt_(encontrada);
  var numeroRt = folderPack.numeroRt;
  var nomeBase = 'RT ' + String(numeroRt).replace(/\//g, '.') + ' - ' + desenvCoreFolderName_(numOcorrencia);
  var dataAtualRt = Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy');
  var linkDriveImagensRt = folderPack.pasta.getUrl();
  var corpoRelatorioRt = desenvCoreLimparMarcadoresEvolucao_(
    d.compilado || desenvCoreCompilar_(d, d.evolucoes || [])
  );
  var resumoRt = desenvCoreResumoBasicoRt_(d);
  var props = PropertiesService.getScriptProperties();
  var templateId = String(
    props.getProperty(DESENV_CORE_CFG.PROP_TEMPLATE_RT_ID) ||
    DESENV_CORE_CFG.TEMPLATE_RT_FALLBACK_ID ||
    ''
  ).trim();
  var docFile;
  var doc;

  if (templateId) {
    try {
      docFile = DriveApp.getFileById(templateId).makeCopy(nomeBase, folderPack.pasta);
      doc = DocumentApp.openById(docFile.getId());
      var bodyTpl = doc.getBody();
      var tagsRt = {
        '{{NUMERO_RT}}': numeroRt,
        '{{DATA_ATUAL}}': dataAtualRt,
        '{{DATA_CRIME}}': d.data || '',
        '{{CRIME}}': d.crime || '',
        '{{DIFUSAO}}': d.difusao || '',
        '{{NUM_OCORRENCIA}}': d.numOcorrencia || '',
        '{{RESUMO}}': resumoRt,
        '{{LINK_DRIVE_IMAGENS}}': linkDriveImagensRt,
        // Compatibilidade com modelos antigos do módulo.
        '{{TEXTO_COMPLETO}}': corpoRelatorioRt
      };
      Object.keys(tagsRt).forEach(function(tag) {
        desenvCoreSubstituirTagTextoRt_(bodyTpl, tag, tagsRt[tag]);
      });
      desenvCoreSubstituirCorpoRelatorioRt_(bodyTpl, corpoRelatorioRt);
      desenvCoreInserirQrNaTagRt_(bodyTpl, qrBase64 || '');
    } catch (e) {
      docFile = null;
      doc = null;
    }
  }

  if (!doc) {
    doc = DocumentApp.create(nomeBase);
    docFile = DriveApp.getFileById(doc.getId());
    desenvCoreMoverArquivoParaPasta_(docFile, folderPack.pasta);
    var body = doc.getBody();
    body.clear();
    var titulo = body.appendParagraph('RELATÓRIO TÉCNICO – Nº ' + numeroRt + '/DEPATRI/PCCE – ' + dataAtualRt);
    titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setBold(true).setFontFamily('Garamond').setFontSize(13).setSpacingAfter(12);
    desenvCoreAppendParagrafo_(body, 'DATA: ' + (d.data || ''), true);
    desenvCoreAppendParagrafo_(body, 'ASSUNTO: INVESTIGAÇÃO PRELIMINAR DE CRIME DE ' + (d.crime || ''), true);
    desenvCoreAppendParagrafo_(body, 'ORIGEM: NUIP – DEPATRI/PCCE', true);
    desenvCoreAppendParagrafo_(body, 'DIFUSÃO: ' + (d.difusao || ''), true);
    desenvCoreAppendParagrafo_(body, 'REFERÊNCIA: ' + (d.numOcorrencia || ''), true);
    desenvCoreAppendParagrafo_(body, 'RESUMO: ' + resumoRt, true);
    body.appendHorizontalRule();
    desenvCoreAppendCorpoFluidoRt_(body, corpoRelatorioRt);

    if (qrBase64) {
      try {
        var qrBlob = desenvCoreBlobArquivo_({ base64: qrBase64, nome: 'QR_RT.png', mimeType: 'image/png' }, 'QR_RT.png');
        var qr = body.appendImage(qrBlob);
        if (qr.getWidth() > 300) {
          var qrRatio = 300 / qr.getWidth();
          qr.setWidth(300).setHeight(Math.round(qr.getHeight() * qrRatio));
        }
      } catch (e) {}
    }
    desenvCoreAppendParagrafo_(body, 'Link: ' + linkDriveImagensRt, false);
  }

  doc.saveAndClose();
  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch('https://docs.google.com/document/d/' + encodeURIComponent(doc.getId()) + '/export?format=pdf', {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() >= 400) throw new Error('Falha ao exportar o RT em PDF. Código ' + response.getResponseCode() + '.');
  var pdfFile = folderPack.pasta.createFile(response.getBlob().setName(nomeBase + '.pdf'));

  desenvCoreAtualizarLinha_(encontrada.aba, encontrada.rowIndex, {
    NUM_RT: numeroRt,
    PASTA_RT_ID: folderPack.pasta.getId(),
    LINK_DRIVE_IMAGENS: folderPack.pasta.getUrl(),
    URL_DOC_RT: docFile.getUrl(),
    URL_PDF_RT: pdfFile.getUrl(),
    STATUS: d.status && normalizarDesenvDemandas_(d.status) !== 'PENDENTE' ? d.status : 'DEMANDA EVOLUIDA',
    DATA_ATUALIZACAO: desenvCoreAgora_()
  });

  return {
    sucesso: true,
    numeroRt: numeroRt,
    urlDoc: docFile.getUrl(),
    urlPdf: pdfFile.getUrl(),
    linkDriveImagens: folderPack.pasta.getUrl()
  };
}

// Recursos internos ficam nas propriedades do projeto Apps Script.
function obterConfiguracaoPrivadaPortal_(chave) {
  var valor = PropertiesService.getScriptProperties().getProperty(chave);
  if (!valor || !String(valor).trim()) throw new Error('Configure a propriedade do projeto ' + chave + ' antes de usar o Portal.');
  return String(valor).trim();
}
