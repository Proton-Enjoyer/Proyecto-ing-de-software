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
btn2.addEventListener('click', mostrarMensaje);
