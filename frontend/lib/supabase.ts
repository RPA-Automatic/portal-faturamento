/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const publicKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
export const isSupabaseConfigured = /^https?:\/\//.test(supabaseUrl)
  && Boolean(publicKey) && !publicKey.includes('sua_chave') && !publicKey.includes('sua-chave')
  && !publicKey.startsWith('sb_secret_');
export const authConfigurationMessage =
  'O acesso está temporariamente indisponível. Entre em contato com a administração do portal.';

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://unconfigured.invalid',
  isSupabaseConfigured ? publicKey : 'sb_publishable_unconfigured',
  { auth: { autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', persistSession: true } },
);

export type SocialProvider = 'azure' | 'github' | 'google';
// Enable only after the corresponding RPA Automatic OAuth app is configured and tested.
export const enabledOAuthProviders = new Set<string>(
  (import.meta.env.VITE_AUTH_OAUTH_PROVIDERS || '').split(',').map((value: string) => value.trim()).filter(Boolean),
);

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'invalid_credentials') return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
  if (code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (code === 'weak_password') return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.';
  if (code === 'user_already_exists') return 'Não foi possível concluir o cadastro. Tente entrar com seu e-mail.';
  if (code === 'access_denied') return 'O login foi cancelado ou não foi autorizado. Você pode tentar novamente.';
  return 'Não foi possível concluir o acesso. Tente novamente; se o problema continuar, contate a administração do portal.';
}

let startup: Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']> | undefined;
export function initializeAuth() {
  // StrictMode and all consumers share a single callback exchange.
  return startup ??= (async () => {
    if (!isSupabaseConfigured) return null;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const callbackError = url.searchParams.get('error') || hash.get('error');
    const hasCode = url.searchParams.has('code');
    try {
      const { error: initializationError } = await supabase.auth.initialize();
      if (callbackError) throw { code: callbackError };
      if (initializationError) throw initializationError;
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (hasCode && !data.session) throw { code: 'invalid_flow_state' };
      return data.session;
    } finally {
      // Remove credentials and provider diagnostics from browser history.
      const sensitive = ['code', 'error', 'error_code', 'error_description', 'access_token',
        'refresh_token', 'provider_token', 'provider_refresh_token', 'expires_at', 'expires_in', 'token_type', 'type'];
      const current = new URL(window.location.href);
      const fragment = new URLSearchParams(current.hash.slice(1));
      const hasAuthHash = sensitive.some(key => fragment.has(key));
      sensitive.forEach(key => { current.searchParams.delete(key); fragment.delete(key); });
      if (hasAuthHash) current.hash = fragment.toString();
      window.history.replaceState({}, document.title, current.pathname + current.search + current.hash);
    }
  })();
}
