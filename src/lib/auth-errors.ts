type AuthAction = 'login' | 'recovery';

type ErrorDetails = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
};

export function authErrorMessage(error: unknown, action: AuthAction, online: boolean): string {
  if (!online) return 'Tu dispositivo está sin conexión. Conéctate a internet e inténtalo de nuevo.';

  const details: ErrorDetails = error && typeof error === 'object' ? error : {};
  const code = typeof details.code === 'string' ? details.code : '';
  const message = typeof details.message === 'string' ? details.message : '';
  const name = typeof details.name === 'string' ? details.name : '';
  const status = typeof details.status === 'number' ? details.status : 0;

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.';
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return 'Debes confirmar tu correo antes de ingresar. Revisa el mensaje que recibiste.';
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Se hicieron demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  }
  if (
    name === 'AuthRetryableFetchError' ||
    code === 'request_timeout' ||
    /failed to fetch|fetch failed|network(?:error| request failed)|load failed|timed? out/i.test(message)
  ) {
    return 'No pudimos comunicarnos con el servicio de acceso. Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, avisa al administrador para que revise la configuración de Supabase.';
  }
  if (status >= 500) {
    return 'El servicio de acceso no está disponible en este momento. Inténtalo más tarde o avisa al administrador.';
  }

  return action === 'login'
    ? 'No pudimos iniciar sesión. Inténtalo de nuevo; si el problema continúa, avisa al administrador.'
    : 'No pudimos enviar el enlace de recuperación. Inténtalo de nuevo más tarde.';
}
