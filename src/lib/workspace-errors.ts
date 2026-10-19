type RemoteError = { code?: unknown; message?: unknown; name?: unknown; status?: unknown };

export function workspaceErrorMessage(error: unknown, table?: string): string {
  const details: RemoteError = error && typeof error === 'object' ? error : {};
  const code = typeof details.code === 'string' ? details.code : '';
  const message = typeof details.message === 'string' ? details.message : '';
  const name = typeof details.name === 'string' ? details.name : '';
  const status = typeof details.status === 'number' ? details.status : 0;

  if (code === 'PGRST205') {
    return `Supabase no encuentra ${table ? `la tabla ${table}` : 'una tabla necesaria'}. El administrador debe revisar la migración y la disponibilidad del esquema en la API. Las operaciones guardadas en este dispositivo se conservan.`;
  }
  if (code === '42501' || status === 401 || status === 403) {
    return 'No tienes permiso para consultar los datos del negocio. Vuelve a ingresar o pide al administrador que revise tu acceso.';
  }
  if (name === 'AuthRetryableFetchError' || /failed to fetch|fetch failed|network(?:error| request failed)|load failed|timed? out/i.test(message)) {
    return 'No se pudo comunicar con Supabase. Comprueba la conexión e inténtalo de nuevo; las operaciones pendientes siguen guardadas.';
  }
  if (error instanceof Error) return error.message;
  if (code) return `Supabase rechazó la actualización (código ${code}). Avisa al administrador; las operaciones pendientes siguen guardadas.`;
  return 'No se pudo actualizar el negocio. Inténtalo de nuevo; las operaciones pendientes siguen guardadas.';
}
