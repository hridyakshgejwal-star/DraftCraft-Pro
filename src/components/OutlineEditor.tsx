import {documentLayout} from '../production/layout';
import {outlineExport} from '../production/planning';
import {downloadText} from '../production/ProductionPanel';
import React, { useState } from 'react';
import {
  OutlineLane,
  OutlineMarker,
  Paragraph,
  ScriptDocument,
} from '../types/script';
import { calculateScriptStats } from '../utils/pagination';
import { buildStoryIndex, markerPosition, resolveAnchor } from '../story/model';
import {
  Layers,
  Plus,
  Trash2,
  ChevronRight,
  MapPin,
  Clock,
  Send,
  ZoomIn,
  ZoomOut,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface OutlineEditorProps {
  document: ScriptDocument;
  onUpdateDocument: (doc: ScriptDocument) => void;
  onJumpToScene: (sceneIndex: number) => void;
  onSendMarkerToScript: (marker: OutlineMarker) => void;
}

export const OutlineEditor: React.FC<OutlineEditorProps> = ({
  document,
  onUpdateDocument,
  onJumpToScene,
  onSendMarkerToScript,
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [targetPages, setTargetPages] = useState(document.targetScriptPages || 110);
  const [newLaneName, setNewLaneName] = useState('');

  const stats = calculateScriptStats(document.paragraphs);
  const totalPixels = targetPages * 14 * zoom; // 14px per page at 100%

  const lanes = document.outlineLanes;
  const storyIndex=buildStoryIndex(document.paragraphs,document.lockedPages,documentLayout(document).pages);
  const markers = document.outlineMarkers.map(m=>({...m,startPage:markerPosition(m,storyIndex)+1,endPage:m.endAnchor?resolveAnchor(m.endAnchor,storyIndex)+1:m.endPage}));

  const handleAddLane = () => {
    const name = newLaneName.trim() || `Custom Lane ${lanes.length + 1}`;
    const newLane: OutlineLane = {
      id: `lane-${Date.now()}`,
      name,
      type: 'custom',
      color: '#a855f7',
    };
    onUpdateDocument({
      ...document,
      outlineLanes: [...lanes, newLane],
    });
    setNewLaneName('');
  };

  const handleDeleteLane = (laneId: string) => {
    onUpdateDocument({
      ...document,
      outlineLanes: lanes.filter((l) => l.id !== laneId),
      outlineMarkers: markers.filter((m) => m.laneId !== laneId),
    });
  };

  const handleAddMarker = (laneId: string) => {
    const newMarker: OutlineMarker = {
      id: `marker-${Date.now()}`,
      laneId,
      title: 'New Story Milestone',
      description: 'Major narrative shift, twist, or confrontation...',
      startPage: 10,
      endPage: 25,
      color: '#3b82f6',
    };
    onUpdateDocument({
      ...document,
      outlineMarkers: [...markers, newMarker],
    });
  };

  const handleUpdateMarker = (updated: OutlineMarker) => {
    const original=document.outlineMarkers.find(m=>m.id===updated.id);
    if(original && (updated.startPage!==markerPosition(original,storyIndex)+1 || updated.endPage!==(original.endAnchor?resolveAnchor(original.endAnchor,storyIndex)+1:original.endPage)))updated={...updated,anchor:{page:updated.startPage},endAnchor:undefined};
    onUpdateDocument({
      ...document,
      outlineMarkers: markers.map((m) => (m.id === updated.id ? updated : m)),
    });
  };

  const handleDeleteMarker = (id: string) => {
    onUpdateDocument({
      ...document,
      outlineMarkers: markers.filter((m) => m.id !== id),
    });
  };

  return (
    <div className="dc-outline flex-1 bg-[#14141a] dc-bg-workspace flex flex-col overflow-hidden select-none text-neutral-200">
      <div className="flex gap-2 p-2 text-xs"><button onClick={()=>downloadText('Outline.md',outlineExport(document,'markdown'),'text/markdown')}>Export Outline Markdown</button><button onClick={()=>downloadText('Outline.json',outlineExport(document,'json'),'application/json')}>Export Outline Data</button></div>
      {/* Top Toolbar */}
      <div className="dc-toolbar h-11 bg-[#1b1b24] dc-bg-chrome border-b border-white/10 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Layers className="w-4 h-4 text-pink-400" />
            <span>Multi-Lane Outline Timeline & Story Map</span>
          </div>

          <div className="flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
            <span className="text-[11px] text-neutral-400">Target Length:</span>
            <input
              type="number"
              value={targetPages}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 110;
                setTargetPages(val);
                onUpdateDocument({ ...document, targetScriptPages: val });
              }}
              className="w-12 bg-transparent text-white font-mono text-xs focus:outline-none"
            />
            <span className="text-[11px] text-neutral-400">pages</span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="New lane name..."
              value={newLaneName}
              onChange={(e) => setNewLaneName(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pink-500/50"
            />
            <button
              onClick={handleAddLane}
              className="px-2.5 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lane</span>
            </button>
          </div>
        </div>

        {/* Right Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/40 rounded-md border border-white/10 px-1 py-0.5 text-xs">
            <button aria-label="Zoom Out Timeline"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-1 hover:text-white"
              title="Zoom Out Timeline"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-neutral-300">
              {Math.round(zoom * 100)}%
            </span>
            <button aria-label="Zoom In Timeline"
              onClick={() => setZoom(Math.min(2.0, zoom + 0.1))}
              className="p-1 hover:text-white"
              title="Zoom In Timeline"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Viewport */}
      <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col">
        {/* Timeline Header Ruler (Page Numbers & Minutes) */}
        <div className="h-8 bg-[#181822] border-b border-white/10 flex items-center shrink-0 sticky top-0 z-20">
          <div className="w-48 bg-[#181822] border-r border-white/10 px-3 text-[11px] font-bold text-neutral-400 shrink-0 uppercase tracking-wider">
            Story Tracks
          </div>

          <div className="relative h-full flex-1" style={{ minWidth: `${totalPixels}px` }}>
            {Array.from({ length: Math.ceil(targetPages / 10) + 1 }).map((_, i) => {
              const pageNum = i * 10;
              const leftPos = pageNum * 14 * zoom;

              return (
                <div
                  key={pageNum}
                  className="absolute top-0 bottom-0 border-l border-white/10 pl-1 text-[10px] dc-meta font-mono text-neutral-500 select-none flex items-center"
                  style={{ left: `${leftPos}px` }}
                >
                  <span>p.{pageNum}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Script Lane (Real Scenes in Screenplay plotted horizontally) */}
        <div className="min-h-12 bg-black/30 border-b border-white/10 flex items-center shrink-0">
          <div className="w-48 border-r border-white/10 px-3 py-2 text-xs font-semibold text-amber-300 shrink-0 flex items-center justify-between">
            <span>Script Scenes ({stats.sceneCount})</span>
            <span className="text-[10px] dc-meta text-neutral-500 font-mono">Live</span>
          </div>

          <div className="relative h-full flex-1 py-1.5" style={{ minWidth: `${totalPixels}px` }}>
            {stats.scenes.map((scene, idx) => {
              // Estimate page position for each scene based on distribution
              const estimatedPage = (storyIndex.positions.get(document.paragraphs[scene.index].id) || 0)+1;
              const leftPos = estimatedPage * 14 * zoom;

              return (
                <button
                  key={idx}
                  onClick={() => onJumpToScene(scene.index)}
                  className="absolute top-1.5 bg-neutral-800 hover:bg-amber-500 hover:text-black border border-white/20 px-2 py-0.5 rounded text-[10px] dc-meta font-screenplay font-bold truncate max-w-44 transition-colors shadow-sm"
                  style={{ left: `${leftPos}px` }}
                  title={`${scene.heading} (Jump to Scene in Script Editor)`}
                >
                  <span>#{scene.number || idx + 1}: {scene.heading}</span>
                </button>
              );
            })}
          </div>
        </div>

        {document.beats.some(b=>b.sceneId) && <div className="p-3 border-b border-white/10 flex gap-2 flex-wrap" aria-label="Linked Story Beats">{document.beats.filter(b=>b.sceneId).map(b=>{const scene=storyIndex.scenes.find(s=>s.id===b.sceneId);return <button key={b.id} disabled={!scene} onClick={()=>scene&&onJumpToScene(scene.index)} className="px-2 py-1 rounded border text-xs" style={{borderColor:b.color}}>{b.title} · {scene?'p.'+scene.startPage:'Linked scene removed'}</button>})}</div>}
        {/* User-Defined Lanes Tracks */}
        {lanes.map((lane) => {
          const laneMarkers = markers.filter((m) => m.laneId === lane.id);

          return (
            <div
              key={lane.id}
              className="min-h-24 bg-[#161620] border-b border-white/10 flex items-stretch shrink-0 group"
            >
              {/* Lane Info Column */}
              <div className="w-48 bg-[#181822] border-r border-white/10 p-3 flex flex-col justify-between shrink-0">
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="font-bold text-xs truncate"
                      style={{ color: lane.color }}
                    >
                      {lane.name}
                    </span>
                    <button aria-label="Delete Lane"
                      onClick={() => handleDeleteLane(lane.id)}
                      className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 p-0.5"
                      title="Delete Lane"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] dc-meta text-neutral-500 uppercase tracking-widest">
                    {lane.type} Track
                  </span>
                </div>

                <button
                  onClick={() => handleAddMarker(lane.id)}
                  className="mt-2 text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Marker</span>
                </button>
              </div>

              {/* Lane Track Area with Plotted Blocks */}
              <div
                className="relative h-full flex-1 py-2 overflow-hidden"
                style={{ minWidth: `${totalPixels}px` }}
              >
                {/* 10-page grid guides */}
                {Array.from({ length: Math.ceil(targetPages / 10) + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-white/5 pointer-events-none"
                    style={{ left: `${i * 10 * 14 * zoom}px` }}
                  />
                ))}

                {/* Markers */}
                {laneMarkers.map((marker) => {
                  const left = marker.startPage * 14 * zoom;
                  const width = Math.max(80, (marker.endPage - marker.startPage) * 14 * zoom);

                  return (
                    <div
                      key={marker.id}
                      className="dc-outline-marker absolute top-2 rounded-lg border p-2 flex flex-col justify-between shadow-lg text-xs cursor-pointer group/marker transition-colors"
                      style={{
                        left: `${left}px`,
                        width: `${width}px`,
                        height: '76px',
                        backgroundColor: '#1f1f2d',
                        borderColor: marker.color,
                        borderLeftWidth: '4px',
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <input
                          type="text"
                          value={marker.title}
                          onChange={(e) => handleUpdateMarker({ ...marker, title: e.target.value })}
                          className="bg-transparent font-bold text-white text-[11px] focus:outline-none w-full truncate"
                        />
                        <button
                          onClick={() => handleDeleteMarker(marker.id)}
                          className="text-neutral-500 hover:text-red-400 opacity-0 group-hover/marker:opacity-100 p-0.5"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <p className="text-[10px] dc-meta text-neutral-400 line-clamp-1">
                        {marker.description}
                      </p>

                      <div className="flex items-center justify-between text-[9px] dc-fine-meta text-neutral-400 font-mono pt-1 border-t border-white/5">
                        <span>pp. {marker.startPage}–{marker.endPage}</span>
                        <button
                          onClick={() => onSendMarkerToScript(marker)}
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 hover:underline"
                          title="Transfer milestone to screenplay as Scene & Action"
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>To Script</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
