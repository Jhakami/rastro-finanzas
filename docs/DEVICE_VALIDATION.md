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

## Incremento 0.1.7: favoritos derivados del comportamiento · 100 %

- **Implementación (50 %):** terminada.
- **Validación automática (30 %):** TypeScript, ESLint, Prettier, 24 pruebas y compilación
  Android release ARM64 aprobadas. APK `0.1.7` (`versionCode 8`), firma v2 verificada y sin
  ubicación en segundo plano.
- **Aceptación en dispositivo (20 %):** aprobada en POCO X7 Pro. FAV-02 reemplaza
  automáticamente la opción menos frecuente cuando otra categoría acumula más movimientos
  activos; DASH-04 también fue aprobado.

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

## Incremento 0.1.8: CRUD de cuentas · validación interrumpida

- **Resultado en dispositivo:** ACC-01 no pudo ejecutarse porque la pantalla se cerró al recibir
  `isDefault` como `0/1` de SQLite en `accessibilityState.disabled`. ACC-02 a ACC-05 quedaron
  bloqueados por el mismo cierre. La regresión se corrige y vuelve a validarse en `0.1.9`.

## Incremento 0.1.9: corrección del CRUD de cuentas · 100 %

- **Implementación (50 %):** terminada.
- **Validación automática (30 %):** TypeScript, ESLint, Prettier, 28 pruebas y compilación
  Android release ARM64 aprobadas. Incluye una regresión que exige convertir los indicadores
  SQLite `0/1` en booleanos antes de entregarlos a React Native. APK `0.1.9` (`versionCode 10`),
  firma v2 verificada y sin permiso de ubicación en segundo plano. SHA-256:
  `5776BE62369FA10CC491569433B3B6101791B3387B82EF1ECF141863DB5CFC4C`.
- **Aceptación en dispositivo (20 %):** ACC-01 a ACC-05 aprobados en POCO X7 Pro con Android 16.

### ACC-01 — Crear y editar

1. En **Ajustes > Administrar cuentas**, crear `Ahorros` y elegir un color.
2. Editarla como `Ahorros personales` y cambiar su color.
3. Cerrar y volver a abrir la app.

**Se acepta si:** nombre, color y posición permanecen; no permite un nombre vacío, duplicado o de
más de 30 caracteres.

### ACC-02 — Orden manual con Yape prioritaria

1. Crear dos cuentas y usar las flechas para cambiar su orden.
2. Intentar colocar una por encima de Yape.
3. Revisar el orden en Dashboard, Ajustes y Nuevo movimiento.

**Se acepta si:** el orden se conserva en las tres vistas y Yape permanece primera y marcada como
principal.

### ACC-03 — Archivar sin perder trazabilidad

1. Registrar un movimiento en una cuenta que no sea Yape y anotar su saldo.
2. Archivar esa cuenta confirmando la advertencia.
3. Revisar Dashboard, Nuevo movimiento e Historial.

**Se acepta si:** la cuenta deja de estar disponible para movimientos nuevos, el movimiento
histórico conserva el nombre de la cuenta y el patrimonio registrado no cambia.

### ACC-04 — Restaurar

1. Abrir **Archivadas** y restaurar la cuenta anterior.
2. Revisar el final de la lista activa y abrir Nuevo movimiento.

**Se acepta si:** vuelve activa al final del orden, conserva nombre, color, saldo e historial y
puede seleccionarse en un movimiento nuevo.

### ACC-05 — Protecciones

1. Comprobar que el botón de archivar Yape está desactivado.
2. Intentar crear otra cuenta llamada `Yape`.
3. Archivar una cuenta y tratar de crear otra con exactamente el mismo nombre.

**Se acepta si:** Yape no puede archivarse, los nombres activos no se duplican y, si el nombre
pertenece a una cuenta archivada, la app indica que debe restaurarse.

## Incremento 0.1.10: ciclo de vida de categorías propias · 100 %

- **Implementación (50 %):** terminada. Incluye una administración central para crear, editar,
  cambiar de familia, ordenar, archivar y restaurar categorías propias.
