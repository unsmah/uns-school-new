# UNS SCHOOL — Project State

**Phase**: Phase 10 — Hardening, Accessibility & Offline Stress Testing (Implementation Complete — External Audit Pending)
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

### 3. Unified Lesson Workflow & Pedagogical Logs (Phase 4)
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

### 4. Planning & Curriculum Engine (Phase 5 — Complete)
- **Curriculum as Versioned Data**:
  - Complete, extensible curriculum storage (`curriculumVersions`, `curriculumLevels`, `curriculumSequences`, `competencies`, `sessionRubrics`, `learningObjectives`) covering 1AM to 4AM with communicative objectives and project titles.
  - Support for active and historical curriculum versions.
- **Pure Derived Planning & Progress Engine**:
  - Deterministic calculations (`computeSequenceProgress`, `computeClassPlanningOverview`, `computeCompetencyCoverage`, `computeObjectiveCoverage`) dynamically derived from authoritative `Lesson` records without duplicate state.
  - Real-time pacing metrics: planned vs. recorded vs. completed sessions, remaining sessions count, and completion percentage.
  - Pacing indicators: On Track, Falling Behind, Ahead of Schedule.
- **Interactive Curriculum Explorer**:
  - Level-by-level inspection of sequences, official exit profiles, recommended weekly hours, targeted competencies, and granular learning objectives (communicative, linguistic, pronunciation).
- **Yearly & Sequence Planning Cockpit**:
  - Class-by-class sequence roadmap, timeline overview, competency coverage matrices (C1, C2, C3), and direct action links to launch lessons aligned with specific sequences.
- **Referential Integrity on Curriculum Entities**:
  - Transactional guards prevent deleting sequences, rubrics, or objectives that are referenced by existing `Lesson` records.

### 5. Official Documents, Printing & Export (Phase 8 — Complete)
- **Printable Document Wrapper**:
  - Official document header projection, print-only layout CSS (`@media print`), and metadata framing.
- **Official Middle-School Reports**:
  - Class List Report with UTF-8 BOM CSV export.
  - Attendance Register matrix.
  - Cahier de Journal daily log projection.
  - Cahier de Textes class history projection.
  - Planning & Progression Report with historical curriculum context protection.
  - Assessment & Marks Sheet consuming authoritative `gradingCalculationService` results with frozen snapshot protection.

### 6. Local-Only Backup & Restore System (Phase 9 — Complete)
- **Portable `.unsschool` ZIP Archive Format**:
  - Self-contained ZIP container holding inspectable, key-sorted JSON table files (`tables/<tableName>.json`), attached resource binary files (`resources/<id>.bin`), and `manifest.json`.
- **SHA-256 Cryptographic Checksum Engine**:
  - Independent SHA-256 digests over table JSON payloads and binary resource blobs combined into a master composite digest (`payloadsChecksumSHA256`) to guarantee backup archive integrity.
- **Version & Format Compatibility Rules**:
  - Explicit format versioning (`v1.0.0`). Rejects unsupported future format major versions safely without partial writes.
- **Pre-Restore Safety Snapshot & Defensive Rollback**:
  - Automatically captures an in-memory safety snapshot of live IndexedDB data before restoring.
  - Executes live database wipe and restoration inside an atomic Dexie transaction across all 22 tables.
  - Instantly reverts to the safety snapshot if restore or post-restore verification fails.
- **Strict Blocking Referential & Resource Integrity Validation**:
  - Pre-restore validation dry-run checks referential integrity across all 22 domain entities.
  - Any broken foreign key relationship or resource binary mismatch renders `isValid = false`, strictly blocking restoration and setting `backupPackage = null`.
- **Attached Media & Binary Resource Preservation**:
  - Extracts and restores `fileBlob` binary data on `LocalResource` records with exact byte equality.

### 7. Final Hardening, Accessibility & Offline Stress Testing (Phase 10 — Complete)
- **Accessibility Hardening**:
  - Skip to main content link added to the application shell.
  - Modals updated with proper `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`, and Escape key dismissal handlers.
  - `Input` and `Select` primitives wired with `aria-invalid` and `aria-describedby` referencing error messages.
  - Table headers audit: table columns configured with `scope="col"` or proper structure across feature views.
- **Responsive Layout Hardening**:
  - Horizontal scrolling handled on data tables, timeline grids, and tab bars (`overflow-x-auto`).
  - Mobile sidebar drawer dismissible via overlay tap or Keyboard `Escape`.
- **Offline & Storage Resilience**:
  - PWA service worker offline caching configured via Vite PWA plugin.
  - Offline status indicator reassures teachers that all operations persist locally in IndexedDB.
- **Destructive Action Safety**:
  - Destructive operations (class deletion, lesson deletion, student enrollment removal, academic year deletion, backup overwrite) require explicit modal confirmation.
- **Security & Zero-Network Audit**:
  - Zero external HTTP fetch, API requests, cloud dependencies, or remote script execution.
  - High-precision student NIN search supported without exposing sensitive civil fields in public lists.

---

## Current System Invariants

1. **Lesson as Single Authoritative Source**:
   - `Lesson` is the sole source of truth; Cahier Journal, Cahier de Textes, and Sequence Planning progress are strictly derived read-only projections.
   - `HomeworkTask` records linked to lessons are synchronized atomically in the same database transaction.

2. **Cahier de Textes & Planning Scoping**:
   - Queries require both `classId` and `academicYearId`. Classes from different academic years never blend logs or progress calculations.

3. **Curriculum Version Integrity**:
   - Lessons reference specific `curriculumVersionId`. Historical lessons retain their original sequence and rubric definitions regardless of active curriculum updates.
   - Planning reports dynamically resolve historical lesson curriculum versions and never fall back to current active curriculum.
   - Sequence/Rubric deletion is rejected if referenced by existing lessons.

4. **Assessment & Grading Snapshot Integrity**:
   - Assessment reports consume `gradingCalculationService` with frozen `componentSnapshot` and `maxOverallScoreSnapshot`.
   - Modifying active global grading schemes after grade entry does not alter historical assessment calculations or report rendering.

5. **Timetable Conflict Uniqueness**:
   - `academicYearId + classId + dayOfWeek + periodNumber` defines unique slot occupancy.
   - Different classes can occupy slots in the same period on the same day.

6. **Attendance Statistics Scoping**:
   - Class attendance metrics require both `academicYearId` and `classId`. Querying with mismatched IDs is rejected.

7. **Atomic Roll Call Validation**:
   - `markAllPresent()` performs an atomic pre-validation pass before writing. Any single invalid enrollment aborts the entire transaction.

8. **Two-Tier Student Identity & Enrollment**:
   - Active enrollment is strictly unique per student per academic year. Register numbers are unique per class roster.



