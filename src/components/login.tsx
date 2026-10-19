'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Droplets, ShieldCheck, WifiOff } from 'lucide-react';
import { configured, supabase } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth-errors';

type LoginMessage = { kind: 'error' | 'success'; text: string };

export function Login({ onLogin, onDemo, externalMessage }: { onLogin: () => Promise<void>; onDemo: () => Promise<void>; externalMessage?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<LoginMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const hasSupabase = configured();

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      await onLogin();
    } catch (error) {
      setMessage({ kind: 'error', text: authErrorMessage(error, 'login', navigator.onLine) });
    } finally {
      setBusy(false);
    }
  }

  async function recoverPassword() {
    if (!email.trim()) {
      setMessage({ kind: 'error', text: 'Escribe tu correo para recuperar la contraseña.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      setMessage({ kind: 'success', text: 'Si la cuenta existe, recibirás un enlace para recuperar tu acceso.' });
    } catch (error) {
      setMessage({ kind: 'error', text: authErrorMessage(error, 'recovery', navigator.onLine) });
    } finally {
      setBusy(false);
    }
  }

  async function exploreDemo() {
    setBusy(true);
    setMessage(null);
    try {
      await onDemo();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo iniciar la demostración' });
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-layout">
    <section className="login-story" aria-label="Brillo para lavaderos">
      <div className="brand"><div className="brand-mark">b.</div><span>brillo<span className="brand-dot">.</span></span></div>
      <div className="login-story-content">
        <span className="eyebrow">HECHO PARA TU LAVADERO</span>
        <h1>Más autos brillando. Menos cuentas pendientes.</h1>
        <p>Tu operación, tu equipo y tus números. Todo en un mismo lugar.</p>
        <div className="login-features">
          <span><Droplets size={20} aria-hidden="true"/> Cada servicio bajo control</span>
          <span><WifiOff size={20} aria-hidden="true"/> Sigue trabajando sin internet</span>
          <span><ShieldCheck size={20} aria-hidden="true"/> Un espacio seguro para tu negocio</span>
        </div>
      </div>
      <small>Diseñado para los lavaderos de Colombia.</small>
    </section>

    <section className="login-side" aria-labelledby="login-title">
      <form className="d-card auth-card login-card" onSubmit={signIn}>
        <div className="d-card-body login-form-body">
          <div className="login-intro">
            <span className="eyebrow">BIENVENIDO DE NUEVO</span>
            <h2 id="login-title" className="d-card-title">Tu negocio empieza aquí</h2>
            <p>Ingresa con la cuenta de tu lavadero.</p>
          </div>

          <div className="login-fields">
            <fieldset className="d-fieldset login-field">
              <legend id="login-email-label" className="d-fieldset-legend">Correo electrónico</legend>
              <input className="d-input" aria-labelledby="login-email-label" type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" placeholder="nombre@lavadero.com" />
            </fieldset>
            <fieldset className="d-fieldset login-field">
              <legend id="login-password-label" className="d-fieldset-legend">Contraseña</legend>
              <input className="d-input" aria-labelledby="login-password-label" type="password" required value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" />
            </fieldset>
          </div>

          <button type="button" className="d-btn d-btn-link forgot" disabled={busy || !hasSupabase} onClick={() => void recoverPassword()}>Olvidé mi contraseña</button>
          {(message || externalMessage) && <div role={message?.kind === 'success' ? 'status' : 'alert'} className={`d-alert d-alert-soft ${message?.kind === 'success' ? 'd-alert-success' : 'd-alert-error'}`}>{message?.text ?? externalMessage}</div>}
          <button type="submit" className="d-btn d-btn-primary login-submit" disabled={busy || !hasSupabase}>Ingresar a mi lavadero <ArrowRight size={18} aria-hidden="true"/></button>
          {!hasSupabase && <p className="login-configuration">Supabase aún no está configurado. Puedes explorar la demostración local.</p>}
          <div className="d-divider login-divider">¿Quieres conocer Brillo?</div>
          <button type="button" className="d-btn d-btn-outline login-demo" disabled={busy} onClick={() => void exploreDemo()}>Explorar demostración</button>
          <small className="login-note">Las cuentas son habilitadas por el administrador.</small>
        </div>
      </form>
    </section>
  </main>;
}
