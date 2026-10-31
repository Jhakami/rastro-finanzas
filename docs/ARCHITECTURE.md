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

## Evolución progresiva (parcialmente implementada)

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

## Presupuestos 0.1.14 (#11)

`PlanningRepository` y su adaptador SQLite separan la planificación del repositorio general.
`Budget`/`BudgetScope` admiten selección múltiple: OR dentro de cada ámbito, AND entre
cuentas, categorías y etiquetas. Las familias incluyen descendientes. Los solapamientos son
advertencias conservadoras y requieren confirmación explícita; no se agregan sus importes.

La migración v7 transforma `spending_limits` conservando IDs, importes y ámbitos, incluidos
los archivados. Añade relaciones de ámbitos, periodos, orden, fechas y deduplicación de avisos.
Las escrituras y auditoría se confirman atómicamente en una conexión aislada inicializada con
la clave SQLCipher, claves foráneas y BEGIN IMMEDIATE. No se usa una conexión sin clave.

El store Zustand de presupuestos recarga solo planificación tras sus escrituras. Los cambios
contables invalidan sus agregaciones. SQL calcula suma y cantidad sin cargar el historial;
usa inicio inclusivo/fin exclusivo del calendario local y EXISTS para evitar duplicados por
etiquetas. `test:budget-sql` ejecuta las consultas y migración reales contra SQLite en memoria.

Avisos locales opcionales, sin servidor, con permiso solicitado solo al activarlos. Se evalúan
al cambiar datos, reactivar y durante uso; deduplicación persistente por presupuesto/periodo/
nivel. Denegar permisos no impide guardar. Los avisos no muestran importes ni nombres.
La pestaña Plan y recurrencias continúan pendientes de #12.

## Primera adaptación de Resumen/Análisis (rama 0.1.15)

`analysis-view-model` separa cálculos de calendario, agrupación y flujo de las pantallas.
Resumen prioriza registro y acciones; `/analysis` añade paneles por flujo, gastos e informes.
`FlowChart` usa SVG local y alternativa textual. No hay Grafana, WebView ni servidor nuevo.
Resumen y Análisis leen agregaciones de `reportingRepository`; `FinanceProvider` ya no
expone ni carga el historial. Conserva catálogos, saldos SQL, cinco categorías recientes y
una revisión para invalidar consultas al escribir, reactivar o cambiar de día local.
La segunda parte (30/10/2026) añade `LedgerRepository`, `TransactionQuery` y `TransactionPage`:
consulta parametrizada, cursor por instante/ID, 50 resultados y una fila extra para determinar
si hay más. La migración v8 agrega un índice parcial de fecha/ID sin cambiar registros.
Movimientos usa `FlatList` y un store Zustand con selectores; descarta respuestas antiguas,
evita cargas repetidas, conserva cursor ante errores y reinicia al refrescar o cambiar filtros.
Las escrituras contables y reactivación invalidan la página mediante el refresh existente.
No hay lectura completa del historial al abrir la app ni después de una escritura.

Filtros: texto literal, cuenta (incluido destino de transferencia), tipo, categoría/familia,
fechas locales inicio inclusivo/fin exclusivo y todas las etiquetas seleccionadas (AND).
El filtro se aplica explícitamente y la lista muestra el ámbito aplicado. Las cuentas archivadas
conservan sus registros. `/account-detail` consulta recientes y enlaza historial/conciliación.
`test:ledger-sql` ejecuta consulta/migración reales sobre 5.005 filas visibles de varios años,
incluyendo fechas empatadas, offsets, etiquetas, búsquedas literales y consulta del índice.
`REPORT_SQL` calcula total, cantidad, microgastos (incluidas excepciones), categorías, etiquetas
y días en una única sentencia/snapshot SQLite. Devuelve solo agregados, cinco recientes,
cinco gastos mayores y hasta treinta puntos de dispersión; las cantidades no se calculan
desde esas muestras. Los días locales se convierten a límites ISO explícitos antes de SQL.
Transferencias/ajustes no cuentan como flujo; reembolsos sí son entradas. Saldos SQL conservan
saldo inicial, signos de ajustes y ambos extremos de transferencias, incluso cuentas archivadas.

Corrección consulta por ID; Zonas agrupa por celda en SQL; Patrones carga bajo demanda solo
su ventana temporal (hasta seis meses anteriores y mes actual), conservando las reglas de
evidencia existentes. CSV consulta el historial únicamente al pulsar Exportar, no desde el
proveedor: esa exportación explícita todavía arma el archivo en memoria. No se afirma que
la exportación sea streaming ni que Patrones tenga memoria constante con un mes extremadamente
denso. Las consultas de pantalla descartan respuestas tardías tras cambio de filtro/revisión.

Prueba SQLite con 100.000 registros históricos adicionales: mismos resultados del mes y
muestras limitadas; los tiempos locales de escritorio no certifican rendimiento Android.
Faltan aceptación y rendimiento en dispositivo para cerrar #49. Las comparaciones de #17 no están implementadas.
Ver [referencia visual](./UX_ANALYTICS_REFERENCE.md).

## Mapas y privacidad

MapLibre recibe exclusivamente agregaciones de celdas. OpenFreeMap entrega teselas visuales; no recibe montos, categorías ni el conjunto de movimientos. Si no hay red, la lista de zonas sigue operativa.
