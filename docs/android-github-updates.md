# Actualizaciones del APK desde GitHub

La app consulta la última publicación de GitHub Releases del repositorio `Daberoma/Proyecto_Papachito` desde **Ajustes → Actualización**.

## Cómo publicar una versión

1. Cambiar `mobile/app.json`:
   - `expo.version`: subir la versión semántica, por ejemplo `0.1.2`.
   - `expo.android.versionCode`: subir el número, por ejemplo `3`.
2. Generar un APK firmado con la misma clave de la app instalada.
3. Crear un GitHub Release con una etiqueta semántica, por ejemplo `v0.1.2`.
4. Adjuntar al Release un archivo terminado en `.apk`.
5. Publicar el Release, no dejarlo como borrador o prerelease.

El botón de la app consulta el Release más reciente, compara la etiqueta con la versión instalada y descarga el primer APK publicado. Después abre el instalador nativo de Android.

## Qué conserva la instalación

Instalar encima de `com.papachito.mobile` conserva AsyncStorage, incluyendo catálogo local, nombre del vendedor, configuración y ventas pendientes. No se debe desinstalar la versión anterior.

El APK nuevo debe conservar el mismo paquete y estar firmado con la misma clave. Si cambia la firma, Android no permitirá actualizar encima y desinstalar provocaría pérdida de datos locales.

## Requisitos y límites

- El repositorio debe ser público para que el APK consulte Releases sin exponer un token de GitHub dentro de la app.
- Android puede pedir activar **Permitir desde esta fuente** y siempre puede solicitar confirmación del instalador.
- Esta estrategia reemplaza todo el APK: lógica, diseño, dependencias y código nativo.
- Cada actualización descarga el APK completo; no es una actualización diferencial.
- Cambios nativos también requieren incrementar `versionCode` y generar un APK nuevo.

La configuración de `REQUEST_INSTALL_PACKAGES` está en `mobile/app.json`; sus efectos aparecen al construir el APK, no en Expo Go.
