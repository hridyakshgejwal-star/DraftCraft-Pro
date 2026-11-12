import { SelectionIndicator } from './ui/Presentation';
import React from 'react';
import {
  FileText,
  ShieldCheck,
  Cpu,
  Sun,
  Moon,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
} from 'lucide-react';
import { RevisionTier, REVISION_TIERS } from '../types/script';

interface MacOsTitlebarProps {
  documentTitle: string;
  revision: RevisionTier;
  productionMode: boolean;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenRustModal: () => void;
  onOpenRevisionsModal: () => void;
  onOpenTitlePageModal: () => void;
  activeView: 'script' | 'beatboard' | 'outline' | 'reports';
  onViewChange: (view: 'script' | 'beatboard' | 'outline' | 'reports') => void;
}

export const MacOsTitlebar: React.FC<MacOsTitlebarProps> = ({
  documentTitle,
  revision,
  productionMode,
  zoom,
  onZoomChange,
  isDarkMode,
  onToggleDarkMode,
  onOpenRustModal,
  onOpenRevisionsModal,
  onOpenTitlePageModal,
  activeView,
  onViewChange,
}) => {
  const currentRevConfig = REVISION_TIERS.find((r) => r.name === revision) || REVISION_TIERS[0];

  return (
    <header className="dc-titlebar h-11 bg-[#1a1a20]/95 dc-bg-chrome backdrop-blur-md border-b border-white/10 px-3.5 flex items-center justify-between select-none z-30 shrink-0">
      {/* Traffic lights & macOS identifier */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-2">
          <button
            title="Close Window"
            onClick={() => window.draftcraftDesktop?.windowAction('close')}
            className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-110 active:brightness-90 transition-colors flex items-center justify-center text-[7px] text-black/50 group"
          >
            <span className="opacity-0 group-hover:opacity-100">✕</span>
          </button>
          <button
            title="Minimize"
            onClick={() => window.draftcraftDesktop?.windowAction('minimize')}
            className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-110 active:brightness-90 transition-colors flex items-center justify-center text-[7px] text-black/50 group"
          >
            <span className="opacity-0 group-hover:opacity-100">−</span>
          </button>
          <button
            title="Zoom / Fullscreen"
            onClick={() => window.draftcraftDesktop?.windowAction('fullscreen')}
            className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-110 active:brightness-90 transition-colors flex items-center justify-center text-[7px] text-black/50 group"
          >
            <span className="opacity-0 group-hover:opacity-100">＋</span>
          </button>
        </div>

        {/* View Switcher Segmented Control */}
        <div role="group" aria-label="Workspace view" className="dc-view-switcher bg-black/30 p-0.5 rounded-lg border border-white/10 flex items-center text-xs">
          <button
            onClick={() => onViewChange('script')}
            aria-pressed={activeView === 'script'}
            className={`dc-view-button px-3 py-1 rounded-md font-medium transition-colors ${
              activeView === 'script'
                ? 'text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <SelectionIndicator selected={activeView === 'script'} />
            Script
          </button>
          <button
            onClick={() => onViewChange('beatboard')}
            aria-pressed={activeView === 'beatboard'}
            className={`dc-view-button px-3 py-1 rounded-md font-medium transition-colors ${
              activeView === 'beatboard'
                ? 'text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <SelectionIndicator selected={activeView === 'beatboard'} />
            Beat Board
          </button>
          <button
            onClick={() => onViewChange('outline')}
            aria-pressed={activeView === 'outline'}
            className={`dc-view-button px-3 py-1 rounded-md font-medium transition-colors ${
              activeView === 'outline'
                ? 'text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <SelectionIndicator selected={activeView === 'outline'} />
            Outline Map
          </button>
          <button
            onClick={() => onViewChange('reports')}
            aria-pressed={activeView === 'reports'}
            className={`dc-view-button px-3 py-1 rounded-md font-medium transition-colors ${
              activeView === 'reports'
                ? 'text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <SelectionIndicator selected={activeView === 'reports'} />
            Reports
          </button>
        </div>
      </div>

      {/* Center Title & Revision Badge */}
      <div className="flex items-center gap-2 max-w-md truncate">
        <button
          onClick={onOpenTitlePageModal}
          title="Click to edit Title Page"
          className="flex items-center gap-1.5 hover:bg-white/5 px-2 py-1 rounded text-neutral-200 text-xs font-semibold tracking-wide transition-colors group"
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span className="truncate">{documentTitle}</span>
          <span className="text-[10px] dc-meta text-neutral-500 font-normal group-hover:text-neutral-400">
            .fdx
          </span>
        </button>

        {productionMode && (
          <button
            onClick={onOpenRevisionsModal}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border border-white/10 flex items-center gap-1 transition-colors ${currentRevConfig.badgeBg} ${currentRevConfig.badgeText}`}
            title="Production Mode Active - Click to change revision set"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: currentRevConfig.borderHex }}
            />
            {currentRevConfig.name} Revision
          </button>
        )}
      </div>

      {/* Right Tools: Zoom, Dark Mode, Rust Core Indicator */}
      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        {/* Zoom Controls */}
        <div className="flex items-center bg-black/30 rounded-md border border-white/10 px-1 py-0.5">
          <button aria-label="Zoom Out"
            onClick={() => onZoomChange(Math.max(60, zoom - 10))}
            className="p-1 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 text-[11px] font-mono text-neutral-300 min-w-10 text-center">
            {zoom}%
          </span>
          <button aria-label="Zoom In"
            onClick={() => onZoomChange(Math.min(180, zoom + 10))}
            className="p-1 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dark / Light paper toggle */}
        <button aria-label={isDarkMode ? 'Switch to Ivory/White Paper' : 'Switch to Midnight Slate Paper'}
          onClick={onToggleDarkMode}
          className="p-1.5 hover:bg-white/10 rounded-md text-neutral-400 hover:text-neutral-200 transition-colors"
          title={isDarkMode ? 'Switch to Ivory/White Paper' : 'Switch to Midnight Slate Paper'}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Runtime badge */}
        {window.draftcraftDesktop ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-md" title="Editor runs locally in the bundled desktop runtime">
            <Cpu className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden sm:inline">Desktop</span>
          </span>
        ) : <button
          onClick={onOpenRustModal}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-md transition-colors"
          title="Inspect Native Rust Core & macOS 27 Golden Gate Architecture"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Rust Core 1.4</span>
        </button>}
      </div>
    </header>
  );
};
