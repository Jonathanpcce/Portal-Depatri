// ============================================================================
// MÓDULO 8 - DASHBOARD OPERACIONAL (BACKEND)
// ============================================================================

var DASHBOARD_BUILD_ID = 'DEPATRI-RELATORIOS-DELEGACIAS-20260905-02';

var DASHBOARD_CFG = {
  PRISOES_SHEET_ID: obterConfiguracaoPrivadaPortal_("DEPATRI_PRISOES_SHEET_ID"),
  PRISOES_SHEET_NAME: 'PRISÕES',
  CACHE_SECONDS: 90,
  MONTHS: ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']
};

function tentarCachePutDashboard_(cache, key, objeto, segundos) {
  try {
    var texto = JSON.stringify(objeto);
    if (texto && texto.length <= 90000) {
      cache.put(key, texto, segundos);
    }
  } catch (e) {
    // Ignora falha de cache para não quebrar o dashboard.
  }
}

function normalizarDashboard_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function numeroDashboard_(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  var txt = String(valor).trim();
  if (!txt) return 0;
  if (txt.indexOf(',') > -1 && txt.indexOf('.') > -1) {
    txt = txt.replace(/\./g, '').replace(',', '.');
  } else if (txt.indexOf(',') > -1) {
    txt = txt.replace(',', '.');
  }
  var n = Number(txt);
  return isNaN(n) ? 0 : n;
}

function dataDashboard_(valor) {
  if (!valor) return null;
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) return valor;

  var txt = String(valor).trim();
  var mIso = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mIso) return new Date(Number(mIso[1]), Number(mIso[2]) - 1, Number(mIso[3]));

  var mBr = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mBr) return new Date(Number(mBr[3]), Number(mBr[2]) - 1, Number(mBr[1]));

  return null;
}

function anoDashboard_(valor) {
  var d = dataDashboard_(valor);
  return d ? d.getFullYear() : '';
}

function mesDashboard_(valor) {
  var d = dataDashboard_(valor);
  return d ? DASHBOARD_CFG.MONTHS[d.getMonth()] : '';
}


function sheetToObjectsDashboard_(sheet) {
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
      var header = headers[j];
      if (!header) continue;
      var valor = row[j];
      if (valor !== '' && valor !== null && valor !== undefined) vazio = false;
      obj[header] = valor;
    }

    if (!vazio) lista.push(obj);
  }

  return lista;
}

function somarDashboard_(lista, getter) {
  return (lista || []).reduce(function(total, item) {
    return total + numeroDashboard_(getter(item));
  }, 0);
}

function agruparSomandoDashboard_(lista, keyGetter, valueGetter) {
  var mapa = {};
  (lista || []).forEach(function(item) {
    var chave = String(keyGetter(item) || '').trim() || 'NÃO INFORMADO';
    if (!mapa[chave]) mapa[chave] = 0;
    mapa[chave] += numeroDashboard_(valueGetter(item));
  });
  return mapa;
}

function ordenarMapaDescDashboard_(mapa, limite) {
  var itens = Object.keys(mapa || {}).map(function(chave) {
    return { nome: chave, valor: mapa[chave] };
  });

  itens.sort(function(a, b) {
    if (b.valor !== a.valor) return b.valor - a.valor;
    return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  });

  if (limite && itens.length > limite) itens = itens.slice(0, limite);
  return itens;
}

function obterUsuarioDashboard_(usuarioLogin) {
  if (typeof obterUsuarioPortalPorLogin_ === 'function') {
    return obterUsuarioPortalPorLogin_(usuarioLogin);
  }

  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName('USUARIOS');
  if (!aba) throw new Error("Aba 'USUARIOS' não encontrada.");

  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0] || '').trim().toLowerCase() === String(usuarioLogin || '').trim().toLowerCase()) {
      return {
        login: dados[i][0],
        nome: dados[i][1],
        email: dados[i][2],
        cargo: padronizarCargo(dados[i][3]),
        perfil: dados[i][4],
        delegacia: dados[i][5],
        lotacao: dados[i][5],
        equipe: dados[i][10] || ''
      };
    }
  }

  throw new Error('Usuário não encontrado para validação do dashboard.');
}

function classificarPermissaoDashboard_(usuario) {
  var perfil = normalizarDashboard_(usuario && usuario.perfil);
  var lotacao = normalizarDashboard_((usuario && (usuario.lotacao || usuario.delegacia)) || '');

  if (perfil === 'ADMIN' || perfil === 'CRIADOR/ADMIN' || perfil === 'CRIADOR ADMIN' || perfil === 'ADMINISTRADOR') return 'TOTAL';
  if (perfil.indexOf('NUIP') > -1 || lotacao.indexOf('NUIP') > -1) return 'TOTAL';
  if (perfil.indexOf('DIRECAO') > -1 || perfil.indexOf('DIRETORIA') > -1 || lotacao.indexOf('DIRECAO') > -1 || lotacao.indexOf('DIRETORIA') > -1) return 'TOTAL';
  if (perfil.indexOf('ADMINISTRATIVO') > -1 || lotacao.indexOf('ADMINISTRATIVO') > -1) return 'TOTAL';
  if (perfil.indexOf('NUCLEO OPERACIONAL') > -1 || lotacao.indexOf('NUCLEO OPERACIONAL') > -1) return 'EQUIPE';
  if (perfil.indexOf('DELEGACIA') > -1) return 'PROPRIA';

  return 'NEGADO';
}

function validarAcessoDashboard_(usuarioLogin) {
  var usuario = obterUsuarioDashboard_(usuarioLogin);
  var classe = classificarPermissaoDashboard_(usuario);

  if (classe === 'NEGADO') {
    throw new Error('Seu perfil não possui acesso ao módulo Dashboard.');
  }

  usuario._classeDashboard = classe;
  usuario._delegaciaDashboard = String(usuario.delegacia || usuario.lotacao || '').trim();
  usuario._equipeDashboard = String(usuario.equipe || '').trim();

  if (classe === 'EQUIPE' && !usuario._equipeDashboard) {
    throw new Error('Seu cadastro do Núcleo Operacional não possui equipe vinculada.');
  }

  return usuario;
}


function aliasContemDashboard_(valor, aliases) {
  var norm = normalizarDashboard_(valor);
  return (aliases || []).some(function(alias) {
    return norm.indexOf(normalizarDashboard_(alias)) > -1;
  });
}

function extrairEquipeDashboard_(row) {
  if (!row) return '';
  return String(row.EQUIPE_DIRETORIA || row.CHAVE_EQUIPE || row.EQUIPE || '').trim();
}

function valorQuantidadeOuUmDashboard_(row) {
  var qtd = numeroDashboard_(row.QUANTIDADE);
  return qtd > 0 ? qtd : 1;
}

function ehLinhaValorFiosDashboard_(row) {
  var prod = normalizarDashboard_(row.PRODUTIVIDADE);
  var tipo = normalizarDashboard_(row.TIPO_DE_PRODUTIVIDADE);

  if (
    prod === 'VALORES' &&
    aliasContemDashboard_(tipo, ['VALOR EM REAIS DE FIOS APREENDIDOS', 'EM VALOR EM REAIS DE FIOS APREENDIDOS'])
  ) {
    return true;
  }

  if (
    prod === 'APREENSAO' &&
    aliasContemDashboard_(tipo, ['FIOS E RELACIONADOS', 'COBRE', 'ALUMINIO', 'CABOS', 'FIOS'])
  ) {
    return true;
  }

  return false;
}

function obterValorFiosDashboard_(row) {
  return numeroDashboard_(row.VALOR_RS);
}

function montarComparativoFios2025x2026Dashboard_(rows) {
  var mapa = {
    '2025': {},
    '2026': {}
  };

  DASHBOARD_CFG.MONTHS.forEach(function(mes) {
    var chave = normalizarDashboard_(mes);
    mapa['2025'][chave] = 0;
    mapa['2026'][chave] = 0;
  });

  (rows || []).forEach(function(row) {
    if (!ehLinhaValorFiosDashboard_(row)) return;

    var ano = String(row.ANO_REFERENCIA || '').trim();
    var mes = normalizarDashboard_(row.MES);

    if (ano !== '2025' && ano !== '2026') return;
    if (!mes) return;
    if (mapa[ano][mes] === undefined) return;

    mapa[ano][mes] += obterValorFiosDashboard_(row);
  });

  var total2025 = 0;
  var total2026 = 0;

  var serie2025 = DASHBOARD_CFG.MONTHS.map(function(mes) {
    var valor = mapa['2025'][normalizarDashboard_(mes)] || 0;
    total2025 += valor;
    return valor;
  });

  var serie2026 = DASHBOARD_CFG.MONTHS.map(function(mes) {
    var valor = mapa['2026'][normalizarDashboard_(mes)] || 0;
    total2026 += valor;
    return valor;
  });

  return {
    meses: DASHBOARD_CFG.MONTHS.slice(),
    serie2025: serie2025,
    serie2026: serie2026,
    total2025: total2025,
    total2026: total2026
  };
}

function montarLinhaTabelaDashboard_(tipoDado, row, extra) {
  extra = extra || {};

  return {
    data: extra.data || '',
    delegacia: extra.delegacia || '',
    ano: extra.ano || '',
    mes: extra.mes || '',
    tipoDado: tipoDado,
    categoriaPrincipal: extra.categoriaPrincipal || '',
    subcategoria: extra.subcategoria || '',
    quantidade: numeroDashboard_(extra.quantidade || 0),
    valor: numeroDashboard_(extra.valor || 0),
    equipe: extra.equipe || '',
    status: extra.status || '',
    procedimento: extra.procedimento || ''
  };
}

function filtrarProdutividadeDashboard_(rows, filtros, usuario) {
  return (rows || []).filter(function(row) {
    var delegacia = String(row.DELEGACIA || '').trim();
    var equipe = extrairEquipeDashboard_(row);
    var ano = String(row.ANO_REFERENCIA || '').trim();
    var mes = normalizarDashboard_(row.MES);

    if (usuario._classeDashboard === 'PROPRIA' && normalizarDashboard_(delegacia) !== normalizarDashboard_(usuario._delegaciaDashboard)) return false;
    if (usuario._classeDashboard === 'EQUIPE' && normalizarDashboard_(equipe) !== normalizarDashboard_(usuario._equipeDashboard)) return false;
    if (filtros.delegacia && normalizarDashboard_(delegacia) !== normalizarDashboard_(filtros.delegacia)) return false;
    if (filtros.ano && String(ano) !== String(filtros.ano)) return false;
    if (filtros.mes && normalizarDashboard_(mes) !== normalizarDashboard_(filtros.mes)) return false;

    return true;
  });
}

function filtrarDemandasDashboard_(rows, filtros, usuario) {
  return (rows || []).filter(function(row) {
    var data = row.DATA_DA_OCORRENCIA;
    var ano = String(anoDashboard_(data) || '');
    var mes = mesDashboard_(data);
    var delegacia = String(row.UNIDADE_RESPONSAVEL || '').trim();
    var equipe = extrairEquipeDashboard_(row);

    if (usuario._classeDashboard === 'PROPRIA' && normalizarDashboard_(delegacia) !== normalizarDashboard_(usuario._delegaciaDashboard)) return false;
    if (usuario._classeDashboard === 'EQUIPE' && normalizarDashboard_(equipe) !== normalizarDashboard_(usuario._equipeDashboard)) return false;
    if (filtros.delegacia && normalizarDashboard_(delegacia) !== normalizarDashboard_(filtros.delegacia)) return false;
    if (filtros.ano && String(ano) !== String(filtros.ano)) return false;
    if (filtros.mes && normalizarDashboard_(mes) !== normalizarDashboard_(filtros.mes)) return false;

    return true;
  });
}

function filtrarPrisoesDashboard_(rows, filtros, usuario) {
  return (rows || []).filter(function(row) {
    var delegacia = String(row.DELEGACIA || '').trim();
    var equipe = extrairEquipeDashboard_(row);
    var ano = String(anoDashboard_(row.DATA) || '');
    var mes = normalizarDashboard_(row['MÊS'] || row.MES);

    if (usuario._classeDashboard === 'PROPRIA' && normalizarDashboard_(delegacia) !== normalizarDashboard_(usuario._delegaciaDashboard)) return false;
    if (usuario._classeDashboard === 'EQUIPE' && normalizarDashboard_(equipe) !== normalizarDashboard_(usuario._equipeDashboard)) return false;
    if (filtros.delegacia && normalizarDashboard_(delegacia) !== normalizarDashboard_(filtros.delegacia)) return false;
    if (filtros.ano && String(ano) !== String(filtros.ano)) return false;
    if (filtros.mes && normalizarDashboard_(mes) !== normalizarDashboard_(filtros.mes)) return false;

    return true;
  });
}

