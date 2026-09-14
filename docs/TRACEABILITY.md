# Matriz de trazabilidad

| Requisito                   | Caso de uso                     | Implementación                             | Verificación                   |
| --------------------------- | ------------------------------- | ------------------------------------------ | ------------------------------ |
| Registro rápido             | CU-01 Registrar gasto           | Formulario, favoritos, `createTransaction` | Flujo Maestro y prueba manual  |
| Ingreso variable            | CU-02 Registrar recarga         | Tipo `income` y campo `source`             | Analytics unitario             |
| Saldos separados            | CU-03 Consultar cuentas         | `calculateAccountBalances`                 | `balances.test.ts`             |
| Transferencia neutra        | CU-04 Transferir                | Regla de dominio                           | Prueba de patrimonio constante |
| Microgastos calculados      | CU-05 Analizar pequeños gastos  | `isMicroExpense`                           | `analytics.test.ts`            |
| Evidencia mínima            | CU-06 Ver patrones              | `buildInsights`                            | 10 movimientos / 3 días        |
| Privacidad geográfica       | CU-07 Guardar zona              | `approximateLocation`                      | `location.test.ts`             |
| Exportación consciente      | CU-08 Exportar CSV              | `exportTransactionsCsv`                    | Prueba manual con/sin zona     |
| Cifrado local               | CU-09 Abrir aplicación          | SQLCipher + SecureStore                    | Compilación nativa             |
| Respaldo                    | CU-10 Crear copia               | AES-256-GCM + PBKDF2                       | Prueba en dispositivo          |
| Clasificación precisa       | CU-11 Clasificar gasto          | Familias, subcategorías y búsqueda         | `categories.test.ts`           |
| Categoría propia            | CU-12 Crear subcategoría        | `createCategory` con auditoría             | Prueba manual y validación     |
| Borrado seguro              | CU-13 Eliminar categoría propia | Protección del catálogo y referencias      | Prueba manual y repositorio    |
| Ubicación precisa y privada | CU-14 Capturar zona             | GPS en primer plano + celda de 200 m       | Servicio y prueba en Android   |
