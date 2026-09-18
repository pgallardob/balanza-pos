# Balanza POS — Guía de compilación y distribución

Sistema POS para balanzas electrónicas por puerto serial (USB).
Desarrollado por **P. Gallardo** — © 2026 Todos los derechos reservados.

Repositorio: https://github.com/pgallardob/balanza-pos
Descripción general del proyecto: `README.md`

---

## Funcionalidades actuales

- **Venta por peso**: lectura de peso en vivo desde la balanza, precio por
  kg editable y cálculo automático del total. El display de peso usa
  **verde fluor estilo LCD** (`#39ff14`) sobre fondo oscuro, como las
  balanzas reales.
- **Total en pesos enteros**: el total se redondea a entero (CLP sin
  decimales), así el vuelto siempre cuadra con el monto mostrado.
- **Medios de pago**: Efectivo, Débito, Crédito y Transferencia. Con
  Efectivo calcula el vuelto a partir del monto recibido.
- **Botón Pagar**: registra la venta en `ventas.csv` y deja el sistema
  listo para una nueva operación (el peso vuelve a 0 en pantalla).
- **Historial de ventas**: botón "Historial", menú *Archivo → Historial
  de ventas* o `Ctrl+H`. Muestra tabla con todas las ventas, resumen de
  cantidad y total vendido, **filtro por día** y **botón Imprimir**
  (imprime solo la tabla, respetando el filtro activo). El peso se
  muestra en gramos enteros (ej. `1250`, sin decimales).
- **Menú completo en español**: Archivo, Edición, Ver, Ventana y Ayuda.
- **Interfaz**: logo `laosita.jpeg` centrado en el header, layout
  compacto sin scroll, botones en tonos café de la paleta del logo y
  footer fijo al fondo con la firma de copyright.
- **Iconos**: `icon.ico`, `icon.png` e `icon.icns` generados desde
  `laosita.jpeg` en `assets/`.

---

## Requisitos previos (cualquier sistema)

- **Node.js 20 o superior** — https://nodejs.org
- **Git** (opcional, solo si clonas el repositorio)

Los archivos indispensables del proyecto son:

```
main.js  preload.js  balanza.js  protocols.js  storage.js  sales.js
renderer.js  index.html  styles.css  package.json  assets/
```

> **Importante:** `serialport` contiene un binario nativo distinto en cada
> sistema operativo. Por eso **siempre** hay que ejecutar `npm install`
> en la máquina destino: descarga automáticamente el binario correcto.

---

## Para crear el ejecutable en Windows

```powershell
cd C:\Users\pc\Desktop\balanza-pos
npm install
npm run dist:win
```

Genera en `dist\`:

- **`Balanza POS 1.0.0.exe`** — versión **portable**: copiar al pendrive y
  ejecutar con doble clic, sin instalación.
- **`Balanza POS Setup 1.0.0.exe`** — instalador con acceso directo en
  escritorio y menú inicio.

> Nota: `npmRebuild` está en `false` en `package.json` porque serialport
> ya trae binarios precompilados. Así **no se necesita Visual Studio**.

---

## Para crear el ejecutable en macOS

En una Mac, dentro de la carpeta del proyecto:

```bash
npm install
npm run dist:mac
```

Genera en `dist/` un archivo **`.dmg`** (arrastrar a Aplicaciones).

- El icono `assets/icon.icns` ya está generado desde `laosita.jpeg`.
- El puerto serial aparece como `/dev/tty.usbserial-*` o `/dev/cu.*`
  (en vez de `COM3`); la app lo lista automáticamente.
- Si macOS bloquea la app por ser de "desarrollador no identificado":
  **Preferencias del Sistema → Privacidad y Seguridad → Abrir de todos modos**.

---

## Para crear el ejecutable en Linux

En Linux, dentro de la carpeta del proyecto:

```bash
npm install
npm run dist:linux
```

Genera en `dist/`:

- **`.AppImage`** — portable: `chmod +x` y doble clic.
- **`.deb`** — instalable con `sudo dpkg -i archivo.deb`.

### Permiso para el puerto serial (obligatorio en Linux)

```bash
sudo usermod -a -G dialout $USER
```

Luego **cerrar sesión y volver a entrar** para que tome efecto.

---

## Para ejecutar sin compilar (cualquier sistema)

Con Node.js instalado, dentro de la carpeta del proyecto:

```bash
npm install
npm start
```

---

## Compilación automática de los 3 sistemas (GitHub Actions)

El archivo `.github/workflows/build.yml` compila Windows, macOS y Linux
en cada push a `main` (o manualmente desde la pestaña **Actions**).

Los ejecutables quedan como **artifacts** descargables en cada ejecución
del workflow: `balanza-pos-windows-latest`, `balanza-pos-macos-latest`,
`balanza-pos-ubuntu-latest`.

### Configuración del workflow (notas importantes)

- **`GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`** a nivel de job: electron-
  builder descarga sus herramientas (nsis, dmg, appimagetool) desde la
  API de GitHub; sin token el runner choca con el rate limit y los 3
  builds fallan.
- **`npm ci`** (no `npm install`): instalación reproducible desde
  `package-lock.json`.
- **`libfuse2` en Ubuntu**: `appimagetool` la necesita y `ubuntu-latest`
  no la trae instalada; el workflow la instala antes del build.
- **Icono PNG para Linux**: `build.linux.icon` apunta a
  `assets/icon.png` (512×512). Linux no acepta `.ico`/`.icns`.
- **`maintainer` con email**: el target `deb` exige el formato
  `Nombre <email>`; está definido en `author` y en
  `build.linux.maintainer` de `package.json`. Sin esto el build de
  Linux falla aunque Windows y macOS pasen.

---

## Dónde se guardan los datos

| Dato | Windows | macOS | Linux |
|------|---------|-------|-------|
| Ventas (`ventas.csv`) | `%APPDATA%\balanza-pos\ventas.csv` | `~/Library/Application Support/balanza-pos/ventas.csv` | `~/.config/balanza-pos/ventas.csv` |
| Configuración (`settings.json`) | `%APPDATA%\balanza-pos\settings.json` | `~/Library/Application Support/balanza-pos/settings.json` | `~/.config/balanza-pos/settings.json` |

El CSV de ventas se abre directo en Excel/LibreOffice. Columnas:
`fecha;hora;peso_g;precio_kg;total;metodo_pago;recibido;vuelto`
