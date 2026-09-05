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

### 5. Planning & Curriculum Engine (Phase 5 Implemented)
- **Interactive Curriculum Explorer**:
  - Browse versioned national curricula (e.g. 2nd Generation 2016 Reform).
  - Inspect grade levels (1AM, 2AM, 3AM, 4AM), recommended weekly hours, exit profile definitions, competencies (C1, C2, C3), session rubrics, and detailed learning objectives.
- **Yearly & Sequence Planning Cockpit**:
  - Class-by-class progression view calculating planned vs. recorded vs. completed sessions in real time.
  - Pacing indicators (On Track, Falling Behind, Ahead of Schedule) based on sequence targets.
  - Interactive sequence cards showing communicational objectives, project titles, targeted competencies, and direct action to schedule aligned lessons.
- **Competency & Objective Alignment Tracker**:
  - Live matrix showing frequency and chronological dates of targeted core competencies (Oral Interaction, Text Interpretation, Written Production).
  - Granular learning objective coverage matching against recorded lesson plans.
- **Pure Derived Architecture & Historical Preservation**:
  - 100% calculated from authoritative `Lesson` records without redundant planning tables.
  - Historical lessons retain their exact curriculum version and sequences without being altered by active version changes.

### 6. Assessments & Gradebook (Phase 6 Implemented)
- **Continuous Trimester Assessment Engine**:
  - Declarative grading calculation engine handling continuous assessment, term tests, and composition exams with frozen component snapshots (`componentSnapshot`).
  - Strict coefficient weighting, absent zero-scoring semantics, and medical exemption handling.

### 7. Offline Pedagogical Resources & Workflow Extras (Phase 7 Implemented)
- **Teaching Aids & Worksheets Repository**:
  - Offline resource repository storing lesson plans, worksheets, and flashcards with category filters, tag search, and binary Blob storage in IndexedDB.

### 8. Official Documents, Printing & Export (Phase 8 Implemented)
- **Official Middle-School Reports & Printing**:
  - Class List Report, Attendance Register, Cahier de Journal, Cahier de Textes, Sequence Planning & Progression Report, and Assessment Marks Sheet.
  - Print-optimized CSS (@media print), UTF-8 BOM CSV export, and historical curriculum/grading snapshot protection.

### 9. Local-Only Backup & Restore System (Phase 9 Implemented)
- **Portable `.unsschool` Package Export**:
  - Single-click export of all 22 database tables and binary media resources into a self-contained `.unsschool` ZIP package using `fflate`.
- **Cryptographic SHA-256 Integrity Verification**:
  - Independent SHA-256 hashes over table JSON files and resource binary files, verified against a master composite digest (`payloadsChecksumSHA256`).
- **Strict Blocking Referential & Resource Integrity Validation**:
  - Pre-restore validation dry-run inspecting foreign key integrity across all 22 domain entities and strict 1-to-1 resource file matching (checksums, byte sizes, orphan binaries).
  - Any referential integrity violation or resource binary discrepancy directly sets `isValid = false` and blocks restore (`backupPackage = null`), preventing restorable corrupt archives.
- **Pre-Restore Inspection & Safety Snapshot**:
  - Detailed pre-restore inspection modal showing backup version, record counts, resource sizes, and referential integrity insights.
  - Automatically captures an in-memory safety snapshot before database restoration and executes atomic table restoration.
- **Fail-Safe Automatic Rollback**:
  - Instantly reverts to the safety snapshot if restore or post-restore verification fails, leaving live data untouched.

### 10. Local Storage, Offline Reliability & PWA (Phase 1 Completed)
- **100% Client-Only PWA**: Standalone installable PWA with full offline capabilities via service worker caching.
- **Storage Diagnostics & Telemetry**: StorageManager API quota checks, persistence grant classification, and disaster recovery backup reminders.

