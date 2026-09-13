
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    // Som de "ding" duplo mais agradável
    playTone(880, now, 0.4);
    playTone(1108.73, now + 0.12, 0.4);
  } catch (e) {
    console.error("AudioContext error", e);
  }
};

const requestSystemNotificationPermission = async () => {
  if (!('Notification' in window)) return;
  if (window.Notification.permission !== 'default') return;

  try {
    await window.Notification.requestPermission();
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificações do sistema', error);
  }
};

const showSystemNotification = (notification: Pick<Notification, 'id' | 'title' | 'body'>) => {
  if (!('Notification' in window)) return;

  if (window.Notification.permission === 'granted') {
    try {
      const desktopNotification = new window.Notification(notification.title, {
        body: notification.body,
        tag: `portal-notification-${notification.id}`,
        icon: '/favicon.ico', // Tenta usar o favicon como ícone
        silent: true, // Já estamos tocando o som via AudioContext
      });

      desktopNotification.onclick = () => {
        window.focus();
        desktopNotification.close();
      };
    } catch (error) {
      console.error('Erro ao exibir notificação do sistema', error);
    }
  }
};

const FIELD_TRANSLATIONS: Record<string, string> = {
  'registry_code': 'Código de Cadastro (Datasul)',
  'razao_social': 'Razão Social',
  'nome_fantasia': 'Nome Fantasia',
  'alias': 'Apelido',
  'documento': 'Documento (CNPJ/CPF)',
  'doc_type': 'Tipo de Documento',
  'cep': 'CEP',
  'endereco': 'Endereço',
  'numero': 'Número',
  'bairro': 'Bairro',
  'cidade': 'Cidade',
  'estado': 'Estado',
  'pais': 'País',
  'ie': 'Inscrição Estadual',
  'status': 'Status',
  'score_credito': 'Score de Crédito',
  'limite_disponivel': 'Limite Disponível',
  'limite_solicitado': 'Limite Solicitado',
  'parecer_credito': 'Parecer de Crédito',
  'parecer_comercial': 'Parecer Comercial',
  'contatos': 'Contatos',
  'servicos_ativos': 'Serviços Ativos',
  'grupo_economico': 'Grupo Econômico',
  'area_plantada': 'Área Plantada',
  'qtd_fazendas': 'Qtd. Fazendas',
  'culturas': 'Culturas',
  'origem': 'Origem',
  'banco_nome': 'Banco',
  'agencia': 'Agência',
  'conta': 'Conta',
  'conta_digito': 'Dígito da Conta',
  'titular_conta': 'Titular da Conta',
  'situacao': 'Situação',
  'condicao_pagamento': 'Condição de Pagamento',
  'portador': 'Portador',
  'tipo_despesa_padrao': 'Tipo Despesa Padrão',
  'tipo_receita_padrao': 'Tipo Receita Padrão',
  'cod_grupo_fornecedor': 'Cód. Grupo Fornecedor',
  'cod_grupo_cliente': 'Cód. Grupo Cliente',
  'identificacao': 'Identificação',
  'cargo': 'Cargo',
  'perfil': 'Perfil',
  'observacao': 'Observação',
  'estado_civil': 'Estado Civil',
  'natureza': 'Natureza',
  'requer_analise_credito': 'Requer Análise de Crédito',
  'car_url': 'CAR',
  'matricula_url': 'Matrícula',
  'comprovante_bancario_url': 'Comprovante Bancário',
  'demonstrativo_financeiro_url': 'Demonstrativo Financeiro',
  'imposto_renda_url': 'Imposto de Renda',
  'razao_social_cobranca': 'Razão Social (Cobrança)',
  'cep_cobranca': 'CEP (Cobrança)',
  'endereco_cobranca': 'Endereço (Cobrança)',
  'bairro_cobranca': 'Bairro (Cobrança)',
  'cidade_cobranca': 'Cidade (Cobrança)',
  'estado_cobranca': 'Estado (Cobrança)',
  'ie_cobranca': 'IE (Cobrança)',
  'doc_cobranca': 'Documento (Cobrança)',
};

