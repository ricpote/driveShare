const SESSION_KEY = "uniride_current_user";
const RIDES_KEY = "rides";

const user = JSON.parse(localStorage.getItem(SESSION_KEY));
const rides = JSON.parse(localStorage.getItem(RIDES_KEY)) || [];

if (!user) {
  window.location.href = "index.html";
}

/* USER INFO */

document.getElementById("userName").textContent = user.name || "—";
document.getElementById("userEmail").textContent = user.email || "—";
document.getElementById("userId").textContent = user.id || "—";
document.getElementById("userPhone").textContent = user.phone || "—";

/* STATS */

const totalRidesEl = document.getElementById("totalRides");
const totalSeatsEl = document.getElementById("totalSeats");
const co2SavedEl = document.getElementById("co2Saved");

const userRides = rides.filter((ride) => ride.driverId === user.id);

const totalRides = userRides.length;
const totalSeats = userRides.reduce((sum, ride) => sum + Number(ride.seats || 0), 0);
const estimatedCo2 = (totalRides * 2.4).toFixed(1);

totalRidesEl.textContent = totalRides;
totalSeatsEl.textContent = totalSeats;
co2SavedEl.textContent = `${estimatedCo2} kg`;

/* DATA + HORA */

function getRideDateTime(ride) {
  return new Date(`${ride.date}T${ride.time}`);
}

const now = new Date();

/* FUTURAS */

const futureRides = userRides.filter((ride) => getRideDateTime(ride) >= now)
.sort((a,b)=>getRideDateTime(a)-getRideDateTime(b));

/* HISTÓRICO */

const historyRides = userRides.filter((ride) => getRideDateTime(ride) < now)
.sort((a,b)=>getRideDateTime(b)-getRideDateTime(a));

/* PRÓXIMA BOLEIA */

const nextRide = futureRides[0];

/* LISTA */

const activeContainer = document.getElementById("activeRides");
const historyContainer = document.getElementById("rideHistory");

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

function renderRideList(container, ridesList, emptyText) {

  if (!container) return;

  if (!ridesList.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  container.innerHTML = "";

  ridesList.forEach((ride)=>{
    container.appendChild(createRideCard(ride));
  });
}

/* FUTURAS */

renderRideList(
  activeContainer,
  futureRides,
  "Ainda não tens boleias futuras."
);

/* HISTÓRICO */

renderRideList(
  historyContainer,
  historyRides,
  "Ainda não tens histórico de boleias."
);

/* MAPA DA PRÓXIMA BOLEIA */

const rideMapEl = document.getElementById("rideMap");

if (rideMapEl && nextRide && typeof L !== "undefined") {

  const map = L.map("rideMap").setView(
    [nextRide.startLat, nextRide.startLng],
    12
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  L.marker([nextRide.startLat, nextRide.startLng])
    .addTo(map)
    .bindPopup("Ponto de partida");

  const FCT = {
    lat: 38.661,
    lng: -9.204
  };

  L.marker([FCT.lat, FCT.lng])
    .addTo(map)
    .bindPopup("FCT NOVA");

  L.polyline(
    [
      [nextRide.startLat, nextRide.startLng],
      [FCT.lat, FCT.lng]
    ],
    {
      color: "#136f63",
      weight: 4
    }
  ).addTo(map);

}

/* EDITAR DADOS PESSOAIS */
const editUserBtn = document.getElementById("editUserBtn");
const userInfoGrid = document.getElementById("userInfoGrid");

editUserBtn.addEventListener("click", () => {
  // Substituir o conteúdo de cada strong por input
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

  // Alterar botão para guardar
  editUserBtn.textContent = "Guardar";
  editUserBtn.classList.add("primary-btn");
  editUserBtn.classList.remove("secondary-btn");

  // Novo evento para guardar alterações
  editUserBtn.onclick = () => {
    userInfoGrid.querySelectorAll("input").forEach(input => {
      const key = input.dataset.key;
      if (key) user[key] = input.value;
    });
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    location.reload(); // Recarrega para atualizar a UI
  };
});
