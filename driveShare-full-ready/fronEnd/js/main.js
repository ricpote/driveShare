const API_BASE_URL = "http://localhost:5000/api";
const TOKEN_KEY = "uniride_token";
const USER_KEY = "uniride_current_user";
const GEO_CACHE_KEY = "uniride_geocode_cache";
const allowedDomains = ["campus.fct.unl.pt", "fct.unl.pt"];

function showMessage(elementId, text, type) {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.textContent = text;
  box.className = `message ${type}`;
}

function hideMessage(elementId) {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.textContent = "";
  box.className = "message hidden";
}

function isUniversityEmail(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return allowedDomains.includes(domain);
}

function saveToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function saveCurrentUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
function getCurrentUser() { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function syncUserFromToken() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return getCurrentUser();
  const user = {
    id: payload.userId,
    email: payload.email,
    name: payload.name || payload.email?.split("@")[0] || "utilizador"
  };
  saveCurrentUser(user);
  return user;
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = typeof data === "object" && data?.error ? data.error : "Ocorreu um erro no servidor.";
    throw new Error(errorMessage);
  }
  return data;
}

function captureTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const error = params.get("error");

  if (token) {
    saveToken(token);
    syncUserFromToken();
    const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  if (error) {
    const messageMap = {
      failed: "Falhou a autenticação com Google.",
      dominio_invalido: "Só são permitidos emails institucionais válidos.",
      auth_failed: "Não foi possível concluir o login institucional.",
      server_error: "Erro do servidor no login com Google."
    };
    showMessage("message", messageMap[error] || "Não foi possível concluir o login.", "error");
  }
}

function getGeocodeCache() {
  return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}");
}

function setGeocodeCache(cache) {
  localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
}

async function geocodePlace(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const cache = getGeocodeCache();
  if (cache[normalized]) return cache[normalized];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "pt");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: { "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8" }
  });
  if (!response.ok) throw new Error("Não foi possível procurar localizações.");
  const results = await response.json();
  cache[normalized] = results;
  setGeocodeCache(cache);
  return results;
}

async function reverseGeocode(lat, lon) {
  const key = `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`;
  const cache = getGeocodeCache();
  if (cache[key]) return cache[key];

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);

  const response = await fetch(url.toString(), {
    headers: { "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8" }
  });
  if (!response.ok) throw new Error("Não foi possível obter a morada desse ponto.");
  const result = await response.json();
  cache[key] = result;
  setGeocodeCache(cache);
  return result;
}

function attachAutocomplete(inputId, latId, lngId) {
  const input = document.getElementById(inputId);
  const latInput = document.getElementById(latId);
  const lngInput = document.getElementById(lngId);
  const list = document.getElementById(`${inputId}Suggestions`);
  if (!input || !latInput || !lngInput || !list) return;

  let debounce;
  input.addEventListener("input", () => {
    latInput.value = "";
    lngInput.value = "";
    clearTimeout(debounce);
    const query = input.value.trim();
    if (query.length < 3) {
      list.innerHTML = "";
      list.classList.add("hidden");
      return;
    }

    debounce = setTimeout(async () => {
      try {
        const results = await geocodePlace(query);
        list.innerHTML = "";
        if (!results.length) {
          list.classList.add("hidden");
          return;
        }
        results.forEach((result) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "suggestion-item";
          item.textContent = result.display_name;
          item.addEventListener("click", () => {
            input.value = result.display_name;
            latInput.value = result.lat;
            lngInput.value = result.lon;
            list.innerHTML = "";
            list.classList.add("hidden");
            document.dispatchEvent(new CustomEvent("geocode:selected", {
              detail: { inputId, result }
            }));
          });
          list.appendChild(item);
        });
        list.classList.remove("hidden");
      } catch {
        list.innerHTML = "";
        list.classList.add("hidden");
      }
    }, 300);
  });

  document.addEventListener("click", (event) => {
    if (!list.contains(event.target) && event.target !== input) {
      list.classList.add("hidden");
    }
  });
}

