import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  Camera,
  Layers,
  FileText,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface AiImageAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertAction?: (text: string) => void;
}

// Built-in sample storyboard image (Data URL SVG of a sci-fi atmospheric cyberpunk skyline)
const SAMPLE_STORYBOARD_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230b0b12"/><circle cx="300" cy="180" r="100" fill="%23ec4899" opacity="0.3"/><polygon points="40,400 120,160 200,400" fill="%23181829"/><polygon points="180,400 280,100 380,400" fill="%231e1e36"/><polygon points="340,400 440,140 540,400" fill="%23141424"/><rect x="0" y="340" width="600" height="60" fill="%2309090f"/><line x1="0" y1="340" x2="600" y2="340" stroke="%233b82f6" stroke-width="3"/><text x="300" y="375" fill="%2360a5fa" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">SCENE 1: ORBITAL MAG-LEV TRESTLE / NIGHT</text></svg>`;

export const AiImageAnalysisModal: React.FC<AiImageAnalysisModalProps> = ({
  isOpen,
  onClose,
  onInsertAction,
}) => {
  const [imageBase64, setImageBase64] = useState<string>(SAMPLE_STORYBOARD_SVG);
  const [imagePreview, setImagePreview] = useState<string>(SAMPLE_STORYBOARD_SVG);
  const [mimeType, setMimeType] = useState('image/svg+xml');
  const [prompt, setPrompt] = useState(
    'Analyze this production storyboard concept for lighting, cinematography (lens, depth of field), set design, and write 3 evocative spec script action lines.'
  );
  const [sceneContext, setSceneContext] = useState('EXT. ORBITAL MAG-LEV TRESTLE - NIGHT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageBase64(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setAnalysisText(null);

    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          prompt,
          sceneContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze image with Gemini 3.1 Pro Preview');
      }

      setAnalysisText(data.analysis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred during image analysis');
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
            <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Storyboard & Visual Reference Analysis</span>
                <span className="text-[10px] dc-meta font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  gemini-3.1-pro-preview
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Upload scene storyboards, moodboards, or location scout photos to extract cinematic action lines.
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Image Upload Area / Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual Preview Box */}
            <div className="bg-black/40 border border-white/15 rounded-xl p-3 flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden group">
              {imagePreview ? (
                <div className="relative w-full h-48 flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Scene Storyboard Preview"
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-white rounded-lg border border-white/20 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace Photo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer flex flex-col items-center gap-2 text-neutral-400 hover:text-white"
                >
                  <Upload className="w-8 h-8 text-neutral-500" />
                  <span className="text-xs">Click to upload JPG, PNG, or WebP</span>
                </div>
              )}
            </div>

            {/* Analysis Parameters */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 font-medium block mb-1">Target Scene Heading:</label>
                <input
                  type="text"
                  value={sceneContext}
                  onChange={(e) => setSceneContext(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-neutral-200 font-screenplay focus:outline-none focus:border-pink-500/50"
                />
              </div>

              <div>
                <label className="text-neutral-400 font-medium block mb-1">Director's Analysis Directive:</label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-lg p-2.5 text-neutral-200 focus:outline-none focus:border-pink-500/50 resize-none font-mono text-[11px]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium flex items-center justify-center gap-1.5 border border-white/10"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Local Photo</span>
                </button>
                <button
                  onClick={() => {
                    setImageBase64(SAMPLE_STORYBOARD_SVG);
                    setImagePreview(SAMPLE_STORYBOARD_SVG);
                    setMimeType('image/svg+xml');
                  }}
                  className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs"
                  title="Load sample cyberpunk storyboard"
                >
                  Sample Concept
                </button>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          {analysisText && (
            <div className="bg-[#14141c] p-4 rounded-xl border border-white/10 space-y-3 pt-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-semibold text-pink-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Cinematography & Screenplay Breakdown (Gemini 3.1 Pro)
                </span>
                {onInsertAction && (
                  <button
                    onClick={() => onInsertAction(analysisText.slice(0, 300))}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insert Action Lines to Script</span>
                  </button>
                )}
              </div>
              <div className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed font-mono">
                {analysisText}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white"
          >
            Close
          </button>
          <button
            onClick={handleAnalyze}
            disabled={loading || !imageBase64}
            className="px-5 py-2 bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-black font-bold text-xs rounded-lg flex items-center gap-2 shadow-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Visual Elements...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Analyze with Gemini 3.1 Pro</span>
              </>
            )}
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
