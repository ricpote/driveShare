const API_USERS_URL = "http://localhost:5000/api/users";

const messageBox = document.getElementById("message");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
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

// Mostrar mensagens de erro vindas da URL (OAuth callback)
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

// LOGIN
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    hideMessage();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      showMessage("Preenche o email e a palavra-passe.");
      return;
    }

    if (!email.endsWith("@campus.fct.unl.pt")) {
      showMessage("Tens de usar um email universitário válido.");
      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtn.textContent = "A entrar...";

      const response = await fetch(`${API_USERS_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.error || "Erro ao fazer login.");
        return;
      }

      localStorage.setItem("token", data.token);
      window.location.href = "./dashboard.html";
    } catch (err) {
      console.error("Erro no login:", err);
      showMessage("Não foi possível ligar ao servidor.");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Entrar";
    }
  });
}

// REGISTO
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
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
      registerBtn.disabled = true;
      registerBtn.textContent = "A criar conta...";

      const response = await fetch(`${API_USERS_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.error || "Erro ao criar conta.");
        return;
      }

      showMessage("Conta criada com sucesso. Agora faz login.", "success");
      document.getElementById("registerName").value = "";
      document.getElementById("registerEmail").value = "";
      document.getElementById("registerPhone").value = "";
      document.getElementById("registerPassword").value = "";
      document.getElementById("registerConfirmPassword").value = "";
      showTab("login");
    } catch (err) {
      console.error("Erro no registo:", err);
      showMessage("Não foi possível ligar ao servidor.");
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = "Criar conta";
    }
  });
}

// GOOGLE LOGIN
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", () => {
    window.location.href = `${API_USERS_URL}/auth/google`;
  });
}
