---
name: lavautos-offline-sync
description: Modificar o diagnosticar Dexie, IndexedDB, cola de ordenes, conflictos, reintentos y service worker de Lavautos. Usar cuando un cambio afecta persistencia offline o sincronizacion entre dispositivos.
---

# Persistencia y sincronizacion de Lavautos

Leer el flujo e invariantes de [arquitectura](../../../docs/ARCHITECTURE.md).
Inspeccionar `src/lib/local.ts`, `api.ts`, `use-workspace.ts` y pruebas offline;
para cache inspeccionar tambien `public/sw.js` y `scripts/build-sw.mjs`.

- Seguir una orden desde guardado local hasta confirmacion remota. Identificar
  scope, version local/base, ID de operacion y estados antes de modificarla.
- Guardar orden y operacion en la misma transaccion Dexie. No esperar red dentro
  de esa transaccion. Migrar cambios de esquema mediante una nueva version Dexie
  y preservar datos/operaciones de instalaciones existentes.
- Mantener ID y payload de reintentos de transporte. Un timeout puede ocurrir
  despues del commit remoto; la idempotencia debe impedir cobros o stock duplicados.
- Un conflicto/rechazo bloquea su cadena de orden, no borra pendientes ni impide
  procesar otras ordenes. Conservar evidencia al resolver explicitamente.
- No sobrescribir datos locales pendientes al hidratar. Aislar cuenta/tenant/sede
  en lecturas, escrituras, locks y envios; revisar cambios de cuenta durante awaits.
- No renovar `validatedAt` offline ni borrar datos al cerrar sesion. Verificar
  vencimiento de siete dias, multiples pestanas y recuperacion despues de recarga.
- El service worker cachea shell/assets; excluye API, auth y recibos publicos.
  Modificar el generador, nunca `sw-assets.js` generado. No cachear datos privados
  de nuevos endpoints sin un diseno explicito de alcance y expiracion.

Agregar regresiones observables en `tests/offline.test.ts`; si cambia protocolo
remoto, tambien SQL. Ejecutar build y E2E offline para cambios de service worker
segun [calidad](../../../docs/QUALITY.md). Distinguir prueba demo y backend real.
