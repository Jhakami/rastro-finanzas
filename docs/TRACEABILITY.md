# Matriz de trazabilidad

| Requisito              | Caso de uso                    | Implementación                             | Verificación                   |
| ---------------------- | ------------------------------ | ------------------------------------------ | ------------------------------ |
| Registro rápido        | CU-01 Registrar gasto          | Formulario, favoritos, `createTransaction` | Flujo Maestro y prueba manual  |
| Ingreso variable       | CU-02 Registrar recarga        | Tipo `income` y campo `source`             | Analytics unitario             |
| Saldos separados       | CU-03 Consultar cuentas        | `calculateAccountBalances`                 | `balances.test.ts`             |
| Transferencia neutra   | CU-04 Transferir               | Regla de dominio                           | Prueba de patrimonio constante |
| Microgastos calculados | CU-05 Analizar pequeños gastos | `isMicroExpense`                           | `analytics.test.ts`            |
| Evidencia mínima       | CU-06 Ver patrones             | `buildInsights`                            | 10 movimientos / 3 días        |
| Privacidad geográfica  | CU-07 Guardar zona             | `approximateLocation`                      | `location.test.ts`             |
| Exportación consciente | CU-08 Exportar CSV             | `exportTransactionsCsv`                    | Prueba manual con/sin zona     |
| Cifrado local          | CU-09 Abrir aplicación         | SQLCipher + SecureStore                    | Compilación nativa             |
| Respaldo               | CU-10 Crear copia              | AES-256-GCM + PBKDF2                       | Prueba en dispositivo          |
