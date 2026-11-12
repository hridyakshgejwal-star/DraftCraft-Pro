import React, {useMemo, useRef, useState} from 'react';
import type {ScriptDocument} from '../types/script';
import {characterSides, portableCharacterSides} from './sides';
import {downloadText} from './ProductionPanel';

export function CharacterSidesPanel({doc}: {doc: ScriptDocument}) {
  const [selected, setSelected] = useState<string[]>([]), [nonSpeaking, setNonSpeaking] = useState(true);
  const [html, setHtml] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const iframe = useRef<HTMLIFrameElement>(null), pendingPrint = useRef(false);
  const sides = useMemo(() => selected.length ? characterSides(doc, selected, nonSpeaking) : null, [doc, selected, nonSpeaking]);
  const run = async (operation: () => Promise<void>) => { setBusy(true); setError(''); try { await operation(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const print = (mode: 'save' | 'print') => run(async () => {
    if (!sides) return;
    const content = await portableCharacterSides(doc, sides), f = doc.writingFormat;
    if (window.draftcraftDesktop?.productionPrint) {
      const result = await window.draftcraftDesktop.productionPrint({mode, html: content, width: f?.page.width || 8.5, height: f?.page.height || 11, name: doc.titlePage.title + ' — ' + sides.names.join(', ') + ' — Sides'});
      if (result.saved) setError('Sides saved: ' + result.location);
    } else if(iframe.current&&html===content){await iframe.current.contentDocument?.fonts.ready;iframe.current.contentWindow?.print();}else{pendingPrint.current=true;setHtml(content);}
  });
  return <section aria-label="Character sides">
    <h3 className="text-base font-semibold">Character sides</h3>
    <p className="my-3">Export complete scenes for the selected cast. Original page labels, scene numbers, dual dialogue, selected takes and image positions are retained. Other scenes on a shared page leave blank space.</p>
    <div className="flex flex-wrap gap-4 my-4">{(doc.characterMemory || []).map(c => <label key={c.id} className="flex gap-2"><input type="checkbox" aria-label={'Sides for ' + c.name} checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))}/>{c.name}</label>)}</div>
    {!doc.characterMemory?.length && <p>No characters have been recorded in this script.</p>}
    <label className="flex gap-2"><input aria-label="Include non-speaking sides" type="checkbox" checked={nonSpeaking} onChange={e => setNonSpeaking(e.target.checked)}/>Include explicit non-speaking scene membership</label>
    <p className="my-3" role="status">{sides ? `${sides.sceneIds.length} scenes · pages ${sides.pageLabels.join(', ') || 'none'}` : 'Choose one or more characters.'}</p>
    <div className="flex gap-3 my-4 flex-wrap">
      <button disabled={busy || !sides?.pageLabels.length} onClick={() => run(async () => { if (sides) setHtml(await portableCharacterSides(doc, sides)); })}>Preview Sides</button>
      <button disabled={busy || !sides?.pageLabels.length} onClick={() => print('save')}>{window.draftcraftDesktop?.productionPrint ? 'Export Sides PDF' : 'Print / Save Sides PDF'}</button>
      <button disabled={busy || !sides?.pageLabels.length} onClick={() => print('print')}>Print Sides</button>
      <button disabled={!sides?.pageLabels.length} onClick={() => sides && downloadText('Character-Sides.txt', sides.text, 'text/plain')}>Export Sides Text</button>
      <button disabled={busy || !sides?.pageLabels.length} onClick={() => run(async () => { if (sides) downloadText('Character-Sides.html', await portableCharacterSides(doc, sides), 'text/html'); })}>Export Sides HTML</button>
    </div>
    {error && <p role="status">{error}</p>}
    {html && <iframe ref={iframe} onLoad={async()=>{if(!pendingPrint.current)return;pendingPrint.current=false;await iframe.current?.contentDocument?.fonts.ready;iframe.current?.contentWindow?.print();}} title="Character sides print preview" sandbox="allow-same-origin allow-modals" srcDoc={html} style={{width: '100%', height: 500, background: '#ddd', border: '1px solid #888'}}/>}
  </section>;
}
