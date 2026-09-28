---
name: lavautos-next-react
description: Implementar o refactorizar pantallas, componentes y rutas de Lavautos con Next.js App Router, React y TypeScript. Usar para formularios, accesibilidad, recibos y limites cliente-servidor de este proyecto.
---

# Desarrollo Next y React de Lavautos

Leer [convenciones](../../../docs/DEVELOPMENT.md) y, si cambia el flujo,
[arquitectura](../../../docs/ARCHITECTURE.md). Resolver estas rutas desde esta skill.

1. Identificar ruta, componente y responsabilidad de `use-workspace.ts` afectados.
   Consultar la guia pertinente en `node_modules/next/dist/docs` desde la raiz
   antes de escribir codigo Next; verificar APIs de la version instalada.
2. Conservar dominio en `src/lib/domain.ts`, persistencia en `local.ts` y
   transporte en `api.ts`. No introducir logica financiera duplicada en JSX.
3. Mantener Server Components donde corresponda y una frontera cliente para
   interaccion/offline. No importar `server.ts` al cliente ni acceder al navegador
   durante render sin considerar prerenderizado.
4. Reutilizar `ui.tsx` y `globals.css`. Incluir labels, foco, teclado y estados
   vacio/error/carga/offline. Conservar idioma, moneda y zona horaria del proyecto.
5. Derivar estado cuando sea posible; usar effects para sincronizacion externa
   con limpieza y dependencias correctas. Evitar ampliar el hook central si una
   responsabilidad puede extraerse con un contrato pequeno.
6. Elegir validacion segun [calidad](../../../docs/QUALITY.md). En cambios de
   flujo comprobar movil/escritorio, y persistencia tras recarga si aplica.

Entregar comportamiento final, checks ejecutados y limitaciones. No cambiar
librerias, arquitectura de autenticacion ni formato global como efecto lateral.
