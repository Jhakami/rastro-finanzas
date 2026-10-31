# #10 · Auditoría legible y restauración · Sprint 2

## Estado al 31/10/2026

Única historia funcional activa tras aceptar 0.1.15 y cerrar #49. REC-01 y COR-01–02
conservan su aceptación anterior; no demuestran la vista de auditoría ni la restauración.
PR #51 fue fusionado en `9e0bf46`. Antes de #12 se termina este pendiente de Sprint 2.

Primera parte técnica: puerto `AuditRepository`, lectura paginada de 50 eventos con cursor
fecha/ID y restauración por ID en una transacción SQLCipher aislada. Se actualizan únicamente
`deleted_at` y `updated_at`: no se crea otro movimiento ni se alteran importe, cuenta, fecha,
etiquetas o ubicación. El motivo es obligatorio y queda en el evento `restored`. Reintentar
un movimiento activo no genera otro evento. Un fallo al auditar revierte la escritura.

La candidata 0.1.16 build 18 conecta la interfaz desde Ajustes → Auditoría y restauración.
La versión aceptada sigue siendo 0.1.15; #10 no se cierra hasta probar esta candidata.

## Implementación de la candidata (aceptación pendiente)

- Vista legible de creación, corrección, conciliación, borrado y restauración; tolerar eventos
  antiguos sin payload o con datos incompletos, sin inventar importes ni valores anteriores.
- Listado paginado de movimientos eliminados y confirmación de restauración con motivo.
- Mostrar cuenta/categoría archivada como histórica, sin reactivarla silenciosamente.
- Refrescar saldos, presupuestos, historial e informes después de restaurar; preservar
  campos ante errores y bloquear confirmaciones simultáneas en la interfaz.
- Pruebas SQLite reales de reintentos serializados, rollback, conservación y transferencias;
  migración v9 añade índices para paginación de auditoría y eliminados sin modificar registros.
- Pruebas UI de errores, motivo requerido y doble confirmación. APK y verificaciones de
  entrega se registran en DEVICE_VALIDATION.md; aceptación Android específica pendiente.

## Resumen recuperado a petición explícita

Se recupera la estructura visual de `90ebbee` (0.1.14): patrimonio, cuentas navegables,
cuadrícula de métricas, presupuestos, lectura rápida, dona por categorías, tendencia área/barras
7/14/30 días y dispersión. Los datos proceden de SQL y la dispersión tiene máximo 30 puntos;
no vuelve el historial global. Los patrones completos siguen bajo demanda en Ver todos.
Análisis permanece separado, con flujo/gastos/informes actuales. Las 15 capturas son referencia
de evolución; no se afirma haber implementado pronósticos, pagos planificados, crédito,
multimoneda ni comparaciones avanzadas pendientes de sus historias.

Prueba adicional RESUMEN-01: contrastar los gráficos y métricas con los movimientos, alternar
7/14/30 y área/barras, abrir cuenta y Análisis por separado; probar periodo vacío y texto ampliado.

## Aceptación Android pendiente

- AUD-01: revisar secuencia crear/corregir/borrar/restaurar, fechas y motivos legibles;
  conciliación muestra saldo anterior, diferencia y resultado cuando el evento los conserva.
- AUD-02: más de 50 eventos, sin omisiones ni duplicados; eventos antiguos sin payload
  muestran estado explícito, no datos supuestos.
- RES-01: restaurar gasto eliminado; mismo ID y datos, saldo/presupuesto/historial actualizados.
- RES-02: restaurar transferencia sin cambiar patrimonio; conservar cuentas archivadas.
- RES-03: doble toque/reintento y error de escritura no duplican operaciones ni auditoría.
- UPD-AUD: actualización sin borrar datos, copia preventiva, modo avión, accesibilidad y
  regresión de registro rápido/conciliación/corrección.
