/**
 * DEPATRI - Executor de Relatório Técnico para o plugin ChatGPT.
 * Colocar no mesmo projeto Apps Script do Portal DEPATRI.
 *
 * Propriedade obrigatória:
 * DEPATRI_RT_PASTA_MAE_ID = ID da pasta-mãe dos RTs.
 *
 * Propriedade opcional:
 * DEPATRI_RT_TEMPLATE_ID = ID do Google Docs-modelo do RT.
 */

var PLUGIN_DEPATRI_RT_CFG = {
  PROP_PASTA_MAE_ID: 'DEPATRI_RT_PASTA_MAE_ID',
  PROP_TEMPLATE_ID: 'DEPATRI_RT_TEMPLATE_ID',
  TEMPLATE_FALLBACK_ID: '1WstQ9shY36U_W8j7i4vOkXRJH7ClA96o4nZIcLUrEt4',
  ABA_NUMERADOR: 'INTEL_NUMERADOR',
  TIPO_NUMERADOR: 'RELATORIO TECNICO',
  ABA_IMAGENS: 'ADD_EVOLUCOES_IMAGENS',
  MAX_IMAGEM_LARGURA_PT: 420,
  TZ: 'America/Fortaleza'
};

function pluginDepatriExecutar(acao, payload) {
  acao = pluginRtNormalizar_(acao);
  payload = payload || {};
  if (acao === 'RT_CONFIGURAR') return pluginRtConfigurar(payload);
  if (acao === 'RT_STATUS') return pluginRtStatus(payload);
  if (acao === 'RT_PREPARAR') return pluginRtPreparar(payload);
  if (acao === 'RT_PREVIA') return pluginRtPrevia(payload);
  if (acao === 'RT_ADICIONAR_IMAGEM') return pluginRtAdicionarImagem(payload);
  if (acao === 'RT_ATUALIZAR_IMAGEM') return pluginRtAtualizarImagem(payload);
  if (acao === 'RT_FINALIZAR') return pluginRtFinalizar(payload);
  throw new Error('Ação do plugin não reconhecida: ' + String(acao || ''));
}

function pluginRtConfigurar(payload) {
  payload = payload || {};
  var pastaMaeId = String(payload.pastaMaeId || '').trim();
  var templateId = String(payload.templateId || '').trim();

  if (!pastaMaeId) throw new Error('pastaMaeId é obrigatório.');

  // Valida antes de salvar.
  var pasta = DriveApp.getFolderById(pastaMaeId);
  var props = PropertiesService.getScriptProperties();
  props.setProperty(PLUGIN_DEPATRI_RT_CFG.PROP_PASTA_MAE_ID, pasta.getId());

  if (templateId) {
    var modelo = DriveApp.getFileById(templateId);
    if (modelo.getMimeType() !== MimeType.GOOGLE_DOCS) {
      throw new Error('templateId deve apontar para um Documento Google nativo.');
    }
    props.setProperty(PLUGIN_DEPATRI_RT_CFG.PROP_TEMPLATE_ID, modelo.getId());
  }

  return {
    sucesso: true,
    pastaMaeId: pasta.getId(),
    nomePastaMae: pasta.getName(),
    templateId: pluginRtTemplateId_()
  };
}

function pluginRtStatus(payload) {
  payload = payload || {};
  var erros = [];
  var pasta = null;
  var template = null;
  var ss = null;

  try {
    ss = pluginRtPlanilha_();
  } catch (e1) {
    erros.push('PLANILHA: ' + e1.message);
  }

  try {
    pasta = pluginRtPastaMae_();
  } catch (e2) {
    erros.push('PASTA_MAE: ' + e2.message);
  }

  try {
    var templateId = pluginRtTemplateId_();
    template = DriveApp.getFileById(templateId);
    if (template.getMimeType() !== MimeType.GOOGLE_DOCS) {
      erros.push('TEMPLATE: arquivo não é Google Docs.');
    }
  } catch (e3) {
    erros.push('TEMPLATE: ' + e3.message);
  }

  if (ss) {
    ['INTEL_NUMERADOR', 'INVEST_EVOLUCOES', 'ADD_EVOLUCOES', 'ADD_EVOLUCOES_IMAGENS'].forEach(function(nome) {
      if (!ss.getSheetByName(nome)) erros.push('ABA: ' + nome + ' não encontrada.');
    });
  }

  return {
    sucesso: erros.length === 0,
    erros: erros,
    planilha: ss ? ss.getName() : '',
    pastaMae: pasta ? pasta.getName() : '',
    pastaMaeId: pasta ? pasta.getId() : '',
    template: template ? template.getName() : '',
    templateId: template ? template.getId() : ''
  };
}

