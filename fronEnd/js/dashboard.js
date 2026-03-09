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
let routePolyline = null;
let currentMapMode = "origin";

function createMarkerIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:${color};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10]
  });
}

async function drawRoute() {
  const startLat = startLatInput.value;
  const startLng = startLngInput.value;
  const destLat = destinationLatInput.value;
  const destLng = destinationLngInput.value;

  if (!startLat || !startLng || !destLat || !destLng) return;

  if (routePolyline) {
    map.removeLayer(routePolyline);
    routePolyline = null;
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes.length > 0) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      routePolyline = L.polyline(coords, {
        color: '#10b981',
        weight: 4,
        opacity: 0.85,
        smoothFactor: 1
      }).addTo(map);

      map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

      // Show distance & duration info below the map
      const distKm = (route.distance / 1000).toFixed(1);
      const totalMins = Math.round(route.duration / 60);
      const durStr = totalMins < 60 ? `${totalMins} min` : `${Math.floor(totalMins / 60)}h ${totalMins % 60}min`;

      let routeInfoEl = document.getElementById("routeInfo");
      if (!routeInfoEl) {
        routeInfoEl = document.createElement("p");
        routeInfoEl.id = "routeInfo";
        routeInfoEl.style.cssText = "margin-top:8px;padding:10px 14px;background:var(--primary-muted);border-radius:var(--radius-sm);color:var(--primary-dark);font-size:13px;font-weight:500;";
        const mapEl = document.getElementById("createRideMap");
        mapEl.parentNode.insertBefore(routeInfoEl, mapEl.nextSibling);
      }
      routeInfoEl.innerHTML = `📍 ${distKm} km &nbsp;·&nbsp; ⏱️ ${durStr} de condução estimados`;

      // Auto-fill arrival time (uses local time to avoid UTC offset issues)
      const dateVal = document.getElementById("date").value;
      const timeVal = document.getElementById("time").value;

      if (dateVal && timeVal) {
        const departure = new Date(`${dateVal}T${timeVal}`);
        const arrival = new Date(departure.getTime() + route.duration * 1000);

        const pad = n => String(n).padStart(2, '0');
        const arrivalDateStr = `${arrival.getFullYear()}-${pad(arrival.getMonth() + 1)}-${pad(arrival.getDate())}`;
        const arrivalTimeStr = `${pad(arrival.getHours())}:${pad(arrival.getMinutes())}`;

        document.getElementById("arrivalDate").value = arrivalDateStr;
        document.getElementById("arrivalTime").value = arrivalTimeStr;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar rota:', err);
  }
}

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

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
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
    originMarker = L.marker([lat, lng], { icon: createMarkerIcon('#10b981') }).addTo(map);
  }

  originMarker.bindPopup(`<strong>Partida</strong><br>${label || "Origem"}`);

  // Auto-switch to destination mode after origin is set
  if (!destinationLatInput.value) {
    setMapMode("destination");
  }

  drawRoute();
}

function setDestinationPoint(lat, lng, label = "") {
  destinationLatInput.value = lat;
  destinationLngInput.value = lng;

  if (destinationMarker) {
    destinationMarker.setLatLng([lat, lng]);
  } else {
    destinationMarker = L.marker([lat, lng], { icon: createMarkerIcon('#f59e0b') }).addTo(map);
  }

  destinationMarker.bindPopup(`<strong>Destino</strong><br>${label || "Destino"}`);
  drawRoute();
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

async function useMyLocation() {
  const btn = document.getElementById("useMyLocationBtn");
  if (!navigator.geolocation) {
    showMessage("O teu browser não suporta geolocalização.");
    return;
  }

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> ...`;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        const address = await reverseGeocode(lat, lng);
        const label = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        originInput.value = label;
        map.setView([lat, lng], 14);
        setOriginPoint(lat, lng, label);
      } catch {
        originInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setOriginPoint(lat, lng);
      }
      btn.disabled = false;
      btn.innerHTML = originalText;
    },
    (_err) => {
      showMessage("Não foi possível obter a localização. Verifica as permissões do browser.");
      btn.disabled = false;
      btn.innerHTML = originalText;
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

findOriginBtn?.addEventListener("click", findOriginOnMap);
findDestinationBtn?.addEventListener("click", findDestinationOnMap);
document.getElementById("useMyLocationBtn")?.addEventListener("click", useMyLocation);

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

    if (routePolyline) {
      map.removeLayer(routePolyline);
      routePolyline = null;
    }

    map.setView([38.661, -9.205], 11);
    setMapMode("origin");
  } catch (error) {
    console.error("Erro ao criar boleia:", error);
    showMessage("Não foi possível ligar ao servidor.");
  }
});

// Re-calculate when departure date/time changes
document.getElementById("date")?.addEventListener("change", drawRoute);
document.getElementById("time")?.addEventListener("change", drawRoute);

requireAuth();
initMap();