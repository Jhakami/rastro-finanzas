# Política de privacidad de Rastro

**Versión:** 1.0  
**Vigente desde:** 26 de septiembre de 2026  
**Aplicable a:** Rastro `0.1.10`

Rastro es una aplicación personal de finanzas, local-first y actualmente en desarrollo. Esta
política explica qué información procesa la aplicación, dónde se guarda y qué decisiones conserva
la persona usuaria.

## Resumen

- Rastro no exige crear una cuenta y no dispone de un backend propio.
- No vende datos, no muestra publicidad y no integra analítica de uso ni perfiles comerciales.
- Los datos financieros se guardan localmente en una base SQLite cifrada con SQLCipher.
- La ubicación, biometría y exportaciones son opcionales.
- La persona usuaria decide si comparte archivos fuera de la aplicación.

## Datos que procesa la aplicación

Según las funciones utilizadas, Rastro puede procesar:

- cuentas financieras y sus saldos calculados;
- movimientos, montos, fechas, categorías, comercios, notas y origen del ingreso;
- categorías, favoritos, límites, reglas y preferencias;
- eventos de auditoría necesarios para conservar la trazabilidad de cambios;
- celdas geográficas aproximadas y nombres de lugares asignados por la persona usuaria;
- configuración de bloqueo biométrico;
- archivos de exportación o copia generados a petición del usuario.

Rastro no solicita nombre real, correo electrónico, número de teléfono ni una cuenta en línea.

## Almacenamiento y cifrado local

Los movimientos y la configuración se guardan en el almacenamiento privado de la aplicación.
La base de datos utiliza SQLCipher. Su clave se guarda mediante Expo SecureStore y se configura
para estar disponible solo después de desbloquear el dispositivo.

Este diseño reduce la exposición de los datos, pero no puede proteger frente a todos los riesgos,
por ejemplo un dispositivo ya comprometido, una contraseña de pantalla conocida por otra persona
o un archivo exportado a un servicio inseguro.

## Ubicación

La ubicación es opcional y se activa de forma individual al registrar un movimiento.

- Android puede conceder ubicación precisa o aproximada mientras Rastro está en uso.
- Rastro no solicita ni utiliza ubicación en segundo plano.
- Si recibe una coordenada precisa, la transforma inmediatamente en una celda aproximada de 50 m.
- Solo persiste el identificador y el centro aproximado de la celda; no guarda la coordenada GPS
  original.
- Rechazar el permiso o continuar sin zona no impide registrar movimientos financieros.

La precisión observada puede variar por el dispositivo, los edificios, el GPS y la configuración
de Android.

## Mapas y conexión a internet

El historial financiero y los agregados de compras se calculan en el dispositivo. Cuando se abre
el mapa con conexión, MapLibre solicita a OpenFreeMap las teselas necesarias para dibujar el área
visible. El proveedor puede recibir datos técnicos habituales de una conexión web, como la
dirección IP y las teselas solicitadas, pero Rastro no le envía montos, categorías ni el historial
de movimientos.

La vista alternativa en lista permite consultar las zonas guardadas aunque el mapa base no esté
disponible.

## Biometría

Si se activa el bloqueo biométrico, la verificación la realiza el sistema operativo. Rastro solo
recibe el resultado de la autenticación y no accede a huellas, rasgos faciales ni plantillas
biométricas. Esta opción puede desactivarse desde los ajustes de la aplicación.

## Exportaciones y copias

- El CSV se genera solo cuando la persona usuaria lo solicita.
- Las zonas aproximadas se excluyen por defecto y requieren confirmación explícita para incluirlas.
- La copia `.finbackup` actual contiene la base de datos y su clave, protegidas juntas mediante
  AES-256-GCM con una clave derivada de la contraseña elegida por la persona usuaria.
- Rastro no recibe ni recupera esa contraseña. Perderla puede volver inutilizable la copia.
- Al compartir un CSV o una copia mediante otra aplicación, el tratamiento posterior depende de
  esa aplicación o servicio y deja de estar bajo el control de Rastro.

La restauración guiada y la incorporación de futuros comprobantes a una copia completa todavía
forman parte del backlog.

## Permisos del dispositivo

Rastro puede solicitar permisos para:

- **ubicación en primer plano**, al guardar voluntariamente una zona;
- **biometría**, para desbloquear la aplicación;
- **notificaciones**, para funciones que las necesiten cuando sean implementadas;
- **fotos**, para comprobantes opcionales cuando esa función esté disponible.

La aplicación bloquea expresamente el permiso de ubicación en segundo plano y el acceso al
micrófono. Denegar permisos opcionales no debe impedir el registro financiero básico.

## Conservación y eliminación

Los datos permanecen en el dispositivo mientras la aplicación conserve su almacenamiento. El
borrado normal de un movimiento es lógico: deja de participar en saldos y análisis, pero se conserva
para auditoría y posible recuperación. Este comportamiento se muestra en la interfaz antes de
eliminar.

Para borrar todos los datos locales se puede usar la opción de Android para eliminar el
almacenamiento de Rastro o desinstalar la aplicación. Esta acción no elimina los CSV o copias que la
persona usuaria haya guardado o enviado a otros lugares; esos archivos deben eliminarse por
separado.

## Repositorio público

El código fuente puede publicarse en GitHub, pero las reglas del repositorio excluyen bases de
datos, exportaciones, copias, comprobantes y claves. No deben adjuntarse datos financieros reales,
capturas con información sensible ni archivos `.finbackup` al crear una incidencia.

## Cambios futuros

Si una versión futura incorpora sincronización en la nube, analítica, OCR externo u otro tratamiento
remoto, esta política deberá actualizarse antes de activar la función y se solicitará el consentimiento
que corresponda. La fecha y la versión de la política se actualizarán junto con el cambio.

## Contacto

Las consultas y reportes pueden abrirse en las
[incidencias del repositorio](https://github.com/Jhakami/rastro-finanzas/issues). No incluyas datos
financieros personales, ubicaciones, copias de seguridad ni secretos en una incidencia pública.

Esta política describe el comportamiento técnico actual del proyecto y no sustituye asesoramiento
legal para una futura distribución pública o comercial.
