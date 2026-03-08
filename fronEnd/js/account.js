const API_BASE_USERS = "http://localhost:5000/api/users";
const API_BASE_RIDES = "http://localhost:5000/api/rides";

const logoutBtn = document.getElementById("logoutBtn");
const editUserBtn = document.getElementById("editUserBtn");

const rideActiveContainer = document.getElementById("rideActiveContainer");
const rideHistory = document.getElementById("rideHistory");

const totalRidesEl = document.getElementById("totalRides");
const totalSeatsEl = document.getElementById("totalSeats");
const co2SavedEl = document.getElementById("co2Saved");

const userNameEl = document.getElementById("userName");
const userEmailEl = document.getElementById("userEmail");
const userPhoneEl = document.getElementById("userPhone");
const userIdEl = document.getElementById("userId");

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

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function createEmptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function createRideCard(ride, roleLabel) {
  return `
    <div class="ride-card">
      <h3>${ride.from} → ${ride.to}</h3>
      <p><strong>Função:</strong> ${roleLabel}</p>
      <p><strong>Partida:</strong> ${formatDate(ride.date)}</p>
      <p><strong>Chegada:</strong> ${formatDate(ride.arrivalTime)}</p>
      <p><strong>Lugares:</strong> ${ride.availableSeats} / ${ride.totalSeats}</p>
    </div>
  `;
}

async function fetchWithAuth(url, options = {}) {
  const token = requireAuth();
  if (!token) return null;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "./index.html";
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(`Resposta inválida do servidor (${response.status}).`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao carregar dados.");
  }

  return data;
}

async function loadUserInfo() {
  try {
    const user = await fetchWithAuth(`${API_BASE_USERS}/me`);
    if (!user) return;

    userNameEl.textContent = user.name || "Indisponível";
    userEmailEl.textContent = user.email || "Indisponível";
    userPhoneEl.textContent = user.phone || "Indisponível";
    userIdEl.textContent = user.userId || "Indisponível";
  } catch (error) {
    console.error("Erro ao carregar utilizador:", error);

    userNameEl.textContent = "Erro";
    userEmailEl.textContent = "Erro";
    userPhoneEl.textContent = "Erro";
    userIdEl.textContent = "Erro";
  }
}

function normalizeRide(ride, role) {
  return {
    ...ride,
    role,
    roleLabel: role === "driver" ? "Condutor" : "Passageiro"
  };
}

function renderUpcomingRides(myRides, joinedRides) {
  const now = new Date();

  const upcomingMyRides = myRides
    .filter((ride) => new Date(ride.date) >= now)
    .map((ride) => normalizeRide(ride, "driver"));

  const upcomingJoinedRides = joinedRides
    .filter((ride) => new Date(ride.date) >= now)
    .map((ride) => normalizeRide(ride, "passenger"));

  const allUpcoming = [...upcomingMyRides, ...upcomingJoinedRides].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  if (!allUpcoming.length) {
    rideActiveContainer.innerHTML = createEmptyState("Não tens boleias marcadas de momento.");
    return;
  }

  rideActiveContainer.innerHTML = allUpcoming
    .map((ride) => createRideCard(ride, ride.roleLabel))
    .join("");
}

function renderRideHistory(myRides, joinedRides) {
  const now = new Date();

  const pastMyRides = myRides
    .filter((ride) => new Date(ride.date) < now)
    .map((ride) => normalizeRide(ride, "driver"));

  const pastJoinedRides = joinedRides
    .filter((ride) => new Date(ride.date) < now)
    .map((ride) => normalizeRide(ride, "passenger"));

  const allPast = [...pastMyRides, ...pastJoinedRides].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  if (!allPast.length) {
    rideHistory.innerHTML = createEmptyState("Ainda não tens histórico de boleias.");
    return;
  }

  rideHistory.innerHTML = allPast
    .map((ride) => createRideCard(ride, ride.roleLabel))
    .join("");
}

function calculateStats(myRides) {
  const totalCreated = myRides.length;

  const totalAvailableSeats = myRides.reduce((sum, ride) => {
    return sum + (Number(ride.availableSeats) || 0);
  }, 0);

  totalRidesEl.textContent = String(totalCreated);
  totalSeatsEl.textContent = String(totalAvailableSeats);
  co2SavedEl.textContent = "0 kg";
}

async function loadRideData() {
  try {
    rideActiveContainer.innerHTML = `<div class="empty-state">A carregar boleias marcadas...</div>`;
    rideHistory.innerHTML = `<div class="empty-state">A carregar histórico...</div>`;

    const [myRides, joinedRides] = await Promise.all([
      fetchWithAuth(`${API_BASE_RIDES}/my-rides`),
      fetchWithAuth(`${API_BASE_RIDES}/joined-rides`)
    ]);

    if (!myRides || !joinedRides) return;

    renderUpcomingRides(myRides, joinedRides);
    renderRideHistory(myRides, joinedRides);
    calculateStats(myRides);
  } catch (error) {
    console.error("Erro ao carregar conta:", error);
    rideActiveContainer.innerHTML = createEmptyState("Erro ao carregar boleias marcadas.");
    rideHistory.innerHTML = createEmptyState("Erro ao carregar histórico.");
  }
}

async function handleEditUser() {
  const currentName = userNameEl.textContent === "Indisponível" ? "" : userNameEl.textContent;
  const currentPhone = userPhoneEl.textContent === "Indisponível" ? "" : userPhoneEl.textContent;

  const newName = prompt("Novo nome:", currentName);
  if (newName === null) return;

  const newPhone = prompt("Novo telemóvel:", currentPhone);
  if (newPhone === null) return;

  if (!newName.trim() || !newPhone.trim()) {
    alert("Nome e telemóvel são obrigatórios.");
    return;
  }

  try {
    const result = await fetchWithAuth(`${API_BASE_USERS}/me`, {
      method: "PUT",
      body: JSON.stringify({
        name: newName.trim(),
        phone: newPhone.trim()
      })
    });

    if (!result) return;

    alert("Dados atualizados com sucesso.");
    await loadUserInfo();
  } catch (error) {
    console.error("Erro ao atualizar utilizador:", error);
    alert(error.message || "Erro ao atualizar dados.");
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./index.html";
  });
}

if (editUserBtn) {
  editUserBtn.addEventListener("click", handleEditUser);
}

requireAuth();
loadUserInfo();
loadRideData();