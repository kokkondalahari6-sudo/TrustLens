import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getGetAuditLogsQueryKey, getGetAuditStatsQueryKey, setAuthTokenGetter, useAnalyzePayload, useGetAuditLogs, useGetAuditStats, useHealthCheck, useLogin, useRegister } from '@workspace/api-client-react';
import { Activity, ArrowRight, BarChart3, Check, ChevronDown, ClipboardCheck, Clock3, Copy, Database, FileSearch, Fingerprint, Gauge, KeyRound, LockKeyhole, LogIn, Menu, RefreshCw, Search, ShieldCheck, Sparkles, Terminal, X, AlertTriangle, CircleAlert, CircleCheck, Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

setAuthTokenGetter(() => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('trustlens_token');
});

type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
const severityStyles: Record<Severity, { pill: string; dot: string; label: string }> = {
  LOW: { pill: 'bg-[#e3f0e7] text-[#267052] border-[#b9d9c6]', dot: 'bg-[#4ca177]', label: 'Low' },
  MEDIUM: { pill: 'bg-[#fff0d3] text-[#95631d] border-[#efd19c]', dot: 'bg-[#d99a37]', label: 'Medium' },
  HIGH: { pill: 'bg-[#f8dfdc] text-[#a4473e] border-[#e5b8b2]', dot: 'bg-[#c9685e]', label: 'High' },
};

