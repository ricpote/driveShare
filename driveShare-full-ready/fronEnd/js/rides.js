const container = document.getElementById("ridesContainer");
const ridesMap = window.uniRide?.createMap("ridesMap");
const mapMarkers = [];

function formatRideDate(dateValue) {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function getStoredCoords(prefix) {
  try {
    const cache = JSON.parse(localStorage.getItem("uniride_geocode_cache") || "{}");
    const key = Object.keys(cache).find((k) => k === prefix.toLowerCase());
    const result = key ? cache[key]?.[0] : null;
    if (!result) return null;
    return { lat: Number(result.lat), lng: Number(result.lon), label: result.display_name };
  } catch {
    return null;
  }
}

async function addRideToMap(ride) {
  if (!ridesMap) return;
  let coords = getStoredCoords(ride.from);
  if (!coords) {
    const results = await window.uniRide.geocodePlace(ride.from);
    if (results[0]) coords = { lat: Number(results[0].lat), lng: Number(results[0].lon), label: results[0].display_name };
  }
  if (!coords) return;
  const marker = L.marker([coords.lat, coords.lng]).addTo(ridesMap);
  marker.bindPopup(`<strong>${ride.from} → ${ride.to}</strong><br>${formatRideDate(ride.date)}<br>Lugares: ${ride.availableSeats}/${ride.totalSeats}`);
  mapMarkers.push(marker);
  const group = L.featureGroup(mapMarkers);
  ridesMap.fitBounds(group.getBounds().pad(0.2));
}

async function loadRides() {
  const user = window.uniRide.requireAuth();
  if (!user) return;

  try {
    const rides = await window.uniRide.apiFetch("/rides", { method: "GET" });
    if (!rides.length) {
      container.innerHTML = '<div class="empty-state">Ainda não existem boleias criadas.</div>';
      return;
    }

    container.innerHTML = "";
    rides.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((ride) => {
      const isOwnRide = String(ride.driver) === String(user.id);
      const card = document.createElement("article");
      card.className = "ride-card";
      card.innerHTML = `
        <h3>${ride.from} → ${ride.to}</h3>
        <div class="ride-meta">Partida: ${formatRideDate(ride.date)}</div>
        <p>Lugares disponíveis: <strong>${ride.availableSeats}</strong> / ${ride.totalSeats}</p>
        <button class="inline-btn" data-ride-id="${ride._id}" ${isOwnRide ? "disabled" : ""}>${isOwnRide ? "A tua boleia" : "Pedir boleia"}</button>
      `;
      container.appendChild(card);
      addRideToMap(ride).catch(() => {});
    });
  } catch (error) {
    container.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

container?.addEventListener("click", async (event) => {
  if (!event.target.matches(".inline-btn") || event.target.disabled) return;
  const rideId = event.target.dataset.rideId;
  try {
    await window.uniRide.apiFetch(`/rides/${rideId}/request`, { method: "POST", body: JSON.stringify({ lat: null, lng: null }) });
    alert("Pedido enviado ao condutor com sucesso.");
  } catch (error) {
    alert(error.message);
  }
});

loadRides();
