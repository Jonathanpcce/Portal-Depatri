import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json'};
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const target = url.pathname === '/' ? '/public/index.html' : url.pathname;
    const file = path.resolve(root, '.' + target);
    const relative = path.relative(root, file);
    if (!(relative.startsWith('public/') || relative.startsWith('test/preview.') || relative === 'config/crimes.json') || relative.includes('..')) {
      response.writeHead(404); response.end(); return;
    }
    response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-store'});
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Não encontrado'); }
});
server.listen(4173, '0.0.0.0', () => console.log('Prévia: http://localhost:4173/test/preview.html (dados de teste; sem Firebase).'));
