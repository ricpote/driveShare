const API_RIDES_URL = "http://localhost:5000/api/rides";

const rideForm = document.getElementById("rideForm");
const rideMessage = document.getElementById("rideMessage");
const logoutBtn = document.getElementById("logoutBtn");

const originInput = document.getElementById("origin");
const destinationInput = document.getElementById("destination");

const findOriginBtn = document.getElementById("findOriginBtn");
const findDestinationBtn = document.getElementById("findDestinationBtn");

const mapModeInfo = document.getElementById("mapModeInfo");
const mapModeRadios = document.querySelectorAll('input[name="mapMode"]');

const startLatInput = document.getElementById("startLat");
const startLngInput = document.getElementById("startLng");
const destinationLatInput = document.getElementById("destinationLat");
const destinationLngInput = document.getElementById("destinationLng");

let map;
let originMarker = null;
let destinationMarker = null;
let currentMapMode = "origin";

function showMessage(text, type = "error") {
  rideMessage.textContent = text;
  rideMessage.classList.remove("hidden", "error", "success");
  rideMessage.classList.add(type);
}

function hideMessage() {
  rideMessage.textContent = "";
  rideMessage.classList.add("hidden");
  rideMessage.classList.remove("error", "success");
}

function getToken() {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get("token");

  if (tokenFromUrl) {
    localStorage.setItem("token", tokenFromUrl);
    window.history.replaceState({}, document.title, window.location.pathname);
    return tokenFromUrl;
  }

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

function updateMapModeInfo() {
  mapModeInfo.textContent = `Seleção ativa: ${currentMapMode === "origin" ? "origem" : "destino"}. Clica no mapa para definir a morada.`;
}

function setMapMode(mode) {
  currentMapMode = mode;

  mapModeRadios.forEach((radio) => {
    radio.checked = radio.value === mode;
  });

  updateMapModeInfo();
}

function initMap() {
  map = L.map("createRideMap").setView([38.661, -9.205], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  map.on("click", async (event) => {
    const { lat, lng } = event.latlng;

    try {
      const address = await reverseGeocode(lat, lng);
      const label = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      if (currentMapMode === "origin") {
        originInput.value = label;
        setOriginPoint(lat, lng, label);
      } else {
        destinationInput.value = label;
        setDestinationPoint(lat, lng, label);
      }
    } catch (error) {
      console.error("Erro ao obter morada:", error);

      const fallbackLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      if (currentMapMode === "origin") {
        originInput.value = fallbackLabel;
        setOriginPoint(lat, lng, fallbackLabel);
      } else {
        destinationInput.value = fallbackLabel;
        setDestinationPoint(lat, lng, fallbackLabel);
      }
    }
  });

  setMapMode("origin");
}

function setOriginPoint(lat, lng, label = "") {
  startLatInput.value = lat;
  startLngInput.value = lng;

  if (originMarker) {
    originMarker.setLatLng([lat, lng]);
  } else {
    originMarker = L.marker([lat, lng]).addTo(map);
  }

  originMarker.bindPopup(label || "Origem");
}

function setDestinationPoint(lat, lng, label = "") {
  destinationLatInput.value = lat;
  destinationLngInput.value = lng;

  if (destinationMarker) {
    destinationMarker.setLatLng([lat, lng]);
  } else {
    destinationMarker = L.marker([lat, lng]).addTo(map);
  }

  destinationMarker.bindPopup(label || "Destino");
}

async function searchLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Erro ao procurar localização.");
  }

  const results = await response.json();

  if (!results.length) {
    throw new Error("Localização não encontrada.");
  }

  return results[0];
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Erro ao converter coordenadas em morada.");
  }

  const result = await response.json();
  return result.display_name || "";
}

async function findOriginOnMap() {
  const query = originInput.value.trim();

  if (!query) {
    showMessage("Escreve uma origem antes de procurar.");
    return;
  }

  try {
    const result = await searchLocation(query);
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const label = result.display_name || query;

    map.setView([lat, lng], 14);
    originInput.value = label;
    setOriginPoint(lat, lng, label);
    setMapMode("origin");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Não foi possível encontrar a origem.");
  }
}

async function findDestinationOnMap() {
  const query = destinationInput.value.trim();

  if (!query) {
    showMessage("Escreve um destino antes de procurar.");
    return;
  }

  try {
    const result = await searchLocation(query);
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const label = result.display_name || query;

    map.setView([lat, lng], 14);
    destinationInput.value = label;
    setDestinationPoint(lat, lng, label);
    setMapMode("destination");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Não foi possível encontrar o destino.");
  }
}

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "./index.html";
});

findOriginBtn?.addEventListener("click", findOriginOnMap);
findDestinationBtn?.addEventListener("click", findDestinationOnMap);

mapModeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    setMapMode(radio.value);
  });
});

rideForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();

  const token = requireAuth();
  if (!token) return;

  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const arrivalDate = document.getElementById("arrivalDate").value;
  const arrivalTimeInput = document.getElementById("arrivalTime").value;
  const origin = originInput.value.trim();
  const destination = destinationInput.value.trim();
  const seats = Number(document.getElementById("seats").value);
  const comment = document.getElementById("rideComment").value.trim();

  const startLat = startLatInput.value;
  const startLng = startLngInput.value;
  const destinationLat = destinationLatInput.value;
  const destinationLng = destinationLngInput.value;

  if (!date || !time || !arrivalDate || !arrivalTimeInput || !origin || !destination || !seats) {
    showMessage("Preenche todos os campos obrigatórios.");
    return;
  }

  if (!startLat || !startLng) {
    showMessage("Tens de marcar a origem no mapa.");
    return;
  }

  if (!destinationLat || !destinationLng) {
    showMessage("Tens de marcar o destino no mapa.");
    return;
  }

  const departureDateTime = new Date(`${date}T${time}`);
  const arrivalDateTime = new Date(`${arrivalDate}T${arrivalTimeInput}`);

  if (arrivalDateTime <= departureDateTime) {
    showMessage("A hora de chegada tem de ser depois da partida.");
    return;
  }

  try {
    const response = await fetch(API_RIDES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        from: origin,
        to: destination,
        date: departureDateTime.toISOString(),
        arrivalTime: arrivalDateTime.toISOString(),
        totalSeats: seats,
        startLocation: {
          lat: Number(startLat),
          lng: Number(startLng)
        },
        destinationLocation: {
          lat: Number(destinationLat),
          lng: Number(destinationLng)
        },
        comment
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "./index.html";
        return;
      }

      showMessage(data.error || "Erro ao criar boleia.");
      return;
    }

    showMessage("Boleia criada com sucesso.", "success");
    rideForm.reset();

    startLatInput.value = "";
    startLngInput.value = "";
    destinationLatInput.value = "";
    destinationLngInput.value = "";

    if (originMarker) {
      map.removeLayer(originMarker);
      originMarker = null;
    }

    if (destinationMarker) {
      map.removeLayer(destinationMarker);
      destinationMarker = null;
    }

    map.setView([38.661, -9.205], 11);
    setMapMode("origin");
  } catch (error) {
    console.error("Erro ao criar boleia:", error);
    showMessage("Não foi possível ligar ao servidor.");
  }
});

requireAuth();
initMap();