- **Validación automática (30 %):** TypeScript, ESLint, Prettier y 32 pruebas aprobadas. La
  migración de base de datos incorpora un orden estable y conserva las referencias históricas.
  APK release ARM64 `0.1.10` (`versionCode 11`), firma v2 de desarrollo verificada y sin permiso
  de ubicación en segundo plano. SHA-256:
  `64B4EA32DBE97E04C32FA5D14589EBB723A6C1C6A85BCA0ED6793B73C9EF8C5A`.
- **Aceptación en dispositivo (20 %):** CAT-05A a CAT-05E aprobados el 27 de septiembre de
  2026 en POCO X7 Pro con Android 16. Se verificaron persistencia de nombre, familia y orden;
  conservación del historial al archivar; restauración; y protección del catálogo inicial y de
  los nombres archivados.

### CAT-05A — Crear y editar

1. En **Ajustes > Administrar categorías**, crear `Prueba temporal` dentro de una familia.
2. Editarla como `Prueba corregida` y cambiarla a otra familia.
3. Cerrar y volver a abrir la app.

**Se acepta si:** el nombre y la familia permanecen; un nombre vacío o repetido se rechaza.

### CAT-05B — Orden manual

1. Crear dos categorías dentro de una misma familia.
2. Cambiar su posición con las flechas.
3. Revisar el orden en Administrar categorías y Nuevo movimiento.

**Se acepta si:** el orden se conserva tras cerrar la app y ninguna categoría cambia de familia.

### CAT-05C — Archivar conservando el historial

1. Registrar un gasto con `Prueba corregida`.
2. Archivar esa categoría desde Ajustes.
3. Revisar el Historial y abrir Nuevo movimiento.

**Se acepta si:** el gasto anterior conserva el nombre, pero la categoría ya no aparece para
movimientos nuevos ni entre los favoritos adaptativos.

### CAT-05D — Restaurar

1. Mostrar las categorías archivadas y restaurar `Prueba corregida`.
2. Abrir Nuevo movimiento y buscarla.

**Se acepta si:** vuelve disponible dentro de su familia, al final del orden, sin perder historial.

### CAT-05E — Protecciones

1. Confirmar que una categoría incluida de fábrica no ofrece editar ni archivar.
2. Archivar una categoría propia e intentar crear otra con exactamente el mismo nombre.
3. Restaurar la categoría archivada.

**Se acepta si:** las categorías iniciales permanecen protegidas, el nombre archivado no se
duplica y la app indica que debe restaurarse.

## Incremento 0.1.11: etiquetas ilimitadas · 100 %

- **Implementación (50 %):** terminada. Incluye administración, selección múltiple en cualquier
  movimiento, búsqueda en el historial, conservación de etiquetas archivadas y exportación CSV.
- **Validación automática (30 %):** TypeScript, ESLint, Prettier, 36 pruebas, bundle Hermes,
  Lint Vital y compilación Android release ARM64 aprobados. Expo Doctor aprobó 19/21
  comprobaciones; las dos restantes no pudieron consultar servicios externos por errores de
  certificado, no por una incompatibilidad local. La migración crea `tags` y `transaction_tags`
  sin modificar los movimientos existentes. APK `0.1.11` (`versionCode 12`), firma v2 de
  desarrollo verificada, exclusivamente `arm64-v8a` y sin permisos de ubicación en segundo plano
  ni micrófono. SHA-256:
  `14B4EE036C9D3461C4E44934E346554B57F0DB85D7F64A089AA76321518900A1`.
- **Aceptación en dispositivo (20 %):** TAG-01–TAG-03 aprobados explícitamente por el usuario el 25/10/2026.

### TAG-01 — Crear, editar y ordenar

1. En **Ajustes > Administrar etiquetas**, crear `Trabajo` y elegir un color.
2. Crear `Compartido`, cambiar el orden y editarla como `Gasto compartido` con otro color.
3. Cerrar y volver a abrir Rastro.

**Se acepta si:** nombres, colores y orden permanecen; no admite nombres vacíos, repetidos o de
más de 30 caracteres.

### TAG-02 — Combinar y encontrar

