// Final Draft-style window toolbar: a title row (native traffic lights on macOS) and a customizable row of commands
// shown as icon and label, icon only or label only. Items that do not fit move into an overflow menu.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ElementType } from '../types/script';
import { ICONS } from './icons';
import { DEFAULT_TOOLBAR_ITEMS, type ToolbarDisplay, type ToolbarGroupId, type ToolbarPreferences } from './preferences';
import { GROUP_NAMES, ITEM_BY_ID, MENU_ENTRIES, TOOLBAR_ITEMS, entryLabel, type ToolbarGroup, type ToolbarItem } from './commands';

export interface ToolbarState {
  element?: ElementType; elements: ElementType[]; elementShortcuts?: Partial<Record<ElementType, string>>;
  active: Record<string, boolean | undefined>; disabled: Record<string, boolean | undefined>;
}
interface ToolbarProps {
  prefs: ToolbarPreferences; onPrefs: (prefs: ToolbarPreferences) => void; state: ToolbarState;
  onCommand: (id: string) => void; onElement: (type: ElementType) => void;
  customizing: boolean; onCustomizing: (open: boolean) => void;
}
const Icon = ({ name, size = 18 }: { name: string; size?: number }) => { const C = ICONS[name] || ICONS.Square; return <C size={size} strokeWidth={1.6} aria-hidden={true} />; };
// Keep the caret in the screenplay when a toolbar button is clicked.
const keepFocus = (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('select')) e.preventDefault(); };

