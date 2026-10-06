#!/usr/bin/env python3
"""Servidor local de pruebas.

Sirve la raíz del repositorio por HTTP (los módulos ES no cargan en file://)
y, de paso, recoge los reportes que los arneses `__*.html` envían a
`/bc?d=...`, añadiéndolos a un archivo de texto para que queden como evidencia.

Uso:
    python3 pruebas/servidor.py 8000

Después abre, por ejemplo, http://localhost:8000/__e2e.html
"""
import http.server
import os
import socketserver
import sys
import urllib.parse

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.environ.get('RUNWELL_REPORTES', '/tmp/runwell-pruebas/inbox.log')


class Manejador(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=RAIZ, **kwargs)

    def log_message(self, *args):
        pass  # silencioso: no ensucia la salida con cada petición estática

    def _guardar_reporte(self):
        consulta = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        dato = consulta.get('d', [''])[0].replace('\n', ' ')
        os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
        with open(SALIDA, 'a') as f:
            f.write(dato + '\n')
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'ok')

    def do_GET(self):
        if urllib.parse.urlparse(self.path).path == '/bc':
            return self._guardar_reporte()
        super().do_GET()

    def do_POST(self):
        if urllib.parse.urlparse(self.path).path == '/bc':
            return self._guardar_reporte()
        super().do_POST()


if __name__ == '__main__':
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    socketserver.TCPServer.allow_reuse_address = True
    print(f' sirviendo {RAIZ} en http://127.0.0.1:{puerto}  (reportes → {SALIDA})')
    with socketserver.TCPServer(('127.0.0.1', puerto), Manejador) as httpd:
        httpd.serve_forever()
