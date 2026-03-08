import { acceptRideRequest, deleteRide, getJoinedRides, getMyRides, getRideRequests, rejectRideRequest } from './lib/api.js';
import { clearSession, ensureAuth, getCurrentUser } from './lib/session.js';
import { escapeHtml, formatRideDate } from './lib/ui.js';

ensureAuth();
const user = getCurrentUser();
document.getElementById('userName').textContent = user.name || '—';
document.getElementById('userEmail').textContent = user.email || '—';
document.getElementById('userId').textContent = user.id || '—';
document.getElementById('userPhone').textContent = user.phone || '—';

const totalRidesEl = document.getElementById('totalRides');
const totalSeatsEl = document.getElementById('totalSeats');
const co2SavedEl = document.getElementById('co2Saved');
const rideActiveContainer = document.getElementById('rideActiveContainer');
const historyContainer = document.getElementById('rideHistory');

function createRideCard(ride) {
  const card = document.createElement('article');
  card.className = 'ride-card';
  card.innerHTML = `
    <h3>${escapeHtml(ride.from)} → ${escapeHtml(ride.to)}</h3>
    <div class="ride-meta">${escapeHtml(formatRideDate(ride.date))}</div>
    <p>Lugares disponíveis: <strong>${escapeHtml(ride.availableSeats)}</strong></p>
  `;
  return card;
}

async function renderActiveRide(ride) {
  const rideCard = document.createElement('div');
  rideCard.className = 'ride-active-item';
  rideCard.innerHTML = `
    <h3>${escapeHtml(ride.from)} → ${escapeHtml(ride.to)}</h3>
    <p><strong>${escapeHtml(formatRideDate(ride.date))}</strong></p>
    <p>Lugares: ${escapeHtml(ride.availableSeats)} / ${escapeHtml(ride.totalSeats)}</p>
    <div class="passenger-actions" style="margin: 12px 0;">
      <button class="secondary-btn small-btn delete-ride-btn">Apagar boleia</button>
    </div>
    <div class="ride-passengers"><h3 class="section-subtitle">Pedidos pendentes</h3><div class="requests-wrap"><div class="empty-state">A carregar pedidos...</div></div></div>
  `;
  rideActiveContainer.appendChild(rideCard);
  rideCard.querySelector('.delete-ride-btn').addEventListener('click', async () => {
    if (!confirm('Queres apagar esta boleia?')) return;
    try {
      await deleteRide(ride._id);
      window.location.reload();
    } catch (error) {
      alert(error.message || 'Não foi possível apagar a boleia.');
    }
  });

  const wrap = rideCard.querySelector('.requests-wrap');
  try {
    const requests = await getRideRequests(ride._id);
    if (!requests.length) {
      wrap.innerHTML = '<div class="empty-state">Ainda não há pedidos pendentes para esta boleia.</div>';
      return;
    }
    wrap.innerHTML = requests.map((request) => `
      <div class="passenger-card">
        <span>Pedido ${escapeHtml(String(request._id).slice(-6))} · lat ${escapeHtml(request.passengerLocation?.lat ?? '—')} lng ${escapeHtml(request.passengerLocation?.lng ?? '—')}</span>
        <div class="passenger-actions">
          <button class="secondary-btn small-btn accept-btn" data-request-id="${escapeHtml(request._id)}">Aceitar</button>
          <button class="secondary-btn small-btn reject-btn" data-request-id="${escapeHtml(request._id)}">Recusar</button>
        </div>
      </div>
    `).join('');

    wrap.addEventListener('click', async (event) => {
      const requestId = event.target.dataset.requestId;
      if (!requestId) return;
      try {
        if (event.target.classList.contains('accept-btn')) {
          await acceptRideRequest(ride._id, requestId);
        } else if (event.target.classList.contains('reject-btn')) {
          await rejectRideRequest(ride._id, requestId);
        }
        window.location.reload();
      } catch (error) {
        alert(error.message || 'Não foi possível processar o pedido.');
      }
    });
  } catch (error) {
    wrap.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'Erro ao carregar pedidos.')}</div>`;
  }
}

async function init() {
  try {
    const [myRides, joinedRides] = await Promise.all([getMyRides(), getJoinedRides()]);
    totalRidesEl.textContent = String(myRides.length);
    totalSeatsEl.textContent = String(myRides.reduce((sum, ride) => sum + Number(ride.availableSeats || 0), 0));
    co2SavedEl.textContent = `${(myRides.length * 2.4).toFixed(1)} kg`;

    rideActiveContainer.innerHTML = '';
    if (!myRides.length) rideActiveContainer.innerHTML = '<div class="empty-state">Ainda não tens boleias criadas.</div>';
    else await Promise.all(myRides.sort((a, b) => new Date(a.date) - new Date(b.date)).map(renderActiveRide));

    historyContainer.innerHTML = '';
    if (!joinedRides.length) historyContainer.innerHTML = '<div class="empty-state">Ainda não participas em nenhuma boleia.</div>';
    else joinedRides.forEach((ride) => historyContainer.appendChild(createRideCard(ride)));
  } catch (error) {
    rideActiveContainer.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'Erro a carregar conta.')}</div>`;
  }
}

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn?.addEventListener('click', () => {
  clearSession();
  window.location.href = 'index.html';
});

init();
