const API_RIDES_URL = "http://localhost:5000/api/rides";
const rideDetailsCard = document.getElementById("rideDetailsCard");

let map;
let stopMarker = null;
let selectedStop = null;
let currentRide = null;

function formatLocalTime(date) {
  return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

async function showPickupETA(pickupLat, pickupLng) {
  const etaEl = document.getElementById("selectedStopInfo");
  if (!etaEl || !currentRide?.startLocation || !currentRide?.date) return;

  etaEl.textContent = "A calcular tempo de chegada à paragem...";

  try {
    const { lat: sLat, lng: sLng } = currentRide.startLocation;
    const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${pickupLng},${pickupLat}?overview=false`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes.length > 0) {
      const secToPickup = data.routes[0].duration;
      const distToPickup = (data.routes[0].distance / 1000).toFixed(1);

      const departure = new Date(currentRide.date);
      const pickupETA = new Date(departure.getTime() + secToPickup * 1000);
      const arrivalETA = new Date(currentRide.arrivalTime);

      const mins = Math.round(secToPickup / 60);
      const durStr = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}min`;

      etaEl.innerHTML =
        `<strong>Paragem selecionada.</strong><br>` +
        `🚗 Distância da partida até à tua paragem: <strong>${distToPickup} km</strong> (${durStr})<br>` +
        `🕐 Condutor chega à tua paragem por volta das <strong>${formatLocalTime(pickupETA)}</strong><br>` +
        `🏁 Chegada estimada ao destino: <strong>${formatLocalTime(arrivalETA)}</strong>`;
    }
  } catch (err) {
    console.error("Erro ao calcular ETA:", err);
    etaEl.textContent = "Paragem selecionada.";
  }
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

function getRideIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("rideId");
}

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function updateSelectedStopInfo(lat, lng, label = "") {
  const stopInfo = document.getElementById("selectedStopInfo");
  if (!stopInfo) return;

  if (label) {
    stopInfo.textContent = `Paragem selecionada: ${label} (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
  } else {
    stopInfo.textContent = `Paragem selecionada: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function setStopMarker(lat, lng, label = "") {
  selectedStop = { lat, lng, label };

  const stopIcon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;background:#3b82f6;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10]
  });

  if (stopMarker) {
    stopMarker.setLatLng([lat, lng]);
  } else {
    stopMarker = L.marker([lat, lng], { icon: stopIcon }).addTo(map);
  }

  if (label) {
    stopMarker.bindPopup(`<strong>A tua paragem</strong><br>${label}`).openPopup();
  }

  showPickupETA(lat, lng);
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

function initMap() {
  map = L.map("detailsMap").setView([38.661, -9.205], 11);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  map.on("click", async (event) => {
    const { lat, lng } = event.latlng;
    const stopInput = document.getElementById("stopAddress");

    try {
      const address = await reverseGeocode(lat, lng);
      const label = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      if (stopInput) {
        stopInput.value = label;
      }

      setStopMarker(lat, lng, label);
    } catch (error) {
      console.error("Erro ao obter morada da paragem:", error);

      const fallbackLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      if (stopInput) {
        stopInput.value = fallbackLabel;
      }

      setStopMarker(lat, lng, fallbackLabel);
    }
  });
}

async function searchLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Erro ao procurar a localização.");
  }

  const results = await response.json();

  if (!results.length) {
    throw new Error("Não foi encontrada nenhuma localização para essa morada.");
  }

  return results[0];
}

async function handleFindStop() {
  const stopInput = document.getElementById("stopAddress");
  const query = stopInput?.value?.trim();

  if (!query) {
    alert("Escreve uma rua, zona ou local para procurar.");
    return;
  }

  try {
    const result = await searchLocation(query);

    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const label = result.display_name || query;

    map.setView([lat, lng], 14);
    if (stopInput) stopInput.value = label;
    setStopMarker(lat, lng, label);
  } catch (error) {
    console.error("Erro ao procurar paragem:", error);
    alert(error.message || "Não foi possível encontrar essa localização.");
  }
}