function SeverityPill({ severity, small = false }: { severity: Severity; small?: boolean }) {
  const style = severityStyles[severity];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 ${small ? 'py-0.5 text-[10px]' : 'py-1 text-[11px]'} font-mono-ui font-bold uppercase tracking-[.08em] ${style.pill}`} data-testid={`status-severity-${severity.toLowerCase()}`}><span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{style.label}</span>;
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5" data-testid="brand-trustlens"><div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#9ee1c9] text-[#123346] shadow-[inset_0_-2px_0_rgba(18,51,70,.12)]"><ShieldCheck size={19} strokeWidth={2.4} /><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-[#123346] bg-[#e3b652]" /></div>{!compact && <span className="font-display text-[20px] font-bold tracking-[-.06em]">trust<span className="text-[#76c6a9]">lens</span></span>}</div>;
}

function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const [location] = useLocation();
  const nav = [{ href: '/', label: 'Overview', icon: Gauge }, { href: '/inspector', label: 'Inspector', icon: FileSearch }, { href: '/reports', label: 'Audit reports', icon: BarChart3 }];
  return <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col bg-[#112f40] text-[#e5f0ed] transition-transform duration-200 md:relative md:translate-x-0`} data-testid="sidebar">
    <div className="flex h-[84px] items-center border-b border-[#315061] px-7"><BrandMark /></div>
    <div className="px-5 pt-8"><p className="mb-3 px-3 font-mono-ui text-[9px] font-bold uppercase tracking-[.2em] text-[#91abb0]">Workspace</p>
      <nav className="space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`} className={`group flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] font-semibold transition-colors ${location === href ? 'bg-[#24495a] text-[#a5e4ce]' : 'text-[#b6cacb] hover:bg-[#1b3c4d] hover:text-[#f1faf4]'}`}><Icon size={17} strokeWidth={location === href ? 2.2 : 1.8} /><span>{label}</span>{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#9ee1c9]" />}</Link>)}</nav>
    </div>
    <div className="mt-auto border-t border-[#315061] p-5"><div className="rounded-xl border border-[#315061] bg-[#183b4c] p-3.5"><div className="mb-3 flex items-center justify-between"><span className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-[#91abb0]">System status</span><span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9ee1c9]"><span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[#9ee1c9]" />Operational</span></div><div className="flex items-center gap-2 text-[11px] text-[#b6cacb]"><Activity size={13} /> All inspection services online</div></div><div className="mt-5 flex items-center gap-3 px-1"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6ad77] text-[11px] font-bold text-[#273c45]">AR</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#eef6ef]">Alex Rivera</p><p className="truncate text-[10px] text-[#91abb0]">Security engineer</p></div><ChevronDown size={14} className="ml-auto text-[#91abb0]" /></div></div>
  </aside>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const title = location === '/inspector' ? 'Payload inspector' : location === '/reports' ? 'Audit reports' : 'Overview';
  return <div className="noise flex min-h-[100dvh] bg-[#f3f0e7]"><Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />{mobileOpen && <button aria-label="Close navigation" data-testid="button-close-navigation" className="fixed inset-0 z-30 bg-[#112f40]/40 md:hidden" onClick={() => setMobileOpen(false)} /> }
    <main className="min-w-0 flex-1"><header className="flex h-[84px] items-center justify-between border-b border-[#dedbd1] bg-[#f8f6ef]/90 px-5 backdrop-blur md:px-10"><div className="flex items-center gap-3"><button aria-label="Open navigation" data-testid="button-open-navigation" className="rounded-lg p-2 text-[#42606a] hover:bg-[#e8e5db] md:hidden" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div><p className="font-mono-ui text-[9px] font-bold uppercase tracking-[.2em] text-[#799098]">TrustLens / {title}</p><h1 className="mt-1 font-display text-[22px] font-bold text-[#183847]">{title}</h1></div></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-[#ddd9ce] bg-[#fdfbf5] px-3 py-1.5 text-[10px] font-semibold text-[#58737a] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#53a47d]" />Protected workspace</div><button data-testid="button-help" className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#dcd9d0] text-[#58737a] hover:bg-[#e9e6dd] sm:flex"><Info size={15} /></button><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6ad77] text-[10px] font-bold text-[#273c45]">AR</div></div></header><div className="mx-auto max-w-[1440px] p-5 md:p-10">{children}</div></main>
  </div>;
}

function Skeleton({ className = '' }: { className?: string }) { return <div className={`animate-pulse rounded-lg bg-[#e4e1d8] ${className}`} />; }
function QueryState({ loading, error, onRetry, children, label }: { loading?: boolean; error?: boolean; onRetry?: () => void; children: React.ReactNode; label: string }) {
  if (loading) return <div className="grid gap-5 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  if (error) return <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e4c2bc] bg-[#fff8f6] p-12 text-center"><CircleAlert className="mb-3 text-[#bd655c]" /><p className="font-semibold text-[#31505b]">Couldn’t load {label}</p><p className="mt-1 text-sm text-[#7b8b8d]">The service may be taking a moment.</p><button onClick={onRetry} data-testid={`button-retry-${label}`} className="mt-4 flex items-center gap-2 rounded-lg bg-[#183f4f] px-4 py-2 text-xs font-semibold text-white"><RefreshCw size={13} /> Try again</button></div>;
  return children;
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'teal' }: { label: string; value: string | number; detail: string; icon: typeof Activity; tone?: 'teal' | 'amber' | 'coral' }) {
  const colors = { teal: 'bg-[#dcefe5] text-[#287459]', amber: 'bg-[#f6e8c9] text-[#986822]', coral: 'bg-[#f3dfdc] text-[#a55047]' };
  return <div className="lift-on-hover rounded-2xl border border-[#e1ded5] bg-[#faf9f3] p-5 paper-shadow" data-testid={`card-metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><div><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[.16em] text-[#789097]">{label}</p><p className="mt-3 font-display text-[34px] font-bold tracking-[-.06em] text-[#183847]">{value}</p></div><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={18} /></div></div><p className="mt-3 text-[11px] text-[#75888b]">{detail}</p></div>;
}

function MiniTimeline({ timeline }: { timeline: { label: string; scans: number; risk: number }[] }) {
  const data = timeline.length ? timeline : [{ label: 'Mon', scans: 0, risk: 0 }, { label: 'Tue', scans: 0, risk: 0 }, { label: 'Wed', scans: 0, risk: 0 }, { label: 'Thu', scans: 0, risk: 0 }, { label: 'Fri', scans: 0, risk: 0 }];
  const max = Math.max(...data.map((x) => x.scans), 1);
  return <div className="flex h-[190px] items-end gap-3 px-2 pb-7 pt-3">{data.slice(-7).map((item, i) => <div className="group relative flex h-full flex-1 flex-col justify-end" key={`${item.label}-${i}`}><div className="absolute bottom-[28px] left-1/2 h-[2px] w-full -translate-x-1/2 bg-[#b3dbc9]/70" /><div className="relative z-10 mx-auto w-full max-w-[28px] rounded-t-md bg-[#72bda4] transition-all duration-300 group-hover:bg-[#2f856c]" style={{ height: `${Math.max(8, (item.scans / max) * 112)}px` }}><span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono-ui text-[9px] font-bold text-[#4d7777] opacity-0 transition-opacity group-hover:opacity-100">{item.scans}</span></div><span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono-ui text-[9px] text-[#8b9b9d]">{item.label}</span></div>)}</div>;
}

function Overview() {
  const stats = useGetAuditStats();
  const logs = useGetAuditLogs({ severity: 'ALL' });
  const health = useHealthCheck();
  const stat = stats.data;
  const logRows = logs.data ?? [];
  return <div className="space-y-7"><div className="animate-rise flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-[#3f8c70]"><span className="h-px w-7 bg-[#76c6a9]" />Live signal</div><h2 className="font-display max-w-xl text-[36px] font-bold leading-[1.02] tracking-[-.07em] text-[#183847] md:text-[48px]">Keep private data<br /><span className="text-[#438d76]">inside the lines.</span></h2><p className="mt-4 max-w-lg text-sm leading-6 text-[#718488]">A clear view of every payload your team inspects, every risk caught, and every redaction made before data travels.</p></div><Link href="/inspector" data-testid="link-open-inspector" className="group flex w-fit items-center gap-2 rounded-xl bg-[#183f4f] px-4 py-3 text-xs font-bold text-[#f6f4eb] shadow-[0_5px_0_#0d2b38] transition hover:-translate-y-0.5 hover:shadow-[0_7px_0_#0d2b38]"><FileSearch size={15} /> Open inspector <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></Link></div>
    <QueryState loading={stats.isLoading} error={stats.isError} onRetry={() => stats.refetch()} label="metrics"><div className="grid gap-4 md:grid-cols-3"><MetricCard label="Total scans" value={stat?.totalScans ?? 0} detail="Across your workspace" icon={ClipboardCheck} /><MetricCard label="PII intercepted" value={stat?.piiIntercepted ?? 0} detail="Sensitive values redacted" icon={Fingerprint} tone="amber" /><MetricCard label="Risk score" value={`${stat?.riskScore ?? 0}/100`} detail="Weighted by severity and volume" icon={ShieldCheck} tone={(stat?.riskScore ?? 0) > 60 ? 'coral' : 'teal'} /></div></QueryState>
    <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><section className="animate-rise delay-1 rounded-2xl border border-[#e1ded5] bg-[#faf9f3] p-5 paper-shadow"><div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold text-[#183847]">Inspection activity</p><p className="mt-1 text-xs text-[#7a8c8f]">Scans and weighted risk over the last 7 days</p></div><div className="flex items-center gap-3 font-mono-ui text-[9px] uppercase tracking-[.1em] text-[#6f8589]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#72bda4]" />Scans</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#b3dbc9]" />Risk</span></div></div>{stats.isLoading ? <Skeleton className="mt-5 h-[190px]" /> : <MiniTimeline timeline={stat?.timeline ?? []} />}</section>
      <section className="animate-rise delay-2 rounded-2xl border border-[#e1ded5] bg-[#183f4f] p-5 text-[#f4f5eb] shadow-[0_12px_30px_rgba(24,63,79,.12)]"><div className="flex items-center justify-between"><p className="font-display text-lg font-bold">Severity mix</p><BarChart3 size={17} className="text-[#9ee1c9]" /></div><p className="mt-1 text-xs text-[#9db5b4]">What TrustLens is seeing</p><div className="mt-7 space-y-5">{(['HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((key) => { const count = stat?.severityCounts?.[key] ?? 0; const total = stat ? Object.values(stat.severityCounts).reduce((a, b) => a + b, 0) : 0; return <div key={key}><div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${severityStyles[key].dot}`} />{severityStyles[key].label}</span><span className="font-mono-ui text-[10px] text-[#c2d6d0]">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#2a5563]"><div className={`h-full rounded-full ${severityStyles[key].dot}`} style={{ width: `${total ? (count / total) * 100 : 3}%` }} /></div></div>; })}</div><Link href="/reports" data-testid="link-view-reports" className="mt-8 flex items-center justify-between border-t border-[#315b67] pt-4 text-xs font-semibold text-[#a5e4ce]">View full audit history <ArrowRight size={14} /></Link></section></div>
    <section className="animate-rise delay-3 rounded-2xl border border-[#e1ded5] bg-[#faf9f3] paper-shadow"><div className="flex flex-col gap-3 border-b border-[#e7e4db] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-display text-lg font-bold text-[#183847]">Recent audit activity</p><p className="mt-1 text-xs text-[#7a8c8f]">Most recent payload inspections across your team</p></div><Link href="/reports" data-testid="link-see-all-audits" className="flex items-center gap-1 text-xs font-bold text-[#328166]">See all <ArrowRight size={13} /></Link></div><QueryState loading={logs.isLoading} error={logs.isError} onRetry={() => logs.refetch()} label="audit activity"><AuditTable rows={logRows.slice(0, 5)} compact /></QueryState></section>
    <div className="flex items-center gap-2 text-[10px] text-[#8b9998]"><span className={`h-1.5 w-1.5 rounded-full ${health.isError ? 'bg-[#c9685e]' : 'bg-[#53a47d]'}`} /> API {health.isError ? 'connection unavailable' : 'connected'} · Last checked just now</div>
  </div>;
}

