const USERS_KEY = "uniride_users";
const SESSION_KEY = "uniride_current_user";
const RIDES_KEY = "rides";
const allowedDomains = ["campus.fct.unl.pt", "fct.unl.pt"];

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem(SESSION_KEY));
}

function saveCurrentUser(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

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

const tabs = document.querySelectorAll(".tab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

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

if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const phone = document.getElementById("registerPhone").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const confirmPassword = document.getElementById("registerConfirmPassword").value.trim();

    if (!isUniversityEmail(email)) {
      showMessage("message", "Usa um email universitário válido da FCT.", "error");
      return;
    }

    if (!/^\d{9}$/.test(phone)) {
      showMessage("message", "Introduz um número de telemóvel com 9 dígitos.", "error");
      return;
    }

    if (password.length < 6) {
      showMessage("message", "A palavra-passe deve ter pelo menos 6 caracteres.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("message", "As palavras-passe não coincidem.", "error");
      return;
    }

    const users = getUsers();
    const alreadyExists = users.some((user) => user.email === email);

    if (alreadyExists) {
      showMessage("message", "Já existe uma conta com esse email.", "error");
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      phone,
      password
    };

    users.push(newUser);
    saveUsers(users);
    saveCurrentUser({ id: newUser.id, name, email, phone });

    showMessage("message", "Conta criada com sucesso.", "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value.trim();

    const users = getUsers();
    const foundUser = users.find((user) => user.email === email && user.password === password);

    if (!foundUser) {
      showMessage("message", "Email ou palavra-passe inválidos.", "error");
      return;
    }

    saveCurrentUser({
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      phone: foundUser.phone || ""
    });

    showMessage("message", "Login efetuado com sucesso.", "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  });
}

const rideForm = document.getElementById("rideForm");
if (rideForm) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = "index.html";
  } else {
    const welcomeText = document.getElementById("welcomeText");
    if (welcomeText) {
      welcomeText.textContent = `Olá, ${currentUser.name}.`;
    }
    updateDashboardStats();
  }

  const createRideMapEl = document.getElementById("createRideMap");
  const originInput = document.getElementById("origin");
  const findOriginBtn = document.getElementById("findOriginBtn");
  let createRideMap = null;
  let selectedMarker = null;

  async function reverseGeocode(lat, lng) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept": "application/json",
          "Accept-Language": "pt-PT,pt;q=0.9"
        }
      }
    );

    if (!response.ok) {
      throw new Error("Falha ao converter coordenadas em morada.");
    }

    return response.json();
  }

  async function geocodeOrigin(query) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pt&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "Accept": "application/json",
          "Accept-Language": "pt-PT,pt;q=0.9"
        }
      }
    );

    if (!response.ok) {
      throw new Error("Falha a procurar a origem.");
    }

    const results = await response.json();
    if (!results.length) {
      throw new Error("Não foi possível localizar essa origem no mapa.");
    }

    return results[0];
  }

  function setPickupPoint(lat, lng, label = "Ponto de partida") {
    document.getElementById("startLat").value = Number(lat).toFixed(6);
    document.getElementById("startLng").value = Number(lng).toFixed(6);

    if (!createRideMap || typeof L === "undefined") return;

    if (selectedMarker) {
      selectedMarker.setLatLng([lat, lng]);
    } else {
      const pickupIcon = L.divIcon({
        className: "pickup-marker-wrapper",
        html: `<div class="pickup-marker"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      selectedMarker = L.marker([lat, lng], { icon: pickupIcon }).addTo(createRideMap);
    }

    if (label) {
      selectedMarker.bindPopup(`<strong>${label}</strong>`);
    }

    createRideMap.setView([lat, lng], 14);
  }

  async function searchTypedOrigin() {
    const query = originInput?.value.trim();
    if (!query) {
      showMessage("rideMessage", "Escreve uma origem para a localizar no mapa.", "error");
      return false;
    }

    try {
      hideMessage("rideMessage");
      if (findOriginBtn) {
        findOriginBtn.disabled = true;
        findOriginBtn.textContent = "A procurar...";
      }

      const result = await geocodeOrigin(query);
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      const label = result.display_name || query;

      originInput.value = label;
      setPickupPoint(lat, lng, label);
      showMessage("rideMessage", "Origem encontrada no mapa.", "success");
      return true;
    } catch (error) {
      showMessage("rideMessage", error.message || "Não foi possível localizar essa origem.", "error");
      return false;
    } finally {
      if (findOriginBtn) {
        findOriginBtn.disabled = false;
        findOriginBtn.textContent = "Encontrar no mapa";
      }
    }
  }

  if (createRideMapEl && typeof L !== "undefined") {
    createRideMap = L.map("createRideMap").setView([38.661, -9.204], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(createRideMap);

    createRideMap.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      setPickupPoint(lat, lng);

      try {
        const result = await reverseGeocode(lat, lng);
        const label = result.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (originInput) {
          originInput.value = label;
        }
        if (selectedMarker) {
          selectedMarker.bindPopup(`<strong>${label}</strong>`).openPopup();
        }
      } catch {
        if (originInput && !originInput.value.trim()) {
          originInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
      }
    });

    setTimeout(() => {
      createRideMap.invalidateSize();
    }, 200);
  }

  if (findOriginBtn) {
    findOriginBtn.addEventListener("click", searchTypedOrigin);
  }

  if (originInput) {
    originInput.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        await searchTypedOrigin();
      }
    });

    originInput.addEventListener("blur", async () => {
      const hasText = originInput.value.trim();
      const hasCoords = document.getElementById("startLat").value && document.getElementById("startLng").value;

      if (hasText && !hasCoords) {
        await searchTypedOrigin();
      }
    });
  }

  rideForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const origin = document.getElementById("origin").value.trim();
    const date = document.getElementById("date").value;
    const seats = Number(document.getElementById("seats").value);
    const comment = document.getElementById("rideComment").value.trim();
    const startLat = Number(document.getElementById("startLat").value);
    const startLng = Number(document.getElementById("startLng").value);
    const user = getCurrentUser();

    if ((!startLat || !startLng) && origin) {
      const found = await searchTypedOrigin();
      if (!found) return;
    }

    const finalStartLat = Number(document.getElementById("startLat").value);
    const finalStartLng = Number(document.getElementById("startLng").value);

    if (!finalStartLat || !finalStartLng) {
      showMessage("rideMessage", "Escolhe o ponto de partida no mapa ou encontra a origem pelo nome.", "error");
      return;
    }

    const ride = {
      id: Date.now(),
      driverId: user.id,
      driverName: user.name,
      driverEmail: user.email,
      driverPhone: user.phone || "",
      origin: document.getElementById("origin").value.trim(),
      destination: "FCT NOVA",
      comment,
      date,
      time,
      seats,
      startLat: finalStartLat,
      startLng: finalStartLng
    };

    const rides = JSON.parse(localStorage.getItem(RIDES_KEY)) || [];
    rides.push(ride);
    localStorage.setItem(RIDES_KEY, JSON.stringify(rides));

    showMessage("rideMessage", "Boleia guardada com sucesso.", "success");
    rideForm.reset();

    document.getElementById("startLat").value = "";
    document.getElementById("startLng").value = "";

    if (selectedMarker && createRideMap) {
      createRideMap.removeLayer(selectedMarker);
      selectedMarker = null;
    }

    updateDashboardStats();
  });
}

function updateDashboardStats() {
  const rides = JSON.parse(localStorage.getItem(RIDES_KEY)) || [];
  const totalRides = rides.length;
  const totalSeats = rides.reduce((sum, ride) => sum + Number(ride.seats || 0), 0);
  const estimatedCo2 = (totalRides * 2.4).toFixed(1);

  const ridesEl = document.getElementById("totalRides");
  const seatsEl = document.getElementById("totalSeats");
  const co2El = document.getElementById("co2Saved");

  if (ridesEl) ridesEl.textContent = totalRides;
  if (seatsEl) seatsEl.textContent = totalSeats;
  if (co2El) co2El.textContent = `${estimatedCo2} kg`;
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  });
}