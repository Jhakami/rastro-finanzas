# Rastro

[![Calidad](https://github.com/Jhakami/rastro-finanzas/actions/workflows/quality.yml/badge.svg)](https://github.com/Jhakami/rastro-finanzas/actions/workflows/quality.yml)

Aplicación Android local-first para registrar gastos e ingresos en segundos, controlar Yape,
banco, efectivo y cuentas propias, y descubrir patrones de compra verificables sin enviar el
historial financiero a un servidor de Rastro.

## Estado actual

Rastro está en construcción. La versión en desarrollo es `0.1.10` (`versionCode 11`). No debe
considerarse todavía una versión final ni una aplicación publicada en una tienda.

| Etapa                                  | Avance | Estado                         |
| -------------------------------------- | -----: | ------------------------------ |
| Sprint 0 · Base técnica                |  100 % | Terminado                      |
| Sprint 1 · Trazabilidad diaria         |  100 % | Terminado y probado en Android |
| Sprint 2 · Parametrización             |   50 % | En curso                       |
| Sprint 3 · Automatización y documentos |    0 % | Pendiente                      |
| Sprint 4 · Análisis avanzado           |   40 % | Parcialmente implementado      |
| Sprint 5 · Publicación personal        |    0 % | Pendiente                      |
| MVP completo                           |   48 % | Estimación orientativa         |

El CRUD de cuentas de `0.1.9` está terminado: superó 28 pruebas automáticas y los casos manuales
`ACC-01` a `ACC-05` en un POCO X7 Pro. `0.1.10` continúa el Sprint 2 con el ciclo de vida de
categorías propias; su aceptación en Android sigue pendiente.

Consulta el [plan y avance por sprints](docs/SPRINTS.md) y la
[guía de validación en Android](docs/DEVICE_VALIDATION.md) para ver los criterios aprobados y los
pendientes reales.

## Funciones disponibles

- base SQLite cifrada con SQLCipher y clave protegida mediante SecureStore;
- Yape como cuenta principal, banco, efectivo y cuentas personalizadas;
- gastos, ingresos variables y transferencias con auditoría y borrado lógico;
- registro rápido, categorías jerárquicas y favoritos derivados del comportamiento;
- dashboard con saldos, proyección, microgastos, límites, gráficos consultables y patrones
  explicables;
- ubicación opcional en primer plano, reducida inmediatamente a una celda aproximada de 50 m;
- mapa de calor con alternativa en lista;
- exportación CSV con o sin zonas y copia cifrada de la base de datos;
- bloqueo biométrico opcional y tema Catppuccin Mocha oscuro;
- creación, edición, orden, archivado y restauración de cuentas, ya aceptadas en dispositivo;
- administración equivalente de categorías propias, pendiente de aceptación final en Android.

Todavía faltan, entre otros puntos, etiquetas, favoritos manuales, conciliación, recurrencias,
comprobantes, restauración guiada, periodos avanzados del dashboard y la firma privada de una
versión publicable.

## Desarrollo

Requisitos: Node.js 22, Java 17 y Android Studio con un SDK Android actual.

```bash
npm ci --legacy-peer-deps
npm run typecheck
npm run lint
npm run format:check
npm test
npm run android
```

SQLCipher y MapLibre requieren una compilación nativa; Expo Go no es suficiente. Para regenerar
Android:

```bash
npx expo prebuild --platform android --clean
```

## Privacidad y seguridad

- Rastro no tiene cuentas remotas, publicidad ni analítica de comportamiento.
- Los movimientos y la configuración permanecen cifrados en el dispositivo.
- La ubicación es opcional: se solicita solo mientras la aplicación está en uso, se transforma en
  una celda aproximada de 50 m y no se conserva el punto GPS original.
- Los CSV excluyen las zonas por defecto; incluirlas requiere una elección explícita.
- Las exportaciones salen del control de Rastro cuando el usuario decide compartirlas con otra
  aplicación o servicio.
- `.gitignore` bloquea bases locales, exportaciones, copias, comprobantes y claves.

La explicación completa sobre datos, permisos, mapas, copias y eliminación está en la
[Política de privacidad](PRIVACY.md).

## Documentación

- [Plan por sprints](docs/SPRINTS.md)
- [Validación en dispositivo](docs/DEVICE_VALIDATION.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [RUP ligero](docs/RUP.md)
- [Matriz de trazabilidad](docs/TRACEABILITY.md)
- [Decisiones de arquitectura](docs/adr/0001-local-first.md)
- [Guía de contribución](CONTRIBUTING.md)
- [Política de privacidad](PRIVACY.md)
