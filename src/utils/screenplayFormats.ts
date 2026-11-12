import {productionScenes} from '../production/queries';
import {printHtml} from '../production/print';
import {formatHtml,formatRtf} from '../formats/interchange';
import { ScriptDocument, Paragraph, ElementType, TitlePage, RevisionTier } from '../types/script';
import { exportToFdx, parseFdx } from './fdxCodec';
import { exportToFountain, parseFountain } from './fountainCodec';
import { paginateScript } from './pagination';

export type ScreenplayFileFormat =
  | 'fdx'
  | 'fdxt'
  | 'fdproject'
  | 'rtf'
  | 'txt'
  | 'txt_layout'
  | 'html'
  | 'scheduling_sex'
  | 'avid_script'
  | 'tab_dialogue'
  | 'fountain'
  | 'markdown';

export interface FormatTemplatePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  targetPages: number;
  initialDocument: Partial<ScriptDocument>;
}

export const FDXT_TEMPLATES: FormatTemplatePreset[] = [
  {
    id: 'feature_film_standard',
    name: 'Feature Film (Standard Studio)',
    category: 'Film',
    description: 'Industry-standard 110-page spec script format with standard 1.5" left margin and Courier 12pt.',
    targetPages: 110,
    initialDocument: {
      titlePage: {
        title: 'UNTITLED FEATURE',
        author: 'Written by Screenwriter',
        basedOn: '',
        draftDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        contact: 'Representation / Phone / Email',
        copyright: 'All Rights Reserved. Registered WGA.',
      },
      paragraphs: [
        { id: 't-1', type: 'Scene Heading', text: 'EXT. CITY SKYLINE - DAWN', sceneNumber: '1' },
        { id: 't-2', type: 'Action', text: 'A dense morning mist rolls over the glass towers. Silence, broken only by the distant hum of traffic.' },
        { id: 't-3', type: 'Scene Heading', text: 'INT. COFFEE SHOP - CONTINUOUS', sceneNumber: '2' },
        { id: 't-4', type: 'Action', text: 'LEO (30s, rumpled suit) stares into an empty mug, pen poised over an untouched notebook.' },
        { id: 't-5', type: 'Character', text: 'LEO' },
        { id: 't-6', type: 'Dialogue', text: 'Timing is everything.' },
      ],
    },
  },
  {
    id: 'tv_drama_60min',
    name: 'TV Drama (1-Hour Episodic)',
    category: 'Television',
    description: 'Structured 5-act episodic drama template with TEASER, ACT ONE through ACT FIVE, and TAG.',
    targetPages: 58,
    initialDocument: {
      titlePage: {
        title: 'SERIES TITLE - "PILOT"',
        author: 'Created by Writer',
        basedOn: 'Original One-Hour Television Drama',
        draftDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        contact: 'Production Co / Studio',
        copyright: 'Copyright Protected.',
      },
      paragraphs: [
        { id: 'tv-1', type: 'Transition', text: 'TEASER' },
        { id: 'tv-2', type: 'Scene Heading', text: 'INT. PRECINCT BULLPEN - NIGHT', sceneNumber: '1' },
        { id: 'tv-3', type: 'Action', text: 'Fluorescent lights buzz. DETECTIVE SARAH CHEN (40s) pins a surveillance photograph to the cork board.' },
        { id: 'tv-4', type: 'Character', text: 'CHEN' },
        { id: 'tv-5', type: 'Dialogue', text: 'He was never in the building.' },
        { id: 'tv-6', type: 'Transition', text: 'END OF TEASER' },
        { id: 'tv-7', type: 'Transition', text: 'ACT ONE' },
      ],
    },
  },
  {
    id: 'tv_sitcom_multicam',
    name: 'Multi-Camera Sitcom (30-Minute)',
    category: 'Television',
    description: 'Double-spaced dialogue, all-caps character cues, and scene identifiers designed for tape production.',
    targetPages: 35,
    initialDocument: {
      titlePage: {
        title: 'SITCOM TITLE - "THE ACCIDENTAL PROPOSAL"',
        author: 'Written by Writers Room',
        basedOn: 'Original Half-Hour Comedy',
        draftDate: new Date().toLocaleDateString(),
        contact: 'Network Development',
        copyright: 'All Rights Reserved.',
      },
      paragraphs: [
        { id: 'com-1', type: 'Transition', text: 'SCENE A' },
        { id: 'com-2', type: 'Scene Heading', text: 'INT. LIVING ROOM - DAY (DAY 1)', sceneNumber: 'A' },
        { id: 'com-3', type: 'Action', text: '(MARCUS, CHLOE) MARCUS BURSTS THROUGH THE FRONT DOOR HOLDING AN ODDLY SHAPED PINEAPPLE.' },
        { id: 'com-4', type: 'Character', text: 'MARCUS' },
        { id: 'com-5', type: 'Dialogue', text: 'You will never guess what the bodega just started selling.' },
      ],
    },
  },
  {
    id: 'stage_play_standard',
    name: 'Stage Play (Theatrical Standard)',
    category: 'Theatre',
    description: 'Dramatists Guild compliant format with centered character names and underlined stage directions.',
    targetPages: 90,
    initialDocument: {
      titlePage: {
        title: 'THE SHADOW ARCH',
        author: 'A Play by Playwright',
        basedOn: 'Stage Play in Two Acts',
        draftDate: new Date().toLocaleDateString(),
        contact: 'Literary Agent',
        copyright: 'Licensed Performance Only.',
      },
      paragraphs: [
        { id: 'st-1', type: 'Transition', text: 'ACT I' },
        { id: 'st-2', type: 'Scene Heading', text: 'SCENE 1: A PARLOR IN AUTUMN', sceneNumber: '1' },
        { id: 'st-3', type: 'Action', text: 'AT RISE: Two mismatched armchairs flank a darkened hearth. Wind howls off-stage.' },
        { id: 'st-4', type: 'Character', text: 'HELEN' },
        { id: 'st-5', type: 'Dialogue', text: 'Leave the lantern lit. We have visitors coming.' },
      ],
    },
  },
];

