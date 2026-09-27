// js/chatbot.js

export function inicializarChatbot() {
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const container = document.getElementById('chatbot-container');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const inputField = document.getElementById('chatbot-input');
    const messagesContainer = document.getElementById('chatbot-messages');

    if (!toggleBtn || !container) return;

    // Abrir y cerrar la ventana del chat
    toggleBtn.addEventListener('click', () => {
        container.classList.toggle('hidden');
    });

    closeBtn.addEventListener('click', () => {
        container.classList.add('hidden');
    });

    // Función para enviar mensaje a Gemini
    async function enviarMensaje() {
        const texto = inputField.value.trim();
        if (!texto) return;

        // Renderizar el mensaje del usuario
        messagesContainer.innerHTML += `<div class="user-msg">${texto}</div>`;
        inputField.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Mostrar indicador de carga
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'bot-msg';
        loadingDiv.innerText = 'Escribiendo...';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            // Llamada directa a la API de Gemini
            const API_KEY = "TU_GEMINI_API_KEY_AQUI"; // Reemplaza con tu clave de API de Google AI Studio
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Eres el asistente virtual de la aplicación RunWell (app web de salud, rutinas y carreras). Responde de forma breve, concisa y amigable al usuario: ${texto}`
                        }]
                    }]
                })
            });

            const data = await response.json();
            const respuestaIA = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude procesar la respuesta en este momento.";
            
            loadingDiv.innerText = respuestaIA;
        } catch (error) {
            console.error('Error con Gemini API:', error);
            loadingDiv.innerText = 'Ups, ocurrió un error al consultar el asistente.';
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendBtn.addEventListener('click', enviarMensaje);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensaje();
    });
}