1. Registrar un gasto seleccionando `Trabajo` y `Gasto compartido` a la vez.
2. Abrir **Movimientos** y comprobar que aparecen ambas etiquetas con sus colores.
3. Buscar el movimiento escribiendo el nombre de cualquiera de las dos etiquetas.
4. Exportar el CSV y comprobar la columna `etiquetas`.

**Se acepta si:** el movimiento conserva ambas etiquetas, se encuentra por cualquiera de ellas y
el CSV incluye sus nombres sin duplicarlos.

### TAG-03 — Archivar y restaurar sin perder historial

1. Archivar `Trabajo` desde **Administrar etiquetas**.
2. Abrir el movimiento anterior y después **Nuevo movimiento**.
3. Restaurar `Trabajo` y volver a **Nuevo movimiento**.

**Se acepta si:** la etiqueta archivada sigue visible en el historial, no puede elegirse en un
movimiento nuevo y vuelve al final de la lista activa al restaurarla.

## Incremento 0.1.12: conciliación y correcciones · 100 %

- **Implementación (50 %):** terminada. Permite conciliar una cuenta por saldo real y corregir
  movimientos activos sin borrar su contexto histórico.
- **Validación automática (30 %):** TypeScript, ESLint, Prettier, 41 pruebas, bundle Metro,
  Lint Vital y compilación Android release ARM64 aprobados. APK `0.1.12` (`versionCode 13`),
  firma v2 de desarrollo verificada, exclusivamente `arm64-v8a` y sin permisos de ubicación en
  segundo plano ni micrófono. SHA-256:
  `B1B81A795AA4F746CCAE4946F8C2D180212E4608E95ED8FF6BF7E0182944FAE6`.
- **Aceptación en dispositivo (20 %):** REC-01 y COR-01–COR-02 aprobados explícitamente por el usuario el 25/10/2026. Esta aceptación corresponde al APK previo; la corrección del rótulo de versión se verifica por separado.

Instalar `0.1.12` encima de `0.1.11`, sin desinstalar Rastro, para verificar la migración sin
pérdida de movimientos, cuentas, categorías ni etiquetas.

### REC-01 — Conciliar el saldo real

1. Anotar el saldo de una cuenta en Rastro y el saldo real correspondiente.
2. Abrir **Ajustes > Administrar cuentas**, tocar la calculadora de esa cuenta e introducir el
   saldo real.
3. Escribir un motivo y guardar.
4. Repetir el flujo usando exactamente el saldo que ya muestra Rastro.

**Se acepta si:** el saldo termina exactamente en el valor introducido, aparece un movimiento de
conciliación por la diferencia y los movimientos anteriores no cambian. El segundo intento debe
informar que el saldo ya coincide y no crear otro ajuste.

### COR-01 — Corregir la cuenta de pago

1. Registrar un gasto usando **Efectivo** aunque realmente se haya pagado con **Yape**.
2. Abrir **Movimientos**, tocar el gasto y cambiar la cuenta de pago a Yape.
3. Escribir el motivo y guardar.

**Se acepta si:** el gasto mantiene fecha, categoría, etiquetas y zona; el saldo vuelve a Efectivo
y se descuenta de Yape exactamente una vez. La corrección queda registrada con antes, después y
motivo.

### COR-02 — Corregir los datos financieros

1. Abrir otro movimiento y modificar monto, tipo o categoría.
2. En una transferencia, confirmar que origen y destino no pueden ser la misma cuenta.
3. Intentar guardar sin motivo y luego con un motivo claro.

**Se acepta si:** las validaciones impiden monto inválido, transferencia a la misma cuenta y
corrección sin motivo; al guardar, los saldos y el resumen mensual se recalculan inmediatamente.

## Incremento 0.1.13: favoritos y registro sencillo · aceptación aprobada

- APK ARM64 `0.1.13` (`versionCode 14`), firma v2 de desarrollo con el mismo certificado que
  `0.1.12`. Compilación release y Lint Vital aprobados. Sin ubicación en segundo plano ni micrófono.
- SHA-256: `D4BF7CCBFD61D7BE10733CB662766815482F8C51E1D67ACB77EC4A49D69A4278`.
- Migración SQLite v5→v6 comprobada con base en memoria: conserva movimientos y montos,
  convierte plantillas existentes y valida unicidad/integridad de etiquetas.
