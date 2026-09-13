# ADR-0001: SQLite cifrada como fuente de verdad

- **Estado:** aceptada
- **Contexto:** la aplicación es personal, debe funcionar sin red y no necesita sincronización inicial.
- **Decisión:** usar Expo SQLite con SQLCipher, clave aleatoria en SecureStore y repositorio desacoplado.
- **Consecuencias:** cero costo operativo y registro inmediato; requiere APK nativo y una estrategia explícita de respaldo. Un backend futuro implementará sincronización sin sustituir la base local.
