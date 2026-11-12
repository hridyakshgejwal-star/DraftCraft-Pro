import {productionScenes} from '../production/queries';
import type {ScriptDocument} from '../types/script';
import {moveScene} from '../editor/scenes';
import React, { useState } from 'react';
import { Paragraph, ElementType, IndexCardSize } from '../types/script';
import {
  Layers,
  Search,
  Grid,
  Maximize2,
  Minimize2,
  Printer,
  Download,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  MapPin,
  Clock,
  Users,
  MessageSquare,
  Bookmark,
  Check,
  Palette,
  Filter,
} from 'lucide-react';

interface IndexCardsViewProps {
  document?:ScriptDocument;
  paragraphs: Paragraph[];
  onParagraphsChange: (paragraphs: Paragraph[]) => void;
  onJumpToScene: (sceneParagraphId: string) => void;
  isDarkMode: boolean;
}

const CARD_COLORS = [
  { name: 'Default', hex: '#26262e', border: '#3f3f4e' },
  { name: 'Amber', hex: '#78350f', border: '#f59e0b' },
  { name: 'Blue', hex: '#1e3a8a', border: '#3b82f6' },
  { name: 'Rose', hex: '#881337', border: '#f43f5e' },
  { name: 'Emerald', hex: '#064e3b', border: '#10b981' },
  { name: 'Purple', hex: '#581c87', border: '#a855f7' },
  { name: 'Slate', hex: '#1e293b', border: '#64748b' },
];

