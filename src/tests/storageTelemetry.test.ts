import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkStorageTelemetry, requestStoragePersistence } from '../services/storageTelemetryService';

describe('Storage Telemetry Service', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('handles environment when navigator.storage is undefined gracefully', async () => {
    // Mock navigator without storage
    Object.defineProperty(global, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    const telemetry = await checkStorageTelemetry();
    expect(telemetry.isStorageManagerAvailable).toBe(false);
    expect(telemetry.persistenceState).toBe('PERSISTENCE_UNAVAILABLE');
    expect(telemetry.usageBytes).toBe(0);
    expect(telemetry.formattedUsage).toBe('0 B');

    const persistResult = await requestStoragePersistence();
    expect(persistResult.success).toBe(false);
    expect(persistResult.state).toBe('PERSISTENCE_UNAVAILABLE');
  });

  it('correctly reads estimate and persistence when navigator.storage is present', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        storage: {
          persisted: vi.fn().mockResolvedValue(true),
          estimate: vi.fn().mockResolvedValue({
            usage: 5242880, // 5 MB
            quota: 1073741824, // 1 GB
          }),
          persist: vi.fn().mockResolvedValue(true),
        },
      },
      configurable: true,
      writable: true,
    });

    const telemetry = await checkStorageTelemetry();
    expect(telemetry.isStorageManagerAvailable).toBe(true);
    expect(telemetry.persistenceState).toBe('PERSISTENCE_GRANTED');
    expect(telemetry.formattedUsage).toBe('5 MB');
    expect(telemetry.formattedQuota).toBe('1 GB');

    const persistResult = await requestStoragePersistence();
    expect(persistResult.success).toBe(true);
    expect(persistResult.state).toBe('PERSISTENCE_GRANTED');
  });
});
