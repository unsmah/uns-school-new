# UNS SCHOOL — Project State

**Phase**: Phase 2 — Administrative Core & Student History (Implementation Complete — External Audit Pending)  
**Architecture**: 100% Client-Only SPA (React 19.0.1, Vite, TypeScript, Tailwind CSS, Dexie.js / IndexedDB)  
**Target User**: Middle school English teachers in Algeria (1AM–4AM / 1MS–4MS)  
**Data Privacy**: All data resides strictly on the local client device via IndexedDB. No external servers, APIs, or cloud sync exist.

## Implemented Administrative Core (Phase 2)

1. **School Profile & Setup**
   - CEM metadata (Official Name, Wilaya, Commune, Education District, Inspection Code).
   - Modal-driven editing with data normalization and Zod schema validation.

2. **Academic Year Management & Context Switching**
   - Global reactive `AcademicYearContext` supporting current active year, historical view selection, and archived read-only mode.
   - Atomic year lifecycle controls: creation, setting current (automatically un-setting former current), archiving (freezing modifications), and safe deletion (verifying zero dependent classes/records).

3. **Middle School Level & Class Management**
   - Scoped class divisions (1MS, 2MS, 3MS, 4MS) bound to the active academic year.
   - Capacity metrics, room assignments, level-based tab filtering, and class roster views.

4. **Two-Tier Student Identity & Multi-Year Progression**
   - `StudentPerson` captures invariant civil identity (Latin names, Arabic names with RTL rendering, Date of Birth, Place of Birth, Gender, NIN, Guardian details, medical alerts, pedagogical notes).
   - `StudentEnrollment` links student identity to specific academic year, class, and unique register number (`registerNumber`).
   - Chronological multi-year timeline displaying past and present enrollments across academic years.
   - Status lifecycle transitions: `active`, `transferred_out`, `withdrawn`, `suspended` with status change dates and notes.

5. **Robust Student CSV Import Engine**
   - Multi-pass CSV parsing supporting comma, semicolon, tab, and pipe delimiters.
   - Header auto-matching (Latin/French/Arabic column headers).
   - Multi-pass validation: duplicate checks within CSV, conflict checking with existing class register numbers, matching against existing `StudentPerson` records to avoid duplicate identity creation.
   - Transactional atomic execution via Dexie transaction.

## Current System Invariants

1. **School-Scoped Academic Year**
   - Each school has at most one active (`isCurrent: true`) academic year. Multiple schools can each maintain their own current academic year concurrently.
   - Historical and archived academic years are read-only to preserve official institutional records.

2. **Two-Tier Student Identity & Enrollment**
   - `StudentPerson` captures invariant civil identity (names in Latin and Arabic, date of birth, national ID).
   - `StudentEnrollment` links a person to an academic year, a specific class, and a class register number (`registerNumber`).
   - Active enrollment is strictly unique per student per academic year. Register numbers are unique per class. Invariants are transactionally re-validated on creation, update, and status transitions.

3. **Curriculum-Anchored Pedagogical Sessions**
   - Lessons are bound to valid classes, academic years, curriculum versions, and levels.
   - Lessons serve as the authoritative session event anchor. Unsafe class or academic year changes on lessons with recorded attendance are rejected.

4. **Synchronized Attendance**
   - Attendance records are strictly anchored to parent lessons and their dates.
   - Enrolled students must belong to the exact class and academic year of the parent lesson.

5. **Compliant Middle School Assessments & Gradebook**
   - Assessments must belong to valid classes, academic years, and compatible grading schemes.
   - Grade entries are validated against the assessment's class and academic year with strict duplicate protection and score bounds (0–20).
   - Grade calculations implement official tripartite weighting (Continuous Assessment, Term Test, Composition Exam) without dynamic code evaluation (`eval` / `Function`).

6. **Offline PWA Capabilities**
   - Service worker caching with PWA manifest branded as **UNS SCHOOL**.
   - StorageManager API quota tracking with telemetry diagnostics.
