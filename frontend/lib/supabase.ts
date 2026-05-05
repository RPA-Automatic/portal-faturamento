
import { createClient } from '@supabase/supabase-js';

/**
 * No Vite, variáveis de ambiente devem obrigatoriamente começar com VITE_
 * para serem acessíveis no código do cliente.
 */
const getEnv = (key: string): string => {
  try {
    // Tenta import.meta.env (Padrão Vite)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
    // Fallback para process.env caso o plugin de ambiente do Node esteja ativo
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {
    // Silently fail
  }
  return '';
};

// Alterado para o padrão VITE_ exigido pelo seu bundler
const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Log de depuração atualizado
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('DEBUG SUPABASE: Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
}

const isPlaceholder = (url: string) =>
  !url ||
  url.includes('sua-url-do-supabase') ||
  !url.startsWith('http');

let supabaseInstance: any;

try {
  if (isPlaceholder(supabaseUrl)) {
    supabaseInstance = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: {}, error: new Error('Configuração necessária: No painel da Netlify, as chaves devem ser VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Após alterar, faça um novo Deploy.') }),
        signUp: async () => ({ data: {}, error: new Error('Configuração necessária: No painel da Netlify, as chaves devem ser VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Após alterar, faça um novo Deploy.') }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          then: (cb: any) => cb({ data: [], error: null }),
        }),
      }),
    };
  } else {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (e) {
  console.error('Erro crítico ao inicializar cliente Supabase:', e);
}

export const supabase = supabaseInstance;
