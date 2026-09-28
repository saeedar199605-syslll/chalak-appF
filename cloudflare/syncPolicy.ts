export const CLOUD_SYNC_POLL_INTERVAL_MS = 30_000;
export const CLOUD_SYNC_MAX_RETRIES = 8;

export function getCloudRetryDelay(attempt: number): number {
  const bounded = Math.max(0, Math.min(CLOUD_SYNC_MAX_RETRIES - 1, Math.floor(attempt)));
  return Math.min(30_000, 1_000 * (2 ** bounded));
}

export function shouldRetryCloudStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export function selectCloudSyncOperation(hasRevisionConflict: boolean, dirtyKeyCount: number): 'pull' | 'push' {
  if (hasRevisionConflict) return 'pull';
  return dirtyKeyCount > 0 ? 'push' : 'pull';
}

export function shouldAttemptSync(retryExhausted: boolean, trigger: 'poll' | 'visible' | 'online' | 'manual'): boolean {
  return !retryExhausted || trigger === 'visible' || trigger === 'online' || trigger === 'manual';
}

/** Prevent a late response from an earlier signed-in session applying to the current cache. */
export function isCurrentSyncGeneration(requestGeneration: number, activeGeneration: number): boolean {
  return requestGeneration === activeGeneration;
}
