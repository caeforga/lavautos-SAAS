# Brillo · MVP para lavaderos

Web instalable construida con Next.js 16, React, TypeScript y Supabase. Incluye administración por cliente y sede, órdenes, reparto de productividad, caja, inventario, gastos, reportes, boletas y una cola local para trabajar sin conexión.

## Ejecutar

Requisitos: Node.js 22 o superior y pnpm 11.19.0.

```sh
pnpm install
pnpm dev
```

Abrir `http://localhost:3000`. Sin configuración de Supabase, la pantalla de acceso ofrece **Explorar demostración**. Sus datos se guardan exclusivamente en el navegador y nunca se envían a Supabase. La marca de trabajo es **Brillo**; los datos del ticket se personalizan por sede.

Para validar instalación y funcionamiento sin conexión, usar la compilación de producción. El servidor de desarrollo depende de su conexión de recarga en caliente.

```sh
pnpm build
pnpm start
```

El comando de construcción también prepara todos los archivos estáticos de la PWA y el servidor independiente. Usar HTTPS en producción; localhost permite las pruebas locales. En Windows, mantener Turbopack: Webpack no admite el carácter `!` de la ruta actual del proyecto.

## Conectar Supabase

1. Crear proyectos **separados** para pruebas y producción, con PostgreSQL 17.
2. Copiar `.env.example` a `.env.local` y configurar la URL, clave publicable y clave `service_role`. Esta última solo se utiliza en el servidor. No se necesita la conexión SQL para iniciar la web; `DATABASE_URL` se utiliza exclusivamente para respaldos.
3. Aplicar, en orden, los archivos de `supabase/migrations` desde el editor SQL de Supabase o con la CLI:

   ```sh
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```

4. En Authentication: desactivar el registro público; configurar la URL de la aplicación, el retorno `/auth/callback` y un proveedor SMTP para invitaciones y recuperación. Usar valores separados por ambiente.
5. Crear tu primer usuario en Authentication. Habilitarlo como administrador de plataforma desde SQL, reemplazando el correo:

   ```sql
   insert into public.platform_admins(user_id)
   select id from auth.users where email = 'TU_CORREO'
   on conflict do nothing;
   ```

6. Ingresar y abrir **Plataforma → Nuevo cliente**. La aplicación invita al dueño y crea el cliente, primera sede y membresía. El dueño define su contraseña desde el correo recibido.
7. Como dueño: personalizar sede, cargar logo, agregar trabajadores y catálogo, abrir caja y crear la primera orden.

Si la invitación ya existe o el correo corresponde a una cuenta previa, no se crea un usuario duplicado. Un administrador puede completar la asociación de ese usuario mediante `provision_tenant(nombre, sede, UUID_USUARIO)` desde el editor SQL. Si falla la creación después de invitar, el usuario queda sin acceso a datos hasta completar esa asociación.

Las migraciones crean tablas, RPC, políticas RLS y el bucket privado `business-assets`. **No desactivar RLS ni exponer `service_role` en el navegador.** No se han aplicado a ningún proyecto remoto desde esta carpeta.

## Funcionamiento implementado

- Dueño con todas sus sedes; administrador y cajero restringidos a la sede asignada. Lavadores sin acceso de usuario.
- Catálogo por sede y tipo de vehículo. Precios e identidad del ticket se guardan con la orden.
- Varios servicios y responsables, porcentajes que suman 100 %, seguimiento por servicio y pago independiente del estado.
- Cobro completo dividido entre efectivo, transferencia y datáfono; registro manual, sin procesar dinero.
- Apertura y cierre de caja por usuario y dispositivo. Gastos en efectivo descontados del cierre; ajustes de órdenes pagadas solo por administradores con motivo y caja abierta.
- Inventario con movimientos de entrada, consumo y desperdicio. Las ventas lo descuentan transaccionalmente. Una venta offline puede dejar existencias negativas y se marca visualmente.
- Ventas por fecha de creación; cobros por fecha del pago; gastos por fecha de registro. Zona horaria de Colombia. Filtros de trabajador/servicio seleccionan órdenes completas. El reporte no representa contabilidad formal ni utilidad.
- Productividad de servicios terminados no anulados, con cantidad y valor ponderados. Exportaciones CSV protegidas contra fórmulas.
- Boletas de 58/80 mm, PDF local, enlace revocable y compartir manualmente por WhatsApp. La vista pública excluye teléfono personal e identificadores internos.
- Alta y suscripciones manuales. La fecha de suscripción es informativa; el estado activo/suspendido controla el acceso.

