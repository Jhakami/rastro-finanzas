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

## Incremento 0.1.3: categorías, precisión y dashboard · 100 %

- **Implementación (50 %):** terminada.
- **Validación automática (30 %):** aprobada: TypeScript, ESLint, Prettier, 18 pruebas,
  bundle Hermes y APK Android arm64. Expo Doctor aprobó 19/21 comprobaciones; las dos restantes
  no pudieron consultar sus servicios externos por un fallo DNS, no por una incompatibilidad local.
- **Aceptación en dispositivo (20 %):** CAT-03, LOC-03 y DASH-01 aprobados por el usuario
  en POCO X7 Pro con Android 16.

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

## Incremento 0.1.4: visualización y patrones parametrizables · 80 %

- **Implementación (50 %):** terminada.
- **Validación automática (30 %):** TypeScript, ESLint, 22 pruebas y Expo Doctor 21/21.
- **Aceptación en dispositivo (20 %):** pendiente del APK 0.1.4.

Resultado en POCO X7 Pro: PAT-01 y CAT-04 aprobados; DASH-02 aprobado con solicitud de valores al
tocar; LIM-01 aprobó el alcance general, pero la lista específica resultó demasiado extensa. Las
dos mejoras pasan a 0.1.5.

### DASH-02 — Gráficos interactivos

1. Abrir **Resumen** con gastos de distintas categorías.
2. Confirmar que la dona coincide con los porcentajes de su leyenda.
3. Cambiar la tendencia entre área y barras, y entre 7, 14 y 30 días.
4. Revisar que la dispersión ubique las compras por hora y monto sin desbordes.

### PAT-01 — Patrones explicables

1. Abrir **Ajustes > Reglas de patrones**, modificar un umbral y guardarlo.
2. Abrir **Tus patrones**.
3. Confirmar que cada hallazgo muestra periodo, muestra, evidencia y cálculo.
4. Con pocos datos debe indicar que sigue aprendiendo, sin inventar conclusiones.

### LIM-01 — Límite mensual

1. Crear un límite general y otro para una categoría.
2. Verificar que reemplazar el mismo alcance no crea un duplicado.
3. Alcanzar el porcentaje de aviso y comprobar su hallazgo en **Tus patrones**.
4. Eliminar el límite y comprobar que deja de evaluarse.

### CAT-04 — Jerarquía visual

1. Abrir un gasto nuevo.
2. Comprobar que las familias tienen borde y tinte propios.
3. Confirmar que existe separación y un rótulo antes de las categorías específicas.

## Incremento 0.1.5: gráficos consultables y selección eficiente · 80 %

- **Implementación (50 %):** terminada.
- **Validación automática (30 %):** TypeScript, ESLint, Prettier, 23 pruebas y compilación
  Android release ARM64 aprobadas. APK `0.1.5` (`versionCode 6`), firmado para pruebas con el
  mismo certificado de desarrollo y sin permiso de ubicación en segundo plano.
- **Aceptación en dispositivo (20 %):** pendiente.

### DASH-03 — Consultar valores del gráfico

1. Tocar una sección de la dona y comprobar categoría y monto central.
2. Tocar barras y puntos de la tendencia y comprobar día y monto.
3. Tocar un punto de dispersión y comprobar monto y hora.
4. Verificar la leyenda: verde bajo, azul medio y rosado alto, relativos al mayor monto mostrado.

### LIM-02 — Límite por familia

1. Abrir **Ajustes > Límites mensuales** y confirmar que solo aparecen familias principales.
2. Crear un límite para Alimentación.
3. Registrar gastos en dos categorías hijas distintas y confirmar que ambas suman al límite.

### FAV-01 — Favoritos adaptativos

1. Tocar un favorito y comprobar que queda coloreado.
2. Confirmar que selecciona automáticamente cuenta, familia y categoría específica.
3. Guardar varias compras con otro favorito, cerrar y abrir el formulario.
4. Comprobar que el favorito más utilizado aparece primero.

Resultado en POCO X7 Pro: LIM-02 aprobado; DASH-03 requirió cerrar el valor con un segundo toque y
FAV-01 no correspondía al comportamiento adaptativo solicitado. DASH-04 fue aprobado en 0.1.6; el
criterio de favoritos corregido pasa a 0.1.7.

## Incremento 0.1.7: favoritos derivados del comportamiento · 80 %

- **Implementación (50 %):** terminada.
- **Validación automática (30 %):** TypeScript, ESLint, Prettier, 24 pruebas y compilación
  Android release ARM64 aprobadas. APK `0.1.7` (`versionCode 8`), firma v2 verificada y sin
  ubicación en segundo plano.
- **Aceptación en dispositivo (20 %):** pendiente.

### DASH-04 — Cerrar valor consultado

1. Tocar una sección, barra o punto para mostrar su valor.
2. Tocar nuevamente el mismo elemento.

**Se acepta si:** el detalle desaparece y el gráfico vuelve a su estado inicial. Tocar otro dato
debe cambiar la selección directamente.

### FAV-02 — Favoritos derivados del comportamiento

La interpretación inicial basada en pulsaciones fue rechazada. La regla corregida utiliza todos
los gastos activos, incluso si la categoría se eligió manualmente.

1. Registrar varias veces una categoría específica que no aparezca entre los tres favoritos.
2. Volver a **Nuevo movimiento** y revisar el número de usos mostrado.
3. Superar la frecuencia de la opción menos utilizada.
4. Eliminar uno de esos movimientos y volver a abrir el formulario.

**Se acepta si:** se muestran como máximo las tres categorías específicas con más movimientos; la
nueva desplaza a la menos frecuente, los empates se resuelven por uso más reciente y los
movimientos eliminados dejan de contar. La cuenta propuesta será la utilizada más recientemente
para esa categoría.
