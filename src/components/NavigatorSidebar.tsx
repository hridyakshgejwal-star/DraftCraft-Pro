import { flushSync } from 'react-dom';
import {moveScene} from '../editor/scenes';
import {renameCharacter,studio} from '../production/model';
import {NavigatorResults,downloadText} from '../production/ProductionPanel';
import {defaultNavigatorView,productionScenes,castList,castListCsv,sortCast,formatScreenTime,type CastSort} from '../production/queries';
import {documentLayout} from '../production/layout';
import { flushPendingPages } from './ScriptEditor';
import { DialogOverlay, MenuSurface, UIPresence, scrollMotion } from './ui/Presentation';
import { LocationsTab, OutlineTab, characterInteractions } from '../workspace/NavigatorExtras';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Paragraph,
  ScriptNote,
  ScriptBookmark,
  ScriptNoteColor,
  SCRIPT_NOTE_THEMES,
  ScriptDocument,
  BeatCard,
} from '../types/script';
import { calculateScriptStats } from '../utils/pagination';
import { DEFAULT_WORKSPACE, NAVIGATOR_COLUMNS, NAVIGATOR_COLUMN_LIMITS, NAVIGATOR_COLUMN_WIDTHS, NAVIGATOR_ZOOM_STEPS, type NavigatorColumn, type NavigatorPreferences } from '../workspace/preferences';
import {
  ListFilter,
  Users,
  MessageSquare,
  Bookmark,
  Clapperboard,
  Calendar,
  User,
  Search,
  MapPin,
  ChevronRight,
  Sun,
  Moon,
  Clock,
  Volume2,
  Download,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Palette,
  Tag,
  Check,
  ChevronDown,
  Sparkles,
  Layers,
  Filter,
  Table2,
  LayoutList,
} from 'lucide-react';

