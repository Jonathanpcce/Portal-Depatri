import {readFile, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const {projects} = JSON.parse(await readFile(path.join(root, '.firebaserc'), 'utf8'));
const projectId = projects.default;
const appId = process.argv[2];
const args = ['apps:sdkconfig', 'WEB'];
if (appId) args.push(appId);
args.push('--project', projectId, '--json', '--non-interactive');
const result = spawnSync(process.platform === 'win32' ? 'firebase.cmd' : 'firebase', args, {encoding: 'utf8', shell: false, cwd: root});
if (result.error || result.status !== 0) {
  throw new Error('Não foi possível ler a configuração Web. Instale a Firebase CLI, autentique-se com firebase login e confirme seu acesso ao projeto ' + projectId + '. Se houver mais de um aplicativo Web, passe seu appId como argumento.');
}
let response;
try { response = JSON.parse(result.stdout); } catch { throw new Error('A Firebase CLI não retornou JSON válido.'); }
if (response.status !== 'success') throw new Error('A Firebase CLI não conseguiu consultar o aplicativo.');
let config = response.result?.sdkConfig || response.result?.config || response.result;
if (typeof config === 'string') {
  try { config = JSON.parse(config); } catch { throw new Error('Configuração do aplicativo em formato inesperado.'); }
}
if (!config || ['apiKey', 'appId', 'authDomain'].some(key => typeof config[key] !== 'string' || !config[key]) || config.projectId !== projectId)
  throw new Error('A configuração retornada não corresponde a um aplicativo Web do projeto de destino.');
const publicKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
const publicConfig = Object.fromEntries(publicKeys.filter(key => typeof config[key] === 'string' && config[key]).map(key => [key, config[key]]));
await writeFile(path.join(root, 'public/firebase-config.json'), JSON.stringify(publicConfig, null, 2) + '\n');
console.log('Configuração pública do aplicativo salva para ' + projectId + '.');
