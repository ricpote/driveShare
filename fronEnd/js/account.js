// ===== CONSTANTES =====
const SESSION_KEY = "uniride_current_user";
const RIDES_KEY = "rides";

const user = JSON.parse(localStorage.getItem(SESSION_KEY));
const rides = JSON.parse(localStorage.getItem(RIDES_KEY)) || [];

if (!user) {
  window.location.href = "index.html";
}

// ===== DADOS DO UTILIZADOR =====
document.getElementById("userName").textContent = user.name || "—";
document.getElementById("userEmail").textContent = user.email || "—";
document.getElementById("userId").textContent = user.id || "—";
document.getElementById("userPhone").textContent = user.phone || "—";

// ===== ESTATÍSTICAS =====
const totalRidesEl = document.getElementById("totalRides");
const totalSeatsEl = document.getElementById("totalSeats");
const co2SavedEl = document.getElementById("co2Saved");

const userRides = rides.filter(ride => ride.driverId === user.id);
const totalRides = userRides.length;
const totalSeats = userRides.reduce((sum, ride) => sum + Number(ride.seats || 0), 0);
const estimatedCo2 = (totalRides * 2.4).toFixed(1);

totalRidesEl.textContent = totalRides;
totalSeatsEl.textContent = totalSeats;
co2SavedEl.textContent = `${estimatedCo2} kg`;

// ===== FUNÇÕES AUXILIARES =====
function getRideDateTime(ride) {
  return new Date(`${ride.date}T${ride.time}`);
}

const now = new Date();
const futureRides = userRides.filter(r => getRideDateTime(r) >= now)
                             .sort((a,b) => getRideDateTime(a) - getRideDateTime(b));
const historyRides = userRides.filter(r => getRideDateTime(r) < now)
                              .sort((a,b) => getRideDateTime(b) - getRideDateTime(a));

// ===== RENDER FUTURAS BOLEIAS =====
const rideActiveContainer = document.getElementById("rideActiveContainer");

function renderNextRide(ride) {
  const rideCard = document.createElement("div");
  rideCard.className = "ride-active-item";

  // MAPA (só se houver coordenadas)
  if (ride.startLat && ride.startLng) {
    const mapDiv = document.createElement("div");
    mapDiv.id = `rideMap-${ride.id}`;
    mapDiv.style.height = "320px";
    mapDiv.style.borderRadius = "12px";
    rideCard.appendChild(mapDiv);

    // Adiciona o card primeiro ao DOM
    rideActiveContainer.appendChild(rideCard);

    // Inicializa mapa
    try {
      const map = L.map(mapDiv.id).setView([ride.startLat, ride.startLng], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
      }).addTo(map);

      L.marker([ride.startLat, ride.startLng]).addTo(map)
        .bindPopup("Ponto de partida");

      const FCT = { lat: 38.661, lng: -9.204 };
      L.marker([FCT.lat, FCT.lng]).addTo(map).bindPopup("FCT NOVA");

      L.polyline([[ride.startLat, ride.startLng], [FCT.lat, FCT.lng]], {
        color: "#136f63",
        weight: 4
      }).addTo(map);
    } catch(e) {
      console.warn("Não foi possível criar o mapa para esta boleia", e);
    }
  } else {
    rideActiveContainer.appendChild(rideCard);
    const noMapMsg = document.createElement("div");
    noMapMsg.textContent = "Mapa indisponível para esta boleia.";
    noMapMsg.style.fontStyle = "italic";
    rideCard.appendChild(noMapMsg);
  }

  // PASSAGEIROS
  const passengersDiv = document.createElement("div");
  passengersDiv.className = "ride-passengers";
  passengersDiv.innerHTML = `
    <h3 class="section-subtitle">Pedidos para entrar na boleia</h3>
    <div id="ridePassengers-${ride.id}">
      ${ride.passengers && ride.passengers.length
        ? ride.passengers.map(p => `
            <div class="passenger-card">
              <span>${p.name}</span>
              <div class="passenger-actions">
                <button class="secondary-btn small-btn">Aceitar</button>
                <button class="secondary-btn small-btn">Recusar</button>
              </div>
            </div>
          `).join("")
        : `<div class="empty-state">Ainda não há pedidos para esta boleia.</div>`
      }
    </div>
  `;
  rideCard.appendChild(passengersDiv);
}

rideActiveContainer.innerHTML = "";
if (!futureRides.length) {
  rideActiveContainer.innerHTML = `<div class="empty-state">Ainda não tens boleias futuras.</div>`;
} else {
  futureRides.forEach(renderNextRide);
}

// ===== RENDER HISTÓRICO =====
const historyContainer = document.getElementById("rideHistory");

function createRideCard(ride) {
  const card = document.createElement("article");
  card.className = "ride-card";
  card.innerHTML = `
    <h3>${ride.origin} → ${ride.destination}</h3>
    <div class="ride-meta">${ride.driverName}</div>
    <p>Data: <strong>${ride.date}</strong></p>
    <p>Hora: <strong>${ride.time}</strong></p>
    <p>Lugares disponíveis: <strong>${ride.seats}</strong></p>
  `;
  return card;
}

function renderRideList(container, ridesList, emptyText) {
  if (!container) return;
  container.innerHTML = "";
  if (!ridesList.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }
  ridesList.forEach(ride => container.appendChild(createRideCard(ride)));
}

renderRideList(historyContainer, historyRides, "Ainda não tens histórico de boleias.");

// ===== EDITAR DADOS =====
const editUserBtn = document.getElementById("editUserBtn");
const userInfoGrid = document.getElementById("userInfoGrid");

editUserBtn.addEventListener("click", () => {
  userInfoGrid.querySelectorAll(".info-item").forEach(item => {
    const label = item.querySelector(".info-label").textContent.toLowerCase();
    const strong = item.querySelector("strong");
    const value = strong.textContent === "—" ? "" : strong.textContent;
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.dataset.key = label.includes("nome") ? "name" :
                        label.includes("email") ? "email" :
                        label.includes("telemóvel") ? "phone" :
                        label.includes("id") ? "id" : "";
    strong.replaceWith(input);
  });

  editUserBtn.textContent = "Guardar";
  editUserBtn.classList.add("primary-btn");
  editUserBtn.classList.remove("secondary-btn");

  editUserBtn.onclick = () => {
    userInfoGrid.querySelectorAll("input").forEach(input => {
      const key = input.dataset.key;
      if (key) user[key] = input.value;
    });
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    location.reload();
  };
});

// ===== LOGOUT =====
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  });
}