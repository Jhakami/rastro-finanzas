# Aceptación 0.1.16 · 06/11/2026

El usuario confirmó explícitamente todos los casos de la APK 0.1.16 build 18:
AUD-01–02, RES-01–03, UPD-AUD y RESUMEN-01. SHA-256:
`92E6A67017B969A8866F8A05BB7D18508C5313A077E5CDC88302B4CF90D6A440`.
Es aceptación reportada por el usuario; el agente no ejecutó estas pruebas en su teléfono.

Habilita la fusión de PR #52 y cierre de #10, completando Sprint 2.
Los párrafos históricos que indicaban aceptación pendiente describen el estado de entrega,
no el estado actual. La siguiente historia activa es #12 (Sprint 3), pagos recurrentes.
No se considera implementada ni aceptada por iniciar su trabajo.

Integración pendiente: CI del 06/11/2026 detectó siete parches Expo recomendados nuevos.
PR #52 no está fusionado y #10 no está cerrada en GitHub. La aceptación funcional se
conserva, pero antes de integrar se debe resolver el mantenimiento con compilación y
regresión Android. No desactivar el control de compatibilidad para forzar CI verde.

UX/UI: mantener Resumen gráfico y Análisis separado; Registrar gasto visible. Plan solo
se incorpora cuando presupuestos y recurrencias estén operativos. Mostrar próximos pagos,
pendientes y pausados, con importe, cuenta y fecha claros. Confirmar requiere revisión;
editar/omitir/pausar son acciones explícitas. No presentar proyecciones como saldos reales.