export function Toolbar({ prefs, onPrefs, state, onCommand, onElement, customizing, onCustomizing }: ToolbarProps) {
  const row = useRef<HTMLDivElement>(null), measure = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<number>(Infinity);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number; entries: string[] } | null>(null);
  const [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const items = useMemo(() => visibleItems(prefs), [prefs.items, prefs.hiddenGroups]);
  // Measure every item's natural width once per arrangement/size and keep as many as fit, in order.
  useLayoutEffect(() => {
    const host = row.current, probe = measure.current; if (!host || !probe) return;
    const compute = () => {
      const widths = [...probe.children].map(c => (c as HTMLElement).dataset.kind === 'flex' ? 0 : (c as HTMLElement).getBoundingClientRect().width + 2);
      const available = host.clientWidth - 8, overflow = 40;
      let used = 0, count = widths.length;
      for (let i = 0; i < widths.length; i++) { used += widths[i]; if (used > available - (i < widths.length - 1 ? overflow : 0)) { count = i; break; } }
      setFit(previous => previous === count ? previous : count);
    };
    compute(); const observer = new ResizeObserver(compute); observer.observe(host); return () => observer.disconnect();
  }, [items, prefs.display, prefs.size]);
  const shown = items.slice(0, fit), hidden = items.slice(fit).filter(v => v.item.kind !== 'space' && v.item.kind !== 'flex');
  const open = (id: string, entries: string[], e: React.MouseEvent | React.KeyboardEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu(menu?.id === id ? null : { id, x: r.left, y: r.bottom + 4, entries }); };
  // Spaces repeat, so the key is the place in the arrangement (an id alone left stale spaces behind after a group was hidden).
  const renderItem = (v: { id: string; index: number; item: ToolbarItem }, probe = false) => <ToolbarControl key={v.id + ':' + v.index + (probe ? '-probe' : '')} item={v.item} display={prefs.display} compact={prefs.size === 'compact'} state={state} probe={probe}
    onCommand={onCommand} onElement={onElement} onMenu={open} />;
  if (!prefs.visible && !customizing) return null;
  return <>
    {prefs.visible && <div ref={row} role="toolbar" aria-label="Main toolbar" data-display={prefs.display} data-size={prefs.size} className="dc-wtoolbar no-print"
      onMouseDown={keepFocus} onContextMenu={e => { if ((e.target as HTMLElement).closest('select')) return; e.preventDefault(); setContext({ x: e.clientX, y: e.clientY }); }}>
      {shown.map(v => renderItem(v))}
      {hidden.length > 0 && <button type="button" className="dc-witem dc-woverflow" aria-label="More toolbar items" aria-haspopup="menu" title="More toolbar items" onClick={e => open('overflow', hidden.map(v => v.id), e)}><Icon name="ChevronsRight" size={16} /></button>}
      <div ref={measure} className="dc-wtoolbar-measure" aria-hidden="true" inert>{items.map(v => <div key={v.id + v.index} data-kind={v.item.kind}>{renderItem(v, true)}</div>)}</div>
    </div>}
    {menu && <ToolbarMenu x={menu.x} y={menu.y} entries={menu.entries} state={state} onClose={() => setMenu(null)} onPick={id => { setMenu(null); const item = ITEM_BY_ID.get(id); if (item?.kind === 'menu' && item.menu) setMenu({ id, x: menu.x + 12, y: menu.y + 8, entries: item.menu }); else if (item?.kind === 'elements' || item?.kind === 'styles' || item?.kind === 'alignment') setMenu({ id, x: menu.x + 12, y: menu.y + 8, entries: item.kind === 'elements' ? TOOLBAR_ITEMS.filter(i => i.element && state.elements.includes(i.element)).map(i => i.id) : item.kind === 'styles' ? ['bold', 'italic', 'underline', 'strikethrough'] : ['align-left', 'align-center', 'align-right'] }); else onCommand(id); }} />}
    {context && <ToolbarMenu x={context.x} y={context.y} entries={['display-icon-text', 'display-icon', 'display-text', 'separator', 'size-compact', 'separator', 'groups-heading', ...GROUP_ORDER.map(g => 'group-' + g), 'separator', 'customize', 'toolbar-visible']}
      state={{ ...state, disabled: { ...state.disabled, 'groups-heading': true }, active: { ...state.active, ['display-' + prefs.display]: true, 'size-compact': prefs.size === 'compact', 'toolbar-visible': prefs.visible, ...Object.fromEntries(GROUP_ORDER.map(g => ['group-' + g, !prefs.hiddenGroups.includes(g)])) } }}
      labels={{ 'display-icon-text': 'Icon and Text', 'display-icon': 'Icon Only', 'display-text': 'Text Only', 'size-compact': 'Use Small Size', 'groups-heading': 'Show Groups', ...Object.fromEntries(GROUP_ORDER.map(g => ['group-' + g, GROUP_NAMES[g]])), customize: 'Customize Toolbar…', 'toolbar-visible': 'Show Toolbar' }}
      onClose={() => setContext(null)} onPick={id => { setContext(null); if (id.startsWith('display-')) onPrefs({ ...prefs, display: id.slice(8) as ToolbarDisplay }); else if (id === 'size-compact') onPrefs({ ...prefs, size: prefs.size === 'compact' ? 'regular' : 'compact' }); else if (id.startsWith('group-')) onPrefs(toggleGroup(prefs, id.slice(6) as ToolbarGroupId)); else if (id === 'customize') onCustomizing(true); else if (id === 'toolbar-visible') onPrefs({ ...prefs, visible: !prefs.visible }); }} />}
    {customizing && <CustomizeToolbar prefs={prefs} onPrefs={onPrefs} state={state} onClose={() => onCustomizing(false)} />}
  </>;
}