interface NavigatorSidebarProps {
  document: ScriptDocument;
  onUpdateDocument: (doc: ScriptDocument) => void;
  onSelectScene: (sceneIndex: number) => void;
  onOpenTableReadSnippet: (text: string, character: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  /** Scroll the script to a page (outline elements that are planning targets). */
  onNavigatePage?: (page: number) => void;
  /** Scenes view (cards or table), visible columns and column widths, kept with the workspace preferences. */
  prefs?: NavigatorPreferences;
  onPrefs?: (patch: Partial<NavigatorPreferences>) => void;
}

const PREBUILT_VOICES = ['Puck', 'Kore', 'Fenrir', 'Zephyr', 'Charon'];
const HIGHLIGHT_COLORS = ['#60a5fa', '#f472b6', '#facc15', '#4ade80', '#c084fc', '#fb923c'];

export const NavigatorSidebar: React.FC<NavigatorSidebarProps> = ({
  document,
  onUpdateDocument,
  onSelectScene,
  onOpenTableReadSnippet,
  isOpen,
  onToggle,
  onNavigatePage,
  prefs,
  onPrefs,
}) => {
  const interactions = useMemo(() => characterInteractions(document), [document.paragraphs]);
  const [newTabName, setNewTabName] = useState<string | null>(null);
  const [renamingTab, setRenamingTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('scenes');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingScene, setEditingScene] = useState<string | null>(null);

  // Section 6: ScriptNotes & Bookmarks Search & Filters
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [noteColorFilter, setNoteColorFilter] = useState<string>('all');
  const [noteAuthorFilter, setNoteAuthorFilter] = useState<string>('all');
  const [noteTypeFilter, setNoteTypeFilter] = useState<'all' | 'notes' | 'scene_comments'>('all');
  const [bookmarkSearchQuery, setBookmarkSearchQuery] = useState('');

  // Scenes view, column visibility and widths: the workspace preferences when given, otherwise for this session.
  const [localPrefs, setLocalPrefs] = useState<NavigatorPreferences>(() => structuredClone(DEFAULT_WORKSPACE.navigator));
  const navPrefs = prefs || localPrefs;
  const updatePrefs = (patch: Partial<NavigatorPreferences>) => onPrefs ? onPrefs(patch) : setLocalPrefs(v => ({ ...v, ...patch }));
  const visibleColumns = navPrefs.columns;
  const setVisibleColumns = (update: (prev: Record<NavigatorColumn, boolean>) => Record<NavigatorColumn, boolean>) => updatePrefs({ columns: update(visibleColumns) });
  const sceneTable = navPrefs.sceneView === 'table';
  // The Scenes sort is a workspace preference (kept across relaunches).
  const sortField = navPrefs.sort.field, sortAsc = navPrefs.sort.asc;
  const setSortField = (field: string) => updatePrefs({ sort: { field, asc: sortAsc } });
  const toggleSortOrder = () => updatePrefs({ sort: { field: sortField, asc: !sortAsc } });
  // Navigator text size (Final Draft 13.2 "Navigator zoom"): scales everything below the header; saved with the workspace.
  const zoom = navPrefs.zoom;
  const zoomStep = (dir: -1 | 1) => { const next = dir > 0 ? NAVIGATOR_ZOOM_STEPS.find(z => z > zoom + 0.001) : [...NAVIGATOR_ZOOM_STEPS].reverse().find(z => z < zoom - 0.001); if (next !== undefined) updatePrefs({ zoom: next }); };
  const [showColPicker, setShowColPicker] = useState(false);

  // Rename Character Modal / State
  const [renameTargetChar, setRenameTargetChar] = useState<string | null>(null);
  const [newCharName, setNewCharName] = useState('');

  const paragraphs = document.paragraphs;
  const sceneNodes=useRef(new Map<string,{state:string;node:React.ReactNode}>());
  const cacheProject=useRef(document.id);
  if(cacheProject.current!==document.id){sceneNodes.current.clear();cacheProject.current=document.id;}
  const stats = calculateScriptStats(paragraphs,documentLayout(document).pages);

  // Group scenes with metadata
  interface DetailedScene {
    index: number;
    paragraphId: string;
    number: string;
    heading: string;
    setting: string;
    time: string;
    summary: string;
    characters: string[];
    lineCount: number;
    pageLabels:string[];eighths:number;
    notesCount: number;
    bookmarksCount: number;
    sceneComment?: string;
    sceneColor?: string;
    tags: string[];
  }

  const scenes: DetailedScene[] = [];
  let currentScene: DetailedScene | null = null;

  paragraphs.forEach((p, idx) => {
    if (p.type === 'Scene Heading') {
      const isExt = p.text.startsWith('EXT');
      const isNight = p.text.includes('NIGHT');
      const time = isNight ? 'NIGHT' : p.text.includes('DUSK') ? 'DUSK' : p.text.includes('DAWN') ? 'DAWN' : 'DAY';

      currentScene = {
        index: idx,
        paragraphId: p.id,
        number: p.sceneNumber || `${scenes.length + 1}`,
        heading: p.text,
        setting: isExt ? 'EXTERIOR' : 'INTERIOR',
        time,
        summary: p.text.split('-')[0].trim(),
        characters: [],
        lineCount: 1,pageLabels:[],eighths:0,
        notesCount: p.notes?.length || 0,
        bookmarksCount: p.bookmark ? 1 : 0,
        sceneComment: p.sceneComment,
        sceneColor: p.sceneColor,
        tags: p.tags || [],
      };
      scenes.push(currentScene);
    } else if (currentScene) {
      currentScene.lineCount += 1;
      if (p.notes) currentScene.notesCount += p.notes.length;
      if (p.bookmark) currentScene.bookmarksCount += 1;
      if (p.type === 'Character') {
        const charName = p.text.replace(/\s*\(.*\)/, '').trim().toUpperCase();
        if (charName && !currentScene.characters.includes(charName)) {
          currentScene.characters.push(charName);
        }
      }
    }
  });

  const actual=new Map(productionScenes(document).map(s=>[s.id,s]));for(const scene of scenes){const data=actual.get(scene.paragraphId);if(data){scene.summary=data.summary;scene.characters=data.characters;scene.tags=data.tags;scene.notesCount=data.notes;scene.pageLabels=data.pages;scene.eighths=data.eighths;}const heading=scene.heading.toUpperCase();scene.time=heading.match(/ - (.+)$/)?.[1]||'';scene.setting=/^EXT[. /]/.test(heading)?'EXTERIOR':/^INT[. /]/.test(heading)?'INTERIOR':'';}

  // Section 6: Collect all ScriptNotes
  interface DetailedNote {
    paragraphId: string;
    paragraphIndex: number;
    sceneHeading: string;
    note: ScriptNote;
  }
  const allNotes: DetailedNote[] = [];
  paragraphs.forEach((p, idx) => {
    if (p.notes && p.notes.length > 0) {
      let sceneHeading = 'Global';
      for (let s = idx; s >= 0; s--) {
        if (paragraphs[s].type === 'Scene Heading') {
          sceneHeading = paragraphs[s].text;
          break;
        }
      }

      p.notes.forEach((note) => {
        allNotes.push({
          paragraphId: p.id,
          paragraphIndex: idx,
          sceneHeading,
          note,
        });
      });
    }
  });

  // Section 6: Collect all Bookmarks
  interface DetailedBookmark {
    paragraphId: string;
    paragraphIndex: number;
    sceneHeading: string;
    bookmark: ScriptBookmark;
  }
  const allBookmarks: DetailedBookmark[] = [];
  paragraphs.forEach((p, idx) => {
    if (p.bookmark) {
      let sceneHeading = 'Top of Script';
      for (let s = idx; s >= 0; s--) {
        if (paragraphs[s].type === 'Scene Heading') {
          sceneHeading = paragraphs[s].text;
          break;
        }
      }
      const bmObj: ScriptBookmark =
        typeof p.bookmark === 'object'
          ? p.bookmark
          : {
              id: `bm-${idx}`,
              name: p.bookmark,
              color: '#3b82f6',
              createdAt: 'Script Note',
              paragraphId: p.id,
            };
      allBookmarks.push({
        paragraphId: p.id,
        paragraphIndex: idx,
        sceneHeading,
        bookmark: bmObj,
      });
    }
  });

  // Section 6: Collect Scene Comments
  interface DetailedSceneComment {
    paragraphId: string;
    paragraphIndex: number;
    sceneHeading: string;
    comment: string;
  }
  const allSceneComments: DetailedSceneComment[] = [];
  paragraphs.forEach((p, idx) => {
    if (p.type === 'Scene Heading' && p.sceneComment) {
      allSceneComments.push({
        paragraphId: p.id,
        paragraphIndex: idx,
        sceneHeading: p.text,
        comment: p.sceneComment,
      });
    }
  });

  // Unique Authors in notes for author filter
  const uniqueAuthors = Array.from(new Set(allNotes.map((n) => n.note.author))).filter(Boolean);

  // Jump to specific paragraph smoothly and focus it
  const handleJumpToParagraph = (paragraphId: string) => {
    flushPendingPages();
    const el = window.document.getElementById(`input-${paragraphId}`) || window.document.getElementById(`para-${paragraphId}`);
    if (el) {
      el.scrollIntoView({ behavior: scrollMotion(), block: 'center' });
      el.focus();
    }
  };

  // Filter & Sort Scenes
  const filteredScenes = scenes
    .filter((s) => s.heading.toLowerCase().includes(searchQuery.toLowerCase()) || s.characters.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())))
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'number') cmp = parseInt(a.number) - parseInt(b.number);
      else if (sortField === 'heading') cmp = a.heading.localeCompare(b.heading);
      else if (sortField === 'setting') cmp = a.setting.localeCompare(b.setting);
      else if (sortField === 'time') cmp = a.time.localeCompare(b.time);
      else if (sortField === 'length') cmp = a.eighths - b.eighths || a.lineCount - b.lineCount;
      else if (sortField === 'characters') cmp = a.characters.length - b.characters.length || a.characters.join(',').localeCompare(b.characters.join(','));
      else if (sortField === 'summary') cmp = a.summary.localeCompare(b.summary);
      else if (sortField === 'comment') cmp = (a.sceneComment || '').localeCompare(b.sceneComment || '');
      else if (sortField === 'color') cmp = (a.sceneColor || '').localeCompare(b.sceneColor || '');
      if (!cmp && sortField !== 'number') cmp = parseInt(a.number) - parseInt(b.number) || a.index - b.index;
      return sortAsc ? cmp : -cmp;
    });

  // Reorder Scenes (Move Up / Down)
  const handleMoveSceneOrder=(sceneIndex:number,direction:-1|1)=>onUpdateDocument({...document,paragraphs:moveScene(paragraphs,paragraphs[sceneIndex]?.id,direction)});
  // 5.3 Global Character Rename cascading across script and Beat Board
  const handleGlobalRename = () => {
    if (!renameTargetChar || !newCharName.trim()) return;
    try{onUpdateDocument(renameCharacter(document,renameTargetChar,newCharName,true));}catch(error){window.alert((error as Error).message);return;}

    setRenameTargetChar(null);
    setNewCharName('');
  };

  // CSV Export
  const handleExportCsv = (type: 'scenes' | 'characters' | 'notes' | 'cast-list') => {
    let csv = '';
    if (type === 'cast-list') { downloadText('Cast-List.csv', castListCsv(castList(document))); return; }
    if (type === 'scenes') {
      csv = 'Scene Number,Heading,Setting,Time,Line Count,Characters\n';
      scenes.forEach((s) => {
        csv += `"${s.number}","${s.heading}","${s.setting}","${s.time}",${s.lineCount},"${s.characters.join('; ')}"\n`;
      });
    } else if (type === 'characters') {
      csv = 'Character Name,Speaking Entries,Dialogue Percentage,Voice Preset\n';
      stats.characters.forEach((c) => {
        const lines = stats.characterLinesCount[c] || 0;
        const total = Object.values(stats.characterLinesCount).reduce((a, b) => a + b, 0);
        const pct = total > 0 ? ((lines / total) * 100).toFixed(1) : '0';
        const voice = document.characterVoiceMap?.[c] || 'Default';
        csv += `"${c}",${lines},${pct}%,"${voice}"\n`;
      });
    } else {
      csv = 'Author,Scene Heading,Created At,Content\n';
      allNotes.forEach((n) => {
        csv += `"${n.note.author}","${n.sceneHeading}","${n.note.createdAt}","${n.note.text.replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `navigator_${type}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Unchanged scene rows can retain their markup while prose is edited. Route
  // cached actions to the current document handlers so moves never use an old
  // paragraph array, and bound the cache to the current project's scene IDs.
  // Cached scene rows read the scene's current paragraph index at click time, so inserting a paragraph above a scene
  // (which shifts every index) does not rebuild every row (1.17: Return near the top of a long script).
  const sceneIndexById=new Map(scenes.map(s=>[s.paragraphId,s.index]));
  const liveSceneEvents=useRef({onSelectScene,handleMoveSceneOrder,indexOf:(id:string,fallback:number)=>sceneIndexById.get(id)??fallback});
  liveSceneEvents.current={onSelectScene,handleMoveSceneOrder,indexOf:(id:string,fallback:number)=>sceneIndexById.get(id)??fallback};
  const presentScenes=new Set(scenes.map(s=>s.paragraphId));
  for(const id of sceneNodes.current.keys())if(!presentScenes.has(id))sceneNodes.current.delete(id);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        aria-label="Open Final Draft Navigator 2.0"
        className="dc-navigator-rail w-8 bg-[#14141a] dc-bg-workspace border-r border-white/10 flex flex-col items-center py-4 text-neutral-400 hover:text-white transition-colors gap-4 select-none shrink-0"
        title="Open Final Draft Navigator 2.0"
      >
        <span className="text-[10px] dc-meta font-mono tracking-widest rotate-90 uppercase">
          Navigator
        </span>
        <ListFilter className="w-4 h-4 text-amber-400" />
      </button>
    );
  }

  const customTabs = [...(document.customNavigatorTabs || []),...studio(document).navigator.filter(v=>!(document.customNavigatorTabs||[]).some(t=>t.id===v.id))];

  return (
    <aside className="dc-navigator w-full bg-[#171720] border-r border-white/10 flex flex-col shrink-0 select-none text-xs text-neutral-300" data-nav-zoom={zoom} style={{ ['--dc-nav-zoom' as string]: String(zoom) } as React.CSSProperties}>
      {/* Navigator 2.0 Header */}
      <div className="p-3 border-b border-white/10 flex flex-col gap-2 shrink-0 bg-[#1a1a24] dc-bg-chrome">
        <div className="flex items-center justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-white text-xs min-w-0">
            <ListFilter className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate" title="Navigator 2.0">Navigator 2.0</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="dc-nav-zoom" role="group" aria-label="Navigator text size">
              <button type="button" aria-label="Smaller Navigator text" title="Smaller Navigator text" disabled={zoom <= NAVIGATOR_ZOOM_STEPS[0]} onClick={() => zoomStep(-1)}>A<span aria-hidden>−</span></button>
              <button type="button" aria-label={'Navigator text size ' + Math.round(zoom * 100) + '% — click for 100%'} title="Normal Navigator text size" className="dc-nav-zoom-value" onClick={() => zoom !== 1 && updatePrefs({ zoom: 1 })}>{Math.round(zoom * 100)}%</button>
              <button type="button" aria-label="Larger Navigator text" title="Larger Navigator text" disabled={zoom >= NAVIGATOR_ZOOM_STEPS[NAVIGATOR_ZOOM_STEPS.length - 1]} onClick={() => zoomStep(1)}>A<span aria-hidden>+</span></button>
            </div>
            <button aria-label="Export Current Table as CSV"
              onClick={() => handleExportCsv(activeTab as any)}
              className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white"
              title="Export Current Table as CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggle}
              aria-label="Collapse Navigator"
              className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white"
              title="Collapse Navigator"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Switcher (Scenes, Characters, Notes, Tags + Custom Tabs) */}
        {/* Tabs (1.17): a tab list. ← → / Home End move between tabs and show them; Tab leaves the list. */}
        <div role="tablist" aria-label="Navigator tabs" className="dc-nav-tabs flex flex-wrap items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10"
          onKeyDown={e => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) || !(e.target as HTMLElement).matches('[role=tab]')) return; e.preventDefault(); const tabs = [...e.currentTarget.querySelectorAll<HTMLElement>('[role=tab]')], at = tabs.indexOf(e.target as HTMLElement), next = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[tabs.length - 1] : tabs[(at + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; next?.click(); next?.focus(); }}>
          <button
            role="tab" aria-selected={activeTab === 'scenes'} tabIndex={activeTab === 'scenes' ? 0 : -1} onClick={() => setActiveTab('scenes')}
            className={`px-2.5 py-1 rounded text-center font-medium whitespace-nowrap transition-colors ${
              activeTab === 'scenes' ? 'bg-neutral-800 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Scenes ({scenes.length})
          </button>
          <button
            role="tab" aria-selected={activeTab === 'characters'} tabIndex={activeTab === 'characters' ? 0 : -1} onClick={() => setActiveTab('characters')}
            className={`px-2.5 py-1 rounded text-center font-medium whitespace-nowrap transition-colors ${
              activeTab === 'characters' ? 'bg-neutral-800 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Cast ({stats.characterCount})
          </button>
          <button role="tab" aria-selected={activeTab === 'cast-list'} tabIndex={activeTab === 'cast-list' ? 0 : -1} onClick={() => setActiveTab('cast-list')} title="Cast List: scenes, pages, eighths and estimated screen time per character"
            className={`px-2.5 py-1 rounded text-center font-medium whitespace-nowrap transition-colors ${activeTab === 'cast-list' ? 'bg-neutral-800 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'}`}>
            Cast List
          </button>
          <button
            role="tab" aria-selected={activeTab === 'notes'} tabIndex={activeTab === 'notes' ? 0 : -1} onClick={() => setActiveTab('notes')}
            className={`px-2.5 py-1 rounded text-center font-medium whitespace-nowrap transition-colors ${
              activeTab === 'notes' ? 'bg-neutral-800 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Notes ({allNotes.length + allSceneComments.length})
          </button>
          <button
            role="tab" aria-selected={activeTab === 'bookmarks'} tabIndex={activeTab === 'bookmarks' ? 0 : -1} onClick={() => setActiveTab('bookmarks')}
            className={`px-2.5 py-1 rounded text-center font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeTab === 'bookmarks' ? 'bg-neutral-800 text-blue-300 shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-2.5 h-2.5 text-blue-400 fill-blue-400" />
            Bookmarks ({allBookmarks.length})
          </button>
          <button
            role="tab" aria-selected={activeTab === 'tags'} tabIndex={activeTab === 'tags' ? 0 : -1} onClick={() => setActiveTab('tags')}
            className={`px-2.5 py-1 rounded text-center font-medium whitespace-nowrap transition-colors ${
              activeTab === 'tags' ? 'bg-neutral-800 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Tags
          </button>
          <button
            role="tab" aria-selected={activeTab === 'locations'} tabIndex={activeTab === 'locations' ? 0 : -1} onClick={() => setActiveTab('locations')}
            className={`px-2.5 py-1 rounded text-center font-medium whitespace-nowrap transition-colors ${
              activeTab === 'locations' ? 'bg-neutral-800 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Locations
          </button>
          <button
            role="tab" aria-selected={activeTab === 'outline'} tabIndex={activeTab === 'outline' ? 0 : -1} onClick={() => setActiveTab('outline')}
            className={`px-2.5 py-1 rounded text-center font-medium whitespace-nowrap transition-colors ${
              activeTab === 'outline' ? 'bg-neutral-800 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Outline
          </button>
          {customTabs.map((ct) => renamingTab === ct.id ? <input key={ct.id} autoFocus aria-label="Tab name" defaultValue={ct.name} className="dc-nav-tab-input" onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = ct.name; e.currentTarget.blur(); } }} onBlur={e => { const name = e.currentTarget.value.trim(); setRenamingTab(null); if (!name || name === ct.name) return; const custom = (document.customNavigatorTabs || []).some(t => t.id === ct.id); onUpdateDocument(custom ? { ...document, customNavigatorTabs: (document.customNavigatorTabs || []).map(t => t.id === ct.id ? { ...t, name } : t) } : { ...document, studio: { ...studio(document), navigator: studio(document).navigator.map(v => v.id === ct.id ? { ...v, name } : v) } }); }} /> : (
            <button
              key={ct.id}
              title="Double-click to rename"
              onDoubleClick={() => setRenamingTab(ct.id)}
              role="tab" aria-selected={activeTab === ct.id} tabIndex={activeTab === ct.id ? 0 : -1} onClick={() => setActiveTab(ct.id)}
              className={`px-2 py-1 rounded text-center font-medium whitespace-nowrap transition-colors ${
                activeTab === ct.id ? 'bg-neutral-800 text-white shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {ct.name}
            </button>
          ))}
          {newTabName !== null && <input autoFocus aria-label="New tab name" placeholder="Tab name" className="dc-nav-tab-input" value={newTabName} onChange={e => setNewTabName(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setNewTabName(null); if (e.key === 'Enter') e.currentTarget.blur(); }} onBlur={() => { const name = (newTabName || '').trim(); setNewTabName(null); if (!name) return; const view = defaultNavigatorView(name); onUpdateDocument({ ...document, studio: { ...studio(document), navigator: [...studio(document).navigator, view] } }); setActiveTab(view.id); }} />}
          <button aria-label="Add Custom Navigator Tab"
            onClick={() => setNewTabName('')}
            className="p-1 text-neutral-400 hover:text-white"
            title="Add Custom Navigator Tab"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Search & Table Customization Controls */}
      <div className="p-2.5 border-b border-white/10 flex items-center gap-1.5 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" />
          <input
            type="text"
            aria-label="Filter Navigator"
            placeholder={`Filter ${activeTab === 'cast-list' ? 'cast list' : activeTab === 'characters' ? 'cast' : activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-md pl-8 pr-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {activeTab === 'scenes' && <button type="button" aria-label="Show scenes as a table" aria-pressed={sceneTable} title={sceneTable ? 'Scenes as a table — click for cards' : 'Scenes as cards — click for a table with resizable columns'}
          onClick={() => updatePrefs({ sceneView: sceneTable ? 'cards' : 'table' })} className="p-1 bg-black/30 hover:bg-white/10 border border-white/10 rounded text-neutral-400 hover:text-white dc-nav-view-toggle">{sceneTable ? <LayoutList className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}</button>}
        {activeTab === 'scenes' && !sceneTable && <>
          <select aria-label="Sort scenes" title="Sort scenes" value={sortField} onChange={e => setSortField(e.target.value)} className="dc-nav-sort-select bg-black/30 border border-white/10 rounded text-[11px] text-neutral-300 px-1">
            <option value="number">Scene #</option><option value="heading">Heading</option><option value="setting">INT/EXT</option><option value="time">Time</option><option value="length">Length</option><option value="characters">Characters</option><option value="summary">Summary</option>
          </select>
          <button type="button" aria-label={sortAsc ? 'Sort descending' : 'Sort ascending'} title={sortAsc ? 'Ascending — click for descending' : 'Descending — click for ascending'} onClick={toggleSortOrder} className="p-1 bg-black/30 hover:bg-white/10 border border-white/10 rounded text-neutral-400 hover:text-white">{sortAsc ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}</button>
        </>}
        {activeTab === 'scenes' && (
          <div className="relative">
            <button aria-label="Customize Columns"
              onClick={() => setShowColPicker(!showColPicker)}
              className="p-1 bg-black/30 hover:bg-white/10 border border-white/10 rounded text-neutral-400 hover:text-white"
              title="Customize Columns"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>

            <UIPresence>{showColPicker && (
              <MenuSurface className="absolute right-0 mt-1 w-44 bg-[#22222d] dc-bg-elevated border border-white/15 rounded-lg shadow-2xl p-2 z-50 text-[11px] space-y-1.5">
                <span className="font-bold text-neutral-400 uppercase text-[9px] dc-fine-meta block">Visible Columns:</span>
                {NAVIGATOR_COLUMNS.map(key => (
                  <label key={key} className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() =>
                        setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))
                      }
                      className="rounded border-white/20 bg-neutral-800"
                    />
                    <span>{COLUMN_LABELS[key]}</span>
                  </label>
                ))}
                {sceneTable && <button type="button" className="dc-nav-reset-widths" onClick={() => updatePrefs({ columnWidths: { ...NAVIGATOR_COLUMN_WIDTHS } })}>Reset Column Widths</button>}
              </MenuSurface>
            )}</UIPresence>
          </div>
        )}
      </div>

      {/* TAB 1: SCENES — a table with resizable, sortable columns */}
      {activeTab === 'scenes' && sceneTable && <SceneTable scenes={filteredScenes} columns={navPrefs.columnOrder.filter(c => visibleColumns[c])} widths={navPrefs.columnWidths}
        onOrder={(moved, before) => { const order = navPrefs.columnOrder.filter(c => c !== moved), at = before ? order.indexOf(before) : order.length; order.splice(at < 0 ? order.length : at, 0, moved); updatePrefs({ columnOrder: order }); }}
        onField={(id, field, value) => onUpdateDocument({ ...document, paragraphs: document.paragraphs.map(p => p.id === id ? { ...p, [field]: value || undefined } : p) })}
        sortField={sortField} sortAsc={sortAsc} onSort={key => updatePrefs({ sort: key === sortField ? { field: key, asc: !sortAsc } : { field: key, asc: true } })}
        onWidths={columnWidths => updatePrefs({ columnWidths })} editing={editingScene} onEdit={setEditingScene}
        onSelect={index => liveSceneEvents.current.onSelectScene(index)}
        onHeading={(id, text) => onUpdateDocument({ ...document, paragraphs: document.paragraphs.map(p => p.id === id ? { ...p, text } : p) })} />}
      {/* TAB 1: SCENES — cards */}
      {activeTab === 'scenes' && !sceneTable && (
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {filteredScenes.map(s => {
            const linkedBeats=document.beats.filter(b=>b.sceneId===s.paragraphId);
            const state=JSON.stringify([{...s,index:0},linkedBeats.map(b=>[b.id,b.title,b.color]),visibleColumns,editingScene===s.paragraphId]);
            const cached=sceneNodes.current.get(s.paragraphId);if(cached?.state===state)return cached.node;
            const node=(
            <div
              key={s.paragraphId}
              className="p-3 hover:bg-white/5 transition-colors group flex flex-col gap-1.5 cursor-pointer"
              onClick={() => liveSceneEvents.current.onSelectScene(liveSceneEvents.current.indexOf(s.paragraphId, s.index))}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {visibleColumns.number && <span className="font-mono text-amber-400 font-bold text-xs">
                    #{s.number}
                  </span>}
                  {editingScene === s.paragraphId ? <input autoFocus aria-label="Scene heading" defaultValue={s.heading} className="dc-nav-cell-input font-screenplay text-xs" onClick={e => e.stopPropagation()}
                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = s.heading; e.currentTarget.blur(); } }}
                    onBlur={e => { const text = e.currentTarget.value.toUpperCase().trim(); setEditingScene(null); if (text && text !== s.heading) onUpdateDocument({ ...document, paragraphs: document.paragraphs.map(p => p.id === s.paragraphId ? { ...p, text } : p) }); }} />
                  : visibleColumns.heading && <span className="font-screenplay font-bold text-white text-xs truncate max-w-44 group-hover:text-amber-300" title="Double-click to edit the scene heading" onDoubleClick={e => { e.stopPropagation(); setEditingScene(s.paragraphId); }}>
                    {s.heading}
                  </span>}
                </div>

                {/* Move Scene Order Controls */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button aria-label="Move Scene Up in Script"
                    onClick={(e) => {
                      e.stopPropagation();
                      liveSceneEvents.current.handleMoveSceneOrder(liveSceneEvents.current.indexOf(s.paragraphId, s.index), -1);
                    }}
                    className="p-0.5 text-neutral-400 hover:text-white"
                    title="Move Scene Up in Script"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button aria-label="Move Scene Down in Script"
                    onClick={(e) => {
                      e.stopPropagation();
                      liveSceneEvents.current.handleMoveSceneOrder(liveSceneEvents.current.indexOf(s.paragraphId, s.index), 1);
                    }}
                    className="p-0.5 text-neutral-400 hover:text-white"
                    title="Move Scene Down in Script"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Scene Info Badges */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] dc-meta text-neutral-400">
                {visibleColumns.setting && <span className="flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {s.setting}
                </span>}
                {visibleColumns.time && <span className="flex items-center gap-1">
                  {s.time === 'NIGHT' ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
                  {s.time}
                </span>}
                {visibleColumns.length && <span>{formatEighths(s.eighths)} {s.eighths > 8 ? 'pages' : 'page'} · {s.pageLabels.join(', ')}</span>}
                {s.notesCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-mono">
                    {s.notesCount} Notes
                  </span>
                )}
              </div>

              {/* Scene Characters Chips */}
              {linkedBeats.length>0 && <div className="flex flex-wrap gap-1" aria-label={'Story beats for '+s.heading}>{linkedBeats.map(b=><span key={b.id} className="px-1.5 py-0.5 rounded text-[10px]" style={{border:'1px solid '+b.color,color:b.color}}>{b.title}</span>)}</div>}
              {visibleColumns.summary && s.summary && s.summary !== s.heading.split('-')[0].trim() && <p className="dc-nav-summary text-[11px] text-neutral-400 line-clamp-2">{s.summary}</p>}
              {visibleColumns.characters && s.characters.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {s.characters.map((c) => (
                    <span
                      key={c}
                      className="px-1.5 py-0.2 bg-neutral-800 text-neutral-300 rounded text-[9px] dc-fine-meta font-mono"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
            );sceneNodes.current.set(s.paragraphId,{state,node});return node;
          })}
        </div>
      )}

      {activeTab === 'cast-list' && <CastListTab doc={document} query={searchQuery} onSelectScene={onSelectScene} />}

      {/* TAB 2: CHARACTERS NAVIGATOR */}
      {activeTab === 'characters' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {stats.characters.map((char) => {
            const count = stats.characterLinesCount[char] || 0;
            const totalLines = Object.values(stats.characterLinesCount).reduce((a, b) => a + b, 0);
            const percent = totalLines > 0 ? Math.round((count / totalLines) * 100) : 0;
            const voice = document.characterVoiceMap?.[char] || 'Kore';
            const highlight = document.characterHighlightMap?.[char];

            // Co-occurring characters in scenes
            const appearances = scenes.filter((s) => s.characters.includes(char)).length;

            return (
              <div
                key={char}
                className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col gap-2"
                style={highlight ? { borderLeftWidth: '4px', borderLeftColor: highlight } : {}}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold font-screenplay text-white text-xs">{char}</span>
                    <button aria-label="Rename Character throughout entire screenplay and Beat Board"
                      onClick={() => {
                        setRenameTargetChar(char);
                        setNewCharName(char);
                      }}
                      className="p-1 hover:text-amber-400 text-neutral-500"
                      title="Rename Character throughout entire screenplay and Beat Board"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button aria-label="Audition voice actor"
                      onClick={() => onOpenTableReadSnippet(`Audition lines for ${char}`, char)}
                      className="p-1 text-neutral-400 hover:text-blue-400"
                      title="Audition voice actor"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{appearances} Scene Appearances</span>
                  <span className="font-mono">{count} lines ({percent}%) · {interactions.words.get(char) || 0} words</span>
                </div>
                {interactions.partners(char).length > 0 && <div className="dc-nav-partners" aria-label={'Characters sharing scenes with ' + char}>
                  <span>Shares scenes with</span>{interactions.partners(char).slice(0, 4).map(([name, n]) => <b key={name} title={n + ' shared scene' + (n === 1 ? '' : 's')}>{name} <i>{n}</i></b>)}
                </div>}

                {/* Assigned Spoken Voice Picker */}
                <div className="flex items-center justify-between text-[10px] dc-meta bg-black/40 p-1.5 rounded-lg border border-white/5">
                  <span className="text-neutral-400">TTS Spoken Voice:</span>
                  <select
                    value={voice}
                    onChange={(e) => {
                      const voiceMap = { ...(document.characterVoiceMap || {}), [char]: e.target.value };
                      onUpdateDocument({ ...document, characterVoiceMap: voiceMap });
                    }}
                    className="bg-neutral-800 text-white rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    {PREBUILT_VOICES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Highlight Picker */}
                <div className="flex items-center justify-between text-[10px] dc-meta pt-1">
                  <span className="text-neutral-400">Rehearsal Highlight:</span>
                  <div className="flex items-center gap-1">
                    {HIGHLIGHT_COLORS.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => {
                          const highlightMap = { ...(document.characterHighlightMap || {}) };
                          if (highlightMap[char] === hex) delete highlightMap[char];
                          else highlightMap[char] = hex;
                          onUpdateDocument({ ...document, characterHighlightMap: highlightMap });
                        }}
                        className={`w-2.5 h-2.5 rounded-full ${highlight === hex ? 'ring-2 ring-white scale-125' : 'opacity-60'}`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'locations' && <LocationsTab doc={document} query={searchQuery} onSelectScene={onSelectScene} />}
      {activeTab === 'outline' && <OutlineTab doc={document} query={searchQuery} onSelectScene={onSelectScene} onPage={page => onNavigatePage?.(page)} />}
      {/* TAB 3: SCRIPTNOTES NAVIGATOR (Section 6: Search & Filter) */}
      {activeTab === 'notes' && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {/* Note Search & Filter Controls */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 space-y-2 shrink-0">
            {/* Live Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={noteSearchQuery}
                onChange={(e) => setNoteSearchQuery(e.target.value)}
                placeholder="Search notes, names, authors, scenes..."
                className="w-full bg-[#181822] text-xs text-white rounded-lg pl-8 pr-3 py-1.5 border border-white/10 placeholder-neutral-500 focus:outline-none focus:border-amber-400/60"
              />
              {noteSearchQuery && (
                <button
                  onClick={() => setNoteSearchQuery('')}
                  className="absolute right-2.5 top-1.5 text-neutral-400 hover:text-white text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Note Color Filter Buttons */}
            <div className="flex items-center justify-between text-[10px] dc-meta">
              <span className="text-neutral-400 font-medium">Color:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setNoteColorFilter('all')}
                  className={`px-1.5 py-0.5 rounded text-[9px] dc-fine-meta ${
                    noteColorFilter === 'all'
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                {(['yellow', 'blue', 'rose', 'emerald', 'purple', 'orange'] as ScriptNoteColor[]).map((c) => {
                  const th = SCRIPT_NOTE_THEMES[c];
                  const isSelected = noteColorFilter === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setNoteColorFilter(isSelected ? 'all' : c)}
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        isSelected ? 'ring-2 ring-white scale-125' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: th.accentHex }}
                      title={th.label}
                    />
                  );
                })}
              </div>
            </div>

            {/* Author & Type Filters */}
            <div className="flex items-center gap-1.5 text-[10px] dc-meta">
              <select
                value={noteAuthorFilter}
                onChange={(e) => setNoteAuthorFilter(e.target.value)}
                className="bg-[#181822] text-neutral-300 rounded px-1.5 py-1 border border-white/10 focus:outline-none flex-1 truncate"
              >
                <option value="all">All Authors</option>
                {uniqueAuthors.map((auth) => (
                  <option key={auth} value={auth}>
                    {auth}
                  </option>
                ))}
              </select>

              <select
                value={noteTypeFilter}
                onChange={(e) => setNoteTypeFilter(e.target.value as any)}
                className="bg-[#181822] text-neutral-300 rounded px-1.5 py-1 border border-white/10 focus:outline-none flex-1 truncate"
              >
                <option value="all">All Note Types</option>
                <option value="notes">ScriptNotes Only</option>
                <option value="scene_comments">Scene Comments Only</option>
              </select>
            </div>
          </div>

          {/* Filtered Notes List */}
          <div className="space-y-2.5 overflow-y-auto">
            {/* Inline ScriptNotes */}
            {noteTypeFilter !== 'scene_comments' &&
              allNotes
                .filter((item) => {
                  if (noteColorFilter !== 'all' && item.note.color !== noteColorFilter) return false;
                  if (noteAuthorFilter !== 'all' && item.note.author !== noteAuthorFilter) return false;
                  if (noteSearchQuery) {
                    const q = noteSearchQuery.toLowerCase();
                    const matchText = item.note.text.toLowerCase().includes(q);
                    const matchName = item.note.name?.toLowerCase().includes(q);
                    const matchAuthor = item.note.author.toLowerCase().includes(q);
                    const matchScene = item.sceneHeading.toLowerCase().includes(q);
                    return matchText || matchName || matchAuthor || matchScene;
                  }
                  return true;
                })
                .map((item, idx) => {
                  const theme = SCRIPT_NOTE_THEMES[item.note.color] || SCRIPT_NOTE_THEMES.yellow;
                  return (
                    <div
                      key={`note-${item.note.id}-${idx}`}
                      className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 group relative hover:border-white/20 transition-colors"
                      style={{ borderLeftWidth: '3.5px', borderLeftColor: theme.accentHex }}
                    >
                      <div className="flex items-center justify-between text-[10px] dc-meta">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-bold tracking-wide"
                            style={{ color: theme.accentHex }}
                          >
                            {item.note.name || 'ScriptNote'}
                          </span>
                          {item.note.category && (
                            <span className="text-[9px] dc-fine-meta uppercase px-1 py-0.2 bg-white/10 text-neutral-300 rounded font-mono">
                              {item.note.category}
                            </span>
                          )}
                        </div>
                        <span className="text-neutral-500 font-mono">{item.note.createdAt}</span>
                      </div>

                      <div className="text-[10px] dc-meta text-neutral-400 flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        <span>By {item.note.author}</span>
                      </div>

                      <textarea
                        rows={2}
                        aria-label={'ScriptNote text — ' + item.sceneHeading}
                        value={item.note.text}
                        onChange={(e) => {
                          const newText = e.target.value;
                          const updated = document.paragraphs.map((p) => {
                            if (p.id === item.paragraphId && p.notes) {
                              return {
                                ...p,
                                notes: p.notes.map((n) =>
                                  n.id === item.note.id ? { ...n, text: newText } : n
                                ),
                              };
                            }
                            return p;
                          });
                          onUpdateDocument({ ...document, paragraphs: updated });
                        }}
                        className="bg-black/20 text-xs text-white border border-transparent focus:border-white/20 rounded p-1 focus:outline-none w-full resize-none font-sans"
                      />

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] dc-fine-meta text-neutral-500 font-mono">
                        <button
                          onClick={() => handleJumpToParagraph(item.paragraphId)}
                          className="text-neutral-400 hover:text-amber-400 truncate max-w-44 text-left flex items-center gap-1"
                          title="Jump to this location in script"
                        >
                          <ChevronRight className="w-2.5 h-2.5" />
                          <span className="truncate">{item.sceneHeading}</span>
                        </button>

                        <button aria-label="Delete ScriptNote"
                          onClick={() => {
                            const updated = document.paragraphs.map((p) => {
                              if (p.id === item.paragraphId && p.notes) {
                                return { ...p, notes: p.notes.filter((n) => n.id !== item.note.id) };
                              }
                              return p;
                            });
                            onUpdateDocument({ ...document, paragraphs: updated });
                          }}
                          className="text-neutral-500 hover:text-red-400 opacity-60 hover:opacity-100 p-0.5"
                          title="Delete ScriptNote"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

            {/* Scene Comments in Notes Tab */}
            {noteTypeFilter !== 'notes' &&
              allSceneComments
                .filter((sc) => {
                  if (noteSearchQuery) {
                    const q = noteSearchQuery.toLowerCase();
                    return sc.comment.toLowerCase().includes(q) || sc.sceneHeading.toLowerCase().includes(q);
                  }
                  return true;
                })
                .map((sc, idx) => (
                  <div
                    key={`sc-${sc.paragraphId}-${idx}`}
                    className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-1.5 group relative"
                    style={{ borderLeftWidth: '3.5px', borderLeftColor: '#10b981' }}
                  >
                    <div className="flex items-center justify-between text-[10px] dc-meta">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Clapperboard className="w-3 h-3" />
                        Scene Comment
                      </span>
                      <span className="text-neutral-500 font-mono">Production</span>
                    </div>

                    <textarea
                      rows={2}
                      value={sc.comment}
                      onChange={(e) => {
                        const newComment = e.target.value;
                        const updated = document.paragraphs.map((p) =>
                          p.id === sc.paragraphId ? { ...p, sceneComment: newComment } : p
                        );
                        onUpdateDocument({ ...document, paragraphs: updated });
                      }}
                      className="bg-black/30 text-xs text-emerald-100 border border-transparent focus:border-emerald-500/30 rounded p-1 focus:outline-none w-full resize-none font-sans"
                    />

                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] dc-fine-meta text-neutral-500 font-mono">
                      <button
                        onClick={() => handleJumpToParagraph(sc.paragraphId)}
                        className="text-emerald-300 hover:text-emerald-200 truncate max-w-44 text-left flex items-center gap-1"
                      >
                        <ChevronRight className="w-2.5 h-2.5" />
                        <span className="truncate">{sc.sceneHeading}</span>
                      </button>

                      <button aria-label="Delete Scene Comment"
                        onClick={() => {
                          const updated = document.paragraphs.map((p) =>
                            p.id === sc.paragraphId ? { ...p, sceneComment: undefined } : p
                          );
                          onUpdateDocument({ ...document, paragraphs: updated });
                        }}
                        className="text-neutral-500 hover:text-red-400 opacity-60 hover:opacity-100 p-0.5"
                        title="Delete Scene Comment"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}

            {allNotes.length === 0 && allSceneComments.length === 0 && (
              <div className="text-center text-neutral-500 py-8">
                No ScriptNotes or Scene Comments in script. Click the note or clapperboard icon on any element to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BOOKMARKS NAVIGATOR (Section 6: Bookmarks Management) */}
      {activeTab === 'bookmarks' && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={bookmarkSearchQuery}
                onChange={(e) => setBookmarkSearchQuery(e.target.value)}
                placeholder="Search bookmarks..."
                className="w-full bg-[#181822] text-xs text-white rounded-lg pl-8 pr-3 py-1.5 border border-white/10 placeholder-neutral-500 focus:outline-none focus:border-blue-400/60"
              />
            </div>
            <div className="text-[10px] dc-meta text-neutral-400 flex items-center justify-between">
              <span>{allBookmarks.length} Bookmarks in Script</span>
              <span className="font-mono text-[9px] dc-fine-meta text-neutral-500">Shortcut: Cmd+Shift+]</span>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto">
            {allBookmarks.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                No bookmarks set. Click the bookmark icon on any paragraph to set a bookmark ribbon.
              </div>
            ) : (
              allBookmarks
                .filter((bm) => {
                  if (bookmarkSearchQuery) {
                    const q = bookmarkSearchQuery.toLowerCase();
                    return bm.bookmark.name.toLowerCase().includes(q) || bm.sceneHeading.toLowerCase().includes(q);
                  }
                  return true;
                })
                .map((item, idx) => (
                  <div
                    key={`bm-list-${item.bookmark.id}-${idx}`}
                    className="bg-black/30 border border-white/10 rounded-xl p-2.5 flex flex-col gap-1.5 hover:border-white/20 transition-colors"
                    style={{ borderLeftWidth: '3.5px', borderLeftColor: item.bookmark.color }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Bookmark
                          className="w-3.5 h-3.5"
                          style={{ color: item.bookmark.color, fill: item.bookmark.color }}
                        />
                        <input
                          type="text"
                          value={item.bookmark.name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            const updated = document.paragraphs.map((p) => {
                              if (p.id === item.paragraphId && p.bookmark) {
                                const bmObj: ScriptBookmark =
                                  typeof p.bookmark === 'object'
                                    ? { ...p.bookmark, name: newName }
                                    : { id: `bm-${p.id}`, name: newName, color: '#3b82f6', createdAt: '' };
                                return { ...p, bookmark: bmObj };
                              }
                              return p;
                            });
                            onUpdateDocument({ ...document, paragraphs: updated });
                          }}
                          className="bg-transparent text-xs font-semibold text-white border-b border-transparent focus:border-blue-400 focus:outline-none w-40 truncate"
                        />
                      </div>

                      <button
                        onClick={() => handleJumpToParagraph(item.paragraphId)}
                        className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-[10px] dc-meta font-mono flex items-center gap-0.5 transition-colors"
                        title="Jump to this bookmark"
                      >
                        Jump
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] dc-fine-meta text-neutral-500 font-mono">
                      <span className="truncate max-w-44">{item.sceneHeading}</span>
                      <button aria-label="Remove Bookmark"
                        onClick={() => {
                          const updated = document.paragraphs.map((p) =>
                            p.id === item.paragraphId ? { ...p, bookmark: undefined } : p
                          );
                          onUpdateDocument({ ...document, paragraphs: updated });
                        }}
                        className="text-neutral-500 hover:text-red-400"
                        title="Remove Bookmark"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TAGS NAVIGATOR */}
      {activeTab==='tags'&&<NavigatorResults doc={document} view={defaultNavigatorView('Tags','tags')} onJump={id=>{const occurrence=studio(document).occurrences.find(o=>o.tagId===id&&!o.deleted);if(occurrence)onSelectScene(paragraphs.findIndex(p=>p.id===occurrence.paragraphId));}}/>}
      {studio(document).navigator.some(v=>v.id===activeTab)&&<NavigatorResults doc={document} view={studio(document).navigator.find(v=>v.id===activeTab)!} onJump={id=>{const index=paragraphs.findIndex(p=>p.id===id);if(index>=0)onSelectScene(index);}}/>}

      {/* Global Character Rename Modal Dialog */}
      <UIPresence>{renameTargetChar && (
        <DialogOverlay open={Boolean(renameTargetChar)} onClose={() => setRenameTargetChar(null)} className="dc-rename fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f1f28] dc-bg-panel border border-white/15 rounded-xl p-5 w-full max-w-md space-y-4 shadow-2xl">
            <h4 className="font-bold text-white text-sm">
              Global Rename Character: {renameTargetChar}
            </h4>
            <p className="text-xs text-neutral-400">
              This will update character headings across the entire screenplay, and update matching descriptions in the Beat Board.
            </p>
            <input
              type="text"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value.toUpperCase())}
              className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white font-screenplay uppercase focus:outline-none focus:border-amber-500/50"
              placeholder="NEW CHARACTER NAME"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRenameTargetChar(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleGlobalRename}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs"
              >
                Rename Everywhere
              </button>
            </div>
          </div>
        </DialogOverlay>
      )}</UIPresence>
    </aside>
  );
};

const COLUMN_LABELS: Record<NavigatorColumn, string> = { number: '#', color: 'Colour', heading: 'Heading', setting: 'INT/EXT', time: 'Time', length: 'Length', characters: 'Characters', summary: 'Summary', comment: 'Comment' };
const COLUMN_NAMES: Record<NavigatorColumn, string> = { ...COLUMN_LABELS, number: 'Scene number', comment: 'Scene comment' };
/** Length in pages and eighths, as written on a breakdown: 3/8, 1, 1 2/8. */
export function formatEighths(eighths: number) { const whole = Math.floor(eighths / 8), rest = eighths % 8; return whole && rest ? whole + ' ' + rest + '/8' : whole ? String(whole) : rest + '/8'; }
interface TableScene { index: number; paragraphId: string; number: string; heading: string; setting: string; time: string; summary: string; characters: string[]; eighths: number; pageLabels: string[]; sceneComment?: string; sceneColor?: string }
type SceneField = 'sceneSummary' | 'sceneComment' | 'sceneColor';
const clampWidth = (w: number) => Math.round(Math.max(NAVIGATOR_COLUMN_LIMITS.min, Math.min(NAVIGATOR_COLUMN_LIMITS.max, w)));
const SCENE_COLOR_DEFAULT = '#9aa3b9';
/** The Navigator's scene table.
 * - Column edges are dragged (or moved with the arrow keys) to resize; double-clicking an edge restores the default.
 * - Clicking a header sorts by that column, again to reverse. Dragging a header (or Alt+← / Alt+→ on it) moves the
 *   column; the order is saved with the workspace.
 * - Heading, summary and scene comment are edited in place (double-click, or F2 on a row for the heading); the colour
 *   cell sets the scene colour used by index cards, the timeline and Structure Lines.
 * While a column is resized, only the column element and the table width change; the width is saved when the drag ends. */
function SceneTable({ scenes, columns, widths, sortField, sortAsc, onSort, onWidths, onOrder, editing, onEdit, onSelect, onHeading, onField }: {
  scenes: TableScene[]; columns: NavigatorColumn[]; widths: Record<NavigatorColumn, number>; sortField: string; sortAsc: boolean;
  onSort: (key: NavigatorColumn) => void; onWidths: (widths: Record<NavigatorColumn, number>) => void; onOrder: (moved: NavigatorColumn, before: NavigatorColumn | null) => void;
  editing: string | null; onEdit: (id: string | null) => void; onSelect: (index: number) => void; onHeading: (id: string, text: string) => void;
  onField: (id: string, field: SceneField, value: string) => void;
}) {
  const table = useRef<HTMLTableElement>(null);
  const [fieldEdit, setFieldEdit] = useState<{ id: string; field: 'sceneSummary' | 'sceneComment' } | null>(null);
  const [dropBefore, setDropBefore] = useState<{ key: NavigatorColumn | null } | null>(null);
  const total = (w: Record<NavigatorColumn, number>) => columns.reduce((sum, c) => sum + w[c], 0);
  const setWidth = (key: NavigatorColumn, width: number) => onWidths({ ...widths, [key]: clampWidth(width) });
  const drag = (key: NavigatorColumn, e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return; e.preventDefault(); e.stopPropagation();
    const handle = e.currentTarget, start = e.clientX, from = widths[key], col = table.current?.querySelector<HTMLElement>('col[data-column="' + key + '"]');
    handle.setPointerCapture(e.pointerId); handle.dataset.dragging = 'true';
    const width = (ev: PointerEvent) => clampWidth(from + ev.clientX - start);
    const move = (ev: PointerEvent) => { const w = width(ev); if (col) col.style.width = w + 'px'; if (table.current) table.current.style.width = total({ ...widths, [key]: w }) + 'px'; handle.setAttribute('aria-valuenow', String(w)); };
    const up = (ev: PointerEvent) => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); delete handle.dataset.dragging; setWidth(key, width(ev)); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
  };
  // Column reordering: drag a header onto another header (it lands before it) or past the last one.
  const COLUMN_TYPE = 'application/x-draftcraft-column';
  const headerAt = (clientX: number): NavigatorColumn | null => { const ths = [...(table.current?.querySelectorAll<HTMLElement>('thead th[data-column]') || [])]; const hit = ths.find(th => { const r = th.getBoundingClientRect(); return clientX < r.left + r.width / 2; }); return (hit?.dataset.column as NavigatorColumn) || null; };
  const rows = useRef(new Map<string, { state: string; node: React.ReactNode }>());
  const indexById = new Map(scenes.map(s => [s.paragraphId, s.index]));
  const live = useRef({ onSelect, onEdit, onHeading, onField, setFieldEdit, indexById }); live.current = { onSelect, onEdit, onHeading, onField, setFieldEdit, indexById };
  const select = (s: TableScene) => live.current.onSelect(live.current.indexById.get(s.paragraphId) ?? s.index);
  const textEditor = (s: TableScene, field: 'sceneSummary' | 'sceneComment', value: string, label: string) => <input autoFocus aria-label={label} defaultValue={value} className="dc-nav-cell-input"
    onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}
    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = value; e.currentTarget.blur(); } }}
    onBlur={e => { const text = e.currentTarget.value.trim(); live.current.setFieldEdit(null); if (text !== value.trim()) live.current.onField(s.paragraphId, field, text); }} />;
  const cell = (s: TableScene, key: NavigatorColumn) => {
    switch (key) {
      case 'number': return <td key={key} data-column={key} className="dc-nav-td-number">{s.number}</td>;
      case 'color': return <td key={key} data-column={key} className="dc-nav-td-color" onClick={e => e.stopPropagation()}>
        <input type="color" aria-label={'Scene colour for ' + s.heading} value={s.sceneColor && /^#[0-9a-f]{6}$/i.test(s.sceneColor) ? s.sceneColor : SCENE_COLOR_DEFAULT} onChange={e => live.current.onField(s.paragraphId, 'sceneColor', e.target.value)} data-unset={!s.sceneColor} /></td>;
      case 'heading': return <td key={key} data-column={key} className="dc-nav-td-heading" title={s.heading + ' — double-click to edit'} onDoubleClick={e => { e.stopPropagation(); live.current.onEdit(s.paragraphId); }}>
        {editing === s.paragraphId ? <input autoFocus aria-label="Scene heading" defaultValue={s.heading} className="dc-nav-cell-input" onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = s.heading; e.currentTarget.blur(); } }}
          onBlur={e => { const text = e.currentTarget.value.toUpperCase().trim(); live.current.onEdit(null); if (text && text !== s.heading) live.current.onHeading(s.paragraphId, text); }} /> : s.heading}</td>;
      case 'setting': return <td key={key} data-column={key}>{s.setting === 'EXTERIOR' ? 'EXT' : s.setting === 'INTERIOR' ? 'INT' : ''}</td>;
      case 'time': return <td key={key} data-column={key} title={s.time}>{s.time}</td>;
      case 'length': return <td key={key} data-column={key} className="dc-nav-td-length" title={s.pageLabels.length ? 'Page ' + s.pageLabels.join(', ') : undefined}>{formatEighths(s.eighths)}</td>;
      case 'characters': return <td key={key} data-column={key} title={s.characters.join(', ')}>{s.characters.join(', ')}</td>;
      case 'summary': return <td key={key} data-column={key} title={(s.summary || '') + ' — double-click to edit'} onDoubleClick={e => { e.stopPropagation(); live.current.setFieldEdit({ id: s.paragraphId, field: 'sceneSummary' }); }}>
        {fieldEdit?.id === s.paragraphId && fieldEdit.field === 'sceneSummary' ? textEditor(s, 'sceneSummary', s.summary, 'Scene summary') : s.summary}</td>;
      case 'comment': return <td key={key} data-column={key} title={(s.sceneComment || '') + ' — double-click to edit'} onDoubleClick={e => { e.stopPropagation(); live.current.setFieldEdit({ id: s.paragraphId, field: 'sceneComment' }); }}>
        {fieldEdit?.id === s.paragraphId && fieldEdit.field === 'sceneComment' ? textEditor(s, 'sceneComment', s.sceneComment || '', 'Scene comment') : s.sceneComment}</td>;
    }
  };
  return <div className="dc-scene-table-wrap flex-1 overflow-auto">
    <table ref={table} className="dc-scene-table" aria-label="Scenes" aria-rowcount={scenes.length + 1} style={{ width: total(widths) }}>
      <colgroup>{columns.map(c => <col key={c} data-column={c} style={{ width: widths[c] }} />)}</colgroup>
      <thead><tr onDragOver={e => { if (!e.dataTransfer.types.includes(COLUMN_TYPE)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropBefore({ key: headerAt(e.clientX) }); }}
        onDragLeave={e => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropBefore(null); }}
        onDrop={e => { const moved = e.dataTransfer.getData(COLUMN_TYPE) as NavigatorColumn; setDropBefore(null); if (!moved) return; e.preventDefault(); const before = headerAt(e.clientX); if (before !== moved) onOrder(moved, before); }}>
        {columns.map((c, i) => <th key={c} scope="col" data-column={c} draggable data-drop-before={dropBefore?.key === c || undefined} data-drop-after={dropBefore && dropBefore.key === null && i === columns.length - 1 || undefined} aria-sort={sortField === c ? (sortAsc ? 'ascending' : 'descending') : 'none'}
          onDragStart={e => { e.dataTransfer.setData(COLUMN_TYPE, c); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDropBefore(null)}>
        <button type="button" className="dc-nav-th" title={'Sort by ' + COLUMN_NAMES[c] + (sortField === c ? ' (click again to reverse)' : '') + '. Drag to move the column; Alt+← / Alt+→ also move it.'} onClick={() => onSort(c)}
          onKeyDown={e => { if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); const at = columns.indexOf(c), next = e.key === 'ArrowLeft' ? at - 1 : at + 2; if (e.key === 'ArrowLeft' && at === 0 || e.key === 'ArrowRight' && at === columns.length - 1) return; onOrder(c, next >= columns.length ? null : columns[next]); requestAnimationFrame(() => table.current?.querySelector<HTMLElement>('thead th[data-column="' + c + '"] .dc-nav-th')?.focus()); } }}>
          <span>{COLUMN_LABELS[c]}</span>{sortField === c && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</button>
        <span role="separator" tabIndex={0} aria-orientation="vertical" aria-label={'Resize ' + COLUMN_NAMES[c] + ' column'} aria-valuemin={NAVIGATOR_COLUMN_LIMITS.min} aria-valuemax={NAVIGATOR_COLUMN_LIMITS.max} aria-valuenow={widths[c]}
          className="dc-nav-col-resize" title="Drag to resize; double-click for the default width" draggable={false} onDragStart={e => { e.preventDefault(); e.stopPropagation(); }} onPointerDown={e => drag(c, e)} onClick={e => e.stopPropagation()}
          onDoubleClick={e => { e.stopPropagation(); setWidth(c, NAVIGATOR_COLUMN_WIDTHS[c]); }}
          onKeyDown={e => { const step = e.shiftKey ? 40 : 10; if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); setWidth(c, widths[c] + (e.key === 'ArrowRight' ? step : -step)); } else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); setWidth(c, e.key === 'Home' ? NAVIGATOR_COLUMN_LIMITS.min : NAVIGATOR_COLUMN_LIMITS.max); } }} />
      </th>)}</tr></thead>
      <tbody>{scenes.map(s => {
        const state = JSON.stringify([{ ...s, index: 0 }, columns, editing === s.paragraphId, fieldEdit?.id === s.paragraphId ? fieldEdit.field : '']), hit = rows.current.get(s.paragraphId); if (hit?.state === state) return hit.node;
        const node = <tr key={s.paragraphId} data-scene-id={s.paragraphId} tabIndex={0} onClick={() => select(s)}
          onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(s); } if (e.target === e.currentTarget && e.key === 'F2') { e.preventDefault(); live.current.onEdit(s.paragraphId); } }}>{columns.map(c => cell(s, c))}</tr>;
        rows.current.set(s.paragraphId, { state, node }); return node;
      })}</tbody>
    </table>
    {!scenes.length && <p className="dc-scene-table-empty">No scenes match.</p>}
  </div>;
}