function useMyLocationForStop() {
  if (!navigator.geolocation) {
    alert("O teu browser não suporta geolocalização.");
    return;
  }

  const btn = document.getElementById("useMyLocationStopBtn");
  if (!btn) return;

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = "A obter localização...";

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const stopInput = document.getElementById("stopAddress");
      try {
        const address = await reverseGeocode(lat, lng);
        const label = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (stopInput) stopInput.value = label;
        map.setView([lat, lng], 15);
        setStopMarker(lat, lng, label);
      } catch {
        if (stopInput) stopInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setStopMarker(lat, lng);
      }
      btn.disabled = false;
      btn.innerHTML = originalText;
    },
    () => {
      alert("Não foi possível obter a localização. Verifica as permissões do browser.");
      btn.disabled = false;
      btn.innerHTML = originalText;
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

async function fetchRideById(rideId) {
  const token = requireAuth();
  if (!token) return null;

  const response = await fetch(API_RIDES_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "./index.html";
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao carregar boleias.");
  }

  return data.find((ride) => String(ride._id) === String(rideId)) || null;
}

function renderRideDetails(ride) {
  currentRide = ride;

  rideDetailsCard.innerHTML = `
    <h2 class="page-title">${ride.from} → ${ride.to}</h2>

    <div class="ride-detail-block">
      <p><strong>Partida:</strong> ${formatDate(ride.date)}</p>
      <p><strong>Chegada:</strong> ${formatDate(ride.arrivalTime)}</p>
      <p><strong>Lugares disponíveis:</strong> ${ride.availableSeats} / ${ride.totalSeats}</p>
    </div>

    <div class="ride-detail-block">
      <h3>Escolher paragem</h3>
      <div class="origin-row" style="margin-top: 12px;">
        <label for="stopAddress">Morada / rua / zona</label>
        <div class="origin-input-row">
          <input
            type="text"
            id="stopAddress"
            placeholder="Ex: Rua da Liberdade, Almada"
          />
          <button type="button" id="findStopBtn" class="secondary-btn map-search-btn">
            Encontrar no mapa
          </button>
        </div>
        <button type=”button” id=”useMyLocationStopBtn” class=”secondary-btn small-btn” style=”margin-top:6px;display:flex;align-items:center;gap:6px”>
          <svg width=”14” height=”14” fill=”none” stroke=”currentColor” viewBox=”0 0 24 24” stroke-width=”2.5” stroke-linecap=”round” stroke-linejoin=”round”><circle cx=”12” cy=”12” r=”3”/><path d=”M12 2v3M12 19v3M2 12h3M19 12h3”/></svg>
          Usar a minha localização atual
        </button>
        <p class=”helper-text helper-text-tight”>
          Escreve uma rua, zona ou local e carrega em “Encontrar no mapa”. Também podes clicar diretamente no mapa ou usar a tua localização GPS.
        </p>
      </div>

      <div id="detailsMap" style="height: 400px; border-radius: 12px; margin-top: 12px;"></div>

      <p id="selectedStopInfo" class="helper-text" style="margin-top: 12px;">
        Ainda não escolheste nenhuma paragem.
      </p>
    </div>

    <div class="ride-detail-actions" style="margin-top: 20px; display: flex; gap: 12px;">
      <button type="button" id="submitRideRequestBtn" class="primary-btn">Confirmar pedido</button>
      <button type="button" id="cancelRideRequestBtn" class="secondary-btn">Cancelar</button>
    </div>
  `;

  initMap();

  const originIcon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;background:#10b981;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
    iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -10]
  });
  const destIcon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;background:#f59e0b;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
    iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -10]
  });

  const hasOrigin = ride.startLocation && typeof ride.startLocation.lat === "number";
  const hasDest = ride.destinationLocation && typeof ride.destinationLocation.lat === "number";

  if (hasOrigin) {
    L.marker([ride.startLocation.lat, ride.startLocation.lng], { icon: originIcon })
      .addTo(map)
      .bindPopup("<strong>Partida</strong>");
    map.setView([ride.startLocation.lat, ride.startLocation.lng], 12);
  }

  if (hasDest) {
    L.marker([ride.destinationLocation.lat, ride.destinationLocation.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup("<strong>Destino</strong>");
  }

  // Draw route between origin and destination
  if (hasOrigin && hasDest) {
    const { lat: sLat, lng: sLng } = ride.startLocation;
    const { lat: dLat, lng: dLng } = ride.destinationLocation;
    fetch(`https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${dLng},${dLat}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          const poly = L.polyline(coords, { color: '#10b981', weight: 4, opacity: 0.8, smoothFactor: 1 }).addTo(map);
          map.fitBounds(poly.getBounds(), { padding: [40, 40] });
        }
      })
      .catch(err => console.error(err));
  }

  const submitBtn = document.getElementById("submitRideRequestBtn");
  const cancelBtn = document.getElementById("cancelRideRequestBtn");
  const findStopBtn = document.getElementById("findStopBtn");
  const stopAddressInput = document.getElementById("stopAddress");

  submitBtn.addEventListener("click", () => submitRideRequest(ride._id));
  cancelBtn.addEventListener("click", () => {
    window.location.href = "./rides.html";
  });

  findStopBtn.addEventListener("click", handleFindStop);

  const locationStopBtn = document.getElementById("useMyLocationStopBtn");
  if (locationStopBtn) locationStopBtn.addEventListener("click", useMyLocationForStop);

  stopAddressInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleFindStop();
    }
  });
}

async function submitRideRequest(rideId) {
  const token = requireAuth();
  if (!token) return;

  if (!selectedStop) {
    alert("Tens de escolher uma paragem no mapa antes de enviar o pedido.");
    return;
  }

  try {
    const response = await fetch(`${API_RIDES_URL}/${rideId}/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        lat: selectedStop.lat,
        lng: selectedStop.lng
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "./index.html";
        return;
      }

      alert(data.error || "Erro ao enviar pedido.");
      return;
    }

    alert("Pedido enviado ao condutor com sucesso.");
    window.location.href = "./rides.html";
  } catch (error) {
    console.error("Erro ao enviar pedido:", error);
    alert("Não foi possível ligar ao servidor.");
  }
}

async function loadRideDetails() {
  const rideId = getRideIdFromUrl();

  if (!rideId) {
    rideDetailsCard.innerHTML = `<div class="empty-state">ID da boleia em falta.</div>`;
    return;
  }

  try {
    const ride = await fetchRideById(rideId);

    if (!ride) {
      rideDetailsCard.innerHTML = `<div class="empty-state">Boleia não encontrada.</div>`;
      return;
    }

    renderRideDetails(ride);
  } catch (error) {
    console.error("Erro ao carregar detalhes da boleia:", error);
    rideDetailsCard.innerHTML = `<div class="empty-state">Erro ao carregar detalhes da boleia.</div>`;
  }
}

requireAuth();
loadRideDetails();