// Seleccionamos los botones
const btn1 = document.getElementById('cta-btn');
const btn2 = document.getElementById('hero-btn');

// Función simple para demostrar interacción
const mostrarMensaje = () => {
    alert("¡Bienvenido a la comunidad RunWell! Pronto lanzaremos la app.");
};

const cambiarpagina = () => {
  document.getElementById('items').style = 'display: none;';
}

// Añadimos el evento 'click'
btn1.addEventListener('click', cambiarpagina);


// 1. Datos mock (Tus rutas preparadas en Maracaibo siguiendo calles)
const misRutas = [
    {
        nombre: "Ruta LUZ - Ciencias Principal",
        coords: [
            [10.6870, -71.6460],
            [10.6878, -71.6455],
            [10.6885, -71.6450],
            [10.6895, -71.6445]
        ]
    },
    {
        nombre: "Ruta Perímetro LUZ",
        coords: [
            [10.6855, -71.6435],
            [10.6865, -71.6430],
            [10.6875, -71.6425],
            [10.6885, -71.6420]
        ]
    }
];
// 2. Elementos
const mapContainer = document.getElementById('map-container');
const btnVerRutas = document.getElementById('hero-btn'); // O el botón que decidas
const btnCerrar = document.getElementById('close-map');
// 3. Lógica para abrir
let mapa;
btnVerRutas.addEventListener('click', () => {
    mapContainer.classList.add('map-active');
    
    // Inicializar mapa solo la primera vez
    if (!mapa) {
        // Centro en la Facultad Experimental de Ciencias, LUZ
        mapa = L.map('map').setView([10.686, -71.645], 15);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
        
        // Dibujar rutas y ajustar vista
        const allCoords = [];
        
        // Marcadores personalizados con CSS
        const markerStyle = L.divIcon({
            className: 'custom-marker',
            iconSize: [15, 15],
            iconAnchor: [7, 7]
        });

        misRutas.forEach(ruta => {
            // Polilínea más elegante
            L.polyline(ruta.coords, {
                color: '#FFFE42', // Color primario
                weight: 6,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(mapa);
            
            allCoords.push(...ruta.coords);
            
            // Marcadores de inicio y fin estilizados
            L.marker(ruta.coords[0], { icon: markerStyle }).addTo(mapa)
                .bindPopup("Inicio: " + ruta.nombre);
            L.marker(ruta.coords[ruta.coords.length - 1], { icon: markerStyle }).addTo(mapa)
                .bindPopup("Fin: " + ruta.nombre);
        });
        
        if (allCoords.length > 0) {
            mapa.fitBounds(allCoords);
        }
    } else {
        mapa.invalidateSize(); // Necesario al mostrar un div oculto
    }
});

// 4. Lógica para cerrar
btnCerrar.addEventListener('click', () => {
    mapContainer.classList.remove('map-active');
});
