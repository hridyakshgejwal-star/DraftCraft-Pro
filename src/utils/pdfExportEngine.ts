import {revisedFragment,revisedLine} from '../production/revisions';
import {selectedPageNumbers} from '../production/print';
import {DEFAULT_LAYOUT_FORMAT} from '../production/layout';
import {hideRightSceneNumber} from '../production/sceneNumbers';
import {styleFor,paragraphMeasure} from '../formats/model';
import { jsPDF } from 'jspdf';
import { ScriptDocument, Paragraph, ElementType } from '../types/script';
import { paginateScript, PageChunk, estimateParagraphLines } from './pagination';

export type PdfPaperSize = 'letter' | 'a4';
export type PdfColorTheme = 'standard' | 'night' | 'midnight' | 'sepia' | 'custom';

export interface PdfExportOptions {
  paragraphIds?: string[]; // Character sides retain the original page geometry.
  paperSize: PdfPaperSize;
  theme: PdfColorTheme;
  customBgColor?: string;
  customTextColor?: string;
  includeTitlePage: boolean;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkAngle?: number;
  headerText?: string;
  showHeaders: boolean;
  showFooters: boolean;
  footerText?: string;
  sceneNumberPlacement: 'left' | 'right' | 'both' | 'none';
  /** Hide right scene numbers that would overlap their heading; defaults to the document's setting. */
  autoHideRightSceneNumbers?: boolean;
  showRevisionMarks: boolean;
  highlightRevisedText: boolean;
  coloredRevisionPages: boolean;
  structureLines: boolean;
  /** How Structure Lines are drawn (the writer's View settings); the defaults when absent. */
  structureStyle?: import('../story/structure').StructureStyle;
  pageRange?: string; // e.g. "all", "1-5", "1,3,5-7", "14A"
  revisedPagesOnly?: boolean;
  revisionSetId?:string;
  creatorMetadata?: string;
}

export const THEME_PALETTES: Record<PdfColorTheme, { bg: [number, number, number]; text: [number, number, number]; dim: [number, number, number]; accent: [number, number, number] }> = {
  standard: {
    bg: [255, 255, 255],
    text: [0, 0, 0],
    dim: [120, 120, 120],
    accent: [220, 38, 38],
  },
  night: {
    bg: [24, 24, 27], // #18181b
    text: [244, 244, 245], // #f4f4f5
    dim: [161, 161, 170],
    accent: [245, 158, 11],
  },
  midnight: {
    bg: [15, 23, 42], // #0f172a
    text: [226, 232, 240], // #e2e8f0
    dim: [148, 163, 184],
    accent: [56, 189, 248],
  },
  sepia: {
    bg: [254, 243, 199], // #fef3c7
    text: [69, 26, 3], // #451a03
    dim: [146, 64, 14],
    accent: [180, 83, 9],
  },
  custom: {
    bg: [255, 255, 255],
    text: [0, 0, 0],
    dim: [120, 120, 120],
    accent: [220, 38, 38],
  },
};

export const REVISION_SET_COLORS: Record<string, [number, number, number]> = {
  'white': [255, 255, 255],
  'blue': [219, 234, 254], // #dbeafe
  'pink': [255, 228, 230], // #ffe4e6
  'yellow': [254, 249, 195], // #fef9c3
  'green': [220, 252, 231], // #dcfce7
  'goldenrod': [254, 240, 138],
  'buff': [245, 230, 211],
  'salmon': [255, 218, 204],
  'cherry': [254, 205, 211],
  'second-white': [243, 244, 246],
};

// Standard Screenplay 10-cpi Courier Margins in inches (Letter: 8.5 x 11 in)
// Converted to points (72 points per inch)
const INCH = 72;

export interface ElementIndents {
  left: number; // in inches
  width: number; // in inches
  uppercase?: boolean;
}

