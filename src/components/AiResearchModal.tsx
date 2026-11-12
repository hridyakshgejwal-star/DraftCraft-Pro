import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Plus,
} from 'lucide-react';

interface AiResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onInsertAction?: (text: string) => void;
}

const PRESET_QUERIES = [
  { label: 'Neural Interfaces & BCI Spec', query: 'Latest human brain-computer interface implants neural telemetry clinical trials 2026' },
  { label: 'Mag-Lev Rail Physics & Sound', query: 'Atmospheric acoustic signature of high speed magnetic levitation transit trains in rain' },
  { label: 'Cyber Forensic Protocol', query: 'Police procedural chain of custody for optical biometric hardware evidence' },
  { label: 'Geneva BioTech Regulations', query: 'International jurisdiction and legal compliance for synthetic organoid neural networks' },
];

export const AiResearchModal: React.FC<AiResearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onInsertAction,
}) => {
  const [query, setQuery] = useState(initialQuery || 'Atmospheric acoustic signature of high speed magnetic levitation transit trains in rain');
  const [category, setCategory] = useState('fact-check');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  const handleRunResearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResultText(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          category,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to perform grounded script research');
      }

      setResultText(data.text);
      setSearchQueries(data.searchQueries || []);
      setGroundingChunks(data.groundingChunks || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error conducting research with Gemini 3.5 Flash Search Grounding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f1f28] dc-bg-panel border border-white/15 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col text-neutral-200">
        {/* Modal Header */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Screenplay Story Research & Verisimilitude</span>
                <span className="text-[10px] dc-meta font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  gemini-3.5-flash + Google Search
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Ground scenes in accurate real-world facts, protocols, and authentic dialogue terminology.
              </p>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-md">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div>
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
              Quick Research Topics:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUERIES.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(p.query)}
                  className="px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300 border border-white/5 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Query Input */}
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-300 font-medium">Research Topic or Scene Question:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunResearch()}
                placeholder="Ask about medical procedures, military tactics, legal rules, historical facts..."
                className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={handleRunResearch}
                disabled={loading || !query.trim()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Research</span>
              </button>
            </div>
          </div>

          {/* Grounded Results Display */}
          {resultText && (
            <div className="space-y-4 pt-2">
              {/* Search Grounding Web Queries Badge */}
              {searchQueries.length > 0 && (
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/10 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-neutral-400">Grounded via Google Search:</span>
                  <div className="flex flex-wrap gap-1">
                    {searchQueries.map((q, i) => (
                      <span key={i} className="px-2 py-0.5 bg-neutral-800 rounded font-mono text-[10px] dc-meta text-emerald-300">
                        "{q}"
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Research Notes Text */}
              <div className="bg-[#14141c] p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Verified Screenplay Research Notes
                  </span>
                  {onInsertAction && (
                    <button
                      onClick={() => onInsertAction(resultText.slice(0, 300))}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Insert excerpt into Script</span>
                    </button>
                  )}
                </div>
                <div className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed">
                  {resultText}
                </div>
              </div>

              {/* Sources / Grounding Chunks */}
              {groundingChunks.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Referenced Sources:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {groundingChunks.map((chunk, idx) => {
                      const web = chunk.web;
                      if (!web) return null;
                      return (
                        <a
                          key={idx}
                          href={web.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 bg-black/30 hover:bg-black/50 border border-white/10 rounded-lg text-xs text-neutral-300 flex items-center justify-between group transition-colors"
                        >
                          <span className="truncate pr-2 font-medium group-hover:text-emerald-300">
                            {web.title || web.uri}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-neutral-500 shrink-0 group-hover:text-emerald-400" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
