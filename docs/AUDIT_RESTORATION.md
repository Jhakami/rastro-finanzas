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

Todavía no se conecta a la interfaz ni se entrega una APK nueva: la versión instalada y
aceptada sigue siendo 0.1.15. No se cierra #10 por disponer de estos métodos.

## Siguientes partes

- Vista legible de creación, corrección, conciliación, borrado y restauración; tolerar eventos
  antiguos sin payload o con datos incompletos, sin inventar importes ni valores anteriores.
- Listado paginado de movimientos eliminados y confirmación de restauración con motivo.
- Mostrar cuenta/categoría archivada como histórica, sin reactivarla silenciosamente.
- Refrescar saldos, presupuestos, historial e informes después de restaurar; preservar
  campos ante errores y bloquear confirmaciones simultáneas en la interfaz.
- Pruebas SQLite reales de concurrencia, rollback, conservación y transferencias;
  índices/migración para paginación de auditoría y eliminados si lo requiere la consulta.
- Pruebas UI, APK actualizable, firma/permisos/hash y aceptación Android específica.

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
