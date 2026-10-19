import { describe, expect, it } from 'vitest';
import { workspaceErrorMessage } from '../src/lib/workspace-errors';

describe('errores de actualización del negocio', () => {
  it('identifica una migración faltante sin atribuirla a la conexión', () => {
    const message = workspaceErrorMessage({ code: 'PGRST205', message: 'Could not find the table' }, 'business_customers');
    expect(message).toContain('business_customers');
    expect(message).toContain('revisar la migración');
    expect(message).not.toContain('conexión');
  });

  it('distingue permisos y fallos de red', () => {
    expect(workspaceErrorMessage({ code: '42501' })).toContain('permiso');
    expect(workspaceErrorMessage({ message: 'TypeError: Failed to fetch' })).toContain('conexión');
  });

  it('incluye el código desconocido para facilitar el diagnóstico y conserva errores locales', () => {
    expect(workspaceErrorMessage({ code: 'PGRST116' })).toContain('PGRST116');
    expect(workspaceErrorMessage(new Error('La cuenta cambió'))).toBe('La cuenta cambió');
  });
});
