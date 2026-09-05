# UNS SCHOOL — Database Schema Reference (Version 1)

Database Name: `uns_school_db`  
Database Engine: `Dexie.js` on `IndexedDB`  
Schema Version: `1`

---

## Normalized Tables Summary

| Table | Primary Key | Key Indexes & Lookup Patterns | Purpose |
|---|---|---|---|
| `schools` | `id` (UUID) | `schoolCode`, `commune`, `wilaya` | Official middle school administrative profile |
| `teacherProfile` | `id` (UUID) | `email`, `eppn` | Teacher credentials and ministerial identifiers |
| `academicYears` | `id` (UUID) | `schoolId`, `label`, `startDate`, `isCurrent`, `isArchived` | Academic year periods with single-current invariant |
| `gradingSchemes` | `id` (UUID) | `name`, `isDefault` | Declarative calculation schemes and coefficients |
| `classes` | `id` (UUID) | `academicYearId`, `levelCode`, `name`, `isArchived`, `[academicYearId+levelCode]` | Middle school class divisions (e.g. 1MS 1, 4MS 2) |
| `studentPersons` | `id` (UUID) | `nationalIdNumber`, `lastNameLatin`, `firstNameLatin`, `gender`, `dateOfBirth` | Permanent human identity across multiple years |
| `studentEnrollments` | `id` (UUID) | `studentPersonId`, `academicYearId`, `classId`, `registerNumber`, `status`, `[classId+registerNumber]`, `[academicYearId+studentPersonId]` | Year-specific enrollment and class register numbers |
| `curriculumVersions` | `id` (UUID) | `code`, `status` | Versioned curriculum container (e.g. Official 2016 Reform) |
| `curriculumLevels` | `id` (UUID) | `curriculumVersionId`, `levelCode`, `order`, `[curriculumVersionId+levelCode]` | Grade level definitions (1MS–4MS) |
| `competencies` | `id` (UUID) | `curriculumVersionId`, `levelCode`, `code`, `order` | Ministerial competency matrix |
| `sessionRubrics` | `id` (UUID) | `curriculumVersionId`, `code`, `order` | Session types (e.g. I listen and do, My project) |
| `curriculumSequences` | `id` (UUID) | `curriculumVersionId`, `levelCode`, `sequenceNumber`, `[curriculumVersionId+levelCode+sequenceNumber]` | Sequence progression and project themes |
| `learningObjectives` | `id` (UUID) | `sequenceId`, `code`, `order` | Granular pedagogical targets per sequence |
| `lessons` | `id` (UUID) | `academicYearId`, `classId`, `sequenceId`, `rubricId`, `date`, `status`, `[classId+date]`, `[academicYearId+date]` | Authoritative source record for teaching sessions |
| `attendance` | `id` (UUID) | `lessonId`, `studentEnrollmentId`, `classId`, `date`, `status`, `[lessonId+studentEnrollmentId]`, `[classId+date]` | Roll call records strictly anchored to Lessons |
| `assessments` | `id` (UUID) | `academicYearId`, `classId`, `termNumber`, `componentKey`, `date`, `isLocked`, `[classId+termNumber]` | Tests, continuous assessments, and exams |
| `grades` | `id` (UUID) | `assessmentId`, `studentEnrollmentId`, `isAbsent`, `[assessmentId+studentEnrollmentId]` | Individual student assessment scores |
| `homework` | `id` (UUID) | `academicYearId`, `classId`, `lessonId`, `dueDate`, `isCompleted` | Assigned homework and follow-up tracking |
| `observations` | `id` (UUID) | `studentEnrollmentId`, `classId`, `date`, `category` | Private pedagogical and behavioral notes |
| `remediation` | `id` (UUID) | `academicYearId`, `classId`, `sequenceId`, `scheduledDate`, `status` | Targeted pedagogical support sessions |
| `timetable` | `id` (UUID) | `academicYearId`, `classId`, `dayOfWeek`, `periodNumber`, `[academicYearId+dayOfWeek+periodNumber]` | Weekly Sunday–Thursday class schedule |
| `resources` | `id` (UUID) | `category`, `createdAt`, `title` | Local teaching materials and flashcard storage |

---

## Referential Integrity & Business Logic Rules

Because IndexedDB does not have built-in foreign key constraints, all integrity rules are enforced transactionally within the repository layer:

