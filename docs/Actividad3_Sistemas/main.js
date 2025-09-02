// main.js
import { saveSession, clearSession, getToken, getUsername, isAuthenticated } from './storage.js';
import { register, login, getProfile, updateData, listUsers } from './api.js';

// Rutas protegidas
const PROTECTED = new Set(['#profile', '#scores']);

// ---- Helpers UI / validación ----
function flash(el, text, kind = '') {
  el.className = `msg${kind ? ' ' + kind : ''}`;
  el.textContent = text || '';
}
function setBusy(form, busy) {
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = !!busy;
}
function validateUsername(u) {
  return typeof u === 'string' && /^[a-zA-Z0-9._-]{3,16}$/.test(u);
}
function validatePassword(p) {
  return typeof p === 'string' && p.length >= 4;
}
function validateScore(s) {
  return Number.isFinite(s) && s >= 0;
}
// Escape básico para innerHTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Verificación del token al iniciar
async function verifyTokenOnStart() {
  const token = getToken();
  const username = getUsername();
  if (!token || !username) return;
  try { await getProfile(username, token); }
  catch (err) { if (err.status === 401) clearSession(); }
}

// ---- Vistas ----
function mountLogin(root) {
  root.innerHTML = `
    <section class="card">
      <h2>Login</h2>
      <form id="loginForm" novalidate>
        <label>Usuario <input name="username" autocomplete="username" required /></label>
        <label>Contraseña <input name="password" type="password" autocomplete="current-password" required /></label>
        <button type="submit">Ingresar</button>
      </form>
      <p class="hint">¿No tienes cuenta? <a href="#register">Regístrate</a></p>
      <pre id="loginMsg" class="msg"></pre>
    </section>
  `;
  const form = root.querySelector('#loginForm');
  const msg = root.querySelector('#loginMsg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); flash(msg, '');
    const fd = new FormData(form);
    const username = (fd.get('username') || '').trim();
    const password = fd.get('password') || '';

    if (!validateUsername(username)) return flash(msg, 'Usuario inválido (3–16, letras/números/._-)', 'error');
    if (!validatePassword(password)) return flash(msg, 'Contraseña inválida (mínimo 4 caracteres)', 'error');

    try {
      setBusy(form, true);
      const { token, usuario } = await login(username, password);
      saveSession({ token, username: usuario?.username || username });
      form.reset();
      location.hash = '#profile';
    } catch (err) {
      flash(msg, err.data?.msg || err.message, 'error');
    } finally {
      setBusy(form, false);
    }
  });
}

function mountRegister(root) {
  root.innerHTML = `
    <section class="card">
      <h2>Registro</h2>
      <form id="registerForm" novalidate>
        <label>Usuario <input name="username" required /></label>
        <label>Contraseña <input name="password" type="password" required /></label>
        <button type="submit">Crear cuenta</button>
      </form>
      <pre id="registerMsg" class="msg"></pre>
    </section>
  `;
  const form = root.querySelector('#registerForm');
  const msg = root.querySelector('#registerMsg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); flash(msg, '');
    const fd = new FormData(form);
    const username = (fd.get('username') || '').trim();
    const password = fd.get('password') || '';

    if (!validateUsername(username)) return flash(msg, 'Usuario inválido (3–16, letras/números/._-)', 'error');
    if (!validatePassword(password)) return flash(msg, 'Contraseña inválida (mínimo 4 caracteres)', 'error');

    try {
      setBusy(form, true);
      await register(username, password);
      flash(msg, 'Usuario creado. Ahora puedes iniciar sesión.', 'success');
      form.reset();
    } catch (err) {
      flash(msg, err.data?.msg || err.message, 'error');
    } finally {
      setBusy(form, false);
    }
  });
}

