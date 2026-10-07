// Utilidades puras: tiempo, distancia y ritmo.
// Sin acceso al DOM ni al estado → se pueden probar de forma aislada.

// Tiempo en mm:ss
export function formatoTiempo(totalSeg) {
    const mins = Math.floor(totalSeg / 60);
    const secs = totalSeg % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Distancia en metros entre dos puntos [lat, lng] (fórmula de Haversine)
export function distanciaMetros(a, b) {
    const R = 6371000;
    const rad = (grados) => grados * Math.PI / 180;
    const dLat = rad(b[0] - a[0]);
    const dLng = rad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 +
              Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Ritmo en min/km ("05:42"); sin distancia o sin tiempo → "--:--"
export function ritmoMinPorKm(segundos, metros) {
    if (metros < 5 || segundos <= 0) return '--:--';
    const segPorKm = segundos / (metros / 1000);
    return formatoTiempo(Math.round(segPorKm));
}

// Distancia de un punto P a un segmento A→B (todo en metros, sistema local)
function distPuntoSegmento(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby;
    let t = len2 === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / len2;
    t = Math.max(0, Math.min(1, t));          // t recortado al segmento
    return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

// Distancia mínima en metros entre el usuario y la polilínea de una ruta.
// Proyectamos grados → metros alrededor de la posición del usuario (preciso
// para distancias cortas, que es lo que nos importa aquí).
export function distanciaARuta(ruta, pos) {
    const mLat = 111320;                                     // metros por grado de latitud
    const mLng = 111320 * Math.cos(pos[0] * Math.PI / 180);  // metros por grado de longitud
    let min = Infinity;
    for (let i = 0; i < ruta.coords.length - 1; i++) {
        const a = ruta.coords[i];
        const b = ruta.coords[i + 1];
        // El usuario queda en el origen (0,0) del sistema local
        const ax = (a[1] - pos[1]) * mLng, ay = (a[0] - pos[0]) * mLat;
        const bx = (b[1] - pos[1]) * mLng, by = (b[0] - pos[0]) * mLat;
        const d = distPuntoSegmento(0, 0, ax, ay, bx, by);
        if (d < min) min = d;
    }
    return min;
}
