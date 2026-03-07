const SESSION_KEY = "uniride_current_user";
const RIDES_KEY = "rides";

const user = JSON.parse(localStorage.getItem(SESSION_KEY));
const rides = JSON.parse(localStorage.getItem(RIDES_KEY)) || [];

if (!user) {
  window.location.href = "index.html";
}

const userNameEl = document.getElementById("userName");
const userEmailEl = document.getElementById("userEmail");
const userIdEl = document.getElementById("userId");

if (userNameEl) userNameEl.textContent = user.name || "—";
if (userEmailEl) userEmailEl.textContent = user.email || "—";
if (userIdEl) userIdEl.textContent = user.id || "—";

const activeContainer = document.getElementById("activeRides");
const historyContainer = document.getElementById("rideHistory");

const totalRidesEl = document.getElementById("totalRides");
const totalSeatsEl = document.getElementById("totalSeats");
const co2SavedEl = document.getElementById("co2Saved");

const userRides = rides.filter((ride) => ride.driverId === user.id);

const now = new Date();
const currentTime = now.toTimeString().slice(0, 5);

const activeRides = userRides.filter((ride) => ride.time >= currentTime);
const historyRides = userRides.filter((ride) => ride.time < currentTime);

const totalRides = userRides.length;
const totalSeats = userRides.reduce((sum, ride) => sum + Number(ride.seats || 0), 0);
const estimatedCo2 = (totalRides * 2.4).toFixed(1);

if (totalRidesEl) totalRidesEl.textContent = totalRides;
if (totalSeatsEl) totalSeatsEl.textContent = totalSeats;
if (co2SavedEl) co2SavedEl.textContent = `${estimatedCo2} kg`;

function createRideCard(ride) {
  const card = document.createElement("article");
  card.className = "ride-card";

  card.innerHTML = `
    <h3>${ride.origin} → ${ride.destination}</h3>
    <div class="ride-meta">${ride.driverName}</div>
    <p>Hora de partida: <strong>${ride.time}</strong></p>
    <p>Lugares disponíveis: <strong>${ride.seats}</strong></p>
  `;

  return card;
}

function renderRideList(container, ridesList, emptyText) {
  if (!container) return;

  if (!ridesList.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  container.innerHTML = "";
  ridesList
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((ride) => {
      container.appendChild(createRideCard(ride));
    });
}

renderRideList(
  activeContainer,
  activeRides,
  "Ainda não tens boleias guardadas."
);

renderRideList(
  historyContainer,
  historyRides,
  "Ainda não tens histórico de boleias."
);