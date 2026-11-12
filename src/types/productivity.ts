export type GoalType = 'words' | 'pages' | 'time';

export interface WritingGoals {
  dailyWordsGoal: number;
  dailyPagesGoal: number;
  dailyMinutesGoal: number;
  activeGoalType: GoalType;
}

export type TimerMode = 'sprint' | 'stopwatch';

export interface TimerState {
  mode: TimerMode;
  durationSeconds: number; // For sprint
  remainingSeconds: number; // Countdown for sprint
  elapsedSeconds: number; // Countup for stopwatch
  isRunning: boolean;
  sprintPreset: number; // in minutes (15, 25, 45, 60, custom)
}

export interface DailyProductivityRecord {
  date: string; // YYYY-MM-DD
  wordsAdded: number;
  pagesAdded: number;
  secondsSpent: number;
  goalMet: boolean;
}

export interface SessionStats {
  sessionStartTime: number;
  startWordCount: number;
  startPageCount: number;
  currentWordsAdded: number;
  currentPagesAdded: number;
  activeSeconds: number;
}

export interface ProductivitySettings {
  showStreakInfo: boolean; // Setting to show/hide streak information
  soundAlerts: boolean;
  cloudSyncEnabled: boolean; // False by default, strictly local storage
}

export interface ProductivityStore {
  version?:2;
  legacyBackupKey?:string;
  legacyStatus?:'unverified'|'confirmed';
  sprints?:{id:string;projectId:string;startedAt:string;finishedAt:string;plannedSeconds:number;activeSeconds:number;words:number;completed:boolean}[];
  goals: WritingGoals;
  history: Record<string, DailyProductivityRecord>; // Date string key
  settings: ProductivitySettings;
  longestStreak: number;
}
