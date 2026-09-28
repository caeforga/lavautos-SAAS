export async function prepareOffline(){
 if(!('serviceWorker' in navigator))throw new Error('Este navegador no permite preparar el modo sin conexión.');
 await navigator.serviceWorker.register('/sw.js');
 const registration=await navigator.serviceWorker.ready;
 if(!navigator.onLine){document.documentElement.dataset.offlineReady='true';return;}
 const assets=performance.getEntriesByType('resource').map(entry=>entry.name).filter(url=>new URL(url).pathname.startsWith('/_next/static/'));
 await new Promise<void>((resolve,reject)=>{
  const channel=new MessageChannel();const timeout=setTimeout(()=>{channel.port1.close();reject(new Error('No se terminó de preparar el modo sin conexión. Recarga mientras tengas internet.'));},20000);
  channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();if(event.data.ok)resolve();else reject(new Error('No se pudieron guardar los archivos para operar sin conexión.'));};
  registration.active?.postMessage({type:'PREPARE_OFFLINE',assets},[channel.port2]);
 });
 document.documentElement.dataset.offlineReady='true';
 if(navigator.storage?.persist)await navigator.storage.persist().catch(()=>false);
}