function createMap(mapId) {
  const element = document.getElementById(mapId);
  if (!element || typeof L === "undefined") return null;
  const map = L.map(mapId).setView([38.661, -9.2044], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
  return map;
}

function requireAuth(redirect = true) {
  captureTokenFromUrl();
  const token = getToken();
  if (!token) {
    if (redirect) window.location.href = "index.html";
    return null;
  }
  return syncUserFromToken() || getCurrentUser();
}

const tabs = document.querySelectorAll(".tab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const googleLoginBtn = document.getElementById("googleLoginBtn");

if (tabs.length) {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      const selected = tab.dataset.tab;
      loginForm.classList.toggle("active", selected === "login");
      registerForm.classList.toggle("active", selected === "register");
      hideMessage("message");
    });
  });
}

captureTokenFromUrl();

if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", () => {
    window.location.href = `${API_BASE_URL}/users/auth/google`;
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage("message");

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value.trim();
    const confirmPassword = document.getElementById("registerConfirmPassword").value.trim();

    if (!isUniversityEmail(email)) return showMessage("message", "Usa um email universitário válido da FCT.", "error");
    if (password.length < 6) return showMessage("message", "A palavra-passe deve ter pelo menos 6 caracteres.", "error");
    if (password !== confirmPassword) return showMessage("message", "As palavras-passe não coincidem.", "error");

    try {
      await apiFetch("/users/register", { method: "POST", body: JSON.stringify({ name, email, password, phone: "" }) });
      const loginResult = await apiFetch("/users/login", { method: "POST", body: JSON.stringify({ email, password }) });
      saveToken(loginResult.token);
      saveCurrentUser({ name, email });
      showMessage("message", "Conta criada com sucesso.", "success");
      setTimeout(() => { window.location.href = "dashboard.html"; }, 700);
    } catch (error) {
      showMessage("message", error.message, "error");
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage("message");

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const result = await apiFetch("/users/login", { method: "POST", body: JSON.stringify({ email, password }) });
      saveToken(result.token);
      syncUserFromToken();
      showMessage("message", "Login efetuado com sucesso.", "success");
      setTimeout(() => { window.location.href = "dashboard.html"; }, 700);
    } catch (error) {
      showMessage("message", error.message, "error");
    }
  });
}

