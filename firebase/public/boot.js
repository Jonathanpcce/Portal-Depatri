const status = document.querySelector('#status');
try {
  const response = await fetch('./firebase-config.json', {cache: 'no-store'});
  if (!response.ok) throw new Error('Não foi possível carregar a configuração do portal.');
  const config = await response.json();
  if (!config.projectId || !config.apiKey || !config.appId || !config.authDomain) {
    status.textContent = 'A conexão deste portal com o Firebase ainda precisa ser configurada.';
  } else {
    const {start} = await import('./firebase-runtime.js');
    await start(config);
  }
} catch {
  status.textContent = 'Não foi possível conectar o portal. Confira a conexão e atualize a página.';
}