1. **Timetable Slot Scoping & Conflict Checking**:
   - A slot conflict check is strictly scoped to `academicYearId + classId + dayOfWeek + periodNumber`.
   - Distinct classes can occupy the same period on the same day.
   - Timetable slot's `academicYearId` and `schoolId` are immutable.

2. **Lesson -> Attendance Cascade & Synchronized Date**:
   - Deleting a `Lesson` deletes all `attendance` records where `lessonId === lesson.id` inside a readwrite Dexie transaction.
   - Attendance date is strictly derived from the parent `Lesson` date and cannot be independently modified.

3. **Attendance Statistics Scoping**:
   - `getAttendanceStatsForClass` requires both `academicYearId` and `classId` parameters, ensuring class statistics never blend data from different academic years.

4. **Atomic Roll Call (`markAllPresent`)**:
   - A multi-step pre-validation verifies that all passed enrollment IDs exist, are active, and belong to the parent lesson's class and academic year.
   - Any validation failure, missing record, or duplicate ID in the arguments causes an immediate abort with zero records written.

5. **Curriculum Context Validation for Lessons**:
   - Lessons validate that `curriculumVersionId` exists in `curriculumVersions`.
   - If `sequenceId` is provided, it must belong to `curriculumVersionId` and its `levelCode` must match the lesson's `levelCode`.
   - If `rubricId` is provided, it must belong to `curriculumVersionId` and match any level constraint.
   - Historical lessons and their original references are preserved intact.

6. **Lesson -> HomeworkTask Atomic Synchronization**:
   - Specifying homework details on a `Lesson` automatically synchronizes a linked `HomeworkTask` in `homework` inside the same Dexie transaction.
   - Removing homework fields deletes the linked `HomeworkTask`.
   - Deleting a `Lesson` cascades deletion to any linked `HomeworkTask`.
   - Homework cannot be created for archived classes or archived academic years.

7. **Cahier de Textes & Cahier Journal Derived Scoping**:
   - `Cahier de Textes` queries require both `academicYearId` and `classId`.
   - `Cahier Journal` queries lessons for a specific `date` and `academicYearId`.
   - Both views dynamically resolve curriculum sequence, rubric, and competency metadata via the lesson's own `curriculumVersionId`.

8. **Assessment -> Grade Cascade**:
   - Deleting an `Assessment` deletes all `grades` records referencing that `assessmentId`.

9. **Class Deletion Guard**:
   - A `class` cannot be deleted if active `studentEnrollments` or `lessons` are attached. It must be archived (`isArchived: true`) instead.

10. **Single Current Academic Year**:
   - Setting an academic year to `isCurrent: true` automatically demotes all other years to `isCurrent: false` for that school.
   - `AcademicYear.schoolId` is immutable. Archived academic years are strictly read-only.

11. **Curriculum Entity Deletion Guards**:
   - A `curriculumSequence` cannot be deleted if any `Lesson` record references its `sequenceId`.
   - A `sessionRubric` cannot be deleted if any `Lesson` record references its `rubricId`.
   - A `learningObjective` cannot be deleted if any `Lesson` records are linked to its parent sequence.

12. **Pure Derived Planning Layer**:
   - Sequence progress, completion percentages, competency coverage counts, and pacing metrics are dynamically derived at query time from `lessons` records. No intermediate planning snapshot tables exist.

13. **Backup Archive Verification & Restore Transaction Invariants**:
   - Backup creation exports all 22 IndexedDB tables into deterministic JSON files (`tables/<tableName>.json`) and extracts binary media blobs into `resources/<id>.bin`.
   - Manifest includes independent SHA-256 digests for every table file and resource blob, plus a master composite digest (`payloadsChecksumSHA256`).
   - Pre-restore validation inspects format version compatibility (`v1.x.x`), recomputes SHA-256 hashes, performs referential integrity dry-runs, and calculates storage quota requirements.
   - Restoration is guarded by an in-memory safety snapshot (`createSafetySnapshot()`) and executes table wipes and bulk inserts inside a single atomic Dexie transaction across all 22 tables (`db.transaction('rw', db.tables, ...)`).
   - Any failure during restore or post-restore verification triggers automatic rollback (`restoreSafetySnapshot()`), leaving live IndexedDB unchanged.
