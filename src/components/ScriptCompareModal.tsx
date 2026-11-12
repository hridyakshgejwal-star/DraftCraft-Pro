import {importScreenplaySource} from '../files/importDocument';
import {characterName} from '../writing/model';
import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  X,
  FileText,
  Upload,
  ArrowRight,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  Edit3,
  Layers,
  FilePlus2,
  Filter,
  Copy,
} from 'lucide-react';
import { ScriptDocument, Paragraph } from '../types/script';
import {
  compareScriptDocuments,
  ScriptComparisonResult,
  combineScreenplayDocuments,
  CombineMode,
  reformatImportedText,
} from '../utils/scriptDiff';
import { parseFdx } from '../utils/fdxCodec';
import { parseFountain } from '../utils/fountainCodec';

interface ScriptCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: ScriptDocument;
  insertionAnchor?:{paragraphId:string;offset:number}|null;
  onApplyMergedScript?: (newDoc: ScriptDocument) => void;
  onApplyReformattedText?: (paragraphs: Paragraph[]) => void;
}

export const ScriptCompareModal: React.FC<ScriptCompareModalProps> = ({
  isOpen,
  onClose,
  currentDocument,
  insertionAnchor,
  onApplyMergedScript,
  onApplyReformattedText,
}) => {
  const [activeTab, setActiveTab] = useState<'compare' | 'combine' | 'reformat'>('compare');

  // Compare Tab State
  const [docA, setDocA] = useState<ScriptDocument>(currentDocument);
  const [docB, setDocB] = useState<ScriptDocument | null>(null);
  const [docBName, setDocBName] = useState<string>('');
  const [diffFilter, setDiffFilter] = useState<'all' | 'added' | 'deleted' | 'modified'>('all');
  const [comparisonResult, setComparisonResult] = useState<ScriptComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Combine Tab State
  const [combineSourceDoc, setCombineSourceDoc] = useState<ScriptDocument | null>(null);
  const [combineSourceName, setCombineSourceName] = useState<string>('');
  const [combineMode, setCombineMode] = useState<CombineMode>('append');
  const [combinePreview,setCombinePreview]=useState<{before:ScriptDocument;result:ScriptDocument}|null>(null),[combineError,setCombineError]=useState('');
  const [combineSuccess, setCombineSuccess] = useState(false);

  // Reformat Tab State
  const [rawTextToReformat, setRawTextToReformat] = useState<string>('');
  const [reformattedParagraphs, setReformattedParagraphs] = useState<Paragraph[]>([]);
  const [reformatSuccess, setReformatSuccess] = useState(false);

  // Sample comparison preset generator for quick test
  const handleLoadSampleRevisionB = () => {
    // Generate an altered revision of the current script (e.g. Blue Revision with dialogue changes and new scene)
    const alteredParas: Paragraph[] = currentDocument.paragraphs.map((p, idx) => {
      if (idx === 2) {
        return {
          ...p,
          text: p.text + ' Rain lashes violently against the shattered neon billboards.',
        };
      }
      if (idx === 6 && p.type === 'Dialogue') {
        return {
          ...p,
          text: 'The encryption on the neural cortex was shattered hours before we breached.',
        };
      }
      return { ...p };
    });

    // Add a new inserted scene
    alteredParas.splice(10, 0, {
      id: `sample-rev-new-${Date.now()}`,
      type: 'Scene Heading',
      text: 'INT. UNDERGROUND REFUGE - NIGHT (REVISED INSERTION)',
      sceneNumber: '2A',
      runs: [{ text: 'INT. UNDERGROUND REFUGE - NIGHT (REVISED INSERTION)' }],
    }, {
      id: `sample-rev-new-act-${Date.now()}`,
      type: 'Action',
      text: 'ELENA re-checks the biometric seal. Sparks sizzle from the junction box.',
      runs: [{ text: 'ELENA re-checks the biometric seal. Sparks sizzle from the junction box.' }],
    });

    // Delete one item
    alteredParas.splice(15, 1);

    const docBModified: ScriptDocument = {
      ...currentDocument,
      id: `doc-b-${Date.now()}`,
      titlePage: {
        ...currentDocument.titlePage,
        title: `${currentDocument.titlePage.title || 'Screenplay'} (Production Blue Revision)`,
        draftDate: 'October 24, 2026',
      },
      currentRevision: 'Blue',
      paragraphs: alteredParas,
      lastSavedAt: new Date().toISOString(),
    };

    setDocB(docBModified);
    setDocBName(`${docBModified.titlePage.title} (Simulated 2nd Draft)`);
    runComparison(currentDocument, docBModified);
  };

  const handleFileUploadDocB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const importedDoc=importScreenplaySource(content,file.name);

        if (importedDoc) {
          setDocB(importedDoc);
          setDocBName(file.name);
          runComparison(docA, importedDoc);
        }
      } catch (err) {
        console.error('Failed to parse comparison file', err);
        alert('Could not parse the screenplay file for comparison.');
      }
    };
    reader.readAsText(file);
  };

  const runComparison = (a: ScriptDocument, b: ScriptDocument) => {
    setIsComparing(true);
    setTimeout(() => {
      try{setComparisonResult(compareScriptDocuments(a,b));}catch(error){setCombineError(String(error));}finally{setIsComparing(false);}
    }, 150);
  };

  const handleSaveComparisonResult = () => {
    if (!comparisonResult) return;
    const jsonStr = JSON.stringify(comparisonResult, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Script-Comparison-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintComparison = () => {
    window.print();
  };

  // Combine handlers
  const handleFileUploadCombine = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const importedDoc=importScreenplaySource(content,file.name);

        if (importedDoc) {
          setCombineSourceDoc(importedDoc);
          setCombineSourceName(file.name);
        }
      } catch (err) {
        console.error('Failed to load file for combining', err);
        alert('Could not parse file for combine.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteCombine=()=>{if(!combineSourceDoc||!onApplyMergedScript)return;try{const at=insertionAnchor?currentDocument.paragraphs.findIndex(p=>p.id===insertionAnchor.paragraphId):-1;if(combineMode==='insert-at-cursor'&&at<0)throw Error('Focus the intended element before opening Combine.');const index=at<0?undefined:at+(insertionAnchor!.offset===0?0:1),result=combineScreenplayDocuments(currentDocument,combineSourceDoc,combineMode,index);setCombinePreview({before:currentDocument,result});setCombineError('');}catch(error){setCombineError(String(error));setCombinePreview(null);}};

  // Reformat handlers
  const handleRunReformat = () => {
    if (!rawTextToReformat.trim()) return;
    const parsed = reformatImportedText(rawTextToReformat,currentDocument.writingFormat,new Set(currentDocument.characterMemory?.map(c=>characterName(c.name))||[]));
    setReformattedParagraphs(parsed);
  };

  const handleApplyReformatted = () => {
    if (!onApplyReformattedText || reformattedParagraphs.length === 0) return;
    onApplyReformattedText(reformattedParagraphs);
    setReformatSuccess(true);
    setTimeout(() => {
      setReformatSuccess(false);
      onClose();
    }, 1200);
  };

  // Filtered diff items
  const filteredDiffs = useMemo(() => {
    if (!comparisonResult) return [];
    if (diffFilter === 'all') return comparisonResult.diffs;
    return comparisonResult.diffs.filter((d) => d.type === diffFilter);
  }, [comparisonResult, diffFilter]);

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e1e24] dc-bg-panel border border-white/15 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#26262e] dc-bg-elevated border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Script Compare & File Management
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Part 11
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Identify screenplay differences, merge files, reformat raw imports, and preserve document integrity
              </p>
            </div>
          </div>
          <button aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-[#212128] border-b border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'compare'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare Two Screenplay Versions
          </button>
          <button
            onClick={() => setActiveTab('combine')}
            className={`px-4 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'combine'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Combine Screenplay Files
          </button>
          <button
            onClick={() => setActiveTab('reformat')}
            className={`px-4 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'reformat'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Reformat Imported Text
          </button>
        </div>

        {/* Tab 1: Compare Two Screenplays */}
        {activeTab === 'compare' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Control Bar */}
            <div className="p-4 bg-[#1a1a20] dc-bg-chrome border-b border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                  <span className="text-neutral-400">Base Draft (A):</span>
                  <span className="font-medium text-amber-300 truncate max-w-[180px]">
                    {docA.titlePage.title || 'Current Document'}
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-neutral-500" />

                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                  <span className="text-neutral-400">Comparison Draft (B):</span>
                  <span className="font-medium text-cyan-300 truncate max-w-[180px]">
                    {docBName || 'None Selected'}
                  </span>
                </div>

                {/* Upload or Sample button */}
                <label className="cursor-pointer px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md border border-white/10 flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-neutral-400" />
                  Select File B (.fdx/.fountain)...
                  <input
                    type="file"
                    accept=".draftcraft,.fdx,.fountain,.rtf,.txt"
                    onChange={handleFileUploadDocB}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleLoadSampleRevisionB}
                  className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 rounded-md border border-cyan-700/40 flex items-center gap-1.5 transition-colors"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  Simulate Production Revision B
                </button>
              </div>

              {comparisonResult && (
                <div className="flex items-center gap-2">
                  {/* Filter Pills */}
                  <div className="flex bg-black/40 p-0.5 rounded-md border border-white/10">
                    {(['all', 'added', 'deleted', 'modified'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setDiffFilter(mode)}
                        className={`px-2.5 py-1 rounded text-[11px] capitalize transition-colors ${
                          diffFilter === mode
                            ? 'bg-amber-500 text-black font-semibold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleSaveComparisonResult}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md border border-white/10 flex items-center gap-1.5"
                    title="Save Comparison Results as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Save Report
                  </button>
                  <button
                    onClick={handlePrintComparison}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md border border-white/10 flex items-center gap-1.5"
                    title="Print Comparison Document"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
              )}
            </div>

            {/* Comparison Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!comparisonResult && !isComparing && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-800/80 border border-white/10 flex items-center justify-center mb-4 text-neutral-500">
                    <GitCompare className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-200 mb-1">
                    No Comparison Target Loaded
                  </h3>
                  <p className="text-xs max-w-md text-neutral-400 mb-4">
                    Select a secondary screenplay file (.fdx or .fountain) or click{' '}
                    <strong className="text-cyan-300">Simulate Production Revision B</strong> to view side-by-side
                    visual difference tracking with highlighted additions, deletions, and paragraph adjustments.
                  </p>
                  <button
                    onClick={handleLoadSampleRevisionB}
                    className="px-4 py-2 bg-amber-500 text-black font-medium text-xs rounded-lg hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                  >
                    Load Sample Revision & Compare
                  </button>
                </div>
              )}

              {isComparing && (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mb-3" />
                  <p className="text-xs font-medium">Analyzing script diffs & word changes...</p>
                </div>
              )}

              {comparisonResult && !isComparing && (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-[#24242d] p-3 rounded-lg border border-white/10">
                      <div className="text-[11px] text-neutral-400">Additions in B</div>
                      <div className="text-lg font-bold text-emerald-400 flex items-center gap-1">
                        <Plus className="w-4 h-4" />
                        {comparisonResult.summary.addedCount}
                        <span className="text-[11px] font-normal text-emerald-400/70">
                          (+{comparisonResult.summary.addedWords} words)
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#24242d] p-3 rounded-lg border border-white/10">
                      <div className="text-[11px] text-neutral-400">Deletions from A</div>
                      <div className="text-lg font-bold text-rose-400 flex items-center gap-1">
                        <Minus className="w-4 h-4" />
                        {comparisonResult.summary.deletedCount}
                        <span className="text-[11px] font-normal text-rose-400/70">
                          (-{comparisonResult.summary.deletedWords} words)
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#24242d] p-3 rounded-lg border border-white/10">
                      <div className="text-[11px] text-neutral-400">Modified Lines</div>
                      <div className="text-lg font-bold text-amber-400 flex items-center gap-1">
                        <Edit3 className="w-4 h-4" />
                        {comparisonResult.summary.modifiedCount}
                      </div>
                    </div>

                    <div className="bg-[#24242d] p-3 rounded-lg border border-white/10">
                      <div className="text-[11px] text-neutral-400">Unchanged Elements</div>
                      <div className="text-lg font-bold text-neutral-300">
                        {comparisonResult.summary.unchangedCount}
                      </div>
                    </div>

                    <div className="bg-[#24242d] p-3 rounded-lg border border-white/10">
                      <div className="text-[11px] text-neutral-400">Scenes Affected</div>
                      <div className="text-lg font-bold text-cyan-400">
                        {comparisonResult.summary.scenesAffected.length || 'All stable'}
                      </div>
                    </div>
                  </div>

                  {/* Screenplay Diff List View */}
                  <div className="bg-[#18181f] border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-[#202028] border-b border-white/10 flex items-center justify-between text-xs text-neutral-300">
                      <span className="font-medium">
                        Detailed Paragraph Differences ({filteredDiffs.length} elements shown)
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Green: Additions | Red Strike: Deletions | Amber: Revisions
                      </span>
                    </div>

                    <div className="divide-y divide-white/5 font-mono text-xs">
                      {filteredDiffs.map((diff, index) => {
                        if (diff.type === 'unchanged') {
                          return (
                            <div
                              key={index}
                              className="px-4 py-2.5 hover:bg-white/[0.02] flex items-start gap-4 text-neutral-400"
                            >
                              <span className="text-[10px] dc-meta w-8 text-neutral-600 select-none text-right">
                                {diff.revisedIndex !== undefined ? diff.revisedIndex + 1 : ''}
                              </span>
                              <div className="w-24 text-[10px] dc-meta text-neutral-500 uppercase shrink-0">
                                {diff.originalParagraph?.type}
                              </div>
                              <div className="flex-1 font-sans text-neutral-300 leading-relaxed">
                                {diff.originalParagraph?.text}
                              </div>
                            </div>
                          );
                        }

                        if (diff.type === 'added') {
                          return (
                            <div
                              key={index}
                              className="px-4 py-2.5 bg-emerald-950/20 border-l-4 border-emerald-500 flex items-start gap-4"
                            >
                              <span className="text-[10px] dc-meta w-8 text-emerald-500 select-none text-right font-bold">
                                +{diff.revisedIndex !== undefined ? diff.revisedIndex + 1 : ''}
                              </span>
                              <div className="w-24 text-[10px] dc-meta text-emerald-400 uppercase shrink-0 font-bold">
                                {diff.revisedParagraph?.type}
                              </div>
                              <div className="flex-1 font-sans text-emerald-200 leading-relaxed">
                                <span className="bg-emerald-500/20 px-1 py-0.5 rounded text-emerald-300">
                                  {diff.revisedParagraph?.text}
                                </span>
                              </div>
                              <span className="text-[10px] dc-meta bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded shrink-0">
                                Added in Draft B
                              </span>
                            </div>
                          );
                        }

                        if (diff.type === 'deleted') {
                          return (
                            <div
                              key={index}
                              className="px-4 py-2.5 bg-rose-950/20 border-l-4 border-rose-500 flex items-start gap-4"
                            >
                              <span className="text-[10px] dc-meta w-8 text-rose-500 select-none text-right font-bold">
                                -{diff.originalIndex !== undefined ? diff.originalIndex + 1 : ''}
                              </span>
                              <div className="w-24 text-[10px] dc-meta text-rose-400 uppercase shrink-0">
                                {diff.originalParagraph?.type}
                              </div>
                              <div className="flex-1 font-sans text-rose-300/80 leading-relaxed line-through">
                                {diff.originalParagraph?.text}
                              </div>
                              <span className="text-[10px] dc-meta bg-rose-900/60 text-rose-300 px-2 py-0.5 rounded shrink-0">
                                Removed from Draft A
                              </span>
                            </div>
                          );
                        }

                        if (diff.type === 'modified') {
                          return (
                            <div
                              key={index}
                              className="px-4 py-3 bg-amber-950/20 border-l-4 border-amber-500 flex flex-col gap-2"
                            >
                              <div className="flex items-center gap-3 text-[11px]">
                                <span className="text-amber-400 font-bold uppercase">
                                  Modified {diff.originalParagraph?.type} (Scene {diff.sceneNumber})
                                </span>
                                <span className="text-neutral-400 text-[10px] dc-meta">
                                  Line #{diff.originalIndex! + 1} → #{diff.revisedIndex! + 1}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                <div className="p-2.5 rounded bg-black/40 border border-white/5">
                                  <div className="text-[10px] dc-meta text-rose-400 mb-1 font-semibold">
                                    Original (Draft A):
                                  </div>
                                  <div className="font-sans text-neutral-300 line-through opacity-80">
                                    {diff.originalParagraph?.text}
                                  </div>
                                </div>

                                <div className="p-2.5 rounded bg-black/40 border border-white/5">
                                  <div className="text-[10px] dc-meta text-emerald-400 mb-1 font-semibold">
                                    Revised (Draft B):
                                  </div>
                                  <div className="font-sans text-emerald-200">
                                    {diff.revisedParagraph?.text}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Combine Screenplay Files */}
        {activeTab === 'combine' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="max-w-2xl bg-[#24242d] border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Combine Screenplay Files into Master Draft
              </h3>
              <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                Seamlessly merge sequences, acts, or updated scenes from another Final Draft or Fountain screenplay
                into your current active screenplay document.
              </p>

              <p className="text-xs text-amber-200">Review before applying. Insertion uses the focused element boundary: before it at offset zero, otherwise after it. Current title/layout stay active; source global settings are retained as native provenance. Character identities, assets and supported planning/production records are merged. Incompatible lock schedules are blocked.</p>
              {combineError&&<p role="alert">{combineError}</p>}
              {combinePreview&&<section role="region" aria-label="Combine preview"><p>{combinePreview.before.paragraphs.length} → {combinePreview.result.paragraphs.length} elements; {combinePreview.result.studio?.assets.length||0} retained image assets. Undo restores the current document.</p><div style={{maxHeight:160,overflow:'auto'}}>{combinePreview.result.paragraphs.map(p=><p key={p.id}><strong>{p.type}: </strong>{p.text}</p>)}</div><button disabled={combinePreview.before!==currentDocument} onClick={()=>{if(combinePreview.before!==currentDocument){setCombineError('The document changed. Preview again.');return;}onApplyMergedScript?.(combinePreview.result);onClose();}}>Confirm Combine</button><button onClick={()=>setCombinePreview(null)}>Cancel Preview</button></section>}
              {/* Step 1: Source Document */}
              <div className="space-y-4 mb-6">
                <label className="block text-xs font-medium text-neutral-300">
                  1. Select Screenplay to Merge From:
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg border border-white/10 flex items-center gap-2 text-xs transition-colors">
                    <Upload className="w-4 h-4 text-neutral-400" />
                    Browse project or screenplay...
                    <input
                      type="file"
                      accept=".draftcraft,.fdx,.fountain,.rtf,.txt"
                      onChange={handleFileUploadCombine}
                      className="hidden"
                    />
                  </label>
                  {combineSourceName ? (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Loaded: {combineSourceName} ({combineSourceDoc?.paragraphs.length} paragraphs)
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500">No file loaded yet</span>
                  )}
                </div>
              </div>

              {/* Step 2: Combine Mode */}
              <div className="space-y-3 mb-6">
                <label className="block text-xs font-medium text-neutral-300">
                  2. Merge Strategy:
                </label>
                <div role="radiogroup" aria-label="Merge strategy" className="grid grid-cols-1 md:grid-cols-3 gap-3">{([['append','Append to End of Script'],['insert-at-cursor','Insert at focused element'],['merge-by-scene','Match & Replace by Scene Number']] as const).map(([mode,label])=><button type="button" role="radio" aria-label={label} aria-checked={combineMode===mode} className="p-3 border rounded text-left" key={mode} onClick={()=>{setCombineMode(mode);setCombinePreview(null);}}>{label}</button>)}</div>
              </div>

              {/* Execute Action */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="text-xs text-neutral-400">
                  Active Document has {currentDocument.paragraphs.length} paragraphs
                </div>
                <button
                  disabled={!combineSourceDoc}
                  onClick={handleExecuteCombine}
                  className={`px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                    combineSourceDoc
                      ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Combine into Current Screenplay
                </button>
              </div>

              {combineSuccess && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Successfully merged files! Updating screenplay editor...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Reformat Imported Text */}
        {activeTab === 'reformat' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="bg-[#24242d] border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                Reformat Imported Text
              </h3>
              <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                Paste unformatted text, email drafts, treatment excerpts, or raw notes. The reformat preview uses the active format and known characters.
                Review uncertain classifications before appending them to the script.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-2">
                    Raw Unformatted Text:
                  </label>
                  <textarea
                    rows={14}
                    value={rawTextToReformat}
                    onChange={(e) => setRawTextToReformat(e.target.value)}
                    placeholder={`Paste text here, for example:\n\nEXT. ROOFTOP - NIGHT\n\nRain pours down. Raindrops glisten.\n\nELENA\n(whispering)\nWe don't have much time.\n\nMARCUS\nI know. Grab the drive.\n\nFADE OUT.`}
                    className="w-full bg-[#181820] dc-bg-sidebar border border-white/15 rounded-lg p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-400 resize-none"
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <button
                      onClick={() =>
                        setRawTextToReformat(
                          `EXT. NEON ALLEY - MIDNIGHT\n\nA hovercar screeches to a halt.\n\nKAI\n(reloading battery)\nCover the rear entrance!\n\nJAX\nI'm on it. Just give me five seconds.\n\nCUT TO:`
                        )
                      }
                      className="text-[11px] text-amber-400 hover:underline"
                    >
                      Paste Sample Raw Scene
                    </button>
                    <button
                      onClick={handleRunReformat}
                      className="px-4 py-2 bg-amber-500 text-black text-xs font-medium rounded-lg hover:bg-amber-400 transition-colors"
                    >
                      Analyze & Reformat
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-2">
                    Standardized Screenplay Output Preview:
                  </label>
                  <div className="h-[280px] bg-[#181820] dc-bg-sidebar border border-white/15 rounded-lg p-3 overflow-y-auto font-mono text-xs divide-y divide-white/5">
                    {reformattedParagraphs.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-neutral-500 text-xs text-center p-4">
                        Reformatted screenplay paragraphs with detected element types will appear here.
                      </div>
                    ) : (
                      reformattedParagraphs.map((p, idx) => (
                        <div key={idx} className="py-1.5 flex items-start gap-2">
                          <span className="text-[10px] dc-meta text-amber-400/80 uppercase w-24 shrink-0 font-sans">
                            {p.type}
                          </span>
                          <span
                            className={`flex-1 ${
                              p.type === 'Scene Heading'
                                ? 'font-bold text-white'
                                : p.type === 'Character'
                                ? 'text-amber-300 font-semibold uppercase'
                                : p.type === 'Parenthetical'
                                ? 'text-neutral-400 italic'
                                : p.type === 'Dialogue'
                                ? 'text-neutral-200'
                                : 'text-neutral-300'
                            }`}
                          >
                            {p.text}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {reformattedParagraphs.length > 0 && (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-emerald-400 font-medium">
                        ✓ {reformattedParagraphs.length} elements detected
                      </span>
                      <button
                        onClick={handleApplyReformatted}
                        className="px-4 py-2 bg-emerald-500 text-black font-semibold text-xs rounded-lg hover:bg-emerald-400 transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Append to Script Document
                      </button>
                    </div>
                  )}

                  {reformatSuccess && (
                    <div className="mt-2 p-2 rounded bg-emerald-950/60 text-emerald-300 text-xs">
                      Appended successfully! Closing...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DialogOverlay>
  );
};
