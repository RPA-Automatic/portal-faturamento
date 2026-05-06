
import React, { useState } from 'react';
import { authConfigurationMessage, isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

type AccessType = 'INTERNAL' | 'EXTERNAL' | null;
type ExternalAuthMode = 'SIGN_IN' | 'SIGN_UP';

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [accessType, setAccessType] = useState<AccessType>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [externalMode, setExternalMode] = useState<ExternalAuthMode>('SIGN_IN');
  const [loading, setLoading] = useState(false);
  const [azureLoading, setAzureLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : authConfigurationMessage);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (externalMode === 'SIGN_UP') {
        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              first_name: trimmedFirstName,
              last_name: trimmedLastName,
              full_name: [trimmedFirstName, trimmedLastName].filter(Boolean).join(' '),
            },
          },
        });
        if (signUpError) throw signUpError;

        if (data.session && data.user) {
          onAuthSuccess(data.user);
          return;
        }

        setMessage('Cadastro criado. Verifique seu e-mail para confirmar o acesso.');
        return;
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      if (data.user) onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleAzureLogin = async () => {
    setAzureLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: window.location.origin,
          scopes: 'email profile openid',
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com Microsoft.');
      setAzureLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setGithubLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin,
          scopes: 'read:user user:email',
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com GitHub.');
      setGithubLoading(false);
    }
  };

  const renderSelection = () => (
    <div className="space-y-4 animate-fade-in">
      <p className="text-gray-500 text-center text-sm mb-6">Escolha como deseja acessar o portal:</p>

      <button
        onClick={handleAzureLogin}
        disabled={azureLoading || !isSupabaseConfigured}
        className={`w-full flex items-center gap-4 p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-[#3AE4B0] hover:shadow-md transition-all group text-left ${azureLoading ? 'opacity-70 cursor-wait' : ''}`}
      >
        <div className="w-12 h-12 bg-[#3AE4B0]/10 rounded-lg flex items-center justify-center text-[#3AE4B0] group-hover:bg-[#3AE4B0] group-hover:text-white transition-colors">
          {azureLoading ? (
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0h10v10H0z" fill="currentColor"/><path d="M11 0h10v10H11z" fill="currentColor"/><path d="M0 11h10v10H0z" fill="currentColor"/><path d="M11 11h10v10H11z" fill="currentColor"/>
            </svg>
          )}
        </div>
        <div>
          <h4 className="font-bold text-gray-800">Colaborador Biond</h4>
          <p className="text-xs text-gray-400 font-medium">
            {azureLoading ? 'Iniciando autenticação...' : 'Acesso via Single Sign-On (@biondagro)'}
          </p>
        </div>
      </button>

      <button
        onClick={() => { setAccessType('EXTERNAL'); setExternalMode('SIGN_IN'); setError(null); setMessage(null); }}
        className="w-full flex items-center gap-4 p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-[#3AE4B0] hover:shadow-md transition-all group text-left"
      >
        <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-[#3AE4B0] group-hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h4 className="font-bold text-gray-800">Acesso Externo</h4>
          <p className="text-xs text-gray-400 font-medium">Clientes e parceiros externos</p>
        </div>
      </button>
    </div>
  );

  const renderInternal = () => (
    <div className="space-y-6 animate-fade-in text-center">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
        <p className="text-sm text-blue-700 font-medium leading-relaxed">
          Você será redirecionado para a página de login da Microsoft para validar suas credenciais corporativas.
        </p>
      </div>

      <button
        type="button"
        onClick={handleAzureLogin}
        disabled={azureLoading || !isSupabaseConfigured}
        className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
      >
        {azureLoading ? (
          <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0h10v10H0z" fill="#f25022"/><path d="M11 0h10v10H11z" fill="#7fba00"/><path d="M0 11h10v10H0z" fill="#00a4ef"/><path d="M11 11h10v10H11z" fill="#ffb900"/>
            </svg>
            Entrar com Microsoft
          </>
        )}
      </button>

      <button
        onClick={() => { setAccessType(null); setError(null); }}
        className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Voltar para seleção
      </button>
    </div>
  );

  const renderExternal = () => (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 mb-5">
        <button
          type="button"
          onClick={() => { setExternalMode('SIGN_IN'); setError(null); setMessage(null); }}
          className={`rounded-lg py-2 text-sm font-bold transition-colors ${externalMode === 'SIGN_IN' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => { setExternalMode('SIGN_UP'); setError(null); setMessage(null); }}
          className={`rounded-lg py-2 text-sm font-bold transition-colors ${externalMode === 'SIGN_UP' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Cadastrar
        </button>
      </div>

      <form onSubmit={handleAuth} className="space-y-5">
        {externalMode === 'SIGN_UP' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#3AE4B0] focus:border-transparent outline-none transition-all"
                placeholder="Rodrigo"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Sobrenome</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#3AE4B0] focus:border-transparent outline-none transition-all"
                placeholder="Freitas"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#3AE4B0] focus:border-transparent outline-none transition-all"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#3AE4B0] focus:border-transparent outline-none transition-all pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !isSupabaseConfigured}
          className="w-full bg-[#3AE4B0] hover:bg-[#34ce9f] text-white font-bold py-3 rounded-lg shadow-lg shadow-green-100 transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            externalMode === 'SIGN_UP' ? 'Cadastrar novo usuário' : 'Entrar'
          )}
        </button>

        <div className="flex items-center gap-3 text-xs font-semibold text-gray-300">
          <div className="h-px flex-1 bg-gray-200"></div>
          <span>ou</span>
          <div className="h-px flex-1 bg-gray-200"></div>
        </div>

        <button
          type="button"
          onClick={handleGithubLogin}
          disabled={githubLoading || !isSupabaseConfigured}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-3"
        >
          {githubLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.59 2 12.253c0 4.53 2.865 8.371 6.839 9.727.5.094.683-.222.683-.494 0-.244-.009-.89-.014-1.747-2.782.62-3.369-1.374-3.369-1.374-.455-1.185-1.11-1.5-1.11-1.5-.908-.637.069-.624.069-.624 1.004.073 1.532 1.057 1.532 1.057.892 1.566 2.341 1.114 2.91.852.091-.662.35-1.114.636-1.37-2.221-.259-4.555-1.139-4.555-5.067 0-1.12.39-2.034 1.029-2.75-.103-.26-.446-1.302.098-2.714 0 0 .84-.276 2.75 1.05A9.34 9.34 0 0112 6.958a9.34 9.34 0 012.504.345c1.909-1.326 2.747-1.05 2.747-1.05.546 1.412.203 2.455.1 2.714.64.716 1.028 1.63 1.028 2.75 0 3.938-2.337 4.805-4.566 5.059.36.317.679.943.679 1.9 0 1.37-.012 2.475-.012 2.81 0 .274.18.593.688.492C19.138 20.621 22 16.782 22 12.253 22 6.59 17.523 2 12 2z" />
              </svg>
              Continuar com GitHub
            </>
          )}
        </button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => { setAccessType(null); setError(null); setMessage(null); }}
            className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Voltar para seleção
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] px-4 py-12 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[60%] bg-[#3AE4B0] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[60%] bg-[#7D8D6D] rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-[#3AE4B0] p-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4 overflow-hidden">
              <img src="https://ysrkicujlhnmovaycbol.supabase.co/storage/v1/object/public/icon_site/biond-agro-squareLogo-1681762663084.webp" alt="Biond Logo" className="w-[110%] h-[110%] max-w-none object-cover" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Portal Biond Agro
            </h2>
            <p className="text-white/80 text-sm mt-2">
              Biond Agro Corporate Access
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 font-medium animate-pulse mb-4">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-xs text-emerald-700 font-medium mb-4">
                {message}
              </div>
            )}

            {accessType === null && renderSelection()}
            {accessType === 'INTERNAL' && renderInternal()}
            {accessType === 'EXTERNAL' && renderExternal()}
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          &copy; {new Date().getFullYear()} Biond Agro. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};
