# Referencia visual de análisis · 29/10/2026

Fuente: las 15 capturas de Wallet aportadas por el usuario en esta conversación. Se usan
como inspiración de jerarquía e interacción; no se copian marca, textos ni datos de ejemplo.
No se incorporan al repositorio los archivos originales ni sus importes personales.

## Dos niveles, una prioridad

Resumen conserva Registrar gasto al principio. Después: patrimonio/saldo actual, selector
de cuentas, entradas/gastos/flujo del mes hasta hoy, presupuestos, cinco movimientos recientes
y un hallazgo prioritario. Análisis es una pantalla de profundidad, no otra pestaña vacía.
Se conserva Catppuccin oscuro, controles con estado accesible y textos propios de Rastro.

En Análisis, periodo y cuenta permanecen antes de las tarjetas, sin una bandeja inferior
que tape los gráficos. El valor inicial es el mes calendario hasta hoy. Los accesos 7/30 días
no sustituyen ese valor por defecto. Todos los paneles de flujo/gastos/informes usan el mismo
filtro. Saldo actual, presupuestos e insights globales indican expresamente sus ámbitos distintos.

## Adaptación y trazabilidad

| Referencia observada           | Adaptación para Rastro                                                                          | Historia / estado                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Saldo y cuentas                | Separar patrimonio actual de flujo del periodo; cuentas seleccionables                          | #49, primera adaptación; detalle de cuenta pendiente |
| Entradas frente a gastos       | Tarjeta con flujo neto y explicación de transferencias/reembolsos                               | #49, primera adaptación                              |
| Tendencia / acumulativo        | Barras de entradas y gastos con línea de flujo; acumulado desde cero, no saldo                  | #49, primera adaptación                              |
| Categorías / etiquetas         | Dona solo para categorías; etiquetas en barras porque pueden solaparse                          | #49, primera adaptación                              |
| Cinco gastos mayores           | Importes reales del filtro y acceso al movimiento para consultar/corregir                       | #49, primera adaptación                              |
| Informes                       | Cantidades, totales y promedios por día calendario y por registro                               | #49, primera adaptación                              |
| Comparaciones de periodos      | Mismos días transcurridos, ventanas explícitas y sin porcentajes con base cero                  | #16 y #17, pendientes                                |
| Detalle de gráfica a evidencia | Conservar periodo/cuenta/categoría al abrir lista paginada                                      | #19 y #49, pendientes                                |
| Perspectiva/pagos previstos    | Solo cuando existan reglas y ocurrencias reales; no tarjetas vacías                             | #12, pendiente                                       |
| Naturaleza del gasto           | Clasificación voluntaria explícita; nunca inferir obligaciones o necesidades solo por categoría | Alcance futuro por definir, no implementado          |
| Crédito, activos, monedas      | No introducir módulos sin datos ni multimoneda; MVP en PEN                                      | Fuera del incremento                                 |

## Reglas para gráficos honestos

- Sin movimientos: estado vacío explicativo, no dona ni barras de relleno que parezcan datos.
- Cada gasto cuenta una vez en el total, aunque tenga varias etiquetas. Sus barras no se suman.
- Transferencias y conciliaciones no son gasto/ingreso. Entradas incluye reembolsos y se indica.
- Saldos actuales incluyen cuentas archivadas; no se confunden con flujos o pronósticos.
- Siete días incluye hoy y los seis anteriores. Inicio inclusivo, fin exclusivo, calendario local.
- El promedio diario incluye días sin gasto; el promedio por registro usa solo gastos.
- Colores se acompañan de leyendas y valores consultables. No se dibujan curvas suavizadas que
  sugieran operaciones intermedias inexistentes. Los valores diarios tienen alternativa textual.
- Compartir/exportar gráficos queda pendiente; no añadir botones sin acción ni envío automático.

## Gráficos locales, no Grafana embebido

Decisión: reutilizar `react-native-svg` y componentes React Native. Grafana sirve como referencia
de paneles, leyendas y filtros, pero desplegar su instancia/navegador añadiría infraestructura
innecesaria para esta app individual sin backend. Esto es una decisión de alcance, no una
afirmación de que Grafana no pueda visualizar finanzas.
Referencia técnica: [instalación oficial de Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/installation/),
consultada el 29/10/2026. No se envían movimientos a Grafana ni a otro servidor.

## Límite de esta primera adaptación

La rama de 0.1.15 contiene una primera separación Resumen/Análisis y pruebas de cálculo/UI.
Resumen/Análisis todavía usan las lecturas de FinanceProvider. La segunda parte (30/10/2026)
añade LedgerRepository con páginas de 50, filtros combinables de Movimientos y detalle de
cuenta con acceso a historial y conciliación. Faltan agregaciones SQL, retirar la carga global,
medir rendimiento y aceptación Android para terminar #49. No se considera
terminado Sprint 4 ni se adjudican como completas #16/#17/#19. No se ha generado ni aceptado
una APK 0.1.15 en esta primera adaptación. Microgastos y proyección de gasto se mantienen en
Informes; esta última se distingue de un pronóstico de saldo basado en pagos planificados.