const translateField = (field: string) => {
  const cleanField = field.toLowerCase().trim();
  return FIELD_TRANSLATIONS[cleanField] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Realtime state refs
  const channelRef = useRef<any>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gestão de Seleção (Sempre ativo)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [manageActionLoading, setManageActionLoading] = useState(false);

  // Feedback Visual (Modal de Sucesso/Erro)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default'
  );

  const drawerRef = useRef<HTMLDivElement>(null);

  const debounce = <T extends (...args: any[]) => void>(fn: T, ms = 300) => {
    let t: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFeedback({ message, type });
    if (type !== 'error') {
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const fetchNotifications = async (isInitial = true) => {
    if (!isInitial && loading) return;

    setLoading(true);
    const last = isInitial ? null : notifications[notifications.length - 1];

    try {
      const { data, error } = await supabase.rpc('rpc_notifications_list', {
        p_limit: 10,
        p_cursor_created_at: last?.created_at ?? null,
        p_cursor_id: last?.id ?? null,
      });

      if (error) throw error;

      if (data) {
        if (isInitial) {
          setNotifications(data);
          setHasMore(data.length === 10);
        } else {
          setNotifications((prev) => [...prev, ...data]);
          if (data.length < 10) setHasMore(false);
        }
      }
    } catch (err: any) {
      showFeedback(`Erro ao carregar notificações: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshNotificationsDebounced = useRef(debounce(() => {
    fetchNotifications(true);
  }, 300)).current;

  useEffect(() => {
    if (channelRef.current) return;

    const initRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      const userId = session.user.id;
      const topic = `notifications:user:${userId}`;

      channelRef.current = supabase
        .channel(topic, {
          config: {
            private: false,
            broadcast: { self: true } // ESSENCIAL: Permite que você receba suas próprias mensagens
          }
        })
        .on('broadcast', { event: 'broadcast' }, (payload) => {
          const notificationFromPayload = payload?.payload?.notification;

          playNotificationSound();
          if (notificationFromPayload) {
            showSystemNotification(notificationFromPayload);
            // Mostrar também um feedback visual interno (Toast)
            showFeedback(`${notificationFromPayload.title}: ${notificationFromPayload.body}`, 'info');
          }

          refreshNotificationsDebounced();
        })
        .subscribe(async (status) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('[Realtime] Erro de permissão.');
          }
        });
    };

    initRealtime();
    requestSystemNotificationPermission();
    fetchNotifications(true);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const notificationIdFromUrl = searchParams.get('notification_id');

    if (notificationIdFromUrl) {
      setIsOpen(true);

      if (!selectedNotification) {
        const found = notifications.find(n => n.id === notificationIdFromUrl);
        if (found) {
          setSelectedNotification(found);
        } else {
          // Se não encontrou na lista (ex: após refresh), busca individualmente
          const fetchSingle = async () => {
            try {
              const { data, error } = await supabase.rpc('rpc_notifications_list', {
                p_limit: 50,
                p_cursor_created_at: null,
                p_cursor_id: null,
              });

              if (error) throw error;
              if (data) {
                const found = data.find((n: Notification) => n.id === notificationIdFromUrl);
                if (found) {
                  setSelectedNotification(found);
                  if (!found.is_read) {
                    markAsRead(found.id);
                  }
                }
              }
            } catch (err: any) {
              console.error('Erro ao buscar notificação individual:', err.message);
            }
          };
          fetchSingle();
        }
      }
    }
  }, [searchParams, notifications, selectedNotification]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  const manageNotifications = async (action: 'mark_read' | 'mark_unread' | 'delete', ids: string[] | null) => {
    setManageActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_notifications_manage', {
        p_action: action,
        p_ids: ids,
        p_limit: 10,
      });

      if (error) throw error;

      const affectedCount = data?.[0]?.affected_count || 0;

      if (affectedCount > 0 || (ids && ids.length > 0)) {
        if (action === 'delete') {
          if (ids) {
            setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
            showFeedback(`${affectedCount || ids.length} notificações excluídas.`, 'success');
          } else {
            await fetchNotifications(true);
            showFeedback(`Limpeza concluída.`, 'success');
          }
        } else if (action === 'mark_read') {
          if (ids) {
            setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
          } else {
            await fetchNotifications(true);
            showFeedback(`Todas marcadas como lidas.`, 'success');
          }
        } else if (action === 'mark_unread') {
          if (ids) {
            setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: false } : n));
            showFeedback(`Marcadas como não lidas.`, 'success');
          }
        }
      }

      setSelectedIds(new Set());
    } catch (err: any) {
      showFeedback(`Erro ao processar: ${err.message}`, 'error');
    } finally {
      setManageActionLoading(false);
    }
  };

  const markAsRead = (notificationId: string) => {
    manageNotifications('mark_read', [notificationId]);
  };

  const markAsUnread = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    manageNotifications('mark_unread', [notificationId]);
  };

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    const allIds = notifications.map(n => n.id);
    setSelectedIds(new Set(allIds));
    showFeedback(`${allIds.length} notificações selecionadas.`);
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('notification_id', notification.id);
      return newParams;
    }, { replace: true });
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const closeNotificationDetails = () => {
    setSelectedNotification(null);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('notification_id');
      return newParams;
    }, { replace: true });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 60) return `há ${diffInMins} min`;
    if (diffInHours < 24) return `há ${diffInHours} h`;
    return `há ${diffInDays} d`;
  };

  const DetailField = ({ label, value, highlight = false }: { label: string, value: any, highlight?: boolean }) => (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{label}</span>
      <span className={`text-sm break-all ${highlight ? 'font-bold text-[#3AE4B0]' : 'text-gray-700'}`}>
        {value === null || value === undefined || value === '' ? '-' : String(value)}
      </span>
    </div>
  );

  const renderPayloadDetails = (notification: Notification) => {
    const { title, body, payload } = notification;
    const fieldsList = payload?.changed_fields || payload?.change_fields || payload?.chang_fields;

    return (
      <div className="space-y-6">
        {payload?.cadastro_id && (
            <button
                onClick={() => {
                    closeNotificationDetails();
                    setIsOpen(false);
                    navigate(`/form/${payload.cadastro_id}?notification_reload=${Date.now()}`);
                }}
                className="w-full py-3 bg-[#3AE4B0] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Visualizar Cadastro Completo
            </button>
        )}

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <DetailField label="Título" value={title} />
            <DetailField label="Mensagem" value={body} />
        </div>

        <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Detalhamento:</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <DetailField label="Status" value={payload?.status} highlight />
                <DetailField label="Usuário que realizou a ação" value={payload?.actor_nome} />
                <DetailField label="E-mail do usuário que realizou a ação" value={payload?.actor_email} />
                <DetailField label="Razão Social" value={payload?.razao_social} />
                <DetailField label="Identificação" value={payload?.identificacao} />
            </div>
        </div>

        {Array.isArray(fieldsList) && fieldsList.length > 0 && (
            <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Campos Alterados:</p>
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                        {fieldsList.map((field: string, idx: number) => (
                            <span key={idx} className="px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-tight flex items-center gap-2">
                                <div className="w-1 h-1 bg-[#3AE4B0] rounded-full"></div>
                                {translateField(field)}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  };

  const selectedItems = notifications.filter(n => selectedIds.has(n.id));
  const hasSelectedUnread = selectedItems.some(n => !n.is_read);
  const hasSelectedRead = selectedItems.some(n => n.is_read);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all focus:outline-none"
        title="Notificações"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-white text-[10px] font-bold text-white items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[140] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      ></div>

      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full md:w-[430px] bg-white shadow-2xl z-[150] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="px-6 py-5 bg-gray-50 border-b flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Notificações</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Central de Atividades</p>
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
                <div className="flex items-center bg-gray-200/50 rounded-lg p-0.5 mr-2">
                    <button
                        onClick={() => manageNotifications('mark_read', null)}
                        className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-[#3AE4B0] transition-all"
                        title="Marcar Recentes como Lidas"
                        disabled={manageActionLoading}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                    <button
                        onClick={() => manageNotifications('delete', null)}
                        className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-red-500 transition-all"
                        title="Limpar Recentes"
                        disabled={manageActionLoading}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            )}

            <button
              onClick={() => fetchNotifications(true)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
              title="Atualizar"
              disabled={loading}
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
              title="Fechar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {notificationPermission === 'default' && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] text-blue-700 font-black uppercase tracking-wider">Notificações no Desktop desativadas</p>
            </div>
            <button
              onClick={async () => {
                const permission = await window.Notification.requestPermission();
                setNotificationPermission(permission);
              }}
              className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-tighter hover:bg-blue-700 transition-all shadow-sm active:scale-95"
            >
              Ativar Agora
            </button>
          </div>
        )}

        {notifications.length > 0 && (
            <div className="bg-white px-6 py-3 border-b flex justify-between items-center shadow-sm z-10 shrink-0">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{selectedIds.size} selecionadas</span>
                <div className="flex gap-2">
                    <button
                        onClick={selectAll}
                        className="text-[10px] font-black uppercase text-[#3AE4B0] hover:underline"
                    >
                        Selecionar Tudo
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-600"
                    >
                        Limpar
                    </button>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {notifications.length === 0 && !loading ? (
            <div className="p-12 text-center text-gray-400">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 8-8-8" />
                </svg>
              </div>
              <p className="text-sm font-medium">Tudo em ordem!</p>
              <p className="text-xs text-gray-400 mt-1">Nenhuma nova notificação disponível.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-6 transition-all cursor-pointer group relative flex gap-4 border-b border-gray-100/50 ${
                    !n.is_read
                      ? 'bg-white shadow-sm z-10'
                      : 'bg-gray-100/60 hover:bg-gray-100'
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  {!n.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#3AE4B0]"></div>
                  )}

                  <div
                    className="flex-shrink-0 pt-1"
                    onClick={(e) => toggleSelection(n.id, e)}
                  >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.has(n.id) ? 'bg-[#3AE4B0] border-[#3AE4B0]' : 'bg-white border-gray-300 group-hover:border-gray-400 shadow-sm'}`}>
                            {selectedIds.has(n.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                      </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className={`text-sm font-bold leading-tight pr-4 truncate transition-colors ${!n.is_read ? 'text-gray-900' : 'text-gray-500'}`}>
                        {n.title}
                        </h4>
                        <div className="flex items-center gap-2">
                            {n.is_read && (
                                <button
                                    onClick={(e) => markAsUnread(e, n.id)}
                                    className="p-1 text-gray-400 hover:text-[#3AE4B0] transition-colors"
                                    title="Marcar como não lida"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            )}
                            <span className="text-[10px] text-gray-400 whitespace-nowrap font-bold">
                            {formatTime(n.created_at)}
                            </span>
                        </div>
                    </div>
                    <p className={`text-xs line-clamp-2 leading-relaxed mb-3 transition-colors ${!n.is_read ? 'text-gray-600' : 'text-gray-400 italic'}`}>
                        {n.body}
                    </p>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-h-[14px]">
                        {!n.is_read ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                <span className="text-[9px] font-black uppercase tracking-wider text-green-500">
                                    NOTIFICAÇÃO NOVA
                                </span>
                            </>
                        ) : (
                             n.event_type === 'updated' && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                   Atualização
                                </span>
                             )
                        )}
                        </div>
                        <span className="text-[10px] text-[#3AE4B0] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Detalhes →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore && notifications.length > 0 && (
            <button
              onClick={() => fetchNotifications(false)}
              disabled={loading}
              className="w-full py-5 text-xs font-black uppercase tracking-[0.15em] text-gray-400 hover:text-[#3AE4B0] bg-gray-50/50 hover:bg-green-50 transition-all border-t border-gray-100 disabled:opacity-50"
            >
              {loading ? 'Carregando...' : 'Carregar anteriores'}
            </button>
          )}
        </div>

        {selectedIds.size > 0 && (
            <div className="bg-white border-t p-4 flex flex-col gap-2 animate-fade-in shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                    {hasSelectedUnread && (
                        <button
                            onClick={() => manageNotifications('mark_read', Array.from(selectedIds))}
                            disabled={manageActionLoading}
                            className="flex-1 bg-white border border-[#3AE4B0] text-[#3AE4B0] font-bold py-2.5 rounded-lg text-sm hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                        >
                            {manageActionLoading ? '...' : 'Marcar Como Lido'}
                        </button>
                    )}

                    {hasSelectedRead && (
                        <button
                            onClick={() => manageNotifications('mark_unread', Array.from(selectedIds))}
                            disabled={manageActionLoading}
                            className="flex-1 bg-white border border-gray-400 text-gray-600 font-bold py-2.5 rounded-lg text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                        >
                            {manageActionLoading ? '...' : 'Marcar Como Não Lido'}
                        </button>
                    )}
                </div>

                <button
                    onClick={() => manageNotifications('delete', Array.from(selectedIds))}
                    disabled={manageActionLoading}
                    className="w-full bg-red-500 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-red-600 transition-all shadow-md flex items-center justify-center gap-2"
                >
                    {manageActionLoading ? '...' : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            Excluir Selecionados
                        </>
                    )}
                </button>
            </div>
        )}
      </div>

      {feedback && (
        <div className="fixed top-6 right-6 z-[300] max-w-sm w-full animate-fade-in">
           <div className={`p-4 rounded-xl shadow-2xl border-l-4 flex gap-4 items-start ${
               feedback.type === 'success' ? 'bg-white border-green-500 text-green-800' :
               feedback.type === 'error' ? 'bg-white border-red-500 text-red-800' :
               'bg-white border-blue-500 text-blue-800'
           }`}>
               <div className={`p-2 rounded-lg ${
                   feedback.type === 'success' ? 'bg-green-50 text-green-500' :
                   feedback.type === 'error' ? 'bg-red-50 text-red-500' :
                   'bg-blue-50 text-blue-500'
               }`}>
                   {feedback.type === 'success' ? (
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                   ) : feedback.type === 'error' ? (
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                   ) : (
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   )}
               </div>
               <div className="flex-1">
                   <p className="text-sm font-bold">{feedback.message}</p>
               </div>
               <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               </button>
           </div>
        </div>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`px-6 py-4 flex justify-between items-center ${selectedNotification.event_type.includes('updated') ? 'bg-blue-50 border-b border-blue-100' : 'bg-green-50 border-b border-green-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedNotification.event_type.includes('updated') ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                   {selectedNotification.event_type.includes('updated') ? (
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                   ) : (
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Detalhamento da Notificação</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatTime(selectedNotification.created_at)}</span>
                </div>
              </div>
              <button
                onClick={closeNotificationDetails}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-gray-50/30">
              {renderPayloadDetails(selectedNotification)}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={closeNotificationDetails}
                className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