function pluginRtNormalizar_(valor) {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function pluginRtAgora_() {
  return Utilities.formatDate(new Date(), PLUGIN_DEPATRI_RT_CFG.TZ, 'dd/MM/yyyy HH:mm:ss');
}

function pluginRtAnoAtual_() {
  return Number(Utilities.formatDate(new Date(), PLUGIN_DEPATRI_RT_CFG.TZ, 'yyyy'));
}

function pluginRtPlanilha_() {
  if (typeof abrirPlanilhaMaeDesenv_ === 'function') return abrirPlanilhaMaeDesenv_();
  if (typeof CONFIG !== 'undefined' && CONFIG.PLANILHA_MAE_ID) {
    return SpreadsheetApp.openById(CONFIG.PLANILHA_MAE_ID);
  }
  var id = String(PropertiesService.getScriptProperties().getProperty('DEPATRI_PLANILHA_ID') || '').trim();
  if (!id) throw new Error('Planilha-mãe não configurada.');
  return SpreadsheetApp.openById(id);
}

function pluginRtPastaMae_() {
  var id = String(
    PropertiesService.getScriptProperties().getProperty(PLUGIN_DEPATRI_RT_CFG.PROP_PASTA_MAE_ID) || ''
  ).trim();
  if (!id) {
    throw new Error(
      'Configure a propriedade ' + PLUGIN_DEPATRI_RT_CFG.PROP_PASTA_MAE_ID +
      ' com o ID da pasta-mãe dos RTs.'
    );
  }
  return DriveApp.getFolderById(id);
}

function pluginRtTemplateId_() {
  return String(
    PropertiesService.getScriptProperties().getProperty(PLUGIN_DEPATRI_RT_CFG.PROP_TEMPLATE_ID) ||
    PLUGIN_DEPATRI_RT_CFG.TEMPLATE_FALLBACK_ID ||
    ''
  ).trim();
}

function pluginRtIndice_(headers, aliases) {
  var mapa = {};
  (headers || []).forEach(function(h, i) { mapa[pluginRtNormalizar_(h)] = i; });
  aliases = aliases || [];
  for (var a = 0; a < aliases.length; a++) {
    var idx = mapa[pluginRtNormalizar_(aliases[a])];
    if (idx !== undefined) return idx;
  }
  return -1;
}

function pluginRtGarantirColunasImagem_() {
  var aba = pluginRtPlanilha_().getSheetByName(PLUGIN_DEPATRI_RT_CFG.ABA_IMAGENS);
  if (!aba) throw new Error('Aba ' + PLUGIN_DEPATRI_RT_CFG.ABA_IMAGENS + ' não encontrada.');
  var headers = aba.getRange(1, 1, 1, Math.max(1, aba.getLastColumn())).getValues()[0];
  ['INCLUIR_NO_RT', 'POSICAO_RT'].forEach(function(nome) {
    if (pluginRtIndice_(headers, [nome]) === -1) {
      aba.getRange(1, aba.getLastColumn() + 1).setValue(nome);
      headers.push(nome);
    }
  });
  aba.setFrozenRows(1);
  return aba;
}

function pluginRtLocalizarDemanda_(numOcorrencia) {
  if (typeof desenvCoreLocalizarDemanda_ !== 'function') {
    throw new Error('Módulo Desenvolvimento de Demandas não está carregado.');
  }
  var encontrada = desenvCoreLocalizarDemanda_(numOcorrencia, 0);
  if (!encontrada) throw new Error('Demanda não encontrada: ' + numOcorrencia);
  return encontrada;
}

function pluginRtDemandaObjeto_(encontrada) {
  if (typeof desenvCoreDemandRowToObject_ !== 'function') {
    throw new Error('Função desenvCoreDemandRowToObject_ indisponível.');
  }
  return desenvCoreDemandRowToObject_(encontrada);
}

function pluginRtAtualizarDemanda_(encontrada, valores) {
  if (typeof desenvCoreAtualizarLinha_ !== 'function') {
    throw new Error('Função desenvCoreAtualizarLinha_ indisponível.');
  }
  desenvCoreAtualizarLinha_(encontrada.aba, encontrada.rowIndex, valores);
}

function pluginRtReservarNumero_() {
  var aba = pluginRtPlanilha_().getSheetByName(PLUGIN_DEPATRI_RT_CFG.ABA_NUMERADOR);
  if (!aba) throw new Error('Aba INTEL_NUMERADOR não encontrada.');

  var dados = aba.getDataRange().getValues();
  if (!dados.length) throw new Error('INTEL_NUMERADOR está vazia.');

  var headers = dados[0];
  var idxTipo = pluginRtIndice_(headers, ['TIPO_DOC', 'TIPO DOC', 'TIPO_DOCUMENTO']);
  var idxAno = pluginRtIndice_(headers, ['ANO']);
  var idxUltimo = pluginRtIndice_(headers, ['ULTIMO_NUMERO', 'ULTIMO NUMERO', 'ÚLTIMO NÚMERO']);
  if (idxTipo < 0 || idxAno < 0 || idxUltimo < 0) {
    throw new Error('INTEL_NUMERADOR deve possuir TIPO_DOC, ANO e ULTIMO_NUMERO.');
  }

  var ano = pluginRtAnoAtual_();
  var linha = -1;
  for (var i = 1; i < dados.length; i++) {
    if (
      pluginRtNormalizar_(dados[i][idxTipo]) === pluginRtNormalizar_(PLUGIN_DEPATRI_RT_CFG.TIPO_NUMERADOR) &&
      Number(dados[i][idxAno]) === ano
    ) {
      linha = i + 1;
      break;
    }
  }
  if (linha < 2) throw new Error('Numerador de RELATORIO TECNICO/' + ano + ' não encontrado.');

  var atual = Number(aba.getRange(linha, idxUltimo + 1).getValue());
  if (!isFinite(atual) || atual < 0) throw new Error('ULTIMO_NUMERO inválido.');

  var novo = atual + 1;
  aba.getRange(linha, idxUltimo + 1).setValue(novo);
  SpreadsheetApp.flush();

  if (Number(aba.getRange(linha, idxUltimo + 1).getValue()) !== novo) {
    throw new Error('Não foi possível confirmar a reserva do número do RT.');
  }
  return novo + '/' + ano;
}

function pluginRtNomeSeguro_(texto) {
  return String(texto || 'ocorrencia')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|#%{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 120) || 'ocorrencia';
}

function pluginRtGarantirNumeroEPasta_(numOcorrencia) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Outro RT está sendo numerado. Tente novamente em alguns segundos.');
  }

  try {
    var encontrada = pluginRtLocalizarDemanda_(numOcorrencia);
    var demanda = pluginRtDemandaObjeto_(encontrada);

    if (demanda.numeroRt && demanda.pastaRtId) {
      try {
        return {
          numeroRt: demanda.numeroRt,
          pasta: DriveApp.getFolderById(demanda.pastaRtId),
          reutilizado: true
        };
      } catch (ignorar) {}
    }

    var numeroRt = demanda.numeroRt;
    if (!numeroRt) {
      numeroRt = pluginRtReservarNumero_();
      pluginRtAtualizarDemanda_(encontrada, {
        NUM_RT: numeroRt,
        DATA_ATUALIZACAO: pluginRtAgora_()
      });
      SpreadsheetApp.flush();
    }

    encontrada = pluginRtLocalizarDemanda_(numOcorrencia);
    demanda = pluginRtDemandaObjeto_(encontrada);

    if (demanda.pastaRtId) {
      try {
        return {
          numeroRt: numeroRt,
          pasta: DriveApp.getFolderById(demanda.pastaRtId),
          reutilizado: true
        };
      } catch (ignorar2) {}
    }

    var nome = 'RT ' + String(numeroRt).replace(/\//g, '.') +
      ' - IMAGENS - ' + pluginRtNomeSeguro_(demanda.numOcorrencia || numOcorrencia);

    var mae = pluginRtPastaMae_();
    var it = mae.getFoldersByName(nome);
    var pasta = it.hasNext() ? it.next() : mae.createFolder(nome);

    pluginRtAtualizarDemanda_(encontrada, {
      NUM_RT: numeroRt,
      PASTA_RT_ID: pasta.getId(),
      LINK_DRIVE_IMAGENS: pasta.getUrl(),
      DATA_ATUALIZACAO: pluginRtAgora_()
    });
    SpreadsheetApp.flush();

    return { numeroRt: numeroRt, pasta: pasta, reutilizado: false };
  } finally {
    lock.releaseLock();
  }
}