- Expo Doctor: 20/21; quedan 12 parches del SDK recomendados, sin actualizar dependencias en
  este incremento. Se usó el almacén de certificados del sistema sin desactivar TLS.
- FAV-01–FAV-04 y UX-01 aprobados explícitamente por el usuario el 28/10/2026.
  Historia #9 cerrada; PR #47 fusionado. La advertencia de Expo Doctor anterior permanece
  registrada y no se presenta como una comprobación aprobada.

### FAV-01 — Crear y aplicar sin registrar automáticamente

Crear tres favoritos con cuenta, categoría, comercio, nota y dos etiquetas: uno fijo, uno
sugerido y otro variable. Aplicarlos desde Registrar gasto y comprobar que todavía no existe
un movimiento nuevo. El fijo precarga y protege el monto; “cambiarlo solo en este gasto” lo
desvincula. El sugerido permite editarlo y el variable lo deja vacío. Guardar debe crear un solo gasto.

### FAV-02 — Editar sin alterar el historial

Registrar un gasto con favorito y luego cambiar nombre, monto, cuenta, categoría y etiquetas
de la plantilla. El gasto anterior debe conservar todos sus datos; la siguiente aplicación
debe usar los nuevos valores. Nombres vacíos y montos no válidos deben rechazarse.

### FAV-03 — Orden y conservación

Crear más de tres favoritos, subir/bajar en orden manual, guardar gastos con varios y revisar
orden Reciente/Frecuencia. Cerrar y abrir la app: se conservan las plantillas y su orden manual.
Editar plantillas no incrementa su frecuencia; confirmar un gasto sí actualiza uso y fecha.

### FAV-04 — Archivar, restaurar y referencias

Archivar un favorito: desaparece del registro, permanece administrable y conserva historial.
Restaurarlo: reaparece al final del orden manual. Archivar su cuenta o categoría: no debe poder
aplicarse hasta restaurar la referencia o editar la plantilla. Etiquetas archivadas no se
adjuntan a movimientos nuevos, pero siguen en los anteriores.

### UX-01 — Registro sencillo y errores

Desde Resumen y Movimientos, usar Registrar gasto. Introducir monto, elegir categoría reciente
o del catálogo y guardar sin abrir Más detalles. Confirmar cuenta visible y cambiar Yape por
Efectivo. Probar modo avión y ubicación denegada: deben permitir guardar sin zona. Pulsar
Guardar repetidamente: solo se crea un movimiento. Revisar teclado, legibilidad y desplazamiento.
Aplicar dos favoritos seguidos: nota y etiquetas no deben arrastrarse de la primera plantilla.

## Incremento 0.1.14: presupuestos · aceptación funcional aprobada

- APK ARM64 `0.1.14` (`versionCode 15`), compilación release y Lint Vital aprobados.
  Firma v2 de desarrollo con el mismo certificado que `0.1.13`; aún no es firma privada
  de distribución. Sin micrófono ni ubicación en segundo plano.
- Archivo: `artifacts/Rastro-0.1.14-arm64-v8a.apk` (generado localmente, no versionado).
- SHA-256: `1E617D15A986A394E1A53256CDD4490D55D65ACA52D0159ADDB1138D76C7581C`.
- TypeScript, ESLint y 71 pruebas Jest (16 suites): aprobados.
- SQL real en memoria: migración v6→v7, límites conservados, fronteras de mes, ámbitos,
  referencias archivadas, deduplicación e índice acotado de fecha: aprobados.
- Expo Doctor: 20/21; 12 parches del SDK recomendados siguen pendientes. No se oculta ni
  se excluye esa comprobación. Formato de archivos modificados verificado; el chequeo global
  conserva advertencias de formato preexistentes en archivos ajenos al incremento.
- PR #48 en borrador; las verificaciones CI de implementación pasaron. No se detectó un
  teléfono conectado por ADB: instalación sobre `0.1.13` y aceptación BUD pendientes.