/**
 * Native Project format (.fdproject JSON)
 */
export function exportToNativeProject(doc: ScriptDocument): string {
  const payload = {
    schemaVersion: '1.2.0',
    app: 'Final Draft 13 Pro Studio',
    exportedAt: new Date().toISOString(),
    document: doc,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseNativeProject(jsonText: string): ScriptDocument | null {
  try {
    const data = JSON.parse(jsonText);
    if (data.document && data.document.paragraphs) {
      return data.document as ScriptDocument;
    }
    if (data.paragraphs) {
      return data as ScriptDocument;
    }
  } catch (err) {
    console.error('Failed to parse native project json:', err);
  }
  return null;
}

/**
 * Rich Text Format (.rtf) Export
 */
export function exportToRtf(doc: ScriptDocument): string {
  if(doc.writingFormat)return formatRtf(doc);
  // Standard RTF header with Courier font
  let rtf = '{\\rtf1\\ansi\\deff0\\deflang1033\n';
  rtf += '{\\fonttbl{\\f0\\fmodern\\fprq1\\fcharset0 Courier New;}}\n';
  rtf += '{\\colortbl ;\\red0\\green0\\blue0;\\red120\\green120\\blue120;\\red220\\green38\\blue38;}\n';
  rtf += '\\f0\\fs24\\margl2160\\margr1440\\margt1440\\margb1440\n';

  // Title Page
  rtf += '\\qc\\b\\fs32 ' + escapeRtf(doc.titlePage.title || 'UNTITLED') + '\\b0\\fs24\\par\\par\n';
  rtf += '\\qc written by\\par\\b ' + escapeRtf(doc.titlePage.author || '') + '\\b0\\par\\par\n';
  if (doc.titlePage.basedOn) {
    rtf += '\\qc Based on: ' + escapeRtf(doc.titlePage.basedOn) + '\\par\\par\n';
  }
  rtf += '\\page\n';

  // Paragraph elements with proper indentations in twips (1 inch = 1440 twips)
  // Scene Heading: 0 twip indent from left margin (1.5" = 2160 twips base)
  for (const p of doc.paragraphs) {
    let indentTwips = 0;
    let rightIndentTwips = 0;
    let isBold = false;
    let text = p.text;

    switch (p.type) {
      case 'Scene Heading':
        indentTwips = 0;
        isBold = true;
        text = text.toUpperCase();
        if (p.sceneNumber) {
          text = `${p.sceneNumber}  ${text}  ${p.sceneNumber}`;
        }
        break;
      case 'Action':
        indentTwips = 0;
        break;
      case 'Character':
        indentTwips = 3168; // 2.2 inches relative
        isBold = true;
        text = text.toUpperCase();
        break;
      case 'Parenthetical':
        indentTwips = 2304; // 1.6 inches relative
        rightIndentTwips = 3000;
        if (!text.startsWith('(')) text = `(${text})`;
        break;
      case 'Dialogue':
        indentTwips = 1440; // 1.0 inch relative
        rightIndentTwips = 2160;
        break;
      case 'Transition':
        indentTwips = 5760; // 4.0 inches relative
        isBold = true;
        text = text.toUpperCase();
        break;
      case 'Shot':
        indentTwips = 0;
        isBold = true;
        text = text.toUpperCase();
        break;
      default:
        indentTwips = 0;
    }

    const boldCode = isBold ? '\\b ' : '';
    const boldEnd = isBold ? '\\b0 ' : '';
    const revisedMark = p.revised ? ' *' : '';

    rtf += `\\ql\\li${indentTwips}\\ri${rightIndentTwips} ${boldCode}${escapeRtf(text)}${revisedMark}${boldEnd}\\par\n`;

    if (p.type === 'Scene Heading' || p.type === 'Dialogue' || p.type === 'Transition') {
      rtf += '\\par\n';
    }
  }

  rtf += '}\n';
  return rtf;
}

function escapeRtf(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\n/g, '\\par ');
}

/**
 * Text with Layout (.txt with exact 10cpi columns)
 */
export function exportToTextWithLayout(doc: ScriptDocument): string {
  let output = '';

  // Title block
  output += '\n\n\n';
  output += padCenter(doc.titlePage.title.toUpperCase(), 75) + '\n';
  output += padCenter('written by', 75) + '\n';
  output += padCenter(doc.titlePage.author, 75) + '\n';
  if (doc.titlePage.basedOn) {
    output += padCenter('Based on: ' + doc.titlePage.basedOn, 75) + '\n';
  }
  output += '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n';
  output += '===========================================================================\n\n';

  for (const p of doc.paragraphs) {
    let text = p.text;
    const rev = p.revised ? ' *' : '';

    switch (p.type) {
      case 'Scene Heading': {
        const num = p.sceneNumber ? `${p.sceneNumber}  ` : '';
        const rightNum = p.sceneNumber ? `  ${p.sceneNumber}` : '';
        const line = `${num}${text.toUpperCase()}${rightNum}${rev}`;
        output += `\n${line}\n\n`;
        break;
      }
      case 'Character':
        output += `\n${padLeft(text.toUpperCase(), 37)}${rev}\n`;
        break;
      case 'Parenthetical': {
        let paren = text;
        if (!paren.startsWith('(')) paren = `(${paren})`;
        output += `${padLeft(paren, 31)}${rev}\n`;
        break;
      }
      case 'Dialogue': {
        // wrap dialogue at 35 chars
        const wrapped = wrapText(text, 35);
        for (const line of wrapped) {
          output += `${padLeft(line, 25)}${rev}\n`;
        }
        output += '\n';
        break;
      }
      case 'Transition':
        output += `\n${padLeft(text.toUpperCase(), 55)}${rev}\n\n`;
        break;
      case 'Action':
      default: {
        const wrapped = wrapText(text, 60);
        for (const line of wrapped) {
          output += `${padLeft(line, 15)}${rev}\n`;
        }
        output += '\n';
        break;
      }
    }
  }

  return output;
}

function padLeft(s: string, col: number): string {
  return ' '.repeat(col) + s;
}

function padCenter(s: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - s.length) / 2));
  return ' '.repeat(pad) + s;
}

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';

  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxLen) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : [''];
}

