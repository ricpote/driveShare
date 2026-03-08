const API_USERS_URL = "http://localhost:5000/api/users";

const tabs = document.querySelectorAll(".tab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const messageBox = document.getElementById("message");
const googleLoginBtn = document.getElementById("googleLoginBtn");

function showMessage(text, type = "error") {
  messageBox.textContent = text;
  messageBox.classList.remove("hidden", "error", "success");
  messageBox.classList.add(type);
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.classList.add("hidden");
  messageBox.classList.remove("error", "success");
}

function switchTab(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  loginForm.classList.toggle("active", tabName === "login");
  registerForm.classList.toggle("active", tabName === "register");

  hideMessage();
}

// Alternar tabs
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchTab(tab.dataset.tab);
  });
});

// Mostrar mensagens de erro vindas da URL
function handleUrlMessages() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  if (!error) return;

  const errorMessages = {
    failed: "Falha na autenticação com Google.",
    dominio_invalido: "Só podes usar uma conta do domínio campus.fct.unl.pt.",
    auth_failed: "Não foi possível autenticar a conta Google.",
    server_error: "Erro interno no servidor.",
    user_creation_failed: "Não foi possível criar o utilizador."
  };

  showMessage(errorMessages[error] || "Ocorreu um erro ao autenticar.");
}

handleUrlMessages();

// LOGIN normal
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  if (!email.endsWith("@campus.fct.unl.pt")) {
    showMessage("Tens de usar um email universitário válido.");
    return;
  }

  try {
    const response = await fetch(`${API_USERS_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.error || "Erro ao fazer login.");
      return;
    }

    localStorage.setItem("token", data.token);
    showMessage("Login efetuado com sucesso.", "success");

    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 700);

  } catch (error) {
    console.error("Erro no login:", error);
    showMessage("Não foi possível ligar ao servidor.");
  }
});

// REGISTO
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim().toLowerCase();
  const phone = document.getElementById("registerPhone").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerConfirmPassword").value;

  if (!name || !email || !phone || !password || !confirmPassword) {
    showMessage("Preenche todos os campos.");
    return;
  }

  if (!email.endsWith("@campus.fct.unl.pt")) {
    showMessage("Só são permitidos emails universitários.");
    return;
  }

  if (password.length < 6) {
    showMessage("A palavra-passe deve ter pelo menos 6 caracteres.");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("As palavras-passe não coincidem.");
    return;
  }

  try {
    const response = await fetch(`${API_USERS_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.error || "Erro ao criar conta.");
      return;
    }

    showMessage("Conta criada com sucesso. Agora faz login.", "success");
    registerForm.reset();
    switchTab("login");

  } catch (error) {
    console.error("Erro no registo:", error);
    showMessage("Não foi possível ligar ao servidor.");
  }
});

// LOGIN COM GOOGLE
googleLoginBtn.addEventListener("click", () => {
  window.location.href = `${API_USERS_URL}/auth/google`;
});