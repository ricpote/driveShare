const API_BASE_USERS = "http://localhost:5000/api/users";
const API_BASE_RIDES = "http://localhost:5000/api/rides";

const logoutBtn = document.getElementById("logoutBtn");
const editUserBtn = document.getElementById("editUserBtn");
const editUserForm = document.getElementById("editUserForm");
const cancelEditUserBtn = document.getElementById("cancelEditUserBtn");
const editNameInput = document.getElementById("editName");
const editPhoneInput = document.getElementById("editPhone");

const rideActiveContainer = document.getElementById("rideActiveContainer");
const rideHistory = document.getElementById("rideHistory");

const totalRidesEl = document.getElementById("totalRides");
const userRatingEl = document.getElementById("userRating");
const co2SavedEl = document.getElementById("co2Saved");

const userNameEl = document.getElementById("userName");
const userEmailEl = document.getElementById("userEmail");
const userPhoneEl = document.getElementById("userPhone");

let renderedUpcomingRides = [];

// Estimativa plausível baseada em ~106.8 g CO2/km para carros novos na Europa.
// Guardamos em kg/km.
const CAR_CO2_KG_PER_KM = 0.1068;

function getToken() {
  return localStorage.getItem("token");
}

function requireAuth() {
  const token = getToken();

  if (!token) {
    window.location.href = "./index.html";
    return null;
  }

  return token;
}

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Erro ao ler token:", error);
    return null;
  }
}

function getCurrentUserId() {
  const token = getToken();
  if (!token) return null;

  const decoded = parseJwt(token);
  return decoded?.userId || null;
}

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function createEmptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

async function fetchWithAuth(url, options = {}) {
  const token = requireAuth();
  if (!token) return null;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "./index.html";
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(`Resposta inválida do servidor (${response.status}).`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao carregar dados.");
  }

  return data;
}

function openEditForm() {
  editNameInput.value = userNameEl.textContent === "Indisponível" ? "" : userNameEl.textContent;
  editPhoneInput.value = userPhoneEl.textContent === "Indisponível" ? "" : userPhoneEl.textContent;

  editUserForm.style.display = "block";
  editUserBtn.style.display = "none";
}

function closeEditForm() {
  editUserForm.style.display = "none";
  editUserBtn.style.display = "inline-flex";
  editUserForm.reset();
}

async function loadUserInfo() {
  try {
    const user = await fetchWithAuth(`${API_BASE_USERS}/me`);
    if (!user) return;

    userNameEl.textContent = user.name || "Indisponível";
    userEmailEl.textContent = user.email || "Indisponível";
    userPhoneEl.textContent = user.phone || "Indisponível";

    if (user.ratingAverage !== null && user.ratingAverage !== undefined) {
      userRatingEl.textContent = `${Number(user.ratingAverage).toFixed(1)} (${user.ratingCount || 0})`;
    } else {
      userRatingEl.textContent = "Sem avaliações";
    }
  } catch (error) {
    console.error("Erro ao carregar utilizador:", error);

    userNameEl.textContent = "Erro";
    userEmailEl.textContent = "Erro";
    userPhoneEl.textContent = "Erro";
    userRatingEl.textContent = "Erro";
  }
}

function normalizeRide(ride, role) {
  return {
    ...ride,
    role,
    roleLabel: role === "driver" ? "Condutor" : "Passageiro"
  };
}

