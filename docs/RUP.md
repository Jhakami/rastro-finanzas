# RUP ligero

## Inicio

**Visión:** reducir la fricción de anotar compras y transformar el historial en explicaciones objetivas.

**Actor:** propietario del dispositivo. No existen administradores, prestamistas ni usuarios remotos.

**Casos de uso prioritarios:** registrar gasto, registrar ingreso variable, transferir entre cuentas, consultar saldo, revisar historial, analizar microgastos, consultar zonas y respaldar.

**Riesgos:** pérdida del dispositivo, error de saldo, exposición de ubicaciones, conclusiones con poca muestra, ruptura de firma o migración y dependencia del mapa base.

## Elaboración

- Arquitectura por dominio, aplicación, infraestructura y presentación.
- SQLite cifrada como fuente de verdad.
- Montos enteros en céntimos y escrituras transaccionales.
- Patrones con umbral mínimo de 10 movimientos en 3 días.
- Coordenadas cuantizadas a celdas de 50 m y descarte del punto exacto.
- Vista de lista independiente del proveedor cartográfico.

## Construcción

1. **Iteración 1:** movimientos, cuentas iniciales, dashboard, patrones, mapa, CSV, copia cifrada y biometría.
2. **Iteración 2:** CRUD de cuentas/categorías/favoritos, límites y conciliación guiada.
3. **Iteración 3:** recurrencias confirmables, comprobantes y restauración completa.
4. **Iteración 4:** comparaciones avanzadas, recomendaciones aceptables y paquetes de mapa offline.

Cada iteración exige typecheck, pruebas unitarias, flujo Maestro, prueba en dispositivo y verificación de migración.

## Transición

- Generar APK firmado desde una etiqueta `v*`.
- Instalar sobre la versión anterior sin borrar datos.
- Exportar CSV y copia cifrada antes de la actualización.
- Validar permiso denegado, modo avión y mapa base caído.
- Publicar notas de cambios y hash SHA-256 del APK.
