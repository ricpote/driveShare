export function getApiBaseUrl() {
  const override = localStorage.getItem('api_base_url');
  if (override) return override.replace(/\/$/, '');

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  if (host === '10.0.2.2') {
    return 'http://10.0.2.2:5000/api';
  }
  // Capacitor Android WebView normally uses localhost, but keep a sane fallback for LAN testing.
  return `http://${host}:5000/api`;
}