/**
 * Plain Text (.txt) export
 */
export function exportToPlainText(doc: ScriptDocument): string {
  if(doc.writingFormat?.kind==='prose')return doc.paragraphs.map(p=>p.text).join('\n\n');
  return doc.paragraphs
    .map((p) => {
      if (p.type === 'Scene Heading') return `\n${p.text.toUpperCase()}\n`;
      if (p.type === 'Character') return `\n\t\t${p.text.toUpperCase()}`;
      if (p.type === 'Parenthetical') return `\t\t\t(${p.text.replace(/^\(|\)$/g, '')})`;
      if (p.type === 'Dialogue') return `\t${p.text}`;
      if (p.type === 'Transition') return `\n\t\t\t\t${p.text.toUpperCase()}\n`;
      return p.text;
    })
    .join('\n');
}

/**
 * Standalone HTML Screenplay (.html)
 */
export function exportToHtml(doc:ScriptDocument):string{return printHtml(doc);}

export function exportToSchedulingSex(doc:ScriptDocument):string {const scenes=productionScenes(doc);return '<?xml version="1.0" encoding="UTF-8"?>\n<FinalDraftSchedulingExport Version="1.0">\n<Project Title="'+escapeXml(doc.titlePage.title)+'" Author="'+escapeXml(doc.titlePage.author)+'">\n'+scenes.map(s=>{const prefix=s.heading.match(/^(INT\.?\s*\/\s*EXT\.?|INT\/EXT\.?|I\/E\.|INT\.|EXT\.)/i)?.[1]?.replaceAll('.','')||'',time=s.heading.match(/[-–—]\s*(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|CONTINUOUS|LATER)\s*$/i)?.[1]||'';return '<Scene Number="'+escapeXml(s.number)+'" IntExt="'+escapeXml(prefix)+'" DayNight="'+escapeXml(time)+'" LengthEighths="'+s.eighths+'"><Heading>'+escapeXml(s.heading)+'</Heading><Characters>'+s.characters.map(c=>'<Character Name="'+escapeXml(c)+'" />').join('')+'</Characters><Elements>'+s.tags.map(t=>'<Element Category="Production" Description="'+escapeXml(t)+'" />').join('')+'</Elements></Scene>';}).join('\n')+'\n</Project>\n</FinalDraftSchedulingExport>\n';}

