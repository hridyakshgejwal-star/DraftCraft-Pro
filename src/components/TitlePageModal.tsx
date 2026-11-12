import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useEffect, useState } from 'react';
import { TitlePage } from '../types/script';
import {
  FileText,
  X,
  Check,
  Eye,
  Sparkles,
  AlignLeft,
  Calendar,
  User,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface TitlePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  titlePage: TitlePage;
  onSave: (updated: TitlePage) => void;
}

export const TitlePageModal: React.FC<TitlePageModalProps> = ({
  isOpen,
  onClose,
  titlePage,
  onSave,
}) => {
  const [formData, setFormData] = useState<TitlePage>({
    title: titlePage.title || '',
    author: titlePage.author || '',
    screenplayBy: titlePage.screenplayBy || '',
    storyBy: titlePage.storyBy || '',
    basedOn: titlePage.basedOn || '',
    additionalCredits: titlePage.additionalCredits || '',
    draftDate: titlePage.draftDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    contact: titlePage.contact || '',
    copyright: titlePage.copyright || `Copyright © ${new Date().getFullYear()}`,
    customNotes: titlePage.customNotes || '',
    includeInPdf: titlePage.includeInPdf ?? true,
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [uppercaseTitle, setUppercaseTitle] = useState(true);

  useEffect(() => {
    if (isOpen) setFormData({ ...titlePage });
  }, [isOpen, titlePage]);

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  const handleChange = (field: keyof TitlePage, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onSave(formData);
    onClose();
  };

  const displayTitle = uppercaseTitle ? formData.title.toUpperCase() : formData.title;

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#1e1e1e] border border-neutral-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#181818]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Final Draft Title Page Studio
              </h2>
              <p className="text-xs text-neutral-400">
                Industry-standard screenplay cover sheet, credits, legal declarations & PDF inclusion
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switch */}
            <div className="flex items-center bg-[#252525] p-1 rounded-lg border border-neutral-700/60 text-xs">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'editor'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Metadata Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md font-medium flex items-center space-x-1.5 transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Page Preview</span>
              </button>
            </div>

            <button aria-label="Close dialog"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#161616]">
          {activeTab === 'editor' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Core Fields */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-[#202020] border border-neutral-800 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-700/50">
                    <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>Script Title & Primary Credits</span>
                    </span>
                    <label className="flex items-center space-x-2 text-xs text-neutral-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uppercaseTitle}
                        onChange={(e) => setUppercaseTitle(e.target.checked)}
                        className="rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-0"
                      />
                      <span>Upper Case Title</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Project Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="e.g. INCEPTION / CITIZEN KANE"
                      className="w-full px-3 py-2 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-sm focus:outline-none focus:border-blue-500 font-mono tracking-wider"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center space-x-1">
                        <User className="w-3 h-3 text-neutral-400" />
                        <span>Written By</span>
                      </label>
                      <input
                        type="text"
                        value={formData.author}
                        onChange={(e) => handleChange('author', e.target.value)}
                        placeholder="Author name(s)"
                        className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Screenplay By (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.screenplayBy || ''}
                        onChange={(e) => handleChange('screenplayBy', e.target.value)}
                        placeholder="If separate from story"
                        className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Story By (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.storyBy || ''}
                        onChange={(e) => handleChange('storyBy', e.target.value)}
                        placeholder="Story credited to"
                        className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Based on Material By
                      </label>
                      <input
                        type="text"
                        value={formData.basedOn}
                        onChange={(e) => handleChange('basedOn', e.target.value)}
                        placeholder="e.g. Based on the novel by..."
                        className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Additional Credits / Producers
                    </label>
                    <input
                      type="text"
                      value={formData.additionalCredits || ''}
                      onChange={(e) => handleChange('additionalCredits', e.target.value)}
                      placeholder="e.g. Produced by Jane Doe / Co-Writer John Smith"
                      className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Date & Revision details */}
                <div className="bg-[#202020] border border-neutral-800 rounded-lg p-5 space-y-4">
                  <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-neutral-700/50">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Draft Status & Date</span>
                  </span>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Draft Date / Revision Set
                    </label>
                    <input
                      type="text"
                      value={formData.draftDate}
                      onChange={(e) => handleChange('draftDate', e.target.value)}
                      placeholder="e.g. March 15, 2026 (Pink Revised Draft)"
                      className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Custom Text / Production Notes (Center-Bottom)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.customNotes || ''}
                      onChange={(e) => handleChange('customNotes', e.target.value)}
                      placeholder="e.g. Shooting Draft - For Cast & Crew Only"
                      className="w-full px-3 py-1.5 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Contact & Legal */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[#202020] border border-neutral-800 rounded-lg p-5 space-y-4">
                  <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-neutral-700/50">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Contact Info & Legal Protection</span>
                  </span>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Contact Information (Bottom-Left)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.contact}
                      onChange={(e) => handleChange('contact', e.target.value)}
                      placeholder={"Agent / Manager / Writer\nEmail: writer@cinema.com\nPhone: (555) 019-2834"}
                      className="w-full px-3 py-2 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500 font-mono resize-none"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Appears in bottom-left corner in standard Final Draft format.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Copyright Notice / WGA # (Bottom-Right)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.copyright}
                      onChange={(e) => handleChange('copyright', e.target.value)}
                      placeholder={"Copyright © 2026\nWGA Registration #129482\nAll Rights Reserved"}
                      className="w-full px-3 py-2 bg-[#2a2a2a] border border-neutral-700 rounded-md text-white text-xs focus:outline-none focus:border-blue-500 font-mono resize-none"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Appears in bottom-right corner for copyright & guild protection.
                    </p>
                  </div>
                </div>

                {/* PDF Inclusion Options */}
                <div className="bg-[#202020] border border-neutral-800 rounded-lg p-5 space-y-3">
                  <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-neutral-700/50">
                    <AlignLeft className="w-3.5 h-3.5 text-blue-400" />
                    <span>PDF Export Inclusion</span>
                  </span>

                  <label className="flex items-center space-x-3 p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includeInPdf ?? true}
                      onChange={(e) => handleChange('includeInPdf', e.target.checked)}
                      className="rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-0"
                    />
                    <div>
                      <div className="text-xs font-medium text-white">Include Title Page in PDF</div>
                      <div className="text-[11px] text-neutral-400">
                        When checked, page 1 in PDF will be this unnumbered cover sheet.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* Live Page Preview (US Letter 8.5 x 11 ratio preview) */
            <div className="flex justify-center items-center py-4">
              <div
                className="w-[500px] h-[645px] bg-[#fbfbf9] text-neutral-900 shadow-2xl rounded p-12 flex flex-col justify-between font-mono select-none border border-neutral-300"
                style={{ fontFamily: "'Courier Prime', Courier, monospace" }}
              >
                {/* Upper third spacer */}
                <div className="h-20" />

                {/* Center Title & Author Block */}
                <div className="text-center space-y-4">
                  <h1 className="text-xl font-bold tracking-widest text-black underline underline-offset-4">
                    {displayTitle || 'UNTITLED SCREENPLAY'}
                  </h1>

                  <div className="text-xs space-y-1 pt-2">
                    <p className="text-neutral-600 italic">written by</p>
                    <p className="font-semibold text-sm text-neutral-900">
                      {formData.author || 'Writer Name'}
                    </p>
                  </div>

                  {formData.screenplayBy && (
                    <div className="text-xs space-y-0.5">
                      <p className="text-neutral-600 italic">screenplay by</p>
                      <p className="font-semibold text-neutral-900">{formData.screenplayBy}</p>
                    </div>
                  )}

                  {formData.storyBy && (
                    <div className="text-xs space-y-0.5">
                      <p className="text-neutral-600 italic">story by</p>
                      <p className="font-semibold text-neutral-900">{formData.storyBy}</p>
                    </div>
                  )}

                  {formData.basedOn && (
                    <div className="text-xs space-y-0.5 pt-2">
                      <p className="text-neutral-600 italic">based upon</p>
                      <p className="text-neutral-800">{formData.basedOn}</p>
                    </div>
                  )}

                  {formData.additionalCredits && (
                    <div className="text-[11px] text-neutral-700 pt-2">
                      {formData.additionalCredits}
                    </div>
                  )}
                </div>

                {/* Bottom Footer Section */}
                <div className="space-y-6">
                  {/* Custom Draft Notes (Center) */}
                  {formData.customNotes && (
                    <div className="text-center text-[10px] dc-meta text-neutral-600 uppercase tracking-wider">
                      {formData.customNotes}
                    </div>
                  )}

                  <div className="flex justify-between items-end text-[11px] leading-tight">
                    {/* Left: Contact & Draft Date */}
                    <div className="space-y-2 max-w-[200px]">
                      {formData.draftDate && (
                        <div className="text-neutral-700 font-semibold">{formData.draftDate}</div>
                      )}
                      {formData.contact && (
                        <div className="whitespace-pre-line text-neutral-800">
                          {formData.contact}
                        </div>
                      )}
                    </div>

                    {/* Right: Copyright */}
                    <div className="text-right whitespace-pre-line text-neutral-800 max-w-[200px]">
                      {formData.copyright || `Copyright © ${new Date().getFullYear()}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-[#181818]">
          <div className="flex items-center space-x-2 text-xs text-neutral-400">
            <HelpCircle className="w-4 h-4 text-neutral-500" />
            <span>Title page is automatically included on PDF export and conforms to industry layout.</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm flex items-center space-x-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Apply Title Page</span>
            </button>
          </div>
        </div>
      </div>
    </DialogOverlay>
  );
};
