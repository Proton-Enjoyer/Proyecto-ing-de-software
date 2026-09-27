// Modo oscuro (persiste en localStorage con la clave runwell-tema).

import { btnTheme } from './dom.js';

const CLAVE_TEMA = 'runwell-tema';

export function iniciarTema() {
    if (localStorage.getItem(CLAVE_TEMA) === 'oscuro') {
        document.body.classList.add('dark-theme');
        btnTheme.checked = true;
    }

    btnTheme.addEventListener('change', () => {
        document.body.classList.toggle('dark-theme', btnTheme.checked);
        localStorage.setItem(CLAVE_TEMA, btnTheme.checked ? 'oscuro' : 'claro');
    });
}
