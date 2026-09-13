import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type Row = Record<string, unknown>;
type Detail = Record<string, Row[]>;
const queries = [
  ['stages', 'v_operation_stage_readiness', 'stage,result,reason,assessed_at', 'stage'],
  ['contracts', 'operation_contract_links', 'contract_id,contracts(contract_number,contract_type,establishment,item_description,normalized_status,data_carga)', 'linked_at'],
  ['documents', 'documents', 'id,title,type,status,updated_at', 'updated_at'],
  ['versions', 'document_versions', 'id,document_id,version_no,received_at', 'version_no'],
  ['pending', 'pending_items', 'id,stage,owner_area,severity,status,message,next_step,due_at', 'opened_at'],
  ['locations', 'operation_locations', 'id,role,description,city,state,sequence_no', 'sequence_no'],
  ['logistics', 'logistics_orders', 'id,ol_rota,status_transito,origem_name,destino_name,data_carregamento', 'created_at'],
  ['milestones', 'operation_milestones', 'id,milestone,decision,reason,decided_at', 'decided_at'],
  ['history', 'state_history', 'id,new_stage,new_semaphore,reason,created_at', 'created_at'],
] as const;
const words: Record<string, string> = {
  pendente: 'Aguardando verificação', aprovado: 'Aprovado', reprovado: 'Reprovado', nao_aplicavel: 'Não aplicável',
  liberacao_embarque: 'Liberação de embarque', encerramento: 'Encerramento', revogado: 'Revogado',
  origem: 'Origem', entrega: 'Entrega', transbordo: 'Transbordo', destino_final: 'Destino final',
  gestao_contratos: 'Gestão de contratos', em_tratativa: 'Em tratativa', aberta: 'Aberta', resolvida: 'Resolvida', dispensada: 'Dispensada',
};
const label = (value: unknown) => words[String(value)] || String(value ?? 'Não informado').replaceAll('_', ' ');
const date = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value))
  ? new Date(value).toLocaleString('pt-BR') : 'Não informado';