/** The Navigator follows the script one step behind while the writer types: its statistics, scene lists and
 * character tables are rebuilt in a low-priority render (useDeferredValue) instead of inside every keystroke.
 * As soon as the writer reaches into the Navigator (pointer or keyboard focus), it switches to the live document
 * synchronously, so every click, rename or reorder acts on the latest text. Callbacks are read through a ref, so
 * the memoized Navigator does not re-render just because the parent passed new function objects. */
const MemoNavigator = React.memo(NavigatorSidebar);
export function DeferredNavigator(props: NavigatorSidebarProps) {
  const [live, setLive] = useState(false);
  const deferred = React.useDeferredValue(props.document);
  const actions = useRef(props); actions.current = props;
  const stable = useMemo(() => ({
    onUpdateDocument: (d: ScriptDocument) => actions.current.onUpdateDocument(d),
    onSelectScene: (i: number) => actions.current.onSelectScene(i),
    onToggle: () => actions.current.onToggle(),
    onNavigatePage: (p: number) => actions.current.onNavigatePage?.(p),
    onPrefs: (patch: Partial<NavigatorPreferences>) => actions.current.onPrefs?.(patch),
    onOpenTableReadSnippet: (t: string, c: string) => actions.current.onOpenTableReadSnippet(t, c),
  }), []);
  const goLive = () => { if (!live) flushSync(() => setLive(true)); };
  // Back to deferred updates once the writer works somewhere else (pointer or focus outside the Navigator).
  useEffect(() => {
    if (!live) return;
    const away = (e: Event) => { const t = e.target as HTMLElement | null; if (!t?.closest?.('.dc-navigator, .dc-navigator-rail, [role="dialog"], [role="menu"]')) setLive(false); };
    document.addEventListener('pointerdown', away, true); document.addEventListener('focusin', away, true);
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('focusin', away, true); };
  }, [live]);
  return <div className="dc-navigator-host" style={{ display: 'contents' }} onPointerDownCapture={goLive} onFocusCapture={goLive} onKeyDownCapture={goLive}>
    <MemoNavigator {...props} {...stable} document={live ? props.document : deferred} />
  </div>;
}