El usuario aprobó explícitamente BUD-01–BUD-06 el 28/10/2026 para la APK `versionCode 15`
y SHA-256 indicados arriba. Esta aceptación no se atribuye a una APK futura con dependencias
actualizadas. El cierre técnico de Expo y su validación se registran por separado.

Instalar las actualizaciones sin desinstalar ni borrar datos. Los avisos se evalúan al abrir/reactivar la app, al cambiar datos y
mientras está abierta; no se promete ejecución puntual en segundo plano.

### BUD-01 — Actualización y conservación

Anotar saldos y límites antes de actualizar. Abrir Resumen > Presupuestos y comprobar que
los límites conservan nombre, monto, umbral, ámbito y estado de archivo. Crear y editar un
presupuesto general mensual: no debe modificar ningún saldo ni movimiento.

### BUD-02 — Ámbitos combinados sin duplicados

Crear un presupuesto para Yape, una familia y dos etiquetas. Solo cuentan gastos de Yape
en esa familia (incluidas hijas) que tengan cualquiera de las etiquetas. Un gasto con ambas
etiquetas cuenta una vez. Sin selección en un ámbito significa todos. Transferencias,
ingresos, ajustes y movimientos borrados no cuentan. Revisar referencias archivadas existentes.

### BUD-03 — Periodo, umbral y estado

Probar mensual (predeterminado), semanal y anual; comprobar sus fechas visibles. El inicio
se incluye y el final se excluye. Revisar gastado, restante, porcentaje, advertencia al
alcanzar el umbral y excedido al alcanzar el 100 %. Rechazar monto cero y umbral inválido.

### BUD-04 — Solapamientos y administración

Crear un presupuesto que coincida con otro: cancelar no guarda; confirmar explícitamente
permite guardarlo. Se explican importes independientes, nunca se suman los presupuestos.
Editar, subir/bajar, archivar, reiniciar y restaurar. La restauración también avisa del solapamiento.

### BUD-05 — Avisos opcionales y privacidad

Denegar notificaciones y guardar: el presupuesto y registro de gastos siguen funcionando.
Permitirlas desde Android, activar avisos y alcanzar el umbral: recibir aviso sin nombres ni
montos. Reabrir varias veces no repite el mismo nivel del periodo. Probar modo avión.

### BUD-06 — Corrección, teclado y acceso

Corregir cuenta, categoría o monto de un gasto: el presupuesto debe recalcularse. Borrarlo
también descuenta su importe. Comprobar acceso desde Resumen y Ajustes, controles legibles,
teclado y desplazamiento, campos conservados ante error y doble pulsación sin duplicados.
Registrar gasto sigue siendo la acción principal; todavía no aparece la pestaña Plan.

## Mantenimiento 0.1.14 · build 16 · parches Expo SDK 57

- APK generada: `artifacts/Rastro-0.1.14-build16-arm64-v8a.apk`.
- SHA-256: `19D1103FA1DDF58B2D313921C6868A50D919F98320FD5873B7D801CA2AA2856A`.
- Firma v2 verificada con el mismo certificado de desarrollo del build 15, solo ARM64,
  `versionCode 16`. Permisos idénticos; sin micrófono ni ubicación en segundo plano.
- PR #48 fusionado. Aceptación funcional BUD del build 15 registrada; la comprobación manual
  de actualización del build 16 sigue pendiente y se mantiene en el seguimiento de #25.

Se actualizan los doce paquetes recomendados, sin salto mayor ni cambios de lógica de
presupuestos. Expo Doctor pasa 21/21 y `expo install --check` no detecta incompatibilidades.
El renderer de pruebas `test-renderer` 1.2.0 queda declarado explícitamente para que las
instalaciones limpias no dependan de un peer instalado incidentalmente. CI comprueba también
la compatibilidad Expo. El plugin de sharing mantiene desactivada la recepción de archivos.

La aceptación BUD del build 15 no constituye una prueba manual de este build nuevo.
Comprobación de regresión pendiente en teléfono: actualizar sin desinstalar, abrir la base
cifrada, contrastar saldos/presupuestos, registrar un gasto, probar avisos permitidos/denegados
y exportar/compartir un CSV. Verificar también ubicación opcional y apertura en modo avión.

