import { describe, expect, it } from 'vitest';
import { authErrorMessage } from '../src/lib/auth-errors';

describe('mensajes de acceso', () => {
  it('explica un fallo de comunicación sin mostrar el error técnico', () => {
    const message = authErrorMessage(new TypeError('Failed to fetch'), 'login', true);
    expect(message).toContain('servicio de acceso');
    expect(message).toContain('Supabase');
    expect(message).not.toMatch(/failed to fetch/i);
  });

  it('distingue la falta de conexión del dispositivo', () => {
    expect(authErrorMessage(new TypeError('Failed to fetch'), 'login', false)).toContain('sin conexión');
  });

  it('explica credenciales incorrectas y exceso de intentos', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' }, 'login', true)).toContain('Correo o contraseña incorrectos');
    expect(authErrorMessage({ status: 429 }, 'login', true)).toContain('demasiados intentos');
  });

  it('da una respuesta específica al recuperar el acceso', () => {
    expect(authErrorMessage(new Error('Unknown error'), 'recovery', true)).toContain('enlace de recuperación');
  });
});
