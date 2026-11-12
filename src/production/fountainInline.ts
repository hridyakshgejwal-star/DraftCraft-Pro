import type {InlineStyle, Paragraph, TextRun} from '../types/script';

/** Fountain emphasis is line-local; escaped markers remain literal text. */
export function parseFountainInline(source: string): {text: string; runs?: TextRun[]} {
  const runs: TextRun[] = [];
  const append = (text: string, style: InlineStyle) => {
    if (!text) return;
    const last = runs.at(-1);
    if (last && JSON.stringify(last.style || {}) === JSON.stringify(style)) last.text += text;
    else runs.push({text, ...(Object.keys(style).length ? {style} : {})});
  };
  const parse = (line: string, style: InlineStyle = {}, depth = 0) => {
    for (let i = 0; i < line.length;) {
      if (line[i] === '\\' && /[\\*_]/.test(line[i + 1] || '')) { append(line[i + 1], style); i += 2; continue; }
      const delimiter = ['***', '**', '*', '_'].find(d => line.startsWith(d, i));
      if (delimiter && depth < 12 && line[i + delimiter.length] && !/\s/.test(line[i + delimiter.length])) {
        let end = i + delimiter.length;
        while ((end = line.indexOf(delimiter, end)) >= 0) {
          let slashes = 0; for (let j = end - 1; j >= 0 && line[j] === '\\'; j--) slashes++;
          if (!(slashes % 2) && end > i + delimiter.length && !/\s/.test(line[end - 1])) break;
          end += delimiter.length;
        }
        if (end >= 0) {
          const patch: InlineStyle = delimiter === '_' ? {underline: true} : delimiter === '*' ? {italic: true} : delimiter === '**' ? {bold: true} : {bold: true, italic: true};
          parse(line.slice(i + delimiter.length, end), {...style, ...patch}, depth + 1); i = end + delimiter.length; continue;
        }
      }
      append(line[i++], style);
    }
  };
  source.split('\n').forEach((line, i) => { if (i) append('\n', {}); parse(line); });
  return {text: runs.map(r => r.text).join(''), ...(runs.some(r => r.style && Object.keys(r.style).length) ? {runs} : {})};
}

export function fountainText(p: Paragraph): string {
  const escape = (text: string) => text.replace(/[\\*_]/g, c => '\\' + c);
  if (!p.runs?.length || p.runs.map(r => r.text).join('') !== p.text) return escape(p.text);
  return p.runs.map(run => run.text.split('\n').map(line => {
    const parts = line.match(/^(\s*)(.*?)(\s*)$/u)!;
    let content = escape(parts[2]); if (!content) return escape(line);
    const style = run.style;
    if (style?.bold && style.italic) content = '***' + content + '***';
    else if (style?.bold) content = '**' + content + '**';
    else if (style?.italic) content = '*' + content + '*';
    if (style?.underline) content = '_' + content + '_';
    return parts[1] + content + parts[3];
  }).join('\n')).join('');
}
