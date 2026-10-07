// js/core/recursos.js — Recursos y constantes compartidas por varios servicios.
//
// Centraliza valores que antes estaban duplicados o embebidos en el HTML:
//   AVATAR_POR_DEFECTO : imagen inicial para el perfil sin foto.
//   BUCKET_AVATARES    : bucket de Supabase Storage donde se suben los avatares.
//
// `AVATAR_POR_DEFECTO` es un data URI (SVG en línea) a propósito: una URL externa
// de placeholder se cae cuando ese servicio desaparece y el perfil queda con una
// imagen rota. Además, `index.html` ya no lleva `src=""` en el <img> porque el
// navegador interpretaba ese valor como "pedir esta misma página" y lo reportaba
// como recurso fallido.

export const AVATAR_POR_DEFECTO =
    'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">' +
        '<rect width="80" height="80" fill="#007bff"/>' +
        '<circle cx="40" cy="31" r="13" fill="#ffffff"/>' +
        '<path d="M40 48c-13 0-24 8-24 18v14h48V66c0-10-11-18-24-18z" fill="#ffffff"/>' +
        '</svg>'
    );

export const BUCKET_AVATARES = 'avatars';