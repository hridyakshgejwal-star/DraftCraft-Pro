import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React from 'react';
import {
  RevisionTier,
  REVISION_TIERS,
} from '../types/script';
import {
  Layers,
  Lock,
  Unlock,
  CheckCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface ProductionRevisionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRevision: RevisionTier;
  onSelectRevision: (rev: RevisionTier) => void;
  productionMode: boolean;
  onToggleProductionMode: () => void;
  lockedPages: boolean;
  onToggleLockPages: () => void;
}

export const ProductionRevisionsModal: React.FC<ProductionRevisionsModalProps> = ({
  isOpen,
  onClose,
  currentRevision,
  onSelectRevision,
  productionMode,
  onToggleProductionMode,
  lockedPages,
  onToggleLockPages,
}) => {
  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f1f28] dc-bg-panel border border-white/15 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200">
        {/* Header */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Production Revisions & Colored Drafts
              </h3>
              <p className="text-xs text-neutral-400">
                Final Draft 13 standard Hollywood production revision sets and locked page management.
              </p>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-md">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-black/30 p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-semibold text-neutral-200 block">Production Mode</span>
                <span className="text-[11px] text-neutral-400">
                  Tag edits with colored text & right margin asterisk (*)
                </span>
              </div>
              <button
                onClick={onToggleProductionMode}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  productionMode
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {productionMode ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            <div className="bg-black/30 p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-semibold text-neutral-200 block">Lock Page Numbers</span>
                <span className="text-[11px] text-neutral-400">
                  Preserve production pages using A/B numbering (23, 23A)
                </span>
              </div>
              <button
                onClick={onToggleLockPages}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                  lockedPages
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {lockedPages ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{lockedPages ? 'LOCKED' : 'UNLOCKED'}</span>
              </button>
            </div>
          </div>

          {/* Standard Industry Revision Color Palette */}
          <div>
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
              Select Active Revision Tier (Hollywood Color Hierarchy):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REVISION_TIERS.map((tier) => {
                const isSelected = tier.name === currentRevision;

                return (
                  <button
                    key={tier.name}
                    onClick={() => onSelectRevision(tier.name)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/10 shadow-md ring-1 ring-amber-400/50'
                        : 'border-white/10 bg-black/20 hover:bg-black/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-4 h-4 rounded-full border border-black/30 shrink-0"
                        style={{ backgroundColor: tier.borderHex }}
                      />
                      <span className="font-medium text-neutral-200">{tier.colorName}</span>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-neutral-900 rounded-xl border border-white/10 text-[11px] text-neutral-400 space-y-1">
            <div className="font-semibold text-neutral-300">Hollywood Script Department Rules:</div>
            <p>
              • White: Standard original reading draft before principal photography.
            </p>
            <p>
              • Blue → Pink → Yellow: Successive revision distributed to cast & department heads on colored paper with asterisks.
            </p>
            <p>
              • Omitted scenes retain their original number marked "SCENE 12 - OMITTED" to avoid crew call sheet misalignment.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