function montarKpisDashboard_(prodRows, demandaRows, prisaoRows) {
  var apreensoes = {
    armas: 0,
    drogasKg: 0,
    fiosQtd: 0,
    fiosValor: 0,
    veiculos: 0,
    celulares: 0,
    dinheiroValor: 0
  };

  prodRows.forEach(function(row) {
    var prod = normalizarDashboard_(row.PRODUTIVIDADE);
    var tipo = normalizarDashboard_(row.TIPO_DE_PRODUTIVIDADE);
    var qtd = numeroDashboard_(row.QUANTIDADE);
    var valorEspecie = numeroDashboard_(row.VALOR_EM_ESPECIE);
    var valorRs = numeroDashboard_(row.VALOR_RS);

    if (ehLinhaValorFiosDashboard_(row)) {
      apreensoes.fiosValor += obterValorFiosDashboard_(row);
    }

    if (prod === 'APREENSAO') {
      if (aliasContemDashboard_(tipo, ['ARMA DE FOGO', 'ARMAS'])) apreensoes.armas += qtd;
      if (aliasContemDashboard_(tipo, ['DROGAS'])) apreensoes.drogasKg += (qtd / 1000);
      if (aliasContemDashboard_(tipo, ['FIOS E RELACIONADOS', 'COBRE', 'ALUMINIO', 'CABOS', 'FIOS'])) apreensoes.fiosQtd += qtd;
      if (aliasContemDashboard_(tipo, ['VEICULO', 'VEÍCULOS APREENDIDOS'])) apreensoes.veiculos += qtd;
      if (aliasContemDashboard_(tipo, ['CELULAR', 'CELULARES', 'APARELHOS CELULARES'])) apreensoes.celulares += qtd;
      if (aliasContemDashboard_(tipo, ['DINHEIRO EM ESPECIE', 'DINHEIRO EM ESPÉCIE'])) {
        apreensoes.dinheiroValor += (valorEspecie > 0 ? valorEspecie : (valorRs > 0 ? valorRs : qtd));
      }
    }
  });

  var totalInqInstaurado = somarDashboard_(prodRows.filter(function(row) {
    return normalizarDashboard_(row.PRODUTIVIDADE) === 'INQUERITO' &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['INQUERITO INSTAURADO', 'INQUÉRITO INSTAURADO']);
  }), function(row) { return row.QUANTIDADE; });

  var totalInqConcluido = somarDashboard_(prodRows.filter(function(row) {
    return normalizarDashboard_(row.PRODUTIVIDADE) === 'INQUERITO' &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['INQUERITO CONCLUIDO', 'INQUÉRITO CONCLUÍDO', 'INQUÉRITO CONCLUIDO']);
  }), function(row) { return row.QUANTIDADE; });

  var totalPrisaoCautelar = somarDashboard_(prodRows.filter(function(row) {
    return normalizarDashboard_(row.PRODUTIVIDADE) === 'REPRESENTACAO' &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['PRISAO CAUTELAR', 'PRISÃO CAUTELAR']);
  }), function(row) { return valorQuantidadeOuUmDashboard_(row); });

  var totalBuscaApreensao = somarDashboard_(prodRows.filter(function(row) {
    return normalizarDashboard_(row.PRODUTIVIDADE) === 'REPRESENTACAO' &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['BUSCA E APREENSAO', 'BUSCA E APREENSÃO']);
  }), function(row) { return valorQuantidadeOuUmDashboard_(row); });

  var totalInterceptacao = somarDashboard_(prodRows.filter(function(row) {
    return normalizarDashboard_(row.PRODUTIVIDADE) === 'REPRESENTACAO' &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['INTERCEPTACAO TELEFONICA', 'INTERCEPTAÇÃO TELEFÔNICA', 'TELEMATICA', 'TELEMÁTICA']);
  }), function(row) { return valorQuantidadeOuUmDashboard_(row); });

  var totalQuebraSigilo = somarDashboard_(prodRows.filter(function(row) {
    return normalizarDashboard_(row.PRODUTIVIDADE) === 'REPRESENTACAO' &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['QUEBRA DE SIGILO', 'EXTRACAO', 'EXTRAÇÃO']);
  }), function(row) { return valorQuantidadeOuUmDashboard_(row); });

  var totalIndFlagrantePat = somarDashboard_(prodRows.filter(function(row) {
    return normalizarDashboard_(row.PRODUTIVIDADE) === 'INDICIAMENTO' &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['CRIMES PATRIMONIAIS']) &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['FLAGRANTE']);
  }), function(row) { return valorQuantidadeOuUmDashboard_(row); });

  var totalIndPortariaPat = somarDashboard_(prodRows.filter(function(row) {
    return normalizarDashboard_(row.PRODUTIVIDADE) === 'INDICIAMENTO' &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['CRIMES PATRIMONIAIS']) &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['PORTARIA']);
  }), function(row) { return valorQuantidadeOuUmDashboard_(row); });

  var totalIndFlagrante = somarDashboard_(prodRows.filter(function(row) {
    return normalizarDashboard_(row.PRODUTIVIDADE) === 'INDICIAMENTO' &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['FLAGRANTE']);
  }), function(row) { return valorQuantidadeOuUmDashboard_(row); });

  var totalIndPortaria = somarDashboard_(prodRows.filter(function(row) {
    return normalizarDashboard_(row.PRODUTIVIDADE) === 'INDICIAMENTO' &&
      aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['PORTARIA']);
  }), function(row) { return valorQuantidadeOuUmDashboard_(row); });

  var totalPrisoes = somarDashboard_(prisaoRows, function(row) { return row.PRISÕES || row.PRISOES || 0; });
  var demandasEvoluidas = demandaRows.filter(function(row) {
    return normalizarDashboard_(row.STATUS_DEMANDA) === 'DEMANDA EVOLUIDA';
  }).length;
  var demandasNaoEvoluidas = demandaRows.filter(function(row) {
    return normalizarDashboard_(row.STATUS_DEMANDA) !== 'DEMANDA EVOLUIDA';
  }).length;

  return {
    linha1: [
      { id: 'prisoes', titulo: 'Prisões', valor: totalPrisoes, tipo: 'numero', icone: 'fa-handcuffs' },
      { id: 'armas', titulo: 'Apreensão de Armas', valor: apreensoes.armas, tipo: 'numero', icone: 'fa-gun' },
      { id: 'drogas', titulo: 'Apreensão de Drogas (kg)', valor: apreensoes.drogasKg, tipo: 'numero_2', icone: 'fa-capsules' },
      { id: 'veiculos', titulo: 'Apreensão de Veículos', valor: apreensoes.veiculos, tipo: 'numero', icone: 'fa-car-side' },
      { id: 'inq_inst', titulo: 'Inquéritos Instaurados', valor: totalInqInstaurado, tipo: 'numero', icone: 'fa-folder-plus' },
      { id: 'inq_conc', titulo: 'Inquéritos Concluídos', valor: totalInqConcluido, tipo: 'numero', icone: 'fa-folder-check' }
    ],
    linha2: [
      { id: 'fios', titulo: 'Valor de Fios e Relacionados', valor: apreensoes.fiosValor, tipo: 'moeda', icone: 'fa-bolt' },
      { id: 'celulares', titulo: 'Apreensão de Celulares', valor: apreensoes.celulares, tipo: 'numero', icone: 'fa-mobile-screen-button' },
      { id: 'dinheiro', titulo: 'Dinheiro em Espécie', valor: apreensoes.dinheiroValor, tipo: 'moeda', icone: 'fa-money-bill-wave' },
      { id: 'rep_prisao', titulo: 'Representação por Prisão Cautelar', valor: totalPrisaoCautelar, tipo: 'numero', icone: 'fa-scale-balanced' },
      { id: 'rep_busca', titulo: 'Representação por Busca e Apreensão', valor: totalBuscaApreensao, tipo: 'numero', icone: 'fa-magnifying-glass' }
    ],
    linha3: [
      { id: 'rep_inter', titulo: 'Interceptação Telefônica/Telemática', valor: totalInterceptacao, tipo: 'numero', icone: 'fa-tower-cell' },
      { id: 'rep_quebra', titulo: 'Quebra de Sigilo / Extração / Outros', valor: totalQuebraSigilo, tipo: 'numero', icone: 'fa-file-waveform' },
      { id: 'ind_flag_pat', titulo: 'Indiciamento por Flagrante – Crimes Patrimoniais', valor: totalIndFlagrantePat, tipo: 'numero', icone: 'fa-gavel' },
      { id: 'ind_port_pat', titulo: 'Indiciamento por Portaria – Crimes Patrimoniais', valor: totalIndPortariaPat, tipo: 'numero', icone: 'fa-building-shield' },
      { id: 'ind_flag', titulo: 'Indiciamento por Flagrante', valor: totalIndFlagrante, tipo: 'numero', icone: 'fa-user-lock' },
      { id: 'ind_port', titulo: 'Indiciamento por Portaria', valor: totalIndPortaria, tipo: 'numero', icone: 'fa-file-signature' }
    ],
    demandas: {
      evoluidas: demandasEvoluidas,
      naoEvoluidas: demandasNaoEvoluidas
    }
  };
}

function montarGraficosDashboard_(prodRows, demandaRows, prisaoRows, prodRowsComparativoFios) {
  var prodApreensoes = {
    armas: 0,
    drogasKg: 0,
    fios: 0,
    veiculos: 0,
    celulares: 0
  };

  var comparativoFios = montarComparativoFios2025x2026Dashboard_(prodRowsComparativoFios || []);

  prodRows.forEach(function(row) {
    var prod = normalizarDashboard_(row.PRODUTIVIDADE);
    var tipo = normalizarDashboard_(row.TIPO_DE_PRODUTIVIDADE);
    var qtd = numeroDashboard_(row.QUANTIDADE);

    if (prod === 'APREENSAO') {
      if (aliasContemDashboard_(tipo, ['ARMA DE FOGO', 'ARMAS'])) prodApreensoes.armas += qtd;
      if (aliasContemDashboard_(tipo, ['DROGAS'])) prodApreensoes.drogasKg += (qtd / 1000);
      if (aliasContemDashboard_(tipo, ['FIOS E RELACIONADOS', 'COBRE', 'ALUMINIO', 'CABOS', 'FIOS'])) prodApreensoes.fios += qtd;
      if (aliasContemDashboard_(tipo, ['VEICULO', 'VEÍCULOS APREENDIDOS'])) prodApreensoes.veiculos += qtd;
      if (aliasContemDashboard_(tipo, ['CELULAR', 'CELULARES', 'APARELHOS CELULARES'])) prodApreensoes.celulares += qtd;
    }
  });
  
  var instauradosPorCrime = agruparSomandoDashboard_(
    prodRows.filter(function(row) {
      return normalizarDashboard_(row.PRODUTIVIDADE) === 'INQUERITO' &&
        aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['INQUERITO INSTAURADO', 'INQUÉRITO INSTAURADO']);
    }),
    function(row) { return row.CRIME || 'NÃO INFORMADO'; },
    function(row) { return row.QUANTIDADE; }
  );

  var concluidosPorCrime = agruparSomandoDashboard_(
    prodRows.filter(function(row) {
      return normalizarDashboard_(row.PRODUTIVIDADE) === 'INQUERITO' &&
        aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['INQUERITO CONCLUIDO', 'INQUÉRITO CONCLUÍDO', 'INQUÉRITO CONCLUIDO']);
    }),
    function(row) { return row.CRIME || 'NÃO INFORMADO'; },
    function(row) { return row.QUANTIDADE; }
  );

  var representacoesTipos = {
    'Prisão cautelar': somarDashboard_(prodRows.filter(function(row) {
      return normalizarDashboard_(row.PRODUTIVIDADE) === 'REPRESENTACAO' &&
        aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['PRISAO CAUTELAR', 'PRISÃO CAUTELAR']);
    }), function(row) { return valorQuantidadeOuUmDashboard_(row); }),
    'Busca e apreensão': somarDashboard_(prodRows.filter(function(row) {
      return normalizarDashboard_(row.PRODUTIVIDADE) === 'REPRESENTACAO' &&
        aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['BUSCA E APREENSAO', 'BUSCA E APREENSÃO']);
    }), function(row) { return valorQuantidadeOuUmDashboard_(row); }),
    'Interceptação': somarDashboard_(prodRows.filter(function(row) {
      return normalizarDashboard_(row.PRODUTIVIDADE) === 'REPRESENTACAO' &&
        aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['INTERCEPTACAO TELEFONICA', 'INTERCEPTAÇÃO TELEFÔNICA', 'TELEMATICA', 'TELEMÁTICA']);
    }), function(row) { return valorQuantidadeOuUmDashboard_(row); }),
    'Quebra sigilo / extração': somarDashboard_(prodRows.filter(function(row) {
      return normalizarDashboard_(row.PRODUTIVIDADE) === 'REPRESENTACAO' &&
        aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['QUEBRA DE SIGILO', 'EXTRACAO', 'EXTRAÇÃO']);
    }), function(row) { return valorQuantidadeOuUmDashboard_(row); })
  };

  var indiciamentosTipos = {
    'Flagrante – Patrimoniais': somarDashboard_(prodRows.filter(function(row) {
      return normalizarDashboard_(row.PRODUTIVIDADE) === 'INDICIAMENTO' &&
        aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['FLAGRANTE', 'CRIMES PATRIMONIAIS']);
    }), function(row) { return valorQuantidadeOuUmDashboard_(row); }),
    'Portaria – Patrimoniais': somarDashboard_(prodRows.filter(function(row) {
      return normalizarDashboard_(row.PRODUTIVIDADE) === 'INDICIAMENTO' &&
        aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['PORTARIA', 'CRIMES PATRIMONIAIS']);
    }), function(row) { return valorQuantidadeOuUmDashboard_(row); }),
    'Flagrante – Geral': somarDashboard_(prodRows.filter(function(row) {
      return normalizarDashboard_(row.PRODUTIVIDADE) === 'INDICIAMENTO' &&
        aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['FLAGRANTE']);
    }), function(row) { return valorQuantidadeOuUmDashboard_(row); }),
    'Portaria – Geral': somarDashboard_(prodRows.filter(function(row) {
      return normalizarDashboard_(row.PRODUTIVIDADE) === 'INDICIAMENTO' &&
        aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['PORTARIA']);
    }), function(row) { return valorQuantidadeOuUmDashboard_(row); })
  };

  var prisoesPorDelegacia = agruparSomandoDashboard_(prisaoRows, function(row) {
    return row.DELEGACIA || 'NÃO INFORMADO';
  }, function(row) {
    return row.PRISÕES || row.PRISOES || 0;
  });

  var prisoesPorModalidade = agruparSomandoDashboard_(prisaoRows, function(row) {
    return row['MODALIDADE PRISÃO'] || row['MODALIDADE  DE PRISÃO'] || 'NÃO INFORMADO';
  }, function(row) {
    return row.PRISÕES || row.PRISOES || 0;
  });

  var prisoesPorTipoPenal = agruparSomandoDashboard_(prisaoRows, function(row) {
    return row['TIPO PENAL PRINCIPAL'] || 'NÃO INFORMADO';
  }, function(row) {
    return row.PRISÕES || row.PRISOES || 0;
  });

  var prisoesTempoMapa = {};
  prisaoRows.forEach(function(row) {
    var data = dataDashboard_(row.DATA);
    if (!data) return;
    var chave = Utilities.formatDate(data, 'America/Fortaleza', 'yyyy-MM');
    if (!prisoesTempoMapa[chave]) prisoesTempoMapa[chave] = 0;
    prisoesTempoMapa[chave] += numeroDashboard_(row.PRISÕES || row.PRISOES || 0);
  });

  var prisoesAoLongoDoTempo = Object.keys(prisoesTempoMapa).sort().map(function(chave) {
    return { nome: chave, valor: prisoesTempoMapa[chave] };
  });

  var demandasEvolucao = agruparSomandoDashboard_(demandaRows, function(row) {
    var status = normalizarDashboard_(row.STATUS_DEMANDA);
    return status === 'DEMANDA EVOLUIDA' ? 'Demandas evoluídas' : 'Demandas não evoluídas';
  }, function() {
    return 1;
  });

  var demandasStatus = agruparSomandoDashboard_(demandaRows, function(row) {
    return row.STATUS || 'NÃO INFORMADO';
  }, function() {
    return 1;
  });

  var equipesMapa = {};
  demandaRows.forEach(function(row) {
    var equipe = String(row.EQUIPE_DIRETORIA || 'NÃO INFORMADO').trim() || 'NÃO INFORMADO';
    if (!equipesMapa[equipe]) {
      equipesMapa[equipe] = {
        evoluidas: 0,
        relatorios: 0,
        suspeitosIdentificados: 0,
        suspeitosPresos: 0,
        veiculos: 0,
        armas: 0
      };
    }

    if (normalizarDashboard_(row.STATUS_DEMANDA) === 'DEMANDA EVOLUIDA') equipesMapa[equipe].evoluidas += 1;
    equipesMapa[equipe].relatorios += numeroDashboard_(row.RELATORIOS_QTD);
    equipesMapa[equipe].suspeitosIdentificados += numeroDashboard_(row.SUSPEITOS_IDENTIFICADOS_QTD);
    equipesMapa[equipe].suspeitosPresos += numeroDashboard_(row.SUSPEITOS_PRESOS_QTD);
    equipesMapa[equipe].veiculos += numeroDashboard_(row.VEICULOS_RECUPERADOS_QTD) + numeroDashboard_(row.VEICULOS_APREENDIDOS_QTD);
    equipesMapa[equipe].armas += numeroDashboard_(row.ARMAS_APREENDIDAS_QTD);
  });

  var equipesOrdenadas = Object.keys(equipesMapa).map(function(nome) {
    return {
      nome: nome,
      score: equipesMapa[nome].evoluidas + equipesMapa[nome].relatorios + equipesMapa[nome].suspeitosPresos + equipesMapa[nome].veiculos + equipesMapa[nome].armas,
      dados: equipesMapa[nome]
    };
  }).sort(function(a, b) {
    return b.score - a.score;
  }).slice(0, 8);

  return {
    apreensoesPorTipo: [
      { nome: 'Armas', valor: prodApreensoes.armas },
      { nome: 'Drogas (kg)', valor: prodApreensoes.drogasKg },
      { nome: 'Fios e relacionados (kg)', valor: prodApreensoes.fios },
      { nome: 'Veículos', valor: prodApreensoes.veiculos },
      { nome: 'Celulares', valor: prodApreensoes.celulares }
    ],
    inqueritosPorCrime: {
      instaurados: ordenarMapaDescDashboard_(instauradosPorCrime, 12),
      concluidos: ordenarMapaDescDashboard_(concluidosPorCrime, 12)
    },
    representacoesPorTipo: ordenarMapaDescDashboard_(representacoesTipos),
    indiciamentosPorTipo: ordenarMapaDescDashboard_(indiciamentosTipos),
    prisoesPorDelegacia: ordenarMapaDescDashboard_(prisoesPorDelegacia, 12),
    prisoesPorModalidade: ordenarMapaDescDashboard_(prisoesPorModalidade, 10),
    prisoesPorTipoPenal: ordenarMapaDescDashboard_(prisoesPorTipoPenal, 12),
    prisoesAoLongoDoTempo: prisoesAoLongoDoTempo,
    demandasEvoluidasVsNao: ordenarMapaDescDashboard_(demandasEvolucao),
    statusDemandas: ordenarMapaDescDashboard_(demandasStatus),
    equipesProducao: equipesOrdenadas,
    fiosValorComparativo2025x2026: comparativoFios
  };
}

