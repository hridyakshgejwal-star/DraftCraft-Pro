import {
  ProductivityStore,
  WritingGoals,
  DailyProductivityRecord,
  ProductivitySettings,
} from '../types/productivity';

const STORAGE_KEY = 'fd_writing_productivity_v1';

export const DEFAULT_GOALS: WritingGoals = {
  dailyWordsGoal: 1000,
  dailyPagesGoal: 3,
  dailyMinutesGoal: 45,
  activeGoalType: 'words',
};

export const DEFAULT_SETTINGS: ProductivitySettings = {
  showStreakInfo: true,
  soundAlerts: true,
  cloudSyncEnabled: false, // 100% stored locally on device by default
};

export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function loadProductivityStore(): ProductivityStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.goals && parsed.history) {
        if(parsed.version!==2){
          const backupKey=STORAGE_KEY+'_legacy_backup';if(!localStorage.getItem(backupKey))localStorage.setItem(backupKey,raw);
          parsed.version=2;parsed.legacyBackupKey=backupKey;parsed.legacyStatus='unverified';
          // Old activity did not record provenance. Preserve it rather than
          // guessing which entries belonged to the writer.
          localStorage.setItem(STORAGE_KEY,JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load productivity data from localStorage', err);
  }

  const initialHistory:Record<string,DailyProductivityRecord> = {};
  const initialStore: ProductivityStore = {
    version:2,
    goals: {...DEFAULT_GOALS},
    history: initialHistory,
    settings: {...DEFAULT_SETTINGS},
    longestStreak: 0,
  };

  saveProductivityStore(initialStore);
  return initialStore;
}

export function saveProductivityStore(store: ProductivityStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Failed to save productivity data to localStorage', err);
  }
}

export function recordActivityDelta(
  wordsDelta: number,
  pagesDelta: number,
  secondsDelta: number,
  dateKey=getTodayKey()
): ProductivityStore {
  const store = loadProductivityStore();
  const todayKey = dateKey;

  if (!store.history[todayKey]) {
    store.history[todayKey] = {
      date: todayKey,
      wordsAdded: 0,
      pagesAdded: 0,
      secondsSpent: 0,
      goalMet: false,
    };
  }

  const todayRecord = store.history[todayKey];
  todayRecord.wordsAdded = Math.max(0, todayRecord.wordsAdded + wordsDelta);
  todayRecord.pagesAdded = Math.max(0, todayRecord.pagesAdded + pagesDelta);
  todayRecord.secondsSpent = Math.max(0, todayRecord.secondsSpent + secondsDelta);

  // Check goal met
  const wordsMet = todayRecord.wordsAdded >= store.goals.dailyWordsGoal;
  const pagesMet = todayRecord.pagesAdded >= store.goals.dailyPagesGoal;
  const timeMet = todayRecord.secondsSpent >= store.goals.dailyMinutesGoal * 60;
  todayRecord.goalMet = store.goals.activeGoalType==='words'?wordsMet:store.goals.activeGoalType==='pages'?pagesMet:timeMet;

  // Recalculate streak
  const streakData = computeStreaks(store.history);
  if (streakData.longestStreak > store.longestStreak) {
    store.longestStreak = streakData.longestStreak;
  }

  saveProductivityStore(store);
  return store;
}

export function computeStreaks(history: Record<string, DailyProductivityRecord>): {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
} {
  const sortedDates = Object.keys(history).sort();
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDays: 0 };
  }

  let totalDays = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  // Calculate total days with any words or minutes
  for (const dateKey of sortedDates) {
    const item = history[dateKey];
    if (item.wordsAdded > 0 || item.secondsSpent > 0) {
      totalDays++;
    }
  }

  // Calculate streaks based on consecutive calendar days with activity (>0 words or minutes)
  const todayKey = getTodayKey();
  let currentStreak = 0;

  // Walk backwards from today or yesterday
  let checkDate = new Date();
  const todayItem = history[todayKey];
  const wroteToday = todayItem && (todayItem.wordsAdded > 0 || todayItem.secondsSpent > 0);

  if (!wroteToday) {
    // Check if wrote yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    const entry = history[key];
    if (entry && (entry.wordsAdded > 0 || entry.secondsSpent > 0)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest streak calculation across sorted dates
  let prevDate: Date | null = null;
  for (const dateKey of sortedDates) {
    const entry = history[dateKey];
    if (entry.wordsAdded > 0 || entry.secondsSpent > 0) {
      const [y, m, d] = dateKey.split('-').map(Number);
      const currDate = new Date(y, m - 1, d);

      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffMs = currDate.getTime() - prevDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays === 0) {
          // same day
        } else {
          tempStreak = 1;
        }
      }
      prevDate = currDate;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(maxStreak, currentStreak),
    totalDays,
  };
}

export function playSprintChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Ascending arpeggio chime: 523Hz (C5) -> 659Hz (E5) -> 783Hz (G5) -> 1046Hz (C6)
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.12);
    osc.frequency.setValueAtTime(783.99, now + 0.24);
    osc.frequency.setValueAtTime(1046.5, now + 0.36);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.95);
  } catch (err) {
    console.warn('Audio chime playback omitted or blocked by autoplay policy', err);
  }
}