function pluginRtListarImagens_(numOcorrencia) {
  var aba = pluginRtGarantirColunasImagem_();
  var dados = aba.getDataRange().getValues();
  var headers = dados[0] || [];
  var idxId = pluginRtIndice_(headers, ['ID_IMAGEM']);
  var idxEvo = pluginRtIndice_(headers, ['ID_EVOLUCAO']);
  var idxNum = pluginRtIndice_(headers, ['NUM_OCORRENCIA']);
  var idxOrdem = pluginRtIndice_(headers, ['ORDEM']);
  var idxNome = pluginRtIndice_(headers, ['NOME']);
  var idxMime = pluginRtIndice_(headers, ['MIME_TYPE']);
  var idxFile = pluginRtIndice_(headers, ['FILE_ID']);
  var idxUrl = pluginRtIndice_(headers, ['URL']);
  var idxLegenda = pluginRtIndice_(headers, ['LEGENDA']);
  var idxExc = pluginRtIndice_(headers, ['EXCLUIDO']);
  var idxIncluir = pluginRtIndice_(headers, ['INCLUIR_NO_RT']);
  var idxPos = pluginRtIndice_(headers, ['POSICAO_RT']);
  var alvo = pluginRtNormalizar_(numOcorrencia);
  var lista = [];

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    if (pluginRtNormalizar_(row[idxNum]) !== alvo) continue;
    var excluido = idxExc > -1 ? pluginRtNormalizar_(row[idxExc]) : '';
    if (['SIM', 'TRUE', '1', 'EXCLUIDO'].indexOf(excluido) > -1) continue;

    var incluirRaw = idxIncluir > -1 ? pluginRtNormalizar_(row[idxIncluir]) : '';
    lista.push({
      rowIndex: i + 1,
      idImagem: idxId > -1 ? String(row[idxId] || '') : '',
      idEvolucao: idxEvo > -1 ? String(row[idxEvo] || '') : '',
      ordem: idxOrdem > -1 ? Number(row[idxOrdem] || 0) : 0,
      nome: idxNome > -1 ? String(row[idxNome] || '') : '',
      mimeType: idxMime > -1 ? String(row[idxMime] || '') : '',
      fileId: idxFile > -1 ? String(row[idxFile] || '') : '',
      url: idxUrl > -1 ? String(row[idxUrl] || '') : '',
      legenda: idxLegenda > -1 ? String(row[idxLegenda] || '') : '',
      incluirNoRt: incluirRaw !== 'NAO',
      posicaoRt: idxPos > -1 ? String(row[idxPos] || '') : ''
    });
  }

  lista.sort(function(a, b) {
    var pa = Number(a.posicaoRt || a.ordem || 0);
    var pb = Number(b.posicaoRt || b.ordem || 0);
    return pa !== pb ? pa - pb : a.rowIndex - b.rowIndex;
  });
  return lista;
}

