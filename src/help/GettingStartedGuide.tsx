import React, { useMemo, useRef, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { DialogOverlay } from '../components/ui/Presentation';
import referenceText from '../../desktop/Getting-Started.txt?raw';
import { guideSections, highlightParts, queryWords, reflowText, searchGuide } from './guide';
import { TUTORIALS, type TutorialKind } from './ideaToDraft';

const Highlight = ({ text, words }: { text: string; words: string[] }) =>
  <>{highlightParts(text, words).map((part, i) => part.match ? <mark key={i} className="dc-guide-mark">{part.text}</mark> : <React.Fragment key={i}>{part.text}</React.Fragment>)}</>;

/** Help › Getting Started (1.17): the task guide and the shipped Getting Started reference in one searchable window. */
export function GettingStartedGuide({ open, onClose, onStartTutorial, initialQuery }: { open: boolean; onClose: () => void; onStartTutorial: (kind: TutorialKind) => void; initialQuery?: string }) {
  const sections = useMemo(() => guideSections(referenceText), []);
  const [query, setQuery] = useState('');
  // Opened for a topic (the Start Window's What's New): start with that search; otherwise start empty.
  React.useEffect(() => { if (open) setQuery(initialQuery || ''); }, [open, initialQuery]);
  const results = useMemo(() => searchGuide(sections, query), [sections, query]);
  const words = useMemo(() => queryWords(query), [query]);
  const content = useRef<HTMLDivElement>(null);
  const show = (id: string) => { const el = content.current?.querySelector<HTMLElement>('[data-guide-section="' + id + '"]'); if (el) { el.scrollIntoView({ block: 'start' }); el.focus({ preventScroll: true }); } };
  return <DialogOverlay open={open} onClose={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div className="dc-guide bg-[#1f1f28] dc-bg-panel border border-white/15 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col text-neutral-200">
      <div className="dc-guide-head p-4 bg-[#181820] dc-bg-sidebar border-b border-white/10 flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-amber-400 shrink-0" aria-hidden />
        <h2 className="font-bold text-sm text-white shrink-0">Getting Started</h2>
        <label className="dc-guide-search flex-1 flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-2">
          <Search className="w-3.5 h-3.5 text-neutral-400" aria-hidden />
          <input type="search" autoFocus aria-label="Search Getting Started" placeholder="Search the guide" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && results[0]) { e.preventDefault(); show(results[0].id); } }}
            className="flex-1 bg-transparent py-1.5 text-xs text-white outline-none" />
        </label>
        <span role="status" aria-live="polite" className="text-[11px] text-neutral-400 shrink-0">{query ? results.length + (results.length === 1 ? ' section' : ' sections') : sections.length + ' sections'}</span>
        <button type="button" aria-label="Close Getting Started" onClick={onClose} className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <div className="dc-guide-body flex min-h-0">
        <nav aria-label="Getting Started sections" className="dc-guide-nav w-56 shrink-0 overflow-y-auto border-r border-white/10 p-2">
          <ul>{results.map(s => <li key={s.id}><button type="button" className="dc-guide-link" data-group={s.group} onClick={() => show(s.id)}><Highlight text={s.title} words={words} /></button></li>)}</ul>
        </nav>
        <div ref={content} className="dc-guide-content flex-1 overflow-y-auto p-5 space-y-5">
          {!results.length && <p className="text-sm text-neutral-400">No sections match “{query}”.</p>}
          {results.map((s, i) => <section key={s.id} data-guide-section={s.id} tabIndex={-1} aria-label={s.title} className="dc-guide-section">
            {s.group === 'Reference' && (i === 0 || results[i - 1].group !== 'Reference') && <p className="dc-guide-group">Reference — the Getting Started notes for this version</p>}
            <h3 className="text-sm font-bold text-white mb-1.5"><Highlight text={s.title} words={words} /></h3>
            <p className="dc-guide-text text-[13px] leading-relaxed text-neutral-300"><Highlight text={reflowText(s.body)} words={words} /></p>
            {s.id === 'idea-to-draft' && <div className="flex flex-wrap gap-2 mt-3">{TUTORIALS.map(t => <button type="button" key={t.kind} className="dc-guide-start" onClick={() => onStartTutorial(t.kind)} title={t.intro}>Start {t.name}</button>)}</div>}
          </section>)}
        </div>
      </div>
    </div>
  </DialogOverlay>;
}
