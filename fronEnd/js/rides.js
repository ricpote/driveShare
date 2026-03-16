const API_RIDES_URL = "http://localhost:5000/api/rides";

const ridesContainer = document.getElementById("ridesContainer");
const ridesMessage = document.getElementById("ridesMessage");
const logoutBtn = document.getElementById("logoutBtn");
const refreshRidesBtn = document.getElementById("refreshRidesBtn");

const filterDateInput = document.getElementById("filterDate");
const filterDepartureTimeInput = document.getElementById("filterDepartureTime");
const filterArrivalTimeInput = document.getElementById("filterArrivalTime");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

let map;
let markersLayer;
let allRides = [];

function showMessage(text, type = "error") {
  if (!ridesMessage) return;
  ridesMessage.textContent = text;
  ridesMessage.classList.remove("hidden", "error", "success");
  ridesMessage.classList.add(type);
}

function hideMessage() {
  if (!ridesMessage) return;
  ridesMessage.textContent = "";
  ridesMessage.classList.add("hidden");
  ridesMessage.classList.remove("error", "success");
}

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

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function initMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement) return;

  map = L.map("map").setView([38.661, -9.205], 11);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function renderMapMarkers(rides) {
  if (!markersLayer) return;

  markersLayer.clearLayers();

  const bounds = [];

  rides.forEach((ride) => {
    if (
      ride.startLocation &&
      typeof ride.startLocation.lat === "number" &&
      typeof ride.startLocation.lng === "number"
    ) {
      const marker = L.marker([ride.startLocation.lat, ride.startLocation.lng])
        .addTo(markersLayer)
        .bindPopup(`
          <strong>${ride.from} → ${ride.to}</strong><br>
          Partida: ${formatDate(ride.date)}
        `);

      bounds.push(marker.getLatLng());
    }
  });

  if (bounds.length > 0 && map) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }
}

function openRideDetails(rideId) {
  window.location.href = `./ride-details.html?rideId=${rideId}`;
}

function isFutureRide(ride) {
  return new Date(ride.date).getTime() >= Date.now();
}

function sortRidesByDepartureDate(rides) {
  return [...rides].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });
}

function sameDate(dateString, filterDate) {
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}` === filterDate;
}

function matchesTime(dateString, filterTime) {
  if (!filterTime) return true;
  return formatTime(dateString) === filterTime;
}

function applyFilters(rides) {
  const filterDate = filterDateInput?.value || "";
  const filterDepartureTime = filterDepartureTimeInput?.value || "";
  const filterArrivalTime = filterArrivalTimeInput?.value || "";

  return rides.filter((ride) => {
    const matchesDateFilter = !filterDate || sameDate(ride.date, filterDate);
    const matchesDepartureFilter = !filterDepartureTime || matchesTime(ride.date, filterDepartureTime);
    const matchesArrivalFilter = !filterArrivalTime || matchesTime(ride.arrivalTime, filterArrivalTime);

    return matchesDateFilter && matchesDepartureFilter && matchesArrivalFilter;
  });
}

function renderRides(rides) {
  if (!ridesContainer) return;

  ridesContainer.innerHTML = "";

  if (!rides.length) {
    ridesContainer.innerHTML = `<p class="helper-text">Não existem boleias para os filtros selecionados.</p>`;
    return;
  }

  const currentUserId = String(getCurrentUserId());

  rides.forEach((ride) => {
    const rideCard = document.createElement("div");
    rideCard.className = "ride-card";

    const rideDriverId = String(ride.driver);
    const isMyRide = currentUserId && rideDriverId === currentUserId;

    rideCard.innerHTML = `
      <h3>${ride.from} → ${ride.to}</h3>
      <p><strong>Partida:</strong> ${formatDate(ride.date)}</p>
      <p><strong>Chegada:</strong> ${formatDate(ride.arrivalTime)}</p>
      <p><strong>Lugares disponíveis:</strong> ${ride.availableSeats} / ${ride.totalSeats}</p>
      ${isMyRide
        ? `<p class="helper-text"><strong>Esta é a tua boleia.</strong></p>`
        : `<button type="button" class="primary-btn join-ride-btn" data-ride-id="${ride._id}">Pedir entrada</button>`
      }
    `;

    ridesContainer.appendChild(rideCard);
  });

  document.querySelectorAll(".join-ride-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const rideId = button.dataset.rideId;
      openRideDetails(rideId);
    });
  });
}

function updateView() {
  const futureRides = allRides.filter(isFutureRide);
  const filteredRides = applyFilters(futureRides);
  const sortedRides = sortRidesByDepartureDate(filteredRides);

  renderRides(sortedRides);
  renderMapMarkers(sortedRides);
}

async function loadRides() {
  hideMessage();

  if (ridesContainer) {
    ridesContainer.innerHTML = `<p class="helper-text">A carregar boleias...</p>`;
  }

  const token = requireAuth();
  if (!token) return;

  try {
    const response = await fetch(API_RIDES_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "./index.html";
        return;
      }

      if (ridesContainer) ridesContainer.innerHTML = "";
      showMessage(data.error || "Erro ao carregar boleias.");
      return;
    }

    allRides = Array.isArray(data) ? data : [];
    updateView();
  } catch (error) {
    console.error("Erro ao carregar boleias:", error);
    if (ridesContainer) ridesContainer.innerHTML = "";
    showMessage("Não foi possível ligar ao servidor.");
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./index.html";
  });
}

if (refreshRidesBtn) {
  refreshRidesBtn.addEventListener("click", loadRides);
}

if (applyFiltersBtn) {
  applyFiltersBtn.addEventListener("click", updateView);
}

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    if (filterDateInput) filterDateInput.value = "";
    if (filterDepartureTimeInput) filterDepartureTimeInput.value = "";
    if (filterArrivalTimeInput) filterArrivalTimeInput.value = "";
    updateView();
  });
}

requireAuth();
initMap();
loadRides();