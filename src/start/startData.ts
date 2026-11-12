// Start Window data (1.18): the quick-start formats and how a recent project's date reads. No React here, so the
// unit tests can load it directly.
import { FORMAT_TEMPLATES } from '../formats/catalog';

/** Quick-start formats on the Start Window (each is a File › New from Template entry). */
export const START_TEMPLATES: { name: string; label: string; detail: string; icon: 'feature' | 'tv' | 'sitcom' | 'stage' | 'film' | 'short' }[] = [
  { name: 'Standard Feature Screenplay', label: 'Feature Screenplay', detail: 'About 110 pages', icon: 'feature' },
  { name: 'Television Pilot', label: 'Television Pilot', detail: 'One-hour drama', icon: 'tv' },
  { name: 'Multi-Camera Sitcom', label: 'Multi-Camera Sitcom', detail: 'Half-hour comedy', icon: 'sitcom' },
  { name: 'Stageplay', label: 'Stage Play', detail: 'Acts and scenes', icon: 'stage' },
  { name: 'Streaming Feature (Netflix-style)', label: 'Streaming Feature', detail: 'Netflix-style', icon: 'film' },
  { name: 'Short Film Screenplay', label: 'Short Film', detail: 'About 15 pages', icon: 'short' },
];
export const startTemplate = (name: string) => FORMAT_TEMPLATES.find(t => t.name === name);

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export function recentWhen(iso: string | null, now = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return '';
  const days = Math.round((dayStart(now) - dayStart(d)) / 86400000), time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (days === 0) return 'Today, ' + time;
  if (days === 1) return 'Yesterday, ' + time;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
/** A folder for display: the home folder reads as ~ (the account name is not shown). */
export const folderLabel = (folder: string) => folder.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~');
