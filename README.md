# Balanza POS

Sistema de punto de venta (POS) de escritorio para balanzas electrónicas
conectadas por **puerto serial (USB)**. Permite pesar productos, definir el
precio por kilo, cobrar con distintos medios de pago y llevar un historial
de ventas exportable a Excel.

Desarrollado por **P. Gallardo** — © 2026 Todos los derechos reservados.

---

## Características

- **Venta por peso en vivo**: lectura continua del peso desde la balanza
  serial, con display en **verde fluor estilo LCD** (`#39ff14`).
- **Precio por kilo editable** y cálculo automático del total en pesos
  enteros (CLP, sin decimales).
- **4 medios de pago**: Efectivo (con cálculo de vuelto), Débito, Crédito
  y Transferencia.
- **Registro de ventas** en `ventas.csv` (separador `;`, abre directo en
  Excel/LibreOffice).
- **Historial de ventas**: tabla completa, resumen de cantidad y total
  vendido, filtro por día e impresión (solo la tabla).
- **Menú en español**: Archivo, Edición, Ver, Ventana y Ayuda
  (`Ctrl+H` abre el historial).
- **Multiplataforma**: ejecutables para Windows, macOS y Linux generados
  automáticamente con GitHub Actions.

---

## Requisitos

- **Node.js 20 o superior** — https://nodejs.org
- **Balanza electrónica** con salida serial (adaptador USB-RS232 o USB nativo)

> **Importante:** `serialport` incluye un binario nativo distinto por
> sistema operativo. Ejecuta siempre `npm install` en la máquina destino:
> descarga automáticamente el binario correcto (no requiere compilar).

---

## Instalación y ejecución (desarrollo)

```bash
git clone https://github.com/pgallardob/balanza-pos.git
cd balanza-pos
npm install
npm start
```

---

## Compilación de ejecutables

### Windows

```powershell
npm run dist:win
```

Genera en `dist/`:

- `Balanza POS 1.0.0.exe` — versión **portable** (doble clic, sin instalación)
- `Balanza POS Setup 1.0.0.exe` — instalador con accesos directos

### macOS

```bash
npm run dist:mac
```

Genera un `.dmg` en `dist/`. Si macOS bloquea la app:
**Preferencias del Sistema → Privacidad y Seguridad → Abrir de todos modos**.

### Linux

```bash
npm run dist:linux
```

Genera `.AppImage` y `.deb` en `dist/`. Permiso necesario para el puerto
serial:

```bash
sudo usermod -a -G dialout $USER
```

Luego cierra sesión y vuelve a entrar.

### Compilación automática (GitHub Actions)

Cada push a `main` compila los 3 sistemas en
`.github/workflows/build.yml`. Los ejecutables quedan como **artifacts**
descargables en cada ejecución del workflow.

---

## Uso

1. **Conecta la balanza** por USB — la app detecta el puerto serial
   automáticamente.
2. **Pesa el producto** — el peso aparece en el display verde en gramos.
3. **Ingresa el precio por kilo** — el total se calcula al instante.
4. **Selecciona el medio de pago** — en Efectivo ingresa el monto recibido
   para ver el vuelto.
5. **Presiona Pagar** — la venta se guarda en el CSV y el sistema queda
   listo para la siguiente operación.
6. **Historial** — botón "Historial" o `Ctrl+H` para revisar, filtrar por
   día e imprimir ventas.

---

## Estructura del proyecto

```
balanza-pos/
├── main.js          # Proceso principal de Electron (ventana, menú, IPC)
├── preload.js       # Puente seguro entre main y renderer
├── renderer.js      # Lógica de la interfaz (venta, pago, historial)
├── balanza.js       # Conexión serial con la balanza
├── protocols.js     # Parseo de protocolos de peso de distintas balanzas
├── sales.js         # Lectura/escritura de ventas en ventas.csv
├── storage.js       # Configuración persistente (settings.json)
├── index.html       # Interfaz de usuario
├── styles.css       # Estilos (tema café + display verde fluor)
├── assets/          # Logo laosita e iconos (ico, png, icns)
├── package.json     # Dependencias y config de electron-builder
└── COMPILAR.md      # Guía detallada de compilación y distribución
```

---

## Dónde se guardan los datos

| Dato | Windows | macOS | Linux |
|------|---------|-------|-------|
| Ventas (`ventas.csv`) | `%APPDATA%\balanza-pos\ventas.csv` | `~/Library/Application Support/balanza-pos/ventas.csv` | `~/.config/balanza-pos/ventas.csv` |
| Configuración (`settings.json`) | `%APPDATA%\balanza-pos\settings.json` | `~/Library/Application Support/balanza-pos/settings.json` | `~/.config/balanza-pos/settings.json` |

Columnas del CSV:
`fecha;hora;peso_g;precio_kg;total;metodo_pago;recibido;vuelto`

---

## Tecnologías

- **Electron 38** — framework de escritorio multiplataforma
- **serialport 13** — comunicación con la balanza por puerto serial
- **electron-builder 26** — empaquetado de ejecutables
- **JavaScript / HTML / CSS** — sin frameworks, dependencias mínimas

---

## Licencia

MIT — © 2026 P. Gallardo
