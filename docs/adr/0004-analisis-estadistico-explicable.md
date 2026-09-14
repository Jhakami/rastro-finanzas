# ADR 0004 — Análisis estadístico explicable

## Estado

Aceptado.

## Decisión

Rastro calculará localmente comparación contra promedio histórico, atípicos mediante
desviación estándar, rachas mensuales, cambio de participación, proyección y cumplimiento de
límites. Los umbrales se guardan como ajustes del usuario.

Salvo una regla explícita de límite, un patrón requiere al menos diez gastos distribuidos en tres
días. Cada resultado conserva periodo, muestra, comparación, cálculo y movimientos relacionados.
Los aportes familiares se describen como dinero recibido y no como sueldo garantizado.

## Consecuencias

- El análisis funciona sin backend ni IA generativa.
- Los resultados pueden auditarse y no atribuyen emociones o personalidad.
- Una desviación estadística es una señal revisable, no una afirmación psicológica.
- Los meses sin gasto cuentan en el promedio histórico para no ocultar cambios reales.
