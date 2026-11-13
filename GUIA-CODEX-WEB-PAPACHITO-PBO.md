# Codex Web desde el celular para Papachito y PBO

**Guía rápida — revisada el 13-11-2026.** Sirve para trabajar sobre el código desde Codex Web/móvil y entender cómo llevar los cambios a `www.system.dondepapachito.com`. No contiene ni debe recibir contraseñas, claves SSH, tokens de Cloudflare, archivos `.env`, bases de datos ni datos de clientes.

## Qué puede y qué no puede hacer Codex Web

- Codex Cloud ejecuta tareas en un entorno remoto aislado y puede continuarlas desde web o móvil después de crear y publicar el entorno en web o escritorio.
- El entorno ve el repositorio y la rama que conectes en GitHub. **No ve automáticamente** los archivos sin confirmar de tu laptop, el PostgreSQL local, el alias `ssh pbo`, Tailscale ni tu sesión de Cloudflare.
- Subir un `.md` solo le da instrucciones. Un ZIP de código puede servir como material de referencia, pero **no conecta PBO ni publica por sí solo**.
- El dominio `system.dondepapachito.com` apunta a la aplicación servida desde PBO según la ficha local; un cambio en GitHub no se publica hasta que el flujo de despliegue lo promueva y se verifique.

## Importante: estado conocido del código

El checkout documentado como proyecto Papachito es `C:\Datos\Trabajo\Donde papachito\Proyecto_Papachito`, repositorio `Daberoma/Proyecto_Papachito`. Hay también un checkout de trabajo más reciente observado en `C:\Datos\Trabajo\Papachito-owner-ux-20261109`, detenido en `77ed0b1` y con numerosos cambios sin confirmar. Ese checkout **no es lo mismo** que GitHub ni que el release activo. No asumas que Codex Web tendrá las modificaciones recientes de la laptop. Antes de basar trabajo en ellas, deben revisarse y llevarse a una rama de trabajo de forma deliberada.

## Configuración inicial de Codex Web

Haz estos pasos cuando tengas Codex Web abierto; la interfaz puede cambiar de nombre ligeramente:

1. Inicia sesión en Codex Web con tu cuenta de ChatGPT.
2. En **Settings / Ajustes → GitHub** (o la sección de conexiones), conecta GitHub y autoriza solo la cuenta u organización que contiene `Daberoma/Proyecto_Papachito`. Si ofrece selección de repositorios, concede acceso únicamente a ese repo.
3. Crea un **Cloud environment / Entorno en la nube** para ese repositorio. Selecciona el repo y la rama que vas a usar. Para cambios nuevos, usa una rama de trabajo; no ordenes modificar directamente `main`.
4. Define comandos de preparación mínimos conforme al proyecto. El repo tiene backend Node y frontend móvil/web; verifica sus `package.json` y lockfiles antes de fijar comandos. No añadas secretos para compilar o probar código que no los necesita.
5. Ejecuta la preparación, publica el entorno y abre una tarea de prueba inocua, por ejemplo: “Lee el índice del repo y dime la rama, commit y comandos de pruebas; no edites ni publiques”.
6. Desde el celular abre Codex Web, selecciona ese entorno y continúa la tarea. Cada tarea nueva puede iniciar en un workspace separado: vuelve a la tarea original para continuar su estado y guarda cambios importantes en Git.

## Cómo llevar los cambios que hoy están solo en la laptop

La vía recomendada es desde la laptop, cuando vuelva a estar disponible:

1. Abrir el checkout indicado arriba y revisar `git status` y `git diff`.
2. Preservar todos los cambios existentes. Separar solo los archivos que forman la mejora que se quiere llevar a la nube; no incluir cambios ajenos.
3. Revisar que no haya `.env`, contraseñas, tokens, claves, dumps, datos privados ni archivos generados sensibles.
4. Crear una rama específica, guardar únicamente el cambio revisado y subir esa rama a GitHub. No sobrescribir `main` ni hacer push forzado.
5. En Codex Web, elegir esa rama y pedir revisión del diff y pruebas. Integrar mediante PR después de revisar.

Si solo tienes el celular ahora, puedes adjuntar un ZIP de **código no sensible** a una tarea como referencia, pero Codex no podrá tratarlo como la historia Git canónica ni acceder al servidor. No subas la carpeta entera a ciegas: primero deben excluirse secretos, bases de datos, respaldos, dependencias y archivos personales. Para publicación trazable, el cambio debe quedar en una rama/commit de GitHub.

## Flujo para cambiar el sitio y publicarlo

1. En Codex Web, pedir cambios en rama y limitar el alcance a la página pública o a la app, según corresponda.
2. Revisar archivos modificados, pruebas, build, rutas y comportamiento en móvil. Pedir que no toque datos de producción ni secretos.
3. Crear/actualizar un PR y revisar el diff. Asegurar que el artefacto se construye desde el commit exacto.
4. **Publicar depende del origen del dominio:** la landing pública y la app bajo `system.dondepapachito.com` pueden usar rutas de despliegue distintas. Verificar el workflow/hosting real de cada hostname antes de configurar CI. No asumir que un deploy de Cloudflare publica también la app que corre en PBO.
5. Configurar el deploy mediante un workflow restringido (por ejemplo, GitHub Actions con aprobación manual y credencial de mínimo privilegio, o el pipeline del hosting que realmente atiende ese hostname). La credencial se guarda en el almacén de secretos del proveedor, nunca en el repo, prompt o ZIP.
6. Publicar primero a staging/preview. Verificar login, catálogo y operaciones autorizadas allí. Luego aprobar promoción a producción.
7. Después del despliegue, comprobar el release activo, logs, TLS/hostnames, endpoint de salud apropiado y la versión/hash servidos. Mantener el release anterior disponible para rollback.

**No pegues en Codex Cloud una clave SSH privada, contraseña de PBO, token global de Cloudflare ni credenciales de la base.** Si se habilita integración, debe ser una credencial dedicada, revocable y limitada a una acción/repo; preferiblemente el pipeline despliega sin dar shell general al agente.

## Prompt listo para pegar en Codex Web

```text
Trabaja únicamente en el repositorio Papachito conectado a este entorno. Primero informa repo, rama, commit y estado del árbol. Revisa AGENTS.md y docs/INDEX.md. No asumas que este checkout contiene cambios locales de mi laptop.

Quiero modificar [describe aquí el cambio]. Trabaja en una rama aislada, conserva cambios preexistentes, no alteres producción, DNS, Cloudflare, PBO, bases de datos ni secretos. No hagas despliegue. Ejecuta las pruebas pertinentes, revisa el diff y dime qué commit/PR quedó listo y qué falta para una publicación manual segura.
```

## Si el objetivo es que `system.dondepapachito.com` cambie hoy

Necesitas que se cumplan **las tres** condiciones: (1) el código deseado está accesible en GitHub o incorporado de forma segura a una rama; (2) existe un pipeline/operador de despliegue configurado para el origen real de `system.dondepapachito.com`; (3) el release exacto pasa QA y una persona aprueba su promoción. Codex Web por sí solo no hereda tu laptop o `ssh pbo`, y el ZIP/MD no reemplaza esas condiciones.

## Referencias

- [Usar Codex Cloud — OpenAI Help](https://help.openai.com/en/articles/20001545-using-codex-cloud)
- [Entornos de Codex Cloud — OpenAI](https://developers.openai.com/codex/environments/cloud-environments)

