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

const rideActiveContainer = document.getElementById("rideActiveContainer");

// ===== FUNÇÃO PARA RENDERIZAR UMA BOLEIA COMPLETA (MAPA + PEDIDOS) =====
function renderRideCard(ride, container) {
  const rideCard = document.createElement("div");
  rideCard.className = "ride-active-item";

  // MAPA
  if (ride.startLat && ride.startLng) {
    const mapDiv = document.createElement("div");
    mapDiv.id = `rideMap-${ride.id}`;
    mapDiv.style.height = "300px";
    mapDiv.style.borderRadius = "12px";
    rideCard.appendChild(mapDiv);
    container.appendChild(rideCard);

    try {
      const map = L.map(mapDiv.id).setView([ride.startLat, ride.startLng], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
      }).addTo(map);

      L.marker([ride.startLat, ride.startLng]).addTo(map).bindPopup("Ponto de partida");

      const FCT = { lat: 38.661, lng: -9.204 };
      L.marker([FCT.lat, FCT.lng]).addTo(map).bindPopup("FCT NOVA");

      L.polyline([[ride.startLat, ride.startLng], [FCT.lat, FCT.lng]], {
        color: "#136f63", weight: 4
      }).addTo(map);

      if (ride.requests) {
        ride.requests.forEach(req => {
          if (req.status === "accepted") {
            const pickup = [req.lat, req.lng];
            L.marker(pickup).addTo(map).bindPopup(`Pickup: ${req.name}`);
            L.polyline([[ride.startLat, ride.startLng], pickup, [FCT.lat, FCT.lng]], {
              color: "#136f63",
              weight: 4,
              dashArray: "6 6"
            }).addTo(map);
          }
        });
      }
    } catch (e) {
      console.warn("Erro ao criar mapa", e);
    }
  } else {
    const noMapMsg = document.createElement("div");
    noMapMsg.textContent = "Mapa indisponível para esta boleia.";
    noMapMsg.style.fontStyle = "italic";
    rideCard.appendChild(noMapMsg);
    container.appendChild(rideCard);
  }

  // PEDIDOS / PASSAGEIROS
  const passengersDiv = document.createElement("div");
  passengersDiv.className = "ride-passengers";

  const requests = ride.requests || [];
  passengersDiv.innerHTML = `
    <h3 class="section-subtitle">Pedidos para entrar na boleia</h3>
    <div id="ridePassengers-${ride.id}">
      ${
        requests.length
        ? requests.map(req => `
          <a href="profile.html?name=${req.name}&email=${req.email || ''}&phone=${req.phone || ''}" 
            class="passenger-card" id="req-${req.id}">
            <span>${req.name}</span>
            <div class="passenger-actions">
              ${
                req.status === "accepted"
                ? `<span class="accepted-badge">✓ Aceite</span>`
                : `
                  <button class="secondary-btn small-btn accept-btn"
                    data-ride="${ride.id}"
                    data-req="${req.id}">Aceitar</button>
                  <button class="secondary-btn small-btn reject-btn"
                    data-ride="${ride.id}"
                    data-req="${req.id}">Recusar</button>
                `
              }
            </div>
          </a>
        `).join("")
        : `<div class="empty-state">Ainda não há pedidos para esta boleia.</div>`
      }
    </div>
  `;
  rideCard.appendChild(passengersDiv);
}

// ===== RENDER FUTURA BOLEIA + "VER MAIS" =====
rideActiveContainer.innerHTML = "";

if (!futureRides.length) {
  rideActiveContainer.innerHTML = `<div class="empty-state">Ainda não tens boleias futuras.</div>`;
} else {
  // Mostrar a primeira boleia
  renderRideCard(futureRides[0], rideActiveContainer);

  if (futureRides.length > 1) {
    // Botão "Ver mais"
    const viewMoreBtn = document.createElement("button");
    viewMoreBtn.textContent = "Ver mais";
    viewMoreBtn.className = "secondary-btn small-btn";
    rideActiveContainer.appendChild(viewMoreBtn);

    // Botão "Ver menos" (criado mas escondido)
    const viewLessBtn = document.createElement("button");
    viewLessBtn.textContent = "Ver menos";
    viewLessBtn.className = "secondary-btn small-btn hidden";
    rideActiveContainer.appendChild(viewLessBtn);

    let moreContainer; // só será criado ao clicar

    viewMoreBtn.addEventListener("click", () => {
      // criar container e renderizar boleias restantes
      moreContainer = document.createElement("div");
      moreContainer.className = "more-rides-container";
      moreContainer.style.maxHeight = "650px";
      moreContainer.style.overflowY = "auto";
      moreContainer.style.display = "grid";
      moreContainer.style.gridTemplateRows = "repeat(auto-fill, minmax(350px, 1fr))";
      moreContainer.style.gap = "16px";

      futureRides.slice(1).forEach(ride => renderRideCard(ride, moreContainer));
      rideActiveContainer.insertBefore(moreContainer, viewLessBtn);

      // trocar visibilidade dos botões
      moreContainer.classList.remove("hidden");
      viewMoreBtn.classList.add("hidden");
      viewLessBtn.classList.remove("hidden");
    });

    viewLessBtn.addEventListener("click", () => {
      if (moreContainer) {
        moreContainer.remove(); // remove do DOM
        moreContainer = null;
      }
      viewMoreBtn.classList.remove("hidden");
      viewLessBtn.classList.add("hidden");
    });
  }
}

