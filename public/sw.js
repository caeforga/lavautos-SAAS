importScripts('/sw-assets.js');
const CACHE=`brillo-shell-${self.BRILLO_BUILD||'dev-v2'}`;
const WORKSPACE_ROUTES=new Set(['/','/ordenes','/equipo','/mis-clientes','/catalogo','/caja','/reportes','/configuracion','/sincronizacion','/plataforma','/clientes']);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([...WORKSPACE_ROUTES,'/icon.svg',...(self.BRILLO_ASSETS||[])])));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('brillo-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{
 if(event.data?.type!=='PREPARE_OFFLINE')return;
 const currentAssets=(event.data.assets||[]).filter(value=>{try{const url=new URL(value);return url.origin===self.location.origin&&url.pathname.startsWith('/_next/static/');}catch{return false;}});
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // Each route has its own Next entry chunk; an offline reload needs that chunk too.
  const routeAssets=await Promise.all([...WORKSPACE_ROUTES].map(async route=>{
   const response=await cache.match(route);
   if(!response)throw new Error(`Ruta sin preparar: ${route}`);
   const html=await response.text();
   return [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^\"]+)"/g)].map(match=>match[1]);
  }));
  const assets=[...new Set([...currentAssets,...routeAssets.flat()].map(value=>new URL(value,self.location.origin).href))];
  await cache.addAll(assets);
  event.ports[0]?.postMessage({ok:true});
 })().catch(error=>event.ports[0]?.postMessage({ok:false,reason:error instanceof Error?error.message.slice(0,160):'Fallo de caché'})));
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin) return;
 // Never cache tokens, public receipt snapshots, auth pages or API responses.
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/recibo/')||url.pathname.startsWith('/auth/')) return;
 if(event.request.mode==='navigate'&&WORKSPACE_ROUTES.has(url.pathname)){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(url.pathname,copy));}return response;}).catch(()=>caches.match(url.pathname)));return;
 }
 if(url.pathname.startsWith('/_next/static/')||url.pathname.startsWith('/icon')){
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;})));
 }
});
