import React, { useState } from 'react';
import { BrandFooter } from './Brand';
import './Auth.css';
import { authConfigurationMessage, authErrorMessage, enabledOAuthProviders, isSupabaseConfigured, SocialProvider, supabase } from '../lib/supabase';

interface AuthProps { onAuthSuccess: (user: any) => void; initialError?: string | null; }
const providers: { id: SocialProvider; label: string; symbol: string }[] = [
  { id: 'azure', label: 'Microsoft', symbol: 'M' },
  { id: 'github', label: 'GitHub', symbol: 'GH' },
  { id: 'google', label: 'Google', symbol: 'G' },
];

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, initialError = null }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [message, setMessage] = useState<string | null>(null);

  async function handleEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured || busy) return;
    setBusy('email'); setError(null); setMessage(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password,
          options: { emailRedirectTo: window.location.origin + '/', data: { full_name: name.trim() } } });
        if (error) throw error;
        if (data.session && data.user) onAuthSuccess(data.user);
        else setMessage('Confira seu e-mail para confirmar o cadastro. Depois, seu acesso às operações dependerá da aprovação da administração.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (data.user) onAuthSuccess(data.user);
      }
    } catch (error) { setError(authErrorMessage(error)); }
    finally { setBusy(null); }
  }

  async function handleSocial(provider: SocialProvider) {
    if (!isSupabaseConfigured || busy || !enabledOAuthProviders.has(provider)) return;
    setBusy(provider); setError(null); setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider,
        options: { redirectTo: window.location.origin + '/', scopes: provider === 'azure' ? 'email openid profile' : undefined } });
      if (error) throw error;
    } catch (error) { setError(authErrorMessage(error)); setBusy(null); }
  }

  const inputClass = 'auth-input';
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-hero" aria-label="Portal de Faturamento">
          <div className="auth-brand">
            <div className="auth-logo-frame">
              <img src="/brand/rpa-automatic-primary.png" alt="RPA Automatic" width="1254" height="1254" fetchPriority="high" />
            </div>
            <div className="auth-product"><span>Gestão de embarques</span><p>Portal de<br /> Faturamento</p></div>
          </div>
          <div className="auth-intro">
            <h1>Seu embarque.<br /><span>Sob controle.</span></h1>
            <p>Acompanhe operações, documentos e pendências, da análise à liberação.</p>
          </div>
          <div className="auth-process" aria-label="Acompanhamento do embarque">
            <p>Uma visão de ponta a ponta.</p>
            <ul><li>Operações</li><li>Documentos</li><li>Liberação</li></ul>
          </div>
        </section>
        <section className="auth-access" aria-label="Acesso ao portal">
          <div className="auth-heading">
            <p className="auth-eyebrow">{mode === 'login' ? 'Bem-vindo de volta' : 'Primeiro acesso'}</p>
            <h2>{mode === 'login' ? 'Acesse seu portal' : 'Crie sua conta'}</h2>
            <p>{mode === 'login' ? 'Entre com seu e-mail e senha para continuar.' : 'Seu acesso às operações será autorizado pela administração.'}</p>
          </div>
          {(!isSupabaseConfigured || error) && <p role="alert" className="auth-notice auth-notice-error">{!isSupabaseConfigured ? authConfigurationMessage : error}</p>}
          {message && <p role="status" className="auth-notice auth-notice-success">{message}</p>}
          <form onSubmit={handleEmail} className="auth-form">
            {mode === 'signup' && <div><label htmlFor="full-name">Nome completo</label><input id="full-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required className={inputClass} /></div>}
            <div><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="voce@exemplo.com" className={inputClass} /></div>
            <div><label htmlFor="password">Senha</label>
              <div className="auth-password">
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
            <button type="submit" disabled={Boolean(busy) || !isSupabaseConfigured} className="auth-submit">{busy === 'email' ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}<span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-switch">{mode === 'login' ? 'Primeiro acesso? ' : 'Já possui uma conta? '}<button type="button" disabled={Boolean(busy)} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setPassword(''); setError(null); setMessage(null); }}>{mode === 'login' ? 'Criar conta' : 'Entrar com e-mail'}</button></p>
          <div className="auth-social">
            <p className="auth-social-heading">Outras formas de acesso</p>
            <div className="auth-providers">{providers.map(provider => {
              const available = enabledOAuthProviders.has(provider.id);
              return <button key={provider.id} type="button" onClick={() => handleSocial(provider.id)} disabled={!available || !isSupabaseConfigured || Boolean(busy)} className="auth-provider" aria-label={busy === provider.id ? `Conectando com ${provider.label}` : `Continuar com ${provider.label}`} aria-describedby={!available ? 'social-setup' : undefined}>
                <span className="auth-provider-name"><span className="auth-provider-symbol" aria-hidden="true">{provider.symbol}</span>{provider.label}</span>
                {!available && <span className="auth-provider-status">Em configuração</span>}
              </button>;
            })}</div>
            {providers.some(p => !enabledOAuthProviders.has(p.id)) && <p id="social-setup" className="auth-social-note">Enquanto o login social é configurado, acesse com e-mail e senha.</p>}
          </div>
        </section>
        <BrandFooter compact />
      </div>
    </main>
  );
};
