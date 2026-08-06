import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getGetAuditLogsQueryKey, getGetAuditStatsQueryKey, setAuthTokenGetter, useAnalyzePayload, useGetAuditLogs, useGetAuditStats, useHealthCheck, useLogin, useRegister, useSendChatMessage } from '@workspace/api-client-react';
import { Activity, ArrowLeft, ArrowRight, BarChart3, Bot, Check, ChevronDown, ClipboardCheck, Clock3, Copy, Download, FileDown, FileSearch, FileText, Fingerprint, Gauge, KeyRound, LockKeyhole, LogIn, LogOut, Mail, Menu, MessageCircle, RefreshCw, Search, Send, ShieldCheck, ShieldAlert, Sparkles, Terminal, Timer, Upload, X, AlertTriangle, CircleAlert, CircleCheck, Info, UserRound } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Component, useEffect, useMemo, useState } from 'react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

setAuthTokenGetter(() => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('trustlens_token');
});

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
const severityStyles: Record<Severity, { pill: string; dot: string; label: string }> = {
  LOW: { pill: 'bg-[#123f53] text-[#62e9f0] border-[#26748d]', dot: 'bg-[#27cde2]', label: 'Low' },
  MEDIUM: { pill: 'bg-[#49351d] text-[#f3c36c] border-[#8a6330]', dot: 'bg-[#f2bd62]', label: 'Medium' },
  HIGH: { pill: 'bg-[#50253b] text-[#ff829b] border-[#933e5f]', dot: 'bg-[#f27491]', label: 'High' },
  CRITICAL: { pill: 'bg-[#382654] text-[#b48cff] border-[#6942a1]', dot: 'bg-[#a77bff]', label: 'Critical' },
};