/** Navigator Cast List: one row per character with scenes, pages, eighths and estimated screen time (1 page ≈ 1 minute).
 * Headers sort (click again to reverse); a row goes to the character's first scene; Export writes a CSV. */
function CastListTab({ doc, query, onSelectScene }: { doc: ScriptDocument; query: string; onSelectScene: (index: number) => void }) {
  const [sort, setSort] = useState<{ field: CastSort; asc: boolean }>({ field: 'first', asc: true });
  const all = useMemo(() => castList(doc), [doc]);
  const term = query.trim().toLocaleUpperCase();
  const rows = sortCast(all.filter(e => !term || e.name.includes(term)), sort.field, sort.asc);
  const columns: [CastSort, string, string][] = [['name', 'Character', 'Character name'], ['scenes', 'Scenes', 'Number of scenes'], ['pages', 'Pages', 'Number of pages'], ['eighths', 'Eighths', 'Length in pages and eighths'], ['screen', 'Screen time', 'Estimated screen time (1 page ≈ 1 minute)'], ['speeches', 'Speeches', 'Number of speeches'], ['words', 'Words', 'Words spoken']];
  const total = all.reduce((n, e) => Math.max(n, e.eighths), 0);
  return <div className="dc-cast-list flex-1 min-h-0 flex flex-col">
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-neutral-400">
      <span>{all.length} character{all.length === 1 ? '' : 's'} · screen time estimated at 1 page ≈ 1 minute</span>
      <button type="button" className="px-2 py-0.5 border border-white/15 rounded hover:bg-white/10 text-neutral-200" disabled={!all.length} onClick={() => downloadText('Cast-List.csv', castListCsv(sortCast(all, sort.field, sort.asc)))}>Export CSV</button>
    </div>
    <div className="flex-1 overflow-auto">
      <table className="dc-scene-table dc-cast-table" aria-label="Cast List" style={{ width: '100%' }}>
        <thead><tr>{columns.map(([field, label, long]) => <th key={field} scope="col" aria-sort={sort.field === field ? (sort.asc ? 'ascending' : 'descending') : 'none'}>
          <button type="button" className="dc-nav-th" title={'Sort by ' + long} onClick={() => setSort(v => v.field === field ? { field, asc: !v.asc } : { field, asc: field === 'name' })}>
            <span>{label}</span>{sort.field === field && (sort.asc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</button></th>)}</tr></thead>
        <tbody>{rows.map(e => <tr key={e.name} data-character={e.name} tabIndex={0} title={'Scenes ' + e.sceneNumbers.join(', ') + ' · pages ' + e.pages.join(', ')}
          onClick={() => { const i = doc.paragraphs.findIndex(p => p.id === e.firstSceneId); if (i >= 0) onSelectScene(i); }}
          onKeyDown={ev => { if (ev.target === ev.currentTarget && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); const i = doc.paragraphs.findIndex(p => p.id === e.firstSceneId); if (i >= 0) onSelectScene(i); } }}>
          <td data-column="name" className="dc-nav-td-heading">{e.name}</td><td data-column="scenes">{e.scenes}</td><td data-column="pages">{e.pages.length}</td>
          <td data-column="eighths" className="dc-nav-td-length">{formatEighths(e.eighths)}</td>
          <td data-column="screen" className="dc-nav-td-length"><span className="dc-cast-bar" style={{ width: total ? Math.max(2, Math.round(e.eighths / total * 36)) : 0 }} aria-hidden />{formatScreenTime(e.screenSeconds)}</td>
          <td data-column="speeches">{e.speeches}</td><td data-column="words">{e.words}</td></tr>)}</tbody>
      </table>
      {!rows.length && <p className="dc-scene-table-empty">{all.length ? 'No characters match.' : 'No characters yet. Characters appear here once they speak in a scene or are on a scene’s cast list.'}</p>}
    </div>
  </div>;
}