function AuditTable({ rows, compact = false }: { rows: any[]; compact?: boolean }) {
  if (!rows.length) return <div className="flex flex-col items-center justify-center px-6 py-14 text-center"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#e6f0eb] text-[#3b896f]"><Search size={18} /></div><p className="font-semibold text-[#31505b]">No inspections yet</p><p className="mt-1 text-xs text-[#7b8d8e]">Run your first payload through the inspector.</p><Link href="/inspector" data-testid="link-empty-start-inspection" className="mt-4 rounded-lg bg-[#183f4f] px-3 py-2 text-xs font-semibold text-white">Start inspection</Link></div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-b border-[#e7e4db] font-mono-ui text-[9px] uppercase tracking-[.14em] text-[#8a9a9b]"><th className="px-5 py-3 font-bold">Payload preview</th><th className="px-3 py-3 font-bold">Severity</th><th className="px-3 py-3 font-bold">Threats</th><th className="px-3 py-3 font-bold">PII</th><th className="px-5 py-3 text-right font-bold">Inspected</th></tr></thead><tbody>{rows.map((row, i) => <tr key={row.id ?? i} data-testid={`row-audit-${row.id ?? i}`} className="border-b border-[#ebe8df] last:border-0 transition-colors hover:bg-[#f5f3eb]"><td className="max-w-[300px] px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#e6f0eb] text-[#438d76]"><Terminal size={13} /></div><span className="truncate font-mono-ui text-[11px] text-[#385762]">{row.preview}</span></div></td><td className="px-3 py-4"><SeverityPill severity={row.severity} small /></td><td className="px-3 py-4 font-mono-ui text-xs text-[#506c73]">{row.threatCount}</td><td className="px-3 py-4 font-mono-ui text-xs text-[#506c73]">{row.piiCount}</td><td className="px-5 py-4 text-right text-[11px] text-[#849394]">{formatDate(row.createdAt)}</td></tr>)}</tbody></table></div>;
}

