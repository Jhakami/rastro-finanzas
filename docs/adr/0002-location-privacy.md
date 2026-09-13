# ADR-0002: ubicación aproximada y efímera

- **Estado:** aceptada
- **Contexto:** un mapa de calor aporta contexto, pero los domicilios y recorridos son sensibles.
- **Decisión:** solicitar solo ubicación aproximada en primer plano, convertirla a una celda de 200 m y descartar el punto original antes de persistir.
- **Consecuencias:** el mapa no identifica con exactitud un comercio; a cambio, no se conserva un historial preciso de desplazamientos.
