export function BrandFooter({ compact = false }: { compact?: boolean }) {
  return <footer className={compact ? 'auth-footer' : 'w-full bg-white border-t border-slate-100 px-5 py-6 flex flex-col items-center gap-3 text-center'}>
    {compact
      ? <span className="auth-footer-logo"><img src="/brand/rpa-automatic-horizontal.png" alt="RPA Automatic" width={2172} height={724}/></span>
      : <img src="/brand/rpa-automatic-horizontal.png" alt="RPA Automatic" width={2172} height={724} className="w-52 h-auto max-w-full"/>}
    <small className="text-xs text-[#123B82]"><span>© {new Date().getFullYear()} RPA Automatic.</span>{' '}<span>Todos os direitos reservados.</span></small>
  </footer>;
}

export function MonitoringIcon() {
  return <img src="/brand/rpa-automatic-icon.png" alt="Monitoramento de operações" width={1254} height={1254} className="w-9 h-9 rounded-lg bg-white shrink-0"/>;
}
