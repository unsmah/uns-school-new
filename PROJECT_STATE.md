# UNS SCHOOL — Project State

**Phase**: Phase 3 — Classroom Operations (Implementation Complete — External Audit Pending)  
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

### 2. Classroom Operations (Phase 3 Hardened)
- **Weekly Timetable Scheduling**:
  - Sunday–Thursday Algerian teaching schedule (Periods 1–8).
  - Conflict checking strictly scoped to `academicYearId + classId + dayOfWeek + periodNumber`. Multiple classes may concurrently occupy the same period slot on the schedule grid.
  - Immutable `academicYearId` and `schoolId` on existing timetable slots.
- **Authoritative Lesson Shells**:
  - Lessons serve as the authoritative pedagogical session anchor.
  - Strict curriculum context validation: `curriculumVersionId` existence; `sequenceId` must belong to the curriculum version and match the lesson `levelCode`; `rubricId` must belong to the curriculum version and match the level restriction if configured.
  - Safe historical preservation: Existing historical lessons remain readable and intact while validation is enforced on writes and updates.
- **Lesson-Anchored Roll Call & Attendance**:
  - Attendance date is strictly derived from the parent lesson date (not independently editable).
  - Attendance records cascade delete when parent lesson is removed.
  - Attendance statistics are strictly scoped to `academicYearId + classId`, preventing cross-year aggregation errors.
  - **Atomic `markAllPresent()`**: Strict pre-validation pass verifying that all student enrollments exist, belong to the exact class and academic year of the lesson, and are active. Zero-tolerance policy: if any enrollment is invalid or if duplicate IDs are provided, the transaction throws an error and writes **zero** records.
- **Future Roadmap Preservation (Zero Phase 4 Scope Leakage)**:
  - `CahierJournalPage` is maintained strictly as an explicit Phase 4 placeholder (`Phase1ModulePlaceholder`), alongside `CahierTextesPage`. Daily pedagogical journal generation, inspection logbooks, and signature workflows are deferred to Phase 4.

---

## Current System Invariants

1. **Timetable Conflict Uniqueness**:
   - `academicYearId + classId + dayOfWeek + periodNumber` defines unique slot occupancy.
   - Different classes can occupy slots in the same period on the same day.

2. **Attendance Statistics Scoping**:
   - Class attendance metrics require both `academicYearId` and `classId`. Querying with mismatched IDs is rejected.

3. **Atomic Roll Call Validation**:
   - `markAllPresent()` performs an atomic pre-validation pass before writing. Any single invalid enrollment aborts the entire transaction.

4. **Lesson Curriculum Relational Integrity**:
   - `curriculumVersionId` must exist.
   - `sequenceId` (if present) must match `curriculumVersionId` and lesson `levelCode`.
   - `rubricId` (if present) must match `curriculumVersionId` and level constraint.

5. **Two-Tier Student Identity & Enrollment**:
   - Active enrollment is strictly unique per student per academic year. Register numbers are unique per class roster.
