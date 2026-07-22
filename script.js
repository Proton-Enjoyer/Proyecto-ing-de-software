// 1. Datos mock (Tus rutas preparadas en Maracaibo siguiendo calles)
const misRutas = [
    {
        nombre: "Ruta LUZ - Nueva Ciencias",
        coords: [
            [10.671893881362836, -71.63622347755296],
            [10.671813398748995, -71.63610647876394],
            [10.67150871437498, -71.63637557597866],
            [10.67156045325246, -71.63679092167965],
            [10.671715669832091, -71.63715361792558],
            [10.671843497051393, -71.63745431124875],
            [10.67210984546982, -71.63799362932379],
            [10.67248598885211, -71.63882295189116],
            [10.672592562722313, -71.63895053997791],
            [10.6730251268708, -71.63896967819093],
            [10.673827563089782, -71.63835087597022],
            [10.673495304603199, -71.63808932039235]
        ],
        plan: { dia: "Viernes", hora: "08:00 AM" }
    },
    {
        nombre: "Ruta Perímetro LUZ",
        coords: [
            [10.669815170813704, -71.64113766750178],
            [10.671003378718003, -71.64267512009474],
            [10.671438712357302, -71.64364449698635],
            [10.671674304416552, -71.644207360988],
            [10.672211070431374, -71.64525572392643]
        ],
        plan: { dia: "Sábado", hora: "04:00 PM" }
    },
    {
        nombre: "Ruta LUZ - Paseo Sur",
        coords: [
            [10.671680655435987, -71.63715233680365],
            [10.666837170435821, -71.64067925181816]
        ],
        plan: { dia: "Domingo", hora: "10:00 AM" }
    },
    {
        nombre: "Ruta LUZ - Detalle Curvo",
        coords: [
            [10.670835799990027, -71.63568818653437],
            [10.669963300577994, -71.63653793963348],
            [10.66818226224542, -71.63840347505828],
            [10.666550863589826, -71.6400862388954],
            [10.665653027026393, -71.63895397269178]
        ],
        plan: { dia: "Viernes", hora: "03:30 PM" }
    }
];

// 2. Elementos del DOM
const mapContainer = document.getElementById('map-container');
const btnVerRutas = document.getElementById('hero-btn');
const btnCerrar = document.getElementById('close-map');
const btnEventos = document.getElementById('eventos-btn');
const heroSection = document.querySelector('.hero');
const eventosSection = document.getElementById('planes-section');
const btnEmpezar = document.getElementById('cta-btn');
const btnInicio = document.getElementById('inicio-btn');
const menuItems = document.getElementById('items');
const btnTheme = document.getElementById('theme-toggle');

// 3. Lógica para abrir mapa
let mapa;
function abrirMapa(rutaIndex = null) {
    mapContainer.classList.add('map-active');
    
    // Inicializar mapa solo la primera vez
    if (!mapa) {
        // Centro en la Facultad Experimental de Ciencias, LUZ
        mapa = L.map('map').setView([10.686, -71.645], 15);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    }
    
    // Limpiar capas previas
    mapa.eachLayer((layer) => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
            mapa.removeLayer(layer);
        }
    });
    
    // Dibujar rutas y ajustar vista
    const allCoords = [];
    
    // Marcadores personalizados con CSS
    const markerStyle = L.divIcon({
        className: 'custom-marker',
        iconSize: [15, 15],
        iconAnchor: [7, 7]
    });

    const rutasAProcesar = rutaIndex !== null ? [misRutas[rutaIndex]] : misRutas;

    rutasAProcesar.forEach((ruta, idx) => {
        // Polilínea más elegante
        L.polyline(ruta.coords, {
            color: '#FFFE42', // Color primario
            weight: 6,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(mapa);
        
        allCoords.push(...ruta.coords);
        
        // Crear contenido del popup (SIN hora ni dia)
        const popupContent = document.createElement('div');
        const currentIdx = rutaIndex !== null ? rutaIndex : idx; 
        popupContent.innerHTML = `
            <b>${ruta.nombre}</b><br>
            <button id="start-${currentIdx}" class="popup-btn">Iniciar Ruta</button>
            <div id="timer-box-${currentIdx}" style="display:none; margin-top:10px; text-align:center;">
                <span id="time-${currentIdx}" style="font-size: 1.5rem; font-weight: bold;">00:00</span><br>
                <button id="stop-${currentIdx}" class="popup-btn" style="background-color: #ff4d4d; color: white;">Detener</button>
            </div>
        `;
        
        // Lógica del temporizador
        let seconds = 0;
        let timerInterval;
        
        popupContent.querySelector(`#start-${currentIdx}`).addEventListener('click', (e) => {
            e.target.style.display = 'none';
            const timerBox = popupContent.querySelector(`#timer-box-${currentIdx}`);
            timerBox.style.display = 'block';
            
            seconds = 0;
            timerInterval = setInterval(() => {
                seconds++;
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                popupContent.querySelector(`#time-${currentIdx}`).innerText = 
                    `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }, 1000);
        });
        
        popupContent.querySelector(`#stop-${currentIdx}`).addEventListener('click', () => {
            clearInterval(timerInterval);
            popupContent.querySelector(`#timer-box-${currentIdx}`).style.display = 'none';
            popupContent.querySelector(`#start-${currentIdx}`).style.display = 'block';
        });
        
        // Marcadores de inicio y fin estilizados
        L.marker(ruta.coords[0], { icon: markerStyle }).addTo(mapa)
            .bindPopup(popupContent);
        L.marker(ruta.coords[ruta.coords.length - 1], { icon: markerStyle }).addTo(mapa)
            .bindPopup(popupContent);
    });
    
    if (allCoords.length > 0) {
        mapa.fitBounds(allCoords, { padding: [50, 50] });
    }
    mapa.invalidateSize();
}

// 4. Listeners generales
btnVerRutas.addEventListener('click', () => abrirMapa());

btnCerrar.addEventListener('click', () => {
    mapContainer.classList.remove('map-active');
});

// 5. Ocultar sección Hero y mostrar Eventos con animación
btnEventos.addEventListener('click', (e) => {
    e.preventDefault(); 
    heroSection.classList.add('hidden');
    eventosSection.classList.remove('hidden');
    eventosSection.classList.add('fade-in');

    // Renderizar eventos dinámicamente
    const eventosGrid = document.querySelector('.planes-grid');
    eventosGrid.innerHTML = ''; 
    misRutas.forEach((ruta, index) => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <h3>${ruta.nombre}</h3>
            <p>${ruta.plan.dia} - ${ruta.plan.hora}</p>
        `;
        const btnUnirse = document.createElement('button');
        btnUnirse.innerText = "Unirse";
        btnUnirse.addEventListener('click', () => abrirMapa(index));
        card.appendChild(btnUnirse);
        eventosGrid.appendChild(card);
    });
});

// 6. Funcionalidad botón Inicio (reset)
btnInicio.addEventListener('click', (e) => {
    e.preventDefault();
    heroSection.classList.remove('hidden');
    heroSection.classList.add('fade-in'); 
    eventosSection.classList.add('hidden');
    mapContainer.classList.remove('map-active');
});

// 7. Funcionalidad botón empezar (ir al mapa directamente)
btnEmpezar.addEventListener('click', () => {
    abrirMapa();
});

// 8. Modo Oscuro
btnTheme.addEventListener('change', () => {
    document.body.classList.toggle('dark-theme', btnTheme.checked);
});
