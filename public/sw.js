importScripts('/sw-assets.js');
const CACHE=`brillo-shell-${self.BRILLO_BUILD||'dev-v2'}`;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/','/icon.svg',...(self.BRILLO_ASSETS||[])])));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('brillo-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{
 if(event.data?.type!=='PREPARE_OFFLINE')return;
 const assets=(event.data.assets||[]).filter(value=>{try{const url=new URL(value);return url.origin===self.location.origin&&url.pathname.startsWith('/_next/static/');}catch{return false;}});
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(assets)).then(()=>event.ports[0]?.postMessage({ok:true})).catch(()=>event.ports[0]?.postMessage({ok:false})));
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin) return;
 // Never cache tokens, public receipt snapshots, auth pages or API responses.
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/recibo/')||url.pathname.startsWith('/auth/')) return;
 if(event.request.mode==='navigate'&&url.pathname==='/'){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put('/',copy));}return response;}).catch(()=>caches.match('/')));return;
 }
 if(url.pathname.startsWith('/_next/static/')||url.pathname.startsWith('/icon')){
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;})));
 }
});
