import {CharacterSidesPanel} from '../production/CharacterSidesPanel';
import {documentLayout} from '../production/layout';
import type {ScriptDocument} from '../types/script';
import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState, useMemo } from 'react';
import { Paragraph, ElementType } from '../types/script';
import {
  generateSceneReport,
  generateLocationReport,
  generateCharacterReport,
  generateCastReport,
  generateScriptReport,
  generateScriptNoteReport,
  generateStatisticsReport,
  generateTagReports,
  exportToCsv,
  exportToTxt,
  SceneReportItem,
  LocationReportItem,
  CharacterReportItem,
  CastReportItem,
  ScriptNoteReportItem,
  StatisticsReportData,
  TagBySceneItem,
  TagByTagItem,
} from '../utils/reportsGenerator';
import {
  FileSpreadsheet,
  Users,
  MapPin,
  Clock,
  Printer,
  Download,
  PieChart,
  Tag,
  StickyNote,
  FileText,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  BarChart3,
  Flame,
  ShieldAlert,
} from 'lucide-react';

export type ReportCategory =
  | 'sides'
  | 'scenes'
  | 'locations'
  | 'characters'
  | 'cast'
  | 'script'
  | 'notes'
  | 'statistics'
  | 'tags';

interface ProductionReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?:ScriptDocument;
  paragraphs: Paragraph[];
  titlePage?: { title: string; author: string; draftDate?: string };
}