export const IndexCardsView: React.FC<IndexCardsViewProps> = ({
  paragraphs,document:project,
  onParagraphsChange,
  onJumpToScene,
  isDarkMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cardSize, setCardSize] = useState<IndexCardSize>('medium');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');

  // Extract scene groups
  interface SceneCardData {
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
    noteCount: number;
    hasBookmark: boolean;
  }

  const scenes: SceneCardData[] = [];
  let currentScene: SceneCardData | null = null;

  paragraphs.forEach((p, idx) => {
    if (p.type === 'Scene Heading') {
      const time=p.text.match(/(?:^|\s[-–—]\s)(DAY|NIGHT|DUSK|DAWN|MORNING|EVENING|LATER|CONTINUOUS)\s*$/i)?.[1]?.toUpperCase()||'UNSPECIFIED';

      currentScene = {
        id: p.id,
        globalIndex: idx,
        sceneNumber: p.sceneNumber || `${scenes.length + 1}`,
        heading: p.text,
        summary: p.sceneSummary || (p.sceneComment ? p.sceneComment.slice(0, 80) : ''),
        color: p.sceneColor || '#26262e',
        setting: /^EXT\./i.test(p.text)?'EXTERIOR':/^INT\./i.test(p.text)?'INTERIOR':'UNSPECIFIED',
        time,
        characters: [],
        lineCount: 1,
        noteCount: p.notes?.length || 0,
        hasBookmark: Boolean(p.bookmark),
      };
      scenes.push(currentScene);
    } else if (currentScene) {
      currentScene.lineCount += 1;
      if (p.notes) currentScene.noteCount += p.notes.length;
      if (p.bookmark) currentScene.hasBookmark = true;
      if (p.type === 'Character') {
        const charName = p.text.replace(/\s*\(.*\)/, '').trim().toUpperCase();
        if (charName && !currentScene.characters.includes(charName)) {
          currentScene.characters.push(charName);
        }
      }
    }
  });

  // Reorder scene cards (Move Left or Right)
  const handleMoveSceneCard = (sceneId:string,direction:-1|1)=>onParagraphsChange(moveScene(paragraphs,sceneId,direction));
  // Update Scene Summary
  const handleUpdateSummary = (sceneId: string, summary: string) => {
    onParagraphsChange(
      paragraphs.map((p) => (p.id === sceneId ? { ...p, sceneSummary: summary } : p))
    );
  };

  // Update Scene Color
  const handleUpdateSceneColor = (sceneId: string, colorHex: string) => {
    onParagraphsChange(
      paragraphs.map((p) => (p.id === sceneId ? { ...p, sceneColor: colorHex } : p))
    );
  };

  // Batch update color for selected cards
  const handleBatchColor = (colorHex: string) => {
    if (selectedIds.size === 0) return;
    onParagraphsChange(
      paragraphs.map((p) => (selectedIds.has(p.id) ? { ...p, sceneColor: colorHex } : p))
    );
  };

  // Toggle selection
  const handleToggleSelect = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) next.delete(sceneId);
      else next.add(sceneId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === scenes.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(scenes.map((s) => s.id)));
  };

  // Export / Print Scene Organization
  const handlePrintCards = () => {
    window.print();
  };

  const handleExportSummaryCsv = () => {
    let csv = 'Scene Number,Heading,Setting,Time,Estimated Lines,Characters,Summary\n';
    scenes.forEach((s) => {
      csv += `"${s.sceneNumber}","${s.heading}","${s.setting}","${s.time}",${s.lineCount},"${s.characters.join('; ')}","${(s.summary || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screenplay_index_cards.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter scenes
  const measured=project?new Map(productionScenes(project).map(s=>[s.id,s])):null;for(const scene of scenes){const value=measured?.get(scene.id);if(value){scene.lineCount=value.lines;scene.characters=value.characters;}}
  const filteredScenes = scenes.filter((s) => {
    if (colorFilter !== 'all' && s.color !== colorFilter) return false;
    if (timeFilter !== 'all' && s.time !== timeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchHeading = s.heading.toLowerCase().includes(q);
      const matchSummary = s.summary.toLowerCase().includes(q);
      const matchChar = s.characters.some((c) => c.toLowerCase().includes(q));
      return matchHeading || matchSummary || matchChar;
    }
    return true;
  });

  // Grid style based on card size
  const getGridClasses = () => {
    switch (cardSize) {
      case 'small':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3';
      case 'large':
        return 'grid-cols-1 md:grid-cols-2 gap-6';
      case 'wide':
        return 'grid-cols-1 gap-3';
      case 'medium':
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
    }
  };

  return (
    <div
      className={`dc-indexcards flex-1 flex flex-col overflow-hidden select-none transition-colors ${
        isDarkMode ? 'bg-[#15151b]' : 'bg-[#e5e5ea]'
      }`}
    >
      {/* Index Cards Control Bar */}
      <div className="dc-toolbar h-12 bg-[#1b1b24] dc-bg-chrome border-b border-white/10 px-4 flex items-center justify-between gap-3 shrink-0 text-xs text-neutral-300 shadow-md">
        {/* Left: View Mode info & Search */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Index Cards</span>
            <span className="text-[10px] dc-meta text-neutral-400 font-mono">({scenes.length} Scenes)</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards, dialogue, characters..."
              className="bg-black/40 text-xs text-white rounded-lg pl-8 pr-3 py-1 border border-white/10 w-48 sm:w-60 focus:outline-none focus:border-amber-400/60"
            />
          </div>
        </div>

        {/* Middle: Card Size Selector */}
        <div className="hidden md:flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-[11px]">
          {(['small', 'medium', 'large', 'wide'] as IndexCardSize[]).map((sz) => (
            <button
              key={sz}
              onClick={() => setCardSize(sz)}
              className={`px-2.5 py-0.5 rounded capitalize transition-colors ${
                cardSize === sz
                  ? 'bg-neutral-800 text-white font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>

        {/* Right: Multi-select & Export Actions */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded-lg border border-amber-500/40 text-[11px] text-amber-300">
              <span>{selectedIds.size} Selected</span>
              <div className="flex items-center gap-1 ml-1">
                {CARD_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => handleBatchColor(c.hex)}
                    className="w-3 h-3 rounded-full hover:scale-125 transition-transform"
                    style={{ backgroundColor: c.border }}
                    title={`Set color: ${c.name}`}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSelectAll}
            className="px-2 py-1 hover:bg-white/10 rounded text-[11px] text-neutral-300 hover:text-white transition-colors"
          >
            {selectedIds.size === scenes.length ? 'Deselect All' : 'Select All'}
          </button>

          <button aria-label="Export Index Cards as CSV"
            onClick={handleExportSummaryCsv}
            className="p-1.5 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors"
            title="Export Index Cards as CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button aria-label="Print Index Card Grid"
            onClick={handlePrintCards}
            className="p-1.5 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors"
            title="Print Index Card Grid"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Corkboard / Cards Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className={`grid ${getGridClasses()}`}>
          {filteredScenes.map((scene, idx) => {
            const isSelected = selectedIds.has(scene.id);
            const borderCol = CARD_COLORS.find((c) => c.hex === scene.color)?.border || '#3f3f4e';

            return (
              <div
                key={scene.id}
                onDoubleClick={() => onJumpToScene(scene.id)}
                className={`relative rounded-xl border transition-colors duration-150 flex flex-col justify-between overflow-hidden shadow-lg group select-none ${
                  isDarkMode ? 'bg-[#1e1e27] text-neutral-100' : 'bg-white text-neutral-900'
                } ${
                  isSelected
                    ? 'ring-2 ring-amber-400 border-amber-400 shadow-amber-500/20 shadow-xl'
                    : 'border-white/15 hover:border-white/30'
                }`}
                style={{
                  minHeight: cardSize === 'small' ? '140px' : cardSize === 'large' ? '280px' : '200px',
                  borderTopWidth: '4px',
                  borderTopColor: borderCol,
                }}
              >
                {/* Card Header */}
                <div className="p-3 border-b border-white/10 bg-black/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleToggleSelect(scene.id, e as any)}
                      className="rounded border-white/20 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-screenplay font-bold text-xs px-1.5 py-0.5 rounded bg-black/40 text-neutral-300">
                      #{scene.sceneNumber}
                    </span>
                    <span className="text-[10px] dc-meta font-mono font-semibold text-neutral-400">
                      {scene.setting === 'EXTERIOR' ? 'EXT' : 'INT'} • {scene.time}
                    </span>
                  </div>

                  {/* Top Card Tools */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {scene.hasBookmark && (
                      <span title="Bookmarked scene">
                        <Bookmark className="w-3 h-3 text-blue-400 fill-blue-400" />
                      </span>
                    )}
                    {scene.noteCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] dc-fine-meta text-amber-400 font-mono">
                        <MessageSquare className="w-2.5 h-2.5" />
                        {scene.noteCount}
                      </span>
                    )}

                    {/* Color Picker dropdown or pills */}
                    <div className="flex items-center gap-0.5 ml-1">
                      {CARD_COLORS.slice(0, 4).map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => handleUpdateSceneColor(scene.id, c.hex)}
                          className="w-2 h-2 rounded-full hover:scale-125 transition-transform"
                          style={{ backgroundColor: c.border }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Body: Scene Heading & Editable Summary */}
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <h4 className="font-screenplay font-bold text-xs uppercase tracking-wide text-neutral-200 line-clamp-2">
                    {scene.heading}
                  </h4>

                  <textarea
                    rows={cardSize === 'large' ? 5 : cardSize === 'small' ? 2 : 3}
                    value={scene.summary}
                    onChange={(e) => handleUpdateSummary(scene.id, e.target.value)}
                    placeholder="Scene synopsis / emotional beat / conflict..."
                    className="w-full bg-black/20 hover:bg-black/30 focus:bg-black/40 border border-transparent focus:border-white/20 rounded-lg p-2 text-xs text-neutral-300 placeholder-neutral-500 focus:outline-none resize-none font-sans leading-relaxed transition-colors"
                  />
                </div>

                {/* Card Footer: Characters, Length & Jump to Script */}
                <div className="px-3 py-2 bg-black/15 border-t border-white/5 flex items-center justify-between text-[10px] dc-meta text-neutral-400">
                  <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                    {scene.characters.length > 0 ? (
                      <span className="truncate font-mono text-[9px] dc-fine-meta">
                        {scene.characters.slice(0, 2).join(', ')}
                        {scene.characters.length > 2 ? ` +${scene.characters.length - 2}` : ''}
                      </span>
                    ) : (
                      <span className="italic text-neutral-500">No dialogue</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Reorder Buttons */}
                    <button aria-label="Move Scene Left"
                      onClick={() => handleMoveSceneCard(scene.id, -1)}
                      disabled={idx === 0}
                      className="p-1 hover:bg-white/10 rounded disabled:opacity-20 hover:text-white"
                      title="Move Scene Left"
                    >
                      <ArrowLeft className="w-2.5 h-2.5" />
                    </button>
                    <button aria-label="Move Scene Right"
                      onClick={() => handleMoveSceneCard(scene.id, 1)}
                      disabled={idx === filteredScenes.length - 1}
                      className="p-1 hover:bg-white/10 rounded disabled:opacity-20 hover:text-white"
                      title="Move Scene Right"
                    >
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>

                    {/* Double click / Jump to Script */}
                    <button aria-label="Open Scene in Screenplay Editor (Double-Click)"
                      onClick={() => onJumpToScene(scene.id)}
                      className="p-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 rounded ml-1"
                      title="Open Scene in Screenplay Editor (Double-Click)"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
