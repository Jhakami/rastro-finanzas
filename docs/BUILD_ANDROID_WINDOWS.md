# Compilación Android en Windows

Para el workspace con tilde en `App_Movil_Gestión`, Prefab/CMake puede recibir una ruta
corrupta. El ajuste opcional `scripts/windows-ascii.gradle` remapea los proyectos Android
y las rutas de React Native a una junction ASCII del **mismo** workspace. Valida el destino
canónico antes de actuar; no copia ni modifica los datos de la aplicación.

## Preparación local

Usar el SDK/NDK configurado por Expo y JDK 21. En este equipo JDK 25 produjo una advertencia
de acceso nativo que interrumpió Prefab; JDK 17 no resolvió correctamente la ruta con tilde.
No cambiar dependencias para resolver estos fallos del entorno.

Desde la raíz del repositorio, crear `C:\RastroBuild` como junction al workspace solo si no
existe. Si existe, comprobar `LinkType` y `Target`; no reemplazar ni borrar una carpeta ajena.
La junction requiere permisos locales adecuados. `android/` debe estar generado y su
`versionName`/`versionCode` deben corresponder a `app.config.ts`.

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:NODE_ENV = 'production'
& C:/RastroBuild/android/gradlew.bat `
  --project-dir C:/RastroBuild/android `
  -I C:/RastroBuild/scripts/windows-ascii.gradle `
  assembleRelease --no-daemon --no-parallel --max-workers=1 `
  '-PreactNativeArchitectures=arm64-v8a' `
  '-Dorg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8'
```

El proyecto generado conserva `android.overridePathCheck=true`. El ajuste es exclusivo de
este entorno Windows; no se aplica a CI Linux ni cambia la arquitectura de Rastro.
No ejecutar `clean` como primer recurso: elimina cachés nativas útiles en equipos pequeños.

## Verificación del artefacto

Solo después de `BUILD SUCCESSFUL`, comprobar con `aapt` el paquete, versión y ABI; con
`apksigner verify --verbose --print-certs`, la firma y su coincidencia con la APK anterior.
Comparar permisos, calcular SHA-256 y copiar el artefacto a `artifacts/` con nombre versionado.
Un `app-release.apk` anterior puede sobrevivir a una compilación fallida: su existencia no
demuestra que se haya generado la versión nueva.

Guardar los resultados reales en `DEVICE_VALIDATION.md`. La firma de desarrollo permite
pruebas de actualización, pero no es una firma privada de publicación. La aceptación Android
requiere instalar encima de la versión anterior, sin desinstalar ni borrar datos.
