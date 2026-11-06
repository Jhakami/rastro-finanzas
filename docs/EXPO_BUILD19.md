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
Las siete dependencias se fijan a las versiones verificadas; `package-lock.json` conserva
las resoluciones transitivas. npm actualizó también dependencias transitivas y paquetes
permitidos por los rangos existentes (65 paquetes cambiados, 8 añadidos y 2 retirados).
No se ejecutó `audit fix`. La instalación informa 23 alertas (6 bajas, 11 moderadas,
5 altas y 1 crítica); no equivalen a una validación de explotabilidad y requieren
evaluación separada. Expo Doctor comprueba compatibilidad, no certifica seguridad.
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

## Artefacto verificado · 06/11/2026

- `artifacts/Rastro-0.1.16-build19-arm64-v8a.apk`, 76.536.713 bytes.
- SHA-256: `B34826FF6311A80F04FC5C4452EC15ECF9B3888FE47AD0B62A50C497433E10D2`.
- Paquete `pe.rastro.finanzas`, versión `0.1.16`, código `19`, solo ARM64.
- Firma v2 válida; mismo certificado de desarrollo que build 18:
  `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Permisos idénticos a build 18. Sin micrófono ni ubicación en segundo plano.
- Gradle release/Hermes y Lint Vital correctos: 22 min 22 s, 700 tareas (220 ejecutadas).
  Código de aplicación/dependencias en `0bff089`; notas posteriores no cambian el binario.
- Expo Doctor 21/21, compatibilidad Expo, TypeScript, ESLint y SQLite correctos.
  CI del PR #52 y de recurrencias aprobado (ejecución corregida 42291794738).
- La primera ejecución Jest local agotó el timeout al compilar simultáneamente;
  la repetición sin Gradle aprobó 110/110 pruebas en 28 suites, sin ampliar timeouts.
  CI también aprobó la suite completa.

No se instaló en teléfono ni se atribuye aceptación manual a este build. El certificado
es de desarrollo, no de publicación privada. El build 18 permanece intacto y aceptado.