function mountProfile(root) {
  if (!isAuthenticated()) { location.hash = '#login'; return; }
  root.innerHTML = `
    <section class="card">
      <h2>Perfil</h2>
      <div id="profileContent"></div>

      <h3>Actualizar score</h3>
      <form id="scoreForm" novalidate>
        <label>Nuevo score <input name="score" type="number" min="0" step="1" required /></label>
        <button type="submit">Guardar</button>
      </form>
      <pre id="profileMsg" class="msg"></pre>
    </section>
  `;

  const msg = root.querySelector('#profileMsg');
  const content = root.querySelector('#profileContent');
  const token = getToken();
  const username = getUsername();

  const render = (usuario) => {
  // preferimos el nombre guardado en sesión; si no está, usamos el que llegue del servidor
  const nameFromSession = getUsername();
  const nameFromServer  = usuario?.username;
  const name  = nameFromSession || nameFromServer || '(sin nombre)';
  const score = Number.isFinite(usuario?.data?.score) ? usuario.data.score : 0;

  content.innerHTML = `
    <table class="table">
      <tbody>
        <tr><th>Nombre del usuario</th><td>${esc(name)}</td></tr>
        <tr><th>Puntaje</th><td>${score}</td></tr>
      </tbody>
    </table>
  `;
};


  (async () => {
    try {
      const { usuario } = await getProfile(username, token);
      render(usuario);
    } catch (err) {
      flash(msg, err.data?.msg || err.message, 'error');
      if (err.status === 401) { clearSession(); location.hash = '#login'; }
    }
  })();

  const scoreForm = root.querySelector('#scoreForm');
  scoreForm.addEventListener('submit', async (e) => {
    e.preventDefault(); flash(msg, '');
    const score = Number(new FormData(scoreForm).get('score'));
    if (!validateScore(score)) return flash(msg, 'Score inválido (número ≥ 0)', 'error');

    try {
      setBusy(scoreForm, true);
      const { usuario } = await updateData(username, { score }, token);
      render(usuario);
      scoreForm.reset();
      flash(msg, 'Score actualizado.', 'success');
    } catch (err) {
      flash(msg, err.data?.msg || err.message, 'error');
      if (err.status === 401) { clearSession(); location.hash = '#login'; }
    } finally {
      setBusy(scoreForm, false);
    }
  });
}
function mountScores(root) {
  if (!isAuthenticated()) { location.hash = '#login'; return; }
  root.innerHTML = `
    <section class="card">
      <h2>Tabla de Puntajes</h2>
      <form id="scoresForm" class="inline">
        <label>Máximo usuarios
          <input name="limit" type="number" min="1" value="20" />
        </label>
        <button type="submit">Actualizar</button>
      </form>
      <table class="table" id="scoresTable">
        <thead><tr><th>#</th><th>Usuario</th><th>Score</th></tr></thead>
        <tbody></tbody>
      </table>
      <pre id="scoresMsg" class="msg"></pre>
    </section>
  `;

  const form = root.querySelector('#scoresForm');
  const tbody = root.querySelector('#scoresTable tbody');
  const msg = root.querySelector('#scoresMsg');

  async function load() {
    flash(msg, 'Cargando...'); 
    tbody.innerHTML = '';

    // Clamp del límite para no colgar la UI
    const fd = new FormData(form);
    const limitRaw = Number(fd.get('limit') || 20);
    const limit = Math.max(1, Math.min(100, limitRaw));

    try {
      setBusy(form, true);

      // Pedimos ya descendente al servidor y además reordenamos en cliente por robustez
      const { usuarios } = await listUsers({ limit, sort: true }, getToken());
      const arr = Array.isArray(usuarios) ? usuarios.slice() : [];

      // Siempre DESC (mayor a menor)
      arr.sort((a, b) => (b?.data?.score ?? 0) - (a?.data?.score ?? 0));

      if (!arr.length) {
        flash(msg, 'No hay usuarios para mostrar.');
        return;
      }

      arr.forEach((u, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i + 1}</td><td>${u?.username ?? '(sin nombre)'}</td><td>${u?.data?.score ?? 0}</td>`;
        tbody.appendChild(tr);
      });

      flash(msg, `Mostrando ${arr.length} usuario(s).`);
    } catch (err) {
      flash(msg, (err.status ? `HTTP ${err.status} - ` : '') + (err.data?.msg || err.message), 'error');
      if (err.status === 401) { clearSession(); location.hash = '#login'; }
    } finally {
      setBusy(form, false);
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); load(); });
  load();
}


// ---- Router ----
const routes = {
  '#login': mountLogin,
  '#register': mountRegister,
  '#profile': mountProfile,
  '#scores': mountScores,
};

function render() {
  const root = document.getElementById('app');
  let hash = location.hash || (isAuthenticated() ? '#profile' : '#login');
  if (PROTECTED.has(hash) && !isAuthenticated()) {
    hash = '#login';
    if (location.hash !== '#login') location.hash = '#login';
  }
  (routes[hash] || mountLogin)(root);
}

function wireLogout() {
  const btn = document.getElementById('logoutBtn');
  btn?.addEventListener('click', () => { clearSession(); location.hash = '#login'; });
}

// ---- Boot ----
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', async () => {
  wireLogout();
  await verifyTokenOnStart();
  render();
});
