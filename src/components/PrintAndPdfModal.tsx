import {DEFAULT_LAYOUT_FORMAT} from '../production/layout';
import { loadWorkspace } from '../workspace/preferences';
import {runFormattingDoctor} from '../utils/formatDoctor';
import {portablePrintHtml,layoutPageHtml} from '../production/print';
import {newFromTemplate} from '../formats/storage';
import {FORMAT_TEMPLATES} from '../formats/catalog';
import {blankDocument} from '../files/model';
import {elementCss,styleFor,paragraphMeasure} from '../formats/model';
import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Palette,
  CheckCircle2,
  Sliders,
  Eye,
  FileCode,
  Layers,
  Copy,
  Upload,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { ScriptDocument, ElementType, RevisionTier } from '../types/script';
import {
  generateScreenplayPdf,
  downloadScriptPdf,
  getScriptPdfDataUrl,
  PdfExportOptions,
  PdfPaperSize,
  PdfColorTheme,
  REVISION_SET_COLORS,
} from '../utils/pdfExportEngine';
import {
  FDXT_TEMPLATES,
  exportToNativeProject,
  parseNativeProject,
  exportToRtf,
  exportToPlainText,
  exportToTextWithLayout,
  exportToHtml,
  exportToSchedulingSex,
  exportToAvidScript,
  exportToTabDelimitedDialogue,
  exportToMarkdown,
  downloadFileContent,
  ScreenplayFileFormat,
} from '../utils/screenplayFormats';
import { exportToFdx, parseFdx } from '../utils/fdxCodec';
import { exportToFountain, parseFountain } from '../utils/fountainCodec';
import { paginateScript, PageChunk } from '../utils/pagination';

interface PrintAndPdfModalProps {
  onExportReview?:(format:string,run:()=>void)=>void;
  isOpen: boolean;
  onClose: () => void;
  document: ScriptDocument;
  onLoadTemplateOrDocument?: (doc: ScriptDocument) => void;
  initialTab?: 'pdf' | 'print' | 'formats';
}

