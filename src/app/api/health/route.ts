export async function GET() { return Response.json({status:'ok',service:'lavautos',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}}); }