// ===== FUNÇÃO PARA CRIAR UM CARD DO HISTÓRICO =====
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

// ===== HISTÓRICO COM "VER MAIS / VER MENOS" E SCROLL CORRETO =====
const historyContainer = document.getElementById("rideHistory");
historyContainer.innerHTML = "";

if (!historyRides.length) {
  historyContainer.innerHTML = `<div class="empty-state">Ainda não tens histórico de boleias.</div>`;
} else {
  // Mostrar inicialmente apenas as 2 últimas boleias
  const initialHistoryRides = historyRides.slice(0, 2);
  const remainingHistoryRides = historyRides.slice(2);

  // Container principal das boleias iniciais (preview)
  const previewContainer = document.createElement("div");
  previewContainer.className = "history-preview-container";
  previewContainer.style.display = "grid";
  previewContainer.style.gap = "12px";

  initialHistoryRides.forEach(ride => previewContainer.appendChild(createRideCard(ride)));
  historyContainer.appendChild(previewContainer);

  if (remainingHistoryRides.length > 0) {
    // Container das boleias restantes, escondido inicialmente
    const moreHistoryContainer = document.createElement("div");
    moreHistoryContainer.className = "more-history-container";
    moreHistoryContainer.style.display = "none"; // invisível inicialmente
    moreHistoryContainer.style.overflowY = "auto"; // scroll só quando mostrado
    moreHistoryContainer.style.gap = "12px";

    remainingHistoryRides.forEach(ride => moreHistoryContainer.appendChild(createRideCard(ride)));
    historyContainer.appendChild(moreHistoryContainer);

    // Botões "Ver mais / Ver menos"
    const historyBtnsContainer = document.createElement("div");
    historyBtnsContainer.style.display = "flex";
    historyBtnsContainer.style.justifyContent = "center";
    historyBtnsContainer.style.marginTop = "12px";

    const viewMoreBtn = document.createElement("button");
    viewMoreBtn.className = "secondary-btn small-btn";
    viewMoreBtn.textContent = "Ver mais";

    const viewLessBtn = document.createElement("button");
    viewLessBtn.className = "secondary-btn small-btn hidden";
    viewLessBtn.textContent = "Ver menos";

    historyBtnsContainer.appendChild(viewMoreBtn);
    historyBtnsContainer.appendChild(viewLessBtn);
    historyContainer.appendChild(historyBtnsContainer);

    // Evento "Ver mais"
    viewMoreBtn.addEventListener("click", () => {
      moreHistoryContainer.style.display = "grid";  // mostra e ativa scroll
      moreHistoryContainer.style.maxHeight = "400px"; // altura do scroll
      viewMoreBtn.classList.add("hidden");
      viewLessBtn.classList.remove("hidden");
    });

    // Evento "Ver menos"
    viewLessBtn.addEventListener("click", () => {
      moreHistoryContainer.style.display = "none";  // esconde e remove scroll
      moreHistoryContainer.style.maxHeight = "";     // reset altura
      viewMoreBtn.classList.remove("hidden");
      viewLessBtn.classList.add("hidden");

      // Scroll para o topo do preview
      previewContainer.scrollIntoView({ behavior: "smooth" });
    });
  }
}

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
logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
});

// ===== ACEITAR / RECUSAR PEDIDOS =====
document.addEventListener("click", e => {
  if (e.target.classList.contains("accept-btn") || e.target.classList.contains("reject-btn")) {
    e.preventDefault();
    e.stopPropagation();
  }

  const rideId = Number(e.target.dataset.ride);
  const reqId = Number(e.target.dataset.req);
  if (!rideId || !reqId) return;

  const ride = rides.find(r => r.id === rideId);
  if (!ride || !ride.requests) return;

  const request = ride.requests.find(r => r.id === reqId);
  if (!request) return;

  if (e.target.classList.contains("accept-btn")) {
    request.status = "accepted";
    const card = document.getElementById(`req-${reqId}`);
    card.querySelector(".passenger-actions").innerHTML = `<span class="accepted-badge">✓ Aceite</span>`;
  }

  if (e.target.classList.contains("reject-btn")) {
    ride.requests = ride.requests.filter(r => r.id !== reqId);
  }

  localStorage.setItem(RIDES_KEY, JSON.stringify(rides));
  location.reload();
});
