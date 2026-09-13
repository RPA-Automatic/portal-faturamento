import React, { useState } from 'react';
import { BrandFooter } from './Brand';
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

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100';
  return (
    <main className="min-h-screen bg-white text-[#123B82] flex flex-col items-center justify-center px-5 py-8 sm:py-12">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/60 border border-slate-200 grid lg:grid-cols-2">
        <section className="relative bg-white border-b lg:border-b-0 lg:border-r border-slate-100 p-7 sm:p-10 lg:p-12 flex flex-col justify-between">
          <img src="/brand/rpa-automatic-primary.png" alt="RPA Automatic" width="1254" height="1254" className="w-44 sm:w-56 lg:w-72 h-auto max-w-full mx-auto" fetchPriority="high" />
          <div className="py-7 lg:py-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1254BC] mb-4">Portal de Faturamento</p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">Clareza em cada<br className="hidden sm:block" /> etapa do embarque.</h1>
            <p className="mt-5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-sm">Acompanhe operações, documentos e pendências em um só lugar.</p>
          </div>
          <div className="hidden lg:flex items-center gap-3 text-xs font-medium text-[#1254BC]"><span className="h-2 w-2 rounded-full bg-[#08BFF0]" aria-hidden="true" />Visibilidade para decidir. Controle para liberar.</div>
        </section>
        <section className="p-7 sm:p-10 lg:p-12" aria-label="Acesso ao portal">
          <h2 className="text-2xl font-bold">{mode === 'login' ? 'Acesse seu portal' : 'Crie sua conta'}</h2>
          <p className="mt-2 mb-7 text-sm text-slate-500">{mode === 'login' ? 'Entre com seu e-mail e senha.' : 'Seu acesso às operações será autorizado pela administração.'}</p>
          {(!isSupabaseConfigured || error) && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{!isSupabaseConfigured ? authConfigurationMessage : error}</p>}
          {message && <p role="status" className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">{message}</p>}
          <form onSubmit={handleEmail} className="space-y-4">
            {mode === 'signup' && <div><label htmlFor="full-name" className="block text-sm font-semibold mb-2">Nome completo</label><input id="full-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required className={inputClass} /></div>}
            <div><label htmlFor="email" className="block text-sm font-semibold mb-2">E-mail</label><input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="voce@exemplo.com" className={inputClass} /></div>
            <div><label htmlFor="password" className="block text-sm font-semibold mb-2">Senha</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-20`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 inset-y-0 text-xs font-semibold text-[#1254BC]">{showPassword ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
            <button type="submit" disabled={Boolean(busy) || !isSupabaseConfigured} className="w-full rounded-xl bg-[#1264ED] hover:bg-[#0D50CA] text-white py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{busy === 'email' ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
          </form>
          <p className="my-5 text-center text-sm text-slate-500">{mode === 'login' ? 'Primeiro acesso? ' : 'Já possui uma conta? '}<button type="button" disabled={Boolean(busy)} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setPassword(''); setError(null); setMessage(null); }} className="font-semibold text-[#1254BC] hover:underline">{mode === 'login' ? 'Criar conta' : 'Entrar com e-mail'}</button></p>
          <div className="border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold text-slate-500 mb-3">Outras formas de acesso</p>
            <div className="space-y-2">{providers.map(provider => {
              const available = enabledOAuthProviders.has(provider.id);
              return <button key={provider.id} type="button" onClick={() => handleSocial(provider.id)} disabled={!available || !isSupabaseConfigured || Boolean(busy)} className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400" aria-describedby={!available ? 'social-setup' : undefined}>
                <span className="flex items-center gap-3"><span className="w-7 text-center text-xs font-bold" aria-hidden="true">{provider.symbol}</span><span>{busy === provider.id ? 'Conectando...' : `Continuar com ${provider.label}`}</span></span>
                {!available && <span className="text-[10px] font-medium">Em configuração</span>}
              </button>;
            })}</div>
            {providers.some(p => !enabledOAuthProviders.has(p.id)) && <p id="social-setup" className="text-xs leading-relaxed text-slate-500 mt-3">O login social está em configuração. Use e-mail e senha para acessar sua conta.</p>}
          </div>
        </section>
      </div>
      <div className="w-full max-w-5xl mt-7"><BrandFooter/></div>
    </main>
  );
};
