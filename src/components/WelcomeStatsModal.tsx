import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React from 'react';
import {
  ProductivityStore,
  WritingGoals,
  DailyProductivityRecord,
  TimerState,
  SessionStats,
} from '../types/productivity';
import { getTodayKey, computeStreaks } from '../utils/productivityStorage';
import {
  X,
  Target,
  Flame,
  Clock,
  FileText,
  Play,
  ArrowRight,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  Award,
} from 'lucide-react';

interface WelcomeStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: ProductivityStore;
  onStartSprint: (minutes: number) => void;
  onOpenFullProductivity: () => void;
  screenplayTitle: string;
  totalPageCount: number;
  totalWordCount: number;
}

export const WelcomeStatsModal: React.FC<WelcomeStatsModalProps> = ({
  isOpen,
  onClose,
  store,
  onStartSprint,
  onOpenFullProductivity,
  screenplayTitle,
  totalPageCount,
  totalWordCount,
}) => {
  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  const todayKey = getTodayKey();
  const todayRecord = store.history[todayKey] || {
    date: todayKey,
    wordsAdded: 0,
    pagesAdded: 0,
    secondsSpent: 0,
    goalMet: false,
  };

  const streakData = computeStreaks(store.history);
  const wordsProgress = Math.min(
    100,
    Math.round((todayRecord.wordsAdded / Math.max(1, store.goals.dailyWordsGoal)) * 100)
  );
  const minutesToday = Math.round(todayRecord.secondsSpent / 60);

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1c1c24] dc-bg-panel border border-white/15 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200 duration-200">
        {/* Banner with Hollywood script header */}
        <div className="relative px-8 pt-8 pb-6 bg-gradient-to-b from-[#282838] to-[#1c1c24] border-b border-white/10">
          <button aria-label="Close dialog"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] dc-meta font-mono uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Final Draft 13 Welcome Center
            </span>
            <span className="text-xs text-neutral-400">Golden Gate Edition</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Welcome Back to Your Story
          </h2>
          <p className="text-sm text-neutral-300 mt-1 max-w-lg">
            Ready to dive into <strong className="text-amber-400">"{screenplayTitle}"</strong>? Here is your writing dashboard for today.
          </p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Daily Goal Card */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
              <div className="text-[10px] dc-meta uppercase tracking-wider font-semibold text-neutral-400 flex items-center justify-between">
                <span>Today's Target</span>
                <Target className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="my-2">
                <div className="text-xl font-bold font-mono text-white">
                  {todayRecord.wordsAdded} / {store.goals.dailyWordsGoal}
                </div>
                <div className="text-[11px] text-neutral-400">words written today</div>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-colors"
                  style={{ width: `${wordsProgress}%` }}
                />
              </div>
            </div>

            {/* Streak Card */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
              <div className="text-[10px] dc-meta uppercase tracking-wider font-semibold text-neutral-400 flex items-center justify-between">
                <span>Writing Streak</span>
                <Flame className="w-3.5 h-3.5 text-orange-400" />
              </div>
              {store.settings.showStreakInfo ? (
                <div className="my-2">
                  <div className="text-xl font-bold font-mono text-orange-400 flex items-baseline gap-1.5">
                    {streakData.currentStreak}
                    <span className="text-xs font-sans text-neutral-300 font-normal">
                      {streakData.currentStreak === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Longest: {streakData.longestStreak} days
                  </div>
                </div>
              ) : (
                <div className="my-2 text-[11px] text-neutral-400 italic">
                  Streaks hidden in settings
                </div>
              )}
              <div className="text-[10px] dc-meta text-neutral-500 font-mono">
                {streakData.totalDays} writing sessions
              </div>
            </div>

            {/* Project Overview Card */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
              <div className="text-[10px] dc-meta uppercase tracking-wider font-semibold text-neutral-400 flex items-center justify-between">
                <span>Screenplay Size</span>
                <FileText className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="my-2">
                <div className="text-xl font-bold font-mono text-white">
                  {totalPageCount} <span className="text-xs font-sans text-neutral-300 font-normal">pages</span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  {totalWordCount.toLocaleString()} words total
                </div>
              </div>
              <div className="text-[10px] dc-meta text-neutral-500 font-mono">
                Standard Hollywood Format
              </div>
            </div>
          </div>

          {/* Quick Actions Call to Action */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Launch a 25-Minute Writing Sprint
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Beat writer's block with a focused, uninterrupted Pomodoro session.
              </p>
            </div>

            <button
              onClick={() => {
                onStartSprint(25);
                onClose();
              }}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 shrink-0 transition-colors hover:scale-105"
            >
              <Play className="w-4 h-4 fill-black" />
              Start 25m Sprint
            </button>
          </div>

          {/* Bottom actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
            <button
              onClick={() => {
                onOpenFullProductivity();
                onClose();
              }}
              className="text-neutral-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              <span>Open Detailed Productivity Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition-colors"
            >
              Resume Writing
            </button>
          </div>
        </div>
      </div>
    </DialogOverlay>
  );
};
