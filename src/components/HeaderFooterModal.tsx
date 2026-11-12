import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState } from 'react';
import { HeaderFooterConfig, ScriptDocument } from '../types/script';
import {
  X,
  Check,
  Eye,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Info,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HeaderFooterModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: HeaderFooterConfig;
  document: ScriptDocument;
  onSave: (updated: HeaderFooterConfig) => void;
}

export const HeaderFooterModal: React.FC<HeaderFooterModalProps> = ({
  isOpen,
  onClose,
  config,
  document,
  onSave,
}) => {
  const defaultConfig: HeaderFooterConfig = {
    showHeader: true,
    showFooter: false,
    firstPageHasHeader: false,
    firstPageHasFooter: false,
    header: {
      left: '',
      center: '',
      right: '{PAGE}.',
    },
    footer: {
      left: '',
      center: '',
      right: '',
    },
    customLabel: '',
    dateFormat: 'Month DD, YYYY',
  };

  const [state, setState] = useState<HeaderFooterConfig>(config || defaultConfig);

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  const replacePlaceholders = (text: string, pageNum = 2): string => {
    if (!text) return '';
    const now = new Date();
    const dateStr =
      state.dateFormat === 'YYYY-MM-DD'
        ? now.toISOString().split('T')[0]
        : state.dateFormat === 'MM/DD/YYYY'
        ? now.toLocaleDateString('en-US')
        : state.dateFormat === 'DD Month YYYY'
        ? now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return text
      .replace(/{PAGE}/gi, String(pageNum))
      .replace(/{PAGES}/gi, String(document.targetScriptPages || 110))
      .replace(/{TITLE}/gi, document.titlePage.title || 'UNTITLED')
      .replace(/{DATE}/gi, dateStr)
      .replace(/{REVISION}/gi, `${document.currentRevision} Draft`)
      .replace(/{SCENE}/gi, 'Scene 4')
      .replace(/{ACT}/gi, 'ACT I')
      .replace(/{LABEL}/gi, state.customLabel || '');
  };

  const handleInsertToken = (target: 'header' | 'footer', position: 'left' | 'center' | 'right', token: string) => {
    setState((prev) => ({
      ...prev,
      [target]: {
        ...prev[target],
        [position]: (prev[target][position] ? prev[target][position] + ' ' : '') + token,
      },
    }));
  };

  const handleApply = () => {
    onSave(state);
    onClose();
  };

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#1e1e1e] border border-neutral-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-neutral-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Headers & Footers Studio
              </h2>
              <p className="text-xs text-neutral-400">
                Industry-standard pagination, act labels, revision stamps & margin tokens
              </p>
            </div>
          </div>

          <button aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#161616]">
          {/* Tokens Cheat Sheet */}
          <div className="bg-[#202020] border border-neutral-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Available Dynamic Tokens</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { token: '{PAGE}', desc: 'Page Number' },
                { token: '{PAGES}', desc: 'Total Pages' },
                { token: '{TITLE}', desc: 'Script Title' },
                { token: '{DATE}', desc: 'Draft Date' },
                { token: '{REVISION}', desc: 'Revision Set' },
                { token: '{SCENE}', desc: 'Current Scene' },
                { token: '{ACT}', desc: 'Current Act' },
                { token: '{LABEL}', desc: 'Custom Label' },
              ].map(({ token, desc }) => (
                <div
                  key={token}
                  className="px-2.5 py-1 rounded bg-[#2a2a2a] border border-neutral-700/60 flex items-center space-x-1.5"
                >
                  <code className="text-blue-400 font-bold">{token}</code>
                  <span className="text-neutral-400 text-[11px]">— {desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Header Controls */}
          <div className="bg-[#202020] border border-neutral-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.showHeader}
                  onChange={(e) => setState((prev) => ({ ...prev, showHeader: e.target.checked }))}
                  className="rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-0"
                />
                <span className="text-sm font-semibold text-white">Enable Page Header</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.firstPageHasHeader}
                  onChange={(e) => setState((prev) => ({ ...prev, firstPageHasHeader: e.target.checked }))}
                  className="rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-0"
                />
                <span>Include on Page 1 (Usually unchecked in Hollywood specs)</span>
              </label>
            </div>

            {state.showHeader && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center space-x-1">
                    <AlignLeft className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Header Left</span>
                  </label>
                  <input
                    type="text"
                    value={state.header.left}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, header: { ...prev.header, left: e.target.value } }))
                    }
                    placeholder="e.g. {TITLE} - {REVISION}"
                    className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs font-mono"
                  />
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleInsertToken('header', 'left', '{TITLE}')}
                      className="text-[10px] dc-meta text-neutral-400 hover:text-white bg-neutral-800 px-1.5 py-0.5 rounded"
                    >
                      +{'{TITLE}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertToken('header', 'left', '{REVISION}')}
                      className="text-[10px] dc-meta text-neutral-400 hover:text-white bg-neutral-800 px-1.5 py-0.5 rounded"
                    >
                      +{'{REVISION}'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center space-x-1">
                    <AlignCenter className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Header Center</span>
                  </label>
                  <input
                    type="text"
                    value={state.header.center}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, header: { ...prev.header, center: e.target.value } }))
                    }
                    placeholder="e.g. {DATE}"
                    className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs font-mono"
                  />
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleInsertToken('header', 'center', '{DATE}')}
                      className="text-[10px] dc-meta text-neutral-400 hover:text-white bg-neutral-800 px-1.5 py-0.5 rounded"
                    >
                      +{'{DATE}'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center space-x-1">
                    <AlignRight className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Header Right (Industry Standard: Page #)</span>
                  </label>
                  <input
                    type="text"
                    value={state.header.right}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, header: { ...prev.header, right: e.target.value } }))
                    }
                    placeholder="e.g. {PAGE}."
                    className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs font-mono"
                  />
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleInsertToken('header', 'right', '{PAGE}.')}
                      className="text-[10px] dc-meta text-blue-400 hover:text-blue-300 bg-neutral-800 px-1.5 py-0.5 rounded"
                    >
                      +{'{PAGE}.'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertToken('header', 'right', '{REVISION}')}
                      className="text-[10px] dc-meta text-neutral-400 hover:text-white bg-neutral-800 px-1.5 py-0.5 rounded"
                    >
                      +{'{REVISION}'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="bg-[#202020] border border-neutral-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.showFooter}
                  onChange={(e) => setState((prev) => ({ ...prev, showFooter: e.target.checked }))}
                  className="rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-0"
                />
                <span className="text-sm font-semibold text-white">Enable Page Footer</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.firstPageHasFooter}
                  onChange={(e) => setState((prev) => ({ ...prev, firstPageHasFooter: e.target.checked }))}
                  className="rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-0"
                />
                <span>Include on Page 1</span>
              </label>
            </div>

            {state.showFooter && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center space-x-1">
                    <AlignLeft className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Footer Left</span>
                  </label>
                  <input
                    type="text"
                    value={state.footer.left}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, footer: { ...prev.footer, left: e.target.value } }))
                    }
                    placeholder="e.g. {LABEL}"
                    className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center space-x-1">
                    <AlignCenter className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Footer Center</span>
                  </label>
                  <input
                    type="text"
                    value={state.footer.center}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, footer: { ...prev.footer, center: e.target.value } }))
                    }
                    placeholder="e.g. CONFIDENTIAL"
                    className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center space-x-1">
                    <AlignRight className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Footer Right</span>
                  </label>
                  <input
                    type="text"
                    value={state.footer.right}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, footer: { ...prev.footer, right: e.target.value } }))
                    }
                    placeholder="e.g. {DATE}"
                    className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Document Labels & Date Format */}
          <div className="bg-[#202020] border border-neutral-800 rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Custom Document Label ({'{LABEL}'})
              </label>
              <input
                type="text"
                value={state.customLabel || ''}
                onChange={(e) => setState((prev) => ({ ...prev, customLabel: e.target.value }))}
                placeholder="e.g. CONFIDENTIAL - PROPERTY OF STUDIO"
                className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Date Display Format ({'{DATE}'})
              </label>
              <select
                value={state.dateFormat || 'Month DD, YYYY'}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, dateFormat: e.target.value as any }))
                }
                className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="Month DD, YYYY">Month DD, YYYY (March 15, 2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (03/15/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2026-03-15)</option>
                <option value="DD Month YYYY">DD Month YYYY (15 March 2026)</option>
              </select>
            </div>
          </div>

          {/* Live Page Preview Box */}
          <div className="bg-[#121212] border border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Simulated Page 2 Output</span>
            </div>

            <div className="bg-[#fbfbf9] text-neutral-900 rounded p-6 font-mono text-xs shadow-inner space-y-12 border border-neutral-400/40">
              {/* Header preview row */}
              <div className="flex justify-between items-center text-[11px] pb-2 border-b border-dashed border-neutral-300">
                <span className="text-neutral-700">{replacePlaceholders(state.header.left, 2)}</span>
                <span className="text-neutral-700 font-semibold">{replacePlaceholders(state.header.center, 2)}</span>
                <span className="text-neutral-900 font-bold">{replacePlaceholders(state.header.right, 2)}</span>
              </div>

              {/* Sample script body mockup */}
              <div className="text-[11px] text-neutral-400 space-y-2 py-4 select-none">
                <p className="font-bold text-neutral-800">EXT. DOWNTOWN ROOFTOP - NIGHT</p>
                <p>Rain beats steadily against the black asphalt. Marcus adjusts his jacket.</p>
                <div className="pl-32">
                  <p className="font-bold text-neutral-900">MARCUS</p>
                  <p className="italic text-neutral-600">(into comms)</p>
                  <p className="text-neutral-800">We are live on page two.</p>
                </div>
              </div>

              {/* Footer preview row */}
              {state.showFooter && (
                <div className="flex justify-between items-center text-[10px] dc-meta pt-2 border-t border-dashed border-neutral-300">
                  <span className="text-neutral-600">{replacePlaceholders(state.footer.left, 2)}</span>
                  <span className="text-neutral-700 font-semibold">{replacePlaceholders(state.footer.center, 2)}</span>
                  <span className="text-neutral-600">{replacePlaceholders(state.footer.right, 2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-[#181818]">
          <div className="text-xs text-neutral-400 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-neutral-500" />
            <span>Applied dynamically to editor pagination and vector PDF generation.</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm flex items-center space-x-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Save Header & Footer</span>
            </button>
          </div>
        </div>
      </div>
    </DialogOverlay>
  );
};