const rideForm = document.getElementById("rideForm");
if (rideForm) {
  const currentUser = requireAuth();
  if (currentUser) {
    const welcomeText = document.getElementById("welcomeText");
    if (welcomeText) welcomeText.textContent = `Olá, ${currentUser?.name || currentUser?.email || "utilizador"}.`;
    updateDashboardStats();

    const map = createMap("rideMap");
    let originMarker = null;
    let destinationMarker = null;
    let routeLine = null;

    const updateMapBounds = () => {
      const layers = [originMarker, destinationMarker].filter(Boolean);
      if (!map || !layers.length) return;
      const group = L.featureGroup(layers);
      map.fitBounds(group.getBounds().pad(0.3));
    };

    const updateRouteLine = () => {
      if (!map) return;
      if (routeLine) map.removeLayer(routeLine);
      if (originMarker && destinationMarker) {
        routeLine = L.polyline([originMarker.getLatLng(), destinationMarker.getLatLng()]).addTo(map);
      }
    };

    attachAutocomplete("origin", "fromLat", "fromLng");
    attachAutocomplete("destination", "toLat", "toLng");

    document.addEventListener("geocode:selected", (event) => {
      const { inputId, result } = event.detail;
      if (!map) return;
      const latlng = [Number(result.lat), Number(result.lon)];
      if (inputId === "origin") {
        if (originMarker) map.removeLayer(originMarker);
        originMarker = L.marker(latlng).addTo(map).bindPopup("Origem");
      }
      if (inputId === "destination") {
        if (destinationMarker) map.removeLayer(destinationMarker);
        destinationMarker = L.marker(latlng).addTo(map).bindPopup("Destino");
      }
      updateRouteLine();
      updateMapBounds();
    });

    if (map) {
      map.on("click", async (event) => {
        const mode = document.querySelector('input[name="mapPointMode"]:checked')?.value || "origin";
        const { lat, lng } = event.latlng;
        try {
          const reverse = await reverseGeocode(lat, lng);
          const label = reverse.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          if (mode === "origin") {
            document.getElementById("origin").value = label;
            document.getElementById("fromLat").value = lat;
            document.getElementById("fromLng").value = lng;
            if (originMarker) map.removeLayer(originMarker);
            originMarker = L.marker([lat, lng]).addTo(map).bindPopup("Origem");
          } else {
            document.getElementById("destination").value = label;
            document.getElementById("toLat").value = lat;
            document.getElementById("toLng").value = lng;
            if (destinationMarker) map.removeLayer(destinationMarker);
            destinationMarker = L.marker([lat, lng]).addTo(map).bindPopup("Destino");
          }
          updateRouteLine();
          updateMapBounds();
        } catch (error) {
          showMessage("rideMessage", error.message, "error");
        }
      });
    }
  }

  rideForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage("rideMessage");

    const from = document.getElementById("origin").value.trim();
    const to = document.getElementById("destination").value.trim();
    const day = document.getElementById("rideDate").value;
    const time = document.getElementById("time").value;
    const totalSeats = Number(document.getElementById("seats").value);
    const comment = document.getElementById("time").value.trim();

    if (!day || !time) return showMessage("rideMessage", "Escolhe data e hora da boleia.", "error");
    if (!from || !to) return showMessage("rideMessage", "Define origem e destino.", "error");

    try {
      const date = new Date(`${day}T${time}:00`);
      await apiFetch("/rides", {
        method: "POST",
        body: JSON.stringify({
          from,
          to,
          date,
          totalSeats,
          comment,
          fromCoords: {
            lat: Number(document.getElementById("fromLat").value) || null,
            lng: Number(document.getElementById("fromLng").value) || null,
          },
          toCoords: {
            lat: Number(document.getElementById("toLat").value) || null,
            lng: Number(document.getElementById("toLng").value) || null,
          }
        })
      });
      showMessage("rideMessage", "Boleia guardada com sucesso.", "success");
      rideForm.reset();
      document.getElementById("originSuggestions").classList.add("hidden");
      document.getElementById("destinationSuggestions").classList.add("hidden");
      updateDashboardStats();
    } catch (error) {
      showMessage("rideMessage", error.message, "error");
    }
  });
}

async function updateDashboardStats() {
  const ridesEl = document.getElementById("totalRides");
  const seatsEl = document.getElementById("totalSeats");
  const co2El = document.getElementById("co2Saved");
  if (!ridesEl && !seatsEl && !co2El) return;
  try {
    const rides = await apiFetch("/rides", { method: "GET" });
    const totalRides = rides.length;
    const totalSeats = rides.reduce((sum, ride) => sum + Number(ride.availableSeats || 0), 0);
    const estimatedCo2 = (totalRides * 2.4).toFixed(1);
    if (ridesEl) ridesEl.textContent = totalRides;
    if (seatsEl) seatsEl.textContent = totalSeats;
    if (co2El) co2El.textContent = `${estimatedCo2} kg`;
  } catch (_) {
    if (ridesEl) ridesEl.textContent = "0";
    if (seatsEl) seatsEl.textContent = "0";
    if (co2El) co2El.textContent = "0 kg";
  }
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.addEventListener("click", () => { clearSession(); window.location.href = "index.html"; });

window.uniRide = {
  apiFetch,
  getToken,
  getCurrentUser,
  requireAuth,
  clearSession,
  syncUserFromToken,
  geocodePlace,
  reverseGeocode,
  createMap,
  showMessage,
  hideMessage,
  decodeJwtPayload
};
