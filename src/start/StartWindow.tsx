import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Clapperboard, Drama, Film, FilePlus2, FolderOpen, FolderSearch, History, Lightbulb, Search, Sparkles, Theater, Trash2, Tv, X } from 'lucide-react';
import { DialogOverlay } from '../components/ui/Presentation';
import { START_TEMPLATES, folderLabel, recentWhen, startTemplate } from './startData';
import type { FormatTemplate } from '../formats/model';
import type { RecentProject } from '../types/desktop';
import type { TutorialKind } from '../help/ideaToDraft';

const ICONS = { feature: Clapperboard, tv: Tv, sitcom: Drama, stage: Theater, film: Film, short: Clapperboard } as const;
export { START_TEMPLATES, startTemplate, recentWhen } from './startData';

interface Props {
  open: boolean;
  documentTitle: string;
  bridge?: NonNullable<Window['draftcraftDesktop']>['startWindow'];
  onClose: () => void;
  onNew: (template?: FormatTemplate) => void;
  onMoreTemplates: () => void;
  onOpen: () => void;
  onOpenRecent: (requestId: string) => void;
  onTutorial: (kind: TutorialKind) => void;
  onGuide: (query?: string) => void;
}

/** The Start Window (1.18): create, open, reopen a recent project, continue, or learn, at launch and from
 * File › Start Window…. Every create or open goes through the normal project switch, so unsaved changes are
 * resolved first; recent projects are opened by id, and the main process looks up the path. */
