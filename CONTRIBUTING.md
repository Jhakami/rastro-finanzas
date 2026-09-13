# Contribuir a Rastro

Rastro se desarrolla en iteraciones cortas. Cada cambio debe pertenecer a una incidencia y a un hito de sprint; el alcance vigente está en [`docs/SPRINTS.md`](docs/SPRINTS.md).

## Flujo

1. Seleccionar o crear una incidencia sin publicar información financiera personal.
2. Crear una rama desde `main`, por ejemplo `feat/limites-por-categoria` o `fix/saldo-transferencia`.
3. Implementar una unidad pequeña con sus pruebas y documentación.
4. Ejecutar `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test`.
5. Abrir un pull request y completar su lista de verificación.
6. Integrar solo con la validación de calidad aprobada.

## Definición de terminado

Una incidencia está terminada cuando cumple sus criterios de aceptación, incluye pruebas proporcionales al riesgo, actualiza la trazabilidad y funciona sin internet. Los cambios nativos también requieren una prueba en Android. Una funcionalidad incompleta permanece abierta aunque el código compile.

## Datos y seguridad

- Usar datos inventados en pruebas y capturas.
- No confirmar bases SQLite, respaldos, archivos exportados, comprobantes ni claves.
- No almacenar coordenadas precisas ni añadir seguimiento en segundo plano.
- Toda migración debe preservar los datos de instalaciones anteriores.