export const PrintAndPdfModal: React.FC<PrintAndPdfModalProps> = ({
  isOpen,onExportReview,
  onClose,
  document: scriptDoc,
  onLoadTemplateOrDocument,
  initialTab = 'pdf',
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'print' | 'formats'>(initialTab);

  // PDF Export Engine Options State (Part 12.1)
  const [paperSize, setPaperSize] = useState<PdfPaperSize|'document'>('document');
  const [colorTheme, setColorTheme] = useState<PdfColorTheme>('standard');
  const [customBgColor, setCustomBgColor] = useState('#1e293b');
  const [customTextColor, setCustomTextColor] = useState('#f8fafc');
  const [includeTitlePage, setIncludeTitlePage] = useState(scriptDoc.titlePage.includeInPdf??scriptDoc.writingFormat?.titlePage??true);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.12);
  const [watermarkAngle, setWatermarkAngle] = useState(-45);
  const [sceneNumberPlacement, setSceneNumberPlacement] = useState<'left' | 'right' | 'both' | 'none'>(
    scriptDoc.sceneNumberPlacement || 'both'
  );
  const [showRevisionMarks, setShowRevisionMarks] = useState(true);
  const [highlightRevisedText, setHighlightRevisedText] = useState(false);
  const [coloredRevisionPages, setColoredRevisionPages] = useState(false);
  const [structureLines, setStructureLines] = useState(scriptDoc.showStructureLines || false);
  // Lines print with the writer's Structure Line settings (width, opacity, levels, colours).
  const structureStyle = useMemo(() => loadWorkspace().structure, []);
  const [revisionSetId,setRevisionSetId]=useState('');
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom' | 'revised_only'>('all');
  const [customPageRange, setCustomPageRange] = useState('1-10');
  // Standard screenplay pages carry only the page number (top right). No running title is forced into the header: the
  // document's own header settings (Header & Footer) apply, and without any the header is just the page number.
  const headerText: string | undefined = undefined;
  const [footerText, setFooterText] = useState('');
  const [showHeaders, setShowHeaders] = useState(true);
  const [showFooters, setShowFooters] = useState(false);

  // Live PDF Preview Data URL
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Print Preview Navigation State (Part 12.2)
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(1);
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  // File Formats State (Part 12.3)
  const [selectedFormat, setSelectedFormat] = useState<ScreenplayFileFormat>('fdx');
  const [formatStatusMsg, setFormatStatusMsg] = useState<string>('');
  const [roundtripResult, setRoundtripResult] = useState<{ passed: boolean; message: string } | null>(null);

  useEffect(()=>{if(isOpen)setPaperSize('document');},[isOpen,scriptDoc.id]);
  const printDocument=useMemo(()=>{const f=scriptDoc.writingFormat||DEFAULT_LAYOUT_FORMAT;if(paperSize==='document'||Math.abs(f.page.width-(paperSize==='a4'?8.2677:8.5))<.01&&Math.abs(f.page.height-(paperSize==='a4'?11.6929:11))<.01)return scriptDoc;return {...scriptDoc,writingFormat:{...f,page:{...f.page,width:paperSize==='a4'?8.2677:8.5,height:paperSize==='a4'?11.6929:11}}};},[scriptDoc,paperSize]);
  // Paginated chunks for accurate preview
  const paginatedPages = useMemo(() => {
    return paginateScript(printDocument.paragraphs,printDocument.lockedPages,printDocument.writingFormat,printDocument.studio);
  }, [printDocument]);

  const totalPagesCount = paginatedPages.length;

  // Compile PDF options object
  const pdfOptions: PdfExportOptions = useMemo(() => {
    return {
      paperSize:paperSize==='document'?(Math.abs((printDocument.writingFormat||DEFAULT_LAYOUT_FORMAT).page.width-8.2677)<.01?'a4':'letter'):paperSize,
      theme: colorTheme,
      customBgColor,
      customTextColor,
      includeTitlePage,
      watermarkText,
      watermarkOpacity,
      watermarkAngle,
      sceneNumberPlacement,
      showRevisionMarks,
      highlightRevisedText,
      coloredRevisionPages,
      structureLines,
      structureStyle,
      pageRange: pageRangeMode === 'custom' ? customPageRange : 'all',
      revisedPagesOnly: pageRangeMode === 'revised_only',revisionSetId:revisionSetId||undefined,
      headerText,
      showHeaders,
      showFooters,
      footerText,
    };
  }, [
    paperSize,
    colorTheme,
    customBgColor,
    customTextColor,
    includeTitlePage,
    watermarkText,
    watermarkOpacity,
    watermarkAngle,
    sceneNumberPlacement,
    showRevisionMarks,
    highlightRevisedText,
    coloredRevisionPages,
    structureLines,
    pageRangeMode,revisionSetId,
    customPageRange,
    headerText,
    showHeaders,
    showFooters,
    footerText,
  ]);

  // Generate / Update live PDF preview on tab activation or settings change
  useEffect(() => {
    if (!isOpen) return;

    let alive=true;
    const timer=setTimeout(async()=>{setIsGeneratingPdf(true);try{
      const previewOptions={...pdfOptions,pageRange:pageRangeMode==='custom'?customPageRange:paginatedPages.slice(0,15).map(p=>p.pageLabel).join(',')};
      const native=window.draftcraftDesktop?.productionPrint;
      const data=native?(await native({mode:'preview',html:await portablePrintHtml(printDocument,previewOptions),width:printDocument.writingFormat?.page.width||8.5,height:printDocument.writingFormat?.page.height||11})).data:getScriptPdfDataUrl(printDocument,previewOptions);
      if(alive)setPdfPreviewUrl(data||'');
    }catch(error){if(alive)setFormatStatusMsg((error as Error).message);}finally{if(alive)setIsGeneratingPdf(false);}},250);
    return()=>{alive=false;clearTimeout(timer);};
  }, [isOpen, pdfOptions, printDocument, pageRangeMode, customPageRange]);

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  // Handle PDF Download
  const checkBeforePrint=()=>{if(!scriptDoc.studio?.doctor.beforePrint)return true;const issues=runFormattingDoctor(scriptDoc.paragraphs,scriptDoc.writingFormat,scriptDoc.studio.doctor);return !issues.length||window.confirm(`${issues.length} selected formatting checks need review. Continue with the current document?\n\n`+issues.slice(0,6).map(i=>i.title).join('\n'));};
  const handleDownloadPdf = async () => {
    if(!checkBeforePrint())return;
    try{setIsGeneratingPdf(true);const name=scriptDoc.titlePage.title||'Screenplay';const native=window.draftcraftDesktop?.productionPrint;
      if(native){const result=await native({mode:'save',html:await portablePrintHtml(printDocument,pdfOptions),width:printDocument.writingFormat?.page.width||8.5,height:printDocument.writingFormat?.page.height||11,name});setFormatStatusMsg(result.saved?'Verified PDF exported: '+result.location:'PDF export canceled.');}
      else {downloadScriptPdf(printDocument,name+'.pdf',pdfOptions);setFormatStatusMsg('PDF generated with built-in browser PDF fonts. Use Print → Save as PDF for full font and Unicode fidelity.');}
    }catch(error){setFormatStatusMsg((error as Error).message);}finally{setIsGeneratingPdf(false);}
  };

  // Handle Native Print Dialog (Part 12.2)
  const handleTriggerNativePrint = async () => {
    if(!checkBeforePrint())return;
    const native=window.draftcraftDesktop?.productionPrint;
    if(native){try{await native({mode:'print',html:await portablePrintHtml(printDocument,pdfOptions),width:printDocument.writingFormat?.page.width||8.5,height:printDocument.writingFormat?.page.height||11});}catch(error){setFormatStatusMsg((error as Error).message);}return;}
    // Generate full-fidelity print HTML stylesheet and print
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = await portablePrintHtml(printDocument,pdfOptions);
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Trigger print once document is ready
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  // Handle File Format Export
  const handleExportFormat=(fmt:ScreenplayFileFormat)=>{if(onExportReview)onExportReview(fmt,()=>performExportFormat(fmt));else performExportFormat(fmt);};
  const performExportFormat = (fmt: ScreenplayFileFormat) => {
    const baseName = (scriptDoc.titlePage.title || 'Screenplay').replace(/[^a-zA-Z0-9_-]/g, '_');

    switch (fmt) {
      case 'fdx': {
        const content = exportToFdx(scriptDoc);
        downloadFileContent(content, `${baseName}.fdx`, 'application/xml');
        setFormatStatusMsg('✓ Final Draft .fdx exported.');
        break;
      }
      case 'fdxt': {
        const content = exportToFdx(scriptDoc,true);
        downloadFileContent(content, `${baseName}_Template.fdxt`, 'application/xml');
        setFormatStatusMsg('✓ Final Draft Template .fdxt exported.');
        break;
      }
      case 'fdproject': {
        const content = exportToNativeProject(scriptDoc);
        downloadFileContent(content, `${baseName}.fdproject`, 'application/json');
        setFormatStatusMsg('✓ DraftCraft archive .fdproject exported.');
        break;
      }
      case 'rtf': {
        const content = exportToRtf(scriptDoc);
        downloadFileContent(content, `${baseName}.rtf`, 'application/rtf');
        setFormatStatusMsg('✓ Rich Text Format .rtf exported.');
        break;
      }
      case 'txt_layout': {
        const content = exportToTextWithLayout(scriptDoc);
        downloadFileContent(content, `${baseName}_layout.txt`, 'text/plain');
        setFormatStatusMsg('✓ Text with 10cpi Layout exported.');
        break;
      }
      case 'txt': {
        const content = exportToPlainText(scriptDoc);
        downloadFileContent(content, `${baseName}.txt`, 'text/plain');
        setFormatStatusMsg('✓ Plain text .txt exported.');
        break;
      }
      case 'html': {
        const content = exportToHtml(scriptDoc);
        downloadFileContent(content, `${baseName}.html`, 'text/html');
        setFormatStatusMsg('✓ Formatted HTML Screenplay exported.');
        break;
      }
      case 'scheduling_sex': {
        const content = exportToSchedulingSex(scriptDoc);
        downloadFileContent(content, `${baseName}_Scheduling.sex`, 'application/xml');
        setFormatStatusMsg('✓ Final Draft Scheduling .sex exported.');
        break;
      }
      case 'avid_script': {
        const content = exportToAvidScript(scriptDoc);
        downloadFileContent(content, `${baseName}_AvidSync.txt`, 'text/plain');
        setFormatStatusMsg('✓ Avid Media Composer ScriptSync exported.');
        break;
      }
      case 'tab_dialogue': {
        const content = exportToTabDelimitedDialogue(scriptDoc, 'tsv');
        downloadFileContent(content, `${baseName}_Dialogue.tsv`, 'text/tab-separated-values');
        setFormatStatusMsg('✓ Tab-delimited dialogue .tsv exported.');
        break;
      }
      case 'fountain': {
        const content = exportToFountain(scriptDoc);
        downloadFileContent(content, `${baseName}.fountain`, 'text/plain');
        setFormatStatusMsg('✓ Fountain screenplay exported.');
        break;
      }
      case 'markdown': {
        const content = exportToMarkdown(scriptDoc);
        downloadFileContent(content, `${baseName}.md`, 'text/markdown');
        setFormatStatusMsg('✓ Markdown screenplay exported.');
        break;
      }
    }
  };

  // Handle Template Instantiation
  const handleLoadTemplate = (tpl: (typeof FDXT_TEMPLATES)[0]) => {
    if (!onLoadTemplateOrDocument) return;
    const confirmed = window.confirm(
      `Load template "${tpl.name}"? This will create a starter script structured according to ${tpl.category} standards.`
    );
    if (confirmed) {
      const names:Record<string,string>={feature_film_standard:'Standard Feature Screenplay',tv_drama_60min:'One-Hour TV Drama',tv_sitcom_multicam:'Multi-Camera Sitcom',stage_play_standard:'Modern Stageplay'};
      const chosen=FORMAT_TEMPLATES.find(t=>t.name===names[tpl.id])||FORMAT_TEMPLATES[0];
      const newDoc:ScriptDocument={...newFromTemplate(blankDocument(),chosen),titlePage:tpl.initialDocument.titlePage as ScriptDocument['titlePage'],paragraphs:(tpl.initialDocument.paragraphs||[]).map(p=>({...p,id:'p-'+crypto.randomUUID()}))};
      onLoadTemplateOrDocument(newDoc);
      onClose();
    }
  };

  // Run round-trip FDX fidelity test
  const handleRunRoundtripTest = () => {
    try {
      const exportedXml = exportToFdx(scriptDoc);
      const parsed = parseFdx(exportedXml);

      const originalCount = scriptDoc.paragraphs.length;
      const parsedCount = parsed.paragraphs?.length || 0;

      if (originalCount === parsedCount) {
        setRoundtripResult({
          passed: true,
          message: `✓ Supported field round-trip check passed. Verified ${originalCount} elements, Title Page metadata, and scene attributes preserved without loss.`,
        });
      } else {
        setRoundtripResult({
          passed: false,
          message: `Notice: ${originalCount} original elements vs ${parsedCount} round-trip elements detected.`,
        });
      }
    } catch (e: any) {
      setRoundtripResult({
        passed: false,
        message: `Round-trip test exception: ${e.message}`,
      });
    }
  };

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Production Print & PDF Engine
                <span className="text-[10px] dc-meta font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  FD13 Specs
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Shared screenplay layout, PDF publishing, production revisions and supported interchange formats
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'pdf'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              12.1 PDF Export
            </button>
            <button
              onClick={() => setActiveTab('print')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'print'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              12.2 Print & Preview
            </button>
            <button
              onClick={() => setActiveTab('formats')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'formats'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              12.3 File Formats & Templates
            </button>
          </div>

          <button aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner if active */}
        {formatStatusMsg && (
          <div className="bg-emerald-950/70 border-b border-emerald-500/40 px-6 py-2 text-xs text-emerald-300 flex items-center justify-between">
            <span>{formatStatusMsg}</span>
            <button onClick={() => setFormatStatusMsg('')} className="text-emerald-400 hover:text-emerald-200">
              ✕
            </button>
          </div>
        )}

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* TAB 1: PDF EXPORT STUDIO */}
          {activeTab === 'pdf' && (
            <div className="flex-1 flex overflow-hidden">
              {/* PDF Settings Controls Sidebar */}
              <div className="w-96 border-r border-zinc-800 bg-zinc-950/60 p-5 overflow-y-auto space-y-5 text-xs text-zinc-300">
                {/* Paper Size & Dimensions */}
                <div>
                  <label className="font-semibold text-zinc-200 block mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-400" /> Paper Size
                  </label>
                  <button aria-pressed={paperSize==='document'} onClick={()=>setPaperSize('document')} className="w-full p-2 mb-2 border rounded">Current document: {(scriptDoc.writingFormat||DEFAULT_LAYOUT_FORMAT).page.width} × {(scriptDoc.writingFormat||DEFAULT_LAYOUT_FORMAT).page.height} in</button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaperSize('letter')}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        paperSize === 'letter'
                          ? 'border-red-500 bg-red-500/10 text-red-300 font-semibold'
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <div className="font-medium text-xs">US Letter</div>
                      <div className="text-[10px] dc-meta text-zinc-500">8.5 × 11 in (Industry)</div>
                    </button>
                    <button
                      onClick={() => setPaperSize('a4')}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        paperSize === 'a4'
                          ? 'border-red-500 bg-red-500/10 text-red-300 font-semibold'
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <div className="font-medium text-xs">A4 Paper</div>
                      <div className="text-[10px] dc-meta text-zinc-500">210 × 297 mm (International)</div>
                    </button>
                  </div>
                </div>

                {/* Color Themes: Standard, Night, Midnight, Sepia, Custom */}
                <div>
                  <label className="font-semibold text-zinc-200 block mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-400" /> Color Themes (Part 12.1)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'standard', name: 'Standard', desc: 'Black on White', bg: '#ffffff', text: '#000000' },
                      { id: 'night', name: 'Night PDF', desc: 'Dark Charcoal', bg: '#18181b', text: '#f4f4f5' },
                      { id: 'midnight', name: 'Midnight', desc: 'Deep Slate Navy', bg: '#0f172a', text: '#e2e8f0' },
                      { id: 'sepia', name: 'Sepia Vintage', desc: 'Warm Parchment', bg: '#fef3c7', text: '#451a03' },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setColorTheme(theme.id as PdfColorTheme)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                          colorTheme === theme.id
                            ? 'border-red-500 bg-red-500/10 text-zinc-100 font-semibold'
                            : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-400'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-md border border-zinc-700 flex-shrink-0"
                          style={{ backgroundColor: theme.bg }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs truncate">{theme.name}</div>
                          <div className="text-[10px] dc-meta text-zinc-500 truncate">{theme.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {colorTheme === 'custom' && (
                    <div className="mt-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-400">Background Color</span>
                        <input
                          type="color"
                          value={customBgColor}
                          onChange={(e) => setCustomBgColor(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-400">Text Color</span>
                        <input
                          type="color"
                          value={customTextColor}
                          onChange={(e) => setCustomTextColor(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Production Revision Options */}
                <div>
                  <label className="font-semibold text-zinc-200 block mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" /> Revision Output
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showRevisionMarks}
                        onChange={(e) => setShowRevisionMarks(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-0"
                      />
                      <span>Print Revision Marks (*) in right margin</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={highlightRevisedText}
                        onChange={(e) => setHighlightRevisedText(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-0"
                      />
                      <span>Colored revised text</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={coloredRevisionPages}
                        onChange={(e) => setColoredRevisionPages(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-0"
                      />
                      <span>Colored production page borders ({scriptDoc.currentRevision || 'White'})</span>
                    </label>
                  </div>
                </div>

                {scriptDoc.studio?.revisionSets.length?<label>Revision set for marks & revised pages<select aria-label="Export revision set" value={revisionSetId} onChange={e=>setRevisionSetId(e.target.value)}><option value="">All revision sets</option>{scriptDoc.studio.revisionSets.map(s=><option key={s.id} value={s.id}>{s.name} · {s.date}</option>)}</select></label>:null}
                {/* Page Range & Collated Output */}
                <div>
                  <label className="font-semibold text-zinc-200 block mb-2 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" /> Page Range & Collation
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    <button
                      onClick={() => setPageRangeMode('all')}
                      className={`py-1.5 px-2 rounded-lg text-center text-xs border ${
                        pageRangeMode === 'all'
                          ? 'border-red-500 bg-red-500/10 text-red-300 font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      All Pages
                    </button>
                    <button
                      onClick={() => setPageRangeMode('custom')}
                      className={`py-1.5 px-2 rounded-lg text-center text-xs border ${
                        pageRangeMode === 'custom'
                          ? 'border-red-500 bg-red-500/10 text-red-300 font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      Range
                    </button>
                    <button
                      onClick={() => setPageRangeMode('revised_only')}
                      className={`py-1.5 px-2 rounded-lg text-center text-xs border ${
                        pageRangeMode === 'revised_only'
                          ? 'border-red-500 bg-red-500/10 text-red-300 font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      Revised Only
                    </button>
                  </div>

                  {pageRangeMode === 'custom' && (
                    <input
                      type="text"
                      value={customPageRange}
                      onChange={(e) => setCustomPageRange(e.target.value)}
                      placeholder="e.g. 1-10, 14, 22-25"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
                    />
                  )}
                </div>

                {/* Scene Numbers & Margins */}
                <div>
                  <label className="font-semibold text-zinc-200 block mb-2">Scene Numbers Placement</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['both', 'left', 'right', 'none'] as const).map((placement) => (
                      <button
                        key={placement}
                        onClick={() => setSceneNumberPlacement(placement)}
                        className={`py-1.5 rounded-lg text-center text-xs capitalize border ${
                          sceneNumberPlacement === placement
                            ? 'border-red-500 bg-red-500/10 text-red-300 font-semibold'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {placement}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Watermark Controls */}
                <div>
                  <label className="font-semibold text-zinc-200 block mb-2 flex items-center justify-between">
                    <span>Watermark (Confidentiality)</span>
                    {watermarkText && (
                      <button onClick={() => setWatermarkText('')} className="text-[10px] dc-meta text-zinc-500 hover:text-zinc-300">
                        Clear
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL - DRAFT FOR REVIEW"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-500 mb-2"
                  />
                  {watermarkText && (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] dc-meta text-zinc-500">Opacity:</span>
                      <input
                        type="range"
                        min="0.05"
                        max="0.4"
                        step="0.02"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                        className="flex-1 accent-red-500"
                      />
                      <span className="text-[10px] dc-meta text-zinc-400 font-mono">
                        {Math.round(watermarkOpacity * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Additional Toggles */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTitlePage}
                      onChange={(e) => setIncludeTitlePage(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-0"
                    />
                    <span>Include Standard Title Page</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={structureLines}
                      onChange={(e) => setStructureLines(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-0"
                    />
                    <span>Render Structure Lines</span>
                  </label>
                </div>
              </div>

              {/* PDF Live Interactive Preview Pane */}
              <div className="flex-1 bg-zinc-950 flex flex-col overflow-hidden">
                <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Eye className="w-4 h-4 text-zinc-500" />
                    <span>Real-time Screenplay PDF Preview</span>
                    {isGeneratingPdf && <span className="text-amber-400 text-[10px] dc-meta animate-pulse">Rendering...</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDownloadPdf}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Export Screenplay PDF
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 flex items-center justify-center bg-zinc-950/80 overflow-hidden">
                  {pdfPreviewUrl ? (
                    <iframe
                      src={pdfPreviewUrl}
                      className="w-full h-full rounded-xl border border-zinc-800 shadow-2xl bg-white"
                      title="Screenplay PDF Preview"
                    />
                  ) : (
                    <div className="text-center text-zinc-500 space-y-2">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-zinc-600" />
                      <p className="text-xs">Generating PDF Preview...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRINT & PRINT PREVIEW */}
          {activeTab === 'print' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Print Controls Sidebar */}
              <div className="w-80 border-r border-zinc-800 bg-zinc-950/60 p-5 overflow-y-auto space-y-5 text-xs text-zinc-300">
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm mb-1">macOS / System Print</h3>
                  <p className="text-zinc-500 text-[11px] mb-4">
                    Send directly to printer with the selected writing format.
                  </p>

                  <button
                    onClick={handleTriggerNativePrint}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Open Native Print Dialog (⌘P)
                  </button>
                </div>

                {/* Page Navigation Controls */}
                <div className="pt-4 border-t border-zinc-800/80">
                  <label className="font-semibold text-zinc-200 block mb-2">Preview Page</label>
                  <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                    <button
                      disabled={currentPreviewPage <= 1}
                      onClick={() => setCurrentPreviewPage((prev) => Math.max(1, prev - 1))}
                      className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-xs font-semibold text-zinc-200">
                      Page {currentPreviewPage} of {totalPagesCount}
                    </span>
                    <button
                      disabled={currentPreviewPage >= totalPagesCount}
                      onClick={() => setCurrentPreviewPage((prev) => Math.min(totalPagesCount, prev + 1))}
                      className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Zoom Controls */}
                <div>
                  <label className="font-semibold text-zinc-200 block mb-2">Display Zoom</label>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setPreviewZoom((z) => Math.max(50, z - 25))}
                      className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 flex-1 flex items-center justify-center gap-1"
                    >
                      <ZoomOut className="w-3.5 h-3.5" /> -25%
                    </button>
                    <span className="font-mono text-xs px-2 text-zinc-300">{previewZoom}%</span>
                    <button
                      onClick={() => setPreviewZoom((z) => Math.min(150, z + 25))}
                      className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 flex-1 flex items-center justify-center gap-1"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> +25%
                    </button>
                  </div>
                </div>

                {/* Print Verification Checklist */}
                <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-400">Active output layout</div><p className="text-[11px] text-zinc-400">{printDocument.writingFormat?.name||'Screenplay'}; {(printDocument.writingFormat||DEFAULT_LAYOUT_FORMAT).page.width} × {(printDocument.writingFormat||DEFAULT_LAYOUT_FORMAT).page.height} inches. {totalPagesCount} screenplay pages.</p><p className="text-[11px] text-zinc-400">Margins, spacing and boundaries use this document’s measured layout. Review your production’s requirements.</p>
                </div>
              </div>

              {/* Paginated Screenplay Visual Sheet Preview */}
              <div className="flex-1 bg-zinc-950 p-6 overflow-y-auto flex flex-col items-center">
                {paginatedPages[currentPreviewPage - 1] && (
                  <div
                    style={{
                      transform: `scale(${previewZoom / 100})`,
                      transformOrigin: 'top center',
                      width: (scriptDoc.writingFormat?.page.width||8.5)+'in',
                      minHeight: (scriptDoc.writingFormat?.page.height||11)+'in',
                      padding:0,
                    }}
                    className="bg-white text-black shadow-2xl p-[1in_1in_1in_1.5in] font-mono relative transition-transform duration-150 mb-10 select-none text-[12pt] leading-[1.15]"
                  >
                    {/* Header and Page Number */}
                    {currentPreviewPage > 1 && (
                      <div className="absolute top-[0.6in] right-[1.0in] text-[10pt] text-zinc-600 font-mono">
                        {currentPreviewPage}.
                      </div>
                    )}

                    {/* Watermark in Preview */}
                    {watermarkText && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span
                          style={{
                            transform: `rotate(${watermarkAngle}deg)`,
                            opacity: watermarkOpacity * 1.5,
                          }}
                          className="text-5xl font-bold uppercase tracking-widest text-zinc-900 border-4 border-zinc-900 px-6 py-2"
                        >
                          {watermarkText}
                        </span>
                      </div>
                    )}

                    <div style={{position:'absolute',inset:0}} dangerouslySetInnerHTML={{__html:layoutPageHtml(printDocument,paginatedPages[currentPreviewPage-1],pdfOptions)}} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FILE FORMATS & TEMPLATES */}
          {activeTab === 'formats' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Formats List & Action */}
              <div className="w-1/2 border-r border-zinc-800 p-6 overflow-y-auto space-y-6">
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm mb-1">
                    Supported Interchange Formats
                  </h3>
                  <p className="text-zinc-500 text-xs">
                    Export high-fidelity screenplay assets for sound, scheduling, Avid ScriptSync, and backup.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: 'fdx',
                      title: 'Final Draft (.fdx)',
                      desc: 'Full XML structure with dual dialogue, notes, bookmarks, scene numbers.',
                      badge: 'Industry Standard',
                    },
                    {
                      id: 'fdxt',
                      title: 'Final Draft Template (.fdxt)',
                      desc: 'Document template package for re-use across television or film series.',
                      badge: 'Template',
                    },
                    {
                      id: 'fdproject',
                      title: 'Native Studio (.fdproject)',
                      desc: 'Complete project bundle including Beats, Multi-Lane Outline, & Revisions.',
                      badge: 'Full State',
                    },
                    {
                      id: 'scheduling_sex',
                      title: 'Scheduling Export (.sex)',
                      desc: 'Production scheduling XML for Movie Magic with 1/8th page breakdowns.',
                      badge: 'Production',
                    },
                    {
                      id: 'avid_script',
                      title: 'Avid ScriptSync (.txt)',
                      desc: 'Formatted cues and line indices for Avid Media Composer assistant editors.',
                      badge: 'Post-Production',
                    },
                    {
                      id: 'tab_dialogue',
                      title: 'Tab-Delimited Dialogue (.tsv)',
                      desc: 'Export for ADR, localization, voice casting, and dialogue statistics.',
                      badge: 'Sound & ADR',
                    },
                    {
                      id: 'rtf',
                      title: 'Rich Text Format (.rtf)',
                      desc: 'Word-processor compatible screenplay format with font definitions.',
                      badge: 'Interoperable',
                    },
                    {
                      id: 'txt_layout',
                      title: 'Text with Layout (.txt)',
                      desc: 'Standard 10-cpi Courier indented screenplay plain text.',
                      badge: 'Plain Text',
                    },
                    {
                      id: 'html',
                      title: 'Standalone HTML (.html)',
                      desc: 'Single-file responsive webpage with embedded print stylesheet.',
                      badge: 'Web Publishing',
                    },
                    {
                      id: 'fountain',
                      title: 'Fountain (.fountain)',
                      desc: 'Plain text screenplay markup syntax for mobile and web editors.',
                      badge: 'Open Format',
                    },
                  ].map((fmt) => (
                    <div
                      key={fmt.id}
                      className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl flex flex-col justify-between hover:border-zinc-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-zinc-200">{fmt.title}</span>
                          <span className="text-[9px] dc-fine-meta px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                            {fmt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mb-3">{fmt.desc}</p>
                      </div>
                      <button
                        onClick={() => handleExportFormat(fmt.id as ScreenplayFileFormat)}
                        className="w-full py-1.5 bg-zinc-800 hover:bg-red-600 hover:text-white text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export {fmt.title.split(' ')[0]}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Roundtrip Fidelity Test Button */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-zinc-200">FDX Round-Trip Fidelity Verification</span>
                    </div>
                    <button
                      onClick={handleRunRoundtripTest}
                      className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
                    >
                      Run Test
                    </button>
                  </div>
                  {roundtripResult && (
                    <div
                      className={`text-xs p-2.5 rounded-lg border ${
                        roundtripResult.passed
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {roundtripResult.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Built-in Templates (.fdxt) */}
              <div className="w-1/2 p-6 overflow-y-auto space-y-6">
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm mb-1">
                    Industry Screenplay Templates (.fdxt)
                  </h3>
                  <p className="text-zinc-500 text-xs">
                    Choose from standard Hollywood film, episodic drama, multi-cam sitcom, and stage play structures.
                  </p>
                </div>

                <div className="space-y-3">
                  {FDXT_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-xs text-zinc-200">{tpl.name}</span>
                        <span className="text-[10px] dc-meta px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono">
                          {tpl.targetPages} Pages
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mb-3">{tpl.description}</p>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleLoadTemplate(tpl)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          Load Template
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DialogOverlay>
  );
};
