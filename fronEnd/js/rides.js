const container = document.getElementById("ridesContainer");
const rides = JSON.parse(localStorage.getItem("rides")) || [];

/* Coordenadas da FCT */
const FCT = {
  lat: 38.661,
  lng: -9.204
};

/* Criar mapa */
const map = L.map("map").setView([FCT.lat, FCT.lng], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

/* Marker da FCT */
L.marker([FCT.lat, FCT.lng])
  .addTo(map)
  .bindPopup("<b>FCT NOVA</b><br>Destino das boleias")
  .openPopup();


/* Função para converter origem → coordenadas */
async function getCoordinates(place) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
  );

  const data = await response.json();

  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
}


if (!rides.length) {
  container.innerHTML =
    '<div class="empty-state">Ainda não existem boleias criadas.</div>';
} else {
  rides
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach(async (ride) => {

      /* Criar card */
      const card = document.createElement("article");
      card.className = "ride-card";

      card.innerHTML = `
        <h3>${ride.origin} → ${ride.destination}</h3>
        <div class="ride-meta">${ride.driverName} · Destino: FCT NOVA</div>
        <p>Hora de partida: <strong>${ride.time}</strong></p>
        <p>Lugares disponíveis: <strong>${ride.seats}</strong></p>
        <button class="inline-btn" data-email="${ride.driverEmail}">
          Pedir boleia
        </button>
      `;

      container.appendChild(card);

      /* Obter coordenadas da origem */
      const coords = await getCoordinates(ride.origin);

      if (!coords) return;

      /* Criar marker */
      const marker = L.marker([coords.lat, coords.lng]).addTo(map);

      marker.bindPopup(`
        <b>${ride.origin} → ${ride.destination}</b><br>
        Hora: ${ride.time}<br>
        Lugares: ${ride.seats}
      `);

      /* Desenhar rota até à FCT */
      L.polyline(
        [
          [coords.lat, coords.lng],
          [FCT.lat, FCT.lng]
        ],
        { color: "#136f63", weight: 3 }
      ).addTo(map);
    });

  container.addEventListener("click", (event) => {
    if (event.target.matches(".inline-btn")) {
      const email = event.target.dataset.email;

      alert(`Pedido registado. Contacta o condutor em: ${email}`);
    }
  });
}