import {readdir, readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
let checked = 0;
async function check(dir) {
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    if (['node_modules', '.git', '.firebase', 'data', 'migration-output'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await check(file); continue; }
    if (/\.(js|cjs|mjs)$/.test(file)) {
      const result = spawnSync(process.execPath, ['--check', file], {encoding: 'utf8'});
      if (result.status) throw new Error(result.stderr);
      checked++;
    } else if (file.endsWith('.json')) JSON.parse(await readFile(file, 'utf8'));
  }
}
await check(root);
if (process.argv.includes('--production')) {
  const {projects} = JSON.parse(await readFile(path.join(root, '.firebaserc'), 'utf8'));
  const config = JSON.parse(await readFile(path.join(root, 'public/firebase-config.json'), 'utf8'));
  if (['apiKey', 'authDomain', 'projectId', 'appId'].some(k => !config[k] || /CONFIGURAR|ID_DO_PROJETO/.test(config[k])) || config.useEmulators)
    throw new Error('Configure o projeto Firebase real antes de publicar.');
  if (config.projectId.startsWith('demo-')) throw new Error('O projeto demo é exclusivo para testes.');
  if (config.projectId !== projects.default) throw new Error('O aplicativo Web não pertence ao projeto Firebase definido neste repositório.');
}
console.log(`Sintaxe e JSON verificados (${checked} arquivos JavaScript).`);
