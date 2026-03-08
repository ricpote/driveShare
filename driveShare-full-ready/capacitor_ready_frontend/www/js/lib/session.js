const TOKEN_KEY = 'uniride_auth_token';
const SESSION_KEY = 'uniride_current_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(token, user = {}) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user || {}));
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function ensureAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'index.html';
    return null;
  }
  return token;
}
