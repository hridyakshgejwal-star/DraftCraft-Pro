import { FloatingSurface } from './ui/Presentation';
import { useIsPresent } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { ScriptBookmark } from '../types/script';
import { Bookmark, X, Trash2, Check, Tag } from 'lucide-react';

interface BookmarkPopoverProps {
  bookmark?: ScriptBookmark | string | null;
  paragraphId: string;
  paragraphText: string;
  sceneHeading?: string;
  position?: { top: number; left: number };
  onClose: () => void;
  onSaveBookmark: (bookmark: ScriptBookmark) => void;
  onRemoveBookmark: () => void;
}

const BOOKMARK_COLORS = [
  { name: 'Amber', hex: '#f59e0b', bg: 'bg-amber-500' },
  { name: 'Blue', hex: '#3b82f6', bg: 'bg-blue-500' },
  { name: 'Rose', hex: '#f43f5e', bg: 'bg-rose-500' },
  { name: 'Emerald', hex: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Purple', hex: '#a855f7', bg: 'bg-purple-500' },
  { name: 'Cyan', hex: '#06b6d4', bg: 'bg-cyan-500' },
  { name: 'Orange', hex: '#f97316', bg: 'bg-orange-500' },
];

const PRESET_BOOKMARK_NAMES = [
  'Inciting Incident',
  'Act I Climax',
  'Midpoint Shift',
  'Crisis / All is Lost',
  'Climax & Decoupling',
  'VFX Sequence',
  'Key Monologue',
];

export const BookmarkPopover: React.FC<BookmarkPopoverProps> = ({
  bookmark,
  paragraphId,
  paragraphText,
  sceneHeading,
  position,
  onClose,
  onSaveBookmark,
  onRemoveBookmark,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();

  // Normalize initial bookmark object
  const existingName = typeof bookmark === 'object' && bookmark ? bookmark.name : typeof bookmark === 'string' ? bookmark : '';
  const existingColor = typeof bookmark === 'object' && bookmark ? bookmark.color : '#f59e0b';
  const existingId = typeof bookmark === 'object' && bookmark ? bookmark.id : `bm-${Date.now()}`;

  const [name, setName] = useState(existingName || (sceneHeading ? sceneHeading.slice(0, 30) : 'Bookmark'));
  const [color, setColor] = useState(existingColor);

  useEffect(() => {
    if (!isPresent) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleSave();
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [name, color, isPresent]);

  const handleSave = () => {
    if (!name.trim()) {
      onRemoveBookmark();
      return;
    }
    const newBookmark: ScriptBookmark = {
      id: existingId,
      name: name.trim(),
      color,
      createdAt: typeof bookmark === 'object' && bookmark?.createdAt ? bookmark.createdAt : new Date().toLocaleDateString(),
      paragraphId,
    };
    onSaveBookmark(newBookmark);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      handleSave();
      onClose();
    }
  };

  return (
    <FloatingSurface
      role="dialog" aria-label="Script bookmark"
      ref={popoverRef}
      onKeyDown={handleKeyDown}
      className="fixed z-50 w-80 bg-[#1f1f27] dc-bg-panel border border-white/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md flex flex-col transition-colors duration-150 "
      style={{
        top: position ? Math.min(position.top, window.innerHeight - 300) : '25%',
        left: position ? Math.min(position.left, window.innerWidth - 340) : '35%',
      }}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <div className="p-3.5 space-y-3 bg-[#1f1f27] dc-bg-panel">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Bookmark className="w-3.5 h-3.5" style={{ color }} />
            <span>{bookmark ? 'Edit Script Bookmark' : 'Set Bookmark'}</span>
          </div>
          <button aria-label="Close (Esc)"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded"
            title="Close (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Location Context preview */}
        <div className="text-[10px] dc-meta text-neutral-400 bg-black/30 p-2 rounded-lg border border-white/5 truncate font-mono">
          <span className="text-neutral-500 mr-1">Anchor:</span>
          {paragraphText.slice(0, 45) || sceneHeading || 'Current Paragraph'}...
        </div>

        {/* Bookmark Name Input */}
        <div>
          <label className="text-[10px] dc-meta uppercase font-bold tracking-wider text-neutral-400 block mb-1">
            Bookmark Label
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bookmark name / milestone..."
            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400/70"
            autoFocus
          />
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {PRESET_BOOKMARK_NAMES.map((preset) => (
              <button
                key={preset}
                onClick={() => setName(preset)}
                className={`text-[9px] dc-fine-meta px-1.5 py-0.5 rounded transition-colors ${
                  name === preset
                    ? 'bg-blue-500/30 text-blue-200 border border-blue-500/40'
                    : 'bg-white/5 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] dc-meta text-neutral-400 font-medium">Ribbon Color:</span>
          <div className="flex items-center gap-1.5">
            {BOOKMARK_COLORS.map((bc) => {
              const isSelected = color === bc.hex;
              return (
                <button aria-label={bc.name}
                  key={bc.hex}
                  onClick={() => setColor(bc.hex)}
                  className={`w-4 h-4 rounded-full transition-transform flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-white scale-125' : 'hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: bc.hex }}
                  title={bc.name}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-black" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          {bookmark ? (
            <button
              onClick={() => {
                onRemoveBookmark();
                onClose();
              }}
              className="text-[11px] text-red-400/80 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-2.5 py-1 text-[11px] text-neutral-400 hover:text-white rounded hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="px-3 py-1 text-[11px] font-semibold bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors flex items-center gap-1 shadow-md"
            >
              <Check className="w-3 h-3" />
              Save Bookmark
            </button>
          </div>
        </div>
      </div>
    </FloatingSurface>
  );
};