export const ELEMENT_LAYOUT: Partial<Record<ElementType, ElementIndents>> = {
  'Scene Heading': { left: 1.5, width: 6.0, uppercase: true },
  'Action': { left: 1.5, width: 6.0 },
  'Character': { left: 3.7, width: 3.8, uppercase: true },
  'Parenthetical': { left: 3.1, width: 2.5 },
  'Dialogue': { left: 2.5, width: 3.7 },
  'Dual Dialogue': { left: 2.5, width: 2.8 },
  'Transition': { left: 5.5, width: 2.0, uppercase: true },
  'Shot': { left: 1.5, width: 6.0, uppercase: true },
  'General': { left: 1.5, width: 6.0 },
  'Centered Text': { left: 1.5, width: 6.0 },
  'Lyrics': { left: 2.5, width: 3.7 },
  'New Act': { left: 1.5, width: 6.0, uppercase: true },
  'End of Act': { left: 1.5, width: 6.0, uppercase: true },
  'Scene Summary': { left: 1.5, width: 6.0 },
  'Cast List': { left: 1.5, width: 6.0 },
  'Outline Level 1': { left: 1.5, width: 6.0 },
  'Outline Level 2': { left: 1.5, width: 6.0 },
  'User Defined': { left: 1.5, width: 6.0 },
};

export const DEFAULT_ELEMENT_INDENT: ElementIndents = { left: 1.5, width: 6.0 };

export function parsePageRange(rangeStr:string,totalPages:number,labels?:string[]):number[]{return selectedPageNumbers(rangeStr,(labels||Array.from({length:totalPages},(_,i)=>String(i+1))).map(pageLabel=>({pageLabel})));}

/**
 * Generates an PDF from the active shared layout (built-in PDF fonts are a browser fallback).
 */
