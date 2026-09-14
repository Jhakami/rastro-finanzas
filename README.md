# Rastro

[![Calidad](https://github.com/Jhakami/rastro-finanzas/actions/workflows/quality.yml/badge.svg)](https://github.com/Jhakami/rastro-finanzas/actions/workflows/quality.yml)

Aplicación Android local-first para registrar gastos e ingresos en segundos, controlar Yape, banco y efectivo, y descubrir patrones de compra verificables sin enviar datos financieros a un servidor.

## Estado del producto

La iteración 1 incluye:

- base SQLite cifrada con SQLCipher y clave en SecureStore;
- Yape, banco y efectivo con saldos independientes;
- gastos, ingresos y transferencias con auditoría y borrado lógico;
- registro rápido mediante favoritos y categorías;
- dashboard mensual, proyección, microgastos y patrones con evidencia;
- ubicación opcional reducida inmediatamente a celdas de 50 m;
- mapa de calor con alternativa en lista;
- exportación CSV y copia de la base cifrada con contraseña;
- bloqueo biométrico opcional.

La gestión visual completa de categorías, favoritos, recurrencias y límites, la restauración guiada y los comprobantes se mantienen en el backlog de construcción. El esquema y las interfaces están preparados para esas iteraciones.

## Desarrollo

Requisitos: Node.js 22, Java 17 y Android Studio con un SDK Android actual.

```bash
npm ci --legacy-peer-deps
npm run typecheck
npm test
npm run android
```

SQLCipher y MapLibre requieren una compilación nativa; Expo Go no es suficiente. Para regenerar Android:

```bash
npx expo prebuild --platform android --clean
```

## Privacidad

- No existe backend ni cuenta remota.
- Nunca se solicita ubicación precisa ni en segundo plano.
- La coordenada original solo vive en memoria el tiempo necesario para asignar una celda aproximada.
- Los CSV excluyen ubicaciones por defecto.
- `.gitignore` bloquea bases, exportaciones, comprobantes y claves.

Consulta [sprints](docs/SPRINTS.md), [arquitectura](docs/ARCHITECTURE.md), [RUP ligero](docs/RUP.md), [trazabilidad](docs/TRACEABILITY.md), [decisiones](docs/adr/0001-local-first.md) y la [guía de contribución](CONTRIBUTING.md).
