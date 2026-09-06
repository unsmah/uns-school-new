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
  {
    version: 2,
    description: 'Phase 11 Remediation & Audit: Official 2026-2027 pupil start date correction (2026-09-06), category normalization, and provenance enforcement.',
    upgrade: async (trans: Transaction) => {
      // 1. Correct 2026-2027 Academic Year pupil start date
      const academicYearsTable = trans.table('academicYears');
      const years = await academicYearsTable.toArray();
      for (const year of years) {
        if (year.id === 'ay-2026-2027' || year.label === '2026-2027') {
          let updated = false;
          let newStartDate = year.startDate;
          if (year.startDate === '2026-09-20') {
            newStartDate = '2026-09-06';
            updated = true;
          }

          let newTerms = year.terms;
          if (Array.isArray(year.terms)) {
            newTerms = year.terms.map((t: any) => {
              if (t.termNumber === 1 && t.startDate === '2026-09-20') {
                updated = true;
                return { ...t, startDate: '2026-09-06' };
              }
              return t;
            });
          }

          let newEvents = year.calendarEvents;
          if (Array.isArray(year.calendarEvents)) {
            newEvents = year.calendarEvents.map((evt: any) => {
              if (
                (evt.id === 'evt-ay-2026-2027-rentree' ||
                  evt.id === 'evt-ay-2026-2027-term1-start' ||
                  (evt.title && evt.title.toLowerCase().includes('rentrée'))) &&
                evt.startDate === '2026-09-20' &&
                evt.status !== 'user_created'
              ) {
                updated = true;
                return { ...evt, startDate: '2026-09-06' };
              }
              return evt;
            });
          }

          if (updated) {
            await academicYearsTable.update(year.id, {
              startDate: newStartDate,
              terms: newTerms,
              calendarEvents: newEvents,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // 2. Normalize LocalResource categories and provenance
      const resourcesTable = trans.table('resources');
      const resources = await resourcesTable.toArray();
      const CATEGORY_MAP: Record<string, string> = {
        Worksheet: 'Worksheets',
        'BEM Prep': 'BEM Preparation',
        'Lesson Plans': 'Lesson Plan',
        Activity: 'Classroom Activities',
      };

      for (const res of resources) {
        let resUpdated = false;
        let category = res.category;
        if (CATEGORY_MAP[category]) {
          category = CATEGORY_MAP[category];
          resUpdated = true;
        }

        let provenance = res.provenance || 'user_created';
        if (!res.provenance) {
          resUpdated = true;
        }

        let isOfficial = Boolean(res.isOfficial);
        if (provenance !== 'official_verified' && isOfficial) {
          isOfficial = false;
          resUpdated = true;
        }

        if (resUpdated) {
          await resourcesTable.update(res.id, {
            category,
            provenance,
            isOfficial,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    },
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
