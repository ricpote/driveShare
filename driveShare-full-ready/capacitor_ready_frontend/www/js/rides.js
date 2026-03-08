import { getRides } from './lib/api.js';
import { ensureAuth, getCurrentUser } from './lib/session.js';
import { escapeHtml, formatRideDate } from './lib/ui.js';

ensureAuth();
const currentUser = getCurrentUser();
const container = document.getElementById('ridesContainer');
const FCT = { lat: 38.661, lng: -9.204 };
const map = L.map('map').setView([FCT.lat, FCT.lng], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
L.marker([FCT.lat, FCT.lng]).addTo(map).bindPopup('<b>FCT NOVA</b><br>Destino das boleias');

const rideEntries = [];

function renderEmpty(text) {
  container.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function focusRide(card, marker, ride, soft = false) {
  rideEntries.forEach((entry) => {
    entry.card.classList.remove('ride-card-active');
    entry.route.setStyle({ opacity: 0.25, weight: 4 });
  });
  card.classList.add('ride-card-active');
  const current = rideEntries.find((entry) => entry.marker === marker);
  if (current) current.route.setStyle({ opacity: 0.8, weight: 5 });
  map.flyTo([ride.lat, ride.lng], soft ? 12 : 13, { duration: 0.8 });
  marker.openPopup();
}

async function init() {
  try {
    const rides = await getRides();
    const visibleRides = rides.filter((ride) => String(ride.driver) !== String(currentUser.id));
    if (!visibleRides.length) return renderEmpty('Ainda não existem boleias disponíveis.');

    visibleRides.sort((a, b) => new Date(a.date) - new Date(b.date));
    visibleRides.forEach((ride) => {
      const lat = 38.661;
      const lng = -9.204;
      const card = document.createElement('article');
      card.className = 'ride-card';
      card.innerHTML = `
        <h3>${escapeHtml(ride.from)} → ${escapeHtml(ride.to)}</h3>
        <div class="ride-meta">Condutor ${escapeHtml(String(ride.driver).slice(-6))} · Destino: ${escapeHtml(ride.to)}</div>
        <p>Partida: <strong>${escapeHtml(formatRideDate(ride.date))}</strong></p>
        <p>Lugares disponíveis: <strong>${escapeHtml(ride.availableSeats)}</strong></p>
        <button class="inline-btn" data-ride-id="${escapeHtml(ride._id)}">Pedir boleia</button>
      `;
      container.appendChild(card);

      const marker = L.marker([lat, lng]).addTo(map);
      const route = L.polyline([[lat, lng], [FCT.lat, FCT.lng]], { color: '#136f63', weight: 4, opacity: 0.35, dashArray: '8 8' }).addTo(map);
      marker.bindPopup(`<b>${escapeHtml(ride.from)}</b><br>${escapeHtml(formatRideDate(ride.date))}<br>Lugares: ${escapeHtml(ride.availableSeats)}`);
      rideEntries.push({ card, marker, route, ride: { ...ride, lat, lng } });
      card.addEventListener('click', (event) => {
        if (event.target.matches('.inline-btn')) return;
        focusRide(card, marker, { ...ride, lat, lng });
      });
      card.addEventListener('mouseenter', () => focusRide(card, marker, { ...ride, lat, lng }, true));
    });

    container.addEventListener('click', (event) => {
      if (event.target.matches('.inline-btn')) {
        const rideId = event.target.dataset.rideId;
        window.location.href = `ride-details.html?id=${encodeURIComponent(rideId)}`;
      }
    });
  } catch (error) {
    renderEmpty(error.message || 'Não foi possível carregar as boleias.');
  }
}

init();
