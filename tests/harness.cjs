const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {randomUUID} = require('node:crypto');
const {parse} = require('acorn');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'apps-script', name), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
class Sheet {
  constructor(rows = []) { this.rows = structuredClone(rows); this.maxColumns = 26; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(0, ...this.rows.map(row => { let end = row.length; while (end && (row[end - 1] === '' || row[end - 1] === undefined)) end--; return end; })); }
  getMaxColumns() { return this.maxColumns; }
  insertColumnsAfter(index, count) { if (index !== this.maxColumns) throw new Error('Expansão inesperada'); this.maxColumns += count; }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  getRange(row, col, height = 1, width = 1) {
    const sheet = this;
    return {
      getValues() { return Array.from({length: height}, (_, i) => Array.from({length: width}, (_, j) => sheet.rows[row + i - 1]?.[col + j - 1] ?? '')); },
      setValues(values) {
        if (values.length !== height || values.some(r => r.length !== width)) throw new Error('Dimensões de escrita inválidas');
        values.forEach((valuesRow, i) => { sheet.rows[row + i - 1] ||= []; valuesRow.forEach((v, j) => { sheet.rows[row + i - 1][col + j - 1] = v; }); });
      },
      setValue(value) { this.setValues([[value]]); }
    };
  }
  appendRow(row) { this.rows.push([...row]); }
}
const caseHeaders = ['ID_CASO', 'NOME_CASO', 'TIPO_CASO', 'VEÍCULO', 'CASO_ESPECIFICO', 'DESCRICAO'];
const demandHeaders = ['TIMESTAMP', 'USUARIO', 'DATA_DA_OCORRENCIA', 'UNIDADE_RESPONSAVEL', 'TIPO_PROCEDIMENTO', 'NUMERO_PROCEDIMENTO', 'PROCEDIMENTO_CONCAT', 'CRIME_TIPO', 'NOME_VITIMA', 'ENDERECO_OCORRENCIA', 'BAIRRO', 'CASO', 'STATUS_DEMANDA', 'EQUIPE_DIRETORIA', 'STATUS', 'OBSERVACOES', 'COLUNA_EXTERNA'];
function setupBackend({caseRows = [], specificRows = [], demands = [], addIdColumn = false} = {}) {
  const types = [
    ['FURTO', 'FURTO DE VEICULO'], ['FURTO', 'FURTO A RESIDENCIA'], ['ROUBO', 'ROUBO A PESSOA'], ['ROUBO', 'ROUBO DE VEICULO'], ['OUTROS', '']
  ];
  const users = [['Login', 'Nome', 'Email', 'Cargo', 'Perfil', 'Lotação', 'Assinatura', 'Matrícula'],
    ['nuip', 'Operador de teste', 'teste@example.invalid', 'OIP', 'NUIP', 'DEPATRI'],
    ['admin', 'Administrador de teste', 'admin@example.invalid', 'OIP', 'ADMIN', 'DEPATRI'],
    ['leitor', 'Consulta de teste', 'leitor@example.invalid', 'OIP', 'DELEGACIA', 'DRFV']];
  const headers = demandHeaders.concat(addIdColumn ? ['CASO_ID'] : []);
  const sheets = {
    USUARIOS: new Sheet(users),
    DB_CONFIG: new Sheet([['CATEGORIA', 'NOME', 'VALOR_EXTRA'], ...types.map(([a, b]) => ['CRIME_PRODUTIVIDADE', a, b]),
      ['STATUS', 'PENDENTE', ''], ['UNIDADE RESPONSÁVEL', 'DRFV', ''], ['UNIDADE RESPONSÁVEL', 'DAS', ''], ['TIPO DE OCORRÊNCIA', 'BO', '']]),
    INVEST_CASOS: new Sheet([caseHeaders, ...caseRows]), CASO_ESPECIFICO: new Sheet([['ID_CASO', 'CASO_ESPECIFICO'], ...specificRows]),
    DEMANDAS_ATIVAS: new Sheet([headers, ...demands.map(d => headers.map(h => d[h] ?? ''))])
  };
  const book = {getSheetByName: name => sheets[name] || null, insertSheet: name => (sheets[name] = new Sheet())};
  const lock = {locked: false, waitLock() { if (this.locked) throw new Error('Lock reentrante'); this.locked = true; }, releaseLock() { this.locked = false; }};
  const context = vm.createContext({PropertiesService: {getScriptProperties: () => ({getProperty: key => 'test-resource-' + key})},
    SpreadsheetApp: {openById: () => book, flush() {}}, LockService: {getScriptLock: () => lock},
    Utilities: {getUuid: randomUUID, formatDate(date, tz, pattern) {
      const d = new Date(date), year = String(d.getUTCFullYear()), month = String(d.getUTCMonth() + 1).padStart(2, '0'), day = String(d.getUTCDate()).padStart(2, '0');
      return pattern.replace('yyyy', year).replace('MM', month).replace('dd', day);
    }}, console, Logger: {log() {}}, Date});
  vm.runInContext(read('MAESTRO.gs'), context);
  return {api: context, sheets, lock};
}
function setupFrontend(backend) {
  const dom = new JSDOM(read('INDEX.html'), {url: 'https://portal.example.invalid', runScripts: 'outside-only'});
  const window = dom.window;
  window.alert = message => { throw new Error('Alerta: ' + message); };
  window.usuarioAtual = {login: 'nuip', perfil: 'NUIP', delegacia: 'DEPATRI'};
  const pending = [], calls = [];
  function runner(success, failure) {
    return new Proxy({}, {get(_, name) {
      if (name === 'withSuccessHandler') return handler => runner(handler, failure);
      if (name === 'withFailureHandler') return handler => runner(success, handler);
      return (...args) => {
        calls.push({name, args});
        pending.push(() => { try { const value = backend.api[name](...plain(args)); success?.(plain(value)); } catch (error) { if (failure) failure(error); else throw error; } });
      };
    }});
  }
  window.google = {script: {run: runner()}};
  const code = read('JAVASCRIPT.html').replace(/^\s*<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');
  const ast = parse(code, {ecmaVersion: 'latest'});
  const neededVariables = ['CASOS_CADASTRO_STATE', 'DEMANDAS_ATIVAS_STATE', 'DEMANDAS_ATIVAS_MOTIVOS_DIVERSOS_FRONT', 'contadoresConfig', 'DEPATRI_MODO_CASOS', 'DEPATRI_USUARIO_PERSISTENTE_KEY'];
  const selected = ast.body.filter(n => n.type === 'FunctionDeclaration' || n.type === 'VariableDeclaration' && n.declarations.some(d => neededVariables.includes(d.id.name)));
  window.eval(selected.map(n => code.slice(n.start, n.end)).join('\n'));
  const flush = () => { let max = 50; while (pending.length && max--) pending.shift()(); if (pending.length) throw new Error('Ciclo inesperado de RPCs'); };
  return {dom, window, document: window.document, pending, calls, flush};
}
module.exports = {setupBackend, setupFrontend, read, plain, caseHeaders, demandHeaders};