function Inspector() {
  const [payload, setPayload] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const analyze = useAnalyzePayload();
  const handleAnalyze = () => { if (!payload.trim() || analyze.isPending) return; analyze.mutate({ data: { payloadText: payload } }, { onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: getGetAuditLogsQueryKey({ severity: 'ALL' }) }); queryClient.invalidateQueries({ queryKey: getGetAuditStatsQueryKey() }); } }); };
  const copy = async () => { if (!result) return; await navigator.clipboard?.writeText(result.sanitizedText); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return <div className="space-y-7"><div className="animate-rise"><div className="mb-3 flex items-center gap-2 font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-[#3f8c70]"><span className="h-px w-7 bg-[#76c6a9]" />Before it leaves</div><h2 className="font-display text-[38px] font-bold leading-none tracking-[-.07em] text-[#183847] md:text-[46px]">Inspect a payload.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#718488]">Paste a request body, log line, or freeform text. TrustLens identifies sensitive values, explains the risk, and returns a safe-to-share version.</p></div>
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]"><section className="signal-grid animate-rise delay-1 rounded-2xl border border-[#dcded5] bg-[#f8f8f0] p-5 paper-shadow"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#dcefe5] text-[#2b7a5c]"><Terminal size={14} /></span><div><p className="text-sm font-bold text-[#254956]">Input payload</p><p className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#8a9b9a]">Plain text · inspected privately</p></div></div><span className="font-mono-ui text-[10px] text-[#8a9b9a]">{payload.length} chars</span></div><textarea value={payload} onChange={(e) => setPayload(e.target.value)} data-testid="input-payload" placeholder={'Paste a payload here…\n\nExample: {"email":"maya@northstar.io","token":"sk_live_…"}'} className="h-[330px] w-full resize-none rounded-xl border border-[#d7ddd5] bg-[#fcfcf6] p-4 font-mono-ui text-[12px] leading-6 text-[#315462] outline-none transition-colors placeholder:text-[#a4b0aa] focus:border-[#65af93] focus:ring-2 focus:ring-[#bde5d3]" /><div className="mt-4 flex items-center justify-between"><button data-testid="button-clear-payload" onClick={() => { setPayload(''); setResult(null); }} className="text-xs font-semibold text-[#789092] hover:text-[#315762]">Clear</button><button data-testid="button-analyze-payload" onClick={handleAnalyze} disabled={!payload.trim() || analyze.isPending} className="flex items-center gap-2 rounded-xl bg-[#183f4f] px-4 py-3 text-xs font-bold text-[#f6f4eb] shadow-[0_4px_0_#0d2b38] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45">{analyze.isPending ? <><RefreshCw size={14} className="animate-spin" /> Analyzing…</> : <><Sparkles size={14} /> Analyze payload <ArrowRight size={14} /></>}</button></div>{analyze.isError && <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#fff0ed] px-3 py-2 text-xs text-[#a55047]"><CircleAlert size={14} /> Analysis failed. Check the payload and try again.</div>}</section>
      <section className="animate-rise delay-2 min-h-[450px] rounded-2xl border border-[#e1ded5] bg-[#faf9f3] p-5 paper-shadow"><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-bold text-[#254956]">Inspection result</p><p className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#8a9b9a]">Redacted output</p></div>{result && <button onClick={copy} data-testid="button-copy-sanitized" className="flex items-center gap-1.5 rounded-lg border border-[#d8ded7] px-2.5 py-1.5 text-[10px] font-bold text-[#4b7775] hover:bg-[#eef4ed]">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy output'}</button>}</div>{!result && !analyze.isPending && <div className="flex min-h-[370px] flex-col items-center justify-center text-center"><div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-[#bcd6c9] bg-[#edf5ee] text-[#64a58b]"><LockKeyhole size={25} /><span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#faf9f3] bg-[#e3b652]" /></div><p className="font-display text-lg font-bold text-[#31525c]">Nothing inspected yet</p><p className="mt-2 max-w-[250px] text-xs leading-5 text-[#829393]">Your redacted result and a plain-language risk rationale will appear here.</p></div>}{analyze.isPending && <div className="space-y-4 pt-5"><Skeleton className="h-7 w-32" /><Skeleton className="h-20 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-12 w-3/4" /></div>}{result && <ResultPanel result={result} />}</section></div>
    <div className="grid gap-4 md:grid-cols-3"><div className="flex items-start gap-3 rounded-xl border border-[#dedfd5] bg-[#f8f7f0] p-4"><LockKeyhole size={16} className="mt-0.5 text-[#438d76]" /><div><p className="text-xs font-bold text-[#31525c]">No data retained in browser</p><p className="mt-1 text-[11px] leading-4 text-[#819193]">Only the result is available after analysis.</p></div></div><div className="flex items-start gap-3 rounded-xl border border-[#dedfd5] bg-[#f8f7f0] p-4"><Fingerprint size={16} className="mt-0.5 text-[#c18a32]" /><div><p className="text-xs font-bold text-[#31525c]">PII-aware detection</p><p className="mt-1 text-[11px] leading-4 text-[#819193]">Credentials, identity data, and tokens.</p></div></div><div className="flex items-start gap-3 rounded-xl border border-[#dedfd5] bg-[#f8f7f0] p-4"><ClipboardCheck size={16} className="mt-0.5 text-[#438d76]" /><div><p className="text-xs font-bold text-[#31525c]">Every scan is logged</p><p className="mt-1 text-[11px] leading-4 text-[#819193]">Traceable history for your team.</p></div></div></div>
  </div>;
}

function ResultPanel({ result }: { result: any }) {
  return <div className="space-y-5"><div className={`flex items-center justify-between rounded-xl border p-3 ${result.severity === 'HIGH' ? 'border-[#e5b8b2] bg-[#fff1ef]' : result.severity === 'MEDIUM' ? 'border-[#efd19c] bg-[#fff8e7]' : 'border-[#b9d9c6] bg-[#eef8f0]'}`}><div className="flex items-center gap-2 text-xs font-bold text-[#31525c]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#faf9f3]"><ShieldCheck size={15} className="text-[#438d76]" /></span>Analysis complete</div><SeverityPill severity={result.severity} /></div><div><div className="mb-2 flex items-center justify-between"><p className="font-mono-ui text-[9px] font-bold uppercase tracking-[.15em] text-[#849394]">Sanitized payload</p><span className="font-mono-ui text-[9px] text-[#97a4a0]">ID #{result.id}</span></div><pre data-testid="text-sanitized-result" className="max-h-[175px] overflow-auto whitespace-pre-wrap rounded-xl border border-[#dce3da] bg-[#eef4ec] p-4 font-mono-ui text-[11px] leading-5 text-[#356052]">{result.sanitizedText}</pre></div><div className="rounded-xl border border-[#e4e1d6] bg-[#f6f4eb] p-4"><p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#728586]"><CircleCheck size={14} className="text-[#438d76]" />Assessment</p><p className="text-xs leading-5 text-[#536b70]">{result.rationale}</p></div>{result.threats?.length > 0 && <div><p className="mb-2 font-mono-ui text-[9px] font-bold uppercase tracking-[.15em] text-[#849394]">Signals found · {result.threats.length}</p><div className="space-y-2">{result.threats.map((threat: any, i: number) => <div key={`${threat.type}-${i}`} className="rounded-xl border border-[#e5e2d9] p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[#31525c]">{threat.type}</span><SeverityPill severity={threat.severity} small /></div><p className="mt-1 font-mono-ui text-[10px] text-[#b05249]">{threat.value}</p><p className="mt-2 text-[11px] leading-4 text-[#7b8c8e]">{threat.rationale}</p></div>)}</div></div>}</div>;
}

function Reports() {
  const [filter, setFilter] = useState<'ALL' | Severity>('ALL');
  const logs = useGetAuditLogs(filter === 'ALL' ? { severity: 'ALL' } : { severity: filter });
  const options: ('ALL' | Severity)[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
  return <div className="space-y-7"><div className="animate-rise flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-[#3f8c70]"><span className="h-px w-7 bg-[#76c6a9]" />Accountability trail</div><h2 className="font-display text-[38px] font-bold leading-none tracking-[-.07em] text-[#183847] md:text-[46px]">Audit reports.</h2><p className="mt-3 text-sm leading-6 text-[#718488]">A durable record of the data your team caught before it could travel.</p></div><div className="flex items-center gap-1 rounded-xl border border-[#dddcd3] bg-[#faf9f3] p-1">{options.map((option) => <button key={option} onClick={() => setFilter(option)} data-testid={`button-filter-${option.toLowerCase()}`} className={`rounded-lg px-3 py-2 font-mono-ui text-[10px] font-bold uppercase tracking-[.08em] transition ${filter === option ? 'bg-[#183f4f] text-white' : 'text-[#71878a] hover:bg-[#eeece3]'}`}>{option === 'ALL' ? 'All' : severityStyles[option].label}</button>)}</div></div><section className="animate-rise delay-1 rounded-2xl border border-[#e1ded5] bg-[#faf9f3] paper-shadow"><div className="flex items-center justify-between border-b border-[#e7e4db] p-5"><div><p className="font-display text-lg font-bold text-[#183847]">{filter === 'ALL' ? 'All inspections' : `${severityStyles[filter].label} severity`}</p><p className="mt-1 text-xs text-[#7a8c8f]">{logs.data?.length ?? 0} logged payloads</p></div><div className="flex items-center gap-2 text-[10px] text-[#829394]"><Clock3 size={13} /> Sorted newest first</div></div><QueryState loading={logs.isLoading} error={logs.isError} onRetry={() => logs.refetch()} label="reports"><AuditTable rows={logs.data ?? []} /></QueryState></section></div>;
}

function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const register = useRegister();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const isRegistering = mode === 'register';
  const isPending = login.isPending || register.isPending;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const onSuccess = (session: { token: string }) => {
      window.localStorage.setItem('trustlens_token', session.token);
      setLocation('/');
    };
    if (isRegistering) {
      register.mutate(
        { data: { email, password } },
        { onSuccess, onError: () => setError('We couldn’t create that account. Try a different email or a stronger password.') },
      );
    } else {
      login.mutate(
        { data: { email, password } },
        { onSuccess, onError: () => setError('We couldn’t sign you in with those details.') },
      );
    }
  };
  return <div className="noise flex min-h-[100dvh] bg-[#f3f0e7]"><div className="hidden w-[46%] flex-col justify-between bg-[#112f40] p-10 text-[#edf6ed] lg:flex"><BrandMark /><div className="max-w-md"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#9ee1c9] text-[#143447]"><ShieldCheck size={23} /></div><h1 className="font-display text-[56px] font-bold leading-[.95] tracking-[-.08em]">See what’s<br /><span className="text-[#9ee1c9]">leaving.</span></h1><p className="mt-6 max-w-sm text-sm leading-6 text-[#a8c0bd]">TrustLens gives security-conscious teams a calm, high-signal place to catch sensitive data before it leaves the organization.</p><div className="mt-10 flex items-center gap-3 border-t border-[#315061] pt-5 text-[11px] text-[#a8c0bd]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#24495a]"><LockKeyhole size={13} className="text-[#9ee1c9]" /></span>Private by design · Built for focused teams</div></div><p className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-[#709096]">TRUSTLENS / SECURITY OBSERVABILITY</p></div><div className="flex flex-1 items-center justify-center px-6 py-12"><div className="w-full max-w-[390px] animate-rise"><div className="mb-10 lg:hidden"><BrandMark /></div><div className="mb-8"><p className="mb-3 font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-[#3f8c70]">{isRegistering ? 'Create workspace' : 'Secure entry'}</p><h2 className="font-display text-[34px] font-bold tracking-[-.07em] text-[#183847]">{isRegistering ? 'Start privately.' : 'Welcome back.'}</h2><p className="mt-2 text-sm text-[#718488]">{isRegistering ? 'Create a protected TrustLens workspace.' : 'Sign in to your protected workspace.'}</p></div><form onSubmit={submit} className="space-y-5"><div><label htmlFor="email" className="mb-2 block text-xs font-bold text-[#46646b]">Work email</label><input id="email" autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" placeholder="you@company.com" className="h-12 w-full rounded-xl border border-[#d8d9d1] bg-[#faf9f3] px-4 text-sm text-[#284b56] outline-none focus:border-[#65af93] focus:ring-2 focus:ring-[#c9e8d9]" /></div><div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-xs font-bold text-[#46646b]">Password</label>{!isRegistering && <button type="button" data-testid="button-forgot-password" className="text-[11px] font-semibold text-[#378166]">Forgot password?</button>}</div><input id="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} type="password" minLength={isRegistering ? 8 : undefined} required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" placeholder={isRegistering ? 'At least 8 characters' : 'Enter your password'} className="h-12 w-full rounded-xl border border-[#d8d9d1] bg-[#faf9f3] px-4 text-sm text-[#284b56] outline-none focus:border-[#65af93] focus:ring-2 focus:ring-[#c9e8d9]" /></div>{error && <div className="flex items-center gap-2 rounded-lg bg-[#fff0ed] px-3 py-2 text-xs text-[#a55047]"><CircleAlert size={14} />{error}</div>}<button type="submit" disabled={isPending} data-testid="button-submit-login" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#183f4f] text-sm font-bold text-white shadow-[0_4px_0_#0d2b38] transition hover:-translate-y-0.5 disabled:opacity-60">{isPending ? <RefreshCw size={15} className="animate-spin" /> : isRegistering ? <ShieldCheck size={15} /> : <LogIn size={15} />} {isPending ? (isRegistering ? 'Creating workspace…' : 'Signing in…') : (isRegistering ? 'Create TrustLens workspace' : 'Sign in to TrustLens')}</button></form><div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[#829394]"><KeyRound size={13} /> {isRegistering ? 'Your password is hashed before storage.' : 'SSO and passwordless sign-in coming soon'}</div><button type="button" onClick={() => { setMode(isRegistering ? 'login' : 'register'); setError(''); }} className="mx-auto mt-5 block text-xs font-semibold text-[#378166]">{isRegistering ? 'Already have an account? Sign in' : 'Need an account? Create one'}</button></div></div></div>;
}

function formatDate(date: string) { try { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date)); } catch { return date; } }

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem('trustlens_token');
    if (token) {
      setHasToken(true);
    } else {
      setLocation('/login');
    }
  }, [setLocation]);

  if (!hasToken) return null;
  return <>{children}</>;
}

function Router() {
  return <Switch><Route path="/login" component={Login} /><Route path="/"><ProtectedRoute><AppShell><Overview /></AppShell></ProtectedRoute></Route><Route path="/inspector"><ProtectedRoute><AppShell><Inspector /></AppShell></ProtectedRoute></Route><Route path="/reports"><ProtectedRoute><AppShell><Reports /></AppShell></ProtectedRoute></Route><Route component={NotFound} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;