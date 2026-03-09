const API_BASE_USERS = "http://localhost:5000/api/users";

const userNameEl = document.getElementById("userName");
const userEmailEl = document.getElementById("userEmail");
const userPhoneEl = document.getElementById("userPhone");
const userRatingEl = document.getElementById("userRating");
const ratingCountEl = document.getElementById("ratingCount");
const co2SavedEl = document.getElementById("co2Saved");

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

function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("userId");
}

async function fetchWithAuth(url) {
  const token = requireAuth();
  if (!token) return null;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
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
    throw new Error(data.error || "Erro ao carregar utilizador.");
  }

  return data;
}

async function loadUserProfile() {
  try {
    const userId = getUserIdFromUrl();
    if (!userId) return;

    const user = await fetchWithAuth(`${API_BASE_USERS}/${userId}`);
    if (!user) return;

    userNameEl.textContent = user.name || "Indisponível";
    userEmailEl.textContent = user.email || "Indisponível";
    userPhoneEl.textContent = user.phone || "Indisponível";

    if (user.ratingAverage !== null && user.ratingAverage !== undefined) {
      userRatingEl.textContent = Number(user.ratingAverage).toFixed(1);
    } else {
      userRatingEl.textContent = "Sem avaliações";
    }

    ratingCountEl.textContent = String(user.ratingCount || 0);
    co2SavedEl.textContent = "0 kg";
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);

    userNameEl.textContent = "Erro";
    userEmailEl.textContent = "Erro";
    userPhoneEl.textContent = "Erro";
    userRatingEl.textContent = "Erro";
    ratingCountEl.textContent = "Erro";
    co2SavedEl.textContent = "Erro";
  }
}

requireAuth();
loadUserProfile();