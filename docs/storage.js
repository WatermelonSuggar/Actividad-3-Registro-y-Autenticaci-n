const STORAGE_KEYS = { token: 'sid_token', username: 'sid_username' };

export function saveSession({ token, username }) {
  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(STORAGE_KEYS.username, username);
}
export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.username);
}
export function getToken() { return localStorage.getItem(STORAGE_KEYS.token) || ''; }
export function getUsername() { return localStorage.getItem(STORAGE_KEYS.username) || ''; }
export function isAuthenticated() { return Boolean(getToken()); }