function pluginRtEvolucoes_(numOcorrencia) {
  if (typeof desenvCoreListarEvolucoes_ !== 'function') {
    throw new Error('Função desenvCoreListarEvolucoes_ indisponível.');
  }
  return desenvCoreListarEvolucoes_(numOcorrencia) || [];
}

function pluginRtPreparar(payload) {
  payload = payload || {};
  var usuarioLogin = String(payload.usuarioLogin || '').trim();
  var numOcorrencia = String(payload.numOcorrencia || '').trim();
  if (!usuarioLogin) throw new Error('usuarioLogin é obrigatório.');
  if (!numOcorrencia) throw new Error('numOcorrencia é obrigatório.');

  if (typeof validarAcessoDesenvDemandas_ === 'function') validarAcessoDesenvDemandas_(usuarioLogin);

  var pack = pluginRtGarantirNumeroEPasta_(numOcorrencia);
  var encontrada = pluginRtLocalizarDemanda_(numOcorrencia);
  var demanda = pluginRtDemandaObjeto_(encontrada);

  return {
    sucesso: true,
    numeroRt: pack.numeroRt,
    pastaId: pack.pasta.getId(),
    nomePasta: pack.pasta.getName(),
    linkDriveImagens: pack.pasta.getUrl(),
    demanda: demanda,
    evolucoes: pluginRtEvolucoes_(numOcorrencia),
    imagens: pluginRtListarImagens_(numOcorrencia),
    templateId: pluginRtTemplateId_(),
    reutilizado: !!pack.reutilizado
  };
}

function pluginRtPrevia(payload) {
  var preparado = pluginRtPreparar(payload);
  var demanda = preparado.demanda;
  var imagens = preparado.imagens;
  var porEvolucao = {};

  imagens.forEach(function(img) {
    var k = String(img.idEvolucao || '');
    if (!porEvolucao[k]) porEvolucao[k] = [];
    porEvolucao[k].push(img);
  });

  var blocos = [];
  var inicial = String(payload.textoInicial || demanda.informacoesIniciais || '').trim();
  var descricao = String(payload.descricao || demanda.descricao || '').trim();

  if (inicial) {
    blocos.push({
      tipo: 'INFORMACOES_INICIAIS',
      idEvolucao: '',
      texto: inicial,
      imagens: porEvolucao[''] || []
    });
  }

  if (descricao && pluginRtNormalizar_(descricao) !== pluginRtNormalizar_(inicial)) {
    blocos.push({
      tipo: 'DESCRICAO',
      idEvolucao: '',
      texto: descricao,
      imagens: []
    });
  }

  (preparado.evolucoes || []).forEach(function(ev) {
    var texto = String(ev.desenvolvimento || '');
    if (payload.evolucoesTexto && payload.evolucoesTexto[ev.idEvolucao] !== undefined) {
      texto = String(payload.evolucoesTexto[ev.idEvolucao] || '');
    }
    blocos.push({
      tipo: 'EVOLUCAO',
      idEvolucao: ev.idEvolucao,
      ordem: ev.ordem,
      texto: texto,
      imagens: porEvolucao[String(ev.idEvolucao || '')] || []
    });
  });

  return {
    sucesso: true,
    numeroRt: preparado.numeroRt,
    linkDriveImagens: preparado.linkDriveImagens,
    resumo: pluginRtResumo_(payload, demanda),
    blocos: blocos,
    imagensSomenteDrive: imagens.filter(function(img) { return !img.incluirNoRt; }),
    quantidadeImagensNoRt: imagens.filter(function(img) { return img.incluirNoRt; }).length
  };
}

function pluginRtBlob_(arquivo, nomePadrao) {
  arquivo = arquivo || {};
  var conteudo = String(arquivo.base64 || arquivo.dataUrl || '');
  var mime = String(arquivo.mimeType || 'application/octet-stream');
  var match = conteudo.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mime = match[1] || mime;
    conteudo = match[2] || '';
  }
  if (!conteudo) throw new Error('Arquivo sem conteúdo Base64.');
  return Utilities.newBlob(
    Utilities.base64Decode(conteudo),
    mime,
    String(arquivo.nome || nomePadrao || 'arquivo')
  );
}

