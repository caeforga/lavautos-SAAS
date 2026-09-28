---
name: lavautos-supabase
description: Evolucionar migraciones PostgreSQL, RLS, RPC, permisos y endpoints privilegiados de Lavautos. Usar para cambios de datos multiempresa, caja, inventario o autorizacion con Supabase.
---

# Datos y permisos Supabase de Lavautos

Leer [arquitectura](../../../docs/ARCHITECTURE.md) y la seccion Supabase de
[convenciones](../../../docs/DEVELOPMENT.md). Inspeccionar migraciones existentes,
caller TypeScript y `tests/database.test.ts` antes de cambiar el contrato.

1. Identificar actores (anonimo, cashier, manager, owner, platform admin), tenant,
   sede y relaciones afectadas. Precisar operaciones permitidas y denegadas
   consultando SQL; no inferir permisos solo por botones visibles.
2. Crear una migracion incremental. Conservar compatibilidad con documentos y
   operaciones offline antiguos; coordinar Zod, tipos, RPC y demo si cambian.
3. Revisar RLS, grants, `USING`/`WITH CHECK` y relaciones entre empresas/sedes.
   En `SECURITY DEFINER`, fijar search_path y calificar objetos. Revisar grants
   de ejecucion y validar identidad/rol en cada operacion privilegiada.
4. Mantener caja, orden, inventario e idempotencia en transacciones. Probar
   reintentos, versiones antiguas y rollback; conservar auditoria de conflictos.
5. En endpoints service role verificar identidad y permiso de la accion:
   RLS no protege automaticamente esas consultas. Mantener `server-only`, validar
   entradas y evitar secretos o datos personales en logs y respuestas de error.
6. Agregar casos permitidos y denegados al harness PGlite e incluir la nueva
   migracion: el harness actual enumera archivos explicitamente. No atribuirle
   cobertura real de Auth/Storage o carreras entre conexiones independientes.

Usar [calidad](../../../docs/QUALITY.md) para checks. Si la tarea requiere validar
Auth/Storage o concurrencia real, usar entorno Supabase de pruebas autorizado.
La edicion local no implica aplicar migraciones ni modificar produccion.