Advertencia independiente: `npm audit` informa 18 alertas de dependencias (10 bajas, 3
moderadas, 4 altas y 1 crítica). Son resultados automáticos, no una demostración de
explotabilidad en Rastro. No se aplicó `audit fix --force`: propone cambios mayores o
retrocesos incompatibles. Expo Doctor 21/21 verifica compatibilidad, no certifica seguridad.

## 0.1.15 · primera adaptación Resumen/Análisis · no entregada en APK

Referencia: capturas aportadas el 29/10/2026, historia #49. Resumen prioriza registrar gasto,
saldo, mes, presupuestos, recientes y hallazgo. Análisis usa el mismo periodo/cuenta en flujo,
gastos e informes. Dona para categorías, barras para etiquetas superpuestas y valores diarios
accesibles en texto. No representa como reales pagos futuros ni porcentajes sin base.

Pendientes de aceptación (NO aprobados):

Validación técnica de esta primera parte: TypeScript y ESLint sin errores, Jest 82/82
en 19 suites, prueba SQL de presupuestos correcta y Expo Doctor 21/21. Exportación Android
Hermes completada en `artifacts/bundle-0.1.15`; no equivale a compilación nativa ni APK.
La ejecución inicial encontró permisos del sandbox en temporales; se repitió fuera de él.
Una prueba de registro rápido agotó su timeout durante compilación concurrente; la suite
completa volvió a pasar sin concurrencia, sin ampliar timeouts ni modificar esa prueba.

- UX-ANA-01: registrar desde Resumen, cambiar cuenta, contrastar saldo actual vs flujo del mes,
  recientes y presupuestos con sus ámbitos explícitos.
- UX-ANA-02: Análisis arranca en mes; 7 días son exactamente siete fechas; cambiar cuenta
  y sección conserva el filtro, también con cuentas archivadas y periodos vacíos.
- UX-ANA-03: alternar tendencia/acumulado, flujo negativo, ver valores diarios, gasto con dos
  etiquetas sin duplicar el total y acceso de gasto mayor a su registro.
- UX-ANA-04: lector de pantalla, texto ampliado, pantalla estrecha, modo avión y conservación
  de datos tras actualizar. Microgastos y proyección siguen accesibles en Informes.

No se genera APK de esta primera parte. No se confunde esta rama con la APK 0.1.14 build 16 disponible.

### Segunda parte de #49 · 30/10/2026 · todavía sin APK

Implementados LedgerRepository, cursor estable por fecha/ID y páginas de 50, filtros combinables,
store modular, lista virtualizada y detalle de cuenta con acceso a conciliación/historial.
Migración v8: solo índice parcial, sin modificar importes ni registros. La prueba SQLite recorre
5.005 movimientos visibles de varios años, verifica empate/offsets, fechas, etiquetas,
cuenta archivada y preservación de filas/importes. Se incorpora a CI.

Verificación local: TypeScript y ESLint correctos, 91 pruebas Jest en 22 suites y pruebas SQL
de presupuestos y movimientos correctas. La prueba UI larga agotó un timeout en una ejecución
inicial; volvió a pasar junto con toda la suite sin alterar su timeout.

Casos Android adicionales pendientes:

- MOV-01: cargar varias páginas de fechas iguales, sin repetir ni omitir; cambiar filtros durante carga.
- MOV-02: combinar texto, cuenta archivada, tipo, familia, dos etiquetas y fechas; aplicar/limpiar.
  Fecha inválida muestra error conservando los campos; Hasta incluye todo el día local.
- MOV-03: crear/corregir/eliminar y regresar; reinicia desde la primera página sin datos obsoletos.
- ACC-06: abrir detalle desde Resumen o cuentas, contrastar saldo, historial y transferencia recibida;
  conciliar cuenta activa; cuenta archivada conserva historial y exige restaurar antes de conciliar.

Pendiente técnico antes de cerrar #49: agregaciones SQL y eliminar la carga completa del proveedor,
rendimiento en dispositivo, compilación ARM64 y aceptación. No se incrementa avance por estas pruebas.
