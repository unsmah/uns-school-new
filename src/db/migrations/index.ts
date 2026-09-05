/**
 * UNS SCHOOL — Database Migrations Architecture
 * Provides an explicit, non-destructive upgrade path for future database schema versions.
 *
 * HOW FUTURE SCHEMA MIGRATIONS WORK:
 * 1. Increment DB_VERSION in `src/db/schema.ts` when introducing a schema change.
 * 2. In `src/db/database.ts` or through `applyMigrations`, declare the new schema version
 *    stores with `this.version(nextVersion).stores({ ... })`.
 * 3. If data transformation or backfilling is required, register a Migration entry
 *    in `MIGRATIONS_REGISTRY` with an `upgrade` callback.
 * 4. The upgrade callback receives Dexie's native `Transaction` instance (`trans: Transaction`).
 *    All changes inside `upgrade` execute atomically in the context of the version change transaction.
 *    Example:
 *      {
 *        version: 2,
 *        description: 'Add new pedagogical rubric fields',
 *        upgrade: async (trans: Transaction) => {
 *          await trans.table('sessionRubrics').toCollection().modify(rubric => {
 *            rubric.newField = 'defaultValue';
 *          });
 *        }
 *      }
 * 5. Do NOT perform raw, unmanaged migrations outside Dexie's version upgrade lifecycle.
 */

import type { Transaction } from 'dexie';
import type { UnsSchoolDatabase } from '../database';

export interface Migration {
  version: number;
  description: string;
  stores?: Record<string, string | null>;
  upgrade?: (trans: Transaction) => Promise<void> | void;
}

export const MIGRATIONS_REGISTRY: Migration[] = [
  {
    version: 1,
    description: 'Initial foundation: 22 normalized tables with lookup indexes and decoupled curriculum/grading architecture.',
  },
];

/**
 * Hook to apply versioned migrations to the Dexie database instance.
 * Iterates through registered migrations above version 1 and attaches version stores and upgrade handlers.
 */
export function applyMigrations(db: UnsSchoolDatabase): void {
  for (const migration of MIGRATIONS_REGISTRY) {
    if (migration.version > 1) {
      const versionDef = db.version(migration.version);
      if (migration.stores) {
        versionDef.stores(migration.stores);
      }
      if (migration.upgrade) {
        versionDef.upgrade(async (trans: Transaction) => {
          await migration.upgrade!(trans);
        });
      }
    }
  }
}
