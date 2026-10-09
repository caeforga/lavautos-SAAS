# Clientes del negocio y placas

## Contexto

Las órdenes guardaban el nombre y teléfono como texto. Esto permitía imprimir
boletas, pero no reconocer un cliente recurrente ni sus varios vehículos.

## Decisión

Agregar contactos por tenant y vehículos identificados por placa normalizada
única dentro del tenant. Un vehículo puede no tener cliente identificado; un
cliente puede tener varios vehículos. La orden conserva nombre, teléfono y
`customer_id` opcional como datos históricos. Al sincronizar, un trigger en la
transacción de la orden registra la placa y su vínculo, o rechaza una asignación
contradictoria. La lectura del directorio usa RLS por membresía activa; la
edición de perfiles usa una RPC reservada a dueño o administrador de sede.

El snapshot de IndexedDB incorpora contactos y vehículos. Las órdenes locales
pendientes se proyectan para buscar placas tras una recarga sin internet. La
edición independiente del perfil exige conexión y no cambia órdenes emitidas.
La migración inicializa vehículos desde órdenes existentes, tomando la visita
más reciente para vincular un contacto cuando había datos. No fusiona personas
por teléfono porque un número puede ser compartido.

## Compatibilidad y validación

Las operaciones offline antiguas sin `customer_id` siguen aceptadas; el servidor
puede enlazarlas por placa. Las boletas previas conservan sus datos. PGlite prueba
aislamiento, varias placas, conflicto de propietario y permiso de edición; las
pruebas de dominio verifican búsqueda offline y frecuencia. PGlite no sustituye
una prueba de concurrencia real en Supabase.
