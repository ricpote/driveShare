const container = document.getElementById("ridesContainer");
const rides = JSON.parse(localStorage.getItem("rides")) || [];

const FCT = {
  lat: 38.661,
  lng: -9.204
};

const map = L.map("map").setView([FCT.lat, FCT.lng], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

const campusIcon = L.divIcon({
  className: "campus-marker-wrapper",
  html: `<div class="campus-marker">FCT</div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21]
});

const rideIcon = L.divIcon({
  className: "ride-marker-wrapper",
  html: `<div class="ride-marker"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const activeRideIcon = L.divIcon({
  className: "ride-marker-wrapper",
  html: `<div class="ride-marker active"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

L.marker([FCT.lat, FCT.lng], { icon: campusIcon })
  .addTo(map)
  .bindPopup("<b>FCT NOVA</b><br>Destino das boleias");

const rideEntries = [];

if (!rides.length) {
  container.innerHTML = '<div class="empty-state">Ainda não existem boleias criadas.</div>';
} else {
  rides
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))
    .forEach((ride) => {
      const card = document.createElement("article");
      card.className = "ride-card";

      card.innerHTML = `
        <h3>${ride.origin} → ${ride.destination}</h3>
        <div class="ride-meta">${ride.driverName} · Destino: FCT NOVA</div>
        <p>Hora de partida: <strong>${ride.time}</strong></p>
        <p>Lugares disponíveis: <strong>${ride.seats}</strong></p>
        ${ride.comment ? `<p class="ride-comment-preview">${ride.comment}</p>` : ""}
        <button class="inline-btn" data-ride-id="${ride.id}">Pedir boleia</button>
      `;

      container.appendChild(card);

      if (ride.startLat && ride.startLng) {
        const marker = L.marker([ride.startLat, ride.startLng], { icon: rideIcon }).addTo(map);

        const route = L.polyline(
          [
            [ride.startLat, ride.startLng],
            [FCT.lat, FCT.lng]
          ],
          {
            color: "#136f63",
            weight: 4,
            opacity: 0.35,
            dashArray: "8 8"
          }
        ).addTo(map);

        marker.bindPopup(`
          <b>${ride.driverName}</b><br>
          ${ride.origin} → ${ride.destination}<br>
          Hora: ${ride.time}<br>
          Lugares: ${ride.seats}
        `);

        rideEntries.push({ card, marker, route, ride });

        card.addEventListener("click", (event) => {
          if (event.target.matches(".inline-btn")) return;
          focusRide(card, marker, ride);
        });

        card.addEventListener("mouseenter", () => focusRide(card, marker, ride, true));
      }
    });

  container.addEventListener("click", (event) => {
    if (event.target.matches(".inline-btn")) {
      event.stopPropagation();
      const rideId = event.target.dataset.rideId;
      window.location.href = `ride-details.html?id=${rideId}`;
    }
  });

  const allMarkers = rideEntries.map((entry) => entry.marker);
  if (allMarkers.length) {
    const group = L.featureGroup([
      ...allMarkers,
      L.marker([FCT.lat, FCT.lng])
    ]);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

function focusRide(card, marker, ride, soft = false) {
  rideEntries.forEach((entry) => {
    entry.card.classList.remove("ride-card-active");
    entry.marker.setIcon(rideIcon);
    entry.route.setStyle({
      opacity: 0.25,
      weight: 4
    });
  });

  card.classList.add("ride-card-active");
  marker.setIcon(activeRideIcon);

  const current = rideEntries.find((entry) => entry.marker === marker);
  if (current) {
    current.route.setStyle({
      opacity: 0.8,
      weight: 5
    });
  }

  map.flyTo([ride.startLat, ride.startLng], soft ? 12 : 13, {
    duration: 0.8
  });

  marker.openPopup();
}


