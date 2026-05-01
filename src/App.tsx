import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Provider, Session } from '@supabase/supabase-js'
import './App.css'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { ReleaseForm, ShipmentRelease } from './types'

const initialForm: ReleaseForm = {
  invoice_number: '',
  invoice_key: '',
  customer_name: '',
  carrier_name: '',
  order_number: '',
  shipment_number: '',
  origin_city: '',
  destination_city: '',
  destination_state: '',
  gross_weight_kg: '',
  total_amount: '',
  scheduled_ship_date: '',
  notes: '',
}

const providers: Array<{ label: string; value: Provider }> = [
  { label: 'Google', value: 'google' },
  { label: 'Microsoft Azure', value: 'azure' },
  { label: 'GitHub', value: 'github' },
]

function formatCurrency(value: number | null) {
  if (value === null) return '—'

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value))
}

function parseDecimal(value: string) {
  if (!value.trim()) return null

  const normalized = value.replace('.', '').replace(',', '.')
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [releases, setReleases] = useState<ShipmentRelease[]>([])
  const [form, setForm] = useState<ReleaseForm>(initialForm)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const pendingCount = useMemo(
    () => releases.filter((release) => release.status === 'pending').length,
    [releases],
  )
  const approvedCount = useMemo(
    () => releases.filter((release) => release.status === 'approved').length,
    [releases],
  )
  const totalAmount = useMemo(
    () => releases.reduce((sum, release) => sum + (release.total_amount ?? 0), 0),
    [releases],
  )

  const loadReleases = useCallback(async () => {
    if (!supabase) return

    setIsLoading(true)
    const { data, error } = await supabase
      .from('shipment_releases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      setMessage(`Não foi possível carregar liberações: ${error.message}`)
    } else {
      setReleases((data ?? []) as ShipmentRelease[])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) void loadReleases()
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        void loadReleases()
      } else {
        setReleases([])
      }
    })

    return () => data.subscription.unsubscribe()
  }, [loadReleases])

  async function signIn(provider: Provider) {
    if (!supabase) return

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) setMessage(error.message)
  }

  async function signOut() {
    if (!supabase) return

    await supabase.auth.signOut()
    setMessage('Sessão encerrada.')
  }

  function handleChange(field: keyof ReleaseForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setMessage('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para salvar dados no Supabase.')
      return
    }

    if (!form.invoice_number.trim() || !form.customer_name.trim()) {
      setMessage('Informe pelo menos nota fiscal e cliente.')
      return
    }

    setIsLoading(true)
    const { error } = await supabase.from('shipment_releases').insert({
      invoice_number: form.invoice_number.trim(),
      invoice_key: form.invoice_key.trim() || null,
      customer_name: form.customer_name.trim(),
      carrier_name: form.carrier_name.trim() || null,
      order_number: form.order_number.trim() || null,
      shipment_number: form.shipment_number.trim() || null,
      origin_city: form.origin_city.trim() || null,
      destination_city: form.destination_city.trim() || null,
      destination_state: form.destination_state.trim().toUpperCase() || null,
      gross_weight_kg: parseDecimal(form.gross_weight_kg),
      total_amount: parseDecimal(form.total_amount),
      scheduled_ship_date: form.scheduled_ship_date || null,
      notes: form.notes.trim() || null,
      status: 'pending',
    })

    if (error) {
      setMessage(`Erro ao salvar liberação: ${error.message}`)
    } else {
      setForm(initialForm)
      setMessage('Liberação cadastrada com sucesso.')
      await loadReleases()
    }

    setIsLoading(false)
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Portal de Faturamento</p>
          <h1>Liberação de embarque integrada ao Supabase</h1>
          <p className="hero-text">
            Cadastre notas fiscais, acompanhe liberações de embarque e mantenha o fluxo preparado para importar a planilha XLSX assim que ela estiver no repositório.
          </p>
        </div>
        <div className="auth-card">
          {!isSupabaseConfigured ? (
            <p className="warning">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar autenticação e gravação.</p>
          ) : session ? (
            <>
              <span>Conectado como</span>
              <strong>{session.user.email ?? session.user.id}</strong>
              <button type="button" onClick={signOut}>Sair</button>
            </>
          ) : (
            <>
              <span>Entrar com</span>
              {providers.map((provider) => (
                <button key={provider.value} type="button" onClick={() => void signIn(provider.value)}>
                  {provider.label}
                </button>
              ))}
            </>
          )}
        </div>
      </section>

      <section className="metrics-grid" aria-label="Resumo das liberações">
        <article><span>Total</span><strong>{releases.length}</strong></article>
        <article><span>Pendentes</span><strong>{pendingCount}</strong></article>
        <article><span>Aprovadas</span><strong>{approvedCount}</strong></article>
        <article><span>Valor faturado</span><strong>{formatCurrency(totalAmount)}</strong></article>
      </section>

      {message ? <p className="status-message">{message}</p> : null}

      <section className="content-grid">
        <form className="release-form" onSubmit={(event) => void handleSubmit(event)}>
          <h2>Nova liberação</h2>
          <label>Nota fiscal<input value={form.invoice_number} onChange={(event) => handleChange('invoice_number', event.target.value)} /></label>
          <label>Chave NF-e<input value={form.invoice_key} onChange={(event) => handleChange('invoice_key', event.target.value)} /></label>
          <label>Cliente<input value={form.customer_name} onChange={(event) => handleChange('customer_name', event.target.value)} /></label>
          <label>Transportadora<input value={form.carrier_name} onChange={(event) => handleChange('carrier_name', event.target.value)} /></label>
          <label>Pedido<input value={form.order_number} onChange={(event) => handleChange('order_number', event.target.value)} /></label>
          <label>Embarque<input value={form.shipment_number} onChange={(event) => handleChange('shipment_number', event.target.value)} /></label>
          <label>Origem<input value={form.origin_city} onChange={(event) => handleChange('origin_city', event.target.value)} /></label>
          <label>Destino<input value={form.destination_city} onChange={(event) => handleChange('destination_city', event.target.value)} /></label>
          <label>UF<input maxLength={2} value={form.destination_state} onChange={(event) => handleChange('destination_state', event.target.value)} /></label>
          <label>Peso bruto (kg)<input inputMode="decimal" value={form.gross_weight_kg} onChange={(event) => handleChange('gross_weight_kg', event.target.value)} /></label>
          <label>Valor total<input inputMode="decimal" value={form.total_amount} onChange={(event) => handleChange('total_amount', event.target.value)} /></label>
          <label>Data prevista<input type="date" value={form.scheduled_ship_date} onChange={(event) => handleChange('scheduled_ship_date', event.target.value)} /></label>
          <label className="full-width">Observações<textarea value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} /></label>
          <button className="primary-button" type="submit" disabled={isLoading || !session}>Salvar liberação</button>
        </form>

        <section className="release-list">
          <div className="section-heading">
            <h2>Últimas liberações</h2>
            <button type="button" onClick={() => void loadReleases()} disabled={isLoading || !session}>Atualizar</button>
          </div>
          {releases.length === 0 ? (
            <p className="empty-state">Nenhuma liberação encontrada. Entre com uma conta autorizada e cadastre a primeira nota.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>NF</th><th>Cliente</th><th>Transportadora</th><th>Destino</th><th>Prevista</th><th>Status</th><th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((release) => (
                    <tr key={release.id}>
                      <td>{release.invoice_number}</td>
                      <td>{release.customer_name}</td>
                      <td>{release.carrier_name ?? '—'}</td>
                      <td>{[release.destination_city, release.destination_state].filter(Boolean).join(' / ') || '—'}</td>
                      <td>{formatDate(release.scheduled_ship_date)}</td>
                      <td><span className={`badge badge-${release.status}`}>{release.status}</span></td>
                      <td>{formatCurrency(release.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