function ToolbarControl({ item, display, compact, state, probe, onCommand, onElement, onMenu }: { item: ToolbarItem; display: ToolbarDisplay; compact: boolean; state: ToolbarState; probe: boolean; onCommand: (id: string) => void; onElement: (type: ElementType) => void; onMenu: (id: string, entries: string[], e: React.MouseEvent | React.KeyboardEvent) => void }) {
  const showIcon = display !== 'text', showLabel = display !== 'icon', iconSize = compact ? 15 : 18;
  if (item.kind === 'space') return <span className="dc-wspace" data-kind="space" />;
  if (item.kind === 'flex') return <span className="dc-wflex" data-kind="flex" />;
  const title = item.description + (item.shortcut ? ' (' + item.shortcut + ')' : '');
  const tab = probe ? -1 : undefined;
  if (item.kind === 'elements') return <label className="dc-witem dc-welements" title="Element of the current paragraph">
    <select tabIndex={tab} aria-label="Script element" value={state.element || ''} disabled={!state.element} onChange={e => onElement(e.target.value as ElementType)}>
      {!state.element && <option value="">No element</option>}
      {state.elements.map(t => <option key={t} value={t}>{t === 'General' ? 'General Text' : t}{state.elementShortcuts?.[t] ? '  ' + state.elementShortcuts[t] : ''}</option>)}
    </select>{showLabel && <span className="dc-wlabel">Elements</span>}</label>;
  if (item.kind === 'styles' || item.kind === 'alignment') {
    const parts = item.kind === 'styles' ? [['bold', 'Bold'], ['italic', 'Italic'], ['underline', 'Underline'], ['strikethrough', 'Strikethrough']] : [['align-left', 'AlignLeft'], ['align-center', 'AlignCenter'], ['align-right', 'AlignRight']];
    return <div className="dc-witem dc-wsegment" role="group" aria-label={item.label}><div className="dc-wsegments">{parts.map(([id, icon]) =>
      <button key={id} type="button" tabIndex={tab} aria-label={entryLabel(id)} title={entryLabel(id)} aria-pressed={!!state.active[id]} disabled={!!state.disabled[id]} onClick={() => onCommand(id)}><Icon name={icon} size={compact ? 13 : 15} /></button>)}</div>{showLabel && <span className="dc-wlabel">{item.label}</span>}</div>;
  }
  const isMenu = item.kind === 'menu', pressed = item.kind === 'toggle' ? !!state.active[item.id] : undefined;
  return <button type="button" tabIndex={tab} className="dc-witem" data-item={item.id} aria-label={item.label} title={title} aria-pressed={pressed} aria-haspopup={isMenu ? 'menu' : undefined} disabled={!!state.disabled[item.id]}
    onClick={e => isMenu ? onMenu(item.id, item.menu || [], e) : onCommand(item.id)}>
    {showIcon && <span className="dc-wicon"><Icon name={item.icon} size={iconSize} />{isMenu && <Icon name="ChevronDown" size={10} />}</span>}
    {showLabel && <span className="dc-wlabel">{item.label}{isMenu && !showIcon ? ' ▾' : ''}</span>}
  </button>;
}

