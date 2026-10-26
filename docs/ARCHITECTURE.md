# Arquitectura

```text
Pantallas Expo Router
        |
FinanceProvider (estado de lectura)
        |
Casos de uso / Analytics / Balances / Location
        |
LocalRepository (consultas parametrizadas + auditoría)
        |
SQLite + SQLCipher ---- SecureStore (clave)
```

## Invariantes

- Un gasto reduce exactamente una cuenta.
- Un ingreso o reembolso aumenta exactamente una cuenta.
- Una transferencia resta del origen y suma al destino; el total no cambia.
- Solo los ajustes pueden usar montos con signo.
- Un reembolso debe apuntar al gasto original.
- Las eliminaciones son lógicas y generan auditoría.
- Ninguna coordenada precisa entra a SQLite.
- Los patrones insuficientes se identifican como tales.

## Datos y extensibilidad

`schema.ts` define cuentas, categorías, movimientos, favoritos, límites, celdas, auditoría y configuración con Drizzle. La migración se ejecuta antes de sembrar valores iniciales. `SyncProvider` permanece conceptualmente en el límite de infraestructura: una sincronización futura no puede reemplazar la fuente local ni bloquear el registro.

## Evolución aprobada (pendiente de implementación)

Primera extracción en `0.1.13`: FavoriteRepository tiene adaptador SQLite independiente y un
store Zustand con selectores. Los cambios de plantillas recargan únicamente sus favoritos;
FinanceProvider invalida ese store cuando cambian movimientos o catálogos. El resto de la
modularización sigue pendiente. La migración v6 añade modo de monto, fechas y favorite_tags,
conservando las plantillas y el historial existentes.

El registro sencillo sigue siendo el recorrido principal. Se mantiene Android individual,
PEN, SQLCipher y funcionamiento sin conexión; no se incorpora backend en estos sprints.

- Extraer progresivamente los puertos AccountRepository, LedgerRepository, CatalogRepository,
  FavoriteRepository, PlanningRepository y SettingsRepository, comenzando por favoritos en #9.
- Reemplazar gradualmente la recarga global por estado modular con Zustand y selectores;
  invalidar únicamente consultas afectadas después de confirmar cada escritura.
- Introducir TransactionQuery y TransactionPage con cursor estable por fecha e ID, páginas de
  50 registros y filtros por fechas, texto, cuenta, tipo, categoría y etiquetas.
- Calcular saldos y agregaciones con SQL acotado, manteniendo análisis fuera de las pantallas.
- Añadir Budget y BudgetScope en #11 migrando límites existentes sin alterar montos o ámbitos.
- Añadir PlannedPayment y PlannedOccurrence en #12 con unicidad por regla y ocurrencia;
  confirmar y crear el movimiento en una sola transacción. La confirmación manual será el
  valor inicial; la automática procesará pendientes al abrir/reactivar sin prometer ejecución
  puntual en segundo plano.
- Mantener UUID, auditoría, borrado lógico y fechas de modificación cuando corresponda;
  versionar migraciones mediante PRAGMA user_version y probarlas sobre bases existentes.
- Definir SyncProvider con adaptador desactivado al extraer los límites de infraestructura;
  no tendrá autenticación ni tráfico. La sincronización futura no sustituirá SQLite.
- La restauración leerá copias .finbackup existentes, comprobará integridad y creará una copia
  preventiva antes de reemplazar datos. No se marca como disponible hasta implementar #14.

## Mapas y privacidad

MapLibre recibe exclusivamente agregaciones de celdas. OpenFreeMap entrega teselas visuales; no recibe montos, categorías ni el conjunto de movimientos. Si no hay red, la lista de zonas sigue operativa.
