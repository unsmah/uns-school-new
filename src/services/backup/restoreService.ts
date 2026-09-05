/**
 * UNS SCHOOL — Restore Execution & Safety Snapshot Service
 * Performs atomic restoration of database tables and resource blobs.
 * Automatically creates pre-restore safety snapshots and guarantees complete rollback on error.
 */

import { db } from '../../db/database';
import { DB_TABLES, type DbTableName } from '../../db/schema';
import type { LocalResource } from '../../types';
import type { BackupPackage, SafetySnapshot, RestoreProgress } from './backupTypes';

/**
 * Creates an in-memory safety snapshot of the entire live IndexedDB state before executing destructive restore.
 */
export async function createSafetySnapshot(): Promise<SafetySnapshot> {
  const snapshotTables: Record<string, any[]> = {};
  const tableNames = Object.values(DB_TABLES) as DbTableName[];

  for (const tableName of tableNames) {
    snapshotTables[tableName] = await db.table(tableName).toArray();
  }

  return {
    timestamp: new Date().toISOString(),
    tables: snapshotTables,
  };
}

/**
 * Restores live database from a safety snapshot.
 */
export async function restoreSafetySnapshot(snapshot: SafetySnapshot): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
    for (const [tableName, records] of Object.entries(snapshot.tables)) {
      if (records.length > 0) {
        await db.table(tableName).bulkAdd(records);
      }
    }
  });
}

/**
 * Executes a complete, atomic restore of the database from a validated BackupPackage.
 */
export async function executeRestore(
  backupPackage: BackupPackage,
  onProgress?: (progress: RestoreProgress) => void
): Promise<void> {
  const updateProgress = (
    stage: RestoreProgress['stage'],
    message: string,
    percentage: number
  ) => {
    if (onProgress) {
      onProgress({ stage, message, percentage });
    }
  };

  // 1. Create Pre-Restore Safety Snapshot
  updateProgress('creating_safety_snapshot', 'Creating pre-restore safety snapshot...', 15);
  let safetySnapshot: SafetySnapshot;
  try {
    safetySnapshot = await createSafetySnapshot();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    updateProgress('failed', `Failed to create safety snapshot: ${msg}`, 0);
    throw new Error(`Restore aborted: Unable to create pre-restore safety snapshot. ${msg}`);
  }

  // 2. Perform Atomic Restore inside Dexie Transaction
  updateProgress('restoring_database', 'Clearing live database and writing restored tables...', 40);

  try {
    await db.transaction('rw', db.tables, async () => {
      // Clear all existing table rows
      for (const table of db.tables) {
        await table.clear();
      }

      // Populate restored tables
      for (const [tableName, records] of Object.entries(backupPackage.tables)) {
        if (!records || !Array.isArray(records)) continue;

        let recordsToInsert = [...records];

        // Re-attach binary Blobs for resources
        if (tableName === DB_TABLES.RESOURCES) {
          recordsToInsert = records.map((resMetadata: LocalResource) => {
            const resData = backupPackage.resources[resMetadata.id];
            if (resData && resData.blobData) {
              const blob = new Blob([resData.blobData], {
                type: resMetadata.fileMimeType || 'application/octet-stream',
              });
              return {
                ...resMetadata,
                fileBlob: blob,
              };
            }
            return resMetadata;
          });
        }

        if (recordsToInsert.length > 0) {
          await db.table(tableName).bulkAdd(recordsToInsert);
        }
      }
    });

    // 3. Post-Restore Integrity Verification
    updateProgress('verifying_restored', 'Verifying restored record counts and database integrity...', 85);

    for (const [tableName, summary] of Object.entries(backupPackage.manifest.tableSummary)) {
      const restoredCount = await db.table(tableName).count();
      if (restoredCount !== summary.recordCount) {
        throw new Error(
          `Post-restore count mismatch for table ${tableName}: expected ${summary.recordCount}, found ${restoredCount}.`
        );
      }
    }

    updateProgress('complete', 'Restore successfully completed!', 100);

    // Dispatch global database restoration event for context state reset
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uns_database_restored'));
    }
  } catch (restoreErr: unknown) {
    const errorMsg = restoreErr instanceof Error ? restoreErr.message : String(restoreErr);
    updateProgress('failed', `Restore failed. Reverting to original safety snapshot...`, 0);

    // Rollback to pre-restore safety snapshot
    try {
      await restoreSafetySnapshot(safetySnapshot);
    } catch (rollbackErr: unknown) {
      const rollbackMsg = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
      throw new Error(
        `CRITICAL ERROR: Restore failed (${errorMsg}), and safety snapshot rollback also failed: ${rollbackMsg}`
      );
    }

    throw new Error(`Restore failed and was safely rolled back: ${errorMsg}`);
  }
}
