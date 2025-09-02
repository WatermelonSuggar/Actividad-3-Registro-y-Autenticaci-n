// api.js
const BASE = 'https://sid-restapi.onrender.com';

async function http(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['x-token'] = token;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data?.msg || `HTTP ${res.status}`);
    err.status = res.status; err.data = data; throw err;
  }
  return data;
}

// 1) Registro
export function register(username, password) {
  return http('/api/usuarios', { method: 'POST', body: { username, password } });
}

// 2) Autenticación
export function login(username, password) {
  return http('/api/auth/login', { method: 'POST', body: { username, password } });
}

// 3) Obtener perfil
export function getProfile(username, token) {
  const q = new URLSearchParams({ username });
  return http('/api/usuarios?' + q.toString(), { token });
}

// 4) Actualizar data
export function updateData(username, data, token) {
  return http('/api/usuarios', { method: 'PATCH', token, body: { username, data } });
}

// 5) Listar usuarios
export function listUsers({ limit, skip, sort } = {}, token) {
  const q = new URLSearchParams();
  if (limit != null) q.set('limit', String(limit));
  if (skip != null) q.set('skip', String(skip));
  if (sort != null) q.set('sort', String(!!sort));
  const qs = q.toString();
  return http('/api/usuarios' + (qs ? '?' + qs : ''), { token });
}
