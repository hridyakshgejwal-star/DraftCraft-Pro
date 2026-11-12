import {productionScenes} from '../production/queries';
import type {ScriptDocument} from '../types/script';
import {moveScene} from '../editor/scenes';
import React, { useState } from 'react';
import { Paragraph, ElementType } from '../types/script';
import {
  List,
  Search,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  MapPin,
  Sun,
  Moon,
  Clock,
  MessageSquare,
  Bookmark,
  Printer,
  Download,
  Check,
  Palette,
  Sliders,
  Filter,
} from 'lucide-react';

interface SceneListViewProps {
  document?:ScriptDocument;
  paragraphs: Paragraph[];
  onParagraphsChange: (paragraphs: Paragraph[]) => void;
  onJumpToScene: (sceneParagraphId: string) => void;
  isDarkMode: boolean;
}

const SCENE_STRIP_COLORS = [
  { name: 'Default', hex: '#374151', label: 'Gray' },
  { name: 'Amber', hex: '#d97706', label: 'Amber (Warm)' },
  { name: 'Blue', hex: '#2563eb', label: 'Blue (Night/Tech)' },
  { name: 'Rose', hex: '#e11d48', label: 'Rose (Climax/Tension)' },
  { name: 'Emerald', hex: '#059669', label: 'Emerald (Action/Ext)' },
  { name: 'Purple', hex: '#7c3aed', label: 'Purple (Mystery/VFX)' },
];

