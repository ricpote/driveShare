const container = document.getElementById("ridesContainer");
const rides = JSON.parse(localStorage.getItem("rides")) || [];

const map = L.map('map').setView([38.661, -9.204], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

if (!rides.length) {
  container.innerHTML = '<div class="empty-state">Ainda não existem boleias criadas.</div>';
} else {
  rides
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((ride) => {
      const card = document.createElement("article");
      card.className = "ride-card";
      card.innerHTML = `
        <h3>${ride.origin} → ${ride.destination}</h3>
        <div class="ride-meta">${ride.driverName} · Destino: FCT NOVA</div>
        <p>Hora de partida: <strong>${ride.time}</strong></p>
        <p>Lugares disponíveis: <strong>${ride.seats}</strong></p>
        <button class="inline-btn" data-email="${ride.driverEmail}">Pedir boleia</button>
      `;
      container.appendChild(card);
    });

  container.addEventListener("click", (event) => {
    if (event.target.matches(".inline-btn")) {
      const email = event.target.dataset.email;
      alert(`Pedido registado. Contacta o condutor em: ${email}`);
    }
  });
}