function montarTabelaDashboard_(prodRows, demandaRows, prisaoRows) {
  var linhas = [];

  prodRows.forEach(function(row) {
    linhas.push(montarLinhaTabelaDashboard_('Produtividade', row, {
      data: dataDashboard_(row.DATA_HORA) ? Utilities.formatDate(dataDashboard_(row.DATA_HORA), 'America/Fortaleza', 'dd/MM/yyyy') : '',
      delegacia: row.DELEGACIA || '',
      ano: row.ANO_REFERENCIA || '',
      mes: row.MES || '',
      categoriaPrincipal: row.PRODUTIVIDADE || '',
      subcategoria: row.TIPO_DE_PRODUTIVIDADE || '',
      quantidade: row.QUANTIDADE || 0,
      valor: numeroDashboard_(row.VALOR_RS) + numeroDashboard_(row.VALOR_EM_ESPECIE),
      procedimento: [row.INQ_ORIGEM || '', row.INQ_AUTORIA || ''].filter(Boolean).join(' | ')
    }));
  });

  demandaRows.forEach(function(row) {
    linhas.push(montarLinhaTabelaDashboard_('Demanda', row, {
      data: dataDashboard_(row.DATA_DA_OCORRENCIA) ? Utilities.formatDate(dataDashboard_(row.DATA_DA_OCORRENCIA), 'America/Fortaleza', 'dd/MM/yyyy') : '',
      delegacia: row.UNIDADE_RESPONSAVEL || '',
      ano: anoDashboard_(row.DATA_DA_OCORRENCIA) || '',
      mes: mesDashboard_(row.DATA_DA_OCORRENCIA) || '',
      categoriaPrincipal: row.CRIME_TIPO || 'Demanda',
      subcategoria: row.STATUS_DEMANDA || '',
      quantidade: 1,
      valor: 0,
      equipe: row.EQUIPE_DIRETORIA || '',
      status: row.STATUS || '',
      procedimento: row.PROCEDIMENTO_CONCAT || ''
    }));
  });

  prisaoRows.forEach(function(row) {
    linhas.push(montarLinhaTabelaDashboard_('Prisão', row, {
      data: dataDashboard_(row.DATA) ? Utilities.formatDate(dataDashboard_(row.DATA), 'America/Fortaleza', 'dd/MM/yyyy') : '',
      delegacia: row.DELEGACIA || '',
      ano: anoDashboard_(row.DATA) || '',
      mes: row['MÊS'] || row.MES || '',
      categoriaPrincipal: row['TIPO PENAL PRINCIPAL'] || 'Prisão',
      subcategoria: row['MODALIDADE PRISÃO'] || '',
      quantidade: row.PRISÕES || row.PRISOES || 0,
      valor: 0,
      equipe: '',
      status: row['SITUAÇÃO ALVO'] || '',
      procedimento: row.PROCEDIMENTO || ''
    }));
  });

  linhas.sort(function(a, b) {
    var da = a.data ? a.data.split('/').reverse().join('') : '';
    var db = b.data ? b.data.split('/').reverse().join('') : '';
    if (db !== da) return db.localeCompare(da);
    return String(a.categoriaPrincipal || '').localeCompare(String(b.categoriaPrincipal || ''), 'pt-BR');
  });

  return linhas.slice(0, 150);
}

function obterFiltrosDisponiveisDashboard_(usuario) {
  var ssPortal = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var abaProd = ssPortal.getSheetByName('REGISTROS_PRODUTIVIDADE');
  var abaDemandas = ssPortal.getSheetByName('DEMANDAS_ATIVAS');

  var ssPrisoes = SpreadsheetApp.openById(DASHBOARD_CFG.PRISOES_SHEET_ID);
  var abaPrisoes = ssPrisoes.getSheetByName(DASHBOARD_CFG.PRISOES_SHEET_NAME);

  var prodRows = sheetToObjectsDashboard_(abaProd);
  var demandaRows = sheetToObjectsDashboard_(abaDemandas);
  var prisaoRows = sheetToObjectsDashboard_(abaPrisoes);

  var setDelegacias = {};
  var setAnos = {};

  prodRows.forEach(function(row) {
    var del = String(row.DELEGACIA || '').trim();
    if (del) setDelegacias[del] = true;
    if (row.ANO_REFERENCIA) setAnos[String(row.ANO_REFERENCIA).trim()] = true;
  });

  demandaRows.forEach(function(row) {
    var del = String(row.UNIDADE_RESPONSAVEL || '').trim();
    if (del) setDelegacias[del] = true;
    var ano = anoDashboard_(row.DATA_DA_OCORRENCIA);
    if (ano) setAnos[String(ano)] = true;
  });

  prisaoRows.forEach(function(row) {
    var del = String(row.DELEGACIA || '').trim();
    if (del) setDelegacias[del] = true;
    var ano = anoDashboard_(row.DATA);
    if (ano) setAnos[String(ano)] = true;
  });

  var delegacias = Object.keys(setDelegacias).sort(function(a, b) {
    return a.localeCompare(b, 'pt-BR');
  });

  var anos = Object.keys(setAnos).sort(function(a, b) {
    return Number(b) - Number(a);
  });

  if (usuario._classeDashboard === 'PROPRIA') {
    delegacias = [usuario._delegaciaDashboard];
  }

  return {
    classeAcesso: usuario._classeDashboard,
    delegaciaFixada: usuario._classeDashboard === 'PROPRIA' ? usuario._delegaciaDashboard : '',
    equipeFixada: usuario._classeDashboard === 'EQUIPE' ? usuario._equipeDashboard : '',
    delegacias: delegacias,
    meses: DASHBOARD_CFG.MONTHS.slice(),
    anos: anos
  };
}

function obterDashboardBootstrap(usuarioLogin) {
  var usuario = validarAcessoDashboard_(usuarioLogin);
  return obterFiltrosDisponiveisDashboard_(usuario);
}

function obterDashboardDados(usuarioLogin, filtros) {
  filtros = filtros || {};
  var usuario = validarAcessoDashboard_(usuarioLogin);

  var filtrosAplicados = {
    delegacia: String(filtros.delegacia || '').trim(),
    mes: normalizarDashboard_(filtros.mes || ''),
    ano: String(filtros.ano || '').trim()
  };

  if (usuario._classeDashboard === 'PROPRIA') {
    filtrosAplicados.delegacia = usuario._delegaciaDashboard;
  }

  var cache = CacheService.getScriptCache();
  var cacheKey = 'dashboard:' + DASHBOARD_BUILD_ID + ':' + normalizarDashboard_(usuario.login) + ':' + Utilities.base64EncodeWebSafe(JSON.stringify(filtrosAplicados));
  var cacheHit = cache.get(cacheKey);
  if (cacheHit) {
    return JSON.parse(cacheHit);
  }

  var ssPortal = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var abaProd = ssPortal.getSheetByName('REGISTROS_PRODUTIVIDADE');
  var abaDemandas = ssPortal.getSheetByName('DEMANDAS_ATIVAS');

  var ssPrisoes = SpreadsheetApp.openById(DASHBOARD_CFG.PRISOES_SHEET_ID);
  var abaPrisoes = ssPrisoes.getSheetByName(DASHBOARD_CFG.PRISOES_SHEET_NAME);

  var prodRowsBase = sheetToObjectsDashboard_(abaProd);
  var demandaRowsBase = sheetToObjectsDashboard_(abaDemandas);
  var prisaoRowsBase = sheetToObjectsDashboard_(abaPrisoes);

  var prodRows = filtrarProdutividadeDashboard_(prodRowsBase, filtrosAplicados, usuario);
  var demandaRows = filtrarDemandasDashboard_(demandaRowsBase, filtrosAplicados, usuario);
  var prisaoRows = filtrarPrisoesDashboard_(prisaoRowsBase, filtrosAplicados, usuario);

  var filtrosComparativoFios = {
    delegacia: filtrosAplicados.delegacia,
    mes: '',
    ano: ''
  };

  var prodRowsComparativoFios = filtrarProdutividadeDashboard_(prodRowsBase, filtrosComparativoFios, usuario);

  var resposta = {
    filtrosAplicados: filtrosAplicados,
    acesso: {
      classe: usuario._classeDashboard,
      delegaciaFixada: usuario._classeDashboard === 'PROPRIA' ? usuario._delegaciaDashboard : ''
    },
    relatoriosPorDelegacia: montarRelatoriosPorDelegaciaDashboard_(prodRows, filtrosAplicados, usuario),
    kpis: montarKpisDashboard_(prodRows, demandaRows, prisaoRows),
    graficos: montarGraficosDashboard_(prodRows, demandaRows, prisaoRows, prodRowsComparativoFios),
    tabela: montarTabelaDashboard_(prodRows, demandaRows, prisaoRows),
    meta: {
      atualizadoEm: Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy HH:mm:ss'),
      totalProdutividade: prodRows.length,
      totalDemandas: demandaRows.length,
      totalPrisoes: prisaoRows.length
    }
  };

    tentarCachePutDashboard_(cache, cacheKey, resposta, DASHBOARD_CFG.CACHE_SECONDS);
  return resposta;
}

// ============================================================================
// COMPLEMENTO DO MÓDULO 8 - PAINEL DEPATRI DINÂMICO NO DASHBOARD EXISTENTE
// Cole este bloco NO FINAL do arquivo DASHBOARD.gs, mantendo o código antigo.
// ============================================================================

var DASHBOARD_DEPATRI_CONFIG_SHEET = 'DASHBOARD_DEPATRI_CONFIG';

function dashboardDepatriConfigPadrao_() {
  return {
    GERAL: {
      nome: 'Geral – Dashboard Operacional',
      aliases: [],
      crimes: []
    },
    DRFV: {
      nome: 'DRFV – Delegacia de Roubos e Furtos de Veículos',
      aliases: ['DRFV', 'DELEGACIA DE ROUBOS E FURTOS DE VEICULOS', 'DELEGACIA DE ROUBOS E FURTOS DE VEÍCULOS'],
      crimes: [
        { crimeChave: 'ROUBO DE VEÍCULO', crimeExibicao: 'ROUBO DE VEÍCULO', icone: 'fa-car-burst', ordem: 1, ativo: true },
        { crimeChave: 'FURTO DE VEÍCULO', crimeExibicao: 'FURTO DE VEÍCULO', icone: 'fa-car-side', ordem: 2, ativo: true },
        { crimeChave: 'RECEPTAÇÃO DE VEÍCULO', crimeExibicao: 'RECEPTAÇÃO DE VEÍCULO', icone: 'fa-car-rear', ordem: 3, ativo: true },
        { crimeChave: 'ADULTERAÇÃO DE SINAL IDENTIFICADOR DE VEÍCULO AUTOMOTOR', crimeExibicao: 'ADULTERAÇÃO DE SINAL IDENTIFICADOR DE VEÍCULO AUTOMOTOR', icone: 'fa-magnifying-glass', ordem: 4, ativo: true }
      ]
    },
    DRF: {
      nome: 'DRF – Delegacia de Roubos e Furtos',
      aliases: ['DRF', 'DRFC', 'DELEGACIA DE ROUBOS E FURTOS', 'DELEGACIA DE ROUBOS E FURTOS E CARGAS', 'DELEGACIA DE ROUBOS E FURTOS / CARGAS'],
      crimes: [
        { crimeChave: 'ROUBO', crimeExibicao: 'ROUBO', icone: 'fa-user-ninja', ordem: 1, ativo: true },
        { crimeChave: 'FURTO', crimeExibicao: 'FURTO', icone: 'fa-person-running', ordem: 2, ativo: true },
        { crimeChave: 'ROUBO DE CARGA', crimeExibicao: 'ROUBO DE CARGA', icone: 'fa-truck', ordem: 3, ativo: true },
        { crimeChave: 'FURTO DE CARGA', crimeExibicao: 'FURTO DE CARGA', icone: 'fa-dolly', ordem: 4, ativo: true },
        { crimeChave: 'RECEPTAÇÃO DE CARGA', crimeExibicao: 'RECEPTAÇÃO DE CARGA', icone: 'fa-box-open', ordem: 5, ativo: true }
      ]
    },
    DAS: {
      nome: 'DAS – Delegacia Antissequestro',
      aliases: ['DAS', 'DELEGACIA ANTISSEQUESTRO', 'DELEGACIA ANTISEQUESTRO'],
      crimes: [
        { crimeChave: 'EXTORSÃO MEDIANTE SEQUESTRO', crimeExibicao: 'EXTORSÃO MEDIANTE SEQUESTRO', icone: 'fa-user-secret', ordem: 1, ativo: true },
        { crimeChave: 'EXTORSÃO MEDIANTE RESTRIÇÃO DA LIBERDADE DA VÍTIMA', crimeExibicao: 'EXTORSÃO MEDIANTE RESTRIÇÃO DA LIBERDADE DA VÍTIMA', icone: 'fa-lock', ordem: 2, ativo: true },
        { crimeChave: 'SEQUESTRO E CÁRCERE PRIVADO', crimeExibicao: 'SEQUESTRO E CÁRCERE PRIVADO', icone: 'fa-lock-open', ordem: 3, ativo: true }
      ]
    },
    DDF: {
      nome: 'DDF – Delegacia de Defraudações e Falsificações',
      aliases: ['DDF', 'DELEGACIA DE DEFRAUDACOES E FALSIFICACOES', 'DELEGACIA DE DEFRAUDAÇÕES E FALSIFICAÇÕES'],
      crimes: [
        { crimeChave: 'ESTELIONATO', crimeExibicao: 'ESTELIONATO', icone: 'fa-money-check-dollar', ordem: 1, ativo: true },
        { crimeChave: 'FRAUDE', crimeExibicao: 'FRAUDE', icone: 'fa-file-circle-exclamation', ordem: 2, ativo: true },
        { crimeChave: 'FALSIFICAÇÃO DE DOCUMENTO PÚBLICO', crimeExibicao: 'FALSIFICAÇÃO DE DOCUMENTO PÚBLICO', icone: 'fa-id-card', ordem: 3, ativo: true }
      ]
    },
    MEU_CELULAR: {
      nome: 'MEU CELULAR – Recuperação de Dispositivos Móveis',
      aliases: ['MEU CELULAR', 'RECUPERACAO DE DISPOSITIVOS MOVEIS', 'RECUPERAÇÃO DE DISPOSITIVOS MÓVEIS'],
      crimes: [
        { crimeChave: 'RECUPERAÇÃO DE APARELHO CELULAR', crimeExibicao: 'RECUPERAÇÃO DE APARELHO CELULAR', icone: 'fa-mobile-screen-button', ordem: 1, ativo: true }
      ]
    }
  };
}

function dashboardDepatriEhAdmin_(usuario) {
  var perfil = normalizarDashboard_(usuario && usuario.perfil);
  return perfil === 'ADMIN' || perfil === 'CRIADOR/ADMIN' || perfil === 'CRIADOR ADMIN' || perfil === 'ADMINISTRADOR';
}

function dashboardDepatriPodeConfigurar_(usuario) {
  if (dashboardDepatriEhAdmin_(usuario)) return true;
  var perfil = normalizarDashboard_(usuario && usuario.perfil);
  var lotacao = normalizarDashboard_((usuario && (usuario.lotacao || usuario.delegacia)) || '');
  return perfil.indexOf('DIRECAO') > -1 || perfil.indexOf('DIRETORIA') > -1 ||
    lotacao.indexOf('DIRECAO') > -1 || lotacao.indexOf('DIRETORIA') > -1;
}

function dashboardProdutividadeUnidades_() {
  return ['DRFV', 'DRF', 'DAS', 'DDF'];
}

function dashboardProdutividadeMetricasCatalogo_() {
  return {
    atendimento_instrucao: [
      { id: 'bo_registrados', rotulo: 'B.O. REGISTRADOS' },
      { id: 'oitivas', rotulo: 'OITIVAS REALIZADAS' }
    ],
    diligencias: [
      { id: 'denuncias', rotulo: 'DENÚNCIAS DILIGENCIADAS' },
      { id: 'intimacoes', rotulo: 'INTIMAÇÕES REALIZADAS' }
    ],
    acervo_inqueritos: [{ id: 'acervo', rotulo: 'ÚLTIMO ACERVO INFORMADO' }],
    inqueritos_remetidos: [
      { id: 'remetidos_com_relatorio', rotulo: 'COM RELATÓRIO' },
      { id: 'remetidos_sem_relatorio', rotulo: 'SEM RELATÓRIO' }
    ],
    medidas_cautelares: [
      { id: 'mandados_busca', rotulo: 'MANDADOS DE BUSCA CUMPRIDOS' },
      { id: 'prisao_cautelar', rotulo: 'REPRESENTAÇÃO — PRISÃO CAUTELAR' },
      { id: 'busca_apreensao', rotulo: 'REPRESENTAÇÃO — BUSCA E APREENSÃO' }
    ],
    veiculos: [
      { id: 'veiculos_recuperados', rotulo: 'RECUPERADOS' },
      { id: 'valor_veiculos', rotulo: 'VALOR DOS RECUPERADOS' },
      { id: 'veiculos_apreendidos', rotulo: 'APREENDIDOS' }
    ],
    interceptacoes: [
      { id: 'rep_interceptacao', rotulo: 'REPRESENTAÇÕES' },
      { id: 'alvos_interceptacao', rotulo: 'ALVOS CITADOS' }
    ],
    quebras_sigilo: [
      { id: 'rep_quebra_sigilo', rotulo: 'REPRESENTAÇÕES' },
      { id: 'alvos_quebra_sigilo', rotulo: 'ALVOS' }
    ],
    drogas_armas: [
      { id: 'drogas', rotulo: 'DROGAS' },
      { id: 'armas', rotulo: 'ARMAS DE FOGO' }
    ],
    fios_sucata: [
      { id: 'fios', rotulo: 'FIOS E RELACIONADOS' },
      { id: 'valor_sucata', rotulo: 'VALOR POR KG DE SUCATA' }
    ],
    valores_apreendidos: [
      { id: 'dinheiro_especie', rotulo: 'DINHEIRO EM ESPÉCIE' },
      { id: 'bens_apreendidos', rotulo: 'BENS APREENDIDOS/RECUPERADOS' },
      { id: 'valor_bloqueado', rotulo: 'VALOR BLOQUEADO' }
    ],
    indiciamentos_flagrante: [
      { id: 'ind_flagrante_patrimonial', rotulo: 'CRIMES PATRIMONIAIS' },
      { id: 'ind_flagrante_geral', rotulo: 'DEMAIS INQUÉRITOS' }
    ],
    indiciamentos_portaria: [
      { id: 'ind_portaria_patrimonial', rotulo: 'CRIMES PATRIMONIAIS' },
      { id: 'ind_portaria_geral', rotulo: 'DEMAIS INQUÉRITOS' }
    ],
    relatorios: [
      { id: 'relatorio_tecnico', rotulo: 'RELATÓRIO TÉCNICO' },
      { id: 'relatorio_inteligencia', rotulo: 'RELATÓRIO DE INTELIGÊNCIA' },
      { id: 'relatorio_missao', rotulo: 'RELATÓRIO DE MISSÃO' },
      { id: 'relatorio_rif', rotulo: 'RIF' }
    ],
    inqueritos_instaurados: [
      { id: 'instaurados_total', rotulo: 'TOTAL' },
      { id: 'instaurados_portaria', rotulo: 'PORTARIA' },
      { id: 'instaurados_flagrante', rotulo: 'FLAGRANTE' }
    ],
    inqueritos_concluidos: [
      { id: 'concluidos_portaria_com_autoria', rotulo: 'PORTARIA COM AUTORIA' },
      { id: 'concluidos_portaria_sem_autoria', rotulo: 'PORTARIA SEM AUTORIA' },
      { id: 'concluidos_flagrante', rotulo: 'FLAGRANTE' }
    ]
  };
}

