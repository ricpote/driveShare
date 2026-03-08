const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const myRidesContainer = document.getElementById("myRidesContainer");
const joinedRidesContainer = document.getElementById("joinedRidesContainer");
const requestsContainer = document.getElementById("requestsContainer");
const accountMessage = document.getElementById("accountMessage");

function formatRideDate(dateValue) {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(date);
}

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

async function loadAccount() {
  const user = window.uniRide.requireAuth();
  if (!user) return;
  if (profileName) profileName.textContent = user.name || "Utilizador";
  if (profileEmail) profileEmail.textContent = user.email || "";

  try {
    const [myRides, joinedRides] = await Promise.all([
      window.uniRide.apiFetch("/rides/my-rides", { method: "GET" }),
      window.uniRide.apiFetch("/rides/joined-rides", { method: "GET" })
    ]);

    renderRideList(myRidesContainer, myRides, "Ainda não criaste boleias.", true);
    renderRideList(joinedRidesContainer, joinedRides, "Ainda não participas em boleias.");

    const requestLists = await Promise.all(
      myRides.map(async (ride) => {
        try {
          const requests = await window.uniRide.apiFetch(`/rides/${ride._id}/requests`, { method: "GET" });
          return requests.map((request) => ({ ride, request }));
        } catch {
          return [];
        }
      })
    );

    renderRequests(requestLists.flat());
  } catch (error) {
    if (accountMessage) {
      accountMessage.textContent = error.message;
      accountMessage.className = "message error";
    }
  }
}

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

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.addEventListener("click", () => { window.uniRide.clearSession(); window.location.href = "index.html"; });

loadAccount();
