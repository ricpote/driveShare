import { createRide, loginUser, registerUser } from './lib/api.js';
import { getCurrentUser, parseJwt, saveSession } from './lib/session.js';
import { hideMessage, showMessage } from './lib/ui.js';

const allowedDomains = ['campus.fct.unl.pt', 'fct.unl.pt'];

function isUniversityEmail(email) {
  if (!email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.includes(domain);
}

function wireTabs() {
  const tabs = document.querySelectorAll('.tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (!tabs.length || !loginForm || !registerForm) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      const selected = tab.dataset.tab;
      loginForm.classList.toggle('active', selected === 'login');
      registerForm.classList.toggle('active', selected === 'register');
      hideMessage('message');
    });
  });
}

async function setupAuthPage() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (!loginForm || !registerForm) return;

  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('token');
  if (tokenFromUrl) {
    const jwtData = parseJwt(tokenFromUrl) || {};
    saveSession(tokenFromUrl, {
      id: jwtData.userId || '',
      email: jwtData.email || '',
      name: jwtData.email?.split('@')[0] || 'Utilizador',
      phone: ''
    });
    window.location.href = 'dashboard.html';
    return;
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const confirmPassword = document.getElementById('registerConfirmPassword').value.trim();

    if (!isUniversityEmail(email)) return showMessage('message', 'Usa um email universitário válido da FCT.', 'error');
    if (!/^\d{9}$/.test(phone)) return showMessage('message', 'Introduz um número de telemóvel com 9 dígitos.', 'error');
    if (password.length < 6) return showMessage('message', 'A palavra-passe deve ter pelo menos 6 caracteres.', 'error');
    if (password !== confirmPassword) return showMessage('message', 'As palavras-passe não coincidem.', 'error');

    try {
      await registerUser({ name, email, phone, password });
      // cache useful profile data because backend login only returns token
      localStorage.setItem('uniride_current_user', JSON.stringify({ name, email, phone }));
      showMessage('message', 'Conta criada. Faz login para continuar.', 'success');
      document.querySelector('[data-tab="login"]')?.click();
      document.getElementById('loginEmail').value = email;
    } catch (error) {
      showMessage('message', error.message, 'error');
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();

    try {
      await loginUser({ email, password });
      showMessage('message', 'Login efetuado com sucesso.', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
    } catch (error) {
      showMessage('message', error.message, 'error');
    }
  });
}

function setupCreateRidePage() {
  const rideForm = document.getElementById('rideForm');
  if (!rideForm) return;
  const currentUser = getCurrentUser();
  if (!currentUser?.email) {
    window.location.href = 'index.html';
    return;
  }

  const welcomeText = document.getElementById('welcomeText');
  if (welcomeText) welcomeText.textContent = `Olá, ${currentUser.name || currentUser.email}.`;

  const createRideMapEl = document.getElementById('createRideMap');
  const originInput = document.getElementById('origin');
  const findOriginBtn = document.getElementById('findOriginBtn');
  let createRideMap = null;
  let selectedMarker = null;

  async function geocodeOrigin(query) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pt&q=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json', 'Accept-Language': 'pt-PT,pt;q=0.9' }
    });
    if (!response.ok) throw new Error('Falha a procurar a origem.');
    const results = await response.json();
    if (!results.length) throw new Error('Não foi possível localizar essa origem no mapa.');
    return results[0];
  }

  function setPickupPoint(lat, lng, label = 'Ponto de partida') {
    document.getElementById('startLat').value = Number(lat).toFixed(6);
    document.getElementById('startLng').value = Number(lng).toFixed(6);
    if (!createRideMap || typeof L === 'undefined') return;
    if (selectedMarker) {
      selectedMarker.setLatLng([lat, lng]);
    } else {
      selectedMarker = L.marker([lat, lng]).addTo(createRideMap);
    }
    selectedMarker.bindPopup(`<strong>${label}</strong>`);
    createRideMap.setView([lat, lng], 14);
  }

  async function searchTypedOrigin() {
    const query = originInput?.value.trim();
    if (!query) return showMessage('rideMessage', 'Escreve uma origem para a localizar no mapa.', 'error');
    try {
      hideMessage('rideMessage');
      findOriginBtn.disabled = true;
      findOriginBtn.textContent = 'A procurar...';
      const result = await geocodeOrigin(query);
      originInput.value = result.display_name || query;
      setPickupPoint(Number(result.lat), Number(result.lon), result.display_name || query);
      showMessage('rideMessage', 'Origem encontrada no mapa.', 'success');
    } catch (error) {
      showMessage('rideMessage', error.message || 'Não foi possível localizar essa origem.', 'error');
    } finally {
      findOriginBtn.disabled = false;
      findOriginBtn.textContent = 'Encontrar no mapa';
    }
  }

  if (createRideMapEl && typeof L !== 'undefined') {
    createRideMap = L.map('createRideMap').setView([38.661, -9.204], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(createRideMap);
    L.marker([38.661, -9.204]).addTo(createRideMap).bindPopup('FCT NOVA');
    createRideMap.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      setPickupPoint(lat, lng);
    });
  }

  findOriginBtn?.addEventListener('click', searchTypedOrigin);

  rideForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const origin = document.getElementById('origin').value.trim();
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const seats = Number(document.getElementById('seats').value);
    if (!origin || !date || !time || !seats) {
      return showMessage('rideMessage', 'Preenche os campos obrigatórios.', 'error');
    }

    try {
      const isoDate = new Date(`${date}T${time}:00`).toISOString();
      await createRide({ from: origin, to: 'FCT NOVA', date: isoDate, totalSeats: seats });
      showMessage('rideMessage', 'Boleia criada com sucesso.', 'success');
      rideForm.reset();
      if (selectedMarker && createRideMap) createRideMap.removeLayer(selectedMarker), selectedMarker = null;
    } catch (error) {
      showMessage('rideMessage', error.message, 'error');
    }
  });
}

wireTabs();
setupAuthPage();
setupCreateRidePage();
