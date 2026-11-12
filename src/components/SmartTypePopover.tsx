import { FloatingSurface } from './ui/Presentation';
import React from 'react';
import { Sparkles } from 'lucide-react';

interface SmartTypePopoverProps {
  label?: string;
  suggestions: string[];
  selectedIndex: number;
  onSelect: (value: string) => void;
  position: { top: number; left: number };
}

export const SmartTypePopover: React.FC<SmartTypePopoverProps> = ({
  label = "SmartType suggestions",
  suggestions,
  selectedIndex,
  onSelect,
  position,
}) => {
  if (suggestions.length === 0) return null;

  return (
    <FloatingSurface
      id="dc-smarttype" role="listbox" aria-label={label}
      className="dc-smarttype fixed z-50 bg-[#1e1e28] dc-bg-panel border border-amber-500/40 rounded-lg shadow-2xl overflow-hidden py-1 min-w-[200px] max-h-56 overflow-y-auto text-xs text-neutral-200 backdrop-blur-md"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="px-2.5 py-1 text-[10px] dc-meta font-mono uppercase tracking-wider text-amber-400/80 border-b border-white/10 flex items-center gap-1">
        <Sparkles className="w-2.5 h-2.5" />
        <span>{label} (↵ or Tab)</span>
      </div>
      {suggestions.map((item, idx) => (
        <button
          key={idx}
          id={'dc-smarttype-option-' + idx} role="option" aria-selected={idx === selectedIndex}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          className={`w-full text-left px-3 py-1.5 font-screenplay text-[11px] transition-colors flex items-center justify-between ${
            idx === selectedIndex
              ? 'bg-amber-500 text-black font-bold'
              : 'hover:bg-white/10 text-neutral-200'
          }`}
        >
          <span>{item}</span>
          <span className="text-[9px] dc-fine-meta opacity-60 font-mono">Select</span>
        </button>
      ))}
    </FloatingSurface>
  );
};