export function OperationDetail({ id, number, onClose }: { id: string; number: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    let current = true;
    setData(null); setError(false);
    (async () => {
      try {
        const result = await Promise.all(queries.map(async ([key, table, columns, order]) => {
          const { data: rows, error: failure } = await supabase.from(table).select(columns).eq('operation_id', id).order(order, { ascending: key === 'stages' || key === 'locations' }).limit(100).overrideTypes<Row[], { merge: false }>();
          if (failure) throw failure;
          return [key, rows || []] as const;
        }));
        const detail = Object.fromEntries(result) as Detail;
        if (detail.versions.length) {
          const reviews = await supabase.from('document_reviews').select('document_version_id,area,result,reviewed_at')
            .in('document_version_id', detail.versions.map(v => String(v.id))).order('reviewed_at', { ascending: false }).limit(100);
          if (reviews.error) throw reviews.error;
          detail.reviews = reviews.data || [];
        }
        if (current) setData(detail);
      } catch { if (current) setError(true); }
    })();
    return () => { current = false; };
  }, [id, attempt]);

  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="op-detail-title" className="w-[min(1100px,95vw)] max-h-[90vh] rounded-xl p-0 shadow-2xl backdrop:bg-slate-950/50">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
      <div><p className="text-xs font-bold uppercase text-emerald-700">Ficha operacional</p><h2 id="op-detail-title" className="text-xl font-bold">OP {number}</h2></div>
      <button onClick={onClose} className="rounded-lg border px-4 py-2 font-semibold">Fechar</button>
    </header>
    <div className="space-y-6 bg-slate-50 p-6">
      {!data && !error && <p role="status">Carregando a operação...</p>}
      {error && <div role="alert"><p>Não foi possível carregar a ficha. Verifique sua conexão e o acesso à operação.</p><button className="mt-3 rounded border bg-white px-4 py-2" onClick={() => setAttempt(x => x + 1)}>Tentar novamente</button></div>}
      {data && <>
        <section><h3 className="mb-3 text-lg font-bold">Verificações por etapa</h3>
          <p className="mb-3 text-sm text-slate-600">Documento recebido não significa documento aprovado. Uma nova versão exige revisar as verificações afetadas.</p>
          <div className="grid gap-3 sm:grid-cols-5">{data.stages.map(row => <article key={String(row.stage)} className="rounded-lg border bg-white p-3">
            <h4 className="font-bold">{String(row.stage)}</h4><p className={`mt-1 text-sm font-semibold ${row.result === 'aprovado' ? 'text-emerald-700' : 'text-amber-800'}`}>{label(row.result)}</p>
            {Boolean(row.reason) && <p className="mt-2 text-xs text-slate-600">{String(row.reason)}</p>}
          </article>)}</div>
          {!data.stages.length && <Empty />}
        </section>
        <section className="rounded-lg border bg-white p-4"><h3 className="text-lg font-bold">Liberação e encerramento</h3><p className="mt-1 text-sm text-slate-600">São decisões independentes. A primeira nota fiscal não encerra automaticamente a OP.</p>
          {!data.milestones.length ? <Empty text="Nenhuma decisão registrada." /> : data.milestones.map(row => <p key={String(row.id)} className="mt-3 text-sm"><strong>{label(row.milestone)}: {label(row.decision)}</strong> · {date(row.decided_at)}<br />{String(row.reason)}</p>)}
        </section>
        <section><h3 className="mb-3 text-lg font-bold">Pendências e próximas ações</h3>
          {!data.pending.length ? <Empty text="Nenhuma pendência registrada. Confira também as verificações das etapas." /> : <div className="space-y-2">{data.pending.map(row => <article key={String(row.id)} className="rounded-lg border bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">{String(row.stage)} · {label(row.owner_area)} · {label(row.status)} · {label(row.severity)}</p>
            <p className="mt-2 font-semibold">{String(row.message)}</p><p className="mt-1 text-sm text-slate-600">Próxima ação: {label(row.next_step)}</p><p className="mt-1 text-xs">Prazo: {date(row.due_at)}</p>
          </article>)}</div>}
        </section>
        <Table title="Contratos vinculados" rows={data.contracts.map(row => (row.contracts || {}) as Row)} columns={[
          ['contract_number','Contrato'],['contract_type','Tipo'],['establishment','Filial'],['item_description','Produto'],['normalized_status','Situação'],['data_carga','Data da carga'],
        ]} />
        <section><h3 className="mb-3 text-lg font-bold">Documentos e versões</h3>
          {!data.documents.length ? <Empty /> : data.documents.map(row => {
            const version = data.versions.find(v => v.document_id === row.id);
            const reviews = (data.reviews || []).filter(r => r.document_version_id === version?.id);
            return <article key={String(row.id)} className="mb-2 rounded-lg border bg-white p-4"><h4 className="font-semibold">{String(row.title)}</h4><p className="text-sm text-slate-600">{label(row.type)} · {version ? `Versão ${version.version_no} recebida em ${date(version.received_at)}` : 'Sem versão de arquivo registrada'}</p>
              {!reviews.length ? <p className="mt-2 text-sm text-amber-800">Sem revisão registrada para a versão exibida.</p> : reviews.map((r,i) => <p key={i} className="mt-2 text-sm">{label(r.area)}: {label(r.result)} · {date(r.reviewed_at)}</p>)}
            </article>;
          })}
        </section>
        <Table title="Origem e destinos" rows={data.locations} columns={[['role','Papel'],['description','Local'],['city','Cidade'],['state','UF']]} />
        <Table title="Ordens logísticas" rows={data.logistics} columns={[['ol_rota','OL / rota'],['status_transito','Situação'],['origem_name','Origem'],['destino_name','Destino']]} />
        <Table title="Histórico da operação" rows={data.history} columns={[['new_stage','Etapa'],['new_semaphore','Farol'],['reason','Motivo'],['created_at','Registrado em']]} />
        <p className="text-xs text-slate-500">Exibidos até 100 registros por seção, conforme suas permissões. Esta ficha é de consulta.</p>
      </>}
    </div>
  </dialog>;
}
function Empty({ text = 'Nenhum registro disponível para seu acesso.' }: { text?: string }) { return <p className="py-4 text-sm text-slate-500">{text}</p>; }
function Table({ title, rows, columns }: { title: string; rows: Row[]; columns: [string,string][] }) {
  return <section><h3 className="mb-3 text-lg font-bold">{title}</h3>{!rows.length ? <Empty /> : <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr>{columns.map(([key,name]) => <th key={key} scope="col" className="px-3 py-2">{name}</th>)}</tr></thead><tbody>{rows.map((row,i) => <tr key={String(row.id || i)} className="border-t">{columns.map(([key]) => <td key={key} className="px-3 py-2">{key.endsWith('_at') ? date(row[key]) : label(row[key])}</td>)}</tr>)}</tbody></table></div>}</section>;
}
