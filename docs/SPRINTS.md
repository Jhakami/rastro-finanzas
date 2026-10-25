# Plan de construcción por sprints

Cada sprint termina únicamente cuando pasan TypeScript, ESLint, Jest, Expo Doctor, bundle Hermes y prueba manual en Android. El estado **hecho** significa implementado y verificado; no significa que todo el producto esté culminado.

El seguimiento operativo se realiza mediante los [hitos](https://github.com/Jhakami/rastro-finanzas/milestones) y las [incidencias](https://github.com/Jhakami/rastro-finanzas/issues) de GitHub. Este archivo define el alcance; GitHub refleja su ejecución.

## Política de ejecución

- Se mantiene un solo incremento funcional activo hasta terminar implementación, validación
  automática y aceptación en Android.
- Dentro del incremento se avanza criterio por criterio; no se abren simultáneamente varios
  módulos incompletos de distintos sprints.
- Las correcciones urgentes pueden interrumpir el incremento y deben quedar trazadas con su prueba
  de regresión.
- Dependabot propone automáticamente actualizaciones menores y parches. Los saltos mayores de
  Expo, React Native y su ecosistema se agrupan en un sprint técnico con compilación de APK y
  prueba de actualización sin pérdida de datos.

## Sprint 0 — Base técnica · Hecho

- Expo 57, React Native 0.86 y TypeScript estricto.
- Arquitectura por capas, navegación y tokens visuales.
- SQLite con SQLCipher, SecureStore, migración y auditoría.
- Calidad automática, Dependabot y documentación RUP/ADR.

## Sprint 1 — Trazabilidad diaria · 100 % · Hecho

- Yape como cuenta principal, banco y efectivo.
- Gastos, ingresos variables y transferencias.
- Registro rápido, favoritos iniciales e historial filtrable.
- Saldos por cuenta, flujo mensual y borrado lógico.
- Microgastos calculados mediante umbral configurable.
- Ubicación aproximada opcional, mapa de calor y lista offline.
- Patrones con evidencia mínima, CSV, biometría y copia cifrada.

La aceptación de movimientos, biometría, tema y ubicación en primer plano se completó en un
POCO X7 Pro con Android 16. El ajuste posterior a celdas de 50 m se valida como mejora de 0.1.3.

Seguimiento: [#6](https://github.com/Jhakami/rastro-finanzas/issues/6).

## Sprint 2 — Parametrización completa · 65 % · En curso

- Crear, editar, ordenar, archivar y restaurar cuentas terminado y aceptado en Android en
  `0.1.9` mediante ACC-01 a ACC-05.
- Categorías jerárquicas: catálogo inicial detallado, búsqueda, selección por familia y
  creación inmediata de subcategorías propias implementadas.
- El ciclo de vida de categorías propias —crear, editar, cambiar de familia, ordenar, archivar y
  restaurar— está terminado y aceptado en Android en `0.1.10` mediante CAT-05A a CAT-05E. Las
  categorías iniciales continúan protegidas y el historial conserva las categorías archivadas.
- Las etiquetas ilimitadas permiten crear, editar, ordenar, archivar y restaurar opciones propias,
  combinar varias al registrar cualquier movimiento, buscarlas en el historial y exportarlas a
  CSV. El incremento `0.1.11` fue aceptado mediante TAG-01–TAG-03 el 25/10/2026.
- Los tres favoritos se derivan de las categorías con más movimientos activos, desempatan por
  recencia y completan cuenta/familia/categoría. Falta su CRUD y permitir fijar opciones manuales.
- Conciliación guiada implementada: recibe el saldo real, calcula solo la diferencia y crea un
  ajuste con motivo, saldo anterior y saldo resultante. La corrección de movimientos permite
  rectificar cuenta de pago, monto, tipo, destino y categoría sin perder fecha, etiquetas o zona.
  El incremento `0.1.12` fue aceptado mediante REC-01 y COR-01–COR-02 el 25/10/2026.
- Límites mensuales generales y por familia con umbral de aviso configurable ya implementados.
  Cada familia suma sus categorías hijas. Falta la selección por cuenta y una administración más
  completa.

Seguimiento: [#7](https://github.com/Jhakami/rastro-finanzas/issues/7), [#8](https://github.com/Jhakami/rastro-finanzas/issues/8), [#9](https://github.com/Jhakami/rastro-finanzas/issues/9), [#10](https://github.com/Jhakami/rastro-finanzas/issues/10) y [#11](https://github.com/Jhakami/rastro-finanzas/issues/11).

El porcentaje es orientativo y se calcula con criterios de aceptación terminados, no por tiempo
transcurrido. El CRUD de cuentas y el ciclo de vida de categorías propias están al 100 %. El
incremento `0.1.11` y los casos REC/COR de `0.1.12` ya tienen aceptación explícita del usuario.
La historia #10 conserva el alcance pendiente de auditoría legible y restauración de movimientos;
aprobar REC/COR no demuestra esos criterios adicionales. El siguiente incremento activo es #9.

## Estado global orientativo

| Alcance      | Avance | Condición para aumentar                                         |
| ------------ | -----: | --------------------------------------------------------------- |
| Sprint 0     |  100 % | Cerrado                                                         |
| Sprint 1     |  100 % | Cerrado en dispositivo                                          |
| Sprint 2     |   65 % | Aceptar etiquetas y conciliación; favoritos y límites restantes |
| Sprint 3     |    0 % | Aún no iniciado                                                 |
| Sprint 4     |   40 % | Validar interacción; faltan periodos globales y detalle         |
| Sprint 5     |    0 % | Aún no iniciado                                                 |
| MVP completo |   51 % | Promedio simple redondeado de los seis sprints                  |

La guía de comprobación de cada incremento está en
[`DEVICE_VALIDATION.md`](./DEVICE_VALIDATION.md).

## Sprint 3 — Automatización y documentos · Pendiente

- Recurrencias que generen borradores confirmables y notificaciones.
- Fotografías de comprobantes almacenadas en el espacio privado.
- Respaldo que incluya comprobantes y restauración guiada con copia preventiva.
- Reembolsos enlazados desde la interfaz al gasto original.

Seguimiento: [#12](https://github.com/Jhakami/rastro-finanzas/issues/12), [#13](https://github.com/Jhakami/rastro-finanzas/issues/13), [#14](https://github.com/Jhakami/rastro-finanzas/issues/14) y [#15](https://github.com/Jhakami/rastro-finanzas/issues/15).

## Sprint 4 — Análisis avanzado · 40 % · En curso

- Implementado: dona por categoría específica, tendencia de área o barras en 7/14/30 días y
  dispersión monto-hora con muestra mínima. Cada segmento, barra o punto permite consultar su
  valor y la dispersión explica sus colores relativos.
- Implementado: promedio histórico mensual, gasto atípico, racha creciente, cambio de
  participación, proyección mensual y cumplimiento de límites. La muestra principal corresponde
  al mes calendario actual y las comparaciones utilizan meses completos. Sus umbrales se pueden
  configurar.
- Cada hallazgo presenta periodo, muestra, evidencia y fórmula utilizada.

- Periodos hoy/semana/3 meses/6 meses/año/rango personalizado.
- Comparación contra el periodo equivalente anterior.
- Análisis posterior a recargas, mediana, máximos, frecuencia y evolución temporal.
- Detalle navegable desde cada tarjeta hasta sus movimientos de evidencia.
- Recomendaciones que puedan aceptarse, modificarse, posponerse o descartarse.
- Etiquetas manuales para celdas geográficas y paquetes de mapa offline.

Seguimiento: [#16](https://github.com/Jhakami/rastro-finanzas/issues/16), [#17](https://github.com/Jhakami/rastro-finanzas/issues/17), [#18](https://github.com/Jhakami/rastro-finanzas/issues/18), [#19](https://github.com/Jhakami/rastro-finanzas/issues/19), [#20](https://github.com/Jhakami/rastro-finanzas/issues/20) y [#21](https://github.com/Jhakami/rastro-finanzas/issues/21).

## Sprint 5 — Publicación personal · Pendiente

- Pruebas de migración, permisos denegados, modo avión y varios años de datos.
- Generación de clave privada de firma y almacenamiento seguro de su copia.
- Configuración de secretos de GitHub Actions.
- APK firmado, hash SHA-256, notas de versión y prueba de actualización sin pérdida de datos.

Seguimiento: [#22](https://github.com/Jhakami/rastro-finanzas/issues/22), [#23](https://github.com/Jhakami/rastro-finanzas/issues/23) y [#25](https://github.com/Jhakami/rastro-finanzas/issues/25).

## Dirección de producto y UX

El [benchmark frente a Wallet](./PRODUCT_BENCHMARK_WALLET.md) traduce sus patrones útiles al
alcance local-first de Rastro. No cambia el orden de los sprints: primero se termina Sprint 2,
después se incorporan pagos planificados en Sprint 3 y finalmente se amplían los periodos,
comparaciones y recorridos de detalle en Sprint 4.

### Plan integrado aprobado

La acción principal de Resumen y Movimientos será **Registrar gasto**, con teclado de monto,
tipo Gasto y Yape como cuenta inicial visible y modificable. Monto, cuenta y categoría estarán
en el primer nivel; nota, comercio, etiquetas y ubicación se agruparán en **Más detalles**.
Recientes y favoritos completarán datos sin guardar hasta la confirmación. Un error conservará
el formulario; guardar evitará duplicados y actualizará saldo e historial.

Las siguientes entregas son alcance pendiente, no funcionalidades terminadas:

| Entrega       | Sprint / historia | Alcance y condición                                                                                                                                  |
| ------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cierre 0.1.12 | 2 / #8, #10       | Versión desde Expo; nueva APK; registrar aceptación TAG-01–03, REC-01 y COR-01–02. #45 ya está fusionado; eso no sustituye la aceptación manual.     |
| 0.1.13        | 2 / #9            | Crear, editar, ordenar, archivar y restaurar favoritos; separar fijados y sugerencias; mejorar registro rápido y modularizar favoritos.              |
| 0.1.14        | 2 / #11           | Presupuestos mensuales por cuenta, categorías y etiquetas; gastado, restante, umbral y orden; advertir solapamientos confirmables.                   |
| 0.1.15        | 4 / #16, #17      | Resumen accionable, cuentas navegables, movimientos recientes, filtros combinables y páginas de 50 movimientos.                                      |
| 0.2.0         | 3 / #12           | Recurrencias semanales, mensuales y anuales; confirmación manual predeterminada, automática opcional, pausa, omisión y avisos locales; pestaña Plan. |
| Posteriores   | 3 / #13–#15       | Comprobantes privados, restauración con copia preventiva compatible con .finbackup y reembolsos vinculados.                                          |
| Posteriores   | 4 / #16–#21       | Tarjetas configurables, periodos y comparaciones equivalentes, evidencia navegable, recomendaciones y zonas.                                         |
| Publicación   | 5                 | Migraciones, rendimiento, permisos, firma privada y actualización sin pérdida de datos.                                                              |

La entrega 0.1.15 adelanta una parte de Sprint 4 por su beneficio al registro diario; no cambia
el estado global de ese sprint. Los sprints 0 y 1 y la aceptación CAT-05A–CAT-05E se conservan.
Solo habrá una historia funcional activa; cada incremento tendrá rama, PR, APK verificada y
aceptación en Android. La ampliación de alcance no aumenta el porcentaje completado.

### Criterios transversales de entrega

- Registrar con monto y categoría sin detalles opcionales; cuenta visible y cambio Yape/Efectivo.
- Confirmar favoritos antes de guardar, evitar doble envío y conservar campos ante errores.
- Probar modo avión, permisos denegados, teclado y accesibilidad en Android.
- Conservar saldos, movimientos, catálogos, etiquetas, zonas y auditoría al actualizar.
- Verificar periodos mensuales con inicio inclusivo y fin exclusivo y cambio de mes.
- Probar filtros y paginación sin duplicados ni omisiones, incluso con cuentas archivadas.
- Ejecutar TypeScript, ESLint, Jest, Expo Doctor, compilación ARM64, firma, permisos, SHA-256 y CI.
