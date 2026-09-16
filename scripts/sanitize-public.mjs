import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {parse} from 'acorn';

const root = fileURLToPath(new URL('../', import.meta.url));
const documents = ['MAESTRO.gs', 'DASHBOARD.gs'];
const identifiers = new Map();
const texts = new Map();
const nodes = new Map();
function visit(node, parent, out) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'Literal' && typeof node.value === 'string' && /^[\w-]{25,}$/.test(node.value)
    && /[a-z]/.test(node.value) && /[A-Z]/.test(node.value) && /[0-9]/.test(node.value)) {
    const key = parent?.type === 'Property' ? parent.key.name || parent.key.value : null;
    if (key && /_ID$/.test(key) && !identifiers.has(node.value)) identifiers.set(node.value, String(key));
    out.push(node);
  }
  for (const [key, child] of Object.entries(node)) {
    if (key === 'loc') continue;
    if (Array.isArray(child)) child.forEach(value => visit(value, node, out));
    else if (child && typeof child === 'object') visit(child, node, out);
  }
}
for (const file of documents) {
  const text = await readFile(path.join(root, 'apps-script', file), 'utf8');
  const candidates = []; visit(parse(text, {ecmaVersion: 'latest'}), null, candidates);
  texts.set(file, text); nodes.set(file, candidates);
}
const keys = [...identifiers.values()];
if (new Set(keys).size !== keys.length) throw new Error('Dois recursos diferentes usam a mesma chave de configuração.');
for (const file of documents) {
  let text = texts.get(file);
  for (const node of nodes.get(file).sort((a, b) => b.start - a.start)) {
    const key = identifiers.get(node.value);
    if (!key) throw new Error('Identificador interno sem chave reconhecida em ' + file);
    text = text.slice(0, node.start) + `obterConfiguracaoPrivadaPortal_(${JSON.stringify('DEPATRI_' + key)})` + text.slice(node.end);
  }
  text = text.replace(/^([ \t]*\/\/[ \t]*ID:)[ \t]*[A-Za-z0-9_-]{25,}[ \t\r]*$/gm, '$1 configurar nas propriedades do projeto');
  if (file === 'MAESTRO.gs' && !text.includes('function obterConfiguracaoPrivadaPortal_(')) {
    text += `\n// Recursos internos ficam nas propriedades do projeto Apps Script.\nfunction obterConfiguracaoPrivadaPortal_(chave) {\n  var valor = PropertiesService.getScriptProperties().getProperty(chave);\n  if (!valor || !String(valor).trim()) throw new Error('Configure a propriedade do projeto ' + chave + ' antes de usar o Portal.');\n  return String(valor).trim();\n}\n`;
  }
  parse(text, {ecmaVersion: 'latest'});
  await writeFile(path.join(root, 'apps-script', file), text);
}
if (keys.length) {
  await writeFile(path.join(root, 'docs/APPS_SCRIPT_PROPERTIES.example.json'), JSON.stringify(Object.fromEntries(keys.sort().map(key => ['DEPATRI_' + key, 'CONFIGURAR_NO_APPS_SCRIPT'])), null, 2) + '\n');
}
const manifestPath = path.join(root, 'docs/ARQUIVOS.json');
const report = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const file of documents) {
  report[file].configuracaoPrivadaExternalizada = true;
  report[file].sha256Entrega = createHash('sha256').update(await readFile(path.join(root, 'apps-script', file))).digest('hex');
  report[file].alterado = true;
}
await writeFile(manifestPath, JSON.stringify(report, null, 2) + '\n');
console.log('Referências internas externalizadas para propriedades do Apps Script.');