function dashboardProdutividadeCatalogo_() {
  var cards = [
    { id: 'atendimento_instrucao', titulo: 'ATENDIMENTO E INSTRUÇÃO', icone: 'fa-comments' },
    { id: 'diligencias', titulo: 'DILIGÊNCIAS REALIZADAS', icone: 'fa-person-walking-arrow-right' },
    { id: 'acervo_inqueritos', titulo: 'ACERVO DE INQUÉRITOS', icone: 'fa-box-archive' },
    { id: 'inqueritos_remetidos', titulo: 'INQUÉRITOS REMETIDOS À JUSTIÇA', icone: 'fa-scale-balanced' },
    { id: 'medidas_cautelares', titulo: 'MEDIDAS CAUTELARES', icone: 'fa-gavel' },
    { id: 'veiculos', titulo: 'VEÍCULOS', icone: 'fa-car-side' },
    { id: 'interceptacoes', titulo: 'INTERCEPTAÇÕES', icone: 'fa-tower-cell' },
    { id: 'quebras_sigilo', titulo: 'QUEBRAS DE SIGILO', icone: 'fa-file-shield' },
    { id: 'drogas_armas', titulo: 'DROGAS E ARMAS', icone: 'fa-shield-halved' },
    { id: 'fios_sucata', titulo: 'FIOS E SUCATA', icone: 'fa-bolt' },
    { id: 'valores_apreendidos', titulo: 'VALORES APREENDIDOS', icone: 'fa-sack-dollar' },
    { id: 'indiciamentos_flagrante', titulo: 'INDICIAMENTOS POR FLAGRANTE', icone: 'fa-user-lock' },
    { id: 'indiciamentos_portaria', titulo: 'INDICIAMENTOS POR PORTARIA', icone: 'fa-user-check' },
    { id: 'relatorios', titulo: 'RELATÓRIOS PRODUZIDOS', icone: 'fa-file-lines' },
    { id: 'inqueritos_instaurados', titulo: 'INQUÉRITOS INSTAURADOS', icone: 'fa-folder-plus' },
    { id: 'inqueritos_concluidos', titulo: 'INQUÉRITOS CONCLUÍDOS', icone: 'fa-folder-check' }
  ];
  var metricas = dashboardProdutividadeMetricasCatalogo_();
  cards.forEach(function(card) {
    card.metricas = (metricas[card.id] || []).map(function(metrica) {
      return { id: metrica.id, rotulo: metrica.rotulo };
    });
  });
  return cards;
}

function dashboardProdutividadeMapaCatalogo_() {
  var mapa = {};
  dashboardProdutividadeCatalogo_().forEach(function(card) { mapa[card.id] = card; });
  return mapa;
}

function dashboardProdutividadeMetricasMapa_() {
  var mapa = {};
  dashboardProdutividadeCatalogo_().forEach(function(card) {
    (card.metricas || []).forEach(function(metrica) {
      mapa[card.id + '::' + metrica.id] = {
        fonteCardId: card.id,
        cardTitulo: card.titulo,
        metricaId: metrica.id,
        rotulo: metrica.rotulo
      };
    });
  });
  return mapa;
}

function dashboardProdutividadeSelecaoPadrao_(unidade) {
  var selecoes = {
    DRF: ['atendimento_instrucao', 'diligencias', 'inqueritos_remetidos', 'medidas_cautelares', 'fios_sucata', 'valores_apreendidos', 'relatorios', 'inqueritos_concluidos'],
    DRFV: ['atendimento_instrucao', 'acervo_inqueritos', 'inqueritos_remetidos', 'medidas_cautelares', 'veiculos', 'indiciamentos_flagrante', 'relatorios', 'inqueritos_concluidos'],
    DDF: ['atendimento_instrucao', 'diligencias', 'acervo_inqueritos', 'inqueritos_remetidos', 'medidas_cautelares', 'valores_apreendidos', 'relatorios', 'inqueritos_concluidos'],
    DAS: ['atendimento_instrucao', 'diligencias', 'inqueritos_remetidos', 'medidas_cautelares', 'interceptacoes', 'quebras_sigilo', 'drogas_armas', 'inqueritos_concluidos']
  };
  return (selecoes[unidade] || selecoes.DRF).slice();
}

function dashboardDepatriHeaders_() {
  return ['UNIDADE', 'NOME_UNIDADE', 'CRIME_CHAVE', 'CRIME_EXIBICAO', 'ICONE', 'ORDEM', 'ATIVO', 'CONFIG_TIPO', 'CARD_ID', 'CARD_TITULO', 'CARD_ROTULOS_JSON', 'CARD_METRICAS_JSON'];
}

function garantirAbaDashboardDepatriConfig_() {
  var ss = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var aba = ss.getSheetByName(DASHBOARD_DEPATRI_CONFIG_SHEET);
  var headers = dashboardDepatriHeaders_();

  if (!aba) {
    aba = ss.insertSheet(DASHBOARD_DEPATRI_CONFIG_SHEET);
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);
    aba.setFrozenRows(1);
  }

  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);
    aba.setFrozenRows(1);
  }

  var headerAtual = aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), headers.length)).getValues()[0];
  headers.forEach(function(h) {
    if (headerAtual.indexOf(h) === -1) {
      aba.getRange(1, aba.getLastColumn() + 1).setValue(h);
      headerAtual.push(h);
    }
  });

  inserirPadraoDashboardDepatriSeNecessario_(aba);
  return aba;
}

function inserirPadraoDashboardDepatriSeNecessario_(aba) {
  var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var idxUnidade = headers.indexOf('UNIDADE');
  var idxCrime = headers.indexOf('CRIME_CHAVE');
  var idxConfigTipo = headers.indexOf('CONFIG_TIPO');
  var idxCardId = headers.indexOf('CARD_ID');
  var existentesCrimes = {};
  var existentesCards = {};

  if (aba.getLastRow() > 1 && idxUnidade > -1 && idxCrime > -1) {
    var dados = aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues();
    dados.forEach(function(row) {
      var unidade = normalizarDashboard_(row[idxUnidade]);
      var cardId = idxCardId > -1 ? String(row[idxCardId] || '').trim() : '';
      var configTipo = idxConfigTipo > -1 ? normalizarDashboard_(row[idxConfigTipo]) : '';
      if (cardId || configTipo === 'PRODUTIVIDADE_CARD') {
        existentesCards[unidade + '::' + cardId] = true;
      } else {
        existentesCrimes[unidade + '::' + normalizarDashboard_(row[idxCrime])] = true;
      }
    });
  }

  var cfg = dashboardDepatriConfigPadrao_();
  var linhas = [];
  Object.keys(cfg).forEach(function(unidade) {
    if (unidade === 'GERAL') return;
    (cfg[unidade].crimes || []).forEach(function(crime) {
      var chave = normalizarDashboard_(unidade) + '::' + normalizarDashboard_(crime.crimeChave);
      if (existentesCrimes[chave]) return;
      var linhaCrime = new Array(headers.length).fill('');
      linhaCrime[idxUnidade] = unidade;
      linhaCrime[headers.indexOf('NOME_UNIDADE')] = cfg[unidade].nome;
      linhaCrime[idxCrime] = crime.crimeChave;
      linhaCrime[headers.indexOf('CRIME_EXIBICAO')] = crime.crimeExibicao || crime.crimeChave;
      linhaCrime[headers.indexOf('ICONE')] = crime.icone || 'fa-chart-column';
      linhaCrime[headers.indexOf('ORDEM')] = crime.ordem || 1;
      linhaCrime[headers.indexOf('ATIVO')] = crime.ativo !== false ? 'SIM' : 'NÃO';
      linhas.push(linhaCrime);
    });
  });

  var mapaCatalogo = dashboardProdutividadeMapaCatalogo_();
  dashboardProdutividadeUnidades_().forEach(function(unidade) {
    dashboardProdutividadeSelecaoPadrao_(unidade).forEach(function(cardId, pos) {
      var chave = normalizarDashboard_(unidade) + '::' + cardId;
      if (existentesCards[chave]) return;
      var card = mapaCatalogo[cardId];
      if (!card) return;
      var linhaCard = new Array(headers.length).fill('');
      linhaCard[idxUnidade] = unidade;
      linhaCard[headers.indexOf('NOME_UNIDADE')] = cfg[unidade].nome;
      linhaCard[headers.indexOf('ICONE')] = card.icone;
      linhaCard[headers.indexOf('ORDEM')] = pos + 1;
      linhaCard[headers.indexOf('ATIVO')] = 'SIM';
      linhaCard[idxConfigTipo] = 'PRODUTIVIDADE_CARD';
      linhaCard[idxCardId] = card.id;
      linhaCard[headers.indexOf('CARD_TITULO')] = card.titulo;
      linhas.push(linhaCard);
    });
  });

  if (linhas.length) {
    aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
  }
}

function obterConfigDashboardDepatriDaPlanilha_() {
  var padrao = dashboardDepatriConfigPadrao_();
  var aba = garantirAbaDashboardDepatriConfig_();
  var dados = aba.getDataRange().getValues();
  var headers = dados[0] || [];

  var idxUnidade = headers.indexOf('UNIDADE');
  var idxNome = headers.indexOf('NOME_UNIDADE');
  var idxChave = headers.indexOf('CRIME_CHAVE');
  var idxExibicao = headers.indexOf('CRIME_EXIBICAO');
  var idxIcone = headers.indexOf('ICONE');
  var idxOrdem = headers.indexOf('ORDEM');
  var idxAtivo = headers.indexOf('ATIVO');
  var idxConfigTipo = headers.indexOf('CONFIG_TIPO');
  var idxCardId = headers.indexOf('CARD_ID');
  var idxCardTitulo = headers.indexOf('CARD_TITULO');
  var idxCardRotulos = headers.indexOf('CARD_ROTULOS_JSON');
  var idxCardMetricas = headers.indexOf('CARD_METRICAS_JSON');

  var retorno = JSON.parse(JSON.stringify(padrao));
  Object.keys(retorno).forEach(function(k) {
    if (k !== 'GERAL') {
      retorno[k].crimes = [];
      retorno[k].cards = [];
    }
  });

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    var unidade = String(row[idxUnidade] || '').trim();
    if (!unidade || !retorno[unidade]) continue;

    var ativoTxt = normalizarDashboard_(row[idxAtivo]);
    retorno[unidade].nome = String(row[idxNome] || '').trim() || retorno[unidade].nome;
    var cardId = idxCardId > -1 ? String(row[idxCardId] || '').trim() : '';
    var configTipo = idxConfigTipo > -1 ? normalizarDashboard_(row[idxConfigTipo]) : '';

    if (cardId || configTipo === 'PRODUTIVIDADE_CARD') {
      if (!cardId) continue;
      var rotulosCard = {};
      if (idxCardRotulos > -1 && String(row[idxCardRotulos] || '').trim()) {
        try {
          var rotulosLidos = JSON.parse(String(row[idxCardRotulos] || '{}'));
          if (rotulosLidos && typeof rotulosLidos === 'object' && !Array.isArray(rotulosLidos)) {
            rotulosCard = rotulosLidos;
          }
        } catch (e) {
          rotulosCard = {};
        }
      }
      var metricasSelecionadas = [];
      if (idxCardMetricas > -1 && String(row[idxCardMetricas] || '').trim()) {
        try {
          var metricasLidas = JSON.parse(String(row[idxCardMetricas] || '[]'));
          if (Array.isArray(metricasLidas)) {
            metricasSelecionadas = metricasLidas.map(function(item) {
              return {
                fonteCardId: String(item && (item.fonteCardId || item.cardId) || '').trim(),
                metricaId: String(item && (item.metricaId || item.id) || '').trim(),
                rotuloPersonalizado: ''
              };
            }).filter(function(item) {
              return !!item.fonteCardId && !!item.metricaId;
            });
          }
        } catch (e2) {
          metricasSelecionadas = [];
        }
      }
      retorno[unidade].cards.push({
        id: cardId,
        titulo: idxCardTitulo > -1 ? String(row[idxCardTitulo] || '').trim() : '',
        rotulos: rotulosCard,
        metricasSelecionadas: metricasSelecionadas,
        icone: String(row[idxIcone] || '').trim() || 'fa-chart-column',
        ordem: Number(row[idxOrdem] || 999) || 999,
        ativo: !(ativoTxt === 'NAO' || ativoTxt === 'NÃO' || ativoTxt === 'FALSE' || ativoTxt === '0' || ativoTxt === 'INATIVO')
      });
      continue;
    }

    var crimeChave = String(row[idxChave] || '').trim();
    if (!crimeChave) continue;
    retorno[unidade].crimes.push({
      crimeChave: crimeChave,
      crimeExibicao: String(row[idxExibicao] || '').trim() || crimeChave,
      icone: String(row[idxIcone] || '').trim() || 'fa-chart-column',
      ordem: Number(row[idxOrdem] || 999) || 999,
      ativo: !(ativoTxt === 'NAO' || ativoTxt === 'NÃO' || ativoTxt === 'FALSE' || ativoTxt === '0' || ativoTxt === 'INATIVO')
    });
  }

  Object.keys(retorno).forEach(function(k) {
    retorno[k].crimes = (retorno[k].crimes || []).sort(function(a, b) {
      return (Number(a.ordem) || 999) - (Number(b.ordem) || 999);
    });
    retorno[k].cards = (retorno[k].cards || []).filter(function(card) {
      return card.ativo !== false;
    }).sort(function(a, b) {
      return (Number(a.ordem) || 999) - (Number(b.ordem) || 999);
    });
  });

  return retorno;
}

function obterDashboardDepatriConfig(usuarioLogin) {
  var usuario = validarAcessoDashboard_(usuarioLogin);
  var config = obterConfigDashboardDepatriDaPlanilha_();
  var podeEditar = dashboardDepatriPodeConfigurar_(usuario);

  var visoes = [];
  visoes.push({ chave: 'GERAL', nome: config.GERAL.nome });
  var chavesVisiveis = ['DRFV', 'DRF', 'DAS', 'DDF', 'MEU_CELULAR'];
  if (usuario._classeDashboard === 'PROPRIA') {
    chavesVisiveis = chavesVisiveis.filter(function(chave) {
      return linhaPertenceUnidadeDashboardDepatri_({ DELEGACIA: usuario._delegaciaDashboard }, chave, config[chave]);
    });
  }
  chavesVisiveis.forEach(function(chave) {
    visoes.push({ chave: chave, nome: config[chave].nome });
  });

  return {
    podeEditar: podeEditar,
    visoes: visoes,
    config: config,
    catalogoCards: dashboardProdutividadeCatalogo_(),
    maximoCards: 8
  };
}