## Operación sin internet

Preparar cada dispositivo mientras está conectado e iniciar sesión. El acceso local dura siete días desde la última validación completa. La aplicación solicita almacenamiento persistente al navegador, cuya concesión depende del dispositivo.

Cada escritura local guarda orden y operación pendiente dentro de una misma transacción IndexedDB. Una operación conserva su UUID y contenido durante los reintentos. El servidor compara versiones y aplica orden, inventario y auditoría en una única transacción PostgreSQL. No se utiliza Realtime como sustituto de la sincronización.

La sincronización ocurre al iniciar, volver a la aplicación, recuperar conectividad, guardar y cada 30 segundos mientras está abierta. También hay un botón manual. No se promete sincronización con la aplicación cerrada.

Abrir la caja requiere conexión; una caja previamente abierta admite cobros offline. Catálogo, gastos, ajustes y cierres requieren internet. Un cierre no acepta posteriormente pagos retrasados: quedan pendientes de conciliación. Un administrador puede conservar el servidor o aplicar una propuesta revisada; las operaciones locales posteriores de esa orden se archivan para revisión, no se sobrescriben silenciosamente.

Cerrar sesión mantiene los pendientes separados por usuario pero retira el acceso offline. Las revocaciones se verifican al reconectar; un equipo desconectado puede capturar durante el periodo local, sin que eso autorice la aceptación posterior de sus operaciones. Borrar datos del navegador o perder el dispositivo puede perder cambios aún no enviados.

## Pruebas

```sh
pnpm typecheck
pnpm test
pnpm build
# PowerShell; en bash usar export PLAYWRIGHT_BROWSERS_PATH=.cache/playwright
$env:PLAYWRIGHT_BROWSERS_PATH = '.cache/playwright'
pnpm exec playwright install chrome webkit
pnpm test:e2e
```

Las pruebas de SQL ejecutan las migraciones en PostgreSQL mediante PGlite, con sustitutos locales mínimos de Auth y Storage. Cubren RLS, funciones transaccionales, reintentos, conflictos, caja, inventario y permisos. **No reemplazan la integración con Supabase remoto.**

Los escenarios de navegador usan Chrome de escritorio, emulación de Android y WebKit con perfil iPhone. Verifican orden, cobro dividido, PDF, equipo, inventario, CSV y recarga offline. Es necesario probar impresoras físicas de 58/80 mm y Safari en un iPhone real durante el piloto.

## Operación y despliegue

`Dockerfile` y `compose.yaml` preparan un servidor independiente con reinicio automático. Ejecutar `docker compose --env-file .env.local up --build -d` detrás de un proxy HTTPS. Las variables `NEXT_PUBLIC_*` se fijan al construir; reconstruir al cambiar de proyecto Supabase.

- `/api/health`: estado público del proceso, sin datos del negocio.
- `/api/health/ready`: verifica Supabase; requiere `Authorization: Bearer MONITORING_TOKEN`.
- Errores de servidor: registros estructurados a stdout con ruta y digest; sin cuerpo, notas, contraseñas o tokens.
- `.github/workflows/ci.yml`: compilación, pruebas de dominio/base de datos y navegador.
- `.github/workflows/backup.yml`: respaldo diario cifrado, deshabilitado hasta configurar secretos y `BACKUPS_ENABLED=true`.

Consultar `docs/operations.md` para respaldos, restauración y salida al piloto. No se contrató infraestructura ni se publicó el producto.
