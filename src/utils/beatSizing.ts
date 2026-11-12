export type BeatSize = { width?: number; height?: number };
export const MIN_BEAT_WIDTH = 200;
export const MIN_BEAT_HEIGHT = 200;
export const MAX_BEAT_WIDTH = 1200;
export const MAX_BEAT_HEIGHT = 1600;
export function beatWidth(value?: number) {
  return Number.isFinite(value) ? Math.max(MIN_BEAT_WIDTH, Math.min(MAX_BEAT_WIDTH, value!)) : 260;
}
export function beatHeight(value?: number) {
  return Number.isFinite(value) ? Math.max(MIN_BEAT_HEIGHT, Math.min(MAX_BEAT_HEIGHT, value!)) : undefined;
}
export function resizedBeat(width: number, height: number, snap: boolean): Required<BeatSize> {
  return { width: beatWidth(snap ? Math.round(width / 20) * 20 : width), height: beatHeight(snap ? Math.round(height / 20) * 20 : height)! };
}
