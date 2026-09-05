/**
 * UNS SCHOOL — Storage Telemetry Service
 * Monitors browser IndexedDB storage quota, usage, and persistence grant state.
 *
 * IMPORTANT: Persistence is a browser request, NOT an absolute guarantee.
 * Regular .unsschool backups remain the primary protection against data loss.
 */

export type StoragePersistenceState =
  | 'PERSISTENCE_GRANTED'
  | 'PERSISTENCE_NOT_GRANTED'
  | 'PERSISTENCE_UNAVAILABLE';

export interface StorageTelemetry {
  isStorageManagerAvailable: boolean;
  persistenceState: StoragePersistenceState;
  usageBytes: number;
  quotaBytes: number;
  usagePercentage: number;
  formattedUsage: string;
  formattedQuota: string;
  lastCheckedAt: string;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function checkStorageTelemetry(): Promise<StorageTelemetry> {
  let persistenceState: StoragePersistenceState = 'PERSISTENCE_UNAVAILABLE';

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      const isPersisted = await navigator.storage.persisted();
      persistenceState = isPersisted ? 'PERSISTENCE_GRANTED' : 'PERSISTENCE_NOT_GRANTED';
    } catch {
      persistenceState = 'PERSISTENCE_UNAVAILABLE';
    }
  }

  let usageBytes = 0;
  let quotaBytes = 0;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage ?? 0;
      quotaBytes = estimate.quota ?? 0;
    } catch {
      // Gracefully handle environments where estimate fails
    }
  }

  const usagePercentage = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
  const isStorageManagerAvailable = typeof navigator !== 'undefined' && !!navigator.storage;

  return {
    isStorageManagerAvailable,
    persistenceState,
    usageBytes,
    quotaBytes,
    usagePercentage: parseFloat(usagePercentage.toFixed(2)),
    formattedUsage: formatBytes(usageBytes),
    formattedQuota: formatBytes(quotaBytes),
    lastCheckedAt: new Date().toISOString(),
  };
}

export async function requestStoragePersistence(): Promise<{
  success: boolean;
  state: StoragePersistenceState;
}> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const granted = await navigator.storage.persist();
      return {
        success: granted,
        state: granted ? 'PERSISTENCE_GRANTED' : 'PERSISTENCE_NOT_GRANTED',
      };
    } catch {
      return { success: false, state: 'PERSISTENCE_UNAVAILABLE' };
    }
  }
  return { success: false, state: 'PERSISTENCE_UNAVAILABLE' };
}
