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

### 3. Classroom Operations (Phase 3 Implemented)
- **Weekly Timetable Scheduling**:
  - Sunday–Thursday Algerian middle school schedule (Periods 1–8).
  - Class-scoped conflict checking (`academicYearId + classId + dayOfWeek + periodNumber`).
  - Grid UI capable of rendering multiple distinct class slots per cell.
  - Immutability guards on `academicYearId` and `schoolId`.
- **Lesson-Anchored Roll Call & Attendance**:
  - Attendance date is permanently anchored to the parent lesson date and cannot be modified independently.
  - Class attendance statistics are strictly scoped to `academicYearId + classId`.
  - **Atomic Bulk Attendance (`markAllPresent`)**: Zero-tolerance pre-validation ensuring all candidate enrollments exist, belong to the lesson's class and academic year, and are active. Any error aborts the transaction with zero writes.

### 4. Unified Lesson Workflow & Pedagogical Logs (Phase 4 Implemented — External Audit Pending)
- **Authoritative Lesson Master Session**:
  - Comprehensive pedagogical session creator supporting sequence alignment, session rubrics, specific learning objectives, targeted competencies, and teaching materials/aids.
  - Interactive Didactic Activity Steps editor supporting standard pedagogical stages and structured interaction patterns (T-S, S-S, Individual, Group, PW, GW).
- **Atomic Homework Synchronization**:
  - Seamless, transactional synchronization between `Lesson` homework fields and dedicated `HomeworkTask` records (automatic create, update, clear, and cascade delete).
  - Referential integrity protections preventing homework creation in archived years or classes.
- **Derived Cahier Journal (دفتر اليومية)**:
  - Read-only daily pedagogical log dynamically projected across all classes for any selected date in the active academic year.
  - Real-time attendance counters (Present, Absent, Excused), sequence progress indicators, and assigned homework tracking.
- **Derived Cahier de Textes (دفتر النصوص)**:
  - Read-only class pedagogical register strictly scoped by `academicYearId + classId`.
  - Chronological projection of sessions taught, sequence themes, pedagogical stages, specific learning objectives, and assigned homework.
  - Historical curriculum version preservation: resolves sequences, rubrics, and competencies from each lesson's recorded `curriculumVersionId`.

### 5. Local Storage, Offline Reliability & PWA (Phase 1 Completed)
- **100% Client-Only PWA**: Standalone installable PWA with full offline capabilities via service worker caching.
- **Storage Diagnostics & Telemetry**: StorageManager API quota checks, persistence grant classification, and disaster recovery backup reminders.

---

## Planned Future Phases (Not Yet Implemented)

### Phase 5 — Continuous Assessment & Grading Engine (Future)
- Trimester grading workflow (Continuous Assessment, Term Test, Composition Exam).
- Declarative weighted arithmetic calculations without dynamic code evaluation.
- Official bulletin and gradebook exports.

### Phase 6 — Offline Resources & Pedagogical Deliverables (Future)
- Pedagogical material repository, resource tagging, and document exports.