export function generateScreenplayPdf(
  doc: ScriptDocument,
  options: Partial<PdfExportOptions> = {}
): jsPDF {
  const opts: PdfExportOptions = {
    paragraphIds: options.paragraphIds, revisionSetId: options.revisionSetId,
    paperSize: options.paperSize || 'letter',
    theme: options.theme || 'standard',
    customBgColor: options.customBgColor,
    customTextColor: options.customTextColor,
    includeTitlePage: options.includeTitlePage ?? doc.writingFormat?.titlePage ?? true,
    watermarkText: options.watermarkText || '',
    watermarkOpacity: options.watermarkOpacity ?? 0.12,
    watermarkAngle: options.watermarkAngle ?? -45,
    headerText: options.headerText || '',
    showHeaders: options.showHeaders ?? true,
    showFooters: options.showFooters ?? false,
    footerText: options.footerText || '',
    sceneNumberPlacement: options.sceneNumberPlacement || doc.sceneNumberPlacement || 'both',
    showRevisionMarks: options.showRevisionMarks ?? true,
    highlightRevisedText: options.highlightRevisedText ?? false,
    coloredRevisionPages: options.coloredRevisionPages ?? false,
    structureLines: options.structureLines ?? doc.showStructureLines ?? false,
    pageRange: options.pageRange || 'all',
    revisedPagesOnly: options.revisedPagesOnly ?? false,
    creatorMetadata: options.creatorMetadata || 'DraftCraft Pro',
  };

  const isA4 = opts.paperSize === 'a4';
  const pageWidth = doc.writingFormat?doc.writingFormat.page.width*INCH:isA4 ? 595.28 : 8.5 * INCH; // 612 pt
  const pageHeight = doc.writingFormat?doc.writingFormat.page.height*INCH:isA4 ? 841.89 : 11 * INCH; // 792 pt

  // Initialize jsPDF document with points
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [pageWidth,pageHeight],
    putOnlyUsedFonts: true,
  });

  // Set Accessibility and Document Metadata
  pdf.setDocumentProperties({
    title: doc.titlePage.title || 'Screenplay',
    subject: `Screenplay Draft by ${doc.titlePage.author || 'Author'}`,
    author: doc.titlePage.author || 'Author',
    keywords: 'screenplay, script, Final Draft, industry standard, production',
    creator: opts.creatorMetadata,
  });

  // Resolve Theme Colors
  let palette = THEME_PALETTES[opts.theme] || THEME_PALETTES.standard;
  if (opts.theme === 'custom' && opts.customBgColor && opts.customTextColor) {
    const parseHex = (hex: string): [number, number, number] => {
      const c = hex.replace('#', '');
      return [
        parseInt(c.substring(0, 2), 16) || 0,
        parseInt(c.substring(2, 4), 16) || 0,
        parseInt(c.substring(4, 6), 16) || 0,
      ];
    };
    palette = {
      bg: parseHex(opts.customBgColor),
      text: parseHex(opts.customTextColor),
      dim: [140, 140, 140],
      accent: [220, 38, 38],
    };
  }

  // Draw Page Background helper
  const drawPageBackground = (revisedTier?: string) => {
    let bg = palette.bg;
    if (opts.coloredRevisionPages && revisedTier && REVISION_SET_COLORS[revisedTier.toLowerCase()]) {
      bg = REVISION_SET_COLORS[revisedTier.toLowerCase()];
    }
    pdf.setFillColor(bg[0], bg[1], bg[2]);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  // Draw Watermark helper
  const drawWatermark = () => {
    if (!opts.watermarkText || opts.watermarkText.trim() === '') return;
    pdf.saveGraphicsState();
    pdf.setTextColor(palette.dim[0], palette.dim[1], palette.dim[2]);
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(44);

    // Apply transparency
    try {
      (pdf as any).setGState(new (pdf as any).GState({ opacity: opts.watermarkOpacity }));
    } catch {
      // fallback without GState if not supported
    }

    const cx = pageWidth / 2;
    const cy = pageHeight / 2;
    const angle = opts.watermarkAngle || -45;

    // Use transform to rotate around center
    pdf.text(opts.watermarkText.toUpperCase(), cx, cy, {
      align: 'center',
      angle: angle,
    });

    pdf.restoreGraphicsState();
  };

  // Paginate Script Document
  const allPages = paginateScript(doc.paragraphs, doc.lockedPages,doc.writingFormat,doc.studio);
  const targetPages = parsePageRange(opts.pageRange || 'all', allPages.length,allPages.map(p=>p.pageLabel));

  let isFirstPageInPdf = true;

  // 1. Render Title Page (if requested)
  const shouldIncludeTitlePage =
    doc.titlePage.includeInPdf !== undefined ? doc.titlePage.includeInPdf : opts.includeTitlePage;

  if (shouldIncludeTitlePage) {
    drawPageBackground();
    drawWatermark();

    pdf.setFont('courier', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(palette.text[0], palette.text[1], palette.text[2]);

    const titleY = pageHeight * 0.32;
    pdf.text((doc.titlePage.title || 'UNTITLED SCRIPT').toUpperCase(), pageWidth / 2, titleY, {
      align: 'center',
    });

    let currentMetaY = titleY + 36;
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(12);

    // Written by
    if (doc.titlePage.author) {
      pdf.text('written by', pageWidth / 2, currentMetaY, { align: 'center' });
      currentMetaY += 24;
      pdf.setFont('courier', 'bold');
      pdf.setFontSize(14);
      pdf.text(doc.titlePage.author, pageWidth / 2, currentMetaY, { align: 'center' });
      currentMetaY += 30;
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(12);
    }

    // Screenplay by
    if (doc.titlePage.screenplayBy) {
      pdf.text('screenplay by', pageWidth / 2, currentMetaY, { align: 'center' });
      currentMetaY += 20;
      pdf.setFont('courier', 'bold');
      pdf.text(doc.titlePage.screenplayBy, pageWidth / 2, currentMetaY, { align: 'center' });
      currentMetaY += 28;
      pdf.setFont('courier', 'normal');
    }

    // Story by
    if (doc.titlePage.storyBy) {
      pdf.text('story by', pageWidth / 2, currentMetaY, { align: 'center' });
      currentMetaY += 20;
      pdf.setFont('courier', 'bold');
      pdf.text(doc.titlePage.storyBy, pageWidth / 2, currentMetaY, { align: 'center' });
      currentMetaY += 28;
      pdf.setFont('courier', 'normal');
    }

    // Based on
    if (doc.titlePage.basedOn && doc.titlePage.basedOn.trim() !== '') {
      pdf.text('based upon', pageWidth / 2, currentMetaY, { align: 'center' });
      currentMetaY += 20;
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(11);
      pdf.text(doc.titlePage.basedOn, pageWidth / 2, currentMetaY, { align: 'center' });
      currentMetaY += 28;
      pdf.setFontSize(12);
    }

    // Additional credits
    if (doc.titlePage.additionalCredits) {
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(10);
      pdf.text(doc.titlePage.additionalCredits, pageWidth / 2, currentMetaY, { align: 'center' });
      currentMetaY += 24;
    }

    // Custom notes in center-bottom
    if (doc.titlePage.customNotes) {
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(10);
      pdf.text(doc.titlePage.customNotes, pageWidth / 2, pageHeight - 1.8 * INCH, { align: 'center' });
    }

    // Contact & Copyright Information Bottom Left / Right
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(10);
    const bottomY = pageHeight - 1.2 * INCH;

    if (doc.titlePage.contact) {
      const contactLines = doc.titlePage.contact.split('\n');
      let cy = bottomY;
      contactLines.forEach((line) => {
        pdf.text(line, 1.5 * INCH, cy);
        cy += 14;
      });
    }

    if (doc.titlePage.draftDate || doc.titlePage.copyright) {
      let ry = bottomY;
      if (doc.titlePage.draftDate) {
        pdf.text(`Draft: ${doc.titlePage.draftDate}`, pageWidth - 1.2 * INCH, ry, { align: 'right' });
        ry += 14;
      }
      if (doc.titlePage.copyright) {
        const copyLines = doc.titlePage.copyright.split('\n');
        copyLines.forEach((cline) => {
          pdf.text(cline, pageWidth - 1.2 * INCH, ry, { align: 'right' });
          ry += 14;
        });
      }
    }

    isFirstPageInPdf = false;
  }

  // Token replacement helper for headers & footers
  const evalTokens = (templateStr: string, pageNum: number, pageChunk: PageChunk): string => {
    if (!templateStr) return '';
    const now = new Date();
    const dateStr = doc.titlePage.draftDate || now.toLocaleDateString();
    const pageLabel = doc.lockedPages ? pageChunk.pageLabel : String(pageNum);

    return templateStr
      .replace(/{PAGE}/gi, pageLabel)
      .replace(/{PAGES}/gi, String(allPages.length))
      .replace(/{TITLE}/gi, doc.titlePage.title || 'UNTITLED')
      .replace(/{DATE}/gi, dateStr)
      .replace(/{REVISION}/gi, `${doc.currentRevision} Draft`)
      .replace(/{SCENE}/gi, 'Scene')
      .replace(/{ACT}/gi, 'ACT I')
      .replace(/{LABEL}/gi, doc.headerFooterConfig?.customLabel || opts.headerText || '');
  };

  // Standard Screenplay Courier Font Size & Metrics
  const fontSize = 12;
  const lineHeight = 12 * 1.05; // 12pt line spacing (6 lines per inch standard)

  // 2. Render Screenplay Body Pages
  for (let pageIdx = 0; pageIdx < allPages.length; pageIdx++) {
    const pageNum = pageIdx + 1;

    // Check if included in page range
    if (!targetPages.includes(pageNum)) continue;

    const pageChunk = allPages[pageIdx];

    // Check if this page contains revisions for revised-only mode
    const hasRevisions=pageChunk.revisionSetIds?.some(id=>!opts.revisionSetId||id===opts.revisionSetId)||pageChunk.fragments.some(fr=>revisedFragment(doc,fr,opts.revisionSetId));
    if (opts.revisedPagesOnly && !hasRevisions) {
      continue;
    }

    if (!isFirstPageInPdf) {
      pdf.addPage();
    }
    isFirstPageInPdf = false;

    // Determine revision tier on this page for colored page background/borders
    const pageRevisionTier = pageChunk.paragraphs.find((p) => p.revision)?.revision || (doc.currentRevision as string);
    drawPageBackground(pageRevisionTier);
    drawWatermark();

    // Colored production border for revised page
    if (opts.coloredRevisionPages && pageRevisionTier && pageRevisionTier !== 'white') {
      const col = REVISION_SET_COLORS[pageRevisionTier.toLowerCase()] || [59, 130, 246];
      pdf.setDrawColor(col[0], col[1], col[2]);
      pdf.setLineWidth(3);
      pdf.rect(18, 18, pageWidth - 36, pageHeight - 36);
    }

    // Structure Lines (Final Draft Structure Lines along left margin)
    if (opts.structureLines) {
      pdf.setDrawColor(palette.dim[0], palette.dim[1], palette.dim[2]);
      pdf.setLineWidth(0.5);
      pdf.line(1.3 * INCH, 1.0 * INCH, 1.3 * INCH, pageHeight - 1.0 * INCH);
    }

    // Header and Page Number
    const hfConfig = doc.headerFooterConfig;
    const showHeaderThisPage =
      hfConfig?.showHeader !== undefined
        ? hfConfig.showHeader && (pageNum > 1 || hfConfig.firstPageHasHeader)
        : opts.showHeaders && pageNum > 1;

    if (showHeaderThisPage) {
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(palette.dim[0], palette.dim[1], palette.dim[2]);

      if (hfConfig?.header) {
        // Left Header
        const leftH = evalTokens(hfConfig.header.left, pageNum, pageChunk);
        if (leftH) pdf.text(leftH, 1.5 * INCH, 0.6 * INCH);

        // Center Header
        const centerH = evalTokens(hfConfig.header.center, pageNum, pageChunk);
        if (centerH) pdf.text(centerH, pageWidth / 2, 0.6 * INCH, { align: 'center' });

        // Right Header (Default: Page Number)
        const rightH = evalTokens(hfConfig.header.right || '{PAGE}.', pageNum, pageChunk);
        if (rightH) pdf.text(rightH, pageWidth - 1.0 * INCH, 0.6 * INCH, { align: 'right' });
      } else {
        // Standard Fallback Header Text (top left)
        if (opts.showHeaders && opts.headerText) {
          pdf.text(opts.headerText, 1.5 * INCH, 0.6 * INCH);
        }

        // Page Number (top right with period, e.g. "2." or "14A.")
        const pageLabel = doc.lockedPages ? `${pageChunk.pageLabel}.` : `${pageNum}.`;
        pdf.text(pageLabel, pageWidth - 1.0 * INCH, 0.6 * INCH, { align: 'right' });
      }
    }

    // Footer Text
    const showFooterThisPage =
      hfConfig?.showFooter !== undefined
        ? hfConfig.showFooter && (pageNum > 1 || hfConfig.firstPageHasFooter)
        : opts.showFooters;

    if (showFooterThisPage) {
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(palette.dim[0], palette.dim[1], palette.dim[2]);

      if (hfConfig?.footer) {
        const leftF = evalTokens(hfConfig.footer.left, pageNum, pageChunk);
        if (leftF) pdf.text(leftF, 1.5 * INCH, pageHeight - 0.5 * INCH);

        const centerF = evalTokens(hfConfig.footer.center, pageNum, pageChunk);
        if (centerF) pdf.text(centerF, pageWidth / 2, pageHeight - 0.5 * INCH, { align: 'center' });

        const rightF = evalTokens(hfConfig.footer.right, pageNum, pageChunk);
        if (rightF) pdf.text(rightF, pageWidth - 1.0 * INCH, pageHeight - 0.5 * INCH, { align: 'right' });
      } else if (opts.showFooters && opts.footerText) {
        pdf.text(opts.footerText, pageWidth / 2, pageHeight - 0.5 * INCH, { align: 'center' });
      }
    }

    const f=doc.writingFormat||DEFAULT_LAYOUT_FORMAT;
    for(const label of pageChunk.labels){pdf.setFont('courier','normal');pdf.setFontSize(12);const x=f.page.left*72+label.x+(label.align==='right'?label.width:label.align==='center'?label.width/2:0);pdf.text(label.text,x,f.page.top*72+label.y+10,{align:label.align});}
    for(const fr of pageChunk.fragments){
      const p=doc.paragraphs.find(p=>p.id===fr.paragraphId)!,st=fr.style,left=f.page.left*72+fr.x,top=f.page.top*72+fr.y;
      if(fr.imageHeight){const image=p.images?.find(i=>i.id===fr.imageId),asset=doc.studio?.assets.find(a=>a.id===image?.assetId);if(image&&asset)pdf.addImage(asset.data,asset.mime==='image/jpeg'?'JPEG':'PNG',left+(image.align==='right'?fr.width-image.width:image.align==='center'?(fr.width-image.width)/2:0),top,image.width,fr.imageHeight);continue;}
      const family=/Courier|Mono/i.test(st.font)?'courier':/Arial|Inter|Helvetica/i.test(st.font)?'helvetica':'times';pdf.setFont(family,st.bold&&st.italic?'bolditalic':st.bold?'bold':st.italic?'italic':'normal');pdf.setFontSize(st.size);pdf.setTextColor(...palette.text);
      for(let n=0;n<fr.lines.length;n++){const line=fr.lines[n],x=left+(st.align==='right'?fr.width:st.align==='center'?fr.width/2:line.first?st.first*72:0),y=top+n*st.line+st.size*.85;pdf.text(st.caps?line.text.toUpperCase():line.text,x,y,{align:st.align==='right'?'right':st.align==='center'?'center':'left'});if(st.underline)pdf.line(x,y+1,x+line.width,y+1);if(opts.showRevisionMarks&&(p.revisionMarks?.some(m=>(!opts.revisionSetId||m.setId===opts.revisionSetId)&&m.start<line.end&&m.end>line.start)||!opts.revisionSetId&&p.revised&&!p.revisionMarks?.length))pdf.text('*',pageWidth-.7*72,y);}
      if(fr.start===0&&p.type==='Scene Heading'&&p.sceneNumber&&opts.sceneNumberPlacement!=='none'){pdf.setFontSize(10);if(opts.sceneNumberPlacement==='left'||opts.sceneNumberPlacement==='both')pdf.text(p.sceneNumber,(f.page.left-.45)*72,top+st.size);if((opts.sceneNumberPlacement==='right'||opts.sceneNumberPlacement==='both')&&!hideRightSceneNumber(opts.autoHideRightSceneNumbers??doc.autoHideRightSceneNumbers,fr,p.sceneNumber,(f.page.width-f.page.left-f.page.right)*72))pdf.text(p.sceneNumber,(f.page.width-f.page.right+.2)*72,top+st.size);}
    }

  }

  return pdf;
}

/**
 * Downloads the generated PDF with given filename.
 */
export function downloadScriptPdf(
  doc: ScriptDocument,
  filename = 'Screenplay.pdf',
  options: Partial<PdfExportOptions> = {}
): void {
  const pdf = generateScreenplayPdf(doc, options);
  pdf.save(filename);
}

/**
 * Returns data URL string of PDF for inline preview or iframe rendering.
 */
export function getScriptPdfDataUrl(
  doc: ScriptDocument,
  options: Partial<PdfExportOptions> = {}
): string {
  const pdf = generateScreenplayPdf(doc, options);
  return pdf.output('datauristring');
}

/**
 * Returns Blob of generated PDF.
 */
export function getScriptPdfBlob(
  doc: ScriptDocument,
  options: Partial<PdfExportOptions> = {}
): Blob {
  const pdf = generateScreenplayPdf(doc, options);
  return pdf.output('blob');
}
