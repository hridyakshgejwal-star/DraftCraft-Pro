import { FloatingSurface } from './ui/Presentation';
import { useIsPresent } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import {
  ScriptNote,
  ScriptNoteColor,
  ScriptNoteCategory,
  SCRIPT_NOTE_THEMES,
} from '../types/script';
import {
  MessageSquare,
  X,
  Trash2,
  Check,
  Calendar,
  User,
  Tag,
  Copy,
  Plus,
  Sparkles,
} from 'lucide-react';

interface NotePopoverProps {
  notes: ScriptNote[];
  activeNoteId?: string | null;
  paragraphId: string;
  paragraphType: string;
  defaultAuthor?: string;
  position?: { top: number; left: number };
  onClose: () => void;
  onSaveNote: (note: ScriptNote) => void;
  onDeleteNote: (noteId: string) => void;
  onAddAnotherNote?: () => void;
}

const COMMON_NOTE_TITLES = [
  'Director Note',
  'VFX Requirement',
  'Actor Direction',
  'Pacing / Beat',
  'Production / Prop',
  'Dialogue Polish',
];

const COMMON_AUTHORS = ['Writer', 'Director', 'Elena Vance', 'Script Supervisor', 'Producer'];

export const NotePopover: React.FC<NotePopoverProps> = ({
  notes,
  activeNoteId,
  paragraphId,
  paragraphType,
  defaultAuthor = 'Writer',
  position,
  onClose,
  onSaveNote,
  onDeleteNote,
  onAddAnotherNote,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();

  // Selected note index among notes for this paragraph
  const initialIndex = activeNoteId
    ? Math.max(0, notes.findIndex((n) => n.id === activeNoteId))
    : 0;
  const [selectedIdx, setSelectedIdx] = useState(initialIndex);

  const currentNote = notes[selectedIdx] || notes[0];

  const [title, setTitle] = useState(currentNote?.name || '');
  const [text, setText] = useState(currentNote?.text || '');
  const [author, setAuthor] = useState(currentNote?.author || defaultAuthor);
  const [color, setColor] = useState<ScriptNoteColor>(currentNote?.color || 'yellow');
  const [category, setCategory] = useState<ScriptNoteCategory>(currentNote?.category || 'general');

  // Sync state if selectedIdx changes
  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.name || '');
      setText(currentNote.text || '');
      setAuthor(currentNote.author || defaultAuthor);
      setColor(currentNote.color || 'yellow');
      setCategory(currentNote.category || 'general');
    }
  }, [selectedIdx, currentNote?.id]);

  // Click outside to close / save
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
  }, [title, text, author, color, category, currentNote?.id, isPresent]);

  const handleSave = () => {
    if (!text.trim() && !title.trim()) {
      if (currentNote) onDeleteNote(currentNote.id);
      return;
    }
    const noteToSave: ScriptNote = {
      id: currentNote?.id || `note-${Date.now()}`,
      name: title.trim() || undefined,
      text: text.trim(),
      author: author.trim() || defaultAuthor,
      color,
      category,
      createdAt: currentNote?.createdAt || new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      updatedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      paragraphId,
    };
    onSaveNote(noteToSave);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleSave();
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
      onClose();
    }
  };

  const activeTheme = SCRIPT_NOTE_THEMES[color] || SCRIPT_NOTE_THEMES.yellow;

  return (
    <FloatingSurface
      role="dialog" aria-label="ScriptNote"
      ref={popoverRef}
      onKeyDown={handleKeyDown}
      className="fixed z-50 w-88 bg-[#1f1f27] dc-bg-panel border border-white/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md flex flex-col transition-colors duration-150 "
      style={{
        top: position ? Math.min(position.top, window.innerHeight - 380) : '20%',
        left: position ? Math.min(position.left, window.innerWidth - 370) : '35%',
      }}
    >
      {/* Header with Color Accent Stripe */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: activeTheme.accentHex }}
      />

      <div className="p-3.5 space-y-3 bg-[#1f1f27] dc-bg-panel">
        {/* Top bar: Note count tabs + Close button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[10px] dc-meta uppercase font-bold tracking-wider text-neutral-400 flex items-center gap-1 mr-1">
              <MessageSquare className="w-3 h-3 text-amber-400" />
              ScriptNote
            </span>
            {notes.length > 1 &&
              notes.map((n, i) => {
                const noteColor = SCRIPT_NOTE_THEMES[n.color] || SCRIPT_NOTE_THEMES.yellow;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      handleSave();
                      setSelectedIdx(i);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] dc-meta font-mono transition-colors flex items-center gap-1 ${
                      selectedIdx === i
                        ? 'bg-white/20 text-white font-bold ring-1 ring-white/30'
                        : 'bg-black/30 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: noteColor.accentHex }}
                    />
                    #{i + 1}
                  </button>
                );
              })}
          </div>

          <div className="flex items-center gap-1">
            {onAddAnotherNote && (
              <button aria-label="Add Another Note to this line"
                onClick={() => {
                  handleSave();
                  onAddAnotherNote();
                }}
                className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded text-[10px] dc-meta flex items-center gap-0.5"
                title="Add Another Note to this line"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            <button aria-label="Close Note (Esc)"
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded"
              title="Close Note (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Note Name / Title Input */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title / Name (e.g. Director Note, VFX Cue)..."
            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/70 font-medium"
          />
          {/* Quick preset titles */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {COMMON_NOTE_TITLES.map((t) => (
              <button
                key={t}
                onClick={() => setTitle(t)}
                className={`text-[9px] dc-fine-meta px-1.5 py-0.5 rounded transition-colors ${
                  title === t
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                    : 'bg-white/5 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Note Body Text */}
        <div>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your note, feedback, or annotation here..."
            className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400/70 resize-none font-sans leading-relaxed"
            autoFocus
          />
        </div>

        {/* Color Palette Selector */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] dc-meta text-neutral-400 font-medium">Color:</span>
          <div className="flex items-center gap-1.5">
            {(Object.keys(SCRIPT_NOTE_THEMES) as ScriptNoteColor[]).map((cKey) => {
              const th = SCRIPT_NOTE_THEMES[cKey];
              const isSelected = color === cKey;
              return (
                <button aria-label={th.label}
                  key={cKey}
                  onClick={() => setColor(cKey)}
                  className={`w-4 h-4 rounded-full transition-transform flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-white scale-125' : 'hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: th.accentHex }}
                  title={th.label}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-black" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Author & Timestamp */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[10px] dc-meta text-neutral-400">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-neutral-500" />
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="bg-transparent border-b border-transparent focus:border-white/30 text-neutral-300 w-24 text-[10px] dc-meta focus:outline-none"
              placeholder="Author"
            />
          </div>

          <div className="flex items-center gap-1 text-[9px] dc-fine-meta text-neutral-500">
            <Calendar className="w-2.5 h-2.5" />
            <span>
              {currentNote?.createdAt
                ? currentNote.createdAt
                : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-1">
          {currentNote ? (
            <button
              onClick={() => {
                onDeleteNote(currentNote.id);
                onClose();
              }}
              className="text-[11px] text-red-400/80 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete Note
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
              className="px-3 py-1 text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors flex items-center gap-1 shadow-md"
            >
              <Check className="w-3 h-3" />
              Done
            </button>
          </div>
        </div>
      </div>
    </FloatingSurface>
  );
};