function salvarDashboardDepatriConfig(usuarioLogin, payload) {
  var usuario = obterUsuarioDashboard_(usuarioLogin);
  if (!dashboardDepatriPodeConfigurar_(usuario)) {
    throw new Error('Apenas a DIREÇÃO ou o ADMIN podem editar os cards do Painel DEPATRI.');
  }

  payload = payload || {};
  var unidade = String(payload.unidade || '').trim();
  var padrao = dashboardDepatriConfigPadrao_();
  if (!unidade || !padrao[unidade] || unidade === 'GERAL') {
    throw new Error('Unidade inválida para edição.');
  }

  var aba = garantirAbaDashboardDepatriConfig_();
  var dados = aba.getDataRange().getValues();
  var headers = dados[0] || [];
  var idxUnidade = headers.indexOf('UNIDADE');
  var idxNome = headers.indexOf('NOME_UNIDADE');
  var idxChave = headers.indexOf('CRIME_CHAVE');
  var idxExibicao = headers.indexOf('CRIME_EXIBICAO');
  var idxIcone = headers.indexOf('ICONE');
  var idxOrdem = headers.indexOf('ORDEM');
  var idxAtivo = headers.indexOf('ATIVO');
  var idxConfigTipo = headers.indexOf('CONFIG_TIPO');
  var idxCardId = headers.indexOf('CARD_ID');
  var idxCardTitulo = headers.indexOf('CARD_TITULO');
  var idxCardRotulos = headers.indexOf('CARD_ROTULOS_JSON');
  var idxCardMetricas = headers.indexOf('CARD_METRICAS_JSON');

  if (dashboardProdutividadeUnidades_().indexOf(unidade) > -1) {
    var catalogo = dashboardProdutividadeMapaCatalogo_();
    var catalogoMetricas = dashboardProdutividadeMetricasMapa_();
    var selecionados = [];
    var vistos = {};
    (payload.cards || []).forEach(function(card) {
      var cardId = String(card.cardId || card.id || '').trim();
      if (!cardId) return;
      if (!catalogo[cardId]) throw new Error('Card de produtividade inválido: ' + cardId);
      if (vistos[cardId]) throw new Error('O mesmo card não pode ocupar duas posições.');
      vistos[cardId] = true;
      var itemCatalogo = catalogo[cardId];
      var tituloPersonalizado = String(card.titulo || '').trim().slice(0, 100) || itemCatalogo.titulo;
      var rotulosRecebidos = card.rotulos && typeof card.rotulos === 'object' ? card.rotulos : {};
      var rotulosValidados = {};
      (itemCatalogo.metricas || []).forEach(function(metricaCatalogo) {
        var rotulo = String(rotulosRecebidos[metricaCatalogo.id] || '').trim().slice(0, 100);
        if (rotulo) rotulosValidados[metricaCatalogo.id] = rotulo;
      });
      var metricasValidadas = null;
      if (Array.isArray(card.metricasSelecionadas)) {
        metricasValidadas = [];
        card.metricasSelecionadas.forEach(function(selecao) {
          var fonteCardId = String(selecao && (selecao.fonteCardId || selecao.cardId) || '').trim();
          var metricaId = String(selecao && (selecao.metricaId || selecao.id) || '').trim();
          var chaveMetrica = fonteCardId + '::' + metricaId;
          if (!catalogoMetricas[chaveMetrica]) {
            throw new Error('Contador de produtividade inválido: ' + chaveMetrica);
          }
          metricasValidadas.push({
            fonteCardId: fonteCardId,
            metricaId: metricaId,
            rotuloPersonalizado: ''
          });
        });
        if (!metricasValidadas.length) throw new Error('Cada card deve manter pelo menos um contador.');
        if (metricasValidadas.length > 12) throw new Error('Cada card pode ter no máximo 12 contadores.');
      }
      selecionados.push({
        id: cardId,
        titulo: tituloPersonalizado,
        rotulos: rotulosValidados,
        metricasSelecionadas: metricasValidadas
      });
    });

    if (!selecionados.length) throw new Error('Selecione pelo menos um card para a unidade.');
    if (selecionados.length > 8) throw new Error('É permitido selecionar no máximo 8 cards.');

    var mapaLinhasCards = {};
    for (var c = 1; c < dados.length; c++) {
      var rowCard = dados[c];
      var mesmaUnidade = normalizarDashboard_(rowCard[idxUnidade]) === normalizarDashboard_(unidade);
      var cardIdExistente = String(rowCard[idxCardId] || '').trim();
      var tipoExistente = normalizarDashboard_(rowCard[idxConfigTipo]);
      if (!mesmaUnidade || (!cardIdExistente && tipoExistente !== 'PRODUTIVIDADE_CARD')) continue;
      rowCard[idxAtivo] = 'NÃO';
      if (cardIdExistente) mapaLinhasCards[cardIdExistente] = c;
    }

    var novasLinhas = [];
    var nomeUnidadeProd = String(payload.nome || '').trim() || padrao[unidade].nome;
    selecionados.forEach(function(cardSelecionado, pos) {
      var cardId = cardSelecionado.id;
      var itemCatalogo = catalogo[cardId];
      var idxLinha = mapaLinhasCards[cardId];
      var linhaCard = idxLinha ? dados[idxLinha] : new Array(headers.length).fill('');
      linhaCard[idxUnidade] = unidade;
      linhaCard[idxNome] = nomeUnidadeProd;
      linhaCard[idxChave] = '';
      linhaCard[idxExibicao] = '';
      linhaCard[idxIcone] = itemCatalogo.icone;
      linhaCard[idxOrdem] = pos + 1;
      linhaCard[idxAtivo] = 'SIM';
      linhaCard[idxConfigTipo] = 'PRODUTIVIDADE_CARD';
      linhaCard[idxCardId] = cardId;
      linhaCard[idxCardTitulo] = cardSelecionado.titulo || itemCatalogo.titulo;
      linhaCard[idxCardRotulos] = JSON.stringify(cardSelecionado.rotulos || {});
      if (idxCardMetricas > -1 && cardSelecionado.metricasSelecionadas !== null) {
        linhaCard[idxCardMetricas] = JSON.stringify(cardSelecionado.metricasSelecionadas);
      }
      if (!idxLinha) novasLinhas.push(linhaCard);
    });

    if (dados.length > 1) {
      aba.getRange(2, 1, dados.length - 1, headers.length).setValues(dados.slice(1));
    }
    if (novasLinhas.length) {
      aba.getRange(aba.getLastRow() + 1, 1, novasLinhas.length, headers.length).setValues(novasLinhas);
    }
    return { sucesso: true, mensagem: 'Cards de produtividade atualizados para ' + unidade + '.' };
  }

  var mapaLinha = {};
  for (var i = 1; i < dados.length; i++) {
    var chave = normalizarDashboard_(dados[i][idxUnidade]) + '::' + normalizarDashboard_(dados[i][idxChave]);
    mapaLinha[chave] = i + 1;
  }

  var nomeUnidade = String(payload.nome || '').trim() || padrao[unidade].nome;
  var cards = payload.cards || [];
  cards.forEach(function(card, pos) {
    var crimeChave = String(card.crimeChave || '').trim();
    if (!crimeChave) return;

    var chaveMapa = normalizarDashboard_(unidade) + '::' + normalizarDashboard_(crimeChave);
    var linhaReal = mapaLinha[chaveMapa];
    var linha = new Array(headers.length).fill('');

    if (linhaReal) {
      linha = aba.getRange(linhaReal, 1, 1, headers.length).getValues()[0];
    }

    linha[idxUnidade] = unidade;
    linha[idxNome] = nomeUnidade;
    linha[idxChave] = crimeChave;
    linha[idxExibicao] = String(card.crimeExibicao || '').trim() || crimeChave;
    linha[idxIcone] = String(card.icone || '').trim() || 'fa-chart-column';
    linha[idxOrdem] = Number(card.ordem || (pos + 1)) || (pos + 1);
    linha[idxAtivo] = card.ativo === false ? 'NÃO' : 'SIM';

    if (linhaReal) {
      aba.getRange(linhaReal, 1, 1, headers.length).setValues([linha]);
    } else {
      aba.appendRow(linha);
    }
  });

  return { sucesso: true, mensagem: 'Configuração do Painel DEPATRI atualizada.' };
}

function periodoAtualAnteriorDashboardDepatri_(mes, ano) {
  var anoAtual = String(ano || '').trim();
  var mesNorm = normalizarDashboard_(mes || '');
  var idxMes = mesNorm ? DASHBOARD_CFG.MONTHS.map(normalizarDashboard_).indexOf(mesNorm) : -1;
  var mesSelecionado = idxMes > -1 ? DASHBOARD_CFG.MONTHS[idxMes] : '';

  if (!anoAtual) {
    return {
      atual: { ano: '', mes: mesSelecionado },
      anterior: null,
      tipo: mesSelecionado ? 'MES_TODOS_ANOS' : 'TODOS_ANOS',
      comparativoDisponivel: false
    };
  }

  return {
    atual: { ano: anoAtual, mes: mesSelecionado },
    anterior: { ano: String(Number(anoAtual) - 1), mes: mesSelecionado },
    tipo: mesSelecionado ? 'MES' : 'ANO',
    comparativoDisponivel: true
  };
}


// Regra temporal exclusiva da DRF:
// - com ano selecionado: compara o período com o mesmo período do ano anterior;
// - com Ano = Todos: soma todos os anos disponíveis e não cria comparação,
//   evitando repetir o ano corrente ou comparar um acumulado misto com um único ano.
function periodoDrfMesmoPeriodoAnoAnterior_(mes, ano) {
  var anoSelecionado = String(ano || '').trim();
  var mesNorm = normalizarDashboard_(mes || '');
  var idxMes = mesNorm ? DASHBOARD_CFG.MONTHS.map(normalizarDashboard_).indexOf(mesNorm) : -1;
  var mesSelecionado = idxMes > -1 ? DASHBOARD_CFG.MONTHS[idxMes] : '';

  if (!anoSelecionado) {
    return {
      atual: { ano: '', mes: mesSelecionado },
      anterior: null,
      tipo: mesSelecionado ? 'MES_TODOS_ANOS' : 'TODOS_ANOS',
      comparativoDisponivel: false
    };
  }

  return {
    atual: { ano: anoSelecionado, mes: mesSelecionado },
    anterior: { ano: String(Number(anoSelecionado) - 1), mes: mesSelecionado },
    tipo: mesSelecionado ? 'MES' : 'ANO',
    comparativoDisponivel: true
  };
}

function linhaPeriodoDashboardDepatri_(row, periodo) {
  var anoBruto = row.ANO_REFERENCIA;
  var anoNumero = numeroDashboard_(anoBruto);
  var ano = anoNumero ? String(Math.trunc(anoNumero)) : String(anoBruto || '').replace(/\.0+$/, '').trim();
  var mes = normalizarDashboard_(row.MES || '');

  if (periodo.ano && ano !== String(periodo.ano)) return false;
  if (periodo.mes && mes !== normalizarDashboard_(periodo.mes)) return false;
  return true;
}

function indiceMesDashboardDepatri_(mes) {
  var mesNorm = normalizarDashboard_(mes || '');
  return DASHBOARD_CFG.MONTHS.map(normalizarDashboard_).indexOf(mesNorm);
}

function indiceMesLinhaProdutividadeDashboard_(row) {
  return indiceMesDashboardDepatri_(row && (row.MES || row['MÊS']) || '');
}

function indiceMesLinhaPrisaoDashboard_(row) {
  var data = dataDashboard_(row && row.DATA);
  if (data) return data.getMonth();
  return indiceMesDashboardDepatri_(row && (row['MÊS'] || row.MES) || '');
}

function ultimoMesInformadoDashboard_(rows, obterIndiceMes) {
  return (rows || []).reduce(function(maior, row) {
    var indice = obterIndiceMes(row);
    return indice > maior ? indice : maior;
  }, -1);
}

function limitarLinhasAteMesDashboard_(rows, indiceLimite, obterIndiceMes) {
  if (indiceLimite < 0) return (rows || []).slice();
  return (rows || []).filter(function(row) {
    var indice = obterIndiceMes(row);
    return indice > -1 && indice <= indiceLimite;
  });
}

function rotuloPeriodoAcumuladoDashboard_(indiceLimite, ano) {
  if (indiceLimite < 0) return '';
  var mesFinal = DASHBOARD_CFG.MONTHS[indiceLimite] || '';
  if (indiceLimite === 0) return 'JANEIRO DE ' + ano;
  return 'JANEIRO A ' + mesFinal + ' DE ' + ano;
}

function linhaPertenceUnidadeDashboardDepatri_(row, unidadeKey, configUnidade) {
  var base = normalizarDashboard_(row.DELEGACIA || row.UNIDADE || row.UNIDADE_RESPONSAVEL || '');
  if (!base) return false;

  var aliases = [unidadeKey].concat((configUnidade && configUnidade.aliases) || []);
  return aliases.some(function(alias) {
    var a = normalizarDashboard_(alias);
    if (!a) return false;
    if (base === a) return true;

    // Siglas curtas precisam coincidir como palavra inteira. Isso impede, por
    // exemplo, que DRF seja confundida com DRFV.
    if (/^[A-Z0-9_]{2,8}$/.test(a)) {
      var escapado = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|[^A-Z0-9])' + escapado + '([^A-Z0-9]|$)').test(base);
    }

    return base.indexOf(a) > -1 || a.indexOf(base) > -1;
  });
}

function linhaNaoContabilizadaDashboardDepatri_(row) {
  var txt = normalizarDashboard_(row.NAO_CONTABILIZADO || row['NÃO_CONTABILIZADO'] || row.NC || '');
  return txt === 'TRUE' || txt === 'SIM' || txt === '1' || txt === 'NC';
}

function obterTextosCrimeLinhaDashboardDepatri_(row) {
  return [
    row.CRIME,
    row.TIPO_CRIME,
    row.TIPO_DE_PRODUTIVIDADE,
    row.SUBTIPO,
    row.MODALIDADE,
    row.DESCRICAO,
    [row.CRIME || '', row.SUBTIPO || '', row.MODALIDADE || '', row.TIPO_DE_PRODUTIVIDADE || ''].join(' ')
  ].map(function(v) { return normalizarDashboard_(v); }).filter(Boolean);
}

function crimeGenericoDashboardDepatri_(crimeNorm) {
  return ['ROUBO', 'FURTO'].indexOf(crimeNorm) > -1;
}

function equivaleCrimeDashboardDepatri_(row, crimeChave) {
  var chave = normalizarDashboard_(crimeChave);
  if (!chave) return false;

  var crimeLinha = normalizarDashboard_(row.CRIME || '');
  if (crimeLinha) {
    if (crimeLinha === chave) return true;
    if (!crimeGenericoDashboardDepatri_(chave) && (crimeLinha.indexOf(chave) > -1 || chave.indexOf(crimeLinha) > -1)) return true;
  }

  var textos = obterTextosCrimeLinhaDashboardDepatri_(row);

  if (chave === 'RECUPERACAO DE APARELHO CELULAR') {
    return textos.some(function(t) {
      return t === chave || t.indexOf('APARELHOS CELULARES RECUPERADOS') > -1 || t.indexOf('CELULARES RECUPERADOS') > -1;
    });
  }

  return textos.some(function(t) {
    if (t === chave) return true;
    if (crimeGenericoDashboardDepatri_(chave)) return false;
    return t.indexOf(chave) > -1 || chave.indexOf(t) > -1;
  });
}

function somarCrimesDashboardDepatri_(rows, unidadeKey, configUnidade, periodo, crimes) {
  var totais = {};
  (crimes || []).forEach(function(c) { totais[normalizarDashboard_(c.crimeChave)] = 0; });

  (rows || []).forEach(function(row) {
    if (linhaNaoContabilizadaDashboardDepatri_(row)) return;
    if (!linhaPeriodoDashboardDepatri_(row, periodo)) return;
    if (!linhaPertenceUnidadeDashboardDepatri_(row, unidadeKey, configUnidade)) return;

    var qtd = numeroDashboard_(row.QUANTIDADE);
    if (qtd <= 0) qtd = 1;

    (crimes || []).forEach(function(c) {
      var chave = normalizarDashboard_(c.crimeChave);
      if (equivaleCrimeDashboardDepatri_(row, c.crimeChave)) {
        totais[chave] += qtd;
      }
    });
  });

  return totais;
}


// ============================================================================
// PAINEL ESPECÍFICO DA DRF — PRODUTIVIDADE E TOTAL DE PRISÕES
// ============================================================================

function deduplicarProdutividadeDashboardDepatri_(rows) {
  var vistos = {};
  return (rows || []).filter(function(row) {
    var chaves = Object.keys(row || {}).filter(function(chave) {
      return normalizarDashboard_(chave) !== 'DATA_HORA';
    }).sort();

    var assinatura = chaves.map(function(chave) {
      var valor = row[chave];
      if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
        valor = Utilities.formatDate(valor, 'America/Fortaleza', 'yyyy-MM-dd HH:mm:ss');
      }
      return normalizarDashboard_(chave) + '=' + String(valor === null || valor === undefined ? '' : valor).trim();
    }).join('\u001f');

    if (vistos[assinatura]) return false;
    vistos[assinatura] = true;
    return true;
  });
}

function filtrarPeriodoUnidadeDashboardDepatri_(rows, periodo, unidadeKey, configUnidade) {
  return (rows || []).filter(function(row) {
    if (linhaNaoContabilizadaDashboardDepatri_(row)) return false;
    if (!linhaPeriodoDashboardDepatri_(row, periodo)) return false;
    return linhaPertenceUnidadeDashboardDepatri_(row, unidadeKey, configUnidade);
  });
}

