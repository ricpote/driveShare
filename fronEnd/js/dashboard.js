const API_RIDES_URL = "http://localhost:5000/api/rides";

const rideForm = document.getElementById("rideForm");
const rideMessage = document.getElementById("rideMessage");
const logoutBtn = document.getElementById("logoutBtn");

function showMessage(text, type = "error") {
  rideMessage.textContent = text;
  rideMessage.classList.remove("hidden", "error", "success");
  rideMessage.classList.add(type);
}

function hideMessage() {
  rideMessage.textContent = "";
  rideMessage.classList.add("hidden");
  rideMessage.classList.remove("error", "success");
}

function getToken() {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get("token");

  if (tokenFromUrl) {
    localStorage.setItem("token", tokenFromUrl);
    window.history.replaceState({}, document.title, window.location.pathname);
    return tokenFromUrl;
  }

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

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "./index.html";
});

rideForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();

  const token = requireAuth();
  if (!token) return;

  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const arrivalDate = document.getElementById("arrivalDate").value;
  const arrivalTimeInput = document.getElementById("arrivalTime").value;
  const origin = document.getElementById("origin").value.trim();
  const destination = document.getElementById("destination").value.trim();
  const seats = Number(document.getElementById("seats").value);

  if (!date || !time || !arrivalDate || !arrivalTimeInput || !origin || !destination || !seats) {
    showMessage("Preenche todos os campos obrigatórios.");
    return;
  }

  const departureDateTime = new Date(`${date}T${time}`);
  const arrivalDateTime = new Date(`${arrivalDate}T${arrivalTimeInput}`);

  if (arrivalDateTime <= departureDateTime) {
    showMessage("A hora de chegada tem de ser depois da partida.");
    return;
  }

  try {
    const response = await fetch(API_RIDES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        from: origin,
        to: destination,
        date: departureDateTime.toISOString(),
        arrivalTime: arrivalDateTime.toISOString(),
        totalSeats: seats
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "./index.html";
        return;
      }

      showMessage(data.error || "Erro ao criar boleia.");
      return;
    }

    showMessage("Boleia criada com sucesso.", "success");
    rideForm.reset();

  } catch (error) {
    console.error("Erro ao criar boleia:", error);
    showMessage("Não foi possível ligar ao servidor.");
  }
});

requireAuth();