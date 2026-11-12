import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState } from 'react';
import {
  ScreenplayTemplate,
  TemplateCategory,
  getAllTemplates,
  saveUserTemplate,
  deleteUserTemplate,
  createDocumentFromTemplate,
} from '../utils/screenplayTemplates';
import { ScriptDocument } from '../types/script';
import {
  LayoutTemplate,
  X,
  Search,
  Sparkles,
  Film,
  Tv,
  BookOpen,
  Compass,
  Smartphone,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Bookmark,
} from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: ScriptDocument;
  onSelectTemplate: (newDoc: ScriptDocument) => void;
  onApplyStructureOnly: (template: ScreenplayTemplate) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  currentDocument,
  onSelectTemplate,
  onApplyStructureOnly,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [allTemplatesList, setAllTemplatesList] = useState<ScreenplayTemplate[]>(getAllTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('feature-screenplay');
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  const refreshTemplates = () => {
    setAllTemplatesList(getAllTemplates());
  };

  const categories = [
    'All',
    'Film',
    'Television',
    'Theater & Audio',
    'Graphic & Immersive',
    'Prose & Outline',
    'Micro Drama',
    'Structural Guides',
    'Custom',
  ];

  const filteredTemplates = allTemplatesList.filter((tmpl) => {
    const matchesCategory =
      selectedCategory === 'All' || tmpl.category === selectedCategory;
    const matchesSearch =
      tmpl.name.toLowerCase().includes(search.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(search.toLowerCase()) ||
      (tmpl.badge && tmpl.badge.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const activeTemplate =
    allTemplatesList.find((t) => t.id === selectedTemplateId) ||
    filteredTemplates[0] ||
    allTemplatesList[0];

  const handleCreateNew = (template: ScreenplayTemplate) => {
    const confirmChange = window.confirm(
      `Create a new script using "${template.name}"? This will initialize a new document in your workspace.`
    );
    if (!confirmChange) return;

    const newDoc = createDocumentFromTemplate(template);
    onSelectTemplate(newDoc);
    onClose();
  };

  const handleApplyStructure = (template: ScreenplayTemplate) => {
    onApplyStructureOnly(template);
    onClose();
  };

  const handleSaveCurrentAsCustom = () => {
    if (!customName.trim()) return;

    const newCustomTemplate: ScreenplayTemplate = {
      id: `custom-tmpl-${Date.now()}`,
      name: customName.trim(),
      category: 'Custom',
      description: customDesc.trim() || `User template based on "${currentDocument.titlePage.title}"`,
      badge: 'User Custom',
      targetPages: currentDocument.targetScriptPages || 110,
      initialTitlePage: { ...currentDocument.titlePage },
      sampleParagraphs: currentDocument.paragraphs.slice(0, 15).map((p) => ({
        type: p.type,
        text: p.text,
        characterExtension: p.characterExtension,
      })),
      starterBeats: currentDocument.beats || [],
      starterFlowLines: currentDocument.flowLines || [],
      starterLanes: currentDocument.outlineLanes || [],
      starterMarkers: currentDocument.outlineMarkers || [],
      isCustom: true,
    };

    saveUserTemplate(newCustomTemplate);
    refreshTemplates();
    setSelectedTemplateId(newCustomTemplate.id);
    setIsSavingCustom(false);
    setCustomName('');
    setCustomDesc('');
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this custom template?')) {
      deleteUserTemplate(id);
      refreshTemplates();
      if (selectedTemplateId === id) {
        setSelectedTemplateId('feature-screenplay');
      }
    }
  };

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#1e1e1e] border border-neutral-700 rounded-xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden text-neutral-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Final Draft 13 Template & Structure Library
              </h2>
              <p className="text-xs text-neutral-400">
                Industry formats, episodic television, graphic novels, vertical micro-dramas & classical storytelling guides
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSavingCustom(!isSavingCustom)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#252525] hover:bg-[#303030] text-neutral-200 border border-neutral-700 flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Save Current Script as Template</span>
            </button>
            <button aria-label="Close dialog"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Custom Save Drawer */}
        {isSavingCustom && (
          <div className="px-6 py-4 bg-[#222222] border-b border-neutral-700 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Custom Template Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. My Sci-Fi Series Format"
                className="w-full px-3 py-1.5 bg-[#2d2d2d] border border-neutral-700 rounded text-xs text-white"
              />
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Description / Notes
              </label>
              <input
                type="text"
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="e.g. Standard layout with Act breaks and custom notes"
                className="w-full px-3 py-1.5 bg-[#2d2d2d] border border-neutral-700 rounded text-xs text-white"
              />
            </div>
            <div className="flex items-end gap-2 pt-4">
              <button
                onClick={handleSaveCurrentAsCustom}
                disabled={!customName.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-medium shadow"
              >
                Save Template
              </button>
              <button
                onClick={() => setIsSavingCustom(false)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 border-b border-neutral-800 bg-[#161616] flex flex-wrap items-center justify-between gap-3">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white bg-[#202020] hover:bg-[#282828] border border-neutral-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates or guides..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#242424] border border-neutral-700 rounded-md text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Two-Pane Body */}
        <div className="flex-1 flex overflow-hidden bg-[#141414]">
          {/* Left: Template Grid / List */}
          <div className="w-7/12 border-r border-neutral-800 overflow-y-auto p-5 space-y-2.5">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Templates ({filteredTemplates.length})</span>
              <span className="text-[11px] text-neutral-500 font-normal">Click to preview</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTemplates.map((tmpl) => {
                const isSelected = tmpl.id === (activeTemplate?.id || '');
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-950/30 border-blue-500/70 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-[#1e1e1e] border-neutral-800 hover:border-neutral-700 hover:bg-[#242424]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <h4 className="text-xs font-bold text-white group-hover:text-blue-300">
                          {tmpl.name}
                        </h4>
                        {tmpl.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] dc-meta font-semibold rounded bg-neutral-800 text-neutral-300 border border-neutral-700 shrink-0">
                            {tmpl.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                        {tmpl.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-neutral-800/60 text-[10px] dc-meta text-neutral-500">
                      <span>{tmpl.category}</span>
                      <div className="flex items-center space-x-2">
                        <span>~{tmpl.targetPages} pgs</span>
                        {tmpl.isCustom && (
                          <button aria-label="Delete custom template"
                            onClick={(e) => handleDeleteCustom(tmpl.id, e)}
                            className="text-red-400 hover:text-red-300 p-0.5 rounded"
                            title="Delete custom template"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="py-12 text-center text-neutral-500 text-xs">
                No templates matched your search criteria.
              </div>
            )}
          </div>

          {/* Right: Detailed Preview Pane */}
          {activeTemplate && (
            <div className="w-5/12 overflow-y-auto p-6 space-y-5 bg-[#181818]">
              {/* Header Info */}
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 text-[10px] dc-meta font-semibold uppercase tracking-wider border border-blue-500/30">
                    {activeTemplate.category}
                  </span>
                  {activeTemplate.badge && (
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] dc-meta font-semibold border border-neutral-700">
                      {activeTemplate.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white">{activeTemplate.name}</h3>
                <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                  {activeTemplate.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleCreateNew(activeTemplate)}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create New Script from Template</span>
                </button>

                {activeTemplate.structureSummary && (
                  <button
                    onClick={() => handleApplyStructure(activeTemplate)}
                    className="w-full py-2 px-4 bg-[#252525] hover:bg-[#303030] text-neutral-200 border border-neutral-700 rounded-lg font-medium text-xs flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Apply Structure Guide to Current Script</span>
                  </button>
                )}
              </div>

              {/* Structure Milestones / Breakdown */}
              {activeTemplate.structureSummary && (
                <div className="bg-[#1f1f1f] border border-neutral-800 rounded-lg p-4 space-y-2">
                  <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-blue-400" />
                    <span>Structural Milestones</span>
                  </span>
                  <div className="space-y-1.5 pt-1">
                    {activeTemplate.structureSummary.map((item, i) => (
                      <div key={i} className="text-xs text-neutral-400 flex items-start space-x-2">
                        <span className="text-blue-500 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Script Snippet */}
              <div className="bg-[#1f1f1f] border border-neutral-800 rounded-lg p-4 space-y-2">
                <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
                  Sample Starter Layout
                </span>
                <div className="bg-[#fcfcf9] text-neutral-900 rounded p-4 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto space-y-1.5 border border-neutral-400/30">
                  {activeTemplate.sampleParagraphs.map((p, idx) => {
                    if (p.type === 'Scene Heading') {
                      return (
                        <p key={idx} className="font-bold text-neutral-900 uppercase">
                          {p.text}
                        </p>
                      );
                    }
                    if (p.type === 'Character') {
                      return (
                        <p key={idx} className="font-bold text-neutral-900 pl-16 uppercase">
                          {p.text}
                        </p>
                      );
                    }
                    if (p.type === 'Parenthetical') {
                      return (
                        <p key={idx} className="italic text-neutral-600 pl-12">
                          {p.text}
                        </p>
                      );
                    }
                    if (p.type === 'Dialogue') {
                      return (
                        <p key={idx} className="text-neutral-800 pl-8 pr-6">
                          {p.text}
                        </p>
                      );
                    }
                    if (p.type === 'New Act' || p.type === 'End of Act') {
                      return (
                        <p key={idx} className="font-bold text-center underline text-neutral-900 my-2">
                          {p.text}
                        </p>
                      );
                    }
                    return (
                      <p key={idx} className="text-neutral-700">
                        {p.text}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DialogOverlay>
  );
};
