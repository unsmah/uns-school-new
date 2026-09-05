# UNS SCHOOL — Feature Specifications

A specialized, client-only, offline-first digital workspace tailored for Algerian middle school English teachers (1AM–4AM / 1MS–4MS).

---

## Implemented Features

### 1. Administrative Structure & School Management (Phase 2 Completed)
- **School Profile & Setup**: Configure middle school metadata (name in Latin and Arabic, commune, wilaya, official school code) and teacher identification profile.
- **Academic Years & Trimesters**: School-scoped academic year management with trimester calendar dates (1st, 2nd, 3rd Trimesters), single-current year invariant enforcement, and historical archiving.
- **Middle School Classes**: Scoped class divisions (1MS, 2MS, 3MS, 4MS) bound to the active academic year, capacity indicators, room numbers, and color tags.

### 2. Student Registry & Multi-Year Progression (Phase 2 Completed)
- **Two-Tier Identity Architecture**: Strict separation of permanent civil identity (`StudentPerson`) from annual class enrollment (`StudentEnrollment`).
- **Student Directory & Profiling**: Searchable directory with RTL Arabic support, NIN privacy, and multi-year chronological timeline showing past enrollments.
- **Class Roster & Enrollment Lifecycle**: Sequential class register numbering (`registerNumber`) with strict uniqueness validation, repeating flag (`isRepeating`), and status lifecycle (`active`, `transferred_out`, `withdrawn`, `suspended`).
- **Robust CSV Roster Import Engine**: Delimiter detection, RFC 4180 parsing, multi-pass validation, and atomic IndexedDB execution.

### 3. Classroom Operations (Phase 3 Implemented & Hardened — External Audit Pending)
- **Weekly Timetable Scheduling**:
  - Sunday–Thursday Algerian middle school schedule (Periods 1–8).
  - Class-scoped conflict checking (`academicYearId + classId + dayOfWeek + periodNumber`).
  - Grid UI capable of rendering multiple distinct class slots per cell.
  - Immutability guards on `academicYearId` and `schoolId`.
- **Authoritative Lesson Planning Shell**:
  - Lessons anchor classroom operations and roll call sessions.
  - Strict curriculum context validation: verifying `curriculumVersionId`, checking that `sequenceId` belongs to the curriculum version and matches the lesson level, and ensuring `rubricId` conforms to curriculum version and level restrictions.
  - Non-destructive handling of historical lesson plans.
- **Lesson-Anchored Roll Call & Attendance**:
  - Attendance date is permanently anchored to the parent lesson date and cannot be modified independently.
  - Class attendance statistics are strictly scoped to `academicYearId + classId`.
  - **Atomic Bulk Attendance (`markAllPresent`)**: Zero-tolerance pre-validation ensuring all candidate enrollments exist, belong to the lesson's class and academic year, and are active. Any error aborts the transaction with zero writes.

### 4. Local Storage, Offline Reliability & PWA (Phase 1 Completed)
- **100% Client-Only PWA**: Standalone installable PWA with full offline capabilities via service worker caching.
- **Storage Diagnostics & Telemetry**: StorageManager API quota checks, persistence grant classification, and disaster recovery backup reminders.

---

## Planned Future Phases (Not Yet Implemented)

### Phase 4 — Pedagogical Logs & Inspection Projections (Future)
- **Cahier Journal**: Automated daily pedagogical log projection across all classes with inspector-ready layout (currently preserved as an explicit placeholder).
- **Cahier de Textes**: Chronological class journal tracking syllabus progression and homework assignments (currently preserved as an explicit placeholder).
- **Session Signature & Inspection Validation**: Inspector log verification and pedagogical review stamps.

### Phase 5 — Continuous Assessment & Grading Engine (Future)
- Trimester grading workflow (Continuous Assessment, Term Test, Composition Exam).
- Declarative weighted arithmetic calculations without dynamic code evaluation.
- Official bulletin and gradebook exports.

### Phase 6 — Offline Resources & Inspection Deliverables (Future)
- Inspector-mandated document generation and PDF export.
- Pedagogical material repository.