export function ToolbarMenu({ x, y, entries, state, labels = {}, onPick, onClose }: { x: number; y: number; entries: string[]; state: ToolbarState; labels?: Record<string, string>; onPick: (id: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => { const r = ref.current?.getBoundingClientRect(); if (r) setPosition({ left: Math.max(6, Math.min(x, window.innerWidth - r.width - 6)), top: Math.max(6, y + r.height > window.innerHeight - 6 ? Math.max(6, Math.min(y - r.height - 8, window.innerHeight - r.height - 6)) : y) }); ref.current?.querySelector<HTMLElement>('[role^=menuitem]:not([disabled])')?.focus(); }, [x, y]);
  useEffect(() => {
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', key, true); };
  }, [onClose]);
  const move = (e: React.KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return; e.preventDefault();
    const list = [...(ref.current?.querySelectorAll<HTMLElement>('[role^=menuitem]:not([disabled])') || [])], at = list.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (at + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length; list[next]?.focus();
  };
  return createPortal(<div ref={ref} role="menu" className="dc-wmenu dc-popover" style={{ left: position.left, top: position.top }} onKeyDown={move} onMouseDown={keepFocus}>
    {entries.map((id, i) => id === 'separator' ? <div key={'s' + i} role="separator" className="dc-wmenu-separator" /> : (() => {
      const item = ITEM_BY_ID.get(id), check = MENU_ENTRIES[id]?.check || item?.kind === 'toggle' || labels[id] !== undefined && state.active[id] !== undefined;
      const label = labels[id] ?? entryLabel(id);
      return <button key={id} type="button" role={check ? 'menuitemcheckbox' : 'menuitem'} aria-checked={check ? !!state.active[id] : undefined} disabled={!!state.disabled[id]} onClick={() => onPick(id)}>
        <span className="dc-wmenu-check">{check && state.active[id] ? <Icon name="Check" size={13} /> : null}</span>
        {item && item.kind !== 'menu' ? <Icon name={item.icon} size={14} /> : <span className="dc-wmenu-gap" />}<span>{label}{item?.kind === 'menu' ? ' ▸' : ''}</span>
      </button>;
    })())}
  </div>, document.body);
}

const DEFAULT_SET = '__default-set__';
const GROUP_ORDER: ToolbarGroup[] = ['document', 'edit', 'screenplay', 'workspace', 'format', 'production', 'tools'];
/** Items shown in the toolbar: the arrangement minus hidden groups. Spaces stay, but never two in a row and never at
 * either end, so hiding a group does not leave a gap. */
export function visibleItems(prefs: ToolbarPreferences) {
  const hidden = new Set<string>(prefs.hiddenGroups || []);
  const all = prefs.items.map((id, index) => ({ id, index, item: ITEM_BY_ID.get(id) })).filter((v): v is { id: string; index: number; item: ToolbarItem } => !!v.item && (v.item.kind === 'space' || v.item.kind === 'flex' || !hidden.has(v.item.group)));
  if (!hidden.size) return all;
  const out: typeof all = [];
  for (const v of all) { const gap = v.item.kind === 'space'; if (gap && (!out.length || out[out.length - 1].item.kind === 'space')) continue; out.push(v); }
  while (out.length && out[out.length - 1].item.kind === 'space') out.pop();
  return out;
}
export const toggleGroup = (prefs: ToolbarPreferences, group: ToolbarGroupId): ToolbarPreferences => ({ ...prefs, hiddenGroups: prefs.hiddenGroups.includes(group) ? prefs.hiddenGroups.filter(g => g !== group) : [...prefs.hiddenGroups, group] });
function CustomizeToolbar({ prefs, onPrefs, state, onClose }: { prefs: ToolbarPreferences; onPrefs: (p: ToolbarPreferences) => void; state: ToolbarState; onClose: () => void }) {
  const strip = useRef<HTMLDivElement>(null);
  const [drop, setDrop] = useState<number | null>(null);
  const set = (items: string[]) => onPrefs({ ...prefs, items });
  const indexAt = (clientX: number) => { const children = [...(strip.current?.querySelectorAll<HTMLElement>('[data-slot]') || [])]; const i = children.findIndex(c => { const r = c.getBoundingClientRect(); return clientX < r.left + r.width / 2; }); return i < 0 ? children.length : i; };
  // Items dragged from the list are offered as a copy, items dragged within the toolbar as a move. The drop target must
  // answer with an effect the source allows, or the browser refuses the drop (1.16.1: dragging from the list did nothing).
  const accept = (e: React.DragEvent) => { e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move'; };
  const take = (e: React.DragEvent) => { try { return JSON.parse(e.dataTransfer.getData('application/x-draftcraft-toolbar') || 'null') as { id: string; from?: number } | null; } catch { return null; } };
  const place = (data: { id: string; from?: number }, at: number) => {
    if (data.id === DEFAULT_SET) { set([...DEFAULT_TOOLBAR_ITEMS]); return; }
    const items = [...prefs.items]; let target = at;
    if (data.from !== undefined) { items.splice(data.from, 1); if (data.from < at) target--; }
    else if (data.id !== 'space' && data.id !== 'flex' && items.includes(data.id)) { const old = items.indexOf(data.id); items.splice(old, 1); if (old < at) target--; }
    items.splice(Math.max(0, Math.min(items.length, target)), 0, data.id); set(items);
  };
  const add = (id: string) => { if (id !== 'space' && id !== 'flex' && prefs.items.includes(id)) return; set([...prefs.items, id]); };
  return createPortal(<div className="dc-overlay dc-wcustomize-backdrop" role="presentation" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } }}>
    <section role="dialog" aria-modal="true" aria-label="Customize Toolbar" className="dc-wcustomize">
      <p className="dc-wcustomize-hint">Drag items into the toolbar, drag them to rearrange, or drag them out to remove them. You can also use the buttons.</p>
      <div ref={strip} className="dc-wcustomize-strip" aria-label="Toolbar items" role="list" data-dropping={drop !== null}
        onDragOver={e => { if (e.dataTransfer.types.includes('application/x-draftcraft-toolbar')) { e.preventDefault(); accept(e); setDrop(indexAt(e.clientX)); } }}
        onDragLeave={e => { if (!strip.current?.contains(e.relatedTarget as Node)) setDrop(null); }}
        onDrop={e => { e.preventDefault(); const data = take(e); setDrop(null); if (data) place(data, indexAt(e.clientX)); }}>
        {prefs.items.length === 0 && <span className="dc-wcustomize-empty">The toolbar is empty. Drag items here.</span>}
        {prefs.items.map((id, i) => { const item = ITEM_BY_ID.get(id); if (!item) return null; return <div key={id + i} role="listitem" data-slot={i} className={'dc-wslot' + (drop === i ? ' dc-wslot-before' : '')} draggable
          onDragStart={e => { e.dataTransfer.setData('application/x-draftcraft-toolbar', JSON.stringify({ id, from: i })); e.dataTransfer.effectAllowed = 'move'; }}>
          <span className="dc-wslot-face">{item.kind === 'space' ? '␣' : item.kind === 'flex' ? '↔' : <Icon name={item.icon} size={16} />}<span>{item.label}</span></span>
          <span className="dc-wslot-actions">
            <button type="button" aria-label={'Move ' + item.label + ' left'} disabled={i === 0} onClick={() => { const items = [...prefs.items];[items[i - 1], items[i]] = [items[i], items[i - 1]]; set(items); }}>‹</button>
            <button type="button" aria-label={'Move ' + item.label + ' right'} disabled={i === prefs.items.length - 1} onClick={() => { const items = [...prefs.items];[items[i + 1], items[i]] = [items[i], items[i + 1]]; set(items); }}>›</button>
            <button type="button" aria-label={'Remove ' + item.label + ' from the toolbar'} onClick={() => set(prefs.items.filter((_, j) => j !== i))}>×</button>
          </span>
        </div>; })}
        {drop === prefs.items.length && <span className="dc-wslot-end" />}
      </div>
      <div className="dc-wpalette" onDragOver={e => { const d = e.dataTransfer.types.includes('application/x-draftcraft-toolbar'); if (d) { e.preventDefault(); accept(e); } }}
        onDrop={e => { e.preventDefault(); const data = take(e); if (data?.from !== undefined) set(prefs.items.filter((_, j) => j !== data.from)); }}>
        {GROUP_ORDER.map(group => <fieldset key={group} data-group-hidden={prefs.hiddenGroups.includes(group)}><legend>{GROUP_NAMES[group]}
          <label className="dc-wgroup-toggle" title={'Show or hide every ' + GROUP_NAMES[group] + ' item in the toolbar at once'}><input type="checkbox" aria-label={'Show the ' + GROUP_NAMES[group] + ' group in the toolbar'} checked={!prefs.hiddenGroups.includes(group)} onChange={() => onPrefs(toggleGroup(prefs, group))} /> Show in toolbar</label></legend><div className="dc-wpalette-grid">
          {TOOLBAR_ITEMS.filter(i => i.group === group).map(item => { const inUse = item.kind !== 'space' && item.kind !== 'flex' && prefs.items.includes(item.id); return <button key={item.id} type="button" draggable className="dc-wpalette-item" data-in-use={inUse}
            aria-label={(inUse ? 'In toolbar: ' : 'Add to toolbar: ') + item.label} title={item.description} onDoubleClick={() => add(item.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(item.id); } }}
            onDragStart={e => { e.dataTransfer.setData('application/x-draftcraft-toolbar', JSON.stringify({ id: item.id })); e.dataTransfer.effectAllowed = 'copy'; }}>
            <span className="dc-wpalette-face">{item.kind === 'space' ? '␣' : item.kind === 'flex' ? '↔' : <Icon name={item.icon} size={18} />}</span><span>{item.label}</span>
          </button>; })}
        </div></fieldset>)}
      </div>
      <div className="dc-wcustomize-default"><span>… or drag the default set into the toolbar:</span>
        <button type="button" draggable onClick={() => set([...DEFAULT_TOOLBAR_ITEMS])} onDragStart={e => { e.dataTransfer.setData('application/x-draftcraft-toolbar', JSON.stringify({ id: DEFAULT_SET })); e.dataTransfer.effectAllowed = 'copy'; }} className="dc-wcustomize-defaultset" aria-label="Restore the default toolbar">
          {DEFAULT_TOOLBAR_ITEMS.filter(id => id !== 'space' && id !== 'flex').slice(0, 12).map((id, i) => { const item = ITEM_BY_ID.get(id)!; return <span key={id + i}><Icon name={item.icon} size={14} /></span>; })}<span>Default Set</span>
        </button></div>
      <footer>
        <label>Show <select aria-label="Toolbar display" value={prefs.display} onChange={e => onPrefs({ ...prefs, display: e.target.value as ToolbarDisplay })}><option value="icon-text">Icon and Text</option><option value="icon">Icon Only</option><option value="text">Text Only</option></select></label>
        <label><input type="checkbox" checked={prefs.size === 'compact'} onChange={e => onPrefs({ ...prefs, size: e.target.checked ? 'compact' : 'regular' })} /> Use small size</label>
        <label><input type="checkbox" checked={prefs.visible} onChange={e => onPrefs({ ...prefs, visible: e.target.checked })} /> Show toolbar</label>
        <span className="dc-wflex" />
        <button type="button" onClick={() => onPrefs({ ...prefs, items: [...DEFAULT_TOOLBAR_ITEMS], display: 'icon-text', size: 'regular', visible: true, hiddenGroups: [] })}>Reset to Default</button>
        <button type="button" className="dc-wprimary" onClick={onClose} autoFocus>Done</button>
      </footer>
    </section>
  </div>, document.body);
}

