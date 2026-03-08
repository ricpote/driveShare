const API_RIDES_URL = "http://localhost:5000/api/rides";

const ridesContainer = document.getElementById("ridesContainer");
const ridesMessage = document.getElementById("ridesMessage");
const logoutBtn = document.getElementById("logoutBtn");
const refreshRidesBtn = document.getElementById("refreshRidesBtn");

let map;
let markersLayer;

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

function initMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement) return;

  map = L.map("map").setView([38.661, -9.205], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function renderMapMarkers(rides) {
  if (!markersLayer) return;

  markersLayer.clearLayers();

  rides.forEach((ride) => {
    if (
      ride.startLocation &&
      typeof ride.startLocation.lat === "number" &&
      typeof ride.startLocation.lng === "number"
    ) {
      L.marker([ride.startLocation.lat, ride.startLocation.lng])
        .addTo(markersLayer)
        .bindPopup(`
          <strong>${ride.from} → ${ride.to}</strong><br>
          Partida: ${formatDate(ride.date)}
        `);
    }
  });
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("A geolocalização não é suportada neste browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        reject(new Error("Não foi possível obter a tua localização."));
      }
    );
  });
}

async function requestToJoinRide(rideId) {
  hideMessage();

  const token = requireAuth();
  if (!token) return;

  try {
    showMessage("A obter localização...", "success");

    const location = await getCurrentPosition();

    const response = await fetch(`${API_RIDES_URL}/${rideId}/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        lat: location.lat,
        lng: location.lng
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "./index.html";
        return;
      }

      showMessage(data.error || "Erro ao pedir entrada.");
      return;
    }

    showMessage("Pedido enviado ao condutor.", "success");
  } catch (error) {
    console.error("Erro ao pedir entrada:", error);
    showMessage(error.message || "Não foi possível enviar o pedido.");
  }
}

function renderRides(rides) {
  if (!ridesContainer) return;

  ridesContainer.innerHTML = "";

  if (!rides.length) {
    ridesContainer.innerHTML = `<p class="helper-text">Não existem boleias disponíveis de momento.</p>`;
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
      requestToJoinRide(rideId);
    });
  });
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

    renderRides(data);
    renderMapMarkers(data);
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

requireAuth();
initMap();
loadRides();