export const SceneListView: React.FC<SceneListViewProps> = ({
  paragraphs,document:project,
  onParagraphsChange,
  onJumpToScene,
  isDarkMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomDensity, setZoomDensity] = useState<'compact' | 'comfortable' | 'expanded'>('comfortable');
  const [sortField, setSortField] = useState<'number' | 'length' | 'heading'>('number');
  const [sortAsc, setSortAsc] = useState(true);

  interface SceneRowData {
    id: string;
    globalIndex: number;
    sceneNumber: string;
    heading: string;
    summary: string;
    color: string;
    setting: 'INTERIOR' | 'EXTERIOR' | 'UNSPECIFIED';
    time: string;
    characters: string[];
    lineCount: number;
    eighthsCount: number; // Hollywood 1/8th of a page
    notesCount: number;
    hasBookmark: boolean;
  }

  const scenes: SceneRowData[] = [];
  let currentScene: SceneRowData | null = null;

  paragraphs.forEach((p, idx) => {
    if (p.type === 'Scene Heading') {
      const time=p.text.match(/(?:^|\s[-–—]\s)(DAY|NIGHT|DUSK|DAWN|MORNING|EVENING|LATER|CONTINUOUS)\s*$/i)?.[1]?.toUpperCase()||'UNSPECIFIED';

      currentScene = {
        id: p.id,
        globalIndex: idx,
        sceneNumber: p.sceneNumber || `${scenes.length + 1}`,
        heading: p.text,
        summary: p.sceneSummary || (p.sceneComment ? p.sceneComment : ''),
        color: p.sceneColor || '#374151',
        setting: /^EXT\./i.test(p.text)?'EXTERIOR':/^INT\./i.test(p.text)?'INTERIOR':'UNSPECIFIED',
        time,
        characters: [],
        lineCount: 1,
        eighthsCount: 1,
        notesCount: p.notes?.length || 0,
        hasBookmark: Boolean(p.bookmark),
      };
      scenes.push(currentScene);
    } else if (currentScene) {
      currentScene.lineCount += 1;
      currentScene.eighthsCount = Math.max(1, Math.round((currentScene.lineCount / 54) * 8));
      if (p.notes) currentScene.notesCount += p.notes.length;
      if (p.bookmark) currentScene.hasBookmark = true;
      if (p.type === 'Character') {
        const charName = p.text.replace(/\s*\(.*\)/, '').trim().toUpperCase();
        if (charName && !currentScene.characters.includes(charName)) {
          currentScene.characters.push(charName);
        }
      }
    }
  });

  // Reorder scene in script
  const handleMoveSceneRow = (sceneId:string,direction:-1|1)=>onParagraphsChange(moveScene(paragraphs,sceneId,direction));
  const handleUpdateSummary = (sceneId: string, summary: string) => {
    onParagraphsChange(
      paragraphs.map((p) => (p.id === sceneId ? { ...p, sceneSummary: summary } : p))
    );
  };

  const handleUpdateColor = (sceneId: string, colorHex: string) => {
    onParagraphsChange(
      paragraphs.map((p) => (p.id === sceneId ? { ...p, sceneColor: colorHex } : p))
    );
  };

  // Export CSV
  const handleExportCsv = () => {
    let csv = 'Scene #,Heading,Setting,Time,Lines,1/8ths Page,Characters,Summary\n';
    scenes.forEach((s) => {
      csv += `"${s.sceneNumber}","${s.heading}","${s.setting}","${s.time}",${s.lineCount},"${s.eighthsCount}/8","${s.characters.join('; ')}","${(s.summary || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screenplay_scene_view.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const measured=project?new Map(productionScenes(project).map(s=>[s.id,s])):null;for(const scene of scenes){const value=measured?.get(scene.id);if(value){scene.lineCount=value.lines;scene.characters=value.characters;scene.eighthsCount=value.eighths;}}
  const filteredScenes = scenes
    .filter((s) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.heading.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.characters.some((c) => c.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'number') cmp = a.sceneNumber.localeCompare(b.sceneNumber,undefined,{numeric:true});
      else if (sortField === 'length') cmp = a.lineCount - b.lineCount;
      else if (sortField === 'heading') cmp = a.heading.localeCompare(b.heading);
      return sortAsc ? cmp : -cmp;
    });

  return (
    <div
      className={`dc-scenelist flex-1 flex flex-col overflow-hidden select-none transition-colors ${
        isDarkMode ? 'bg-[#15151b]' : 'bg-[#e5e5ea]'
      }`}
    >
      {/* Scene View Header Control Bar */}
      <div className="dc-toolbar h-12 bg-[#1b1b24] dc-bg-chrome border-b border-white/10 px-4 flex items-center justify-between gap-3 shrink-0 text-xs text-neutral-300 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <List className="w-4 h-4 text-emerald-400" />
            <span>Scene View</span>
            <span className="text-[10px] dc-meta text-neutral-400 font-mono">({scenes.length} Scenes)</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scene strips..."
              className="bg-black/40 text-xs text-white rounded-lg pl-8 pr-3 py-1 border border-white/10 w-48 sm:w-60 focus:outline-none focus:border-emerald-400/60"
            />
          </div>
        </div>

        {/* Density Zoom Selector */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-[11px]">
            {(['compact', 'comfortable', 'expanded'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setZoomDensity(d)}
                className={`px-2.5 py-0.5 rounded capitalize transition-colors ${
                  zoomDensity === d
                    ? 'bg-neutral-800 text-white font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button aria-label="Export Scene View as CSV"
            onClick={handleExportCsv}
            className="p-1.5 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors"
            title="Export Scene View as CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Table / Stripboard list */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
        {filteredScenes.map((scene, idx) => {
          return (
            <div
              key={scene.id}
              className={`rounded-xl border border-white/10 overflow-hidden shadow-md transition-colors hover:border-white/25 ${
                isDarkMode ? 'bg-[#1c1c24] dc-bg-panel' : 'bg-white'
              }`}
              style={{ borderLeftWidth: '5px', borderLeftColor: scene.color }}
            >
              {/* Row Bar */}
              <div
                className={`px-4 py-2.5 flex items-center justify-between gap-3 ${
                  zoomDensity === 'compact' ? 'py-1.5' : 'py-3'
                }`}
              >
                {/* Scene # & Heading */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-screenplay font-bold text-xs px-2 py-0.5 rounded bg-black/40 text-neutral-200 shrink-0">
                    #{scene.sceneNumber}
                  </span>

                  <div className="min-w-0 flex-1">
                    <button aria-label="Jump to this scene in Screenplay Editor"
                      onClick={() => onJumpToScene(scene.id)}
                      className="font-screenplay font-bold text-xs uppercase tracking-wide text-white hover:text-amber-400 truncate text-left block w-full transition-colors"
                      title="Jump to this scene in Screenplay Editor"
                    >
                      {scene.heading}
                    </button>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-2 text-[10px] dc-meta text-neutral-400 mt-0.5">
                      <span className="font-mono">{scene.setting}</span>
                      <span>•</span>
                      <span className="font-mono flex items-center gap-0.5">
                        {scene.time === 'NIGHT' ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
                        {scene.time}
                      </span>
                      <span>•</span>
                      <span className="font-mono font-semibold text-neutral-300">
                        {scene.eighthsCount}/8 pgs ({scene.lineCount} lines)
                      </span>
                      {scene.notesCount > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-400">
                          <MessageSquare className="w-2.5 h-2.5" />
                          {scene.notesCount}
                        </span>
                      )}
                      {scene.hasBookmark && (
                        <Bookmark className="w-2.5 h-2.5 text-blue-400 fill-blue-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Right tools: Color Picker, Reorder, Jump */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Scene Strip Color Swatches */}
                  <div className="hidden sm:flex items-center gap-1">
                    {SCENE_STRIP_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => handleUpdateColor(scene.id, c.hex)}
                        className={`w-2.5 h-2.5 rounded-full hover:scale-125 transition-transform ${
                          scene.color === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-60'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>

                  {/* Reorder Buttons */}
                  <button aria-label="Move Scene Up"
                    onClick={() => handleMoveSceneRow(scene.id, -1)}
                    disabled={idx === 0}
                    className="p-1 hover:bg-white/10 rounded disabled:opacity-20 text-neutral-400 hover:text-white"
                    title="Move Scene Up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button aria-label="Move Scene Down"
                    onClick={() => handleMoveSceneRow(scene.id, 1)}
                    disabled={idx === filteredScenes.length - 1}
                    className="p-1 hover:bg-white/10 rounded disabled:opacity-20 text-neutral-400 hover:text-white"
                    title="Move Scene Down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>

                  <button aria-label="Jump to Screenplay"
                    onClick={() => onJumpToScene(scene.id)}
                    className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded ml-1"
                    title="Jump to Screenplay"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expandable / Comfortable Scene Summary Row */}
              {zoomDensity !== 'compact' && (
                <div className="px-4 pb-3 pt-1 border-t border-white/5 bg-black/10 flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={scene.summary}
                    onChange={(e) => handleUpdateSummary(scene.id, e.target.value)}
                    placeholder="Enter scene synopsis / emotional arc..."
                    className="w-full bg-black/20 hover:bg-black/30 focus:bg-black/40 border border-transparent focus:border-white/20 rounded-lg px-2.5 py-1 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none transition-colors"
                  />

                  {scene.characters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] dc-meta text-neutral-500">Cast:</span>
                      {scene.characters.map((char) => (
                        <span
                          key={char}
                          className="px-1.5 py-0.2 bg-black/40 text-neutral-300 border border-white/10 rounded text-[9px] dc-fine-meta font-mono"
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