/** Title row: traffic lights (native on macOS; drawn elsewhere), document title and save state. Draggable. */
export function TitleRow({ title, onTitle, status, nativeLights, fullscreen, children }: { title: string; onTitle: () => void; status?: React.ReactNode; nativeLights: boolean; fullscreen: boolean; children?: React.ReactNode }) {
  const action = (a: 'close' | 'minimize' | 'fullscreen') => window.draftcraftDesktop?.windowAction(a);
  return <header className="dc-wtitle no-print" data-native-lights={nativeLights && !fullscreen} onDoubleClick={e => { if (!nativeLights && e.target === e.currentTarget) action('fullscreen'); }}>
    {!nativeLights && <div className="dc-wlights">
      <button type="button" aria-label="Close Window" title="Close" onClick={() => action('close')} className="dc-wlight dc-wlight-close" />
      <button type="button" aria-label="Minimize" title="Minimize" onClick={() => action('minimize')} className="dc-wlight dc-wlight-min" />
      <button type="button" aria-label="Zoom / Fullscreen" title="Enter Full Screen" onClick={() => action('fullscreen')} className="dc-wlight dc-wlight-max" />
    </div>}
    <div className="dc-wtitle-center"><button type="button" className="dc-wtitle-name" title="Edit the title page" onClick={onTitle}>{title || 'Untitled Screenplay'}</button>{status}</div>
    <div className="dc-wtitle-right">{children}</div>
  </header>;
}
