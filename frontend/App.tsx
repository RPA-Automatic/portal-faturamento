import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';

type SessionLike = {
  user?: {
    email?: string;
    user_metadata?: {
      first_name?: string;
      last_name?: string;
      full_name?: string;
      name?: string;
    };
  };
};

type OperationFarol = {
  id: string;
  oper_b2b: string;
  description: string | null;
  item_description: string | null;
  finalidade: string | null;
  normalized_status: string | null;
  current_stage: string;
  current_stage_name: string | null;
  semaphore: 'verde' | 'amarelo' | 'vermelho';
  purchase_contracts_count: number;
  sales_contracts_count: number;
  logistics_orders_count: number;
  fiscal_documents_count: number;
  blocking_pending_count: number;
  warning_pending_count: number;
  aging_days: number;
  updated_at: string | null;
};

type AreaBacklog = {
  owner_area: string;
  owner_area_name: string;
  stage: string;
  severity: 'bloqueante' | 'atencao';
  status: string;
  pending_count: number;
  oldest_pending_at: string | null;
};

const stageOrder = ['todos', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6'];

const kanbanStages = [
  { code: 'E1', name: 'Documentacao Basica' },
  { code: 'E2', name: 'Validacao Fiscal' },
  { code: 'E3', name: 'Contratos e Regras TOTVS' },
  { code: 'E4', name: 'Logistica' },
  { code: 'E5', name: 'Faturamento' },
  { code: 'E6', name: 'Concluido' },
];

const semaphoreStyle: Record<OperationFarol['semaphore'], string> = {
  verde: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  amarelo: 'bg-amber-100 text-amber-800 border-amber-200',
  vermelho: 'bg-red-100 text-red-800 border-red-200',
};

const formatDateTime = (value: string | null) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const displayUserName = (session: SessionLike | null) => {
  const metadata = session?.user?.user_metadata || {};
  const metadataName = [metadata.first_name, metadata.last_name].filter(Boolean).join(' ').trim();
  const fullName = metadataName || metadata.full_name || metadata.name;
  if (fullName) return fullName.split(/\s+/).slice(0, 2).join(' ');

  const emailName = session?.user?.email?.split('@')[0] || 'Usuario autenticado';
  return emailName
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const App: React.FC = () => {
  const [session, setSession] = useState<SessionLike | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operations, setOperations] = useState<OperationFarol[]>([]);
  const [backlog, setBacklog] = useState<AreaBacklog[]>([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('todos');
  const [semaphoreFilter, setSemaphoreFilter] = useState<'todos' | OperationFarol['semaphore']>('todos');

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        const url = new URL(window.location.href);
        const authError = url.searchParams.get('error_description') || url.searchParams.get('error');
        const authCode = url.searchParams.get('code');

        if (authError) {
          url.searchParams.delete('error');
          url.searchParams.delete('error_code');
          url.searchParams.delete('error_description');
          window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
          throw new Error(authError);
        }

        if (authCode) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) throw exchangeError;

          url.searchParams.delete('code');
          window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);

          if (!mounted) return;
          setSession(data.session);
          setLoadingAuth(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || 'Nao foi possivel concluir a autenticacao.');
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    };

    initializeSession();

    const { data } = supabase.auth.onAuthStateChange((_event: string, nextSession: SessionLike | null) => {
      setSession(nextSession);
      setLoadingAuth(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!session) return;

    setLoadingData(true);
    setError(null);

    try {
      const [operationsResult, backlogResult] = await Promise.all([
        supabase.from('v_operations_farol').select('*').order('updated_at', { ascending: false }),
        supabase.from('v_area_backlog').select('*').order('pending_count', { ascending: false }),
      ]);

      if (operationsResult.error) throw operationsResult.error;
      if (backlogResult.error) throw backlogResult.error;

      setOperations(operationsResult.data || []);
      setBacklog(backlogResult.data || []);
    } catch (err: any) {
      setError(err.message || 'Nao foi possivel carregar o Farol.');
    } finally {
      setLoadingData(false);
    }
  }, [session]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredOperations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return operations.filter((operation) => {
      const matchesStage = stageFilter === 'todos' || operation.current_stage === stageFilter;
      const matchesSemaphore = semaphoreFilter === 'todos' || operation.semaphore === semaphoreFilter;
      const searchableText = [operation.oper_b2b, operation.description, operation.item_description, operation.finalidade]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStage && matchesSemaphore && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [operations, search, semaphoreFilter, stageFilter]);

  const totals = useMemo(() => {
    return operations.reduce(
      (acc, operation) => {
        acc.total += 1;
        acc[operation.semaphore] += 1;
        acc.blocking += Number(operation.blocking_pending_count || 0);
        acc.warning += Number(operation.warning_pending_count || 0);
        return acc;
      },
      { total: 0, verde: 0, amarelo: 0, vermelho: 0, blocking: 0, warning: 0 }
    );
  }, [operations]);

  const operationsByStage = useMemo(() => {
    return kanbanStages.reduce<Record<string, OperationFarol[]>>((acc, stage) => {
      acc[stage.code] = filteredOperations.filter((operation) => operation.current_stage === stage.code);
      return acc;
    }, {});
  }, [filteredOperations]);

  const userName = displayUserName(session);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setOperations([]);
    setBacklog([]);
  };

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
        <div className="text-sm font-semibold text-slate-600">Carregando sessao...</div>
      </main>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={(user) => setSession({ user })} initialError={error} />;
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Portal de Faturamento</p>
            <h1 className="text-2xl font-bold text-slate-950">Farol de Liberacao de Embarque</h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="text-sm font-semibold text-slate-600">{userName}</span>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loadingData}
              className="px-4 py-2 rounded-md border border-slate-300 bg-white text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingData ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Metric label="OPs" value={totals.total} />
          <Metric label="Verdes" value={totals.verde} tone="emerald" />
          <Metric label="Amarelas" value={totals.amarelo} tone="amber" />
          <Metric label="Vermelhas" value={totals.vermelho} tone="red" />
          <Metric label="Bloqueios" value={totals.blocking} tone="red" />
          <Metric label="Alertas" value={totals.warning} tone="amber" />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por OP, produto, descricao ou finalidade"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {stageOrder.map((stage) => (
                <option key={stage} value={stage}>{stage === 'todos' ? 'Todas as etapas' : stage}</option>
              ))}
            </select>
            <select
              value={semaphoreFilter}
              onChange={(event) => setSemaphoreFilter(event.target.value as typeof semaphoreFilter)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="todos">Todos os semaforos</option>
              <option value="verde">Verde</option>
              <option value="amarelo">Amarelo</option>
              <option value="vermelho">Vermelho</option>
            </select>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-950">Fluxo das Operacoes</h2>
            <span className="text-sm text-slate-500">{filteredOperations.length} exibidas</span>
          </div>

          <div className="overflow-x-auto p-4">
            <div className="grid min-w-[1120px] grid-cols-6 gap-3">
              {kanbanStages.map((stage) => {
                const stageOperations = operationsByStage[stage.code] || [];

                return (
                  <section key={stage.code} className="rounded-lg border border-slate-200 bg-slate-50 min-h-[260px]">
                    <div className="border-b border-slate-200 bg-white px-3 py-3 rounded-t-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold uppercase text-emerald-700">{stage.code}</div>
                          <h3 className="text-sm font-bold text-slate-950 leading-tight">{stage.name}</h3>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{stageOperations.length}</span>
                      </div>
                    </div>

                    <div className="space-y-3 p-3">
                      {stageOperations.map((operation) => (
                        <article key={operation.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-950">OP {operation.oper_b2b}</div>
                              <div className="mt-1 text-xs text-slate-500 line-clamp-2">{operation.description || operation.finalidade || '-'}</div>
                            </div>
                            <span className={`shrink-0 border rounded-full px-2 py-0.5 text-[11px] font-bold ${semaphoreStyle[operation.semaphore]}`}>
                              {operation.semaphore}
                            </span>
                          </div>

                          <div className="mt-3 text-xs text-slate-600 space-y-1">
                            <div className="truncate">Produto: {operation.item_description || '-'}</div>
                            <div>Contratos: C {operation.purchase_contracts_count || 0} / V {operation.sales_contracts_count || 0}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-red-700 font-semibold">Bloq {operation.blocking_pending_count || 0}</span>
                              <span className="text-amber-700 font-semibold">Alert {operation.warning_pending_count || 0}</span>
                            </div>
                          </div>
                        </article>
                      ))}

                      {!loadingData && stageOperations.length === 0 && (
                        <div className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                          Sem OPs nesta etapa
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-950">Operacoes</h2>
              <span className="text-sm text-slate-500">{filteredOperations.length} exibidas</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <Th>OP</Th>
                    <Th>Etapa</Th>
                    <Th>Semaforo</Th>
                    <Th>Produto</Th>
                    <Th>Contratos</Th>
                    <Th>Pendencias</Th>
                    <Th>Aging</Th>
                    <Th>Atualizado</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOperations.map((operation) => (
                    <tr key={operation.id} className="hover:bg-slate-50">
                      <Td>
                        <div className="font-bold text-slate-950">{operation.oper_b2b}</div>
                        <div className="text-xs text-slate-500 max-w-[260px] truncate">{operation.description || '-'}</div>
                      </Td>
                      <Td>
                        <div className="font-semibold">{operation.current_stage}</div>
                        <div className="text-xs text-slate-500">{operation.current_stage_name || '-'}</div>
                      </Td>
                      <Td>
                        <span className={`inline-flex border rounded-full px-2.5 py-1 text-xs font-bold ${semaphoreStyle[operation.semaphore]}`}>
                          {operation.semaphore}
                        </span>
                      </Td>
                      <Td>{operation.item_description || '-'}</Td>
                      <Td>
                        <div>Compra: {operation.purchase_contracts_count || 0}</div>
                        <div>Venda: {operation.sales_contracts_count || 0}</div>
                      </Td>
                      <Td>
                        <div className="text-red-700">Bloq: {operation.blocking_pending_count || 0}</div>
                        <div className="text-amber-700">Alert: {operation.warning_pending_count || 0}</div>
                      </Td>
                      <Td>{operation.aging_days || 0} dias</Td>
                      <Td>{formatDateTime(operation.updated_at)}</Td>
                    </tr>
                  ))}

                  {!loadingData && filteredOperations.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        Nenhuma operacao encontrada. Depois da ingestao dos XLSX, as OPs aparecerao aqui.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-bold text-slate-950">Backlog por Area</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {backlog.map((item) => (
                <div key={`${item.owner_area}-${item.stage}-${item.severity}-${item.status}`} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-950">{item.owner_area_name}</div>
                      <div className="text-sm text-slate-500">{item.stage} - {item.status}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.severity === 'bloqueante' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {item.pending_count}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Mais antiga: {formatDateTime(item.oldest_pending_at)}</div>
                </div>
              ))}

              {!loadingData && backlog.length === 0 && (
                <div className="p-6 text-sm text-slate-500">Sem pendencias abertas no momento.</div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

const Metric: React.FC<{ label: string; value: number; tone?: 'slate' | 'emerald' | 'amber' | 'red' }> = ({ label, value, tone = 'slate' }) => {
  const toneClass = {
    slate: 'text-slate-950',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  }[tone];

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
};

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-4 py-3 text-left font-bold whitespace-nowrap">{children}</th>
);

const Td: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-4 py-3 align-top text-slate-700 whitespace-nowrap">{children}</td>
);

export default App;
