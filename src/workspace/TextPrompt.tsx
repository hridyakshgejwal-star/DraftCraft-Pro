// A small modal text field. Electron does not implement window.prompt(), so every "enter a name" request uses this.
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
export interface TextPromptRequest { title: string; value: string; apply: (value: string) => void }
export function TextPrompt({ request, onClose }: { request: TextPromptRequest | null; onClose: () => void }) {
  const [value, setValue] = useState(request?.value ?? '');
  if (!request) return null;
  const submit = () => { const v = value.trim(); onClose(); if (v) request.apply(v); };
  return createPortal(<div className="dc-overlay dc-text-prompt-backdrop" role="presentation" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } }}>
    <form role="dialog" aria-modal="true" aria-label={request.title} className="dc-text-prompt" onSubmit={e => { e.preventDefault(); submit(); }}>
      <label>{request.title}<input autoFocus aria-label={request.title} value={value} onChange={e => setValue(e.target.value)} onFocus={e => e.currentTarget.select()} /></label>
      <footer><button type="button" onClick={onClose}>Cancel</button><button type="submit" className="dc-wprimary">OK</button></footer>
    </form>
  </div>, document.body);
}
