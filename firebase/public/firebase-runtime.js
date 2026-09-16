import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth, setPersistence, browserSessionPersistence, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, connectAuthEmulator} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFunctions, httpsCallable, connectFunctionsEmulator} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js';
import {CasesStore} from './cases-store.js';
import {mountCases} from './cases-ui.js';

export async function start(config) {
  const app = initializeApp(config), auth = getAuth(app), functions = getFunctions(app, 'southamerica-east1');
  if (config.useEmulators === true && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
  await setPersistence(auth, browserSessionPersistence);
  const status = document.querySelector('#status'), login = document.querySelector('#login');
  const root = document.querySelector('#cases'), logout = document.querySelector('#signout');
  const loginForm = document.querySelector('#login-form'), message = document.querySelector('#login-message');
  const store = new CasesStore(async (name, payload) => {
    if (!auth.currentUser) throw new Error('Entre no portal para continuar.');
    try { return (await httpsCallable(functions, name)(payload)).data; }
    catch (error) {
      const known = ['already-exists', 'invalid-argument', 'permission-denied', 'unauthenticated', 'not-found', 'failed-precondition'];
      if (known.some(code => error.code === `functions/${code}`)) throw error;
      throw new Error('Não foi possível concluir. Confira a conexão e tente novamente.');
    }
  });
  let view, generation = 0;
  onAuthStateChanged(auth, async user => {
    const current = ++generation;
    view?.destroy(); view = null; store.reset(); root.hidden = true;
    login.hidden = !!user; logout.hidden = !user; status.textContent = user ? 'Carregando casos…' : '';
    if (!user) return;
    try {
      await store.refresh(); if (current !== generation) return;
      view = mountCases(root, store); root.hidden = false; status.textContent = '';
    } catch (error) { if (current === generation) status.textContent = error.message; }
  });
  loginForm.onsubmit = async event => {
    event.preventDefault(); message.textContent = 'Entrando…';
    const submit = loginForm.querySelector('button'); submit.disabled = true;
    try {
      await signInWithEmailAndPassword(auth, loginForm.elements.email.value.trim(), loginForm.elements.password.value);
      message.textContent = ''; loginForm.elements.password.value = '';
    } catch { message.textContent = 'Não foi possível entrar. Confira o e-mail, a senha e sua conexão.'; }
    finally { submit.disabled = false; }
  };
  logout.onclick = async () => { try { await signOut(auth); } catch { status.textContent = 'Não foi possível sair. Tente novamente.'; } };
  return {store, auth};
}
