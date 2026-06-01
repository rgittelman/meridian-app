import { isDevEnvironment } from '@/utils/isDev';

export function logFocusVisibleCount(visible: number, pool: number): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:focus] visible=${visible} pool=${pool} cap=3`);
}

export function logCapturePreviewTruncation(
  rawLen: number,
  titleLen: number,
  preview: string,
): void {
  if (!isDevEnvironment()) return;
  if (titleLen >= rawLen) return;
  console.log(`[Meridian:capture-preview] raw=${rawLen} title=${titleLen}`, preview);
}

export function logCaptureInputHeight(heightPx: number, approxLines: number): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:capture-input] height=${heightPx}px lines≈${approxLines}`);
}
