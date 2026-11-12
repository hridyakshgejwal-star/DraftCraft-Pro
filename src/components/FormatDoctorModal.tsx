import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, {useState} from 'react';
import { Paragraph } from '../types/script';
import { runFormattingDoctor, DOCTOR_CHECKS, FormatIssue } from '../utils/formatDoctor';
import {
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Wrench,
} from 'lucide-react';

interface FormatDoctorModalProps {
  format?:import('../formats/model').WritingFormat;preferences:import('../production/model').StudioState['doctor'];onPreferences:(value:import('../production/model').StudioState['doctor'])=>void;onJump:(id:string)=>void;
  isOpen: boolean;
  onClose: () => void;
  paragraphs: Paragraph[];
  onApplyFix: (issue: FormatIssue) => void;
  onFixAll: () => void;
}

export const FormatDoctorModal: React.FC<FormatDoctorModalProps> = ({
  isOpen,format,preferences,onPreferences,onJump,
  onClose,
  paragraphs,
  onApplyFix,
  onFixAll,
}) => {
  const [issueIndex,setIssueIndex]=useState(0);
  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  const issues = runFormattingDoctor(paragraphs,format,preferences);
  const autoFixableCount = issues.filter((i) => (i.fixedParagraph||i.fixedFormat)).length;

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f1f28] dc-bg-panel border border-white/15 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200">
        {/* Header */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Screenplay Formatting Assistant (Script Doctor)</span>
                <span className="text-[10px] dc-meta font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {issues.length} {issues.length === 1 ? 'Notice' : 'Notices'}
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Checks the selected writing format, element context, capitalization and spacing.
              </p>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-md">
            ✕
          </button>
        </div>

        {/* Action bar */}
        <div className="p-3 bg-black/30 border-b border-white/10 flex items-center justify-between text-xs">
          <span className="text-neutral-400">
            {issues.length === 0
              ? 'No issues found by the selected checks.'
              : `${issues.length} formatting anomalies identified.`}
          </span>
          {autoFixableCount > 0 && (
            <button
              onClick={onFixAll}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fix All ({autoFixableCount})</span>
            </button>
          )}
        </div>

        <div className="p-3 flex gap-3 flex-wrap text-xs">{DOCTOR_CHECKS.map(check=><label key={check}><input type="checkbox" checked={preferences.checks.includes(check)} onChange={e=>onPreferences({...preferences,checks:e.target.checked?[...preferences.checks,check]:preferences.checks.filter(v=>v!==check)})}/>{check}</label>)}<label><input type="checkbox" checked={preferences.beforePrint} onChange={e=>onPreferences({...preferences,beforePrint:e.target.checked})}/>Check before printing</label><button disabled={!issues.length} onClick={()=>{const next=(issueIndex+1)%issues.length;setIssueIndex(next);onJump(issues[next].paragraphId);}}>Next Issue</button><button disabled={!preferences.ignored.length} onClick={()=>onPreferences({...preferences,ignored:[]})}>Reset Ignored Issues</button></div>
        {/* Issues list */}
        <div className="p-5 flex-1 max-h-[60vh] overflow-y-auto space-y-3 text-xs">
          {issues.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-white">Selected checks completed.</div>
              <p className="text-neutral-400 max-w-sm mx-auto text-xs">
                This is a targeted formatting check; it does not certify production compliance or guess missing scene details.
              </p>
            </div>
          ) : (
            issues.map((issue, idx) => (
              <div
                key={idx}
                className="bg-black/30 border border-white/10 rounded-xl p-3.5 flex items-start justify-between gap-3 group hover:border-white/20 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  {issue.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-neutral-200 flex items-center gap-2">
                      <span>{issue.title}</span>
                      <span className="text-[10px] dc-meta font-mono text-neutral-500">
                        Element #{issue.paragraphIndex + 1}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                      {issue.description}
                    </div>
                  </div>
                </div>

                <button onClick={()=>onPreferences({...preferences,ignored:[...preferences.ignored,issue.id]})}>Ignore</button>
                <button onClick={()=>onJump(issue.paragraphId)}>Show</button>
                {(issue.fixedParagraph||issue.fixedFormat) && issue.fixActionLabel && (
                  <button
                    onClick={() => onApplyFix(issue)}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded-lg text-xs font-semibold shrink-0 border border-white/10 transition-colors flex items-center gap-1"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>{issue.fixActionLabel}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs rounded-lg transition-colors"
          >
            Close Doctor
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
