# Convenciones de desarrollo

## Herramientas y versiones

`package.json` declara Node >=22 y pnpm 11.19.0. CI usa Node 22. Hay Next 16
(instalado 16.3.6 al inspeccionar), React 19, TypeScript 5, Zod 4, Dexie 4,
Supabase JS 2, jsPDF 3, Lucide, Vitest, PGlite y Playwright. Los rangos no son
versiones exactas: consultar `pnpm-lock.yaml` y el paquete instalado al trabajar.
Usar pnpm; instalación reproducible con `pnpm install --frozen-lockfile`.
No mezclar lockfiles. Leer `.env.example` para nombres de variables, nunca
copiar secretos reales a documentación, logs o código.

## TypeScript y Zod

- Mantener `strict`; preferir `unknown` y validación en límites frente a `any`
  o doble cast. Inferir tipos de esquemas Zod cuando modelan el mismo contrato.
- Modelar estados y acciones con uniones discriminadas cuando se modifiquen
  contratos abiertos; conservar compatibilidad de nombres RPC existentes.
- Usar `import type`, alias `@/` cuando ayude y nombres descriptivos. Preservar
  snake_case de los documentos SQL y camelCase de APIs locales existentes.
- Funciones cortas por responsabilidad, retornos explícitos en contratos públicos,
  comentarios para decisiones. Evitar comprimir lógica compleja en una línea.
- Validar UUID, cantidades, importes y relaciones en entradas no confiables.
  Zod en el cliente mejora UX; SQL/servidor valida de nuevo lo que recibe.
- No convertir errores en éxito silencioso. Distinguir fallo de transporte,
  rechazo de negocio y conflicto para conservar la cola correctamente.

## Next.js y React

Antes de escribir código Next, buscar la guía relevante en
`node_modules/next/dist/docs/`. Para límites cliente/servidor comenzar por
`01-app/01-getting-started/05-server-and-client-components.md`.
Para rutas, caché, params o cookies buscar su guía de esta versión; no usar
automáticamente convenciones antiguas. Si no hay documentación instalada,
consultar documentación oficial correspondiente a la versión del lockfile.

- Usar Server Components por defecto y fronteras `'use client'` para interacción,
  hooks y APIs del navegador. El área operativa offline necesita código cliente.
- `'use client'` no elimina prerenderizado: no leer `window`, IndexedDB o
  `navigator` durante render sin considerar SSR e hidratación.
- Mantener módulos privilegiados con `server-only`; no pasar secretos por props.
- Derivar valores durante render; usar effects para sistemas externos y limpiar
  listeners/timers. Evitar dependencias omitidas y closures con estado obsoleto.
- Mutaciones del usuario desde eventos; actualizaciones funcionales para estado
  dependiente del anterior. No mutar objetos/arrays existentes.
- Memoización y carga dinámica según una necesidad medida; jsPDF y otras
  dependencias grandes no deben ampliar el bundle inicial sin necesidad.
- No introducir caché compartida de información privada. Si se añade caché,
  especificar alcance, invalidación y relación con logout/cambio de sede.

## UI, CSS y recibos

Reutilizar `src/components/ui.tsx` y estilos de `src/app/globals.css`. El proyecto
usa Tailwind CSS 4 y DaisyUI 5 con el tema `brillo` en `globals.css`, procesado
por `postcss.config.mjs`. Las clases DaisyUI llevan el prefijo `d-` para
evitar colisiones con las clases históricas como `modal`, `badge` y `input`.
Adoptar los componentes de forma gradual y conservar CSS propio para las
pantallas y recibos específicos del negocio.
Para campos de fecha, reutilizar `DatePicker` de `src/components/ui.tsx`: usa
React DayPicker con el estilo de calendario DaisyUI y entrega fechas ISO
`YYYY-MM-DD` en la zona operativa de Bogotá.
Mantener textos en español, formato COP y vocabulario consistente de sede/caja/orden.
Usar elementos semánticos, labels, nombres accesibles para iconos, foco visible,
navegación por teclado y estados de carga/error/vacío/offline perceptibles sin color.
Al cambiar diálogos, verificar foco inicial, retorno de foco y cierre por teclado.
Verificar escritorio y móvil, tablas sin desbordamientos y recibos imprimibles.
Mantener protección contra fórmulas en CSV y minimizar datos de recibos públicos.

## Supabase y SQL

- Nuevas migraciones ordenadas por timestamp; no reescribir migraciones aplicadas.
- RLS y grants mínimos en tablas expuestas. Revisar `USING` y `WITH CHECK` según
  operación; probar usuario anónimo, autorizado y de otra empresa/sede.
- RPC valida identidad, rol, tenant, sede y relaciones. Una clave service role
  puede saltar RLS: el endpoint privilegiado necesita autorización explícita.
- En funciones `SECURITY DEFINER`, fijar `search_path`, calificar objetos y revisar
  grants de ejecución; no aceptar identificadores del cliente como autorización.
- Operaciones financieras e inventario dentro de transacciones; conservar
  idempotencia, auditoría y control de concurrencia. Indexar según filtros y planes.
- Evolucionar SQL, Zod, tipos, demo y tests juntos cuando cambie un contrato.

## Documentación de referencia

Consultar solo la fuente necesaria y verificar compatibilidad con la versión local:

- [Next.js App Router](https://nextjs.org/docs/app), con prioridad a guías instaladas.
- [React: efectos](https://react.dev/learn/you-might-not-need-an-effect).
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html).
- [Zod](https://zod.dev/), [Dexie](https://dexie.org/docs/).
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/best-practices).
- [Skills de Codex](https://learn.chatgpt.com/docs/build-skills): las de este proyecto
  están en `.agents/skills`, tienen alcance local y se seleccionan por descripción.
