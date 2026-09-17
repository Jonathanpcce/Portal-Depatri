import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import core from '../functions/src/demands-core.cjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFile(path.join(root, name), 'utf8');
const html = await read('test/preview.html'), css = await read('public/styles.css');
const sources = ['public/cases-store.js', 'public/cases-ui.js', 'public/demands-store.js', 'public/demands-ui.js', 'test/preview.js'];
const catalog = JSON.parse(await read('config/crimes.json'));
const schema = {campos: core.fields, contadores: core.counters, podeEditar: true, menus: {
  status: ['EM ANDAMENTO', 'CONCLUÍDA'], unidade: ['UNIDADE DE TESTE'], equipe: ['EQUIPE DE TESTE'], tipoOcorrencia: ['B.O', 'INQUERITO POLICIAL'],
  crimeTipo: catalog.tipos.flatMap(c => c.subtipos.length ? c.subtipos : [c.tipo]), motivos: core.reasons
}};
await writeFile(path.join(root, 'test/preview.schema.json'), JSON.stringify(schema, null, 2) + '\n');
let script = '';
for (const source of sources) {
  let content = await read(source);
  content = content.replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  if (source === 'test/preview.js') content = content.replace("const {tipos} = await (await fetch('/config/crimes.json')).json();", `const {tipos} = ${JSON.stringify(catalog)};`);
  if (source === 'test/preview.js') content = content.replace("const schema = await (await fetch('/test/preview.schema.json')).json();", `const schema = ${JSON.stringify(schema)};`);
  script += content + '\n';
}
const preview = html.replace('<link rel="stylesheet" href="/public/styles.css">', '<style>' + css + '</style>')
  .replace('<script type="module" src="/test/preview.js"></script>', '<script type="module">\n' + script.replace(/<\/script/gi, '<\\/script') + '</script>');
await writeFile(path.join(root, 'PREVIA_CASOS.html'), preview);
console.log('PREVIA_CASOS.html criada: casos e demandas com dados fictícios, sem conexão com Firebase.');
