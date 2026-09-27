// Referencias a los elementos del DOM: se resuelven una sola vez al cargar
// y se comparten entre módulos (si un elemento no existe, el valor es null).

const $ = (id) => document.getElementById(id);

// Secciones de la página
export const mapContainer = $('map-container');
export const heroSection = document.querySelector('.hero');
export const eventosSection = $('planes-section');
export const historialSection = $('historial-section');
export const eventosGrid = document.querySelector('.planes-grid');
export const historialLista = $('historial-lista');
export const borrarHistorialBtn = $('borrar-historial-btn');

// Botones de navegación e interfaz
export const btnVerRutas = $('hero-btn');
export const btnCerrar = $('close-map');
export const btnUbicar = $('locate-btn');
export const btnEmpezar = $('cta-btn');
export const btnInicio = $('inicio-btn');
export const btnEventos = $('eventos-btn');
export const btnHistorial = $('historial-btn');
export const btnTheme = $('theme-toggle');

// Menú móvil (hamburguesa)
export const menuToggle = $('menuToggle');
export const navItems = $('items');

// Prompt de proximidad (aparece cuando estás cerca de una ruta)
export const promptCercania = $('proximity-prompt');
export const ppRuta = $('pp-ruta');
export const ppDist = $('pp-dist');
export const ppTrote = $('pp-trote');
export const ppCarrera = $('pp-carrera');
export const ppIgnorar = $('pp-ignorar');
export const ppCerrar = $('pp-close');

// Panel flotante con distancia y ritmo en vivo mientras hay actividad
export const hudPanel = $('hud-actividad');
export const hudTime = $('hud-time');
export const hudDist = $('hud-dist');
export const hudRitmo = $('hud-ritmo');
