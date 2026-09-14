# ADR-0003: Precisión privada de las zonas

- **Estado:** aceptado.
- **Contexto:** la prueba en un POCO X7 Pro con Android 16 confirmó que la captura en primer plano funciona, pero una celda de 200 m puede representar la compra en una calle vecina.
- **Decisión:** usar la ubicación precisa que Android entrega mientras Rastro está visible, transformarla inmediatamente en una celda aproximada de 50 m y descartar la coordenada original antes de persistir. No integrar Google Maps ni solicitar ubicación en segundo plano.
- **Consecuencias:** mejora la utilidad del mapa sin guardar el punto GPS exacto. Las celdas antiguas de 200 m permanecen legibles; las capturas nuevas usan 50 m. La precisión real todavía depende del dispositivo, edificios y permisos de Android.