function createManagedRideCard(ride) {
  const roleClass = ride.role === "driver" ? "role-driver" : "role-passenger";

  return `
    <div class="managed-ride-card" id="managedRide-${ride._id}">
      <div class="managed-ride-header">
        <div>
          <h3>${ride.from} → ${ride.to}</h3>
          <p class="managed-ride-meta">
            <span class="ride-role-badge ${roleClass}">${ride.roleLabel}</span>
            <span><strong>Partida:</strong> ${formatDate(ride.date)}</span>
            <span><strong>Chegada:</strong> ${formatDate(ride.arrivalTime)}</span>
          </p>
        </div>
      </div>

      <div class="managed-ride-grid">
        <div class="managed-ride-map-panel">
          <h4>Mapa da boleia</h4>
          <div class="managed-ride-map" id="rideMap-${ride._id}"></div>
        </div>

        <div class="managed-ride-requests-panel">
          <h4>${ride.role === "driver" ? "Pedidos para entrar" : "Estado da tua participação"}</h4>
          <div class="ride-request-list" id="rideRequestList-${ride._id}">
            <div class="empty-state">A carregar...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createHistoryManagedRideCard(ride) {
  const roleClass = ride.role === "driver" ? "role-driver" : "role-passenger";

  return `
    <div class="managed-ride-card history-ride-card" id="historyRide-${ride._id}">
      <div class="managed-ride-header">
        <div>
          <h3>${ride.from} → ${ride.to}</h3>
          <p class="managed-ride-meta">
            <span class="ride-role-badge ${roleClass}">${ride.roleLabel}</span>
            <span><strong>Partida:</strong> ${formatDate(ride.date)}</span>
            <span><strong>Chegada:</strong> ${formatDate(ride.arrivalTime)}</span>
          </p>
        </div>
      </div>

      <div class="managed-ride-grid">
        <div class="managed-ride-map-panel">
          <h4>Mapa da boleia</h4>
          <div class="managed-ride-map" id="historyRideMap-${ride._id}"></div>
        </div>

        <div class="managed-ride-requests-panel">
          <h4>Estado</h4>
          <div class="ride-request-list">
            <div class="ride-request-item">
              <div class="ride-request-content">
                <strong>Boleia concluída</strong>
                <p class="request-status accepted">Esta viagem já aconteceu.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRideHistory(myRides, joinedRides) {
  const now = new Date();

  const pastMyRides = myRides
    .filter((ride) => new Date(ride.arrivalTime) < now)
    .map((ride) => normalizeRide(ride, "driver"));

  const pastJoinedRides = joinedRides
    .filter((ride) => new Date(ride.arrivalTime) < now)
    .map((ride) => normalizeRide(ride, "passenger"));

  const allPast = [...pastMyRides, ...pastJoinedRides].sort(
    (a, b) => new Date(b.arrivalTime) - new Date(a.arrivalTime)
  );

  if (!allPast.length) {
    rideHistory.innerHTML = createEmptyState("Ainda não tens histórico de boleias.");
    return;
  }

  rideHistory.innerHTML = allPast.map(createHistoryManagedRideCard).join("");

  allPast.forEach((ride) => {
    initHistoryRideMap(ride);
  });
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(startLocation, destinationLocation) {
  if (
    !startLocation ||
    !destinationLocation ||
    typeof startLocation.lat !== "number" ||
    typeof startLocation.lng !== "number" ||
    typeof destinationLocation.lat !== "number" ||
    typeof destinationLocation.lng !== "number"
  ) {
    return 0;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(destinationLocation.lat - startLocation.lat);
  const dLng = toRadians(destinationLocation.lng - startLocation.lng);

  const lat1 = toRadians(startLocation.lat);
  const lat2 = toRadians(destinationLocation.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function estimateRideSavedCo2Kg(ride) {
  const distanceKm = calculateDistanceKm(ride.startLocation, ride.destinationLocation);

  if (!distanceKm || Number.isNaN(distanceKm)) {
    return 0;
  }

  return distanceKm * CAR_CO2_KG_PER_KM;
}

function calculateStats(myRides, joinedRides) {
  const totalCreated = myRides.length;
  const now = new Date();

  const completedJoinedRides = joinedRides.filter(
    (ride) => new Date(ride.arrivalTime) < now
  );

  const estimatedCo2SavedKg = completedJoinedRides.reduce((sum, ride) => {
    return sum + estimateRideSavedCo2Kg(ride);
  }, 0);

  totalRidesEl.textContent = String(totalCreated);
  co2SavedEl.textContent = `${estimatedCo2SavedKg.toFixed(1)} kg`;
}

function initRideMap(ride) {
  const mapId = `rideMap-${ride._id}`;
  const mapEl = document.getElementById(mapId);
  if (!mapEl) return;

  const map = L.map(mapId).setView([38.661, -9.205], 11);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  const bounds = [];

  if (
    ride.startLocation &&
    typeof ride.startLocation.lat === "number" &&
    typeof ride.startLocation.lng === "number"
  ) {
    const startMarker = L.marker([ride.startLocation.lat, ride.startLocation.lng]).addTo(map);
    startMarker.bindPopup("Partida");
    bounds.push([ride.startLocation.lat, ride.startLocation.lng]);
  }

  if (
    ride.destinationLocation &&
    typeof ride.destinationLocation.lat === "number" &&
    typeof ride.destinationLocation.lng === "number"
  ) {
    const destinationMarker = L.marker([ride.destinationLocation.lat, ride.destinationLocation.lng]).addTo(map);
    destinationMarker.bindPopup("Chegada");
    bounds.push([ride.destinationLocation.lat, ride.destinationLocation.lng]);
  }

  ride._requestMarkers = [];

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }

  ride._leafletMap = map;
}

function initHistoryRideMap(ride) {
  const mapId = `historyRideMap-${ride._id}`;
  const mapEl = document.getElementById(mapId);
  if (!mapEl) return;

  const map = L.map(mapId).setView([38.661, -9.205], 11);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  const bounds = [];

  if (
    ride.startLocation &&
    typeof ride.startLocation.lat === "number" &&
    typeof ride.startLocation.lng === "number"
  ) {
    const startMarker = L.marker([ride.startLocation.lat, ride.startLocation.lng]).addTo(map);
    startMarker.bindPopup("Partida");
    bounds.push([ride.startLocation.lat, ride.startLocation.lng]);
  }

  if (
    ride.destinationLocation &&
    typeof ride.destinationLocation.lat === "number" &&
    typeof ride.destinationLocation.lng === "number"
  ) {
    const destinationMarker = L.marker([ride.destinationLocation.lat, ride.destinationLocation.lng]).addTo(map);
    destinationMarker.bindPopup("Chegada");
    bounds.push([ride.destinationLocation.lat, ride.destinationLocation.lng]);
  }

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createRequestMarkerIcon(index) {
  return L.divIcon({
    className: "custom-request-marker",
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #1d4ed8;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      ">${index}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

function highlightRequestCard(requestId) {
  document.querySelectorAll(".ride-request-item").forEach((el) => {
    el.style.outline = "";
    el.style.boxShadow = "";
  });

  const card = document.getElementById(`request-${requestId}`);
  if (!card) return;

  card.style.outline = "2px solid #1d4ed8";
  card.style.boxShadow = "0 0 0 4px rgba(29, 78, 216, 0.15)";
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function addRequestMarkersToMap(ride, requests) {
  if (!ride._leafletMap) return;

  const map = ride._leafletMap;

  if (ride._requestMarkers && ride._requestMarkers.length) {
    ride._requestMarkers.forEach((marker) => map.removeLayer(marker));
  }

  ride._requestMarkers = [];

  requests.forEach((request, index) => {
    if (
      request.passengerLocation &&
      typeof request.passengerLocation.lat === "number" &&
      typeof request.passengerLocation.lng === "number"
    ) {
      const displayIndex = request._displayIndex || index + 1;
      const passengerName = request.passenger?.name || "Utilizador";
      const passengerEmail = request.passenger?.email || "Email indisponível";
      const passengerPhone = request.passenger?.phone || "Telemóvel indisponível";

      const marker = L.marker(
        [request.passengerLocation.lat, request.passengerLocation.lng],
        { icon: createRequestMarkerIcon(displayIndex) }
      ).addTo(map);

      marker.bindPopup(`
        <div>
          <strong>Pedido #${displayIndex}</strong><br />
          <strong>${escapeHtml(passengerName)}</strong><br />
          <span>${escapeHtml(passengerEmail)}</span><br />
          <span>${escapeHtml(passengerPhone)}</span>
        </div>
      `);

      marker.on("click", () => {
        highlightRequestCard(request._id);
      });

      ride._requestMarkers.push(marker);
    }
  });
}

function getRequestListElement(rideId) {
  return document.getElementById(`rideRequestList-${rideId}`);
}

async function enrichRequestsWithPassengerData(requests) {
  const enrichedRequests = await Promise.all(
    requests.map(async (request, index) => {
      const passengerId = request.passengerId || request.passenger?._id || null;
      let passenger = request.passenger || null;

      if (
        passengerId &&
        (!passenger || (!passenger.name && !passenger.email && !passenger.phone))
      ) {
        try {
          const fetchedPassenger = await fetchWithAuth(`${API_BASE_USERS}/${passengerId}`);
          if (fetchedPassenger) {
            passenger = fetchedPassenger;
          }
        } catch (error) {
          console.error(`Erro ao obter dados do passageiro ${passengerId}:`, error);
        }
      }

      return {
        ...request,
        passengerId,
        passenger,
        status: request.status || "pending",
        _displayIndex: index + 1
      };
    })
  );

  return enrichedRequests;
}

function renderDriverRequests(ride, requests) {
  const container = getRequestListElement(ride._id);
  if (!container) return;

  if (!requests.length) {
    container.innerHTML = createEmptyState("Ainda não existem pedidos para esta boleia.");
    addRequestMarkersToMap(ride, []);
    return;
  }

  container.innerHTML = requests.map((request) => {
    const passengerName = request.passenger?.name || "Utilizador";
    const passengerEmail = request.passenger?.email || "Email indisponível";
    const passengerPhone = request.passenger?.phone || "Telemóvel indisponível";
    const passengerId = request.passengerId || request.passenger?._id || "";
    const requestNumber = request._displayIndex || 0;
    const isAccepted = request.status === "accepted";

    return `
      <div
        class="ride-request-item clickable-request-card"
        id="request-${request._id}"
        data-passenger-id="${passengerId}"
        data-request-id="${request._id}"
      >
        <div class="ride-request-content">
          <strong>Pedido #${requestNumber} — ${passengerName}</strong>
          <p>${passengerEmail}</p>
          <p>${passengerPhone}</p>
          <p class="request-status ${isAccepted ? "accepted" : "pending"}">
            ${isAccepted
        ? `Pedido aceite • Paragem no marcador ${requestNumber}`
        : `Pedido pendente • Paragem no marcador ${requestNumber}`
      }
          </p>
        </div>

        <div class="ride-request-actions">
          ${isAccepted
        ? `
                <button
                  type="button"
                  class="secondary-btn small-btn accepted-request-btn"
                  disabled
                >
                  Aceite
                </button>
              `
        : `
                <button
                  type="button"
                  class="primary-btn small-btn accept-request-btn"
                  data-ride-id="${ride._id}"
                  data-request-id="${request._id}"
                >
                  Aceitar
                </button>
              `
      }

          <button
            type="button"
            class="secondary-btn small-btn reject-request-btn"
            data-ride-id="${ride._id}"
            data-request-id="${request._id}"
          >
            Rejeitar
          </button>
        </div>
      </div>
    `;
  }).join("");

  addRequestMarkersToMap(ride, requests);

  container.querySelectorAll(".accept-request-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const rideId = button.dataset.rideId;
      const requestId = button.dataset.requestId;
      await acceptRideRequest(rideId, requestId);
    });
  });

  container.querySelectorAll(".reject-request-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const rideId = button.dataset.rideId;
      const requestId = button.dataset.requestId;
      await rejectRideRequest(rideId, requestId);
    });
  });

  container.querySelectorAll(".clickable-request-card").forEach((card) => {
    card.addEventListener("click", () => {
      const passengerId = card.dataset.passengerId;
      const requestId = card.dataset.requestId;

      if (requestId) {
        highlightRequestCard(requestId);
      }

      if (!passengerId) return;
      window.location.href = `./user-profile.html?userId=${passengerId}`;
    });
  });
}

function renderPassengerRideState(ride) {
  const container = getRequestListElement(ride._id);
  if (!container) return;

  container.innerHTML = `
    <div class="ride-request-item">
      <div class="ride-request-content">
        <strong>Já participas nesta boleia</strong>
        <p class="request-status accepted">Pedido aceite</p>
      </div>

      <div class="ride-request-actions">
        <button
          type="button"
          class="secondary-btn small-btn cancel-participation-btn"
          data-ride-id="${ride._id}"
        >
          Cancelar participação
        </button>
      </div>
    </div>
  `;

  container.querySelector(".cancel-participation-btn")?.addEventListener("click", async () => {
    await cancelRideParticipation(ride._id);
  });
}

async function loadDriverRequestsForRide(ride) {
  try {
    const requests = await fetchWithAuth(`${API_BASE_RIDES}/${ride._id}/requests`);
    if (!requests) return;

    const enrichedRequests = await enrichRequestsWithPassengerData(requests);

    ride._requests = enrichedRequests;
    renderDriverRequests(ride, ride._requests);
  } catch (error) {
    console.error("Erro ao carregar pedidos:", error);
    const container = getRequestListElement(ride._id);
    if (container) {
      container.innerHTML = createEmptyState("Erro ao carregar pedidos desta boleia.");
    }
  }
}

async function acceptRideRequest(rideId, requestId) {
  try {
    await fetchWithAuth(`${API_BASE_RIDES}/${rideId}/requests/${requestId}/accept`, {
      method: "POST"
    });

    const ride = renderedUpcomingRides.find((item) => String(item._id) === String(rideId));
    if (!ride || !ride._requests) return;

    ride._requests = ride._requests.map((request) => {
      if (String(request._id) === String(requestId)) {
        return {
          ...request,
          status: "accepted"
        };
      }

      return request;
    });

    renderDriverRequests(ride, ride._requests);
  } catch (error) {
    console.error("Erro ao aceitar pedido:", error);
    alert(error.message || "Erro ao aceitar pedido.");
  }
}

async function rejectRideRequest(rideId, requestId) {
  try {
    await fetchWithAuth(`${API_BASE_RIDES}/${rideId}/requests/${requestId}/reject`, {
      method: "POST"
    });

    const ride = renderedUpcomingRides.find((item) => String(item._id) === String(rideId));
    if (!ride || !ride._requests) return;

    ride._requests = ride._requests.filter(
      (request) => String(request._id) !== String(requestId)
    );

    renderDriverRequests(ride, ride._requests);
  } catch (error) {
    console.error("Erro ao rejeitar pedido:", error);
    alert(error.message || "Erro ao rejeitar pedido.");
  }
}

async function cancelRideParticipation(rideId) {
  try {
    await fetchWithAuth(`${API_BASE_RIDES}/${rideId}/cancel`, {
      method: "POST"
    });

    alert("Participação cancelada com sucesso.");
    await loadRideData();
  } catch (error) {
    console.error("Erro ao cancelar participação:", error);
    alert(error.message || "Erro ao cancelar participação.");
  }
}

async function renderUpcomingRides(myRides, joinedRides) {
  const now = new Date();

  const upcomingMyRides = myRides
    .filter((ride) => new Date(ride.arrivalTime) >= now)
    .map((ride) => normalizeRide(ride, "driver"));

  const upcomingJoinedRides = joinedRides
    .filter((ride) => new Date(ride.arrivalTime) >= now)
    .map((ride) => normalizeRide(ride, "passenger"));

  const allUpcoming = [...upcomingMyRides, ...upcomingJoinedRides].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  renderedUpcomingRides = allUpcoming;

  if (!allUpcoming.length) {
    rideActiveContainer.innerHTML = createEmptyState("Não tens boleias marcadas de momento.");
    return;
  }

  rideActiveContainer.innerHTML = allUpcoming.map(createManagedRideCard).join("");

  allUpcoming.forEach((ride) => {
    initRideMap(ride);

    if (ride.role === "driver") {
      loadDriverRequestsForRide(ride);
    } else {
      renderPassengerRideState(ride);
    }
  });
}

async function loadRideData() {
  try {
    rideActiveContainer.innerHTML = `<div class="empty-state">A carregar boleias marcadas...</div>`;
    rideHistory.innerHTML = `<div class="empty-state">A carregar histórico...</div>`;

    const [myRides, joinedRides] = await Promise.all([
      fetchWithAuth(`${API_BASE_RIDES}/my-rides`),
      fetchWithAuth(`${API_BASE_RIDES}/joined-rides`)
    ]);

    if (!myRides || !joinedRides) return;

    await renderUpcomingRides(myRides, joinedRides);
    renderRideHistory(myRides, joinedRides);
    calculateStats(myRides, joinedRides);
  } catch (error) {
    console.error("Erro ao carregar conta:", error);
    rideActiveContainer.innerHTML = createEmptyState("Erro ao carregar boleias marcadas.");
    rideHistory.innerHTML = createEmptyState("Erro ao carregar histórico.");
  }
}

async function handleEditUserSubmit(event) {
  event.preventDefault();

  const newName = editNameInput.value.trim();
  const newPhone = editPhoneInput.value.trim();

  if (!newName || !newPhone) {
    alert("Nome e telemóvel são obrigatórios.");
    return;
  }

  try {
    const saveButton = document.getElementById("saveUserBtn");
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "A guardar...";
    }

    await fetchWithAuth(`${API_BASE_USERS}/me`, {
      method: "PUT",
      body: JSON.stringify({
        name: newName,
        phone: newPhone
      })
    });

    await loadUserInfo();
    closeEditForm();
    alert("Dados atualizados com sucesso.");
  } catch (error) {
    console.error("Erro ao atualizar utilizador:", error);
    alert(error.message || "Erro ao atualizar dados.");
  } finally {
    const saveButton = document.getElementById("saveUserBtn");
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Guardar";
    }
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./index.html";
  });
}

if (editUserBtn) {
  editUserBtn.addEventListener("click", openEditForm);
}

if (cancelEditUserBtn) {
  cancelEditUserBtn.addEventListener("click", closeEditForm);
}

if (editUserForm) {
  editUserForm.addEventListener("submit", handleEditUserSubmit);
}

requireAuth();
loadUserInfo();
loadRideData();