function SeverityPill({ severity, small = false }: { severity: Severity; small?: boolean }) {
  const style = severityStyles[severity] ?? severityStyles.LOW;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 ${small ? 'py-0.5 text-[10px]' : 'py-1 text-[11px]'} font-mono-ui font-bold uppercase tracking-[.08em] ${style.pill}`} data-testid={`status-severity-${severity.toLowerCase()}`}><span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{style.label}</span>;
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5" data-testid="brand-trustlens"><div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#51d9ed] bg-[#102d58] text-[#5fe8f3] shadow-[0_0_22px_rgba(48,210,238,.25)]"><ShieldCheck size={19} strokeWidth={2.4} /><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-[#070f24] bg-[#8c7cff]" /></div>{!compact && <span className="font-display text-[20px] font-bold tracking-[-.06em] text-[#ecf5ff]">trust<span className="text-[#51d9ed]">lens</span></span>}</div>;
}

type StoredUser = { id?: number; email: string };

function getStoredUser(): StoredUser {
  const fallback = { email: 'security@trustlens.app' };
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem('trustlens_user');
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<StoredUser> | null;
    if (!parsed || typeof parsed.email !== 'string' || !parsed.email.trim()) return fallback;
    return {
      ...(typeof parsed.id === 'number' ? { id: parsed.id } : {}),
      email: parsed.email.trim(),
    };
  } catch {
    return fallback;
  }
}

function userLabel(user: StoredUser | null | undefined) {
  const localPart = user?.email?.split('@')[0] || 'security';
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'TrustLens user';
}

function userInitials(user: StoredUser | null | undefined) {
  const name = userLabel(user).split(' ');
  return name.slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || 'TL';
}

function ProfileMenu({ user, open, logoutPending, onToggle, onLogout }: {
  user: StoredUser;
  open: boolean;
  logoutPending: boolean;
  onToggle: () => void;
  onLogout: () => void;
}) {
  return <div className="relative flex items-center gap-2" data-profile-area="true">
    <button type="button" aria-label="Log out of TrustLens" data-testid="button-header-logout" onClick={onLogout} disabled={logoutPending} className="interactive-control relative z-10 hidden cursor-pointer items-center gap-1.5 rounded-lg border border-[#7c355a] bg-[#2b1633] px-2.5 py-2 text-[10px] font-bold text-[#ffb2c7] transition hover:border-[#ff6f9a] hover:bg-[#3b1c42] sm:flex">
      <LogOut size={13} /> {logoutPending ? 'Signing out…' : 'Log out'}
    </button>
    <button type="button" aria-label="Open profile menu" aria-expanded={open} data-testid="button-profile" onClick={onToggle} className={`interactive-control relative z-10 flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-2 rounded-xl p-1 transition hover:bg-[#e9e6dd] ${open ? 'bg-[#e9e6dd]' : ''}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#d6ad77] text-[10px] font-bold text-[#273c45] transition ${open ? 'scale-110 shadow-[0_0_16px_rgba(65,217,255,.45)]' : ''}`}>{userInitials(user)}</div>
      <ChevronDown size={14} className={`text-[#58737a] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div role="menu" data-testid="profile-menu" className="profile-menu-enter absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-[#254778] bg-[#09142d] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.3)]">
      <div className="border-b border-[#1b3760] px-3 py-2.5">
        <p className="flex items-center gap-2 text-xs font-bold text-[#eef6ff]"><UserRound size={13} className="text-[#5fe1ff]" />{userLabel(user)}</p>
        <p className="mt-1 truncate text-[10px] text-[#7893ba]">{user?.email ?? 'Protected workspace'}</p>
      </div>
      <button type="button" role="menuitem" data-testid="button-logout" onClick={onLogout} disabled={logoutPending} className="interactive-control relative z-10 mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-[#ff9bb8] transition hover:bg-[#2b1633] disabled:cursor-wait disabled:opacity-70">
        {logoutPending ? <><RefreshCw size={14} className="animate-spin" /> Signing out…</> : <><LogOut size={14} /> Log out</>}
      </button>
    </div>}
  </div>;
}

function Sidebar({ mobileOpen, setMobileOpen, user, profileOpen, logoutPending, onToggleProfile, onLogout }: {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  user: StoredUser;
  profileOpen: boolean;
  logoutPending: boolean;
  onToggleProfile: () => void;
  onLogout: () => void;
}) {
  const [location] = useLocation();
  const nav = [{ href: '/', label: 'Overview', icon: Gauge }, { href: '/inspector', label: 'Inspector', icon: FileSearch }, { href: '/reports', label: 'Audit reports', icon: BarChart3 }, { href: '/assistant', label: 'Security assistant', icon: MessageCircle }];
  return <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col bg-[#112f40] text-[#e5f0ed] transition-transform duration-300 md:relative md:translate-x-0`} data-testid="sidebar">
    <div className="flex h-[84px] items-center border-b border-[#315061] px-7"><BrandMark /></div>
    <div className="px-5 pt-8"><p className="mb-3 px-3 font-mono-ui text-[9px] font-bold uppercase tracking-[.2em] text-[#91abb0]">Workspace</p>
      <nav className="space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`} className={`group flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] font-semibold transition-colors ${location === href ? 'bg-[#24495a] text-[#a5e4ce]' : 'text-[#b6cacb] hover:bg-[#1b3c4d] hover:text-[#f1faf4]'}`}><Icon size={17} strokeWidth={location === href ? 2.2 : 1.8} /><span>{label}</span>{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#9ee1c9]" />}</Link>)}</nav>
    </div>
    <div className="mt-auto border-t border-[#315061] p-5"><div className="rounded-xl border border-[#315061] bg-[#183b4c] p-3.5"><div className="mb-3 flex items-center justify-between"><span className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-[#91abb0]">System status</span><span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9ee1c9]"><span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[#9ee1c9]" />Operational</span></div><div className="flex items-center gap-2 text-[11px] text-[#b6cacb]"><Activity size={13} /> All inspection services online</div></div><div className="relative mt-5" data-profile-area="true"><button type="button" aria-label="Open profile menu" aria-expanded={profileOpen} data-testid="button-sidebar-profile" onClick={onToggleProfile} className={`interactive-control flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-[#1b3c4d] ${profileOpen ? 'bg-[#1b3c4d]' : ''}`}><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d6ad77] text-[11px] font-bold text-[#273c45]">{userInitials(user)}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#eef6ef]">{userLabel(user)}</p><p className="truncate text-[10px] text-[#91abb0]">{user.email}</p></div><ChevronDown size={14} className={`ml-auto text-[#91abb0] transition-transform ${profileOpen ? 'rotate-180' : ''}`} /></button>{profileOpen && <div className="profile-menu-enter absolute bottom-12 left-0 z-50 w-56 overflow-hidden rounded-xl border border-[#254778] bg-[#09142d] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.3)]"><div className="border-b border-[#1b3760] px-3 py-2.5"><p className="text-xs font-bold text-[#eef6ff]">{userLabel(user)}</p><p className="mt-1 truncate text-[10px] text-[#7893ba]">{user.email}</p></div><button type="button" role="menuitem" data-testid="button-sidebar-logout" onClick={onLogout} disabled={logoutPending} className="interactive-control mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-[#ff9bb8] transition hover:bg-[#2b1633] disabled:cursor-wait disabled:opacity-70">{logoutPending ? <><RefreshCw size={14} className="animate-spin" /> Signing out…</> : <><LogOut size={14} /> Log out</>}</button></div>}</div></div>
  </aside>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [backPending, setBackPending] = useState(false);
  const [user] = useState<StoredUser>(() => getStoredUser());
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const title = location === '/inspector' ? 'Payload inspector' : location === '/reports' ? 'Audit reports' : location === '/assistant' ? 'Security assistant' : 'Overview';
  const goBack = () => {
    if (backPending) return;
    setBackPending(true);
    if (window.history.length > 1) {
      window.setTimeout(() => window.history.back(), 140);
    } else {
      window.setTimeout(() => setLocation('/'), 140);
    }
  };
   const logout = () => {
    if (logoutPending) return;
    setLogoutPending(true);
     window.localStorage.removeItem('trustlens_token');
     window.localStorage.removeItem('trustlens_user');
     queryClient.clear();
     setProfileOpen(false);
     setLocation('/login');
  };
  useEffect(() => {
    if (!profileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-profile-area="true"]')) setProfileOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [profileOpen]);
  return <div className="noise flex min-h-[100dvh] bg-[#f3f0e7]"><Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} user={user} profileOpen={profileOpen} logoutPending={logoutPending} onToggleProfile={() => setProfileOpen((open) => !open)} onLogout={logout} />{mobileOpen && <button aria-label="Close navigation" data-testid="button-close-navigation" className="fixed inset-0 z-30 bg-[#112f40]/40 md:hidden" onClick={() => setMobileOpen(false)} /> }
      <main className="min-w-0 flex-1"><header className="relative z-40 flex h-[84px] items-center justify-between border-b border-[#dedbd1] bg-[#f8f6ef]/90 px-5 backdrop-blur md:px-10"><div className="flex min-w-0 items-center gap-2 md:gap-3"><button aria-label="Go back" data-testid="button-go-back" className={`interactive-control flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#254778] bg-[#09142d] text-[#91b5dc] transition hover:-translate-x-0.5 hover:border-[#41d9ff] hover:text-[#5fe1ff] ${backPending ? 'pointer-events-none scale-90 border-[#41d9ff] text-[#5fe1ff]' : ''}`} onClick={goBack}>{backPending ? <RefreshCw size={16} className="animate-spin" /> : <ArrowLeft size={17} />}</button><button aria-label="Open navigation" data-testid="button-open-navigation" className="rounded-lg p-2 text-[#42606a] hover:bg-[#e8e5db] md:hidden" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="min-w-0"><p className="font-mono-ui text-[9px] font-bold uppercase tracking-[.2em] text-[#799098]">TrustLens / {title}</p><h1 className="mt-1 truncate font-display text-[22px] font-bold text-[#183847]">{title}</h1></div></div><div className="flex items-center gap-2 md:gap-3"><Link href="/assistant" data-testid="link-header-assistant" className="interactive-control flex items-center gap-2 rounded-xl border border-[#26748d] bg-[#123f53] px-3 py-2 text-[11px] font-bold text-[#62e9f0] shadow-[0_0_18px_rgba(39,205,226,.14)] hover:-translate-y-0.5 hover:border-[#41d9ff] hover:text-white"><MessageCircle size={14} /><span className="hidden sm:inline">Ask TrustLens</span><span className="sm:hidden">Ask</span></Link><div className="hidden items-center gap-2 rounded-full border border-[#ddd9ce] bg-[#fdfbf5] px-3 py-1.5 text-[10px] font-semibold text-[#58737a] lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#53a47d]" />Protected workspace</div><button data-testid="button-help" aria-label="Help" className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#dcd9d0] text-[#58737a] hover:bg-[#e9e6dd] sm:flex"><Info size={15} /></button><ProfileMenu user={user} open={profileOpen} logoutPending={logoutPending} onToggle={() => setProfileOpen((open) => !open)} onLogout={logout} /></div></header><div className="mx-auto max-w-[1440px] p-5 md:p-10">{children}</div><Link href="/assistant" data-testid="button-floating-assistant" aria-label="Open TrustLens security assistant" className="interactive-control fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-[#41d9ff] bg-[#102d58] px-4 py-3 text-xs font-bold text-[#effaff] shadow-[0_0_28px_rgba(39,205,226,.3)] hover:-translate-y-1 hover:bg-[#163d78]"><MessageCircle size={16} /><span>Ask TrustLens</span></Link></main>
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
  const entries = Array.isArray(timeline)
    ? timeline.filter((entry) => entry && typeof entry === 'object')
    : [];
  const data = entries.length ? entries : [{ label: 'Mon', scans: 0, risk: 0 }, { label: 'Tue', scans: 0, risk: 0 }, { label: 'Wed', scans: 0, risk: 0 }, { label: 'Thu', scans: 0, risk: 0 }, { label: 'Fri', scans: 0, risk: 0 }];
  const max = Math.max(...data.map((x) => x.scans), 1);
  return <div className="flex h-[190px] items-end gap-3 px-2 pb-7 pt-3">{data.slice(-7).map((item, i) => <div className="group relative flex h-full flex-1 flex-col justify-end" key={`${item.label}-${i}`}><div className="absolute bottom-[28px] left-1/2 h-[2px] w-full -translate-x-1/2 bg-[#b3dbc9]/70" /><div className="relative z-10 mx-auto w-full max-w-[28px] rounded-t-md bg-[#72bda4] transition-all duration-300 group-hover:bg-[#2f856c]" style={{ height: `${Math.max(8, (item.scans / max) * 112)}px` }}><span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono-ui text-[9px] font-bold text-[#4d7777] opacity-0 transition-opacity group-hover:opacity-100">{item.scans}</span></div><span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono-ui text-[9px] text-[#8b9b9d]">{item.label}</span></div>)}</div>;
}

function Overview() {
  const stats = useGetAuditStats();
  const logs = useGetAuditLogs({ severity: 'ALL' });
  const health = useHealthCheck();
  const stat = stats.data;
  const logRows = Array.isArray(logs.data) ? logs.data : [];
  return <div className="space-y-7"><div className="animate-rise flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-[#3f8c70]"><span className="h-px w-7 bg-[#76c6a9]" />Live signal</div><h2 className="font-display max-w-xl text-[36px] font-bold leading-[1.02] tracking-[-.07em] text-[#183847] md:text-[48px]">Keep private data<br /><span className="text-[#438d76]">inside the lines.</span></h2><p className="mt-4 max-w-lg text-sm leading-6 text-[#718488]">A clear view of every payload your team inspects, every risk caught, and every redaction made before data travels.</p></div><Link href="/inspector" data-testid="link-open-inspector" className="group flex w-fit items-center gap-2 rounded-xl bg-[#183f4f] px-4 py-3 text-xs font-bold text-[#f6f4eb] shadow-[0_5px_0_#0d2b38] transition hover:-translate-y-0.5 hover:shadow-[0_7px_0_#0d2b38]"><FileSearch size={15} /> Open inspector <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></Link></div>
    <QueryState loading={stats.isLoading} error={stats.isError} onRetry={() => stats.refetch()} label="metrics"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total scans" value={stat?.totalScans ?? 0} detail="Across your workspace" icon={ClipboardCheck} /><MetricCard label="PII intercepted" value={stat?.piiIntercepted ?? 0} detail="Sensitive values redacted" icon={Fingerprint} tone="amber" /><MetricCard label="Privacy score" value={`${stat?.averagePrivacyScore ?? 100}/100`} detail="Average payload safety" icon={ShieldCheck} tone={(stat?.averagePrivacyScore ?? 100) < 60 ? 'coral' : 'teal'} /><MetricCard label="Protected" value={`${stat?.protectedPercent ?? 100}%`} detail="Scans scoring 80 or higher" icon={ShieldAlert} tone={(stat?.protectedPercent ?? 100) < 70 ? 'coral' : 'teal'} /></div></QueryState>
    <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><section className="animate-rise delay-1 rounded-2xl border border-[#e1ded5] bg-[#faf9f3] p-5 paper-shadow"><div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold text-[#183847]">Inspection activity</p><p className="mt-1 text-xs text-[#7a8c8f]">Scans and weighted risk over the last 7 days</p></div><div className="flex items-center gap-3 font-mono-ui text-[9px] uppercase tracking-[.1em] text-[#6f8589]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#72bda4]" />Scans</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#b3dbc9]" />Risk</span></div></div>{stats.isLoading ? <Skeleton className="mt-5 h-[190px]" /> : <MiniTimeline timeline={stat?.timeline ?? []} />}</section>
       <section className="animate-rise delay-2 rounded-2xl border border-[#e1ded5] bg-[#183f4f] p-5 text-[#f4f5eb] shadow-[0_12px_30px_rgba(24,63,79,.12)]"><div className="flex items-center justify-between"><p className="font-display text-lg font-bold">Severity mix</p><BarChart3 size={17} className="text-[#9ee1c9]" /></div><p className="mt-1 text-xs text-[#9db5b4]">Prioritized signals from recent scans</p><div className="mt-7 space-y-4">{(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((key) => { const style = severityStyles[key] ?? severityStyles.LOW; const count = stat?.severityCounts?.[key] ?? 0; const counts = stat?.severityCounts ? Object.values(stat.severityCounts) : []; const total = counts.reduce((a, b) => a + b, 0); return <div key={key}><div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${style.dot}`} />{style.label}</span><span className="font-mono-ui text-[10px] text-[#c2d6d0]">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#2a5563]"><div className={`h-full rounded-full ${style.dot}`} style={{ width: `${total ? (count / total) * 100 : 3}%` }} /></div></div>; })}</div><Link href="/reports" data-testid="link-view-reports" className="mt-8 flex items-center justify-between border-t border-[#315b67] pt-4 text-xs font-semibold text-[#a5e4ce]">View full audit history <ArrowRight size={14} /></Link></section></div>
    <section className="animate-rise delay-3 rounded-2xl border border-[#e1ded5] bg-[#faf9f3] paper-shadow"><div className="flex flex-col gap-3 border-b border-[#e7e4db] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-display text-lg font-bold text-[#183847]">Recent audit activity</p><p className="mt-1 text-xs text-[#7a8c8f]">Most recent payload inspections across your team</p></div><Link href="/reports" data-testid="link-see-all-audits" className="flex items-center gap-1 text-xs font-bold text-[#328166]">See all <ArrowRight size={13} /></Link></div><QueryState loading={logs.isLoading} error={logs.isError} onRetry={() => logs.refetch()} label="audit activity"><AuditTable rows={logRows.slice(0, 5)} compact /></QueryState></section>
    <div className="flex items-center gap-2 text-[10px] text-[#8b9998]"><span className={`h-1.5 w-1.5 rounded-full ${health.isError ? 'bg-[#c9685e]' : 'bg-[#53a47d]'}`} /> API {health.isError ? 'connection unavailable' : 'connected'} · Last checked just now</div>
  </div>;
}

function AuditTable({ rows, compact = false }: { rows: any[]; compact?: boolean }) {
  const safeRows = Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
  if (!safeRows.length) return <div className="flex flex-col items-center justify-center px-6 py-14 text-center"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#e6f0eb] text-[#3b896f]"><Search size={18} /></div><p className="font-semibold text-[#31505b]">No inspections yet</p><p className="mt-1 text-xs text-[#7b8d8e]">Run your first payload through the inspector.</p><Link href="/inspector" data-testid="link-empty-start-inspection" className="mt-4 rounded-lg bg-[#183f4f] px-3 py-2 text-xs font-semibold text-white">Start inspection</Link></div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-[#e7e4db] font-mono-ui text-[9px] uppercase tracking-[.14em] text-[#8a9a9b]"><th className="px-5 py-3 font-bold">Payload preview</th><th className="px-3 py-3 font-bold">Severity</th><th className="px-3 py-3 font-bold">Privacy</th><th className="px-3 py-3 font-bold">Signals</th><th className="px-3 py-3 font-bold">Time</th><th className="px-5 py-3 text-right font-bold">Inspected</th></tr></thead><tbody>{safeRows.map((row, i) => <tr key={row.id ?? i} data-testid={`row-audit-${row.id ?? i}`} className="border-b border-[#ebe8df] last:border-0 transition-colors hover:bg-[#f5f3eb]"><td className="max-w-[300px] px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#e6f0eb] text-[#438d76]"><Terminal size={13} /></div><span className="truncate font-mono-ui text-[11px] text-[#385762]">{row.preview ?? 'Inspection'}</span></div></td><td className="px-3 py-4"><SeverityPill severity={row.severity} small /></td><td className="px-3 py-4"><span className={`font-mono-ui text-xs font-bold ${row.privacyScore < 60 ? 'text-[#a55047]' : row.privacyScore < 80 ? 'text-[#986822]' : 'text-[#287459]'}`}>{row.privacyScore ?? 100}</span><span className="text-[10px] text-[#849394]">/100</span></td><td className="px-3 py-4 font-mono-ui text-xs text-[#506c73]">{row.threatCount ?? 0}</td><td className="px-3 py-4 font-mono-ui text-xs text-[#506c73]">{row.processingTimeMs ?? 0}ms</td><td className="px-5 py-4 text-right text-[11px] text-[#849394]">{formatDate(row.createdAt ?? '')}</td></tr>)}</tbody></table></div>;
}

function downloadReport(result: any) {
  const lines = [
    'TrustLens — Sanitized inspection report',
    `Inspection #${result.id}`,
    `Severity: ${result.severity}`,
    `Privacy score: ${result.privacyScore}/100`,
    `Processing time: ${result.processingTimeMs}ms`,
    '',
    'PROTECTED PAYLOAD',
    result.sanitizedText,
    '',
    'WHY THIS WAS DETECTED',
    result.rationale,
    '',
    'DETECTED SIGNALS',
    ...(result.threats?.length
      ? result.threats.map((threat: any) => `${threat.type} — ${threat.confidence}% confidence — ${threat.severity}\n${threat.value}\n${threat.rationale}`)
      : ['No sensitive signals detected.']),
    '',
    'COMPLIANCE MAPPING',
    ...(result.compliance?.length ? result.compliance : ['No compliance frameworks mapped.']),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `trustlens-inspection-${result.id}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadPdfReport(result: any) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const width = 595 - margin * 2;
  let y = 54;
  const addHeading = (text: string) => {
    doc.setTextColor(24, 63, 79);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(text, margin, y);
    y += 24;
  };
  const addText = (text: string, size = 10, color: [number, number, number] = [83, 107, 112]) => {
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text || '—'), width);
    for (const line of lines) {
      if (y > 760) {
        doc.addPage();
        y = 54;
      }
      doc.text(line, margin, y);
      y += size + 5;
    }
    y += 6;
  };
  doc.setFillColor(17, 47, 64);
  doc.rect(0, 0, 595, 110, 'F');
  doc.setTextColor(158, 225, 201);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('trustlens', margin, 55);
  doc.setTextColor(237, 246, 237);
  doc.setFontSize(11);
  doc.text('Sanitized inspection report', margin, 78);
  y = 145;
  addHeading(`Inspection #${result.id}`);
  addText(`Severity: ${result.severity}   ·   Privacy score: ${result.privacyScore}/100   ·   Processing time: ${result.processingTimeMs}ms`, 10, [63, 140, 112]);
  addHeading('Protected payload');
  addText(result.sanitizedText, 9, [53, 96, 82]);
  addHeading('Why this was detected');
  addText(result.rationale);
  addHeading('Detected signals');
  if (result.threats?.length) {
    result.threats.forEach((threat: any) => {
      addText(`${threat.type} · ${threat.severity} · ${threat.confidence}% confidence`, 10, [49, 82, 92]);
      addText(`${threat.value}\n${threat.rationale}`, 9);
    });
  } else {
    addText('No sensitive signals detected.');
  }
  addHeading('Compliance mapping');
  addText(result.compliance?.length ? result.compliance.join(' · ') : 'No compliance frameworks mapped.');
  doc.save(`trustlens-inspection-${result.id}.pdf`);
}

async function extractPdfText(file: File) {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('PDFs must be smaller than 25 MB.');
  }
  const document = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  const text = pages.join('\n\n').trim();
  if (!text) {
    throw new Error('This PDF does not contain selectable text. Try a text-based PDF or paste the content manually.');
  }
  return text;
}

function Inspector() {
  const [payload, setPayload] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [pdfName, setPdfName] = useState('');
  const [pdfStatus, setPdfStatus] = useState('');
  const analyze = useAnalyzePayload();
  useEffect(() => {
    if (!analyze.isPending) {
      setScanStep(4);
      return;
    }
    setScanStep(0);
    const timer = window.setInterval(() => setScanStep((step) => Math.min(step + 1, 3)), 550);
    return () => window.clearInterval(timer);
  }, [analyze.isPending]);
  const handleAnalyze = () => {
    if (!payload.trim() || analyze.isPending) return;
    analyze.mutate({ data: { payloadText: payload } }, {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: getGetAuditLogsQueryKey({ severity: 'ALL' }) });
        queryClient.invalidateQueries({ queryKey: getGetAuditStatsQueryKey() });
      },
    });
  };
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfStatus('Choose a PDF file to import.');
      return;
    }
    setPdfName(file.name);
    setPdfStatus('Extracting text from PDF…');
    try {
      const text = await extractPdfText(file);
      setPayload(text);
      setResult(null);
      setPdfStatus(`Imported ${text.length.toLocaleString()} characters from ${file.name}.`);
    } catch (error) {
      setPdfStatus(error instanceof Error ? error.message : 'Could not read this PDF.');
    }
  };
  const copy = async () => { if (!result) return; await navigator.clipboard?.writeText(result.sanitizedText); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return <div className="space-y-7"><div className="animate-rise"><div className="mb-3 flex items-center gap-2 font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-[#3f8c70]"><span className="h-px w-7 bg-[#76c6a9]" />Before it leaves</div><h2 className="font-display text-[38px] font-bold leading-none tracking-[-.07em] text-[#183847] md:text-[46px]">Inspect a payload.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#718488]">Paste a request body, log line, or freeform text. TrustLens identifies sensitive values, explains the exact match, and returns a safe-to-share version.</p></div>
     <div className="grid gap-5 xl:grid-cols-[1fr_1fr]"><section className="signal-grid animate-rise delay-1 rounded-2xl border border-[#dcded5] bg-[#f8f8f0] p-5 paper-shadow"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#dcefe5] text-[#2b7a5c]"><Terminal size={14} /></span><div><p className="text-sm font-bold text-[#254956]">Input payload</p><p className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#8a9b9a]">Paste text or import a PDF · inspected privately</p></div></div><span className="font-mono-ui text-[10px] text-[#8a9b9a]">{payload.length} chars</span></div><textarea value={payload} onChange={(e) => setPayload(e.target.value)} data-testid="input-payload" placeholder={'Paste a payload here…\n\nExample: {"email":"maya@northstar.io","token":"sk_live_…"}'} className="h-[300px] w-full resize-none rounded-xl border border-[#d7ddd5] bg-[#fcfcf6] p-4 font-mono-ui text-[12px] leading-6 text-[#315462] outline-none transition-colors placeholder:text-[#a4b0aa] focus:border-[#65af93] focus:ring-2 focus:ring-[#bde5d3]" /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label htmlFor="pdf-upload" data-testid="button-upload-pdf" className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#cfded4] bg-[#eef5ed] px-3 py-2 text-[11px] font-bold text-[#477269] transition hover:border-[#91c8aa] hover:bg-[#e4f1e6]"><Upload size={14} /> Import PDF<input id="pdf-upload" type="file" accept="application/pdf,.pdf" onChange={handlePdfUpload} className="sr-only" /></label><span className="flex items-center gap-1.5 text-[10px] text-[#829394]">{pdfName ? <><FileText size={13} /> {pdfName}</> : 'PDF text is extracted in your browser'}</span></div>{pdfStatus && <p className={`mt-2 text-[11px] ${pdfStatus.startsWith('Could') || pdfStatus.startsWith('Choose') || pdfStatus.startsWith('PDFs') ? 'text-[#a55047]' : 'text-[#477269]'}`}>{pdfStatus}</p>}<div className="mt-4 flex items-center justify-between"><button data-testid="button-clear-payload" onClick={() => { setPayload(''); setResult(null); setPdfName(''); setPdfStatus(''); }} className="text-xs font-semibold text-[#789092] hover:text-[#315762]">Clear</button><button data-testid="button-analyze-payload" onClick={handleAnalyze} disabled={!payload.trim() || analyze.isPending} className="flex items-center gap-2 rounded-xl bg-[#183f4f] px-4 py-3 text-xs font-bold text-[#f6f4eb] shadow-[0_4px_0_#0d2b38] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45">{analyze.isPending ? <><RefreshCw size={14} className="animate-spin" /> Analyzing…</> : <><Sparkles size={14} /> Analyze payload <ArrowRight size={14} /></>}</button></div>{analyze.isError && <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#fff0ed] px-3 py-2 text-xs text-[#a55047]"><CircleAlert size={14} /> Analysis failed. Check the payload and try again.</div>}</section>
       <section className="animate-rise delay-2 min-h-[450px] rounded-2xl border border-[#e1ded5] bg-[#faf9f3] p-5 paper-shadow"><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-bold text-[#254956]">Inspection result</p><p className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#8a9b9a]">Explainable redacted output</p></div>{result && <div className="flex items-center gap-2"><button onClick={() => downloadReport(result)} data-testid="button-download-txt" className="flex items-center gap-1.5 rounded-lg border border-[#d8ded7] px-2.5 py-1.5 text-[10px] font-bold text-[#4b7775] hover:bg-[#eef4ed]"><Download size={12} /> TXT</button><button onClick={() => downloadPdfReport(result)} data-testid="button-download-pdf" className="flex items-center gap-1.5 rounded-lg border border-[#d8ded7] px-2.5 py-1.5 text-[10px] font-bold text-[#4b7775] hover:bg-[#eef4ed]"><FileDown size={12} /> PDF</button><button onClick={copy} data-testid="button-copy-sanitized" className="flex items-center gap-1.5 rounded-lg border border-[#d8ded7] px-2.5 py-1.5 text-[10px] font-bold text-[#4b7775] hover:bg-[#eef4ed]">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy safe'}</button></div>}</div>{!result && !analyze.isPending && <div className="flex min-h-[370px] flex-col items-center justify-center text-center"><div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-[#bcd6c9] bg-[#edf5ee] text-[#64a58b]"><LockKeyhole size={25} /><span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#faf9f3] bg-[#e3b652]" /></div><p className="font-display text-lg font-bold text-[#31525c]">Nothing inspected yet</p><p className="mt-2 max-w-[250px] text-xs leading-5 text-[#829393]">Your before-and-after result, confidence, and plain-language explanation will appear here.</p></div>}{analyze.isPending && <div className="space-y-4 pt-5"><div className="rounded-xl border border-[#dce5db] bg-[#eef5ed] p-4"><div className="mb-3 flex items-center justify-between"><span className="font-mono-ui text-[10px] font-bold uppercase tracking-[.12em] text-[#438d76]">Scanning securely</span><span className="font-mono-ui text-[10px] text-[#71908a]">{Math.min(scanStep * 25 + 25, 100)}%</span></div><div className="mb-4 h-2 overflow-hidden rounded-full bg-[#d4e7d9]"><div className="h-full rounded-full bg-[#4ca177] transition-all duration-500" style={{ width: `${Math.min(scanStep * 25 + 25, 100)}%` }} /></div><div className="grid grid-cols-2 gap-2 text-[11px] text-[#57766f]">{['Emails', 'API keys', 'Cards', 'Secrets'].map((label, index) => <span key={label} className="flex items-center gap-1.5">{scanStep > index ? <Check size={13} className="text-[#3c926c]" /> : <span className="h-3 w-3 rounded-full border border-[#9fc9ad]" />}{label}</span>)}</div></div><Skeleton className="h-24 w-full" /><Skeleton className="h-28 w-full" /></div>}{result && <ResultPanel result={result} payload={payload} />}</section></div>
     <div className="grid gap-4 md:grid-cols-3"><div className="flex items-start gap-3 rounded-xl border border-[#dedfd5] bg-[#f8f7f0] p-4"><LockKeyhole size={16} className="mt-0.5 text-[#438d76]" /><div><p className="text-xs font-bold text-[#31525c]">Server-side privacy</p><p className="mt-1 text-[11px] leading-4 text-[#819193]">The AI key stays behind the API boundary.</p></div></div><div className="flex items-start gap-3 rounded-xl border border-[#dedfd5] bg-[#f8f7f0] p-4"><Fingerprint size={16} className="mt-0.5 text-[#c18a32]" /><div><p className="text-xs font-bold text-[#31525c]">Supported signals</p><p className="mt-1 text-[11px] leading-4 text-[#819193]">API keys, JWTs, cards, email, phone, IP, and more.</p></div></div><div className="flex items-start gap-3 rounded-xl border border-[#dedfd5] bg-[#f8f7f0] p-4"><ClipboardCheck size={16} className="mt-0.5 text-[#438d76]" /><div><p className="text-xs font-bold text-[#31525c]">Every scan is logged</p><p className="mt-1 text-[11px] leading-4 text-[#819193]">Traceable history with score and processing time.</p></div></div></div>
     <section className="rounded-2xl border border-[#e1ded5] bg-[#faf9f3] p-5 paper-shadow"><div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold text-[#183847]">Supported sensitive types</p><p className="mt-1 text-xs text-[#7a8c8f]">Pattern families TrustLens prioritizes</p></div><ShieldCheck size={18} className="text-[#438d76]" /></div><div className="mt-4 flex flex-wrap gap-2">{['API keys', 'Passwords', 'JWT', 'Credit cards', 'Emails', 'Phone', 'IP address', 'Bank account', 'Person name', 'Location'].map((label) => <span key={label} className="rounded-full border border-[#d8e2d8] bg-[#eef5ed] px-3 py-1.5 text-[10px] font-semibold text-[#477269]">{label}</span>)}</div></section>
  </div>;
}

function ResultPanel({ result, payload }: { result: any; payload: string }) {
  const score = result.privacyScore ?? 100;
  const scoreTone = score < 60 ? 'text-[#a55047]' : score < 80 ? 'text-[#986822]' : 'text-[#287459]';
  return <div className="space-y-5"><div className={`flex items-center justify-between rounded-xl border p-3 ${result.severity === 'CRITICAL' ? 'border-[#cfafd9] bg-[#f8effb]' : result.severity === 'HIGH' ? 'border-[#e5b8b2] bg-[#fff1ef]' : result.severity === 'MEDIUM' ? 'border-[#efd19c] bg-[#fff8e7]' : 'border-[#b9d9c6] bg-[#eef8f0]'}`}><div className="flex items-center gap-2 text-xs font-bold text-[#31525c]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#faf9f3]"><ShieldCheck size={15} className="text-[#438d76]" /></span>Analysis complete</div><div className="flex items-center gap-2"><span className={`font-mono-ui text-xs font-bold ${scoreTone}`}>{score}/100 privacy</span><SeverityPill severity={result.severity} /></div></div><div className="rounded-xl border border-[#dfe4d9] bg-[#f7faf4] p-4"><div className="mb-2 flex items-center justify-between"><div><p className="font-display text-lg font-bold text-[#244d56]">Privacy score</p><p className="text-[11px] text-[#718789]">Higher is safer · risk is weighted by severity</p></div><span className={`font-display text-3xl font-bold ${scoreTone}`}>{score}</span></div><div className="h-3 overflow-hidden rounded-full bg-[#e0e9dc]"><div className={`h-full rounded-full transition-all duration-700 ${score < 60 ? 'bg-[#c9685e]' : score < 80 ? 'bg-[#d99a37]' : 'bg-[#4ca177]'}`} style={{ width: `${score}%` }} /></div></div><div><div className="mb-2 flex items-center justify-between"><p className="font-mono-ui text-[9px] font-bold uppercase tracking-[.15em] text-[#849394]">Before vs after</p><span className="font-mono-ui text-[9px] text-[#97a4a0]">ID #{result.id}</span></div><div className="grid gap-3 md:grid-cols-2"><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.1em] text-[#a55047]">Original</p><pre className="h-[145px] overflow-auto whitespace-pre-wrap rounded-xl border border-[#ead2cc] bg-[#fff5f2] p-3 font-mono-ui text-[10px] leading-5 text-[#80544d]">{payload}</pre></div><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.1em] text-[#287459]">Protected</p><pre data-testid="text-sanitized-result" className="h-[145px] overflow-auto whitespace-pre-wrap rounded-xl border border-[#dce3da] bg-[#eef4ec] p-3 font-mono-ui text-[10px] leading-5 text-[#356052]">{result.sanitizedText}</pre></div></div></div><div className="rounded-xl border border-[#e4e1d6] bg-[#f6f4eb] p-4"><p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#728586]"><CircleCheck size={14} className="text-[#438d76]" />Why this was detected</p><p className="text-xs leading-5 text-[#536b70]">{result.rationale}</p></div>{result.threats?.length > 0 && <div><p className="mb-2 font-mono-ui text-[9px] font-bold uppercase tracking-[.15em] text-[#849394]">Detected signals · {result.threats.length}</p><div className="space-y-2">{result.threats.map((threat: any, i: number) => <div key={`${threat.type}-${i}`} className="rounded-xl border border-[#e5e2d9] bg-[#fcfbf6] p-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-xs font-bold text-[#31525c]">{threat.type}</span><span className="font-mono-ui text-[10px] font-bold text-[#438d76]">{threat.confidence}%</span></div><SeverityPill severity={threat.severity} small /></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-[#e5e6dc]"><div className="h-full rounded-full bg-[#72bda4]" style={{ width: `${threat.confidence}%` }} /></div><p className="mt-2 font-mono-ui text-[10px] text-[#b05249]">{threat.value}</p><p className="mt-2 text-[11px] leading-4 text-[#667d7f]">{threat.rationale}</p>{threat.compliance?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{threat.compliance.map((item: string) => <span key={item} className="rounded-full bg-[#e7f1e8] px-2 py-1 text-[9px] font-semibold text-[#477269]">{item}</span>)}</div>}</div>)}</div></div>}{result.compliance?.length > 0 && <div className="rounded-xl border border-[#d8e2d8] bg-[#eef5ed] p-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#477269]">Compliance mapping</p><div className="flex flex-wrap gap-2">{result.compliance.map((item: string) => <span key={item} className="flex items-center gap-1.5 rounded-full border border-[#c8dfcf] bg-white/60 px-2.5 py-1.5 text-[10px] font-semibold text-[#3b765f]"><Check size={11} />{item}</span>)}</div></div>}<div className="flex items-center gap-3 font-mono-ui text-[10px] text-[#829394]"><Timer size={13} /> Scan completed in {result.processingTimeMs}ms · persisted to audit history</div></div>;
}

function Reports() {
  const [filter, setFilter] = useState<'ALL' | Severity>('ALL');
  const logs = useGetAuditLogs(filter === 'ALL' ? { severity: 'ALL' } : { severity: filter });
  const options: ('ALL' | Severity)[] = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  return <div className="space-y-7"><div className="animate-rise flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-[#3f8c70]"><span className="h-px w-7 bg-[#76c6a9]" />Accountability trail</div><h2 className="font-display text-[38px] font-bold leading-none tracking-[-.07em] text-[#183847] md:text-[46px]">Audit reports.</h2><p className="mt-3 text-sm leading-6 text-[#718488]">A durable record of the data your team caught before it could travel.</p></div><div className="flex items-center gap-1 rounded-xl border border-[#dddcd3] bg-[#faf9f3] p-1">{options.map((option) => <button key={option} onClick={() => setFilter(option)} data-testid={`button-filter-${option.toLowerCase()}`} className={`rounded-lg px-3 py-2 font-mono-ui text-[10px] font-bold uppercase tracking-[.08em] transition ${filter === option ? 'bg-[#183f4f] text-white' : 'text-[#71878a] hover:bg-[#eeece3]'}`}>{option === 'ALL' ? 'All' : severityStyles[option].label}</button>)}</div></div><section className="animate-rise delay-1 rounded-2xl border border-[#e1ded5] bg-[#faf9f3] paper-shadow"><div className="flex items-center justify-between border-b border-[#e7e4db] p-5"><div><p className="font-display text-lg font-bold text-[#183847]">{filter === 'ALL' ? 'All inspections' : `${severityStyles[filter].label} severity`}</p><p className="mt-1 text-xs text-[#7a8c8f]">{logs.data?.length ?? 0} logged payloads</p></div><div className="flex items-center gap-2 text-[10px] text-[#829394]"><Clock3 size={13} /> Sorted newest first</div></div><QueryState loading={logs.isLoading} error={logs.isError} onRetry={() => logs.refetch()} label="reports"><AuditTable rows={logs.data ?? []} /></QueryState></section></div>;
}

type ChatEntry = { role: 'user' | 'assistant'; content: string };

function Assistant() {
  const sendMessage = useSendChatMessage();
  const currentUser = getStoredUser();
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      role: 'assistant',
      content: 'I’m your TrustLens security assistant. Ask me about sensitive-data detection, redaction, DLP, compliance, or a safe next step.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sendMessage.isPending) return;
    setError('');
    setDraft('');
    setMessages((current) => [...current, { role: 'user', content: message }]);
    sendMessage.mutate(
      {
        data: {
          message,
          history: messages.slice(-20),
        },
      },
      {
        onSuccess: (response) => {
          setMessages((current) => [...current, { role: 'assistant', content: response.reply }]);
        },
        onError: () => {
          setError('The assistant could not respond. Try again in a moment.');
        },
      },
    );
  };

  const quickPrompts = [
    'How should I handle an exposed API key?',
    'Explain the difference between PII and a secret.',
    'What should a secure redaction workflow include?',
  ];

  const emailResponse = (content: string) => {
    const subject = 'TrustLens security assistant response';
    const body = `TrustLens security assistant response:\n\n${content}\n\nSent from TrustLens.`;
    window.location.href = `mailto:${encodeURIComponent(currentUser.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return <div className="space-y-7">
    <div className="animate-rise">
      <div className="mb-3 flex items-center gap-2 font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-[#3f8c70]"><span className="h-px w-7 bg-[#76c6a9]" />Ask securely</div>
      <h2 className="font-display text-[38px] font-bold leading-none tracking-[-.07em] text-[#183847] md:text-[46px]">Security assistant.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#718488]">Get practical privacy and security guidance without leaving your protected workspace. Never paste live credentials or secrets into chat.</p>
    </div>
    <section className="animate-rise delay-1 overflow-hidden rounded-2xl border border-[#e1ded5] bg-[#faf9f3] paper-shadow">
      <div className="flex items-center justify-between border-b border-[#e7e4db] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#26748d] bg-[#123f53] text-[#62e9f0] shadow-[0_0_18px_rgba(39,205,226,.18)]"><Bot size={19} /></div>
          <div><p className="font-display text-lg font-bold text-[#183847]">TrustLens copilot</p><p className="mt-1 flex items-center gap-1.5 font-mono-ui text-[9px] uppercase tracking-[.12em] text-[#7a8c8f]"><span className="h-1.5 w-1.5 rounded-full bg-[#27cde2]" />Protected assistant</p></div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-[#d8e2d8] bg-[#eef5ed] px-3 py-1.5 text-[10px] font-semibold text-[#477269] sm:flex"><LockKeyhole size={12} /> No credentials requested</span>
      </div>
      <div className="min-h-[390px] space-y-4 p-5 md:p-7" aria-live="polite">
        {messages.map((entry, index) => <div key={`${entry.role}-${index}`} className={`flex gap-3 ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {entry.role === 'assistant' && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#123f53] text-[#62e9f0]"><Bot size={14} /></div>}
          <div className={`max-w-[min(700px,85%)] rounded-2xl px-4 py-3 text-sm leading-6 ${entry.role === 'user' ? 'rounded-br-md bg-[#183f4f] text-[#f6f4eb]' : 'rounded-bl-md border border-[#dce5db] bg-[#eef5ed] text-[#31525c]'}`}>
            <p className="whitespace-pre-wrap">{entry.content}</p>
            {entry.role === 'assistant' && index > 0 && <button type="button" data-testid={`button-email-assistant-${index}`} onClick={() => emailResponse(entry.content)} className="interactive-control mt-3 flex items-center gap-1.5 rounded-lg border border-[#b8d8cf] bg-[#f7fffa] px-2.5 py-1.5 text-[10px] font-bold text-[#287459] hover:border-[#65af93] hover:bg-white"><Mail size={12} /> Email this answer</button>}
          </div>
          {entry.role === 'user' && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#656de7] text-[10px] font-bold text-white">{userInitials(getStoredUser())}</div>}
        </div>)}
        {sendMessage.isPending && <div className="flex items-center gap-3 text-xs text-[#829394]"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#123f53] text-[#62e9f0]"><Bot size={14} /></div><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#27cde2]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#27cde2] [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#27cde2] [animation-delay:240ms]" />Thinking securely…</span></div>}
        {error && <div className="flex items-center gap-2 rounded-xl border border-[#7c355a] bg-[#2b1633] px-3 py-2 text-xs text-[#ff9bb8]"><CircleAlert size={14} />{error}</div>}
      </div>
      <div className="border-t border-[#e7e4db] bg-[#f7f5ed] p-5 md:p-7">
        <div className="mb-3 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => setDraft(prompt)} className="rounded-full border border-[#d8e2d8] bg-[#eef5ed] px-3 py-1.5 text-left text-[10px] font-semibold text-[#477269] transition hover:border-[#65af93] hover:bg-[#e4f1e6]">{prompt}</button>)}
        </div>
        <form onSubmit={submit} className="flex items-end gap-3">
          <label htmlFor="assistant-message" className="sr-only">Message the security assistant</label>
          <textarea id="assistant-message" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={4000} placeholder="Ask a privacy or security question…" className="min-h-[54px] flex-1 resize-none rounded-xl border border-[#d7ddd5] bg-[#fcfcf6] px-4 py-3 text-sm text-[#315462] outline-none transition-colors placeholder:text-[#a4b0aa] focus:border-[#65af93] focus:ring-2 focus:ring-[#bde5d3]" />
          <button type="submit" disabled={!draft.trim() || sendMessage.isPending} data-testid="button-send-assistant" className="flex h-[54px] items-center gap-2 rounded-xl bg-[#183f4f] px-4 text-xs font-bold text-[#f6f4eb] shadow-[0_4px_0_#0d2b38] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45">{sendMessage.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}<span className="hidden sm:inline">Send</span></button>
        </form>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-[#829394]"><Info size={12} />Do not include passwords, API keys, tokens, or full payment-card numbers.</p>
      </div>
    </section>
  </div>;
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
    const onSuccess = (session: { token: string; user: StoredUser }) => {
      window.localStorage.setItem('trustlens_token', session.token);
      window.localStorage.setItem('trustlens_user', JSON.stringify(session.user));
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
  return <div className="noise flex min-h-[100dvh] bg-[#050a1c]"><div className="hidden w-[46%] flex-col justify-between border-r border-[#1b3760] bg-[#05091a] p-10 text-[#edf6ff] lg:flex"><BrandMark /><div className="max-w-md"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#41d9ff] text-[#06152f] shadow-[0_0_28px_rgba(65,217,255,.35)]"><ShieldCheck size={23} /></div><h1 className="font-display text-[56px] font-bold leading-[.95] tracking-[-.08em]">See what’s<br /><span className="text-[#5fe1ff]">leaving.</span></h1><p className="mt-6 max-w-sm text-sm leading-6 text-[#93a9c9]">TrustLens gives security-conscious teams a calm, high-signal place to catch sensitive data before it leaves the organization.</p><div className="mt-10 flex items-center gap-3 border-t border-[#1b3760] pt-5 text-[11px] text-[#93a9c9]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#102752]"><LockKeyhole size={13} className="text-[#5fe1ff]" /></span>Private by design · Built for focused teams</div></div><p className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-[#54719d]">TRUSTLENS / SECURITY OBSERVABILITY</p></div><div className="flex flex-1 items-center justify-center px-6 py-12"><div className="w-full max-w-[390px] animate-rise"><div className="mb-10 lg:hidden"><BrandMark /></div><div className="mb-7"><p className="mb-3 font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-[#5fe1ff]">{isRegistering ? 'Create workspace' : 'Secure entry'}</p><h2 className="font-display text-[34px] font-bold tracking-[-.07em] text-[#eef6ff]">{isRegistering ? 'Start privately.' : 'Welcome back.'}</h2><p className="mt-2 text-sm text-[#93a9c9]">{isRegistering ? 'Create a protected TrustLens workspace.' : 'Sign in to your protected workspace.'}</p></div><div className="mb-7 grid grid-cols-2 gap-1 rounded-2xl border border-[#214374] bg-[#09142d] p-1.5" role="tablist" aria-label="Account access"><button type="button" role="tab" aria-selected={!isRegistering} data-testid="tab-sign-in" onClick={() => { setMode('login'); setError(''); setPassword(''); }} className={`rounded-xl px-4 py-3 text-xs font-bold transition-all ${!isRegistering ? 'bg-[#123463] text-[#effaff] shadow-[0_0_18px_rgba(54,174,255,.2)]' : 'text-[#7893ba] hover:bg-[#0e2347] hover:text-[#bdeeff]'}`}><LogIn size={14} className="mr-2 inline-block" />Sign in</button><button type="button" role="tab" aria-selected={isRegistering} data-testid="tab-sign-up" onClick={() => { setMode('register'); setError(''); setPassword(''); }} className={`rounded-xl px-4 py-3 text-xs font-bold transition-all ${isRegistering ? 'bg-[#123463] text-[#effaff] shadow-[0_0_18px_rgba(54,174,255,.2)]' : 'text-[#7893ba] hover:bg-[#0e2347] hover:text-[#bdeeff]'}`}><ShieldCheck size={14} className="mr-2 inline-block" />Sign up</button></div><form onSubmit={submit} className="space-y-5"><div><label htmlFor="email" className="mb-2 block text-xs font-bold text-[#a8bbd8]">Work email</label><input id="email" autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" placeholder="you@company.com" className="h-12 w-full rounded-xl border border-[#254778] bg-[#09142d] px-4 text-sm text-[#eef6ff] outline-none placeholder:text-[#5d78a2] focus:border-[#41d9ff] focus:ring-2 focus:ring-[#41d9ff]/20" /></div><div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-xs font-bold text-[#a8bbd8]">Password</label>{!isRegistering && <button type="button" data-testid="button-forgot-password" className="text-[11px] font-semibold text-[#5fe1ff]">Forgot password?</button>}</div><input id="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} type="password" minLength={isRegistering ? 8 : undefined} required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" placeholder={isRegistering ? 'At least 8 characters' : 'Enter your password'} className="h-12 w-full rounded-xl border border-[#254778] bg-[#09142d] px-4 text-sm text-[#eef6ff] outline-none placeholder:text-[#5d78a2] focus:border-[#41d9ff] focus:ring-2 focus:ring-[#41d9ff]/20" /></div>{error && <div className="flex items-center gap-2 rounded-lg border border-[#7c355a] bg-[#2b1633] px-3 py-2 text-xs text-[#ff9bb8]"><CircleAlert size={14} />{error}</div>}<button type="submit" disabled={isPending} data-testid={isRegistering ? 'button-submit-sign-up' : 'button-submit-sign-in'} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1586d1] to-[#554bd8] text-sm font-bold text-white shadow-[0_0_26px_rgba(55,168,255,.22)] transition hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(55,168,255,.4)] disabled:cursor-not-allowed disabled:opacity-60">{isPending ? <RefreshCw size={15} className="animate-spin" /> : isRegistering ? <ShieldCheck size={15} /> : <LogIn size={15} />} {isPending ? (isRegistering ? 'Creating workspace…' : 'Signing in…') : (isRegistering ? 'Create TrustLens workspace' : 'Sign in to TrustLens')}</button></form><div className="mt-6 flex items-center gap-3 rounded-xl border border-[#214374] bg-[#09142d] p-3 text-[11px] leading-5 text-[#7893ba]"><MessageCircle size={16} className="shrink-0 text-[#5fe1ff]" /><span><strong className="text-[#dcecff]">New: Security assistant.</strong> Sign in to ask TrustLens about privacy risks, redaction, DLP, and compliance.</span></div><div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#7893ba]"><KeyRound size={13} /> {isRegistering ? 'Your password is hashed before storage.' : 'Protected sign-in · SSO coming soon'}</div><p className="mt-5 text-center text-[11px] text-[#7893ba]">{isRegistering ? 'Already have an account?' : 'New to TrustLens?'} <button type="button" onClick={() => { setMode(isRegistering ? 'login' : 'register'); setError(''); setPassword(''); }} className="font-bold text-[#5fe1ff] hover:text-white">{isRegistering ? 'Sign in' : 'Sign up'}</button></p></div></div></div>;
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
  return <Switch><Route path="/login" component={Login} /><Route path="/"><ProtectedRoute><AppShell><Overview /></AppShell></ProtectedRoute></Route><Route path="/inspector"><ProtectedRoute><AppShell><Inspector /></AppShell></ProtectedRoute></Route><Route path="/reports"><ProtectedRoute><AppShell><Reports /></AppShell></ProtectedRoute></Route><Route path="/assistant"><ProtectedRoute><AppShell><Assistant /></AppShell></ProtectedRoute></Route><Route component={NotFound} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;