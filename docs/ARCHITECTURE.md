# Arquitectura de Lavautos

Base inspeccionada: 2026-09-28. Arquitectura actual con reglas para su evolución;
este documento no certifica seguridad ni cobertura completa de pruebas.

## Decisión principal

Mantener un monolito modular Next.js App Router con Supabase/PostgreSQL como
autoridad remota y Dexie/IndexedDB como persistencia de trabajo offline.
No introducir microservicios, ORM ni gestor global de estado sin una necesidad
concreta. Separar responsabilidades dentro de la estructura existente antes de
mover carpetas o introducir abstracciones.

## Mapa actual y límites

| Ubicación | Responsabilidad | Regla de dependencia |
| --- | --- | --- |
| `src/app` | Rutas, layouts, metadata, endpoints | Componer UI y servicios; mantener lógica de negocio fuera de rutas |
| `src/components` | Pantallas, formularios, recibos, sincronización | Usar dominio y capa de aplicación; no acceder al cliente admin |
| `src/lib/domain.ts` | Tipos, Zod, importes, fechas, estados | Puro; sin React, red, DOM ni persistencia |
| `src/lib/use-workspace.ts` | Sesión, sede activa, hidratación, acciones | Orquestar dominio, local y API; extraer hooks por responsabilidad al crecer |
| `src/lib/local.ts` | Dexie, folios, cola, mezcla remota | Transacciones locales; transporte inyectado en `flushQueue` |
| `src/lib/api.ts`, `supabase.ts` | Snapshot, RPC, transporte autenticado | Traducir respuestas; no reemplazar autorización SQL |
| `src/lib/server.ts` | Cliente privilegiado y verificación de identidad | Solo servidor; cada endpoint verifica además el permiso de la acción |
| `src/lib/receipt.ts`, `receipt.tsx` | Exportación y presentación de recibos | Usar snapshot histórico y datos mínimos |
| `supabase/migrations` | Esquema, RLS, RPC y transacciones | Autoridad de permisos e integridad remota |
| `public/sw.js`, `scripts/build-sw.mjs` | Shell y assets offline | No cachear API, autenticación ni recibos públicos |

## Flujo de órdenes

1. La UI construye una orden; `orderSchema` valida su contenido.
2. `saveLocalOrder` verifica acceso offline y alcance, guarda orden y operación
   juntas. La versión local avanza y la operación conserva su versión base.
3. `flushQueue` procesa la cola del alcance, ordenada por versión y fecha.
4. `sync_order` aplica autorización, idempotencia y control de versiones en SQL.
5. Un resultado aplicado elimina esa operación confirmada. Conflictos o rechazos
   bloquean la cadena de esa orden y requieren resolución; otras órdenes avanzan.
6. `mergeRemote` incorpora el snapshot sin sobrescribir órdenes con pendientes.

Conservar el ID y payload de una operación durante reintentos de transporte.
La resolución explícita archiva la cadena local antes de retirarla. Verificar
concurrencia entre pestañas y dispositivos al modificar este protocolo.

## Reglas de negocio que deben conservarse

- Alcance local: `userId:tenantId:branchId`. Un cambio de cuenta o sede no debe
  mostrar ni enviar datos del alcance anterior.
- La ventana offline actual es siete días desde validación remota. No renovarla
  por una lectura local, un cambio de reloj o una acción de UI.
- Los servicios tienen responsables cuya participación suma 100 %; pagos deben
  cubrir exactamente el total y requieren caja abierta. Anulación exige motivo.
- Inventario puede quedar negativo por operaciones offline; no agregar rechazo
  automático por stock sin cambiar explícitamente la política de negocio.
- Fecha operacional en Bogotá; timestamps persistidos en ISO. Dinero calculado
  en centavos para totales/comparaciones, manteniendo contratos actuales en pesos.
- Catálogo editable y documento histórico de orden son conceptos diferentes.
- El modo demo usa persistencia local y emula acciones; no prueba RLS ni Auth real.
- Las acciones administrativas actuales requieren red. No extenderles la cola de
  órdenes sin diseñar autorización, idempotencia y conflictos propios.

## Evolución recomendada, todavía no implementada aquí

- Extraer responsabilidades de `use-workspace.ts` y `workspace.tsx` cuando una
  funcionalidad lo justifique; conservar contratos durante refactors.
- Validar respuestas remotas en los límites y reducir conversiones forzadas de
  tipos; generar tipos de base de datos cuando exista un flujo reproducible.
- Incorporar pruebas con Supabase local para Auth, Storage y concurrencia real;
  PGlite no reproduce toda la plataforma.
- Añadir lint/formato con configuración explícita y adopción incremental.

Para decisiones que alteren persistencia, autenticación, permisos o protocolo,
registrar contexto, decisión, alternativas, compatibilidad y validación en un
documento bajo `docs/decisions/` creado cuando exista esa decisión.
