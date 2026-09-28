# Operación, respaldos y piloto

## Respaldo diario

El flujo de GitHub Actions se habilita con la variable `BACKUPS_ENABLED=true` y el ambiente `production-backup`. Configurar secretos `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `BACKUP_PASSPHRASE` (32 caracteres aleatorios o más). Guardar la frase también fuera del repositorio: perderla impide recuperar los respaldos.

Se ejecuta a las 08:00 UTC (03:00 Colombia). Requiere conexión directa o pooler en modo sesión, y un cliente `pg_dump` compatible con PostgreSQL 17. Exporta esquemas `public`, `auth` y `storage`, descarga objetos de `business-assets` y genera un archivo cifrado AES-256-GCM con hashes SHA-256. Los artefactos cifrados se retienen 30 días. Las copias SQL de Supabase por sí solas no contienen los archivos de Storage.

Ejecución manual, cargando los secretos en el ambiente:

```sh
node scripts/backup.mjs
node scripts/verify-backup.mjs backups/ARCHIVO.brillo-backup
```

La verificación comprueba autenticidad e integridad del archivo, no recuperación funcional. Los logos se suben a rutas inmutables, por lo que una copia de Storage realizada después del dump conserva las versiones referidas; suspender operaciones para una restauración de punto consistente cuando sea necesario. Revisar fallos del flujo desde GitHub y descargar periódicamente una copia cifrada fuera de GitHub.

## Ensayo de restauración

Realizar en un proyecto Supabase de pruebas vacío y nunca sobre producción:

1. Comprobar la integridad y extraer a un directorio nuevo:
   `node scripts/verify-backup.mjs backups/ARCHIVO.brillo-backup backups/ensayo-NUEVO`.
2. Mantener las mismas versiones PostgreSQL/Supabase. Examinar el inventario con `pg_restore --list backups/ensayo-NUEVO/database.dump`.
3. Coordinar la restauración de `auth` y `storage` con el procedimiento de Supabase para ese proyecto. Los objetos internos pueden existir y requerir exclusión del esquema administrado. No ejecutar `--clean` contra producción. La CLI y versiones administradas pueden requerir restaurar esquema público y datos de los esquemas administrados por separado.
4. Restaurar `public`, sus políticas, funciones y datos; revisar todos los errores de permisos y propietarios. Reaplicar los grants de las migraciones cuando la restauración use `--no-privileges`.
5. Reponer cada objeto del manifiesto en `business-assets` con su ruta y MIME originales usando credenciales del proyecto de pruebas. Verificar hashes descargándolos de nuevo.
6. Conectar una compilación de pruebas al proyecto restaurado. Validar autenticación, usuarios, separación de dos clientes, boletas compartidas, inventario, totales de caja y una orden nueva sincronizada.
7. Registrar fecha, archivo utilizado, conteos por tabla y archivo, duración y resultado. Solo después de este ensayo considerar el respaldo funcionalmente recuperable.

No se ha ejecutado un respaldo ni una restauración remota: no se proporcionaron credenciales de Supabase ni existe Docker en ejecución en este entorno. Las migraciones y reglas sí se verifican con PostgreSQL local embebido en las pruebas.

## Lista para el piloto

- Proyecto de pruebas y producción separados; registro público deshabilitado, SMTP y URLs de retorno verificados.
- Claves privilegiadas únicamente en el servidor, token de monitoreo aleatorio y HTTPS activo.
- Crear dos clientes y probar accesos cruzados también mediante las APIs y Storage reales.
- Preparar dos dispositivos, abrir cajas independientes y capturar trabajo sin conexión; volver a conectar en orden inverso.
- Comprobar expiración de sesión y cambios de permisos; revisar conciliación de una operación rechazada y de un conflicto.
- Verificar impresión 58/80 mm con el controlador del equipo real. Desactivar encabezados/pies del navegador y seleccionar el tamaño de papel adecuado.
- Probar descarga y adjunto manual del PDF en WhatsApp, instalación y reapertura en un iPhone físico.
- Probar el respaldo/restauración completo y configurar un monitor externo que consulte `/api/health/ready` sin publicar su token.

La plataforma registra operaciones, no garantiza disponibilidad absoluta ni constituye facturación electrónica, contabilidad formal o pasarela de pagos.
