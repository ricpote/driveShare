const params = new URLSearchParams(window.location.search);
const name = params.get("name");
const email = params.get("email");
const phone = params.get("phone");

if (!name) {
  document.body.innerHTML = "<p>Utilizador não encontrado.</p>";
} else {
  document.getElementById("profileName").textContent = name;
  document.getElementById("profileEmail").textContent = email || "—";
  document.getElementById("profilePhone").textContent = phone || "—";
}