export function StartWindow({ open, documentTitle, bridge, onClose, onNew, onMoreTemplates, onOpen, onOpenRecent, onTutorial, onGuide }: Props) {
  const [recent, setRecent] = useState<RecentProject[] | null>(null);
  const [showAtLaunch, setShowAtLaunch] = useState(true);
  const [version, setVersion] = useState('');
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!open) return; setMessage(''); setFilter('');
    if (!bridge) { setRecent([]); return; }
    let live = true;
    bridge.info().then(info => { if (!live) return; setRecent(info.recent); setShowAtLaunch(info.showAtLaunch); setVersion(info.version); }).catch(() => { if (live) setRecent([]); });
    return () => { live = false; };
  }, [open, bridge]);
  const shown = useMemo(() => { const q = filter.trim().toLocaleLowerCase(); return (recent || []).filter(r => !q || (r.title + ' ' + r.name + ' ' + r.folder).toLocaleLowerCase().includes(q)); }, [recent, filter]);
  useEffect(() => { setActive(0); }, [filter]);
  const openRecent = async (r: RecentProject) => {
    if (!bridge) return;
    if (!r.exists) { setMessage('“' + r.title + '” is no longer where it was. Remove it from the list, or open it with Open… from its new place.'); return; }
    try {
      const result = await bridge.openRecent(r.id);
      if (result.missing) { setRecent(list => (list || []).map(x => x.id === r.id ? { ...x, exists: false } : x)); setMessage('“' + r.title + '” was moved or deleted.'); return; }
      if (result.requestId) onOpenRecent(result.requestId);
    } catch (e) { setMessage(String((e as Error)?.message || e)); }
  };
  const remove = async (r: RecentProject) => { if (bridge) setRecent(await bridge.removeRecent(r.id)); };
  const rowKey = (e: React.KeyboardEvent, i: number, r: RecentProject) => {
    const go = (to: number) => { e.preventDefault(); const n = Math.max(0, Math.min(shown.length - 1, to)); setActive(n); list.current?.querySelectorAll<HTMLElement>('[data-recent-open]')[n]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i - 1); else if (e.key === 'Home') go(0); else if (e.key === 'End') go(shown.length - 1);
    else if ((e.key === 'Backspace' || e.key === 'Delete') && (e.metaKey || !r.exists)) { e.preventDefault(); void remove(r); }
  };
  return <DialogOverlay open={open} onClose={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div className="dc-start bg-[#1f1f28] dc-bg-panel border border-white/15 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col text-neutral-200">
      <div className="dc-start-head">
        <div className="dc-start-mark" aria-hidden><Clapperboard className="w-6 h-6" /></div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white">Welcome to DraftCraft Pro{version ? <span className="dc-start-version"> {version}</span> : null}</h2>
          <p className="text-xs text-neutral-400">Start a new script, open a project, or pick up where you left off.</p>
        </div>
        <button type="button" className="dc-start-close" aria-label="Close Start Window" title="Continue with the current document (Esc)" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
      <div className="dc-start-body">
        <section aria-labelledby="dc-start-create" className="dc-start-create">
          <h3 id="dc-start-create" className="dc-start-h">Create</h3>
          <button type="button" autoFocus className="dc-start-primary" onClick={() => onNew()}><FilePlus2 className="w-5 h-5" /><span><strong>New Screenplay</strong><small>With your default template</small></span></button>
          <div className="dc-start-tiles" role="group" aria-label="New from a format">
            {START_TEMPLATES.map(t => { const tpl = startTemplate(t.name), Icon = ICONS[t.icon]; return tpl ? <button type="button" key={t.name} className="dc-start-tile" onClick={() => onNew(tpl)} aria-label={'New ' + t.label + ' (' + t.detail + ')'}>
              <Icon className="w-4 h-4" /><span>{t.label}</span><small>{t.detail}</small></button> : null; })}
          </div>
          <button type="button" className="dc-start-link" onClick={onMoreTemplates}>More Templates…</button>
          <h3 className="dc-start-h mt-4">Open</h3>
          <button type="button" className="dc-start-secondary" onClick={onOpen}><FolderOpen className="w-4 h-4" /><span>Open…<small>DraftCraft, Final Draft, Fountain, text and PDF</small></span></button>
        </section>
        <section aria-labelledby="dc-start-recent" className="dc-start-recent">
          <div className="flex items-center gap-2">
            <h3 id="dc-start-recent" className="dc-start-h flex-1"><History className="w-3.5 h-3.5 inline mr-1" aria-hidden />Recent Projects</h3>
            {!!recent?.length && <label className="dc-start-filter"><Search className="w-3 h-3" aria-hidden /><input type="search" aria-label="Filter recent projects" placeholder="Filter" value={filter} onChange={e => setFilter(e.target.value)} /></label>}
          </div>
          {recent === null ? <p className="dc-start-empty">Loading…</p>
            : !bridge ? <p className="dc-start-empty">Recent projects appear here in the desktop app.</p>
            : !recent.length ? <p className="dc-start-empty">Projects you open or save will appear here.</p>
            : !shown.length ? <p className="dc-start-empty">No recent project matches “{filter}”.</p>
            : <ul ref={list} className="dc-start-list" aria-label="Recent projects">
              {shown.map((r, i) => <li key={r.id} className="dc-start-row" data-missing={!r.exists || undefined}>
                <button type="button" data-recent-open tabIndex={i === active ? 0 : -1} className="dc-start-row-open" onFocus={() => setActive(i)} onClick={() => void openRecent(r)} onKeyDown={e => rowKey(e, i, r)}
                  aria-label={r.title + ', ' + r.name + ', in ' + folderLabel(r.folder) + (r.exists ? ', opened ' + recentWhen(r.openedAt) : ', missing')}>
                  <span className="dc-start-row-title">{r.title}</span>
                  <span className="dc-start-row-meta">{r.exists ? recentWhen(r.openedAt) : 'Missing'}</span>
                  <span className="dc-start-row-file">{r.name} · {folderLabel(r.folder)}</span>
                </button>
                {r.exists && <button type="button" className="dc-start-row-act" aria-label={'Show “' + r.title + '” in Finder'} title="Show in Finder" onClick={() => void bridge.revealRecent(r.id)}><FolderSearch className="w-3.5 h-3.5" /></button>}
                <button type="button" className="dc-start-row-act" aria-label={'Remove “' + r.title + '” from the list'} title="Remove from List (the file is not deleted)" onClick={() => void remove(r)}><Trash2 className="w-3.5 h-3.5" /></button>
              </li>)}
            </ul>}
          {message && <p role="status" className="dc-start-message">{message}</p>}
          {!!recent?.length && bridge && <button type="button" className="dc-start-link mt-2" onClick={() => void bridge.clearRecent().then(setRecent)}>Clear Recent List</button>}
        </section>
      </div>
      <section aria-labelledby="dc-start-learn" className="dc-start-learn">
        <h3 id="dc-start-learn" className="dc-start-h">Learn</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="dc-start-chip" onClick={() => onTutorial('feature')}><Lightbulb className="w-3.5 h-3.5" />Idea to Draft: Feature</button>
          <button type="button" className="dc-start-chip" onClick={() => onTutorial('series')}><Lightbulb className="w-3.5 h-3.5" />Idea to Draft: Pilot</button>
          <button type="button" className="dc-start-chip" onClick={() => onTutorial('stage')}><Lightbulb className="w-3.5 h-3.5" />Idea to Draft: Stage Play</button>
          <button type="button" className="dc-start-chip" onClick={() => onGuide()}><BookOpen className="w-3.5 h-3.5" />Getting Started</button>
          <button type="button" className="dc-start-chip" onClick={() => onGuide("What's New In " + (version || ''))}><Sparkles className="w-3.5 h-3.5" />What's New</button>
        </div>
      </section>
      <div className="dc-start-foot">
        <label className="dc-start-check"><input type="checkbox" checked={showAtLaunch} disabled={!bridge || recent === null} onChange={e => { const v = e.target.checked; setShowAtLaunch(v); void bridge?.setShowAtLaunch(v); }} />Show this window when DraftCraft Pro opens</label>
        <span className="flex-1" />
        <button type="button" className="dc-start-continue" onClick={onClose}>Continue with “{documentTitle || 'Untitled'}”</button>
      </div>
    </div>
  </DialogOverlay>;
}