function filtrarPeriodoUnidadeDrfDashboard_(rows, periodo, configUnidade) {
  return filtrarPeriodoUnidadeDashboardDepatri_(rows, periodo, 'DRF', configUnidade);
}

function tipoProdutividadeIgualDrfDashboard_(row, tipo) {
  return normalizarDashboard_(row && row.TIPO_DE_PRODUTIVIDADE) === normalizarDashboard_(tipo);
}

function somarQuantidadeTiposDrfDashboard_(rows, tipos) {
  var mapa = {};
  (tipos || []).forEach(function(tipo) { mapa[normalizarDashboard_(tipo)] = true; });

  return somarDashboard_((rows || []).filter(function(row) {
    return !!mapa[normalizarDashboard_(row.TIPO_DE_PRODUTIVIDADE)];
  }), function(row) {
    return row.QUANTIDADE;
  });
}

function somarValorTiposDrfDashboard_(rows, tipos) {
  var mapa = {};
  (tipos || []).forEach(function(tipo) { mapa[normalizarDashboard_(tipo)] = true; });

  return somarDashboard_((rows || []).filter(function(row) {
    return !!mapa[normalizarDashboard_(row.TIPO_DE_PRODUTIVIDADE)];
  }), function(row) {
    var valorRs = numeroDashboard_(row.VALOR_RS);
    return valorRs !== 0 ? valorRs : numeroDashboard_(row.VALOR_EM_ESPECIE);
  });
}

function somarQuantidadePorPrioridadeDrfDashboard_(rows, gruposPrioridade) {
  var gruposPeriodo = {};

  (rows || []).forEach(function(row) {
    var anoNumero = numeroDashboard_(row.ANO_REFERENCIA);
    var ano = anoNumero ? String(Math.trunc(anoNumero)) : String(row.ANO_REFERENCIA || '').replace(/\.0+$/, '').trim();
    var chavePeriodo = ano + '::' + normalizarDashboard_(row.MES || '');
    if (!gruposPeriodo[chavePeriodo]) gruposPeriodo[chavePeriodo] = [];
    gruposPeriodo[chavePeriodo].push(row);
  });

  return Object.keys(gruposPeriodo).reduce(function(total, chavePeriodo) {
    var linhasPeriodo = gruposPeriodo[chavePeriodo];

    for (var i = 0; i < (gruposPrioridade || []).length; i++) {
      var aliases = gruposPrioridade[i] || [];
      var mapa = {};
      aliases.forEach(function(tipo) { mapa[normalizarDashboard_(tipo)] = true; });

      var encontrados = linhasPeriodo.filter(function(row) {
        return !!mapa[normalizarDashboard_(row.TIPO_DE_PRODUTIVIDADE)];
      });

      if (encontrados.length) {
        return total + somarDashboard_(encontrados, function(row) { return row.QUANTIDADE; });
      }
    }

    return total;
  }, 0);
}

function calcularIpsConcluidosDrfDashboard_(rows) {
  var retorno = { comAutoria: 0, semAutoria: 0 };

  (rows || []).forEach(function(row) {
    if (normalizarDashboard_(row.PRODUTIVIDADE) !== 'INQUERITO') return;
    if (!aliasContemDashboard_(row.TIPO_DE_PRODUTIVIDADE, ['INQUERITO CONCLUIDO', 'INQUÉRITO CONCLUÍDO'])) return;

    var autoria = normalizarDashboard_(row.INQ_AUTORIA);
    var origem = normalizarDashboard_(row.INQ_ORIGEM);
    var qtd = numeroDashboard_(row.QUANTIDADE);

    if (autoria.indexOf('SEM AUTORIA') > -1) {
      retorno.semAutoria += qtd;
    } else if (autoria.indexOf('COM AUTORIA') > -1 || origem === 'FLAGRANTE') {
      // Inquéritos oriundos de flagrante possuem autoria conhecida e entram em COM AUTORIA.
      retorno.comAutoria += qtd;
    }
  });

  return retorno;
}

function calcularVeiculosRecuperadosDrfDashboard_(rows) {
  var registros = (rows || []).filter(function(row) {
    return tipoProdutividadeIgualDrfDashboard_(row, 'VEÍCULOS RECUPERADOS');
  });

  var gruposPeriodo = {};
  registros.forEach(function(row) {
    var anoNumero = numeroDashboard_(row.ANO_REFERENCIA);
    var ano = anoNumero ? String(Math.trunc(anoNumero)) : String(row.ANO_REFERENCIA || '').replace(/\.0+$/, '').trim();
    var chavePeriodo = ano + '::' + normalizarDashboard_(row.MES || '');
    if (!gruposPeriodo[chavePeriodo]) gruposPeriodo[chavePeriodo] = [];
    gruposPeriodo[chavePeriodo].push(row);
  });

  var quantidade = Object.keys(gruposPeriodo).reduce(function(total, chavePeriodo) {
    var linhasPeriodo = gruposPeriodo[chavePeriodo];
    var consolidados = linhasPeriodo.filter(function(row) {
      return !String(row.MARCA || '').trim() &&
        !String(row.MODELO || '').trim() &&
        !String(row.TIPO_DO_VEÍCULO || '').trim() &&
        numeroDashboard_(row.VALOR_RS) === 0;
    });
    var baseQuantidade = consolidados.length ? consolidados : linhasPeriodo;
    return total + somarDashboard_(baseQuantidade, function(row) { return row.QUANTIDADE; });
  }, 0);

  var valor = somarDashboard_(registros, function(row) { return row.VALOR_RS; });
  return { quantidade: quantidade, valor: valor };
}

function montarMetricaDrfDashboard_(id, rotulo, atual, anterior, tipo) {
  var evolucao = calcularEvolucaoDashboardDepatri_(atual, anterior);
  return {
    id: id,
    rotulo: rotulo,
    valor: Number(atual || 0),
    valorAnterior: Number(anterior || 0),
    tipo: tipo || 'numero',
    temComparativo: evolucao !== null,
    evolucao: evolucao
  };
}

function montarCardsDrfDashboard_(rowsAtual, rowsAnterior) {
  var ipAtual = calcularIpsConcluidosDrfDashboard_(rowsAtual);
  var ipAnterior = calcularIpsConcluidosDrfDashboard_(rowsAnterior);

  var indFlagPrioridade = [
    ['INDICIAMENTO EM INQUÉRITO - POR FLAGRANTE - CRIMES PATRIMONIAIS'],
    ['QUANTIDADE DE INDICIAMENTO EM INQUÉRITOS - POR FLAGRANTE'],
    ['INDICIAMENTO EM INQUÉRITOS - POR FLAGRANTE']
  ];
  var indPortPrioridade = [
    ['INDICIAMENTO EM INQUÉRITO - POR PORTARIA - CRIMES PATRIMONIAIS'],
    ['QUANTIDADE DE INDICIAMENTO EM INQUÉRITOS - POR PORTARIA'],
    ['INDICIAMENTO EM INQUÉRITOS - POR PORTARIA']
  ];
  var repPrisaoPrioridade = [
    ['REPRESENTAÇÕES POR PRISÕES CAUTELARES - CVP'],
    ['PRISÃO CAUTELAR']
  ];
  var repBuscaPrioridade = [
    ['REPRESENTAÇÕES POR MANDADOS DE BUSCA E APREENSÃO'],
    ['BUSCA E APREENSÃO']
  ];

  var veicAtual = calcularVeiculosRecuperadosDrfDashboard_(rowsAtual);
  var veicAnterior = calcularVeiculosRecuperadosDrfDashboard_(rowsAnterior);

  return [
    {
      id: 'ip_concluidos',
      titulo: 'IP CONCLUÍDOS',
      icone: 'fa-folder-check',
      metricas: [
        montarMetricaDrfDashboard_('ip_com_autoria', 'COM AUTORIA', ipAtual.comAutoria, ipAnterior.comAutoria, 'numero'),
        montarMetricaDrfDashboard_('ip_sem_autoria', 'SEM AUTORIA', ipAtual.semAutoria, ipAnterior.semAutoria, 'numero')
      ]
    },
    {
      id: 'oitivas',
      titulo: 'OITIVAS REALIZADAS',
      icone: 'fa-comments',
      metricas: [
        montarMetricaDrfDashboard_('oitivas_total', 'TOTAL',
          somarQuantidadeTiposDrfDashboard_(rowsAtual, ['QUANTIDADE DE OITIVAS REALIZADAS']),
          somarQuantidadeTiposDrfDashboard_(rowsAnterior, ['QUANTIDADE DE OITIVAS REALIZADAS']), 'numero')
      ]
    },
    {
      id: 'fios',
      titulo: 'FIOS APREENDIDOS',
      icone: 'fa-bolt',
      metricas: [
        montarMetricaDrfDashboard_('fios_peso', 'PESO',
          somarQuantidadeTiposDrfDashboard_(rowsAtual, ['FIOS E RELACIONADOS']),
          somarQuantidadeTiposDrfDashboard_(rowsAnterior, ['FIOS E RELACIONADOS']), 'peso'),
        montarMetricaDrfDashboard_('fios_valor', 'VALOR',
          somarValorTiposDrfDashboard_(rowsAtual, ['VALOR EM REAIS DE FIOS APREENDIDOS']),
          somarValorTiposDrfDashboard_(rowsAnterior, ['VALOR EM REAIS DE FIOS APREENDIDOS']), 'moeda')
      ]
    },
    {
      id: 'armas_municoes',
      titulo: 'APREENSÕES',
      icone: 'fa-gun',
      metricas: [
        montarMetricaDrfDashboard_('armas', 'ARMAS',
          somarQuantidadeTiposDrfDashboard_(rowsAtual, ['ARMA DE FOGO']),
          somarQuantidadeTiposDrfDashboard_(rowsAnterior, ['ARMA DE FOGO']), 'numero'),
        montarMetricaDrfDashboard_('municoes', 'MUNIÇÕES',
          somarQuantidadeTiposDrfDashboard_(rowsAtual, ['MUNIÇÕES']),
          somarQuantidadeTiposDrfDashboard_(rowsAnterior, ['MUNIÇÕES']), 'numero')
      ]
    },
    {
      id: 'indiciamentos',
      titulo: 'INDICIAMENTOS',
      icone: 'fa-gavel',
      metricas: [
        montarMetricaDrfDashboard_('ind_flagrante', 'FLAGRANTE',
          somarQuantidadePorPrioridadeDrfDashboard_(rowsAtual, indFlagPrioridade),
          somarQuantidadePorPrioridadeDrfDashboard_(rowsAnterior, indFlagPrioridade), 'numero'),
        montarMetricaDrfDashboard_('ind_portaria', 'PORTARIA',
          somarQuantidadePorPrioridadeDrfDashboard_(rowsAtual, indPortPrioridade),
          somarQuantidadePorPrioridadeDrfDashboard_(rowsAnterior, indPortPrioridade), 'numero')
      ]
    },
    {
      id: 'representacoes_dados',
      titulo: 'REPRESENTAÇÕES — DADOS',
      icone: 'fa-tower-cell',
      metricas: [
        montarMetricaDrfDashboard_('rep_interceptacao', 'INTERCEPTAÇÃO TELEFÔNICA/TELEMÁTICA',
          somarQuantidadeTiposDrfDashboard_(rowsAtual, ['REPRESENTAÇÕES DE INTERCEPTAÇÃO TELEFÔNICA E/OU TELEMÁTICA']),
          somarQuantidadeTiposDrfDashboard_(rowsAnterior, ['REPRESENTAÇÕES DE INTERCEPTAÇÃO TELEFÔNICA E/OU TELEMÁTICA']), 'numero'),
        montarMetricaDrfDashboard_('rep_quebra', 'QUEBRA DE SIGILO / EXTRAÇÃO / OUTROS',
          somarQuantidadeTiposDrfDashboard_(rowsAtual, ['QTD DE REPRESENTAÇÕES POR QUEBRA DE SIGILO - EXTRAÇÃO E OUTROS']),
          somarQuantidadeTiposDrfDashboard_(rowsAnterior, ['QTD DE REPRESENTAÇÕES POR QUEBRA DE SIGILO - EXTRAÇÃO E OUTROS']), 'numero')
      ]
    },
    {
      id: 'representacoes_cautelares',
      titulo: 'REPRESENTAÇÕES — CAUTELARES',
      icone: 'fa-scale-balanced',
      metricas: [
        montarMetricaDrfDashboard_('rep_prisao', 'PRISÃO',
          somarQuantidadePorPrioridadeDrfDashboard_(rowsAtual, repPrisaoPrioridade),
          somarQuantidadePorPrioridadeDrfDashboard_(rowsAnterior, repPrisaoPrioridade), 'numero'),
        montarMetricaDrfDashboard_('rep_busca', 'BUSCA E APREENSÃO',
          somarQuantidadePorPrioridadeDrfDashboard_(rowsAtual, repBuscaPrioridade),
          somarQuantidadePorPrioridadeDrfDashboard_(rowsAnterior, repBuscaPrioridade), 'numero')
      ]
    },
    {
      id: 'veiculos',
      titulo: 'VEÍCULOS',
      icone: 'fa-car-side',
      metricas: [
        montarMetricaDrfDashboard_('veiculos_recuperados', 'RECUPERADOS',
          veicAtual.quantidade, veicAnterior.quantidade, 'numero'),
        montarMetricaDrfDashboard_('valor_veiculos_recuperados', 'VALOR DOS RECUPERADOS',
          veicAtual.valor, veicAnterior.valor, 'moeda'),
        montarMetricaDrfDashboard_('veiculos_apreendidos', 'APREENDIDOS',
          somarQuantidadeTiposDrfDashboard_(rowsAtual, ['VEÍCULOS APREENDIDOS']),
          somarQuantidadeTiposDrfDashboard_(rowsAnterior, ['VEÍCULOS APREENDIDOS']), 'numero')
      ]
    }
  ];
}

function linhasTiposProdutividadeDashboard_(rows, tipos) {
  var mapa = {};
  (tipos || []).forEach(function(tipo) { mapa[normalizarDashboard_(tipo)] = true; });
  return (rows || []).filter(function(row) {
    return !!mapa[normalizarDashboard_(row.TIPO_DE_PRODUTIVIDADE)];
  });
}

function somarQuantidadeTiposProdutividadeDashboard_(rows, tipos) {
  return somarDashboard_(linhasTiposProdutividadeDashboard_(rows, tipos), function(row) {
    return row.QUANTIDADE;
  });
}

function somarValorTiposProdutividadeDashboard_(rows, tipos, coluna) {
  return somarDashboard_(linhasTiposProdutividadeDashboard_(rows, tipos), function(row) {
    return row[coluna || 'VALOR_RS'];
  });
}

function somarQuantidadeClassificadaDashboard_(rows, tipo, origem, autoria, classificacaoProcessual) {
  return somarDashboard_(linhasTiposProdutividadeDashboard_(rows, [tipo]).filter(function(row) {
    if (origem && normalizarDashboard_(row.INQ_ORIGEM) !== normalizarDashboard_(origem)) return false;
    if (autoria && normalizarDashboard_(row.INQ_AUTORIA) !== normalizarDashboard_(autoria)) return false;
    if (classificacaoProcessual) {
      var classificacao = normalizarDashboard_(row.OBS_PROCESSUAL || row.DESCRICAO_OUTROS || '');
      if (classificacao !== normalizarDashboard_(classificacaoProcessual)) return false;
    }
    return true;
  }), function(row) {
    return row.QUANTIDADE;
  });
}

function obterUltimaQuantidadeTipoDashboard_(rows, tipo) {
  var candidatas = linhasTiposProdutividadeDashboard_(rows, [tipo]).filter(function(row) {
    return row.QUANTIDADE !== '' && row.QUANTIDADE !== null && row.QUANTIDADE !== undefined;
  });
  if (!candidatas.length) return 0;

  candidatas.sort(function(a, b) {
    var dataA = a.DATA_HORA;
    var dataB = b.DATA_HORA;
    var tempoA = Object.prototype.toString.call(dataA) === '[object Date]' && !isNaN(dataA.getTime()) ? dataA.getTime() : 0;
    var tempoB = Object.prototype.toString.call(dataB) === '[object Date]' && !isNaN(dataB.getTime()) ? dataB.getTime() : 0;
    return tempoA - tempoB;
  });
  return numeroDashboard_(candidatas[candidatas.length - 1].QUANTIDADE);
}

function somarDrogasKgDashboard_(rows) {
  return linhasTiposProdutividadeDashboard_(rows, ['DROGAS']).reduce(function(total, row) {
    var qtd = numeroDashboard_(row.QUANTIDADE);
    var unidade = normalizarDashboard_(row.UNIDADE);
    if (unidade === 'GRAMAS' || unidade === 'GRAMA' || unidade === 'G') return total + (qtd / 1000);
    if (unidade === 'KG' || unidade === 'QUILOGRAMA' || unidade === 'QUILOGRAMAS') return total + qtd;
    return total;
  }, 0);
}