function pluginRtAdicionarImagem(payload) {
  payload = payload || {};
  var usuarioLogin = String(payload.usuarioLogin || '').trim();
  var numOcorrencia = String(payload.numOcorrencia || '').trim();
  if (!usuarioLogin || !numOcorrencia || !payload.arquivo) {
    throw new Error('usuarioLogin, numOcorrencia e arquivo são obrigatórios.');
  }

  if (typeof validarAcessoDesenvDemandas_ === 'function') validarAcessoDesenvDemandas_(usuarioLogin);

  var pack = pluginRtGarantirNumeroEPasta_(numOcorrencia);
  var aba = pluginRtGarantirColunasImagem_();
  var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var existentes = pluginRtListarImagens_(numOcorrencia);
  var ordem = 1;
  existentes.forEach(function(img) { ordem = Math.max(ordem, Number(img.ordem || 0) + 1); });

  var blob = pluginRtBlob_(payload.arquivo, 'imagem_' + ordem + '.png');
  var file = pack.pasta.createFile(blob);
  var agora = pluginRtAgora_();
  var mapa = {
    ID_IMAGEM: 'IMG-' + Utilities.getUuid(),
    ID_EVOLUCAO: String(payload.idEvolucao || ''),
    NUM_OCORRENCIA: numOcorrencia,
    ORDEM: ordem,
    NOME: file.getName(),
    MIME_TYPE: blob.getContentType(),
    FILE_ID: file.getId(),
    URL: file.getUrl(),
    LEGENDA: String(payload.legenda || ''),
    USUARIO: usuarioLogin,
    DATA_CRIACAO: agora,
    DATA_ATUALIZACAO: agora,
    EXCLUIDO: 'NAO',
    INCLUIR_NO_RT: pluginRtNormalizar_(payload.incluirNoRt) === 'NAO' ? 'NAO' : 'SIM',
    POSICAO_RT: payload.posicaoRt == null ? ordem : payload.posicaoRt
  };

  var row = new Array(headers.length).fill('');
  Object.keys(mapa).forEach(function(k) {
    var idx = pluginRtIndice_(headers, [k]);
    if (idx > -1) row[idx] = mapa[k];
  });
  aba.appendRow(row);

  return {
    sucesso: true,
    idImagem: mapa.ID_IMAGEM,
    numeroRt: pack.numeroRt,
    fileId: file.getId(),
    url: file.getUrl(),
    legenda: mapa.LEGENDA,
    incluirNoRt: mapa.INCLUIR_NO_RT === 'SIM',
    posicaoRt: mapa.POSICAO_RT,
    linkDriveImagens: pack.pasta.getUrl()
  };
}

function pluginRtLocalizarImagem_(idImagem) {
  var aba = pluginRtGarantirColunasImagem_();
  var dados = aba.getDataRange().getValues();
  var headers = dados[0] || [];
  var idxId = pluginRtIndice_(headers, ['ID_IMAGEM']);
  for (var i = 1; i < dados.length; i++) {
    if (idxId > -1 && String(dados[i][idxId] || '') === String(idImagem || '')) {
      return { aba: aba, headers: headers, rowIndex: i + 1 };
    }
  }
  return null;
}

function pluginRtAtualizarImagem(payload) {
  payload = payload || {};
  var usuarioLogin = String(payload.usuarioLogin || '').trim();
  var idImagem = String(payload.idImagem || '').trim();
  if (!usuarioLogin || !idImagem) throw new Error('usuarioLogin e idImagem são obrigatórios.');

  if (typeof validarAcessoDesenvDemandas_ === 'function') validarAcessoDesenvDemandas_(usuarioLogin);
  var encontrada = pluginRtLocalizarImagem_(idImagem);
  if (!encontrada) throw new Error('Imagem não encontrada.');

  var alteracoes = { DATA_ATUALIZACAO: pluginRtAgora_() };
  if (payload.legenda !== undefined) alteracoes.LEGENDA = String(payload.legenda || '');
  if (payload.incluirNoRt !== undefined) {
    alteracoes.INCLUIR_NO_RT = pluginRtNormalizar_(payload.incluirNoRt) === 'NAO' ? 'NAO' : 'SIM';
  }
  if (payload.posicaoRt !== undefined) alteracoes.POSICAO_RT = payload.posicaoRt;
  if (payload.excluir !== undefined) alteracoes.EXCLUIDO = payload.excluir ? 'SIM' : 'NAO';

  Object.keys(alteracoes).forEach(function(k) {
    var idx = pluginRtIndice_(encontrada.headers, [k]);
    if (idx > -1) encontrada.aba.getRange(encontrada.rowIndex, idx + 1).setValue(alteracoes[k]);
  });
  return { sucesso: true, idImagem: idImagem, mensagem: 'Imagem atualizada.' };
}

function pluginRtEscapeRegex_(texto) {
  return String(texto || '').replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
}

function pluginRtSubstituirTag_(container, tag, valor) {
  if (!container) return;
  var padrao = pluginRtEscapeRegex_(tag);
  var achado = container.findText(padrao);
  var limite = 0;
  while (achado && limite < 50) {
    limite++;
    var t = achado.getElement().asText();
    var ini = achado.getStartOffset();
    var fim = achado.getEndOffsetInclusive();
    t.deleteText(ini, fim);
    var novo = String(valor == null ? '' : valor);
    if (novo) t.insertText(ini, novo);
    achado = container.findText(padrao);
  }
}

function pluginRtEstilizarTexto_(p) {
  // Corpo do relatório: Garamond 13, justificado, sem negrito por padrão
  // e recuo de 2 cm na primeira linha de cada parágrafo.
  p.setFontFamily('Garamond')
    .setFontSize(13)
    .setLineSpacing(1.15)
    .setSpacingBefore(0)
    .setSpacingAfter(8)
    .setIndentStart(0)
    .setIndentFirstLine(56.7)
    .setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);

  var texto = p.editAsText();
  texto.setFontFamily('Garamond');
  texto.setFontSize(13);
  texto.setBold(false);
  texto.setItalic(false);

  return p;
}

