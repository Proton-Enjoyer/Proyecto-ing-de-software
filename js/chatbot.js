// js/chatbot.js

export function inicializarChatbot() {
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const container = document.getElementById('chatbot-container');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const inputField = document.getElementById('chatbot-input');
    const messagesContainer = document.getElementById('chatbot-messages');

    if (!toggleBtn || !container) return;

    toggleBtn.addEventListener('click', () => {
        container.classList.toggle('hidden');
    });

    closeBtn.addEventListener('click', () => {
        container.classList.add('hidden');
    });

    async function enviarMensaje() {
        const texto = inputField.value.trim();
        if (!texto) return;

        messagesContainer.innerHTML += `<div class="user-msg">${texto}</div>`;
        inputField.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'bot-msg';
        loadingDiv.innerText = 'Escribiendo...';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            // Pega aquí tu clave real (la que empieza por AQ...)
            const API_KEY = "AQ.Ab8RN6KDLUeCm8iHsl303P_S5u8INBPlxdcXonrnP_SepdKtZQ"; 

            // Llamada usando la URL oficial soportada por el sistema actual
            const response = anadirConsulta(API_KEY, texto);
            // Simulamos la respuesta mientras conectamos con el SDK global
            const respuestaIA = await consultarGemini(API_KEY, texto);
            
            loadingDiv.innerText = respuestaIA;
        } catch (error) {
            console.error('Error con Gemini:', error);
            loadingDiv.innerText = '¡Hola! Como asistente de RunWell te ayudo con tus rutas y entrenamientos.';
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function consultarGemini(apiKey, mensajeUsuario) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Eres el asistente virtual de RunWell, una aplicación web de bienestar, rutas y seguimiento de actividades físicas. Responde de forma breve, amable y directa a la siguiente duda del usuario: ${mensajeUsuario}`
                        }]
                    }]
                })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            } else if (data.error) {
                console.error("Error devuelto por la API:", data.error.message);
                return "Ups, hubo un pequeño detalle con la clave. Revisa que esté activa en Google AI Studio.";
            }
            
            return generarRespuestaLocal(mensajeUsuario);
        } catch (error) {
            console.error('Error en la conexión con la API:', error);
            return generarRespuestaLocal(mensajeUsuario);
        }
    }

    function generarRespuestaLocal(pregunta) {
        const p = pregunta.toLowerCase();
        if (p.includes('ruta') || p.includes('mapa') || p.includes('tiempo')) {
            return "En RunWell puedes visualizar tus rutas en tiempo real desde la sección del Mapa y llevar el control detallado de cada trayecto.";
        } else if (p.includes('entreno') || p.includes('rutina') || p.includes('salud')) {
            return "Para mejorar tus entrenamientos te recomendamos mantener constancia y revisar tu historial de actividad guardado en la plataforma.";
        }
        return "¡Entendido! RunWell está diseñada para optimizar tus rutas y ayudarte a cumplir tus metas de bienestar físico.";
    }

    sendBtn.addEventListener('click', enviarMensaje);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensaje();
    });
}
