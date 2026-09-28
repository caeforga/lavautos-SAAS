import type { Instrumentation } from 'next';
export const onRequestError:Instrumentation.onRequestError=async(error,_request,context)=>{
 const digest=error&&typeof error==='object'&&'digest' in error?String(error.digest):null;
 console.error(JSON.stringify({event:'server_error',time:new Date().toISOString(),route:context.routePath,digest}));
};
