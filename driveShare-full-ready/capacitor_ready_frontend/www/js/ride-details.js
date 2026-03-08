import { getRideById, requestRide } from './lib/api.js';
import { ensureAuth } from './lib/session.js';
import { escapeHtml, formatRideDate } from './lib/ui.js';

ensureAuth();
const params = new URLSearchParams(window.location.search);
const rideId = params.get('id');
const detailsCard = document.getElementById('rideDetailsCard');

async function init() {
  if (!rideId) {
    detailsCard.innerHTML = '<div class="empty-state">Não foi indicado nenhum ID de boleia.</div>';
    return;
  }

  try {
    const ride = await getRideById(rideId);
    if (!ride) {
      detailsCard.innerHTML = '<div class="empty-state">Não foi possível encontrar esta boleia.</div>';
      return;
    }

    detailsCard.innerHTML = `
      <div class="ride-details-header">
        <div>
          <p class="details-eyebrow">Boleia disponível</p>
          <h2>${escapeHtml(ride.from)} → ${escapeHtml(ride.to)}</h2>
        </div>
        <span class="details-badge">${escapeHtml(formatRideDate(ride.date))}</span>
      </div>
      <div class="details-grid">
        <div class="details-panel">
          <h3>Condutor</h3>
          <div class="contact-item"><span class="info-label">ID</span><strong>${escapeHtml(String(ride.driver))}</strong></div>
        </div>
        <div class="details-panel">
          <h3>Detalhes da boleia</h3>
          <div class="contact-item"><span class="info-label">Origem</span><strong>${escapeHtml(ride.from)}</strong></div>
          <div class="contact-item"><span class="info-label">Destino</span><strong>${escapeHtml(ride.to)}</strong></div>
          <div class="contact-item"><span class="info-label">Lugares disponíveis</span><strong>${escapeHtml(ride.availableSeats)}</strong></div>
        </div>
      </div>
      <div class="details-comment-box">
        <span class="info-label">Ponto de recolha</span>
        <p>Escolhe no mapa onde queres ser apanhado. O backend guarda apenas lat/lng do pedido.</p>
      </div>
      <div style="margin-top:20px;"><button id="requestRideBtn" class="primary-btn">Pedir boleia</button></div>
      <div id="rideMap" style="height:300px;margin-top:20px;border-radius:12px;"></div>
    `;

    const baseLat = 38.661;
    const baseLng = -9.204;
    const map = L.map('rideMap').setView([baseLat, baseLng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    L.marker([baseLat, baseLng]).addTo(map).bindPopup('FCT NOVA');
    let pickupMarker = null;

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (pickupMarker) pickupMarker.setLatLng([lat, lng]);
      else pickupMarker = L.marker([lat, lng]).addTo(map);
    });

    document.getElementById('requestRideBtn').addEventListener('click', async () => {
      if (!pickupMarker) return alert('Escolhe no mapa onde queres ser apanhado.');
      const { lat, lng } = pickupMarker.getLatLng();
      try {
        await requestRide(rideId, { lat, lng });
        alert('Pedido enviado ao condutor.');
      } catch (error) {
        alert(error.message || 'Não foi possível enviar o pedido.');
      }
    });
  } catch (error) {
    detailsCard.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'Erro a carregar a boleia.')}</div>`;
  }
}

init();
