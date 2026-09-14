# Guía de validación en Android

Cada cambio se informa con tres estados separados:

1. **Implementación (50 %):** el código y la migración están terminados.
2. **Validación automática (30 %):** pasan formato, ESLint, TypeScript, Jest y bundle Android.
3. **Aceptación en dispositivo (20 %):** el flujo se prueba en un teléfono sin perder datos.

Un incremento solo llega al **100 %** cuando las tres partes están aprobadas. Este porcentaje mide
la terminación técnica del incremento, no el porcentaje total del producto.

## Incremento: estabilidad visual, biometría y ubicación

Estado antes de la prueba manual: **80 %** (implementación y validación automática).

## Ejecución registrada — POCO X7 Pro

- Dispositivo: POCO X7 Pro.
- Sistema: Android 16, compilación `BP2A.250605.031.A3`.
- MOV-UI-01: **APROBADO**.
- BIO-01: **FUNCIONAL**, pendiente de confirmar que desapareció el destello inicial en 0.1.2.
- BIO-02: **APROBADO**.
- LOC-01: **FALLÓ EN 0.1.1**, captura corregida y pendiente de repetición en 0.1.2.
- THEME-01: reemplazado a petición del usuario por THEME-02.
- CAT-01: creación aprobada; borrado propio pendiente en CAT-02.

### Preparación

- Instalar el nuevo APK encima del anterior; no desinstalar la aplicación.
- Abrir Rastro y comprobar que los movimientos anteriores continúan visibles.
- Tener al menos cinco movimientos. Si faltan, crear movimientos de prueba con montos pequeños.

### MOV-UI-01 — Filtros de movimientos

1. Abrir **Movimientos** con cinco o más registros.
2. Deslizar horizontalmente la fila `Todos · Gastos · Ingresos · Transferencias`.
3. Pulsar cada filtro y regresar a `Todos`.
4. Desplazar verticalmente la lista.

**Se acepta si:** ningún filtro queda cortado, las burbujas conservan la misma altura, la lista usa
el espacio restante y cada filtro muestra únicamente el tipo correspondiente.

### BIO-01 — Desactivación persistente

1. Abrir **Ajustes** y desactivar `Bloqueo biométrico`.
2. Enviar la aplicación al fondo, volver a abrirla y luego cerrarla desde aplicaciones recientes.
3. Abrir Rastro nuevamente.

**Se acepta si:** el interruptor continúa desactivado y no aparece ninguna solicitud de huella o
PIN.

### BIO-02 — Activación confirmada

1. Activar `Bloqueo biométrico`.
2. Completar la verificación solicitada para confirmar la activación.
3. Enviar Rastro al fondo y volver a abrirlo.

**Se acepta si:** una cancelación no activa el interruptor y, después de una confirmación exitosa,
Rastro solicita autenticación al regresar a la aplicación.

### LOC-01 — Ubicación independiente del bloqueo

1. Mantener la biometría activada y desbloquear Rastro.
2. Abrir **Nuevo movimiento** y activar `Zona aproximada`.
3. Aceptar o denegar el permiso de ubicación.

**Se acepta si:** el diálogo de Android no conduce a la pantalla `Rastro está protegido`; aceptar o
denegar el permiso permite continuar registrando el movimiento.

### LOC-02 — Precisión en primer plano

1. En Android, abrir los permisos de Rastro y permitir ubicación precisa mientras se usa la app.
2. Activar GPS y Wi-Fi.
3. Abrir **Nuevo movimiento** y activar `Zona aproximada`.
4. Esperar hasta 20 segundos, preferiblemente cerca de una ventana en la primera lectura.

**Se acepta si:** se obtiene una zona, el interruptor queda activo y el movimiento guarda solamente
el centro de una celda de 200 m. Rastro no debe solicitar ni declarar ubicación en segundo plano.

### THEME-02 — Catppuccin Mocha oscuro

Revisar Resumen, Movimientos, Nuevo movimiento, Zonas y Ajustes.

**Se acepta si:** no quedan superficies blancas propias de Rastro, los textos mantienen contraste,
el mapa usa un estilo oscuro y los acentos pastel Catppuccin distinguen acciones, ingresos, avisos
y errores.

### CAT-01 — Categorías precisas

1. Crear un gasto y buscar `agua`, `pasaje` o `videojuego`.
2. Elegir una categoría específica y guardar.
3. Crear también una categoría propia dentro de una familia.
4. Revisar el movimiento en historial y dashboard.

**Se acepta si:** la ruta completa se conserva, la categoría propia reaparece y no se usa `Otros`.

### CAT-02 — Eliminar una categoría propia

1. Crear una categoría de prueba y seleccionarla.
2. Pulsar la papelera que aparece junto a su nombre y confirmar.
3. Comprobar que ya no aparece en la familia ni en la búsqueda.
4. Seleccionar una categoría predeterminada y comprobar que no aparece la papelera.
5. Crear otra categoría, usarla en un movimiento e intentar eliminarla.

**Se acepta si:** una categoría propia sin uso se elimina; las categorías predeterminadas están
protegidas y una categoría referenciada no puede destruirse hasta reclasificar sus datos.

## Registro del resultado

Para cada identificador (`MOV-UI-01`, `BIO-01`, etc.) anotar **APROBADO** o **FALLÓ**, modelo del
teléfono, versión de Android y una breve descripción. Al aprobar todos los casos, este incremento
pasa de 80 % a 100 % y Sprint 1 queda cerrado.
