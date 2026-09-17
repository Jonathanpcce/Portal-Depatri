'use strict';
const {normalize, fail, field} = require('./cases-core.cjs');
function demandMenusFromLegacy(source) {
  let rows = source?.DB_CONFIG || source;
  if (!Array.isArray(rows) || !rows.length) fail('invalid-argument', 'Informe a aba DB_CONFIG como objetos ou matriz com cabeçalho.');
  if (Array.isArray(rows[0])) {
    const headers = rows[0].map(h => normalize(h));
    if (!headers.includes('CATEGORIA') || !headers.includes('NOME')) fail('invalid-argument', 'DB_CONFIG precisa de CATEGORIA e NOME.');
    rows = rows.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
  }
  const groups = {'STATUS': 'status', 'UNIDADE RESPONSAVEL': 'unidade', 'EQUIPE': 'equipe', 'TIPO DE OCORRENCIA': 'tipoOcorrencia'};
  const menus = {schemaVersion: 1, status: [], unidade: [], equipe: [], tipoOcorrencia: []};
  for (const row of rows) {
    const key = groups[normalize(row.CATEGORIA)]; if (!key) continue;
    const value = key === 'equipe' ? row.VALOR_EXTRA || row.NOME : row.NOME;
    if (!value) continue; const text = field(String(value), 'Opção de DB_CONFIG');
    if (!menus[key].some(v => normalize(v) === normalize(text))) menus[key].push(text);
  }
  for (const key of ['status', 'unidade', 'tipoOcorrencia']) if (!menus[key].length) fail('invalid-argument', `Nenhuma opção de ${key} encontrada em DB_CONFIG.`);
  return menus;
}
module.exports = {demandMenusFromLegacy};
