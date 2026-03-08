const SESSION_KEY = "uniride_current_user";
const RIDES_KEY = "rides";

const currentUser = JSON.parse(localStorage.getItem(SESSION_KEY));
if (!currentUser) window.location.href = "index.html";

const params = new URLSearchParams(window.location.search);
const rideId = Number(params.get("id"));
const rides = JSON.parse(localStorage.getItem(RIDES_KEY)) || [];
const ride = rides.find((item) => item.id === rideId);

const detailsCard = document.getElementById("rideDetailsCard");

if (!ride) {
  detailsCard.innerHTML = '<div class="empty-state">Não foi possível encontrar esta boleia.</div>';
} else {
  detailsCard.innerHTML = `
    <div class="ride-details-header">
      <div>
        <p class="details-eyebrow">Boleia disponível</p>
        <h2>${ride.origin} → ${ride.destination}</h2>
      </div>
      <span class="details-badge">${ride.time}</span>
    </div>

    <div class="details-grid">
      <div class="details-panel">
        <h3>Condutor</h3>
        <div class="contact-item">
          <span class="info-label">Nome</span>
          <strong>${ride.driverName}</strong>
        </div>
        <div class="contact-item">
          <span class="info-label">Email</span>
          <strong>${ride.driverEmail || "—"}</strong>
        </div>
        <div class="contact-item">
          <span class="info-label">Telemóvel</span>
          <strong>${ride.driverPhone || "—"}</strong>
        </div>
      </div>

      <div class="details-panel">
        <h3>Detalhes da boleia</h3>
        <div class="contact-item">
          <span class="info-label">Origem</span>
          <strong>${ride.origin}</strong>
        </div>
        <div class="contact-item">
          <span class="info-label">Destino</span>
          <strong>${ride.destination}</strong>
        </div>
        <div class="contact-item">
          <span class="info-label">Lugares disponíveis</span>
          <strong>${ride.seats}</strong>
        </div>
      </div>
    </div>

    <div class="details-comment-box">
      <span class="info-label">Comentário do condutor</span>
      <p>${ride.comment || "Sem comentário adicional."}</p>
    </div>

    <div class="ride-search-box" style="margin-bottom:10px;">
      <input type="text" id="pickupSearch" placeholder="Procura a rua ou zona para ser apanhado" />
      <button id="searchPickupBtn" class="secondary-btn map-search-btn">Encontrar</button>
    </div>

    <div id="rideMap" style="height:300px;margin-top:10px;border-radius:12px;"></div>

    <div style="margin-top:10px;">
      <button id="requestRideBtn" class="primary-btn">Pedir boleia</button>
    </div>
  `;
}

// ====== MAPA E PICKUP ======
if (ride) {
  const map = L.map("rideMap").setView([ride.startLat, ride.startLng], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);

  const FCT = [38.661, -9.204];
  L.marker([ride.startLat, ride.startLng]).addTo(map).bindPopup("Origem da boleia");
  L.marker(FCT).addTo(map).bindPopup("FCT NOVA");

  // Traço inicial do percurso
  let routePolyline = L.polyline([[ride.startLat, ride.startLng], FCT], { color: "#136f63", weight: 4 }).addTo(map);

  let pickupMarker = null;

  function updateRoute(lat, lng) {
    if (routePolyline) map.removeLayer(routePolyline);
    routePolyline = L.polyline([[lat, lng], FCT], { color: "#136f63", weight: 4 }).addTo(map);
  }

  map.on("click", (e) => {
    const { lat, lng } = e.latlng;
    if (pickupMarker) pickupMarker.setLatLng([lat, lng]);
    else {
      pickupMarker = L.marker([lat, lng]).addTo(map).bindPopup("Ponto de pickup").openPopup();
    }
    updateRoute(lat, lng);
  });

  // ===== BUSCA DE ORIGEM =====
  const pickupSearch = document.getElementById("pickupSearch");
  const searchBtn = document.getElementById("searchPickupBtn");

  async function geocode(query) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}&countrycodes=pt`);
    const data = await res.json();
    if (!data.length) throw new Error("Local não encontrado");
    return data[0];
  }

  async function searchPickup() {
    const query = pickupSearch.value.trim();
    if (!query) return alert("Escreve um local para procurar.");
    try {
      const result = await geocode(query);
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      if (pickupMarker) pickupMarker.setLatLng([lat, lng]);
      else pickupMarker = L.marker([lat, lng]).addTo(map).bindPopup("Ponto de pickup").openPopup();
      map.setView([lat, lng], 14);
      updateRoute(lat, lng);
    } catch (err) {
      alert(err.message);
    }
  }

  searchBtn.addEventListener("click", searchPickup);
  pickupSearch.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); searchPickup(); } });

  // ===== PEDIDO DE BOLEIA =====
  const requestBtn = document.getElementById("requestRideBtn");

  requestBtn.addEventListener("click", () => {
    if (!pickupMarker) {
      alert("Escolhe no mapa onde queres ser apanhado ou pesquisa a rua.");
      return;
    }
    const { lat, lng } = pickupMarker.getLatLng();

    if (!ride.requests) ride.requests = [];

    ride.requests.push({
      id: Date.now(),
      userId: currentUser.id,
      name: currentUser.name,
      lat,
      lng,
      status: "pending"
    });

    localStorage.setItem(RIDES_KEY, JSON.stringify(rides));
    alert("Pedido enviado ao condutor.");
  });
}