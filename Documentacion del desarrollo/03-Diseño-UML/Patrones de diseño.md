# Patrones de diseño — RunWell

Este documento lista **únicamente los patrones que están implementados en el
código**, y para cada uno indica dónde vive y por qué cuenta como ese patrón.
Si un patrón no aparece aquí, es porque en `js/` no se puede señalar.

---

## 1. Observer (publicador–suscriptor)

| | |
|---|---|
| **Dónde** | `js/core/base.js`: clase `EmisorEventos` y la instancia única `bus` |
| **Productores** | las 10 clases de servicio, mediante `ServicioBase.registrar(tipo, detalle)` |
| **Suscriptor** | `Logger` (`js/servicios/logs.js`), que se suscribe una única vez al `bus` |

`EmisorEventos` mantiene el registro de oyentes en un campo privado
(`#oyentes`), ofrece `suscribir` / `cancelar` / `emitir` y aísla los fallos:
un suscriptor que lanza no rompe la emisión para los demás.

**Por qué es Observer y no una llamada directa:** quien produce el evento no
sabe quién escucha. Ningún servicio importa a `logs.js` ni al revés — por eso
se pudo añadir la telemetría sin tocar un solo módulo existente.

## 2. Repository (repositorio)

| | |
|---|---|
| **Contrato** | `js/core/base.js`: clase `Repositorio` con `guardar()`, `leer()` y `limpiar()` |
| **Implementación** | `js/servicios/historial.js`: `HistoryRepository extends Repositorio` |

`Repositorio` fija la interfaz de persistencia y sus métodos lanzan un error
si la subclase no los implementa. `HistoryRepository` opera sobre
`localStorage`, que **se inyecta por el constructor**
(`new HistoryRepository(storage = window.localStorage)`).

**Por qué cuenta:** la persistencia queda tras una interfaz estable y el
almacenamiento es un detalle sustituible — con un storage falso en memoria se
prueba la clase entera sin tocar el navegador.

## 3. Singleton por módulo

| | |
|---|---|
| **Mecanismo** | el módulo ES exporta una única instancia (`export const x = new X()`) |

Instancias únicas en toda la aplicación: `estado`, `bus`, `actividad`,
`mapController`, `geolocationService`, `proximityDetector`, `historyRepo`,
`logger`, `navegacion`, `eventosController`, `tema`, `authService` y
`chatbot`.

**Por qué cuenta:** el módulo ES es la unidad de instanciación — dos
`import` del mismo archivo devuelven el mismo objeto, de modo que no existe
forma de crear una segunda instancia por accidente. No hay un contador ni un
`constructor` privado: lo garantiza la especificación de los módulos.

## 4. Herencia y polimorfismo, con encapsulación

| Jerarquía | Base | Subclases |
|---|---|---|
| Dominio | `TipoActividad` (`js/servicios/actividad.js`) | `Trote`, `Carrera` |
| Servicios | `ServicioBase` (`js/core/base.js`) | `Actividad`, `AuthService`, `Chatbot`, `EventosController`, `GeolocationService`, `Logger`, `MapController`, `Navegacion`, `ProximityDetector`, `Tema` |
| Estado | `EmisorEventos` (`js/core/base.js`) | `StateStore` (`js/core/estado.js`) |
| Persistencia | `Repositorio` (`js/core/base.js`) | `HistoryRepository` |

Encapsulación: los atributos son campos privados con `#`
(`EmisorEventos.#oyentes`, `StateStore.#mapa`, `HistoryRepository.#storage`,
`MapController.#markersRuta`…) y se exponen mediante getters. Fuera de la
clase no hay forma de tocarlos.

**Polimorfismo:** el resto del flujo no distingue entre `Trote` y `Carrera`
(solo cambian los datos que pasan al `super(...)`), y todo el que use un
repositorio habla con `Repositorio`, no con `HistoryRepository`.

## 5. Inyección de dependencias y raíz de composición

| | |
|---|---|
| **Raíz** | `js/main.js` — el único módulo que instancia y conecta las piezas |
| **Inyectado** | el `store` que recibe todo `ServicioBase`, el `storage` de `HistoryRepository`, las referencias de `js/core/dom.js` |

Las clases no construyen lo que necesitan: lo reciben. Eso mantiene el grafo
de dependencias sin ciclos y permite sustituir cada dependencia en una prueba.

---

## Fuera de esta lista

Patrones que **no** están implementados y por eso no se documentan:

- **Template Method** — no hay una clase base con un esqueleto de algoritmo
  que llame pasos que la subclase sobreescriba. `Repositorio.guardar()` solo
  lanza un error y `Trote`/`Carrera` solo aportan datos en el constructor:
  eso es contrato e herencia, no un método plantilla.
- **Strategy** — `Trote` y `Carrera` no cambian comportamiento, solo datos;
  no hay algoritmos intercambiables en tiempo de ejecución.
- **Factory, Fachada, MVC** — no aparecen en `js/`.

## Cómo verificarlo

- **A mano:** cada fila de este documento apunta a un archivo y un símbolo
  concreto; basta abrirlo.
- **Con el arnés de POO:** `__poo.html` ejecuta 58 comprobaciones sobre
  exactamente esto (Observer: `observer-*`; Repository:
  `historial-clase`, `repo-guarda-en-storage-inyectado`; singleton:
  `singleton-estado`, `singleton-mapa`; jerarquía y encapsulación:
  `tipo-*`, `estado-privados-no-enumerables`, `mapa-usa-privados`).
  Última pasada: **58/58**, 0 errores de consola.
