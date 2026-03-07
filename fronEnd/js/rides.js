const container = document.getElementById("ridesContainer");

let rides = JSON.parse(localStorage.getItem("rides")) || [];

rides.forEach(ride => {

const card = document.createElement("div");

card.innerHTML = `
<h3>${ride.origin} → FCT</h3>
<p>Hora: ${ride.time}</p>
<p>Lugares: ${ride.seats}</p>
<button>Pedir boleia</button>
`;

container.appendChild(card);

});