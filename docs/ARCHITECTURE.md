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

## Mapas

MapLibre recibe exclusivamente agregaciones de celdas. OpenFreeMap entrega teselas visuales; no recibe montos, categorías ni el conjunto de movimientos. Si no hay red, la lista de zonas sigue operativa.
