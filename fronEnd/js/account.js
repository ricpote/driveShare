const user = JSON.parse(localStorage.getItem("currentUser"));
const rides = JSON.parse(localStorage.getItem("rides")) || [];

if(user){

document.getElementById("userName").textContent = user.name;
document.getElementById("userEmail").textContent = user.email;
document.getElementById("userZone").textContent = user.zone;
document.getElementById("userUniversity").textContent = user.university;

}

const activeContainer = document.getElementById("activeRides");
const historyContainer = document.getElementById("rideHistory");

const now = new Date().toTimeString().slice(0,5);

const active = rides.filter(r => r.time >= now);
const history = rides.filter(r => r.time < now);

function createRideCard(ride){

const card = document.createElement("div");
card.className = "ride-card";

card.innerHTML = `
<h3>${ride.origin} → ${ride.destination}</h3>
<p>Hora: ${ride.time}</p>
<p>Lugares: ${ride.seats}</p>
`;

return card;

}

if(active.length){

activeContainer.innerHTML = "";
active.forEach(r => activeContainer.appendChild(createRideCard(r)));

}

if(history.length){

historyContainer.innerHTML = "";
history.forEach(r => historyContainer.appendChild(createRideCard(r)));

}