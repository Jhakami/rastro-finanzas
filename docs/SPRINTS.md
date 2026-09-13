# Plan de construcción por sprints

Cada sprint termina únicamente cuando pasan TypeScript, ESLint, Jest, Expo Doctor, bundle Hermes y prueba manual en Android. El estado **hecho** significa implementado y verificado; no significa que todo el producto esté culminado.

## Sprint 0 — Base técnica · Hecho

- Expo 57, React Native 0.86 y TypeScript estricto.
- Arquitectura por capas, navegación y tokens visuales.
- SQLite con SQLCipher, SecureStore, migración y auditoría.
- Calidad automática, Dependabot y documentación RUP/ADR.

## Sprint 1 — Trazabilidad diaria · Hecho, pendiente de prueba en dispositivo

- Yape como cuenta principal, banco y efectivo.
- Gastos, ingresos variables y transferencias.
- Registro rápido, favoritos iniciales e historial filtrable.
- Saldos por cuenta, flujo mensual y borrado lógico.
- Microgastos calculados mediante umbral configurable.
- Ubicación aproximada opcional, mapa de calor y lista offline.
- Patrones con evidencia mínima, CSV, biometría y copia cifrada.

**Cierre pendiente:** compilar e instalar el APK con Android SDK y ejecutar el flujo Maestro en un teléfono o emulador.

## Sprint 2 — Parametrización completa · Pendiente

- Crear, editar, ordenar, archivar y restaurar cuentas.
- CRUD de categorías, subcategorías y etiquetas.
- CRUD de favoritos con monto fijo, sugerido o variable.
- Conciliación guiada con motivo y vista de auditoría.
- Límites generales, por cuenta y por categoría con alertas configurables.

## Sprint 3 — Automatización y documentos · Pendiente

- Recurrencias que generen borradores confirmables y notificaciones.
- Fotografías de comprobantes almacenadas en el espacio privado.
- Respaldo que incluya comprobantes y restauración guiada con copia preventiva.
- Reembolsos enlazados desde la interfaz al gasto original.

## Sprint 4 — Análisis avanzado · Pendiente

- Periodos hoy/semana/3 meses/6 meses/año/rango personalizado.
- Comparación contra el periodo equivalente anterior.
- Análisis posterior a recargas, mediana, máximos, frecuencia y evolución temporal.
- Detalle navegable desde cada tarjeta hasta sus movimientos de evidencia.
- Recomendaciones que puedan aceptarse, modificarse, posponerse o descartarse.
- Etiquetas manuales para celdas geográficas y paquetes de mapa offline.

## Sprint 5 — Publicación personal · Pendiente

- Pruebas de migración, permisos denegados, modo avión y varios años de datos.
- Generación de clave privada de firma y almacenamiento seguro de su copia.
- Configuración de secretos de GitHub Actions.
- APK firmado, hash SHA-256, notas de versión y prueba de actualización sin pérdida de datos.
