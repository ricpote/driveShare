const form = document.getElementById("rideForm");

if(form){
form.addEventListener("submit", function(e){

e.preventDefault();

const origin = document.getElementById("origin").value;
const time = document.getElementById("time").value;
const seats = document.getElementById("seats").value;

const ride = {
origin,
time,
seats
};

let rides = JSON.parse(localStorage.getItem("rides")) || [];

rides.push(ride);

localStorage.setItem("rides", JSON.stringify(rides));

alert("Boleia criada!");

});
}

function login(){
window.location.href = "dashboard.html";
}