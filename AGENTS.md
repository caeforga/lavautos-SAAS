<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Lavautos: instrucciones del proyecto

## Contexto y lectura selectiva

Aplicación de gestión de lavaderos, multiempresa y multisede, con órdenes offline,
caja, inventario, trabajadores y recibos. Interfaz y documentación en español;
identificadores de código en inglés siguiendo los contratos existentes.

- Antes de cambiar límites de módulos o flujos: leer [arquitectura](docs/ARCHITECTURE.md).
- Para implementar: consultar [convenciones](docs/DEVELOPMENT.md).
- Para validar y entregar: consultar [calidad](docs/QUALITY.md).
- Skills locales en `.agents/skills`: `lavautos-next-react`,
  `lavautos-offline-sync` y `lavautos-supabase`. Cargar solo las pertinentes.
- `CLAUDE.md` importa este archivo; mantener una sola fuente de instrucciones.

## Reglas esenciales

1. Mantener TypeScript estricto, App Router, pnpm y las librerías existentes.
   Consultar versiones resueltas en el lockfile y documentación de Next instalada.
2. Separar dominio puro, persistencia local, transporte, UI y servidor privilegiado.
   Las páginas orquestan; no duplicar cálculos de negocio en componentes.
3. Toda orden offline se guarda junto con su operación en una transacción Dexie.
   Conservar pendientes al salir, perder red o vencer acceso; nunca borrarlos para
   resolver un error de sincronización.
4. Conservar aislamiento por usuario, tenant y sede. Los permisos de UI no
   sustituyen RLS ni autorización de RPC y endpoints.
5. Mantener secretos exclusivamente en servidor. No importar `lib/server.ts`
   desde módulos cliente; no registrar tokens, secretos ni documentos de clientes.
6. Cambiar esquemas SQL mediante nuevas migraciones; mantener compatibilidad con
   operaciones almacenadas por clientes antiguos. No aplicar migraciones remotas
   como parte implícita de una edición local.
7. Reutilizar `cents`, `total`, `cop`, `day` y esquemas Zod. Mantener COP,
   `es-CO` y `America/Bogota`; no recalcular precios históricos desde el catálogo.
8. Agregar pruebas de comportamiento proporcionales al cambio. Informar qué se
   ejecutó, qué falló y qué quedó sin verificar; no declarar éxito por inferencia.
9. No editar artefactos generados (`.next`, `next-env.d.ts`, `sw-assets.js`,
   `tsconfig.tsbuildinfo`, resultados de pruebas). Cambiar sus fuentes.
10. Actualizar contexto cuando cambien contratos, comandos o arquitectura.
    Las mejoras propuestas en documentación no equivalen a funciones implementadas.
