import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState } from 'react';
import {
  ProductivityStore,
  WritingGoals,
  DailyProductivityRecord,
  TimerState,
  SessionStats,
  GoalType,
} from '../types/productivity';
import {
  saveProductivityStore,
  formatDateLabel,
  getTodayKey,
  computeStreaks,
} from '../utils/productivityStorage';
import {
  X,
  Target,
  Flame,
  Clock,
  FileText,
  TrendingUp,
  Calendar,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Award,
  Zap,
  BarChart3,
  ShieldCheck,
  Eye,
  EyeOff,
  Bell,
  Cloud,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

interface ProductivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: ProductivityStore;
  onUpdateStore: (newStore: ProductivityStore) => void;
  timerState: TimerState;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onSetSprintPreset: (minutes: number) => void;
  onSwitchTimerMode: (mode: 'sprint' | 'stopwatch') => void;
  sessionStats: SessionStats;
}

type TabType = 'overview' | 'graphs' | 'history' | 'goals' | 'settings';
type GraphTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';
type GraphMetric = 'words' | 'pages' | 'time';

export const ProductivityModal: React.FC<ProductivityModalProps> = ({
  isOpen,
  onClose,
  store,
  onUpdateStore,
  timerState,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onSetSprintPreset,
  onSwitchTimerMode,
  sessionStats,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [graphTimeframe, setGraphTimeframe] = useState<GraphTimeframe>('daily');
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('words');
  const [editingGoals, setEditingGoals] = useState<WritingGoals>({ ...store.goals });
  const [customSprintMinutes, setCustomSprintMinutes] = useState<number>(30);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{ label: string; value: number } | null>(null);

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

  // Goal Progress Calculations
  const wordsProgress = Math.min(100, Math.round((todayRecord.wordsAdded / Math.max(1, store.goals.dailyWordsGoal)) * 100));
  const pagesProgress = Math.min(100, Math.round((todayRecord.pagesAdded / Math.max(1, store.goals.dailyPagesGoal)) * 100));
  const minutesToday = Math.round(todayRecord.secondsSpent / 60);
  const timeProgress = Math.min(100, Math.round((minutesToday / Math.max(1, store.goals.dailyMinutesGoal)) * 100));

  // Current session duration
  const sessionMinutes = Math.floor(sessionStats.activeSeconds / 60);
  const sessionSecs = sessionStats.activeSeconds % 60;
  const sessionWpm = sessionMinutes > 0 ? Math.round(sessionStats.currentWordsAdded / sessionMinutes) : sessionStats.currentWordsAdded;

  // Format timer remaining / elapsed
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Prepare Graphical Data
  const getGraphData = () => {
    const historyList = Object.values(store.history).sort((a, b) => a.date.localeCompare(b.date));

    if (graphTimeframe === 'daily') {
      // Last 14 days
      const slice = historyList.slice(-14);
      return slice.map((item) => {
        let val = item.wordsAdded;
        if (graphMetric === 'pages') val = item.pagesAdded;
        if (graphMetric === 'time') val = Math.round(item.secondsSpent / 60);
        return {
          label: formatDateLabel(item.date),
          date: item.date,
          value: val,
          goalMet: item.goalMet,
        };
      });
    }

    if (graphTimeframe === 'weekly') {
      // Aggregate into 8 weeks
      const weeks: { label: string; value: number; goalMet: boolean }[] = [];
      const now = new Date();
      for (let w = 7; w >= 0; w--) {
        const start = new Date();
        start.setDate(now.getDate() - (w * 7 + 6));
        const end = new Date();
        end.setDate(now.getDate() - (w * 7));

        let total = 0;
        let goalMetCount = 0;
        let dayCount = 0;

        historyList.forEach((item) => {
          const [yr, mo, da] = item.date.split('-').map(Number);
          const d = new Date(yr, mo - 1, da);
          if (d >= start && d <= end) {
            dayCount++;
            if (graphMetric === 'words') total += item.wordsAdded;
            else if (graphMetric === 'pages') total += item.pagesAdded;
            else total += Math.round(item.secondsSpent / 60);
            if (item.goalMet) goalMetCount++;
          }
        });

        weeks.push({
          label: `W-${7 - w || 'Now'}`,
          value: total,
          goalMet: goalMetCount >= 3,
        });
      }
      return weeks;
    }

    if (graphTimeframe === 'monthly') {
      // Aggregate into 6 months
      const months: { label: string; value: number; goalMet: boolean }[] = [];
      const now = new Date();
      for (let m = 5; m >= 0; m--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const y = targetDate.getFullYear();
        const mo = targetDate.getMonth() + 1;
        const monthKey = `${y}-${String(mo).padStart(2, '0')}`;
        const monthName = targetDate.toLocaleDateString('en-US', { month: 'short' });

        let total = 0;
        historyList.forEach((item) => {
          if (item.date.startsWith(monthKey)) {
            if (graphMetric === 'words') total += item.wordsAdded;
            else if (graphMetric === 'pages') total += item.pagesAdded;
            else total += Math.round(item.secondsSpent / 60);
          }
        });

        months.push({
          label: monthName,
          value: total,
          goalMet: total > 0,
        });
      }
      return months;
    }

    // Yearly
    const years: { label: string; value: number; goalMet: boolean }[] = [];
    const currentYear = new Date().getFullYear();
    [currentYear - 1, currentYear].forEach((yr) => {
      let total = 0;
      historyList.forEach((item) => {
        if (item.date.startsWith(String(yr))) {
          if (graphMetric === 'words') total += item.wordsAdded;
          else if (graphMetric === 'pages') total += item.pagesAdded;
          else total += Math.round(item.secondsSpent / 60);
        }
      });
      years.push({
        label: String(yr),
        value: total,
        goalMet: total > 0,
      });
    });
    return years;
  };

  const graphData = getGraphData();
  const maxValue = Math.max(...graphData.map((d) => d.value), 10);

  // Target threshold value based on metric
  let currentTargetGoal = store.goals.dailyWordsGoal;
  if (graphMetric === 'pages') currentTargetGoal = store.goals.dailyPagesGoal;
  if (graphMetric === 'time') currentTargetGoal = store.goals.dailyMinutesGoal;
  if (graphTimeframe === 'weekly') currentTargetGoal *= 5;
  if (graphTimeframe === 'monthly') currentTargetGoal *= 20;
  if (graphTimeframe === 'yearly') currentTargetGoal *= 220;

  const handleSaveGoals = () => {
    const updated: ProductivityStore = {
      ...store,
      goals: editingGoals,
    };
    saveProductivityStore(updated);
    onUpdateStore(updated);
    setActiveTab('overview');
  };

  const handleToggleStreakSetting = () => {
    const updated: ProductivityStore = {
      ...store,
      settings: {
        ...store.settings,
        showStreakInfo: !store.settings.showStreakInfo,
      },
    };
    saveProductivityStore(updated);
    onUpdateStore(updated);
  };

  const handleToggleSoundSetting = () => {
    const updated: ProductivityStore = {
      ...store,
      settings: {
        ...store.settings,
        soundAlerts: !store.settings.soundAlerts,
      },
    };
    saveProductivityStore(updated);
    onUpdateStore(updated);
  };

  const handleToggleCloudSync = () => {
    const updated: ProductivityStore = {
      ...store,
      settings: {
        ...store.settings,
        cloudSyncEnabled: !store.settings.cloudSyncEnabled,
      },
    };
    saveProductivityStore(updated);
    onUpdateStore(updated);
  };

  const handleExportData = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinalDraft-Productivity-${todayKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1c1c24] dc-bg-panel border border-white/15 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-neutral-200 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Writing Goals & Productivity Statistics
                <span className="px-2 py-0.5 rounded text-[10px] dc-meta bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  FD 13.4 Engine
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Track sessions, sprint timers, daily page targets, and long-term writing momentum
              </p>
            </div>
          </div>

          <button aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-white/10 flex items-center gap-1 bg-[#16161d]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Overview & Sprint
          </button>
          <button
            onClick={() => setActiveTab('graphs')}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'graphs'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Graphical History
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Productivity Log
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'goals'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Goal Targets
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings & Privacy
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW & SPRINT */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Banner: Streaks & Current Session */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Daily Goals Ring Card */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold uppercase tracking-wider text-[10px] dc-meta">Today's Goals</span>
                    <span className="font-mono text-amber-400">{todayRecord.date}</span>
                  </div>

                  <div className="space-y-3 my-3">
                    {/* Words Goal Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-neutral-300 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-amber-400" />
                          Words Added:
                        </span>
                        <span className="font-mono text-white">
                          <strong className="text-amber-400">{todayRecord.wordsAdded.toLocaleString()}</strong> / {store.goals.dailyWordsGoal.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-colors duration-300"
                          style={{ width: `${wordsProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Pages Goal Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-neutral-300 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-400" />
                          Pages Added:
                        </span>
                        <span className="font-mono text-white">
                          <strong className="text-blue-400">{todayRecord.pagesAdded}</strong> / {store.goals.dailyPagesGoal}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-400 h-full rounded-full transition-colors duration-300"
                          style={{ width: `${pagesProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Time Goal Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-neutral-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          Writing Time:
                        </span>
                        <span className="font-mono text-white">
                          <strong className="text-emerald-400">{minutesToday} min</strong> / {store.goals.dailyMinutesGoal} min
                        </span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full transition-colors duration-300"
                          style={{ width: `${timeProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
                    <span className="text-neutral-400">Today's Status:</span>
                    {todayRecord.goalMet ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Daily Goal Achieved!
                      </span>
                    ) : (
                      <span className="text-amber-400/90 font-mono">
                        {Math.max(0, store.goals.dailyWordsGoal - todayRecord.wordsAdded)} words to goal
                      </span>
                    )}
                  </div>
                </div>

                {/* Writing Streaks Card */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold uppercase tracking-wider text-[10px] dc-meta">Writing Streaks</span>
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>

                  {store.settings.showStreakInfo ? (
                    <div className="my-2 space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-orange-400 font-mono">
                          {streakData.currentStreak}
                        </span>
                        <span className="text-sm font-semibold text-neutral-200">
                          {streakData.currentStreak === 1 ? 'Day Streak' : 'Days in a Row'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                          <div className="text-neutral-400 text-[10px] dc-meta">Longest Streak</div>
                          <div className="text-base font-bold font-mono text-white flex items-center gap-1 mt-0.5">
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                            {streakData.longestStreak} days
                          </div>
                        </div>

                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                          <div className="text-neutral-400 text-[10px] dc-meta">Active Days</div>
                          <div className="text-base font-bold font-mono text-white flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            {streakData.totalDays} total
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-400 leading-tight">
                        Consistency builds screenplays. Write even 50 words to keep your flame alive.
                      </p>
                    </div>
                  ) : (
                    <div className="my-auto text-center p-3 text-neutral-400">
                      <EyeOff className="w-6 h-6 mx-auto mb-2 text-neutral-500" />
                      <p className="text-xs">Streak counters hidden in user settings for pressure-free writing.</p>
                      <button
                        onClick={handleToggleStreakSetting}
                        className="mt-2 text-[11px] text-amber-400 underline hover:text-amber-300"
                      >
                        Show Streaks
                      </button>
                    </div>
                  )}

                  <div className="text-[10px] dc-meta text-neutral-500 border-t border-white/5 pt-2 flex items-center justify-between">
                    <span>Low-stress option available</span>
                    <button
                      onClick={handleToggleStreakSetting}
                      className="text-neutral-400 hover:text-white"
                    >
                      {store.settings.showStreakInfo ? 'Hide Streaks' : 'Show Streaks'}
                    </button>
                  </div>
                </div>

                {/* Current Active Session Card */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold uppercase tracking-wider text-[10px] dc-meta">Current Session</span>
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[9px] dc-fine-meta font-mono">
                      LIVE
                    </span>
                  </div>

                  <div className="my-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">Words Added:</span>
                      <span className="text-lg font-bold font-mono text-amber-400">
                        +{sessionStats.currentWordsAdded}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">Pages Added:</span>
                      <span className="text-sm font-semibold font-mono text-blue-400">
                        +{sessionStats.currentPagesAdded}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">Session Elapsed:</span>
                      <span className="text-sm font-mono text-neutral-200">
                        {sessionMinutes}m {sessionSecs}s
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">Writing Velocity:</span>
                      <span className="text-xs font-mono text-neutral-300">
                        {sessionWpm} wpm
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] dc-meta text-neutral-500 border-t border-white/5 pt-2">
                    Active metrics update in real-time as you draft.
                  </div>
                </div>
              </div>

              {/* Sprint Timer & Stopwatch Station */}
              <div className="bg-black/50 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Session Writing Timer
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Pomodoro-style sprints or open stopwatch to stay in uninterrupted flow
                    </p>
                  </div>

                  {/* Mode switcher: Sprint vs Stopwatch */}
                  <div className="flex items-center bg-[#181822] p-0.5 rounded-lg border border-white/10 text-xs">
                    <button
                      onClick={() => onSwitchTimerMode('sprint')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        timerState.mode === 'sprint'
                          ? 'bg-amber-500 text-black font-bold shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Sprint Timer (Countdown)
                    </button>
                    <button
                      onClick={() => onSwitchTimerMode('stopwatch')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        timerState.mode === 'stopwatch'
                          ? 'bg-amber-500 text-black font-bold shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Stopwatch (Count-up)
                    </button>
                  </div>
                </div>

                {/* Big Timer Display & Playback Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between bg-black/40 rounded-xl p-5 border border-white/5 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-extrabold font-mono tracking-tight text-white drop-shadow">
                      {timerState.mode === 'sprint'
                        ? formatTime(timerState.remainingSeconds)
                        : formatTime(timerState.elapsedSeconds)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-300">
                        {timerState.mode === 'sprint'
                          ? `${timerState.sprintPreset}-Minute Sprint`
                          : 'Open Stopwatch Session'}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {timerState.isRunning ? 'Timer active — write freely' : 'Timer paused'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {timerState.isRunning ? (
                      <button
                        onClick={onPauseTimer}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-colors"
                      >
                        <Pause className="w-4 h-4 fill-black" />
                        Pause Timer
                      </button>
                    ) : (
                      <button
                        onClick={onStartTimer}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-colors"
                      >
                        <Play className="w-4 h-4 fill-black" />
                        Start Sprint
                      </button>
                    )}

                    <button
                      onClick={onResetTimer}
                      className="px-3 py-2 bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white rounded-lg text-xs flex items-center gap-1 transition-colors"
                      title="Reset Timer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>
                </div>

                {/* Sprint Presets */}
                {timerState.mode === 'sprint' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="text-neutral-400 text-[11px]">Sprint Presets:</span>
                    {[15, 25, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => onSetSprintPreset(mins)}
                        className={`px-3 py-1 rounded-lg border text-xs font-mono transition-colors ${
                          timerState.sprintPreset === mins
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                            : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-2">
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={customSprintMinutes}
                        onChange={(e) => setCustomSprintMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 bg-black/40 border border-white/10 rounded px-2 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                      <button
                        onClick={() => onSetSprintPreset(customSprintMinutes)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-neutral-300 rounded text-xs"
                      >
                        Set Custom
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GRAPHICAL PROGRESS HISTORY */}
          {activeTab === 'graphs' && (
            <div className="space-y-6">
              {/* Controls: Timeframe (Daily, Weekly, Monthly, Yearly) & Metric (Words, Pages, Time) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 p-3 rounded-xl border border-white/10">
                {/* Timeframe Switcher */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-xs">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as GraphTimeframe[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setGraphTimeframe(tf)}
                      className={`px-3 py-1 rounded capitalize transition-colors ${
                        graphTimeframe === tf
                          ? 'bg-amber-500 text-black font-bold shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Metric Switcher */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-xs">
                  {(
                    [
                      { id: 'words', label: 'Words Added' },
                      { id: 'pages', label: 'Pages Added' },
                      { id: 'time', label: 'Writing Minutes' },
                    ] as { id: GraphMetric; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setGraphMetric(m.id)}
                      className={`px-3 py-1 rounded transition-colors ${
                        graphMetric === m.id
                          ? 'bg-blue-500 text-white font-bold shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Graphical Chart Visualization */}
              <div className="bg-black/50 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white capitalize">
                      {graphTimeframe} Productivity Breakdown ({graphMetric})
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Goal Target: <span className="text-amber-400 font-mono font-semibold">{currentTargetGoal.toLocaleString()} {graphMetric}</span>
                    </p>
                  </div>

                  {hoveredDataPoint && (
                    <div className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono">
                      {hoveredDataPoint.label}: {hoveredDataPoint.value.toLocaleString()} {graphMetric}
                    </div>
                  )}
                </div>

                {/* Interactive SVG Bar Graph */}
                <div className="h-64 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-l border-white/10 relative">
                  {/* Goal Benchmark Reference Line */}
                  {maxValue > 0 && currentTargetGoal <= maxValue && (
                    <div
                      className="absolute left-0 right-0 border-b border-dashed border-amber-500/50 flex items-center justify-end pr-2 text-[10px] dc-meta text-amber-400/80 font-mono pointer-events-none"
                      style={{
                        bottom: `${Math.min(95, Math.max(5, (currentTargetGoal / maxValue) * 100))}%`,
                      }}
                    >
                      Goal ({currentTargetGoal})
                    </div>
                  )}

                  {graphData.map((d, idx) => {
                    const heightPercent = maxValue > 0 ? Math.max(6, Math.min(100, (d.value / maxValue) * 100)) : 6;
                    const meetsGoal = d.value >= currentTargetGoal;

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                        onMouseEnter={() => setHoveredDataPoint({ label: d.label, value: d.value })}
                        onMouseLeave={() => setHoveredDataPoint(null)}
                      >
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-neutral-900 border border-white/20 text-white text-[10px] dc-meta font-mono px-2 py-0.5 rounded shadow-lg pointer-events-none transition-opacity z-10 whitespace-nowrap">
                          {d.value.toLocaleString()} {graphMetric}
                        </div>

                        {/* Bar */}
                        <div
                          className={`w-full max-w-[36px] rounded-t transition-colors duration-200 ${
                            meetsGoal
                              ? 'bg-amber-400 group-hover:bg-amber-300 shadow-md shadow-amber-500/20'
                              : 'bg-blue-500/80 group-hover:bg-blue-400'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />

                        {/* Label */}
                        <span className="text-[10px] dc-meta font-mono text-neutral-400 mt-2 truncate max-w-full group-hover:text-white">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1 pt-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                      Goal Met
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                      Active Output
                    </span>
                  </div>
                  <span>Hover over any bar to view exact metrics</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCTIVITY LOG */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {(store.sprints||[]).length>0&&<section><h3>Recorded sprint segments</h3><p className="text-xs text-neutral-400">Pausing or changing projects ends a segment; resuming starts another. Active time excludes idle periods.</p>{store.sprints!.slice(-12).reverse().map(s=><p key={s.id} className="text-xs py-1">{new Date(s.startedAt).toLocaleString()} · {s.words} words · {s.activeSeconds}s active · {s.completed?'Completed':'Paused / ended'}</p>)}</section>}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Daily Productivity Log</h3>
                  <p className="text-xs text-neutral-400">Chronological history of your writing sessions</p>
                </div>
                <button
                  onClick={handleExportData}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-mono flex items-center gap-1.5"
                >
                  Export JSON
                </button>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#121217] text-neutral-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Words Added</th>
                      <th className="p-3">Pages Added</th>
                      <th className="p-3">Time Spent</th>
                      <th className="p-3 text-right">Goal Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-neutral-200">
                    {Object.values(store.history)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 30)
                      .map((row) => (
                        <tr key={row.date} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-white font-semibold flex items-center gap-1.5">
                            {row.date === todayKey && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            )}
                            {row.date}
                          </td>
                          <td className="p-3 text-amber-300 font-bold">+{row.wordsAdded.toLocaleString()}</td>
                          <td className="p-3 text-blue-300">+{row.pagesAdded}</td>
                          <td className="p-3 text-neutral-400">
                            {Math.round(row.secondsSpent / 60)} min
                          </td>
                          <td className="p-3 text-right">
                            {row.goalMet ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] dc-meta">
                                Goal Met
                              </span>
                            ) : (
                              <span className="text-neutral-500 text-[10px] dc-meta">In Progress</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: GOAL TARGETS CONFIGURATION */}
          {activeTab === 'goals' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div>
                <h3 className="text-sm font-bold text-white">Daily Target Configuration</h3>
                <p className="text-xs text-neutral-400">
                  Set realistic milestones tailored to your writing schedule
                </p>
              </div>

              <div className="space-y-4 bg-black/40 p-5 rounded-xl border border-white/10">
                {/* Words Goal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                    <span>Daily Word Count Target:</span>
                    <span className="font-mono text-amber-400">{editingGoals.dailyWordsGoal} words</span>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="50"
                    value={editingGoals.dailyWordsGoal}
                    onChange={(e) =>
                      setEditingGoals({ ...editingGoals, dailyWordsGoal: parseInt(e.target.value) })
                    }
                    className="w-full accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] dc-meta text-neutral-500 font-mono">
                    <span>100 wds (Micro-goal)</span>
                    <span>1,000 wds (Industry standard)</span>
                    <span>5,000 wds (Sprint mode)</span>
                  </div>
                </div>

                {/* Pages Goal */}
                <div className="space-y-1.5 pt-3 border-t border-white/5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                    <span>Daily Screenplay Pages Target:</span>
                    <span className="font-mono text-blue-400">{editingGoals.dailyPagesGoal} pages</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={editingGoals.dailyPagesGoal}
                    onChange={(e) =>
                      setEditingGoals({ ...editingGoals, dailyPagesGoal: parseInt(e.target.value) })
                    }
                    className="w-full accent-blue-400"
                  />
                  <div className="flex justify-between text-[10px] dc-meta text-neutral-500 font-mono">
                    <span>1 page/day</span>
                    <span>3-5 pages/day</span>
                    <span>20 pages/day</span>
                  </div>
                </div>

                {/* Writing Time Goal */}
                <div className="space-y-1.5 pt-3 border-t border-white/5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                    <span>Daily Writing Time Target:</span>
                    <span className="font-mono text-emerald-400">{editingGoals.dailyMinutesGoal} minutes</span>
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="300"
                    step="15"
                    value={editingGoals.dailyMinutesGoal}
                    onChange={(e) =>
                      setEditingGoals({ ...editingGoals, dailyMinutesGoal: parseInt(e.target.value) })
                    }
                    className="w-full accent-emerald-400"
                  />
                  <div className="flex justify-between text-[10px] dc-meta text-neutral-500 font-mono">
                    <span>15 min</span>
                    <span>45-60 min</span>
                    <span>300 min (5 hours)</span>
                  </div>
                </div>

                {/* Primary Focus Type */}
                <div className="pt-3 border-t border-white/5">
                  <label className="text-xs font-semibold text-neutral-300 mb-2 block">
                    Primary Progress Metric in Status Bar:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['words', 'pages', 'time'] as GoalType[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => setEditingGoals({ ...editingGoals, activeGoalType: g })}
                        className={`py-2 px-3 rounded-lg text-xs font-medium capitalize border transition-colors ${
                          editingGoals.activeGoalType === g
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                            : 'bg-black/30 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingGoals({ ...store.goals })}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-neutral-300"
                >
                  Reset Changes
                </button>
                <button
                  onClick={handleSaveGoals}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow"
                >
                  Save Goals
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS & PRIVACY */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div>
                <h3 className="text-sm font-bold text-white">Productivity Settings & Data Storage</h3>
                <p className="text-xs text-neutral-400">
                  Control notifications, streak visibility, and privacy options
                </p>
              </div>

              <div className="bg-black/40 rounded-xl border border-white/10 divide-y divide-white/5">
                {/* Setting 1: Show/Hide Streak Information */}
                <div className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      Show Writing Streak Information
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Displays flame counters and consecutive writing day badges. Turn off for a distraction-free, pressure-free workflow.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleStreakSetting}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      store.settings.showStreakInfo ? 'bg-amber-500' : 'bg-neutral-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        store.settings.showStreakInfo ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Setting 2: Audio chime alert */}
                <div className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      Sprint Completion Sound Chime
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Plays an audible arpeggio tone when sprint timer completes.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleSoundSetting}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      store.settings.soundAlerts ? 'bg-amber-500' : 'bg-neutral-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        store.settings.soundAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Setting 3: Local Storage & Cloud Sync Toggle */}
                <div className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Strict Local Storage (Default)
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Metrics and goals are stored on this machine. No cloud synchronization service is configured. Any earlier sync preference is retained.
                    </p>
                  </div>
                  <span className="text-xs text-neutral-400">Sync service unavailable</span>
                </div>
              </div>

              {store.legacyStatus==='unverified'&&<p role="status" className="p-3 text-xs text-amber-300">Earlier activity records have no provenance and may include legacy sample data. They remain preserved, with a separate backup, until reviewed.</p>}
              {/* Data actions */}
              <div className="p-4 bg-black/30 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Backup Writing Analytics</div>
                  <div className="text-[11px] text-neutral-400">Save a copy of your writing productivity history</div>
                </div>
                <button
                  onClick={handleExportData}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded text-xs font-mono"
                >
                  Download JSON
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between bg-black/40 text-xs">
          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Writing analytics stored securely on local device</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
