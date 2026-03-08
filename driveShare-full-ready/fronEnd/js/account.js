// --- ELEMENTOS DO DOM ---
const profileName = document.getElementById("userName");
const profileEmail = document.getElementById("userEmail");
const profilePhone = document.getElementById("userPhone");
const profileId = document.getElementById("userId");
const myRidesContainer = document.getElementById("myRidesContainer");
const joinedRidesContainer = document.getElementById("joinedRidesContainer");
const requestsContainer = document.getElementById("requestsContainer");
const accountMessage = document.getElementById("accountMessage");

// --- CONFIGURAÇÃO GLOBAL uniRide ---
window.uniRide = window.uniRide || {};

// API fetch com token JWT
window.uniRide.apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`http://localhost:5000${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro na API");
  }
  return res.json();
};

// Função mínima para verificar se o utilizador está logado
window.uniRide.requireAuth = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return { token };
};

// --- Guarda token recebido via Google OAuth ---
const params = new URLSearchParams(window.location.search);
const token = params.get("token");
if (token) {
  localStorage.setItem("token", token);
  // Remove token da URL para ficar limpo
  window.history.replaceState({}, document.title, window.location.pathname);
}

// --- FUNÇÕES AUXILIARES ---
// Formata data de boleia
function formatRideDate(dateValue) {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(date);
}

// Renderiza lista de boleias
function renderRideList(container, rides, emptyText, withDelete = false) {
  if (!container) return;
  if (!rides.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  container.innerHTML = rides.map((ride) => `
    <article class="ride-card compact-card">
      <h3>${ride.from} → ${ride.to}</h3>
      <div class="ride-meta">${formatRideDate(ride.date)}</div>
      <p>Lugares: <strong>${ride.availableSeats}</strong> / ${ride.totalSeats}</p>
      ${withDelete ? `<button class="inline-btn danger-btn" data-delete-id="${ride._id}">Apagar boleia</button>` : ""}
    </article>
  `).join("");
}

// Renderiza pedidos de boleias
function renderRequests(allRequests) {
  if (!requestsContainer) return;
  if (!allRequests.length) {
    requestsContainer.innerHTML = '<div class="empty-state">Não tens pedidos pendentes nas tuas boleias.</div>';
    return;
  }

  requestsContainer.innerHTML = allRequests.map(({ ride, request }) => `
    <article class="ride-card compact-card">
      <h3>${ride.from} → ${ride.to}</h3>
      <div class="ride-meta">Pedido pendente · ${formatRideDate(ride.date)}</div>
      <p>ID do passageiro: <strong>${request.passengerId}</strong></p>
      <div class="action-row">
        <button class="inline-btn" data-accept-ride-id="${ride._id}" data-request-id="${request._id}">Aceitar</button>
        <button class="secondary-btn small-btn" data-reject-ride-id="${ride._id}" data-request-id="${request._id}">Rejeitar</button>
      </div>
    </article>
  `).join("");
}

// --- FUNÇÃO PRINCIPAL: CARREGA CONTA ---
async function loadAccount() {
  try {
    const authUser = window.uniRide.requireAuth();
    if (!authUser) return;

    // Busca dados completos do utilizador
    const user = await window.uniRide.apiFetch("/api/users/me");

    if (profileName) profileName.textContent = user.name || "Utilizador";
    if (profileEmail) profileEmail.textContent = user.email || "";
    if (profilePhone) profilePhone.textContent = user.phone || "—";
    if (profileId) profileId.textContent = user._id || "—";

    // Busca boleias
    const [myRides, joinedRides] = await Promise.all([
      window.uniRide.apiFetch("/rides/my-rides"),
      window.uniRide.apiFetch("/rides/joined-rides")
    ]);

    renderRideList(myRidesContainer, myRides, "Ainda não criaste boleias.", true);
    renderRideList(joinedRidesContainer, joinedRides, "Ainda não participas em boleias.");

    // Busca pedidos nas boleias do utilizador
    const requestLists = await Promise.all(
      myRides.map(async (ride) => {
        try {
          const requests = await window.uniRide.apiFetch(`/rides/${ride._id}/requests`);
          return requests.map((request) => ({ ride, request }));
        } catch {
          return [];
        }
      })
    );

    renderRequests(requestLists.flat());

  } catch (error) {
    if (accountMessage) {
      accountMessage.textContent = error.message || "Erro ao carregar dados da conta.";
      accountMessage.className = "message error";
    }
  }
}

// --- EVENTOS ---
// Apagar boleia
myRidesContainer?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;
  try {
    await window.uniRide.apiFetch(`/rides/${button.dataset.deleteId}`, { method: "DELETE" });
    loadAccount();
  } catch (error) {
    if (accountMessage) {
      accountMessage.textContent = error.message;
      accountMessage.className = "message error";
    }
  }
});

// Aceitar/Rejeitar pedidos
requestsContainer?.addEventListener("click", async (event) => {
  const acceptBtn = event.target.closest("[data-accept-ride-id]");
  const rejectBtn = event.target.closest("[data-reject-ride-id]");
  try {
    if (acceptBtn) {
      await window.uniRide.apiFetch(`/rides/${acceptBtn.dataset.acceptRideId}/requests/${acceptBtn.dataset.requestId}/accept`, { method: "POST" });
      loadAccount();
    }
    if (rejectBtn) {
      await window.uniRide.apiFetch(`/rides/${rejectBtn.dataset.rejectRideId}/requests/${rejectBtn.dataset.requestId}/reject`, { method: "POST" });
      loadAccount();
    }
  } catch (error) {
    if (accountMessage) {
      accountMessage.textContent = error.message;
      accountMessage.className = "message error";
    }
  }
});

// Logout
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn?.addEventListener("click", () => { 
  localStorage.removeItem("token");
  window.location.href = "index.html"; 
});

// --- CARREGA TUDO ---
loadAccount();