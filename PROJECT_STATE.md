# UNS SCHOOL — Project State

**Phase**: Phase 4 — Unified Lesson Workflow & Pedagogical Logs (Implementation Complete — External Audit Pending)  
**Architecture**: 100% Client-Only SPA (React 19.0.1, Vite, TypeScript, Tailwind CSS, Dexie.js / IndexedDB)  
**Target User**: Middle school English teachers in Algeria (1AM–4AM / 1MS–4MS)  
**Data Privacy**: All data resides strictly on the local client device via IndexedDB. No external servers, APIs, or cloud sync exist.

---

## Implemented Modules

### 1. Administrative Core (Phase 2)
- **School Profile & Setup**: CEM metadata (Official Name, Wilaya, Commune, Education District, Inspection Code).
- **Academic Year Management**: Global reactive `AcademicYearContext`, atomic year lifecycle controls, archiving, and single-current year invariant enforcement.
- **Middle School Level & Class Management**: Scoped class divisions (1MS, 2MS, 3MS, 4MS) bound to the active academic year.
- **Two-Tier Student Identity**: Civil identity (`StudentPerson`) separated from annual class enrollment (`StudentEnrollment`), with multi-year chronological progression tracking.
- **Student CSV Import Engine**: Delimiter detection, multilingual headers, multi-pass validation, and atomic IndexedDB execution.

### 2. Classroom Operations (Phase 3)
- **Weekly Timetable Scheduling**:
  - Sunday–Thursday Algerian teaching schedule (Periods 1–8).
  - Conflict checking strictly scoped to `academicYearId + classId + dayOfWeek + periodNumber`. Multiple classes may concurrently occupy the same period slot on the schedule grid.
  - Immutable `academicYearId` and `schoolId` on existing timetable slots.
- **Lesson-Anchored Roll Call & Attendance**:
  - Attendance date is strictly derived from the parent lesson date (not independently editable).
  - Attendance records cascade delete when parent lesson is removed.
  - Attendance statistics are strictly scoped to `academicYearId + classId`, preventing cross-year aggregation errors.
  - **Atomic `markAllPresent()`**: Strict pre-validation pass verifying that all student enrollments exist, belong to the exact class and academic year of the lesson, and are active. Zero-tolerance policy: if any enrollment is invalid or if duplicate IDs are provided, the transaction throws an error and writes **zero** records.

### 3. Unified Lesson Workflow & Pedagogical Logs (Phase 4 — Implementation Complete)
- **Authoritative Lesson Master Entity**:
  - `Lesson` serves as the single source of truth for pedagogical planning, sequence progression, roll call, and homework tasks.
  - Full support for multi-step didactic activity plans (standard pedagogical phases, interaction patterns: T-S, S-S, Individual, Group, PW, GW).
  - Multi-competency mapping and pedagogical aids/materials logging.
- **Atomic Homework Synchronization**:
  - Specifying homework title, due date, or estimated duration on a Lesson automatically creates/updates a linked `HomeworkTask` record.
  - Clearing homework fields from the Lesson automatically removes the linked `HomeworkTask`.
  - Deleting a Lesson atomically deletes the linked `HomeworkTask`.
  - Referential integrity guards reject homework creation for archived classes or archived academic years.
- **Derived Cahier Journal (دفتر اليومية)**:
  - Daily pedagogical log dynamically projected across all classes for any selected date in the active academic year.
  - Computes real-time roll call tallies (Present, Absent, Excused) and aggregates curriculum sequence objectives, session rubrics, targeted competencies, and assigned homework.
- **Derived Cahier de Textes (دفتر النصوص)**:
  - Class pedagogical log strictly scoped by `academicYearId + classId`.
  - Chronological projection of sessions taught, sequence themes, pedagogical stages, specific learning objectives, and assigned homework tasks.
  - Cross-year leakage prevention: previous-year sessions for identically named classes remain isolated to their respective academic year.
- **Historical Curriculum Version Preservation**:
  - Resolves curriculum sequences, session rubrics, and competencies using each lesson's own `curriculumVersionId`.
  - Changing the active curriculum version preserves all historical metadata across past academic years and lessons intact.

---

## Current System Invariants

1. **Lesson as Single Authoritative Source**:
   - `Lesson` is the sole source of truth; Cahier Journal and Cahier de Textes are strictly derived read-only projections.
   - `HomeworkTask` records linked to lessons are synchronized atomically in the same database transaction.

2. **Cahier de Textes Scoping**:
   - Queries require both `classId` and `academicYearId`. Classes from different academic years never blend logs.

3. **Curriculum Version Integrity**:
   - Lessons reference specific `curriculumVersionId`. Historical lessons retain their original sequence and rubric definitions regardless of active curriculum updates.

4. **Timetable Conflict Uniqueness**:
   - `academicYearId + classId + dayOfWeek + periodNumber` defines unique slot occupancy.
   - Different classes can occupy slots in the same period on the same day.

5. **Attendance Statistics Scoping**:
   - Class attendance metrics require both `academicYearId` and `classId`. Querying with mismatched IDs is rejected.

6. **Atomic Roll Call Validation**:
   - `markAllPresent()` performs an atomic pre-validation pass before writing. Any single invalid enrollment aborts the entire transaction.

7. **Two-Tier Student Identity & Enrollment**:
   - Active enrollment is strictly unique per student per academic year. Register numbers are unique per class roster.

