import { BarSurface } from './ui/Presentation';
import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Replace,
  Check,
} from 'lucide-react';

interface FindReplaceBarProps {
  isOpen: boolean;
  onClose: () => void;
  onFind: (query: string, matchCase: boolean, wholeWord: boolean) => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplace: (replacement: string) => void;
  onReplaceAll: (query: string, replacement: string, matchCase: boolean, wholeWord: boolean) => void;
  matchCount: number;
  currentMatchIndex: number;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  isOpen,
  onClose,
  onFind,
  onFindNext,
  onFindPrev,
  onReplace,
  onReplaceAll,
  matchCount,
  currentMatchIndex,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [showReplace, setShowReplace] = useState(true);

  useEffect(() => {
    onFind(findText, matchCase, wholeWord);
  }, [findText, matchCase, wholeWord]);

  if (!isOpen) return null;

  return (
    <BarSurface className="dc-find bg-[#1c1c24] dc-bg-panel border-b border-white/15 px-4 py-2 flex flex-wrap items-center gap-2 text-xs text-neutral-200 shadow-xl z-20 shrink-0">
      {/* Find input */}
      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 min-w-[200px]">
        <Search className="w-3.5 h-3.5 text-neutral-500" />
        <input
          type="text"
          placeholder="Find in script..."
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) onFindPrev();
              else onFindNext();
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          className="bg-transparent text-xs text-white focus:outline-none w-full"
          autoFocus
        />
        {findText && (
          <span className="text-[10px] dc-meta font-mono text-neutral-400 whitespace-nowrap">
            {matchCount > 0 ? `${currentMatchIndex + 1} of ${matchCount}` : 'No matches'}
          </span>
        )}
      </div>

      {/* Navigation arrows */}
      <div className="flex items-center bg-black/40 rounded-lg border border-white/10 p-0.5">
        <button aria-label="Previous Match (Shift+Enter)"
          onClick={onFindPrev}
          disabled={matchCount === 0}
          className="p-1 hover:text-white disabled:opacity-40 rounded"
          title="Previous Match (Shift+Enter)"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button aria-label="Next Match (Enter)"
          onClick={onFindNext}
          disabled={matchCount === 0}
          className="p-1 hover:text-white disabled:opacity-40 rounded"
          title="Next Match (Enter)"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Case & Whole Word Toggles */}
      <div className="flex items-center gap-1 text-[11px]">
        <button
          onClick={() => setMatchCase(!matchCase)}
          className={`px-2 py-0.5 rounded font-mono border ${
            matchCase ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' : 'border-white/10 text-neutral-400'
          }`}
          title="Match Case (Aa)"
        >
          Aa
        </button>
        <button
          onClick={() => setWholeWord(!wholeWord)}
          className={`px-2 py-0.5 rounded font-mono border ${
            wholeWord ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' : 'border-white/10 text-neutral-400'
          }`}
          title="Whole Word (\b)"
        >
          \b
        </button>
      </div>

      {/* Replace input */}
      {showReplace && (
        <div className="flex items-center gap-1.5 ml-2">
          <div className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 min-w-[160px]">
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none w-full"
            />
          </div>
          <button
            onClick={() => onReplace(replaceText)}
            disabled={matchCount === 0}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 rounded-lg text-xs font-medium border border-white/10"
          >
            Replace
          </button>
          <button
            onClick={() => onReplaceAll(findText, replaceText, matchCase, wholeWord)}
            disabled={matchCount === 0}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-lg text-xs"
          >
            Replace All
          </button>
        </div>
      )}

      {/* Close button */}
      <button aria-label="Close (Esc)"
        onClick={onClose}
        className="ml-auto p-1 text-neutral-400 hover:text-white rounded"
        title="Close (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </BarSurface>
  );
};