export const ProductionReportsModal: React.FC<ProductionReportsModalProps> = ({
  isOpen,
  onClose,
  paragraphs,document:scriptDoc,
  titlePage,
}) => {
  const [activeTab, setActiveTab] = useState<ReportCategory>('scenes');
  const [searchQuery, setSearchQuery] = useState('');

  // Script Report state
  const [selectedElementTypes, setSelectedElementTypes] = useState<ElementType[]>([
    'Scene Heading',
    'Action',
    'Character',
    'Dialogue',
    'Parenthetical',
    'Transition',
  ]);
  const [includeSceneNumbers, setIncludeSceneNumbers] = useState(true);

  // Tag Report Sub-view
  const [tagReportView, setTagReportView] = useState<'byScene' | 'byTag'>('byScene');
  const [tagCategoryFilter, setTagCategoryFilter] = useState<string>('All');

  // Character Report Sub-selection
  const [selectedCharacterName, setSelectedCharacterName] = useState<string>('');

  const showUI = useOverlayVisibility(isOpen);

  const pageLabel=(page:number)=>scriptDoc?documentLayout(scriptDoc).pages[page-1]?.pageLabel||String(page):String(page);
  const scriptTitle = titlePage?.title || 'UNTITLED SCREENPLAY';

  // Memoized Report Data
  const sceneReport = useMemo(() => generateSceneReport(paragraphs,scriptDoc), [paragraphs,scriptDoc]);
  const locationReport = useMemo(() => generateLocationReport(paragraphs,scriptDoc), [paragraphs,scriptDoc]);
  const characterReport = useMemo(() => generateCharacterReport(paragraphs,scriptDoc), [paragraphs,scriptDoc]);
  const castReport = useMemo(() => generateCastReport(paragraphs,scriptDoc), [paragraphs,scriptDoc]);
  const scriptNoteReport = useMemo(() => generateScriptNoteReport(paragraphs,scriptDoc), [paragraphs,scriptDoc]);
  const statisticsReport = useMemo(() => generateStatisticsReport(paragraphs,scriptDoc), [paragraphs,scriptDoc]);
  const tagReports = useMemo(() => generateTagReports(paragraphs,scriptDoc), [paragraphs,scriptDoc]);

  // Selected character in Character Report (defaults to highest speaking character)
  const activeChar =
    characterReport.find((c) => c.characterName === selectedCharacterName) ||
    characterReport[0] ||
    null;

  // Filtered Scene Report
  const filteredScenes = useMemo(() => {
    if (!searchQuery.trim()) return sceneReport;
    const q = searchQuery.toLowerCase();
    return sceneReport.filter(
      (s) =>
        s.sceneNumber.toLowerCase().includes(q) ||
        s.heading.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.characters.some((c) => c.toLowerCase().includes(q)) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [sceneReport, searchQuery]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locationReport;
    const q = searchQuery.toLowerCase();
    return locationReport.filter((l) => l.locationName.toLowerCase().includes(q));
  }, [locationReport, searchQuery]);

  // Filtered Cast
  const filteredCast = useMemo(() => {
    if (!searchQuery.trim()) return castReport;
    const q = searchQuery.toLowerCase();
    return castReport.filter((c) => c.characterName.toLowerCase().includes(q));
  }, [castReport, searchQuery]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return scriptNoteReport;
    const q = searchQuery.toLowerCase();
    return scriptNoteReport.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q) ||
        n.text.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.sceneHeading.toLowerCase().includes(q)
    );
  }, [scriptNoteReport, searchQuery]);

  // Script Report Generated Output
  const scriptReportData = useMemo(
    () =>
      generateScriptReport(paragraphs, {
        selectedTypes: selectedElementTypes,
        includeSceneNumbers,
        includeCharacterCues: true,
        includeParentheticals: true,
        includeNotes: false,
        searchFilter: searchQuery,
      }),
    [paragraphs, selectedElementTypes, includeSceneNumbers, searchQuery]
  );

  // Filtered Tag Report
  const filteredTagsByScene = useMemo(() => {
    let list = tagReports.tagsByScene;
    if (tagCategoryFilter !== 'All') {
      list = list.filter((s) => Boolean(s.tagsByCategory[tagCategoryFilter]));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.heading.toLowerCase().includes(q) ||
          s.allTags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [tagReports.tagsByScene, tagCategoryFilter, searchQuery]);

  const filteredTagsByTag = useMemo(() => {
    let list = tagReports.tagsByTag;
    if (tagCategoryFilter !== 'All') {
      list = list.filter((t) => t.category === tagCategoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.tagName.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tagReports.tagsByTag, tagCategoryFilter, searchQuery]);

  // Unique categories for tags filter
  const allTagCategories = useMemo(() => {
    const cats = new Set<string>();
    tagReports.tagsByTag.forEach((t) => cats.add(t.category));
    return ['All', ...Array.from(cats)];
  }, [tagReports.tagsByTag]);

  // Handle Export per Tab
  const handleExportCsv = () => {
    switch (activeTab) {
      case 'scenes': {
        const headers = ['Scene #', 'Setting', 'Heading', 'Time', 'Location', 'Page', 'Length', 'Cast', 'Tags'];
        const rows = sceneReport.map((s) => [
          s.sceneNumber,
          s.setting,
          s.heading,
          s.timeOfDay,
          s.location,
          `${pageLabel(s.startPage)}`,
          s.lengthFormatted,
          s.characters.join('; '),
          s.tags.join('; '),
        ]);
        exportToCsv(`${scriptTitle}_Scene_Report`, headers, rows);
        break;
      }
      case 'locations': {
        const headers = ['Location', 'Total Scenes', 'INT Scenes', 'EXT Scenes', 'Day', 'Night', 'Total Length', 'Scene Numbers'];
        const rows = locationReport.map((l) => [
          l.locationName,
          l.totalScenes,
          l.intCount,
          l.extCount,
          l.dayCount,
          l.nightCount,
          l.totalLengthFormatted,
          l.scenes.map((s) => `#${s.sceneNumber}`).join(', '),
        ]);
        exportToCsv(`${scriptTitle}_Location_Report`, headers, rows);
        break;
      }
      case 'characters': {
        if (!activeChar) return;
        const headers = ['Scene #', 'Scene Heading', 'Page', 'Parenthetical', 'Extension', 'Dialogue Text', 'Word Count'];
        const rows = activeChar.dialogueLines.map((d) => [
          d.sceneNumber,
          d.sceneHeading,
          pageLabel(d.page),
          d.parenthetical || '',
          d.characterExtension || '',
          d.dialogueText,
          d.wordCount,
        ]);
        exportToCsv(`${scriptTitle}_Character_${activeChar.characterName}`, headers, rows);
        break;
      }
      case 'cast': {
        const headers = ['Character', 'Speaking', 'Speeches', 'Words Spoken', 'Dialogue %', 'Speaking Scenes', 'Non-Speaking Scenes', 'Total Scenes', 'First Page'];
        const rows = castReport.map((c) => [
          c.characterName,
          c.isSpeaking ? 'YES' : 'NO',
          c.totalSpeeches,
          c.totalWords,
          `${c.percentageOfCastDialogue}%`,
          c.speakingScenes,
          c.nonSpeakingScenes,
          c.totalScenes,
          pageLabel(c.firstAppearancePage),
        ]);
        exportToCsv(`${scriptTitle}_Cast_Report`, headers, rows);
        break;
      }
      case 'notes': {
        const headers = ['Title', 'Author', 'Category', 'Color', 'Created At', 'Scene #', 'Heading', 'Page', 'Target Snippet', 'Note Content'];
        const rows = scriptNoteReport.map((n) => [
          n.title,
          n.author,
          n.category,
          n.color,
          n.createdAt,
          n.sceneNumber,
          n.sceneHeading,
          pageLabel(n.page),
          n.paragraphSnippet,
          n.text,
        ]);
        exportToCsv(`${scriptTitle}_ScriptNote_Report`, headers, rows);
        break;
      }
      case 'statistics': {
        const headers = ['Element Type', 'Paragraph Count', '% of Script', 'Word Count', 'Words %'];
        const rows = statisticsReport.elementsBreakdown.map((e) => [
          e.type,
          e.count,
          `${e.percentage}%`,
          e.words,
          `${e.wordsPercentage}%`,
        ]);
        exportToCsv(`${scriptTitle}_Statistics_Report`, headers, rows);
        break;
      }
      case 'tags': {
        if (tagReportView === 'byScene') {
          const headers = ['Scene #', 'Heading', 'Page', 'Tags'];
          const rows = tagReports.tagsByScene.map((s) => [
            s.sceneNumber,
            s.heading,
            pageLabel(s.page),
            s.allTags.join('; '),
          ]);
          exportToCsv(`${scriptTitle}_Tags_By_Scene`, headers, rows);
        } else {
          const headers = ['Tag Item', 'Category', 'Total Occurrences', 'Scene Numbers'];
          const rows = tagReports.tagsByTag.map((t) => [
            t.tagName,
            t.category,
            t.totalOccurrences,
            t.scenes.map((s) => `#${s.sceneNumber}`).join(', '),
          ]);
          exportToCsv(`${scriptTitle}_Tags_By_Tag`, headers, rows);
        }
        break;
      }
      case 'script': {
        const textOutput = scriptReportData.filteredParagraphs
          .map((p) => {
            const prefix = p.sceneNumber && includeSceneNumbers ? `[Scene ${p.sceneNumber}] ` : '';
            return `${prefix}${p.type.toUpperCase()}: ${p.text}`;
          })
          .join('\n\n');
        exportToTxt(`${scriptTitle}_Script_Report`, textOutput);
        break;
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleElementType = (type: ElementType) => {
    if (selectedElementTypes.includes(type)) {
      if (selectedElementTypes.length > 1) {
        setSelectedElementTypes(selectedElementTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedElementTypes([...selectedElementTypes, type]);
    }
  };

  if (!showUI) return null;
  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 print:p-0 print:bg-white print:text-black">
      <div className="bg-[#1a1a24] dc-bg-chrome border border-white/15 rounded-2xl w-full max-w-6xl h-[92vh] shadow-2xl overflow-hidden flex flex-col text-neutral-200 print:border-none print:shadow-none print:h-auto print:w-full print:bg-white print:text-black">
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#14141c] border-b border-white/10 flex items-center justify-between shrink-0 print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 print:hidden">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white tracking-wide print:text-black">
                  Production Reports
                </h2>
                <span className="px-2 py-0.5 text-[10px] dc-meta uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 print:hidden">
                  Active Document Layout
                </span>
              </div>
              <p className="text-xs text-neutral-400 print:text-neutral-600">
                {scriptTitle} • Production Management & Assistant Director Breakdowns
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10 transition-colors shadow-sm"
              title="Print current report"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print Report</span>
            </button>
            <button
              disabled={activeTab === 'sides'} onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors shadow-sm"
              title="Export report to CSV or TXT"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{activeTab === 'script' ? 'Export TXT' : 'Export CSV'}</span>
            </button>
            <button aria-label="Close dialog"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-2"
              title="Close reports modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Categories Bar (8 Core Final Draft Report Tabs) */}
        <div className="px-6 bg-[#181822] border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto py-2 shrink-0 print:hidden scrollbar-none">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setActiveTab('scenes');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'scenes'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>10.1 Scene Report ({sceneReport.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('locations');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'locations'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>10.2 Location ({locationReport.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('characters');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'characters'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>10.3 Character Report</span>
            </button>
            <button aria-pressed={activeTab === 'sides'} onClick={() => setActiveTab('sides')} className="px-3 py-1.5 rounded-lg text-xs border border-white/20">Character Sides</button>

            <button
              onClick={() => {
                setActiveTab('cast');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'cast'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>10.4 Cast Report ({castReport.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('script');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'script'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>10.5 Script Report</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('notes');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>10.6 ScriptNotes ({scriptNoteReport.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('statistics');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'statistics'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>10.7 Statistics</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('tags');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'tags'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>10.8 Tags Breakdown</span>
            </button>
          </div>
        </div>

        {/* Filter and Quick-Search Toolbar */}
        <div className="px-6 py-2.5 bg-[#161620] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === 'scenes'
                    ? 'Search scenes, headings, characters, or tags...'
                    : activeTab === 'locations'
                    ? 'Search locations...'
                    : activeTab === 'cast'
                    ? 'Search cast members...'
                    : activeTab === 'notes'
                    ? 'Search note title, content, or author...'
                    : activeTab === 'tags'
                    ? 'Search tags or scenes...'
                    : 'Search report data...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-neutral-200 placeholder-neutral-500 text-xs focus:outline-none focus:border-amber-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tab-specific subcontrols */}
          {activeTab === 'tags' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10 text-xs">
                <button
                  onClick={() => setTagReportView('byScene')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    tagReportView === 'byScene' ? 'bg-amber-500 text-black font-semibold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Tags by Scene
                </button>
                <button
                  onClick={() => setTagReportView('byTag')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    tagReportView === 'byTag' ? 'bg-amber-500 text-black font-semibold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Tags by Tag
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400 text-[11px]">Category:</span>
                <select
                  value={tagCategoryFilter}
                  onChange={(e) => setTagCategoryFilter(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-neutral-200 text-xs focus:outline-none focus:border-amber-400"
                >
                  {allTagCategories.map((c) => (
                    <option key={c} value={c} className="bg-neutral-900 text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'characters' && (
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 text-xs">Select Character:</span>
              <select
                value={activeChar?.characterName || ''}
                onChange={(e) => setSelectedCharacterName(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-neutral-200 text-xs font-semibold focus:outline-none focus:border-amber-400"
              >
                {characterReport.map((c) => (
                  <option key={c.characterName} value={c.characterName} className="bg-neutral-900 text-white">
                    {c.characterName} ({c.dialogueCount} speeches, {c.totalWords} words)
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'script' && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={includeSceneNumbers}
                  onChange={(e) => setIncludeSceneNumbers(e.target.checked)}
                  className="rounded border-white/20 text-amber-500 focus:ring-0"
                />
                <span>Include Scene Numbers</span>
              </label>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#161622] text-xs">
          {/* 10.1 SCENE REPORT */}
          {activeTab === 'sides' && scriptDoc && <CharacterSidesPanel key={scriptDoc.id} doc={scriptDoc}/>}
          {activeTab === 'scenes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="font-bold text-sm text-white">10.1 Scene Breakdown Report</h3>
                  <p className="text-[11px] text-neutral-400">
                    Industry standard breakdown with scene numbers, settings, time of day, script page positions, lengths in 1/8ths of a page, and attached production tags.
                  </p>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  Showing <strong className="text-amber-400">{filteredScenes.length}</strong> scenes
                </div>
              </div>

              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
                <table className="w-full text-left">
                  <thead className="bg-black/60 text-neutral-400 uppercase text-[10px] dc-meta tracking-wider border-b border-white/10 font-bold">
                    <tr>
                      <th className="p-3 w-16 text-center">Scene #</th>
                      <th className="p-3 w-20">Setting</th>
                      <th className="p-3">Scene Heading</th>
                      <th className="p-3 w-28">Time of Day</th>
                      <th className="p-3 w-36">Location</th>
                      <th className="p-3 w-20 text-center">Pages</th>
                      <th className="p-3 w-24 text-center">Length (8ths)</th>
                      <th className="p-3">Speaking Cast</th>
                      <th className="p-3">Production Tags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredScenes.map((s, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-amber-400">
                          {s.sceneNumber}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] dc-meta font-bold ${
                              s.setting === 'EXT'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : s.setting === 'INT'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {s.setting}
                          </span>
                        </td>
                        <td className="p-3 font-screenplay font-semibold text-neutral-200">
                          {s.heading}
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-neutral-300 px-2 py-0.5 bg-black/40 rounded border border-white/10 text-[11px]">
                            {s.timeOfDay}
                          </span>
                        </td>
                        <td className="p-3 text-neutral-300 truncate max-w-[150px]">
                          {s.location}
                        </td>
                        <td className="p-3 text-center font-mono text-neutral-300">
                          {s.startPage === s.endPage ? `p. ${pageLabel(s.startPage)}` : `pp. ${pageLabel(s.startPage)}-${pageLabel(s.endPage)}`}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-300 bg-amber-500/5">
                          {s.lengthFormatted}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {s.characters.length > 0 ? (
                              s.characters.map((c) => (
                                <span
                                  key={c}
                                  className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-200 text-[10px] dc-meta font-medium"
                                >
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span className="text-neutral-500 italic">Silent / Action</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {s.tags.length > 0 ? (
                              s.tags.map((t, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] dc-meta"
                                >
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-neutral-500 italic text-[11px]">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10.2 LOCATION REPORT */}
          {activeTab === 'locations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="font-bold text-sm text-white">10.2 Location & Set Breakdown Report</h3>
                  <p className="text-[11px] text-neutral-400">
                    Unique locations, frequency counts, interior/exterior ratio, time of day allocations, and associated scenes.
                  </p>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  <strong className="text-emerald-400">{filteredLocations.length}</strong> unique locations
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLocations.map((loc, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <h4 className="font-screenplay font-bold text-sm text-neutral-100">
                          {loc.locationName}
                        </h4>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded font-mono font-bold text-xs border border-amber-500/30">
                        {loc.totalScenes} {loc.totalScenes === 1 ? 'Scene' : 'Scenes'} ({loc.totalLengthFormatted})
                      </span>
                    </div>

                    {/* Breakdown metrics badges */}
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300">
                        INT: <strong className="text-emerald-300">{loc.intCount}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300">
                        EXT: <strong className="text-sky-300">{loc.extCount}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300">
                        DAY: <strong className="text-amber-300">{loc.dayCount}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300">
                        NIGHT: <strong className="text-indigo-300">{loc.nightCount}</strong>
                      </span>
                    </div>

                    {/* Nested scene occurrences list */}
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <span className="text-[10px] dc-meta uppercase font-bold text-neutral-400 tracking-wider">
                        Scene Occurrences:
                      </span>
                      <div className="space-y-1">
                        {loc.scenes.map((s, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-center justify-between text-[11px] p-1.5 bg-black/20 rounded border border-white/5"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono text-amber-400 font-bold shrink-0">
                                Scene {s.sceneNumber}
                              </span>
                              <span className="font-screenplay text-neutral-300 truncate">
                                {s.heading}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                              <span>p. {pageLabel(s.page)}</span>
                              <span className="font-mono text-amber-300">{s.lengthFormatted}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10.3 CHARACTER REPORT */}
          {activeTab === 'characters' && activeChar && (
            <div className="space-y-5">
              {/* Character Header & High-Level Metrics */}
              <div className="p-4 bg-black/40 border border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-screenplay font-bold text-lg text-amber-400">
                      {activeChar.characterName}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] dc-meta uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {activeChar.speechPercentage}% of Screenplay Dialogue
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Appears in {activeChar.sceneCount} scenes with {activeChar.dialogueCount} speaking dialogue blocks.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg">
                    <div className="font-mono font-bold text-amber-400 text-sm">
                      {activeChar.dialogueCount}
                    </div>
                    <div className="text-[10px] dc-meta text-neutral-400 uppercase">Speeches</div>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg">
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      {activeChar.totalWords}
                    </div>
                    <div className="text-[10px] dc-meta text-neutral-400 uppercase">Words Spoken</div>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg">
                    <div className="font-mono font-bold text-blue-400 text-sm">
                      {activeChar.sceneCount}
                    </div>
                    <div className="text-[10px] dc-meta text-neutral-400 uppercase">Scenes</div>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg">
                    <div className="font-mono font-bold text-pink-400 text-sm">
                      {activeChar.monologues.length}
                    </div>
                    <div className="text-[10px] dc-meta text-neutral-400 uppercase">Monologues</div>
                  </div>
                </div>
              </div>

              {/* Extensions & Parentheticals breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-black/30 border border-white/10 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs text-neutral-200 uppercase tracking-wide">
                    Character Extensions Usage
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(activeChar.extensions).length > 0 ? (
                      Object.entries(activeChar.extensions).map(([ext, count]) => (
                        <div
                          key={ext}
                          className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2"
                        >
                          <span className="font-mono text-amber-300 font-bold">{ext}</span>
                          <span className="text-[10px] dc-meta text-neutral-400">×{count}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-neutral-500 italic text-[11px]">
                        No extensions like (V.O.) or (O.S.) used
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-black/30 border border-white/10 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs text-neutral-200 uppercase tracking-wide">
                    Parentheticals Frequency
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(activeChar.parentheticals).length > 0 ? (
                      Object.entries(activeChar.parentheticals).map(([paren, count]) => (
                        <div
                          key={paren}
                          className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2"
                        >
                          <span className="text-neutral-300 italic">{paren}</span>
                          <span className="text-[10px] dc-meta text-amber-400 font-mono">×{count}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-neutral-500 italic text-[11px]">
                        No parentheticals attached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Monologue Analysis (Speeches >= 40 words) */}
              {activeChar.monologues.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-xs text-amber-300 uppercase tracking-wide">
                      Monologue Speeches (40+ Words)
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activeChar.monologues.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        className="p-3 bg-black/40 rounded-lg border border-amber-500/20 flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="text-[10px] dc-meta text-neutral-400 font-mono">
                            Scene {m.sceneNumber} • {m.sceneHeading} • Page {pageLabel(m.page)}
                          </div>
                          <p className="font-screenplay text-neutral-200 italic">
                            "{m.excerpt}"
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs shrink-0">
                          {m.wordCount} words
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Line by Line Dialogue Log */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
                <div className="p-3 bg-black/60 border-b border-white/10 font-bold text-xs text-neutral-300">
                  Dialogue Lines Log ({activeChar.dialogueLines.length} Entries)
                </div>
                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                  {activeChar.dialogueLines.map((line, idx) => (
                    <div key={idx} className="p-3 hover:bg-white/5 transition-colors space-y-1">
                      <div className="flex items-center justify-between text-[10px] dc-meta text-neutral-400 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">Scene {line.sceneNumber}</span>
                          <span>•</span>
                          <span className="truncate max-w-sm">{line.sceneHeading}</span>
                          <span>•</span>
                          <span>Page {pageLabel(line.page)}</span>
                        </div>
                        <span className="text-neutral-500">{line.wordCount} words</span>
                      </div>
                      {line.parenthetical && (
                        <div className="text-[11px] text-neutral-400 italic font-screenplay">
                          {line.parenthetical}
                        </div>
                      )}
                      <p className="font-screenplay text-neutral-100 text-xs">
                        {line.dialogueText}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 10.4 CAST REPORT */}
          {activeTab === 'cast' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="font-bold text-sm text-white">10.4 Cast Appearance & Dialogue Report</h3>
                  <p className="text-[11px] text-neutral-400">
                    Comprehensive cast list covering speaking and silent roles, appearance frequency, first scene cues, and dialogue share.
                  </p>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  <strong className="text-amber-400">{filteredCast.length}</strong> total characters
                </div>
              </div>

              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
                <table className="w-full text-left">
                  <thead className="bg-black/60 text-neutral-400 uppercase text-[10px] dc-meta tracking-wider border-b border-white/10 font-bold">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Character Name</th>
                      <th className="p-3 w-28 text-center">Role Type</th>
                      <th className="p-3 w-24 text-center">Speeches</th>
                      <th className="p-3 w-28 text-center">Words Spoken</th>
                      <th className="p-3 w-36">Dialogue Share</th>
                      <th className="p-3 w-24 text-center">Scenes</th>
                      <th className="p-3 w-28 text-center">First Appearance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredCast.map((c, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center font-mono text-neutral-500 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-screenplay font-bold text-neutral-100 text-sm">
                          {c.characterName}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] dc-meta font-bold ${
                              c.isSpeaking
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-neutral-800 text-neutral-400 border border-white/10'
                            }`}
                          >
                            {c.isSpeaking ? 'Speaking' : 'Silent / Action'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-400">
                          {c.totalSpeeches}
                        </td>
                        <td className="p-3 text-center font-mono text-neutral-300">
                          {c.totalWords.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${c.percentageOfCastDialogue}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-neutral-400 w-8 text-right">
                              {c.percentageOfCastDialogue}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-neutral-300">
                          {c.totalScenes}
                        </td>
                        <td className="p-3 text-center font-mono text-neutral-400">
                          Sc. {c.firstSceneNumber} (p. {pageLabel(c.firstAppearancePage)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10.5 SCRIPT REPORT */}
          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="font-bold text-sm text-white">10.5 Script Element Filter Report</h3>
                  <p className="text-[11px] text-neutral-400">
                    Generate custom script documents containing only selected element types (e.g., Action-only, Dialogue-only, Headings-only).
                  </p>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  <strong className="text-amber-400">{scriptReportData.totalCount}</strong> elements •{' '}
                  <strong className="text-emerald-400">{scriptReportData.totalWords}</strong> words
                </div>
              </div>

              {/* Element Type Selectors */}
              <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
                <span className="text-[10px] dc-meta uppercase font-bold text-neutral-400 tracking-wider">
                  Select Element Types to Include:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'Scene Heading',
                      'Action',
                      'Character',
                      'Dialogue',
                      'Parenthetical',
                      'Transition',
                      'Shot',
                      'General',
                    ] as ElementType[]
                  ).map((type) => {
                    const isSelected = selectedElementTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleElementType(type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                            : 'bg-white/5 text-neutral-400 border border-white/10 hover:text-white'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                        <span>{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Script Preview Box */}
              <div className="p-6 bg-[#0e0e14] border border-white/10 rounded-xl max-h-[50vh] overflow-y-auto font-screenplay text-neutral-100 space-y-3 leading-relaxed shadow-inner">
                {scriptReportData.filteredParagraphs.map((p, idx) => (
                  <div
                    key={idx}
                    className={`text-xs ${
                      p.type === 'Scene Heading'
                        ? 'font-bold uppercase text-amber-300 pt-3'
                        : p.type === 'Character'
                        ? 'text-center font-bold uppercase tracking-wider text-neutral-200 mt-2'
                        : p.type === 'Dialogue'
                        ? 'max-w-md mx-auto text-neutral-100'
                        : p.type === 'Parenthetical'
                        ? 'max-w-xs mx-auto italic text-neutral-400 text-center'
                        : p.type === 'Transition'
                        ? 'text-right font-bold uppercase text-neutral-400'
                        : 'text-neutral-300'
                    }`}
                  >
                    {includeSceneNumbers && p.sceneNumber && p.type === 'Scene Heading' && (
                      <span className="mr-2 font-mono text-amber-400 font-bold">
                        {p.sceneNumber}.
                      </span>
                    )}
                    {p.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10.6 SCRIPTNOTE REPORT */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="font-bold text-sm text-white">10.6 ScriptNotes & Production Annotations Report</h3>
                  <p className="text-[11px] text-neutral-400">
                    Export editorial notes with associated scene heading, page position, author, category, and target script snippet.
                  </p>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  <strong className="text-amber-400">{filteredNotes.length}</strong> ScriptNotes
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-2 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StickyNote className="w-4 h-4 text-amber-400 shrink-0" />
                        <h4 className="font-bold text-sm text-white">{note.title}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] dc-meta font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {note.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                      <span>By: <strong className="text-neutral-200">{note.author}</strong></span>
                      <span>Sc. {note.sceneNumber} • Page {pageLabel(note.page)}</span>
                    </div>

                    <div className="p-2.5 bg-black/50 rounded-lg border border-white/5 space-y-1">
                      <div className="text-[10px] dc-meta uppercase font-bold text-neutral-500">
                        Target Context ({note.paragraphType}):
                      </div>
                      <p className="font-screenplay text-[11px] text-neutral-400 italic">
                        "{note.paragraphSnippet}"
                      </p>
                    </div>

                    <p className="text-xs text-neutral-200 bg-white/5 p-3 rounded-lg border border-white/5">
                      {note.text}
                    </p>

                    <div className="text-right text-[10px] dc-meta text-neutral-500">
                      Added: {note.createdAt}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10.7 STATISTICS REPORT */}
          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="font-bold text-sm text-white">10.7 Screenplay Statistics & Analytics</h3>
                  <p className="text-[11px] text-neutral-400">
                    Comprehensive screenplay metrics, element proportions, dialogue density, and industry profanity analysis.
                  </p>
                </div>
              </div>

              {/* High Level KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                <div className="bg-black/40 p-3.5 rounded-xl border border-white/10">
                  <div className="text-2xl font-bold font-mono text-amber-400">
                    {statisticsReport.totalPages}
                  </div>
                  <div className="text-neutral-400 text-[10px] dc-meta uppercase mt-1">Total Pages</div>
                </div>
                <div className="bg-black/40 p-3.5 rounded-xl border border-white/10">
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {statisticsReport.totalWords.toLocaleString()}
                  </div>
                  <div className="text-neutral-400 text-[10px] dc-meta uppercase mt-1">Total Words</div>
                </div>
                <div className="bg-black/40 p-3.5 rounded-xl border border-white/10">
                  <div className="text-2xl font-bold font-mono text-blue-400">
                    {statisticsReport.totalScenes}
                  </div>
                  <div className="text-neutral-400 text-[10px] dc-meta uppercase mt-1">Total Scenes</div>
                </div>
                <div className="bg-black/40 p-3.5 rounded-xl border border-white/10">
                  <div className="text-2xl font-bold font-mono text-purple-400">
                    {statisticsReport.totalCharacters}
                  </div>
                  <div className="text-neutral-400 text-[10px] dc-meta uppercase mt-1">Characters</div>
                </div>
                <div className="bg-black/40 p-3.5 rounded-xl border border-white/10">
                  <div className="text-2xl font-bold font-mono text-pink-400">
                    ~{statisticsReport.estimatedRuntimeMinutes}m
                  </div>
                  <div className="text-neutral-400 text-[10px] dc-meta uppercase mt-1">Est. Runtime</div>
                </div>
                <div className="bg-black/40 p-3.5 rounded-xl border border-white/10">
                  <div className="text-2xl font-bold font-mono text-amber-300">
                    {statisticsReport.sceneStats.averageLengthFormatted}
                  </div>
                  <div className="text-neutral-400 text-[10px] dc-meta uppercase mt-1">Avg Scene Length</div>
                </div>
              </div>

              {/* Visual Element Proportions Bar */}
              <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                  <span>Screenplay Element Proportions</span>
                  <span className="text-neutral-500 font-mono">{statisticsReport.totalParagraphs} total blocks</span>
                </div>
                <div className="h-4 bg-neutral-800 rounded-full overflow-hidden flex">
                  {statisticsReport.elementsBreakdown.map((item, idx) => {
                    const colors = [
                      'bg-amber-400',
                      'bg-blue-400',
                      'bg-emerald-400',
                      'bg-pink-400',
                      'bg-purple-400',
                      'bg-rose-400',
                      'bg-indigo-400',
                    ];
                    return (
                      <div
                        key={item.type}
                        className={`${colors[idx % colors.length]}`}
                        style={{ width: `${item.percentage}%` }}
                        title={`${item.type}: ${item.percentage}% (${item.count} paragraphs)`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 pt-2 text-[11px]">
                  {statisticsReport.elementsBreakdown.map((item, idx) => {
                    const dotColors = [
                      'bg-amber-400',
                      'bg-blue-400',
                      'bg-emerald-400',
                      'bg-pink-400',
                      'bg-purple-400',
                      'bg-rose-400',
                      'bg-indigo-400',
                    ];
                    return (
                      <div key={item.type} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                        <span className="text-neutral-300">{item.type}:</span>
                        <span className="font-mono font-bold text-white">{item.percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Elements Table Breakdown */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
                <table className="w-full text-left">
                  <thead className="bg-black/60 text-neutral-400 uppercase text-[10px] dc-meta tracking-wider border-b border-white/10 font-bold">
                    <tr>
                      <th className="p-3">Element Type</th>
                      <th className="p-3 w-28 text-center">Count</th>
                      <th className="p-3 w-32 text-center">% of Script</th>
                      <th className="p-3 w-32 text-center">Words</th>
                      <th className="p-3 w-32 text-center">Words %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {statisticsReport.elementsBreakdown.map((e) => (
                      <tr key={e.type} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-semibold text-neutral-200">{e.type}</td>
                        <td className="p-3 text-center font-mono text-amber-400 font-bold">{e.count}</td>
                        <td className="p-3 text-center font-mono text-neutral-300">{e.percentage}%</td>
                        <td className="p-3 text-center font-mono text-emerald-400">{e.words.toLocaleString()}</td>
                        <td className="p-3 text-center font-mono text-neutral-400">{e.wordsPercentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Scene & Dialogue Detailed Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
                  <h4 className="font-bold text-xs text-neutral-200 uppercase tracking-wide">
                    Scene Distribution & Extremes
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Interior (INT) vs Exterior (EXT)</span>
                      <span className="font-mono text-white font-bold">
                        {statisticsReport.sceneStats.intCount} INT / {statisticsReport.sceneStats.extCount} EXT
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Day vs Night Settings</span>
                      <span className="font-mono text-white font-bold">
                        {statisticsReport.sceneStats.dayCount} DAY / {statisticsReport.sceneStats.nightCount} NIGHT
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Longest Scene</span>
                      <span className="font-mono text-amber-400 font-bold">
                        Scene {statisticsReport.sceneStats.longestScene.number} ({statisticsReport.sceneStats.longestScene.lengthFormatted})
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Shortest Scene</span>
                      <span className="font-mono text-blue-400 font-bold">
                        Scene {statisticsReport.sceneStats.shortestScene.number} ({statisticsReport.sceneStats.shortestScene.lengthFormatted})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
                  <h4 className="font-bold text-xs text-neutral-200 uppercase tracking-wide">
                    Dialogue & Monologue Metrics
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Total Dialogue Speeches</span>
                      <span className="font-mono text-white font-bold">
                        {statisticsReport.dialogueStats.totalSpeeches} blocks
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Total Dialogue Words</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {statisticsReport.dialogueStats.totalDialogueWords} words
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Average Words per Speech</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {statisticsReport.dialogueStats.averageWordsPerSpeech} words
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Monologue Frequency (40+ words)</span>
                      <span className="font-mono text-pink-400 font-bold">
                        {statisticsReport.dialogueStats.monologueCount} speeches
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profanity & MPAA / BBFC Ratings Preparation */}
              <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <h4 className="font-bold text-xs text-white uppercase tracking-wide">
                      MPAA / BBFC Content & Profanity Audit
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {statisticsReport.profanityStats.mpaaRatingAssessment}
                  </span>
                </div>

                {statisticsReport.profanityStats.occurrences.length > 0 ? (
                  <div className="border border-white/5 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-black/50 text-neutral-400 uppercase text-[10px] dc-meta border-b border-white/10 font-bold">
                        <tr>
                          <th className="p-2.5">Word</th>
                          <th className="p-2.5 w-24 text-center">Severity</th>
                          <th className="p-2.5 w-20 text-center">Count</th>
                          <th className="p-2.5">Scene Occurrences</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[11px]">
                        {statisticsReport.profanityStats.occurrences.map((p, idx) => (
                          <tr key={idx} className="hover:bg-white/5">
                            <td className="p-2.5 font-mono font-bold text-rose-400">{p.word}</td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] dc-meta uppercase font-bold ${
                                  p.severity === 'strong'
                                    ? 'bg-red-500/20 text-red-300'
                                    : p.severity === 'moderate'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-neutral-800 text-neutral-400'
                                }`}
                              >
                                {p.severity}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-white">
                              {p.count}
                            </td>
                            <td className="p-2.5 font-mono text-neutral-400">
                              Scenes: {p.scenes.map((s) => `#${s}`).join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                    ✓ Clean script: No detected profanities matching the MPAA/BBFC watch list.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10.8 TAG REPORTS */}
          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    10.8 Production Tag Breakdown ({tagReportView === 'byScene' ? 'Tags by Scene' : 'Tags by Tag'})
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Production department tagging for Props, Wardrobe, Vehicles, VFX, SFX, Stunts, and Camera.
                  </p>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  Category Filter: <strong className="text-amber-400">{tagCategoryFilter}</strong>
                </div>
              </div>

              {tagReportView === 'byScene' ? (
                /* TAGS BY SCENE */
                <div className="space-y-3">
                  {filteredTagsByScene.map((scene, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 font-bold px-2 py-0.5 bg-black/60 rounded border border-white/10">
                            Scene {scene.sceneNumber}
                          </span>
                          <h4 className="font-screenplay font-bold text-neutral-100 text-sm">
                            {scene.heading}
                          </h4>
                        </div>
                        <span className="text-neutral-400 text-xs font-mono">
                          Page {pageLabel(scene.page)}
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {Object.keys(scene.tagsByCategory).length > 0 ? (
                          Object.entries(scene.tagsByCategory).map(([cat, items]) => (
                            <div key={cat} className="flex items-start gap-2 text-xs">
                              <span className="w-24 shrink-0 font-bold text-[10px] dc-meta uppercase text-neutral-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                {cat}
                              </span>
                              <div className="flex flex-wrap gap-1.5 flex-1">
                                {items.map((item, iIdx) => (
                                  <span
                                    key={iIdx}
                                    className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px]"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-neutral-500 italic text-[11px]">
                            No breakdown tags attached to this scene.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* TAGS BY TAG */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTagsByTag.map((tag, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                          <h4 className="font-bold text-sm text-neutral-100">
                            {tag.tagName}
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] dc-meta uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {tag.category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                        <span>Occurrences: <strong className="text-amber-400">{tag.totalOccurrences}</strong></span>
                        <span>{tag.scenes.length} Scenes</span>
                      </div>

                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <span className="text-[10px] dc-meta uppercase font-bold text-neutral-400 tracking-wider">
                          Scene Locations:
                        </span>
                        <div className="space-y-1">
                          {tag.scenes.map((s, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-center justify-between text-[11px] p-1.5 bg-black/20 rounded border border-white/5"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono text-amber-400 font-bold shrink-0">
                                  Sc. {s.sceneNumber}
                                </span>
                                <span className="font-screenplay text-neutral-300 truncate">
                                  {s.heading}
                                </span>
                              </div>
                              <span className="text-neutral-500 text-[10px] dc-meta shrink-0">
                                p. {pageLabel(s.page)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#14141c] border-t border-white/10 flex items-center justify-between shrink-0 print:hidden text-xs">
          <div className="text-neutral-400">
            Export format compatible with Movie Magic Scheduling & Gorilla Production Budgeting
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
          >
            Close Report
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
