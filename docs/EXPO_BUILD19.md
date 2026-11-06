# Mantenimiento Expo · 0.1.16 build 19

Actualización solicitada el 06/11/2026 para resolver CI del PR #52 y de la rama
`codex/recurrence-foundation`. La ejecución 42289766736 falla en `expo install --check`,
antes de las pruebas. El aviso de migración de Ubuntu no es el error que detiene el job.

Parches compatibles solicitados por Expo:

- expo 57.0.31 → 57.0.32
- expo-constants 57.0.22 → 57.0.23
- expo-image-picker 57.0.20 → 57.0.21
- expo-location 57.0.22 → 57.0.23
- expo-notifications 57.0.24 → 57.0.25
- expo-router 57.0.29 → 57.0.30
- expo-sharing 57.0.24 → 57.0.25

Se mantiene Resumen con gráficos, Análisis separado y toda la funcionalidad de build 18.
La base de recurrencias sigue aislada y no se incluye en la APK del PR #52.
No hay nuevas migraciones de datos ni backend. Se incrementa `versionCode` a 19 para
actualizar encima de build 18. Conservar la APK aceptada y su hash original.

La aceptación de AUD/RES/UPD-AUD y RESUMEN-01 del build 18 se conserva; no demuestra la
regresión de esta compilación nueva. Antes de integrar, comprobar compatibilidad Expo,
TypeScript, ESLint, Jest, SQL, CI, compilación ARM64, firma, permisos y SHA-256.

Comprobación manual de build 19: copia cifrada preventiva, actualizar sin desinstalar,
abrir base y contrastar saldos/presupuestos, registrar gasto, abrir Resumen y Análisis,
revisar auditoría/restauración, ubicación y avisos opcionales con permisos denegados,
modo avión y exportación/compartición. No borrar datos ante un fallo de actualización.
