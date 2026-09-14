# Plan de construcción por sprints

Cada sprint termina únicamente cuando pasan TypeScript, ESLint, Jest, Expo Doctor, bundle Hermes y prueba manual en Android. El estado **hecho** significa implementado y verificado; no significa que todo el producto esté culminado.

El seguimiento operativo se realiza mediante los [hitos](https://github.com/Jhakami/rastro-finanzas/milestones) y las [incidencias](https://github.com/Jhakami/rastro-finanzas/issues) de GitHub. Este archivo define el alcance; GitHub refleja su ejecución.

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

## Sprint 2 — Parametrización completa · 30 % · En curso

- Crear, editar, ordenar, archivar y restaurar cuentas.
- Categorías jerárquicas: catálogo inicial detallado, búsqueda, selección por familia y
  creación inmediata de subcategorías propias implementadas.
- Pendiente del CRUD de categorías: editar, ordenar, archivar y restaurar; además de etiquetas.
- CRUD de favoritos con monto fijo, sugerido o variable.
- Conciliación guiada con motivo y vista de auditoría.
- Límites generales, por cuenta y por categoría con alertas configurables.

Seguimiento: [#7](https://github.com/Jhakami/rastro-finanzas/issues/7), [#8](https://github.com/Jhakami/rastro-finanzas/issues/8), [#9](https://github.com/Jhakami/rastro-finanzas/issues/9), [#10](https://github.com/Jhakami/rastro-finanzas/issues/10) y [#11](https://github.com/Jhakami/rastro-finanzas/issues/11).

El porcentaje es orientativo y se calcula con criterios de aceptación terminados, no por tiempo
transcurrido. El catálogo, la navegación jerárquica, la búsqueda y la creación de una categoría
propia están disponibles; todavía falta administrar todo su ciclo de vida y los demás módulos del
sprint.

## Estado global orientativo

| Alcance      | Avance | Condición para aumentar                                        |
| ------------ | -----: | -------------------------------------------------------------- |
| Sprint 0     |  100 % | Cerrado                                                        |
| Sprint 1     |  100 % | Cerrado en dispositivo                                         |
| Sprint 2     |   30 % | CRUD de categorías, cuentas, favoritos, conciliación y límites |
| Sprint 3     |    0 % | Aún no iniciado                                                |
| Sprint 4     |   10 % | Base visual de composición, tendencia y dispersión             |
| Sprint 5     |    0 % | Aún no iniciado                                                |
| MVP completo |   40 % | Promedio simple de los seis sprints; no representa una fecha   |

La guía de comprobación de cada incremento está en
[`DEVICE_VALIDATION.md`](./DEVICE_VALIDATION.md).

## Sprint 3 — Automatización y documentos · Pendiente

- Recurrencias que generen borradores confirmables y notificaciones.
- Fotografías de comprobantes almacenadas en el espacio privado.
- Respaldo que incluya comprobantes y restauración guiada con copia preventiva.
- Reembolsos enlazados desde la interfaz al gasto original.

Seguimiento: [#12](https://github.com/Jhakami/rastro-finanzas/issues/12), [#13](https://github.com/Jhakami/rastro-finanzas/issues/13), [#14](https://github.com/Jhakami/rastro-finanzas/issues/14) y [#15](https://github.com/Jhakami/rastro-finanzas/issues/15).

## Sprint 4 — Análisis avanzado · 10 % · En curso

- Implementado: composición por categoría específica, tendencia diaria de siete días y
  dispersión monto-hora con muestra mínima.

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
