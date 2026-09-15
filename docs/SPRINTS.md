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

## Sprint 2 — Parametrización completa · 45 % · En curso

- Crear, editar, ordenar, archivar y restaurar cuentas implementado en `0.1.9`; falta su
  aceptación en Android para marcar este criterio como terminado.
- Categorías jerárquicas: catálogo inicial detallado, búsqueda, selección por familia y
  creación inmediata de subcategorías propias implementadas.
- Pendiente del CRUD de categorías: editar, ordenar, archivar y restaurar; además de etiquetas.
- Los tres favoritos se derivan de las categorías con más movimientos activos, desempatan por
  recencia y completan cuenta/familia/categoría. Falta su CRUD y permitir fijar opciones manuales.
- Conciliación guiada con motivo y vista de auditoría.
- Límites mensuales generales y por familia con umbral de aviso configurable ya implementados.
  Cada familia suma sus categorías hijas. Falta la selección por cuenta y una administración más
  completa.

Seguimiento: [#7](https://github.com/Jhakami/rastro-finanzas/issues/7), [#8](https://github.com/Jhakami/rastro-finanzas/issues/8), [#9](https://github.com/Jhakami/rastro-finanzas/issues/9), [#10](https://github.com/Jhakami/rastro-finanzas/issues/10) y [#11](https://github.com/Jhakami/rastro-finanzas/issues/11).

El porcentaje es orientativo y se calcula con criterios de aceptación terminados, no por tiempo
transcurrido. El catálogo, la navegación jerárquica, la búsqueda y la creación de una categoría
propia están disponibles; todavía falta administrar todo su ciclo de vida y los demás módulos del
sprint. El CRUD de cuentas está al 80 % de su incremento (implementación y validación automática);
el porcentaje del sprint no aumentará hasta la aceptación en dispositivo.

## Estado global orientativo

| Alcance      | Avance | Condición para aumentar                                      |
| ------------ | -----: | ------------------------------------------------------------ |
| Sprint 0     |  100 % | Cerrado                                                      |
| Sprint 1     |  100 % | Cerrado en dispositivo                                       |
| Sprint 2     |   45 % | CRUD de categorías, cuentas, favoritos y conciliación        |
| Sprint 3     |    0 % | Aún no iniciado                                              |
| Sprint 4     |   40 % | Validar interacción; faltan periodos globales y detalle      |
| Sprint 5     |    0 % | Aún no iniciado                                              |
| MVP completo |   48 % | Promedio simple de los seis sprints; no representa una fecha |

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
- Implementado: promedio histórico, gasto atípico, racha creciente, cambio de participación,
  proyección mensual y cumplimiento de límites. Sus umbrales se pueden configurar.
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
