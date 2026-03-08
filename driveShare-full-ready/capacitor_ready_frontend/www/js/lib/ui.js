export function showMessage(elementId, text, type = 'error') {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.textContent = text;
  box.className = `message ${type}`;
}

export function hideMessage(elementId) {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.textContent = '';
  box.className = 'message hidden';
}

export function formatRideDate(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