/**
 * Avid Script-Based Editing Text export (Avid Media Composer ScriptSync format)
 */
export function exportToAvidScript(doc: ScriptDocument): string {
  let output = `# Avid Media Composer ScriptSync Dialogue Export\n`;
  output += `# Title: ${doc.titlePage.title}\n`;
  output += `# Author: ${doc.titlePage.author}\n\n`;

  let sceneNum = '1';
  let lineCounter = 1;

  for (const p of doc.paragraphs) {
    if (p.type === 'Scene Heading') {
      sceneNum = p.sceneNumber || sceneNum;
      output += `\n>> SCENE ${sceneNum}: ${p.text.toUpperCase()}\n`;
    } else if (p.type === 'Character') {
      output += `[LINE ${String(lineCounter++).padStart(4, '0')}] ${p.text.toUpperCase()}:\n`;
    } else if (p.type === 'Dialogue') {
      output += `    ${p.text}\n`;
    } else if (p.type === 'Parenthetical') {
      output += `    (${p.text.replace(/^\(|\)$/g, '')})\n`;
    }
  }

  return output;
}

/**
 * Tab-Delimited Dialogue Export (.tsv / .csv)
 */
export function exportToTabDelimitedDialogue(doc: ScriptDocument, format: 'tsv' | 'csv' = 'tsv'): string {
  const sep = format === 'tsv' ? '\t' : ',';
  const quote = (val: string) => {
    if (format === 'csv') {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val.replace(/\t/g, ' ');
  };

  const headers = ['Scene Number', 'Scene Heading', 'Character', 'Parenthetical', 'Dialogue', 'Word Count'];
  let rows = [headers.join(sep)];

  let currentSceneNum = '1';
  let currentSceneHeading = '';
  let lastCharacter = '';
  let lastParenthetical = '';

  for (let i = 0; i < doc.paragraphs.length; i++) {
    const p = doc.paragraphs[i];
    if (p.type === 'Scene Heading') {
      currentSceneNum = p.sceneNumber || String(parseInt(currentSceneNum, 10) + 1);
      currentSceneHeading = p.text;
      lastCharacter = '';
      lastParenthetical = '';
    } else if (p.type === 'Character') {
      lastCharacter = p.text.replace(/\s*\(.*\)/, '').trim();
      lastParenthetical = '';
    } else if (p.type === 'Parenthetical') {
      lastParenthetical = p.text.replace(/^\(|\)$/g, '').trim();
    } else if (p.type === 'Dialogue' || p.type === 'Dual Dialogue') {
      const words = p.text.split(/\s+/).filter(Boolean).length;
      rows.push(
        [
          quote(currentSceneNum),
          quote(currentSceneHeading),
          quote(lastCharacter || 'UNKNOWN'),
          quote(lastParenthetical),
          quote(p.text),
          String(words),
        ].join(sep)
      );
    }
  }

  return rows.join('\n');
}

/**
 * Markdown (.md) Export
 */
export function exportToMarkdown(doc: ScriptDocument): string {
  let md = `# ${doc.titlePage.title || 'Untitled Screenplay'}\n\n`;
  md += `**Author:** ${doc.titlePage.author || 'Unknown'}\n\n`;
  if (doc.titlePage.basedOn) md += `*Based on:* ${doc.titlePage.basedOn}\n\n`;
  md += `---\n\n`;

  for (const p of doc.paragraphs) {
    switch (p.type) {
      case 'Scene Heading':
        md += `### ${p.sceneNumber ? `[${p.sceneNumber}] ` : ''}${p.text.toUpperCase()}\n\n`;
        break;
      case 'Character':
        md += `**${p.text.toUpperCase()}**\n`;
        break;
      case 'Parenthetical':
        md += `*(${p.text.replace(/^\(|\)$/g, '')})*\n`;
        break;
      case 'Dialogue':
        md += `> ${p.text}\n\n`;
        break;
      case 'Transition':
        md += `_${p.text.toUpperCase()}_\n\n`;
        break;
      case 'Shot':
        md += `#### ${p.text.toUpperCase()}\n\n`;
        break;
      case 'Action':
      default:
        md += `${p.text}\n\n`;
        break;
    }
  }

  return md;
}

function escapeXml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Download helper for any format
 */
export function downloadFileContent(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
