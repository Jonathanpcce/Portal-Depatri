'use strict';
const {normalize, field, id, fail} = require('./cases-core.cjs');

const reasons = ['INCONSISTÊNCIA INVOLUNTÁRIA NAS INFORMAÇÕES INICIAIS DA VÍTIMA', 'VÍTIMA NÃO COLABORATIVA', 'DENUNCIAÇÃO FALSA DE CRIME'];
const fields = [
  {key: 'dataOcorrencia', label: 'Data da Ocorrência', type: 'date', required: true},
  {key: 'status', label: 'Status', menu: 'status', required: true},
  {key: 'unidade', label: 'Unidade Responsável', menu: 'unidade', required: true},
  {key: 'equipe', label: 'Equipe', menu: 'equipe'},
  {key: 'unidadeOutro', label: 'Outra unidade'},
  {key: 'tipoOcorrencia', label: 'Tipo de Ocorrência', menu: 'tipoOcorrencia', required: true},
  {key: 'numOcorrencia', label: 'Nº da Ocorrência', required: true},
  {key: 'tipoOcorrenciaOutro', label: 'Outro tipo de ocorrência'},
  {key: 'nomeVitima', label: 'Nome da Vítima'},
  {key: 'endereco', label: 'Endereço da Ocorrência', max: 500},
  {key: 'bairro', label: 'Bairro'},
  {key: 'crimeTipo', label: 'Crime - Tipo', menu: 'crimeTipo', required: true},
  {key: 'crimeOutro', label: 'Outro crime'},
  {key: 'procedimentoInstaurado', label: 'Procedimento Instaurado'},
  {key: 'procedimentoNaoInstaurado', label: 'Procedimento não instaurado pela delegacia', type: 'checkbox'},
  {key: 'motivoEvolucaoDiversa', label: 'Demanda evoluída por razões diversas', menu: 'motivos'},
  {key: 'denunciacaoFalsaInfrator', label: 'Nome do infrator da denunciação falsa', conditional: 'falseReport'},
  {key: 'denunciacaoFalsaTipoProcedimento', label: 'Tipo de procedimento da denunciação falsa', menu: 'tipoOcorrencia', conditional: 'falseReport'},
  {key: 'denunciacaoFalsaNumeroProcedimento', label: 'Nº do procedimento da denunciação falsa', conditional: 'falseReport'},
  {key: 'observacoes', label: 'Observações', type: 'textarea', max: 12000}
];
const counters = [
  {key: 'suspeitosIdent', label: 'Suspeitos identificados', details: [{key: 'nomesSuspeitos', label: 'Nome do suspeito'}]},
  {key: 'suspeitosPresos', label: 'Quantidade de prisões', details: [{key: 'nomesPresos', label: 'Nome do preso'}]},
  {key: 'veiculosIdentificados', label: 'Veículos identificados', details: [{key: 'placasVeiculosIdentificados', label: 'Placa'}]},
  {key: 'veiculosRecuperados', label: 'Veículos recuperados', details: [
    {key: 'placasVeiculosRecuperados', label: 'Placa'}, {key: 'tiposVeiculosRecuperados', label: 'Tipo do veículo'},
    {key: 'marcasVeiculosRecuperados', label: 'Marca'}, {key: 'modelosVeiculosRecuperados', label: 'Modelo'},
    {key: 'anosVeiculosRecuperados', label: 'Ano'}, {key: 'valoresVeiculosRecuperados', label: 'Valor (R$)'},
    {key: 'fontesVeiculosRecuperados', label: 'Fonte de dados'}, {key: 'descricoesVeiculosRecuperados', label: 'Descrição'},
    {key: 'observacoesVeiculosRecuperados', label: 'Observações do veículo'}]},
  {key: 'veiculosApreendidos', label: 'Veículos apreendidos', details: [{key: 'placasVeiculosApreendidos', label: 'Placa'}]},
  {key: 'armasApreendidas', label: 'Armas apreendidas', details: []},
  {key: 'relatorioTecnico', label: 'Relatórios técnicos', details: [{key: 'relatorioTecnicoPdfLinks', label: 'PDF do relatório técnico', type: 'pdf'}]},
  {key: 'relatorioMissao', label: 'Relatórios de missão', details: [{key: 'relatorioMissaoPdfLinks', label: 'PDF do relatório de missão', type: 'pdf'}]},
  {key: 'relatorioExtracao', label: 'Relatórios de extração', details: [{key: 'relatorioExtracaoPdfLinks', label: 'PDF do relatório de extração', type: 'pdf'}]}
];
const pdfFields = counters.flatMap(c => c.details.filter(d => d.type === 'pdf').map(d => d.key));
const allowed = new Set([...fields.map(f => f.key), ...counters.map(c => c.key), ...counters.flatMap(c => c.details.map(d => d.key)), 'casoId']);
function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
    fail('invalid-argument', 'Identificador da solicitação inválido.');
  return value;
}
function date(value, optional = false) {
  if (optional && !value) return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)
    fail('invalid-argument', 'Data da ocorrência inválida.');
  return value;
}
function integer(value, label, max = 500) {
  if (value === '' || value === undefined || value === null) return 0;
  if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > max)
    fail('invalid-argument', `${label}: informe um número inteiro entre 0 e ${max}.`);
  return Number(value);
}
function multiline(value, label, max) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))
    fail('invalid-argument', `${label} inválido.`);
  return value.trim();
}
function validateMenus(config, crimes) {
  const menus = {};
  for (const key of ['status', 'unidade', 'equipe', 'tipoOcorrencia']) {
    if (!Array.isArray(config?.[key]) || (key !== 'equipe' && !config[key].length))
      fail('failed-precondition', 'Os menus de Demandas Ativas ainda precisam ser importados de DB_CONFIG.');
    menus[key] = [...new Set(config[key].map(v => field(v, 'Opção do menu')))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  menus.crimeTipo = [...new Set(crimes.flatMap(c => c.subtipos.length ? c.subtipos : [c.tipo]))];
  menus.motivos = [...reasons];
  return menus;
}
function validateDemand(input, menus, previous = null) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !allowed.has(k)))
    fail('invalid-argument', 'Dados da demanda inválidos.');
  const result = {};
  for (const spec of fields) {
    const value = input[spec.key];
    if (spec.type === 'checkbox') {
      if (value !== undefined && typeof value !== 'boolean') fail('invalid-argument', `${spec.label} inválido.`);
      result[spec.key] = value === true;
    } else if (spec.type === 'date') result[spec.key] = date(value);
    else if (spec.type === 'textarea') result[spec.key] = multiline(value, spec.label, spec.max);
    else {
      const clean = field(value, spec.label, spec.max || 150, !spec.required);
      if (spec.menu && clean) {
        const found = menus[spec.menu].find(v => normalize(v) === normalize(clean));
        // Uma opção histórica pode ser mantida exatamente, mas não atribuída a outro registro.
        if (!found && clean !== previous?.[spec.key]) fail('invalid-argument', `Selecione ${spec.label.toLowerCase()} do cadastro.`);
        result[spec.key] = found || clean;
      } else result[spec.key] = clean;
    }
  }
  result.numOcorrencia = result.numOcorrencia.replace(/\s+/g, '').toUpperCase();
  if (!result.numOcorrencia) fail('invalid-argument', 'Informe o número da ocorrência.');
  if (result.procedimentoNaoInstaurado) result.procedimentoInstaurado = '';
  if (result.motivoEvolucaoDiversa !== reasons[2]) {
    result.denunciacaoFalsaInfrator = ''; result.denunciacaoFalsaTipoProcedimento = ''; result.denunciacaoFalsaNumeroProcedimento = '';
  }
  for (const counter of counters) {
    const count = integer(input[counter.key], counter.label); result[counter.key] = count;
    for (const detail of counter.details) {
      const values = input[detail.key] ?? [];
      if (!Array.isArray(values) || values.length > count) fail('invalid-argument', `Confira os detalhes de ${counter.label.toLowerCase()}.`);
      result[detail.key] = Array.from({length: count}, (_, i) => {
        const item = field(values[i], detail.label, detail.type === 'pdf' ? 2000 : 500, true);
        if (detail.type === 'pdf' && item) {
          if (item.startsWith('anexo:')) id(item.slice(6), 'Anexo');
          else {
            let url; try { url = new URL(item); } catch { fail('invalid-argument', 'Referência do PDF inválida.'); }
            if (url.protocol !== 'https:' || url.username || url.password || !previous?.[detail.key]?.includes(item))
              fail('invalid-argument', 'Envie o PDF pelo formulário. Links anteriores só podem ser mantidos.');
          }
        }
        return item;
      });
    }
  }
  if (Object.hasOwn(input, 'casoId')) result.casoId = input.casoId === null ? null : id(input.casoId, 'Caso');
  result.numeroProcedimento = result.numOcorrencia;
  result.procedimentoConcat = `${result.tipoOcorrencia} Nº ${result.numOcorrencia}`;
  result.unidadeResponsavel = result.unidade;
  result.unidadeChave = normalize(result.unidade);
  // Preserva a regra efetiva dos originais: pelo menos uma unidade em um destes sete contadores.
  result.statusDemanda = result.motivoEvolucaoDiversa || counters.slice(0, 7).some(c => result[c.key] >= 1)
    ? 'DEMANDA EVOLUIDA' : 'DEMANDA NÃO EVOLUÍDA';
  result.relatoriosQtd = result.relatorioTecnico + result.relatorioMissao + result.relatorioExtracao;
  return result;
}
function procedureKey(d) { return `${normalize(d.tipoOcorrencia)}\u0000${d.numOcorrencia.replace(/\s+/g, '').toUpperCase()}`; }
function publicDemand(doc) {
  const d = doc.data(), out = {id: doc.id, versao: d.versao || 0, casoId: d.casoId || null, casoNome: d.casoNome || ''};
  for (const key of allowed) if (Object.hasOwn(d, key)) out[key] = d[key];
  for (const key of ['numeroProcedimento', 'procedimentoConcat', 'unidadeResponsavel', 'statusDemanda', 'relatoriosQtd']) out[key] = d[key] ?? '';
  return out;
}
function validateFilters(input = {}) {
  const keys = ['equipe', 'status', 'data', 'numeroProcedimento', 'tipoCrime', 'casoId', 'pesquisaGeral'];
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !keys.includes(k))) fail('invalid-argument', 'Filtros inválidos.');
  return Object.fromEntries(keys.map(k => [k, k === 'data' ? date(input[k], true) : k === 'casoId' ? (input[k] ? id(input[k], 'Caso') : '') : normalize(field(input[k], 'Filtro', 200, true))]));
}
function matches(d, f, crimes) {
  if (f.equipe && normalize(d.equipe) !== f.equipe || f.status && normalize(d.status) !== f.status || f.data && d.dataOcorrencia !== f.data) return false;
  if (f.numeroProcedimento && !normalize(d.procedimentoConcat).replace(/\s/g, '').includes(f.numeroProcedimento.replace(/\s/g, ''))) return false;
  if (f.tipoCrime) {
    const category = crimes.find(c => normalize(c.tipo) === f.tipoCrime);
    if (normalize(d.crimeTipo) !== f.tipoCrime && !category?.subtipos.some(s => normalize(s) === normalize(d.crimeTipo))) return false;
  }
  return !f.pesquisaGeral || normalize([d.status, d.statusDemanda, d.equipe, d.procedimentoConcat, d.nomeVitima, d.bairro, d.endereco, d.casoNome, d.crimeTipo, d.procedimentoInstaurado, d.observacoes].join(' ')).includes(f.pesquisaGeral);
}
module.exports = {fields, counters, reasons, pdfFields, uuid, validateMenus, validateDemand, procedureKey, publicDemand, validateFilters, matches};
