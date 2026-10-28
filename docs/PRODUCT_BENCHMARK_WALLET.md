# Benchmark de producto: Wallet y Rastro

## Objetivo

La prioridad de UX es registrar gastos sencillamente: monto, cuenta visible y categoría, con
favoritos/recientes y detalles opcionales desplegables. Presupuestos y análisis complementan ese
recorrido. La ejecución por versiones e historias está en el
[plan integrado de los sprints existentes](./SPRINTS.md#plan-integrado-aprobado).

Wallet de BudgetBakers se usa como referencia funcional y de jerarquía de información, no como
una interfaz para copiar. Rastro conservará su identidad visual, sus textos y su arquitectura
local-first. El objetivo es adoptar patrones que reduzcan errores y hagan más comprensible el
dinero mensual.

Fuentes oficiales revisadas:

- [descripción de Wallet](https://support.budgetbakers.com/hc/en-us/articles/12212428113810-What-is-the-Wallet-app);
- [registros: alta, edición, clonación y división](https://support.budgetbakers.com/hc/en-us/articles/7149271363090-Everything-About-Transactions-Add-edit-clone-split-duplicates);
- [ajuste de un saldo incorrecto](https://support.budgetbakers.com/hc/en-us/articles/7149497597970-Adjust-Incorrect-Balance);
- [configuración de presupuestos](https://support.budgetbakers.com/hc/en-us/articles/7076953735314-Setup-Budgets);
- [pagos planificados](https://support.budgetbakers.com/hc/en-us/articles/7149523920786-Setup-Planned-Payments);
- [tarjetas configurables del dashboard](https://support.budgetbakers.com/hc/en-us/articles/7150077480850-Add-or-Modify-Dashboard-Cards-Widgets);
- [categorías y subcategorías](https://support.budgetbakers.com/hc/en-us/articles/7077082048146-All-about-Categories-and-Subcategories).

## Qué funciona bien en Wallet

1. **El saldo conduce a la acción.** Cada cuenta muestra su saldo y permite corregir una
   diferencia mediante un movimiento compensatorio.
2. **El movimiento es la unidad central.** Gasto, ingreso y transferencia comparten una ficha
   editable con cuenta, categoría y detalles secundarios.
3. **El presupuesto explica el futuro.** No muestra solo un límite: separa gastado, restante,
   gasto previsto y saldo esperado, y permite filtrar por categoría, cuenta o etiqueta.
4. **La planificación reutiliza el registro normal.** Un pago recurrente se confirma y termina
   convertido en un movimiento ordinario, en vez de formar un historial paralelo.
5. **El dashboard es modular.** Sus tarjetas se pueden agregar, quitar, filtrar y ordenar para
   priorizar la información que necesita cada persona.
6. **La complejidad es progresiva.** Monto, cuenta y categoría aparecen primero; nota, etiquetas,
   comercio, fecha, ubicación y comprobante quedan como información adicional.

## Traducción a Rastro

| Patrón                                              | Estado en Rastro         | Decisión                                                                                                |
| --------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| Saldo visible por cuenta                            | Disponible               | Mantener cuentas en el resumen y abrir su detalle desde la tarjeta.                                     |
| Conciliar saldo con un movimiento                   | Implementado en `0.1.12` | Conservar motivo obligatorio y auditoría; no reescribir el saldo inicial silenciosamente.               |
| Editar cuenta/tipo/monto/categoría de un movimiento | Implementado en `0.1.12` | Conservar fecha, etiquetas y zona; exigir la razón de la corrección.                                    |
| Acceso rápido a registros habituales                | Parcial                  | Terminar favoritos configurables en #9 antes de ampliar la navegación.                                  |
| Presupuesto por categoría, cuenta o etiqueta        | Parcial                  | Completar selección por cuenta en #11; evitar presupuestos que se superpongan sin advertencia.          |
| Gastado, restante y riesgo de exceso                | Parcial                  | Mostrar progreso mensual y estados neutro/advertencia/excedido antes de agregar predicciones complejas. |
| Pagos recurrentes confirmables                      | Pendiente                | Implementar borradores confirmables en Sprint 3 (#12), con protección contra duplicados.                |
| Dashboard configurable                              | Pendiente                | Incorporar orden y visibilidad de tarjetas después del CRUD de favoritos y límites.                     |
| Periodos y comparaciones                            | Parcial                  | Terminar Sprint 4 (#16 y #17) sin mezclar meses incompletos con meses cerrados.                         |
| Sincronización bancaria                             | Fuera del MVP            | Mantener captura manual/local-first; requiere otro modelo de seguridad, infraestructura y soporte.      |
| Multimoneda                                         | Fuera del MVP actual     | Diseñarla aparte: Yape, efectivo o banco son cuentas/métodos, no monedas.                               |

## Arquitectura de información objetivo

La barra inferior debe seguir siendo corta y estable:

- **Resumen:** patrimonio, cuentas, gasto/ingreso del mes, límites y hallazgos prioritarios.
- **Movimientos:** búsqueda, filtros y acceso por toque a la ficha editable.
- **Plan:** presupuestos, pagos recurrentes y proyección mensual. Se incorpora cuando Sprint 3
  tenga contenido suficiente; antes de eso no se presenta una pestaña vacía.
- **Zonas:** mapa/lista de ubicaciones aproximadas.
- **Ajustes:** catálogos, privacidad, seguridad, exportación y respaldo.

El botón principal para registrar debe permanecer accesible desde Resumen y Movimientos. Las
acciones destructivas o contables no deben depender únicamente de una pulsación larga: necesitan
texto, confirmación y una alternativa accesible.

## Orden recomendado

Actualización 28/10/2026: TAG/REC/COR y favoritos/registro rápido FAV-01–FAV-04, UX-01 ya
fueron aceptados. #9 cerrada y #47 fusionado. El incremento activo #11 implementa presupuestos
desde Resumen y Ajustes, sin desplazar Registrar gasto ni crear una pestaña vacía. Incluye
periodos, ámbitos combinables, progreso accesible, solapamientos confirmables y avisos locales.
Su aceptación Android sigue pendiente; no se cuenta la implementación como historia cerrada.

1. Aceptar en Android etiquetas (`TAG-01` a `TAG-03`) y conciliación/corrección (`REC-01`,
   `COR-01` y `COR-02`).
2. Terminar favoritos configurables (#9) y límites por cuenta (#11).
3. Simplificar el primer bloque del Resumen: patrimonio, selector de cuenta y estado mensual.
4. Implementar pagos planificados como borradores confirmables (#12).
5. Crear la vista **Plan** cuando presupuestos y recurrencias puedan convivir en ella.
6. Habilitar orden/visibilidad de tarjetas y periodos avanzados durante Sprint 4.

## Criterios que Rastro no debe perder

- datos cifrados y almacenados localmente;
- ausencia de publicidad y rastreo de comportamiento;
- ubicación opcional y reducida a una celda aproximada;
- ajustes y correcciones auditables;
- hallazgos con muestra, periodo y evidencia;
- interfaz en español y PEN como moneda inicial del MVP.

Para una comparación visual pantalla por pantalla serían útiles capturas actuales de Wallet de:
Resumen, detalle/edición de movimiento, Cuentas, Presupuestos y Estadísticas. No deben contener
saldos, nombres ni datos financieros reales.
