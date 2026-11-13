# Vincular PBO con GitHub/Codex sin publicar credenciales

**Estado:** diseño seguro; todavía no conecta PBO. Para enlazarlo hace falta instalar y registrar un runner desde la propia consola de PBO. No guardar en GitHub claves privadas SSH, tokens de Tailscale/Cloudflare, contraseñas, `.env` ni tokens de registro.

## Opción recomendada: runner privado de GitHub Actions en PBO

El runner mantiene una conexión saliente hacia GitHub; no requiere abrir SSH entrante a Internet ni dar al agente una llave para iniciar sesión general en el servidor. El runner ejecuta solamente el workflow aprobado del repositorio.

### Requisitos de seguridad antes de instalar

1. El repositorio Papachito debe ser privado. Limita el runner group a ese único repositorio.
2. En GitHub, crea un runner de repositorio Linux y asígnale la etiqueta `pbo-deploy`.
3. Instálalo en PBO con usuario dedicado sin privilegios de administrador, en un directorio separado del código productivo. Sigue los comandos que GitHub genera en **Settings → Actions → Runners → New self-hosted runner**; el token de registro es temporal y se usa solo en consola, nunca se copia a un archivo ni al chat.
4. Configúralo como servicio de sistema con acceso de escritura únicamente a la carpeta de releases de Papachito y lectura del estado necesario para verificar. No lo ejecutes como `root`.
5. Configura un environment llamado `production` con aprobación manual y protección de rama. El workflow debe aceptar solo `workflow_dispatch`, construir desde un commit revisado, copiar artefactos versionados, conservar el release anterior y promover de forma reversible.
6. No ejecutes workflows de pull requests no confiables sobre el runner de PBO. No expongas los secretos del ambiente a pasos controlados por contribuciones externas.

### Workflow de ejemplo (plantilla; no publicar hasta adaptar el script real)

Guardar como `.github/workflows/deploy-papachito-pbo.yml` **solo después** de verificar el procedimiento de release existente en PBO. La plantilla no contiene host, token, contraseña ni comando de producción deliberadamente.

```yaml
name: Deploy Papachito to PBO
on:
  workflow_dispatch:
    inputs:
      commit_sha:
        description: Full reviewed commit SHA to deploy
        required: true
        type: string
permissions:
  contents: read
concurrency:
  group: papachito-production
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.commit_sha }}
      - name: Install, test, and build
        run: |
          # Replace only after validating repository scripts and lockfiles.
          npm ci
          npm test --if-present
          npm run build --if-present
      - uses: actions/upload-artifact@v4
        with:
          name: papachito-${{ inputs.commit_sha }}
          path: |
            mobile/dist/
            backend-node/
          if-no-files-found: error
  promote:
    needs: build
    runs-on: [self-hosted, linux, pbo-deploy]
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: papachito-${{ inputs.commit_sha }}
          path: artifact
      - name: Validate and promote using the server release procedure
        run: |
          # STOP: replace with the reviewed, existing PBO atomic release script.
          # It must verify SHA-256, create a rollback point, promote atomically,
          # restart only the intended service if required, then check health.
          echo "Release script has not been configured" >&2
          exit 1
```

La plantilla falla intencionalmente hasta que se inserte y revise el comando real de promoción. **No convierte el flujo en operativo** por el mero hecho de guardarla en GitHub. El inventario local documenta que `system.dondepapachito.com` sirve Papachito desde PBO, pero no demuestra un pipeline actual apto para este runner.

## Activación desde PBO

- Ejecutar el registro del runner desde la consola de PBO autenticado como el usuario técnico dedicado; generar el token temporal directamente en GitHub y teclearlo en la consola cuando GitHub lo solicite.
- Verificar en GitHub que el runner aparece `Idle/Online`, asociado únicamente al repo correcto.
- Primero probar un workflow inocuo que solo informe hostname, usuario y lectura de la versión activa; no leer variables secretas ni desplegar.
- Probar despliegue únicamente en QA. Activar aprobación de `production` solo después de probar respaldo, promoción y rollback.

Si el objetivo es una sesión SSH interactiva desde Codex Cloud, esta plantilla **no la habilita**. Eso exige una red privada entre Codex Cloud y PBO (por ejemplo Tailscale con ACL limitado) más una identidad SSH dedicada. No subir la clave privada a GitHub; el método y los controles se deben configurar aparte. No se debe abrir el puerto 22 a Internet.

## Resultado y límites

- Esta guía y el workflow son material de configuración, no credenciales ni acceso activo.
- Mientras no se instale el runner o una red privada autenticada, Codex Cloud no puede entrar a PBO.
- La configuración de Cloudflare no es necesaria para una conexión saliente del runner y no debe alterarse para lograrla.
- Antes de habilitar despliegues, completar el comando real de release desde el runbook vigente de PBO y revisar que afecte solo Papachito.