function montarMetricaProdutividadeDashboard_(id, rotulo, atual, anterior, tipo, temDadosAnterior) {
  var evolucao = temDadosAnterior ? calcularEvolucaoDashboardDepatri_(atual, anterior) : null;
  return {
    id: id,
    rotulo: rotulo,
    valor: Number(atual || 0),
    valorAnterior: Number(anterior || 0),
    tipo: tipo || 'numero',
    temDadosAnterior: !!temDadosAnterior,
    temComparativo: !!temDadosAnterior && evolucao !== null,
    evolucao: evolucao
  };
}

function montarCardProdutividadeDashboard_(cardId, metricas, configuracaoCard) {
  var catalogo = dashboardProdutividadeMapaCatalogo_();
  var base = catalogo[cardId] || { id: cardId, titulo: cardId, icone: 'fa-chart-column' };
  configuracaoCard = configuracaoCard || {};
  var rotulosPersonalizados = configuracaoCard.rotulos || {};
  var metricasExibicao = (metricas || []).map(function(metrica, indice) {
    var copia = {};
    Object.keys(metrica || {}).forEach(function(chave) { copia[chave] = metrica[chave]; });
    var rotuloPadrao = String(copia.rotulo || copia.id || '').trim();
    var rotuloPersonalizado = ''; // Nome vinculado à fórmula.
    if (rotuloPersonalizado) copia.rotulo = rotuloPersonalizado;
    copia.fonteCardId = cardId;
    copia.metricaId = copia.id;
    copia.slotIndex = indice;
    copia.rotuloPadrao = rotuloPadrao;
    copia.rotuloPersonalizado = rotuloPersonalizado && rotuloPersonalizado !== rotuloPadrao ? rotuloPersonalizado : '';
    return copia;
  });
  return {
    id: cardId,
    titulo: configuracaoCard.titulo || base.titulo,
    icone: configuracaoCard.icone || base.icone,
    metricas: metricasExibicao
  };
}

function montarCardProdutividadePorIdDashboard_(cardId, rowsAtual, rowsAnterior, temDadosAnterior, configuracaoCard) {
  function qtd(tipos, rows) { return somarQuantidadeTiposProdutividadeDashboard_(rows, tipos); }
  function valor(tipos, rows, coluna) { return somarValorTiposProdutividadeDashboard_(rows, tipos, coluna); }
  function metrica(id, rotulo, atual, anterior, tipo) {
    return montarMetricaProdutividadeDashboard_(id, rotulo, atual, anterior, tipo, temDadosAnterior);
  }

  var metricas = [];
  var veicAtual;
  var veicAnterior;

  switch (cardId) {
    case 'atendimento_instrucao':
      metricas = [
        metrica('bo_registrados', 'B.O. REGISTRADOS', qtd(['QUANTIDADE DE B.O. REGISTRADOS'], rowsAtual), qtd(['QUANTIDADE DE B.O. REGISTRADOS'], rowsAnterior)),
        metrica('oitivas', 'OITIVAS REALIZADAS', qtd(['QUANTIDADE DE OITIVAS REALIZADAS'], rowsAtual), qtd(['QUANTIDADE DE OITIVAS REALIZADAS'], rowsAnterior))
      ];
      break;

    case 'diligencias':
      metricas = [
        metrica('denuncias', 'DENÚNCIAS DILIGENCIADAS', qtd(['DENÚNCIAS DILIGENCIADAS'], rowsAtual), qtd(['DENÚNCIAS DILIGENCIADAS'], rowsAnterior)),
        metrica('intimacoes', 'INTIMAÇÕES REALIZADAS', qtd(['INTIMAÇÕES REALIZADAS'], rowsAtual), qtd(['INTIMAÇÕES REALIZADAS'], rowsAnterior))
      ];
      break;

    case 'acervo_inqueritos':
      metricas = [
        metrica('acervo', 'ÚLTIMO ACERVO INFORMADO', obterUltimaQuantidadeTipoDashboard_(rowsAtual, 'ACERVO DE INQUÉRITOS EM TRAMITAÇÃO'), obterUltimaQuantidadeTipoDashboard_(rowsAnterior, 'ACERVO DE INQUÉRITOS EM TRAMITAÇÃO'))
      ];
      break;

    case 'inqueritos_remetidos':
      metricas = [
        metrica('remetidos_com_relatorio', 'COM RELATÓRIO', somarQuantidadeClassificadaDashboard_(rowsAtual, 'INQUÉRITO REMETIDO À JUSTIÇA', '', '', 'COM RELATÓRIO'), somarQuantidadeClassificadaDashboard_(rowsAnterior, 'INQUÉRITO REMETIDO À JUSTIÇA', '', '', 'COM RELATÓRIO')),
        metrica('remetidos_sem_relatorio', 'SEM RELATÓRIO', somarQuantidadeClassificadaDashboard_(rowsAtual, 'INQUÉRITO REMETIDO À JUSTIÇA', '', '', 'SEM RELATÓRIO'), somarQuantidadeClassificadaDashboard_(rowsAnterior, 'INQUÉRITO REMETIDO À JUSTIÇA', '', '', 'SEM RELATÓRIO'))
      ];
      break;

    case 'medidas_cautelares':
      var prisaoPrioridade = [
        ['PRISÃO CAUTELAR'],
        ['REPRESENTAÇÕES POR PRISÕES CAUTELARES - CVP', 'REPRESENTAÇÕES POR PRISÕES CAUTELARES - ORCRIM', 'REPRESENTAÇÕES POR PRISÕES CAUTELARES - OUTROS']
      ];
      var buscaPrioridade = [
        ['BUSCA E APREENSÃO'],
        ['REPRESENTAÇÕES POR MANDADOS DE BUSCA E APREENSÃO']
      ];
      metricas = [
        metrica('mandados_busca', 'MANDADOS DE BUSCA CUMPRIDOS', qtd(['MANDADOS DE BUSCA E APREENSÃO CUMPRIDOS'], rowsAtual), qtd(['MANDADOS DE BUSCA E APREENSÃO CUMPRIDOS'], rowsAnterior)),
        metrica('prisao_cautelar', 'REPRESENTAÇÃO — PRISÃO CAUTELAR', somarQuantidadePorPrioridadeDrfDashboard_(rowsAtual, prisaoPrioridade), somarQuantidadePorPrioridadeDrfDashboard_(rowsAnterior, prisaoPrioridade)),
        metrica('busca_apreensao', 'REPRESENTAÇÃO — BUSCA E APREENSÃO', somarQuantidadePorPrioridadeDrfDashboard_(rowsAtual, buscaPrioridade), somarQuantidadePorPrioridadeDrfDashboard_(rowsAnterior, buscaPrioridade))
      ];
      break;

    case 'veiculos':
      veicAtual = calcularVeiculosRecuperadosDrfDashboard_(rowsAtual);
      veicAnterior = calcularVeiculosRecuperadosDrfDashboard_(rowsAnterior);
      metricas = [
        metrica('veiculos_recuperados', 'RECUPERADOS', veicAtual.quantidade, veicAnterior.quantidade),
        metrica('valor_veiculos', 'VALOR DOS RECUPERADOS', veicAtual.valor, veicAnterior.valor, 'moeda'),
        metrica('veiculos_apreendidos', 'APREENDIDOS', qtd(['VEÍCULOS APREENDIDOS'], rowsAtual), qtd(['VEÍCULOS APREENDIDOS'], rowsAnterior))
      ];
      break;

    case 'interceptacoes':
      metricas = [
        metrica('rep_interceptacao', 'REPRESENTAÇÕES', qtd(['REPRESENTAÇÕES DE INTERCEPTAÇÃO TELEFÔNICA E/OU TELEMÁTICA'], rowsAtual), qtd(['REPRESENTAÇÕES DE INTERCEPTAÇÃO TELEFÔNICA E/OU TELEMÁTICA'], rowsAnterior)),
        metrica('alvos_interceptacao', 'ALVOS CITADOS', qtd(['QTD DE ALVOS CITADOS EM REPRESENTAÇÕES DE INTERCEPTAÇÃO'], rowsAtual), qtd(['QTD DE ALVOS CITADOS EM REPRESENTAÇÕES DE INTERCEPTAÇÃO'], rowsAnterior))
      ];
      break;

    case 'quebras_sigilo':
      metricas = [
        metrica('rep_quebra_sigilo', 'REPRESENTAÇÕES', qtd(['QTD DE REPRESENTAÇÕES POR QUEBRA DE SIGILO - EXTRAÇÃO E OUTROS'], rowsAtual), qtd(['QTD DE REPRESENTAÇÕES POR QUEBRA DE SIGILO - EXTRAÇÃO E OUTROS'], rowsAnterior)),
        metrica('alvos_quebra_sigilo', 'ALVOS', qtd(['QTD DE ALVOS EM REPRESENTAÇÕES DE QUEBRA DE SIGILO'], rowsAtual), qtd(['QTD DE ALVOS EM REPRESENTAÇÕES DE QUEBRA DE SIGILO'], rowsAnterior))
      ];
      break;

    case 'drogas_armas':
      metricas = [
        metrica('drogas', 'DROGAS', somarDrogasKgDashboard_(rowsAtual), somarDrogasKgDashboard_(rowsAnterior), 'peso'),
        metrica('armas', 'ARMAS DE FOGO', qtd(['ARMA DE FOGO'], rowsAtual), qtd(['ARMA DE FOGO'], rowsAnterior))
      ];
      break;

    case 'fios_sucata':
      metricas = [
        metrica('fios', 'FIOS E RELACIONADOS', qtd(['FIOS E RELACIONADOS'], rowsAtual), qtd(['FIOS E RELACIONADOS'], rowsAnterior), 'peso'),
        metrica('valor_sucata', 'VALOR POR KG DE SUCATA', valor(['VALOR EM REAIS POR KG DE SUCATA'], rowsAtual, 'VALOR_RS'), valor(['VALOR EM REAIS POR KG DE SUCATA'], rowsAnterior, 'VALOR_RS'), 'moeda')
      ];
      break;

    case 'valores_apreendidos':
      metricas = [
        metrica('dinheiro_especie', 'DINHEIRO EM ESPÉCIE', valor(['DINHEIRO EM ESPÉCIE'], rowsAtual, 'VALOR_EM_ESPECIE'), valor(['DINHEIRO EM ESPÉCIE'], rowsAnterior, 'VALOR_EM_ESPECIE'), 'moeda'),
        metrica('bens_apreendidos', 'BENS APREENDIDOS/RECUPERADOS', valor(['VALOR EM BENS APREENDIDOS/RECUPERADOS'], rowsAtual, 'VALOR_RS'), valor(['VALOR EM BENS APREENDIDOS/RECUPERADOS'], rowsAnterior, 'VALOR_RS'), 'moeda'),
        metrica('valor_bloqueado', 'VALOR BLOQUEADO', valor(['VALOR EM REAIS BLOQUEADO'], rowsAtual, 'VALOR_RS'), valor(['VALOR EM REAIS BLOQUEADO'], rowsAnterior, 'VALOR_RS'), 'moeda')
      ];
      break;

    case 'indiciamentos_flagrante':
      metricas = [
        metrica('ind_flagrante_patrimonial', 'CRIMES PATRIMONIAIS', qtd(['INDICIAMENTO EM INQUÉRITO - POR FLAGRANTE - CRIMES PATRIMONIAIS'], rowsAtual), qtd(['INDICIAMENTO EM INQUÉRITO - POR FLAGRANTE - CRIMES PATRIMONIAIS'], rowsAnterior)),
        metrica('ind_flagrante_geral', 'DEMAIS INQUÉRITOS', qtd(['INDICIAMENTO EM INQUÉRITOS - POR FLAGRANTE', 'QUANTIDADE DE INDICIAMENTO EM INQUÉRITOS - POR FLAGRANTE'], rowsAtual), qtd(['INDICIAMENTO EM INQUÉRITOS - POR FLAGRANTE', 'QUANTIDADE DE INDICIAMENTO EM INQUÉRITOS - POR FLAGRANTE'], rowsAnterior))
      ];
      break;

    case 'indiciamentos_portaria':
      metricas = [
        metrica('ind_portaria_patrimonial', 'CRIMES PATRIMONIAIS', qtd(['INDICIAMENTO EM INQUÉRITO - POR PORTARIA - CRIMES PATRIMONIAIS'], rowsAtual), qtd(['INDICIAMENTO EM INQUÉRITO - POR PORTARIA - CRIMES PATRIMONIAIS'], rowsAnterior)),
        metrica('ind_portaria_geral', 'DEMAIS INQUÉRITOS', qtd(['INDICIAMENTO EM INQUÉRITOS - POR PORTARIA', 'QUANTIDADE DE INDICIAMENTO EM INQUÉRITOS - POR PORTARIA'], rowsAtual), qtd(['INDICIAMENTO EM INQUÉRITOS - POR PORTARIA', 'QUANTIDADE DE INDICIAMENTO EM INQUÉRITOS - POR PORTARIA'], rowsAnterior))
      ];
      break;

    case 'relatorios':
      metricas = [
        metrica('relatorio_tecnico', 'RELATÓRIO TÉCNICO', qtd(['RELATÓRIO TÉCNICO'], rowsAtual), qtd(['RELATÓRIO TÉCNICO'], rowsAnterior)),
        metrica('relatorio_inteligencia', 'RELATÓRIO DE INTELIGÊNCIA', qtd(['RELATÓRIO DE INTELIGÊNCIA'], rowsAtual), qtd(['RELATÓRIO DE INTELIGÊNCIA'], rowsAnterior)),
        metrica('relatorio_missao', 'RELATÓRIO DE MISSÃO', qtd(['RELATÓRIO DE MISSÃO'], rowsAtual), qtd(['RELATÓRIO DE MISSÃO'], rowsAnterior)),
        metrica('relatorio_rif', 'RIF', qtd(['RELATÓRIO DE INVESTIGAÇÃO FINANCEIRA - RIF'], rowsAtual), qtd(['RELATÓRIO DE INVESTIGAÇÃO FINANCEIRA - RIF'], rowsAnterior))
      ];
      break;

    case 'inqueritos_instaurados':
      metricas = [
        metrica('instaurados_total', 'TOTAL', qtd(['INQUÉRITO INSTAURADO'], rowsAtual), qtd(['INQUÉRITO INSTAURADO'], rowsAnterior)),
        metrica('instaurados_portaria', 'PORTARIA', somarQuantidadeClassificadaDashboard_(rowsAtual, 'INQUÉRITO INSTAURADO', 'PORTARIA'), somarQuantidadeClassificadaDashboard_(rowsAnterior, 'INQUÉRITO INSTAURADO', 'PORTARIA')),
        metrica('instaurados_flagrante', 'FLAGRANTE', somarQuantidadeClassificadaDashboard_(rowsAtual, 'INQUÉRITO INSTAURADO', 'FLAGRANTE'), somarQuantidadeClassificadaDashboard_(rowsAnterior, 'INQUÉRITO INSTAURADO', 'FLAGRANTE'))
      ];
      break;

    case 'inqueritos_concluidos':
      metricas = [
        metrica('concluidos_portaria_com_autoria', 'PORTARIA COM AUTORIA', somarQuantidadeClassificadaDashboard_(rowsAtual, 'INQUÉRITO CONCLUÍDO', 'PORTARIA', 'COM AUTORIA'), somarQuantidadeClassificadaDashboard_(rowsAnterior, 'INQUÉRITO CONCLUÍDO', 'PORTARIA', 'COM AUTORIA')),
        metrica('concluidos_portaria_sem_autoria', 'PORTARIA SEM AUTORIA', somarQuantidadeClassificadaDashboard_(rowsAtual, 'INQUÉRITO CONCLUÍDO', 'PORTARIA', 'SEM AUTORIA'), somarQuantidadeClassificadaDashboard_(rowsAnterior, 'INQUÉRITO CONCLUÍDO', 'PORTARIA', 'SEM AUTORIA')),
        metrica('concluidos_flagrante', 'FLAGRANTE', somarQuantidadeClassificadaDashboard_(rowsAtual, 'INQUÉRITO CONCLUÍDO', 'FLAGRANTE'), somarQuantidadeClassificadaDashboard_(rowsAnterior, 'INQUÉRITO CONCLUÍDO', 'FLAGRANTE'))
      ];
      break;

    default:
      return null;
  }

  return montarCardProdutividadeDashboard_(cardId, metricas, configuracaoCard);
}

function copiarMetricaProdutividadeDashboard_(metrica) {
  var copia = {};
  Object.keys(metrica || {}).forEach(function(chave) { copia[chave] = metrica[chave]; });
  return copia;
}

