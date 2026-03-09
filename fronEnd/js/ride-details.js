const API_RIDES_URL = "http://localhost:5000/api/rides";
const rideDetailsCard = document.getElementById("rideDetailsCard");

let map;
let stopMarker = null;
let selectedStop = null;

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

  if (stopMarker) {
    stopMarker.setLatLng([lat, lng]);
  } else {
    stopMarker = L.marker([lat, lng]).addTo(map);
  }

  if (label) {
    stopMarker.bindPopup(label).openPopup();
  }

  updateSelectedStopInfo(lat, lng, label);
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

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
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
        <p class="helper-text helper-text-tight">
          Escreve uma rua, zona ou local e carrega em “Encontrar no mapa”. Também podes clicar diretamente no mapa.
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

  if (
    ride.startLocation &&
    typeof ride.startLocation.lat === "number" &&
    typeof ride.startLocation.lng === "number"
  ) {
    L.marker([ride.startLocation.lat, ride.startLocation.lng])
      .addTo(map)
      .bindPopup("Ponto de partida da boleia");

    map.setView([ride.startLocation.lat, ride.startLocation.lng], 12);
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