function pluginRtInserirTexto_(body, indice, texto) {
  var blocos = String(texto || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map(function(x) { return String(x || '').trim(); })
    .filter(Boolean);

  blocos.forEach(function(bloco) {
    // Somente trechos marcados com **texto** ficam em negrito.
    var limpo = '';
    var destaques = [];
    var regex = /\*\*([^*]+?)\*\*/g;
    var ultimo = 0;
    var match;

    while ((match = regex.exec(bloco)) !== null) {
      limpo += bloco.substring(ultimo, match.index);
      var inicio = limpo.length;
      limpo += match[1];
      var fim = limpo.length - 1;
      if (fim >= inicio) destaques.push({ inicio: inicio, fim: fim });
      ultimo = match.index + match[0].length;
    }
    limpo += bloco.substring(ultimo);

    var p = body.insertParagraph(indice++, limpo);
    pluginRtEstilizarTexto_(p);

    if (destaques.length) {
      var t = p.editAsText();
      destaques.forEach(function(d) {
        t.setBold(d.inicio, d.fim, true);
      });
    }
  });

  return indice;
}

function pluginRtFormatarResumo_(body) {
  if (!body) return;

  var achado = body.findText('RESUMO:');
  if (!achado) return;

  var el = achado.getElement();
  if (!el) return;

  var pai = el.getParent();
  if (!pai || pai.getType() !== DocumentApp.ElementType.PARAGRAPH) return;

  var p = pai.asParagraph();
  var t = p.editAsText();
  var conteudo = String(t.getText() || '');

  // Apenas o rótulo RESUMO: permanece em negrito.
  t.setFontFamily('Garamond');
  t.setFontSize(13);
  t.setBold(false);
  t.setItalic(false);

  var idx = conteudo.indexOf('RESUMO:');
  if (idx > -1) {
    t.setBold(idx, idx + 'RESUMO:'.length - 1, true);
  }

  p.setFontFamily('Garamond')
    .setFontSize(13)
    .setLineSpacing(1.15)
    .setSpacingAfter(8)
    .setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
}

function pluginRtInserirImagem_(body, indice, img, contadorFigura) {
  if (!img || !img.fileId || !img.incluirNoRt) return { indice: indice, figura: contadorFigura };

  var blob;
  try {
    blob = DriveApp.getFileById(img.fileId).getBlob();
  } catch (e) {
    return { indice: indice, figura: contadorFigura };
  }

  var pImg = body.insertParagraph(indice++, '');
  pImg.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingAfter(2);
  var inline = pImg.appendInlineImage(blob);

  var largura = Number(inline.getWidth() || 0);
  var altura = Number(inline.getHeight() || 0);
  var max = PLUGIN_DEPATRI_RT_CFG.MAX_IMAGEM_LARGURA_PT;
  if (largura > max && largura > 0 && altura > 0) {
    var ratio = max / largura;
    inline.setWidth(max).setHeight(Math.round(altura * ratio));
  }

  contadorFigura++;
  var legenda = String(img.legenda || '').trim();
  if (legenda) {
    var pLeg = body.insertParagraph(
      indice++,
      'Figura ' + ('0' + contadorFigura).slice(-2) + ' – ' + legenda
    );
    pLeg.setFontFamily('Garamond')
      .setFontSize(10)
      .setItalic(true)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .setSpacingAfter(8);
  }

  return { indice: indice, figura: contadorFigura };
}

function pluginRtInserirCorpoEstruturado_(body, payload, demanda, evolucoes, imagens) {
  var tag = '{{CORPO_RELATORIO}}';
  var achado = body.findText(pluginRtEscapeRegex_(tag));
  if (!achado) throw new Error('O modelo não contém {{CORPO_RELATORIO}}.');

  var elementoTexto = achado.getElement().asText();
  var pai = elementoTexto.getParent();
  if (
    pai.getType() !== DocumentApp.ElementType.PARAGRAPH ||
    !pai.getParent() ||
    pai.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION
  ) {
    throw new Error('{{CORPO_RELATORIO}} deve estar em um parágrafo próprio.');
  }

  var pTag = pai.asParagraph();
  var indice = body.getChildIndex(pTag);
  body.removeChild(pTag);

  var imagensPorEvo = {};
  imagens.forEach(function(img) {
    if (!img.incluirNoRt) return;
    var k = String(img.idEvolucao || '');
    if (!imagensPorEvo[k]) imagensPorEvo[k] = [];
    imagensPorEvo[k].push(img);
  });

  var figura = 0;

  if (payload.blocos && Array.isArray(payload.blocos) && payload.blocos.length) {
    payload.blocos.forEach(function(bloco) {
      var idEvo = String((bloco || {}).idEvolucao || '');
      indice = pluginRtInserirTexto_(body, indice, String((bloco || {}).texto || ''));
      (imagensPorEvo[idEvo] || []).forEach(function(img) {
        var r = pluginRtInserirImagem_(body, indice, img, figura);
        indice = r.indice;
        figura = r.figura;
      });
      delete imagensPorEvo[idEvo];
    });
  } else {
    var textoInicial = String(payload.textoInicial || demanda.informacoesIniciais || '').trim();
    var descricao = String(payload.descricao || demanda.descricao || '').trim();

    if (textoInicial) indice = pluginRtInserirTexto_(body, indice, textoInicial);
    if (descricao && pluginRtNormalizar_(descricao) !== pluginRtNormalizar_(textoInicial)) {
      indice = pluginRtInserirTexto_(body, indice, descricao);
    }

    (imagensPorEvo[''] || []).forEach(function(img) {
      var r0 = pluginRtInserirImagem_(body, indice, img, figura);
      indice = r0.indice;
      figura = r0.figura;
    });
    delete imagensPorEvo[''];

    (evolucoes || []).forEach(function(ev) {
      var texto = String(ev.desenvolvimento || '');
      if (payload.evolucoesTexto && payload.evolucoesTexto[ev.idEvolucao] !== undefined) {
        texto = String(payload.evolucoesTexto[ev.idEvolucao] || '');
      }

      indice = pluginRtInserirTexto_(body, indice, texto);
      (imagensPorEvo[String(ev.idEvolucao || '')] || []).forEach(function(img) {
        var r = pluginRtInserirImagem_(body, indice, img, figura);
        indice = r.indice;
        figura = r.figura;
      });
      delete imagensPorEvo[String(ev.idEvolucao || '')];
    });
  }

  Object.keys(imagensPorEvo).forEach(function(k) {
    (imagensPorEvo[k] || []).forEach(function(img) {
      var r = pluginRtInserirImagem_(body, indice, img, figura);
      indice = r.indice;
      figura = r.figura;
    });
  });

  return figura;
}

function pluginRtQrBlob_(link, qrBase64) {
  if (!qrBase64) {
    throw new Error(
      'QR Code não informado. Gere o QR no frontend do Portal e envie qrBase64 ao RT_FINALIZAR.'
    );
  }

  return pluginRtBlob_({
    base64: qrBase64,
    nome: 'QR_RT.png',
    mimeType: 'image/png'
  }, 'QR_RT.png');
}

function pluginRtInserirQr_(body, link, qrBase64) {
  var achado = body.findText(pluginRtEscapeRegex_('{{QR_CODE_IMAGENS}}'));
  if (!achado) throw new Error('O modelo não contém {{QR_CODE_IMAGENS}}.');

  var texto = achado.getElement().asText();
  var pai = texto.getParent();
  texto.deleteText(achado.getStartOffset(), achado.getEndOffsetInclusive());

  var blob = pluginRtQrBlob_(link, qrBase64);
  var img;
  if (pai.getType() === DocumentApp.ElementType.PARAGRAPH) {
    var p = pai.asParagraph();
    img = p.appendInlineImage(blob);
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  } else {
    img = body.appendImage(blob);
  }

  if (img && img.getWidth() > 220) {
    var ratio = 220 / img.getWidth();
    img.setWidth(220).setHeight(Math.round(img.getHeight() * ratio));
  }
}

function pluginRtResumo_(payload, demanda) {
  var informado = String(payload.resumo || '').replace(/\s+/g, ' ').trim();
  if (informado) return informado;

  var informacoes = String(demanda.informacoesIniciais || '').replace(/\s+/g, ' ').trim();
  var salvo = String(demanda.resumo || '').replace(/\s+/g, ' ').trim();

  // Se o resumo salvo for realmente diferente das informações iniciais,
  // preserva o resumo próprio cadastrado.
  if (salvo && pluginRtNormalizar_(salvo) !== pluginRtNormalizar_(informacoes)) {
    return salvo;
  }

  var base = informacoes || salvo;
  if (!base) return '';

  var frases = base.match(/[^.!?]+[.!?]+/g) || [];
  var resumo = frases.slice(0, 2).join(' ').trim() || base;

  if (resumo.length > 700) {
    resumo = resumo.substring(0, 700).replace(/\s+\S*$/, '').trim();
    if (resumo && !/[.!?]$/.test(resumo)) resumo += '.';
  }
  return resumo;
}

function pluginRtExportarPdf_(docId, pasta, nomeBase) {
  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(
    'https://docs.google.com/document/d/' + encodeURIComponent(docId) + '/export?format=pdf',
    { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true }
  );
  if (response.getResponseCode() >= 400) {
    throw new Error('Falha ao exportar o RT em PDF. Código ' + response.getResponseCode() + '.');
  }
  return pasta.createFile(response.getBlob().setName(nomeBase + '.pdf'));
}

function pluginRtFinalizar(payload) {
  payload = payload || {};
  var usuarioLogin = String(payload.usuarioLogin || '').trim();
  var numOcorrencia = String(payload.numOcorrencia || '').trim();
  if (!usuarioLogin || !numOcorrencia) {
    throw new Error('usuarioLogin e numOcorrencia são obrigatórios.');
  }

  if (typeof validarAcessoDesenvDemandas_ === 'function') validarAcessoDesenvDemandas_(usuarioLogin);

  var preparada = pluginRtPreparar({
    usuarioLogin: usuarioLogin,
    numOcorrencia: numOcorrencia
  });

  var encontrada = pluginRtLocalizarDemanda_(numOcorrencia);
  var demanda = pluginRtDemandaObjeto_(encontrada);

  if (!payload.forcarNovaVersao && demanda.urlDoc && demanda.urlPdf) {
    return {
      sucesso: true,
      reutilizado: true,
      numeroRt: demanda.numeroRt,
      urlDoc: demanda.urlDoc,
      urlPdf: demanda.urlPdf,
      linkDriveImagens: demanda.linkDriveImagens
    };
  }

  var pasta = DriveApp.getFolderById(preparada.pastaId);
  var numeroRt = preparada.numeroRt;
  var templateId = pluginRtTemplateId_();
  if (!templateId) throw new Error('Template do RT não configurado.');

  var nomeBase = 'RT ' + String(numeroRt).replace(/\//g, '.') +
    ' - ' + pluginRtNomeSeguro_(numOcorrencia);

  if (payload.forcarNovaVersao) {
    nomeBase += ' - REV ' +
      Utilities.formatDate(new Date(), PLUGIN_DEPATRI_RT_CFG.TZ, 'yyyyMMdd-HHmmss');
  }

  var modelo = DriveApp.getFileById(templateId);
  if (modelo.getMimeType() !== MimeType.GOOGLE_DOCS) {
    throw new Error('O template do RT não é um Documento Google nativo.');
  }

  var docFile = null;
  var pdfFile = null;
  try {
    docFile = modelo.makeCopy(nomeBase, pasta);
    var doc = DocumentApp.openById(docFile.getId());
  var body = doc.getBody();
  var linkPasta = pasta.getUrl();

  var tags = {
    '{{NUMERO_RT}}': numeroRt,
    '{{DATA_ATUAL}}': Utilities.formatDate(new Date(), PLUGIN_DEPATRI_RT_CFG.TZ, 'dd/MM/yyyy'),
    '{{DATA_CRIME}}': demanda.data || '',
    '{{CRIME}}': demanda.crime || '',
    '{{DIFUSAO}}': demanda.difusao || '',
    '{{NUM_OCORRENCIA}}': demanda.numOcorrencia || numOcorrencia,
    '{{RESUMO}}': pluginRtResumo_(payload, demanda),
    '{{LINK_DRIVE_IMAGENS}}': linkPasta,
    '{{TEXTO_COMPLETO}}': ''
  };

  Object.keys(tags).forEach(function(tag) {
    pluginRtSubstituirTag_(body, tag, tags[tag]);
    try { pluginRtSubstituirTag_(doc.getHeader(), tag, tags[tag]); } catch (e1) {}
    try { pluginRtSubstituirTag_(doc.getFooter(), tag, tags[tag]); } catch (e2) {}
  });

  // O modelo deixa a linha do resumo em negrito; corrigimos após substituir as tags.
  pluginRtFormatarResumo_(body);

  var qtdFiguras = pluginRtInserirCorpoEstruturado_(
    body,
    payload,
    demanda,
    pluginRtEvolucoes_(numOcorrencia),
    pluginRtListarImagens_(numOcorrencia)
  );

  pluginRtInserirQr_(body, linkPasta, payload.qrBase64 || '');
  doc.saveAndClose();

    pdfFile = pluginRtExportarPdf_(docFile.getId(), pasta, nomeBase);

    pluginRtAtualizarDemanda_(encontrada, {
    NUM_RT: numeroRt,
    PASTA_RT_ID: pasta.getId(),
    LINK_DRIVE_IMAGENS: linkPasta,
    URL_DOC_RT: docFile.getUrl(),
    URL_PDF_RT: pdfFile.getUrl(),
    STATUS: demanda.status && pluginRtNormalizar_(demanda.status) !== 'PENDENTE'
      ? demanda.status
      : 'DEMANDA EVOLUIDA',
    DATA_ATUALIZACAO: pluginRtAgora_()
  });

    return {
      sucesso: true,
      reutilizado: false,
      numeroRt: numeroRt,
      urlDoc: docFile.getUrl(),
      urlPdf: pdfFile.getUrl(),
      linkDriveImagens: linkPasta,
      quantidadeFiguras: qtdFiguras
    };
  } catch (erroFinalizacao) {
    // Se a montagem falhar antes de ser registrada na demanda, elimina somente
    // os artefatos criados por esta tentativa para evitar documentos órfãos.
    try { if (pdfFile) pdfFile.setTrashed(true); } catch (ePdf) {}
    try { if (docFile) docFile.setTrashed(true); } catch (eDoc) {}
    throw erroFinalizacao;
  }
}


/**
 * CONFIGURAÇÃO INICIAL — execute uma única vez pelo editor do Apps Script.
 * Não consome número de RT.
 */
function configurarExecutorRtDepatri() {
  var resultado = pluginRtConfigurar({
    pastaMaeId: '1X6JiyPbZR9Tz7pHih09jm2degIpdcFDi',
    templateId: '1WstQ9shY36U_W8j7i4vOkXRJH7ClA96o4nZIcLUrEt4'
  });
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

/**
 * DIAGNÓSTICO — pode executar quantas vezes quiser.
 * Não consome número e não cria pasta de RT.
 */
function testarExecutorRtDepatri() {
  var resultado = pluginRtStatus({});
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


/**
 * PRIMEIRO TESTE REAL DE PREPARAÇÃO DO RT
 * Caso: IP Nº 308-85/2026
 * Usuário: admin
 *
 * ATENÇÃO: esta função reserva/consome o próximo número oficial de RT
 * caso o processo ainda não possua NUM_RT.
 */
function testarPreparacaoRtIp30885() {
  var resultado = pluginDepatriExecutar('RT_PREPARAR', {
    usuarioLogin: 'admin',
    numOcorrencia: 'IP Nº 308-85/2026'
  });

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
