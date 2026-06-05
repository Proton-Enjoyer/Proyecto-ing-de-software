const boton = document.getElementById('mi-boton')
const mensaje = document.getElementById('contenedor-mensaje')

const map = L.map('map').setView([10.4806, -66.9036], 13); // Coordenadas de Caracas
// Añadir el "fondo" (el mapa base de OpenStreetMap)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);
// Añadir un marcador de ejemplo
L.marker([10.4806, -66.9036]).addTo(map)
    .bindPopup('Aquí empezé a correr!')
    .openPopup();

boton.addEventListener('click', () => {

    mensaje.innerText = 'El boton fue presionado'
    console.log('El estado del DOM ha cambiado');
});