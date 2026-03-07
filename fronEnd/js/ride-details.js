const SESSION_KEY = "uniride_current_user";
const RIDES_KEY = "rides";

const currentUser = JSON.parse(localStorage.getItem(SESSION_KEY));
if (!currentUser) {
  window.location.href = "index.html";
}

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
      <p>${ride.comment ? ride.comment : "Sem comentário adicional."}</p>
    </div>

    <div style="margin-top:20px;">
      <button id="requestRideBtn" class="primary-btn">Pedir boleia</button>
    </div>

    <div id="rideMap" style="height:300px;margin-top:20px;border-radius:12px;"></div>
  `;
}

if (ride) {

  const map = L.map("rideMap").setView([ride.startLat, ride.startLng], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  L.marker([ride.startLat, ride.startLng]).addTo(map);

  L.polyline(
    [
      [ride.startLat, ride.startLng],
      [38.661, -9.204]
    ],
    {
      color: "#136f63",
      weight: 4
    }
  ).addTo(map);

  let pickupMarker = null;

  map.on("click", (e) => {
    const { lat, lng } = e.latlng;

    if (pickupMarker) {
      pickupMarker.setLatLng([lat, lng]);
    } else {
      pickupMarker = L.marker([lat, lng]).addTo(map);
    }
  });

  const requestBtn = document.getElementById("requestRideBtn");

  requestBtn.addEventListener("click", () => {

    if (!pickupMarker) {
      alert("Escolhe no mapa onde queres ser apanhado.");
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
