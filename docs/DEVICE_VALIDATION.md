# Guía de validación en Android

Cada incremento se mide por separado: implementación **50 %**, validación automática **30 %**
y aceptación en un teléfono **20 %**. Solo alcanza 100 % al aprobar las tres partes.

## Incremento 0.1.2: estabilidad, biometría y tema · 100 %

Ejecución registrada en POCO X7 Pro, Android 16 (`BP2A.250605.031.A3`):

- MOV-UI-01, filtros de movimientos: **APROBADO**.
- BIO-01, desactivación persistente: **APROBADO**.
- BIO-02, activación confirmada: **APROBADO**.
- LOC-01, ubicación independiente del bloqueo: **APROBADO**.
- LOC-02, captura en primer plano: **APROBADO**; se solicitó una celda menor.
- THEME-02, Catppuccin Mocha oscuro: **APROBADO**.
- CAT-01, clasificación precisa y categorías propias: **APROBADO**.
- CAT-02: **FALLÓ EN 0.1.2** al intentar borrar una categoría cuya única referencia era un
  movimiento borrado lógicamente. La corrección se valida como CAT-03.

## Incremento 0.1.3: categorías, precisión y dashboard · 80 %

- **Implementación (50 %):** terminada.
- **Validación automática (30 %):** aprobada: TypeScript, ESLint, Prettier, 18 pruebas,
  bundle Hermes y APK Android arm64. Expo Doctor aprobó 19/21 comprobaciones; las dos restantes
  no pudieron consultar sus servicios externos por un fallo DNS, no por una incompatibilidad local.
- **Aceptación en dispositivo (20 %):** pendiente.

Instalar el APK nuevo encima del anterior, sin desinstalar Rastro, para comprobar también que la
actualización conserva los datos.

### CAT-03 — Categoría usada solo por movimientos eliminados

1. Crear una categoría propia y usarla en un gasto de prueba.
2. Eliminar el gasto desde **Movimientos**.
3. Volver a **Nuevo movimiento** y eliminar la categoría.

**Se acepta si:** la categoría desaparece. El movimiento borrado se conserva para auditoría con
`Por clasificar`, de modo que no queda una referencia rota. Si existe un movimiento activo, un
favorito o un límite que todavía la usa, Rastro debe impedir el borrado.

### LOC-03 — Celda aproximada de 50 m

1. En los permisos de Android, permitir ubicación precisa solo mientras se usa Rastro.
2. Activar GPS y Wi-Fi.
3. Registrar dos compras desde un mismo lugar y abrir **Zonas**.

**Se acepta si:** ambas aparecen aproximadamente en la misma celda, Rastro indica 50 m y Android
confirma que la aplicación no dispone de ubicación en segundo plano. La precisión real puede variar
por interiores, edificios y condiciones del GPS.

### DASH-01 — Lectura y gráficos

1. Abrir **Resumen** con gastos de varias categorías, días, horas y montos.
2. Revisar Lectura rápida, composición, tendencia de siete días y dispersión.

**Se acepta si:** Lectura rápida muestra solo la categoría específica (por ejemplo `Perfume`),
ningún texto desborda y los valores coinciden con los movimientos. La dispersión debe pedir al
menos tres gastos cuando todavía no hay muestra suficiente.

## Registro del resultado

Para cada caso anotar **APROBADO** o **FALLÓ**, modelo, versión de Android y una descripción breve.
Después de generar el APK, el incremento pasa a 80 %; tras aprobar CAT-03, LOC-03 y DASH-01 llega
a 100 %.