function aplicarSelecaoMetricasCardProdutividadeDashboard_(cardExibicao, configuracaoCard, rowsAtual, rowsAnterior, temDadosAnterior, cacheCardsFonte) {
  var selecoes = (configuracaoCard && configuracaoCard.metricasSelecionadas) || [];
  if (!cardExibicao || !selecoes.length) return cardExibicao;

  var metricasSelecionadas = selecoes.map(function(selecao, indice) {
    var fonteCardId = String(selecao.fonteCardId || '').trim();
    var metricaId = String(selecao.metricaId || '').trim();
    if (!cacheCardsFonte[fonteCardId]) {
      cacheCardsFonte[fonteCardId] = montarCardProdutividadePorIdDashboard_(
        fonteCardId,
        rowsAtual,
        rowsAnterior,
        temDadosAnterior,
        {}
      );
    }

    var cardFonte = cacheCardsFonte[fonteCardId];
    var metricaFonte = null;
    (cardFonte && cardFonte.metricas || []).some(function(metrica) {
      if (String(metrica.id || '') !== metricaId) return false;
      metricaFonte = metrica;
      return true;
    });
    if (!metricaFonte) return null;

    var copia = copiarMetricaProdutividadeDashboard_(metricaFonte);
    var rotuloPadrao = String(copia.rotuloPadrao || copia.rotulo || metricaId).trim();
    var rotuloPersonalizado = ''; // Nunca herdar o nome da posição anterior.
    copia.fonteCardId = fonteCardId;
    copia.metricaId = metricaId;
    copia.slotIndex = indice;
    copia.rotuloPadrao = rotuloPadrao;
    copia.rotuloPersonalizado = rotuloPersonalizado;
    copia.rotulo = rotuloPersonalizado || rotuloPadrao;
    return copia;
  }).filter(Boolean);

  if (metricasSelecionadas.length) cardExibicao.metricas = metricasSelecionadas;
  return cardExibicao;
}

function montarCardsProdutividadeDashboard_(rowsAtual, rowsAnterior, temDadosAnterior, unidadeKey, configUnidade) {
  var configurados = (configUnidade && configUnidade.cards) || [];
  if (!configurados.length) {
    configurados = dashboardProdutividadeSelecaoPadrao_(unidadeKey).map(function(cardId, pos) {
      return { id: cardId, ordem: pos + 1, ativo: true };
    });
  }

  var cacheCardsFonte = {};
  return configurados.filter(function(card) {
    return card.ativo !== false;
  }).sort(function(a, b) {
    return (Number(a.ordem) || 999) - (Number(b.ordem) || 999);
  }).slice(0, 8).map(function(card) {
    var cardExibicao = montarCardProdutividadePorIdDashboard_(card.id, rowsAtual, rowsAnterior, temDadosAnterior, card);
    return aplicarSelecaoMetricasCardProdutividadeDashboard_(
      cardExibicao,
      card,
      rowsAtual,
      rowsAnterior,
      temDadosAnterior,
      cacheCardsFonte
    );
  }).filter(Boolean);
}

function linhaPrisaoPeriodoDrfDashboard_(row, periodo) {
  var data = dataDashboard_(row.DATA);
  var ano = data ? String(data.getFullYear()) : String(Math.trunc(numeroDashboard_(row.ANO_REFERENCIA || row.ANO || 0)) || '');
  var mes = data ? DASHBOARD_CFG.MONTHS[data.getMonth()] : String(row['MÊS'] || row.MES || '');

  if (periodo.ano && ano !== String(periodo.ano)) return false;
  if (periodo.mes && normalizarDashboard_(mes) !== normalizarDashboard_(periodo.mes)) return false;
  return true;
}

function filtrarPrisoesPeriodoUnidadeDashboard_(rows, periodo, unidadeKey, configUnidade) {
  return (rows || []).filter(function(row) {
    if (!linhaPertenceUnidadeDashboardDepatri_(row, unidadeKey, configUnidade)) return false;
    return linhaPrisaoPeriodoDrfDashboard_(row, periodo);
  });
}

function somarPrisoesPeriodoUnidadeDashboard_(rows, periodo, unidadeKey, configUnidade) {
  return somarDashboard_(filtrarPrisoesPeriodoUnidadeDashboard_(rows, periodo, unidadeKey, configUnidade), function(row) {
    return row.PRISÕES || row.PRISOES || 0;
  });
}

function somarPrisoesPeriodoDrfDashboard_(rows, periodo, configUnidade) {
  return somarPrisoesPeriodoUnidadeDashboard_(rows, periodo, 'DRF', configUnidade);
}

function calcularEvolucaoDashboardDepatri_(atual, anterior) {
  atual = Number(atual || 0);
  anterior = Number(anterior || 0);
  if (anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

function obterDashboardPainelDepatriDados(usuarioLogin, filtros) {
  filtros = filtros || {};
  var usuario = validarAcessoDashboard_(usuarioLogin);
  var unidadeKey = String(filtros.visao || filtros.unidade || '').trim();
  if (!unidadeKey || unidadeKey === 'GERAL') {
    throw new Error('Informe uma visão específica do Painel DEPATRI.');
  }

  var config = obterConfigDashboardDepatriDaPlanilha_();
  var configUnidade = config[unidadeKey];
  if (!configUnidade) throw new Error('Unidade não configurada no Painel DEPATRI: ' + unidadeKey);

  if (usuario._classeDashboard === 'PROPRIA') {
    var fakeRow = { DELEGACIA: usuario._delegaciaDashboard };
    if (!linhaPertenceUnidadeDashboardDepatri_(fakeRow, unidadeKey, configUnidade)) {
      throw new Error('Seu perfil permite visualizar apenas a própria unidade.');
    }
  }

  // Todas as unidades comparam o mês/ano selecionado com o mesmo período do
  // ano anterior. Em "Ano = Todos" não há base anual única para comparação.
  var periodo = periodoAtualAnteriorDashboardDepatri_(filtros.mes || '', filtros.ano || '');
  var ssPortal = SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  var abaProd = ssPortal.getSheetByName('REGISTROS_PRODUTIVIDADE');
  if (!abaProd) throw new Error("Aba 'REGISTROS_PRODUTIVIDADE' não encontrada.");

  var rowsOriginais = sheetToObjectsDashboard_(abaProd);
  var rowsSemDuplicidade = deduplicarProdutividadeDashboardDepatri_(rowsOriginais);

  // DRF, DRFV, DAS e DDF usam o mesmo catálogo de produtividade. A Direção e
  // o ADMIN escolhem, por unidade, quais oito cards ficarão visíveis.
  if (dashboardProdutividadeUnidades_().indexOf(unidadeKey) > -1) {
    var rowsAtualProd = filtrarPeriodoUnidadeDashboardDepatri_(rowsSemDuplicidade, periodo.atual, unidadeKey, configUnidade);
    var rowsAnteriorProd = periodo.anterior
      ? filtrarPeriodoUnidadeDashboardDepatri_(rowsSemDuplicidade, periodo.anterior, unidadeKey, configUnidade)
      : [];
    var ultimoMesProdutividade = -1;
    if (periodo.tipo === 'ANO' && periodo.anterior) {
      ultimoMesProdutividade = ultimoMesInformadoDashboard_(rowsAtualProd, indiceMesLinhaProdutividadeDashboard_);
      if (ultimoMesProdutividade > -1) {
        rowsAnteriorProd = limitarLinhasAteMesDashboard_(rowsAnteriorProd, ultimoMesProdutividade, indiceMesLinhaProdutividadeDashboard_);
        periodo.rotuloAnteriorCards = rotuloPeriodoAcumuladoDashboard_(ultimoMesProdutividade, periodo.anterior.ano);
      } else {
        rowsAnteriorProd = [];
      }
    }
    var estatisticasEnviadas = rowsAtualProd.length > 0;
    var comparativoEnviado = !!periodo.anterior && rowsAnteriorProd.length > 0;

    var ssPrisoes = SpreadsheetApp.openById(DASHBOARD_CFG.PRISOES_SHEET_ID);
    var abaPrisoes = ssPrisoes.getSheetByName(DASHBOARD_CFG.PRISOES_SHEET_NAME);
    if (!abaPrisoes) throw new Error("Aba '" + DASHBOARD_CFG.PRISOES_SHEET_NAME + "' não encontrada na planilha de prisões.");

    var prisaoRows = sheetToObjectsDashboard_(abaPrisoes);
    var prisaoRowsAtual = filtrarPrisoesPeriodoUnidadeDashboard_(prisaoRows, periodo.atual, unidadeKey, configUnidade);
    var prisaoRowsAnterior = periodo.anterior
      ? filtrarPrisoesPeriodoUnidadeDashboard_(prisaoRows, periodo.anterior, unidadeKey, configUnidade)
      : [];
    var ultimoMesPrisoes = -1;
    var comparativoTotalRotulo = '';
    if (periodo.tipo === 'ANO' && periodo.anterior) {
      ultimoMesPrisoes = ultimoMesInformadoDashboard_(prisaoRowsAtual, indiceMesLinhaPrisaoDashboard_);
      if (ultimoMesPrisoes > -1) {
        prisaoRowsAnterior = limitarLinhasAteMesDashboard_(prisaoRowsAnterior, ultimoMesPrisoes, indiceMesLinhaPrisaoDashboard_);
        comparativoTotalRotulo = rotuloPeriodoAcumuladoDashboard_(ultimoMesPrisoes, periodo.anterior.ano);
      } else {
        prisaoRowsAnterior = [];
      }
    }
    var totalPrisoesAtual = somarDashboard_(prisaoRowsAtual, function(row) {
      return row.PRISÕES || row.PRISOES || 0;
    });
    var totalPrisoesAnterior = somarDashboard_(prisaoRowsAnterior, function(row) {
      return row.PRISÕES || row.PRISOES || 0;
    });
    var evolucaoPrisoes = periodo.comparativoDisponivel !== false
      ? calcularEvolucaoDashboardDepatri_(totalPrisoesAtual, totalPrisoesAnterior)
      : null;

    return {
      painelTipo: 'PRODUTIVIDADE_SELECIONAVEL',
      versaoPainel: DASHBOARD_BUILD_ID,
      departamento: 'DEPARTAMENTO DE COMBATE AOS CRIMES CONTRA O PATRIMÔNIO',
      sigla: 'DEPATRI',
      unidadeKey: unidadeKey,
      delegacia: configUnidade.nome,
      totalRotulo: 'TOTAL DE PRISÕES',
      total: totalPrisoesAtual,
      totalAnterior: totalPrisoesAnterior,
      temComparativoTotal: evolucaoPrisoes !== null,
      evolucaoTotal: evolucaoPrisoes,
      comparativoTotalRotulo: comparativoTotalRotulo,
      periodo: periodo,
      estatisticasEnviadas: estatisticasEnviadas,
      comparativoEnviado: comparativoEnviado,
      avisoEstatisticas: estatisticasEnviadas ? '' : 'ESTATÍSTICAS NÃO ENVIADAS',
      cards: montarCardsProdutividadeDashboard_(rowsAtualProd, rowsAnteriorProd, comparativoEnviado, unidadeKey, configUnidade),
      ocultarFaixaInstitucional: true,
      meta: {
        atualizadoEm: Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy HH:mm:ss'),
        linhasProdutividadeOriginais: rowsOriginais.length,
        linhasProdutividadeSemDuplicidade: rowsSemDuplicidade.length,
        linhasPeriodoAtual: rowsAtualProd.length,
        linhasPeriodoAnterior: rowsAnteriorProd.length,
        linhasPrisoes: prisaoRows.length,
        linhasPrisoesPeriodoAtual: prisaoRowsAtual.length,
        linhasPrisoesPeriodoAnterior: prisaoRowsAnterior.length,
        ultimoMesProdutividade: ultimoMesProdutividade > -1 ? DASHBOARD_CFG.MONTHS[ultimoMesProdutividade] : '',
        ultimoMesPrisoes: ultimoMesPrisoes > -1 ? DASHBOARD_CFG.MONTHS[ultimoMesPrisoes] : ''
      }
    };
  }

  // Visões que não representam delegacias continuam com cards de crimes.
  var crimesAtivos = (configUnidade.crimes || []).filter(function(c) { return c.ativo !== false; });
  var totaisAtual = somarCrimesDashboardDepatri_(rowsOriginais, unidadeKey, configUnidade, periodo.atual, crimesAtivos);
  var totaisAnterior = periodo.anterior
    ? somarCrimesDashboardDepatri_(rowsOriginais, unidadeKey, configUnidade, periodo.anterior, crimesAtivos)
    : {};

  var totalAtual = 0;
  var totalAnterior = 0;

  crimesAtivos.forEach(function(c) {
    var chave = normalizarDashboard_(c.crimeChave);
    totalAtual += Number(totaisAtual[chave] || 0);
    totalAnterior += Number(totaisAnterior[chave] || 0);
  });

  var cards = crimesAtivos.map(function(c) {
    var chave = normalizarDashboard_(c.crimeChave);
    var atual = Number(totaisAtual[chave] || 0);
    var anterior = Number(totaisAnterior[chave] || 0);
    var evolucao = calcularEvolucaoDashboardDepatri_(atual, anterior);

    return {
      crimeChave: c.crimeChave,
      crime: c.crimeChave,
      crimeExibicao: c.crimeExibicao || c.crimeChave,
      icone: c.icone || 'fa-chart-column',
      quantidade: atual,
      quantidadeAnterior: anterior,
      temComparativo: evolucao !== null,
      evolucao: evolucao,
      ordem: c.ordem || 999
    };
  });

  var evolucaoTotal = calcularEvolucaoDashboardDepatri_(totalAtual, totalAnterior);

  return {
    painelTipo: 'CRIMES_PRIORITARIOS',
    departamento: 'DEPARTAMENTO DE COMBATE AOS CRIMES CONTRA O PATRIMÔNIO',
    sigla: 'DEPATRI',
    unidadeKey: unidadeKey,
    delegacia: configUnidade.nome,
    totalRotulo: 'TOTAL DE REGISTROS',
    total: totalAtual,
    totalAnterior: totalAnterior,
    temComparativoTotal: evolucaoTotal !== null,
    evolucaoTotal: evolucaoTotal,
    periodo: periodo,
    cards: cards,
    ocultarFaixaInstitucional: false,
    meta: {
      atualizadoEm: Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy HH:mm:ss'),
      linhasProdutividadeOriginais: rowsOriginais.length,
      linhasProdutividadeSemDuplicidade: rowsSemDuplicidade.length
    }
  };
}

// Relatórios no dashboard geral. As linhas recebidas já respeitam período e acesso.
function resolverDelegaciaRelatoriosDashboard_(nome) {
  var cfg = dashboardDepatriConfigPadrao_();
  var chaves = ['DRFV', 'DRF', 'DAS', 'DDF', 'MEU_CELULAR'];
  var base = normalizarDashboard_(nome);
  for (var i = 0; i < chaves.length; i++) {
    var chave = chaves[i];
    var aliases = [chave, cfg[chave].nome].concat(cfg[chave].aliases || []);
    if (aliases.some(function(alias) { return base === normalizarDashboard_(alias); })) return chave;
  }
  // Sigla delimitada: DRF nunca absorve registros da DRFV.
  for (var j = 0; j < chaves.length; j++) {
    var sigla = chaves[j] === 'MEU_CELULAR' ? 'MEU[ _]CELULAR' : chaves[j];
    if (new RegExp('(^|[^A-Z0-9])' + sigla + '([^A-Z0-9]|$)').test(base)) return chaves[j];
  }
  return '';
}
function montarRelatoriosPorDelegaciaDashboard_(rows, filtros, usuario) {
  var cfg = dashboardDepatriConfigPadrao_();
  var chaves = ['DRFV', 'DRF', 'DAS', 'DDF', 'MEU_CELULAR'];
  var restricao = filtros.delegacia || (usuario._classeDashboard === 'PROPRIA' ? usuario._delegaciaDashboard : '');
  if (restricao) {
    var chaveRestrita = resolverDelegaciaRelatoriosDashboard_(restricao);
    chaves = chaves.filter(function(chave) { return chave === chaveRestrita; });
  }
  var tipos = [
    ['RELATÓRIO TÉCNICO'],
    ['RELATÓRIO DE MISSÃO'],
    ['RELATÓRIO DE INTELIGÊNCIA'],
    ['RELATÓRIO DE INVESTIGAÇÃO FINANCEIRA - RIF', 'RIF']
  ];
  return chaves.map(function(chave) {
    var registros = (rows || []).filter(function(row) {
      return resolverDelegaciaRelatoriosDashboard_(row.DELEGACIA) === chave && !linhaNaoContabilizadaDashboardDepatri_(row);
    });
    return {
      delegacia: chave, nome: cfg[chave].nome,
      quantidades: tipos.map(function(aliases) { return somarQuantidadeTiposProdutividadeDashboard_(registros, aliases); })
    };
  });
}
