# Validación y entrega

## Comandos existentes

Ejecutar desde la raíz; consultar scripts/configuración si cambian.

| Comando | Qué verifica / requisito |
| --- | --- |
| `pnpm typecheck` | TypeScript sin emitir JS |
| `pnpm test` | Dominio, Dexie con fake-indexeddb y SQL con PGlite |
| `pnpm exec vitest run tests/offline.test.ts` | Cola y persistencia local |
| `pnpm exec vitest run tests/database.test.ts` | Migraciones y reglas remotas simuladas |
| `pnpm build` | Build Next y generación de `public/sw-assets.js` |
| `pnpm test:e2e` | Playwright sobre build de producción, Chrome escritorio y móvil |

Playwright arranca `next start`, no construye: ejecutar `pnpm build` antes.
Requiere Chrome disponible; para instalarlo usar
`pnpm exec playwright install chrome` (en CI Linux se usa `--with-deps`).
El puerto 3000 puede reutilizar un servidor fuera de CI: confirmar que sirve
el build correcto antes de atribuir resultados. No detener procesos ajenos.
No existe script lint ni formateador configurado; no reportarlos como ejecutados.

## Matriz por cambio

- Documentación/skills: comprobar rutas, referencias, frontmatter y ausencia de
  placeholders. No exige reconstruir una aplicación cuyo código no cambió.
- Dominio: casos válidos e inválidos de importes, pagos, asignaciones y fechas;
  ejecutar prueba afectada y typecheck.
- Offline: transacción atómica, reintentos idénticos, conflicto que bloquea solo
  su orden, aislamiento de alcance, recarga y conservación de pendientes.
- SQL/permisos: probar acceso permitido y denegado, relaciones entre sedes,
  duplicados y versiones. Incluir nuevas migraciones en el harness: actualmente
  `database.test.ts` enumera explícitamente las dos migraciones iniciales.
- UI: typecheck, build y flujo E2E afectado en ambos proyectos cuando corresponda;
  revisar visualmente accesibilidad, móvil y mensajes de error.
- Service worker: build más E2E offline con recarga; comprobar que auth/API/recibos
  no entran en caché. Un servidor de desarrollo no prueba el build offline.
- Antes de entregar cambios de aplicación amplios: ejecutar los checks de CI
  (`typecheck`, `test`, `build`, `test:e2e`) o documentar impedimentos concretos.

Agregar pruebas que detecten regresiones observables, sin replicar implementación.
Usar fixtures locales; no pruebas destructivas con datos de producción. En E2E,
preferir roles/labels y expectativas con espera automática a sleeps y selectores
frágiles. Los tests demo no certifican seguridad ni sincronización con Supabase real.

## Entorno y operaciones

Docker usa salida standalone. Las variables `NEXT_PUBLIC_*` se incorporan durante
build; secretos de servidor se inyectan en ejecución. Revisar Dockerfile y compose
cuando cambie empaquetado o preparación offline.
Los scripts de backup y su workflow ya existen; validar un archivo cifrado no
equivale a probar restauración. Ensayar restauración en un destino aislado cuando
se modifique ese flujo. No publicar, restaurar ni migrar producción implícitamente.

## Entrega y mantenimiento

Informar comportamiento modificado, archivos principales, comandos/resultados y
limitaciones verificables. Registrar fallos previos separados de regresiones.
No convertir artefactos antiguos en evidencia de una ejecución actual.
Actualizar arquitectura y skills si cambian contratos o procedimientos.
Repositorio Git inicializado por solicitud del usuario; rama principal `main`,
remoto `origin`: `https://github.com/caeforga/lavautos-SAAS.git`.
