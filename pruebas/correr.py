#!/usr/bin/env python3
"""Corre los arneses `__*.html` en Firefox headless y recoge sus reportes.

Requisitos: el servidor de pruebas corriendo (pruebas/servidor.py 8000) y
`firefox` en el PATH. Cada corrida usa un perfil nuevo y desechable:
reutilizar un perfil tras un `kill` a medias deja la sesión colgada y los
reportes no llegan.

Uso:
    python3 pruebas/correr.py            # todos los escenarios
    python3 pruebas/correr.py poo e2e    # solo los indicados

Los resultados crudos quedan en /tmp/runwell-pruebas/evidencia/*.txt
"""
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

BASE = '/tmp/runwell-pruebas'
INBOX = f'{BASE}/inbox.log'
EVIDENCIA = f'{BASE}/evidencia'
URL = 'http://127.0.0.1:8000'

CASOS = [
    ('geo-pendiente', '__geo.html?esc=pendiente', 60),
    ('geo-concede',   '__geo.html?esc=concede',   60),
    ('geo-ok',        '__geo.html?esc=ok',        60),
    ('geo-denegado',  '__geo.html?esc=denegado',  60),
    ('popup',         '__popup.html',             60),
    ('e2e',           '__e2e.html',               90),
    ('poo',           '__poo.html',               60),
    # El Logger avisa dos veces: la baliza de arranque y el informe final
    # (prefijo LOGS|). Hay que esperar el segundo, no el primero: ver
    # MARCADOR_FINAL.
    ('logs',          '__probe_logs.html',        75),
]

MARCADOR_FINAL = {'logs': 'LOGS|'}


def offset():
    return os.path.getsize(INBOX) if os.path.exists(INBOX) else 0


def esperar(desde, limite, marcador=None):
    fin = time.time() + limite
    while time.time() < fin:
        if os.path.exists(INBOX) and os.path.getsize(INBOX) > desde:
            with open(INBOX) as f:
                f.seek(desde)
                datos = f.read()
            if marcador is None or any(l.startswith(marcador) for l in datos.splitlines()):
                time.sleep(0.5)
                return datos.strip()
        time.sleep(0.5)
    return ''


def correr(nombre, pagina, limite):
    marcador = MARCADOR_FINAL.get(nombre)
    perfil = f'{BASE}/ff-{nombre}'
    shutil.rmtree(perfil, ignore_errors=True)
    os.makedirs(perfil, exist_ok=True)
    desde = offset()
    proc = subprocess.Popen(
        ['firefox', '--headless', '--profile', perfil, f'{URL}/{pagina}'],
        env=dict(os.environ, MOZ_HEADLESS='1'),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    crudo = esperar(desde, limite, marcador)
    proc.kill()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.send_signal(9)
    shutil.rmtree(perfil, ignore_errors=True)

    linea = ''
    for l in crudo.splitlines():
        if marcador is None or l.startswith(marcador):
            linea = l
    os.makedirs(EVIDENCIA, exist_ok=True)
    with open(f'{EVIDENCIA}/{nombre}.txt', 'w') as f:
        f.write(linea + '\n')

    ok = total = None
    fallos = []
    try:
        d = json.loads(linea)
        R = d.get('resultados') or d.get('R') or []
        ok = d.get('ok', sum(1 for r in R if r['ok']))
        total = d.get('total', len(R))
        fallos = [r['n'] for r in R if not r['ok']]
    except Exception:
        if linea.startswith('LOGS|'):
            # Formato: "LOGS|OK  : texto | OK  : texto | KO : texto". Hay que
            # contar segmentos, no substrings: varios textos contienen la
            # palabra "OK" por dentro y falsearían el total.
            partes = [p.strip() for p in linea.split('|')[1:]]
            ok = sum(1 for p in partes if p.startswith('OK'))
            total = sum(1 for p in partes if p.startswith(('OK', 'KO')))
            fallos = [p for p in partes if p.startswith('KO')]
    marca = f'{ok}/{total}' if ok is not None else 'sin formato'
    print(f'{nombre:<16} {marca:<8} {"FALLOS: " + str(fallos) if fallos else ""}'.rstrip(), flush=True)
    return {'caso': nombre, 'pagina': pagina, 'ok': ok, 'total': total, 'fallos': fallos}


def main():
    try:
        urllib.request.urlopen(f'{URL}/README.md', timeout=3)
    except Exception:
        sys.exit('No responde el servidor. Ejecuta antes: python3 pruebas/servidor.py 8000')
    os.makedirs(BASE, exist_ok=True)
    pedidos = sys.argv[1:]
    casos = [c for c in CASOS if not pedidos or c[0] in pedidos]
    if not casos:
        sys.exit('Nada que correr. Casos: ' + ', '.join(c[0] for c in CASOS))
    resumen = [correr(*c) for c in casos]
    with open(f'{BASE}/resumen.json', 'w') as f:
        json.dump(resumen, f, ensure_ascii=False, indent=1)
    tot_ok = sum(r['ok'] for r in resumen if r['ok'] is not None)
    tot = sum(r['total'] for r in resumen if r['total'] is not None)
    print(f'\nTOTAL {tot_ok}/{tot}')
    print(f'evidencia cruda: {EVIDENCIA}')


if __name__ == '__main__':
    main()
