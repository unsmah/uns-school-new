# UNS SCHOOL

## Master Project Context, Product Constitution & AI Development Guide

**Project identifier:** `UnsSchool`
**Product name:** **UNS SCHOOL**
**Repository:** `unsmah/uns-school-new`
**Primary target:** Algerian middle-school teachers
**Initial specialization:** English teachers, levels 1AM–4AM
**Architecture:** Local-first, offline-first, client-only Progressive Web App
**Primary persistence:** IndexedDB through Dexie.js

---

# 1. PURPOSE OF THIS DOCUMENT

This document is the permanent high-level context for the UNS SCHOOL project.

It exists so that any developer, coding agent, AI model, Google AI Studio session, Remix session, or future development environment can understand the project without depending on previous conversation history.

This file is part of the project's architecture.

## IMPORTANT

The repository is the source of truth.

Previous AI conversations are NOT the source of truth.

Do not assume that because a previous AI session implemented something, the implementation is automatically correct.

Before making changes:

1. Read this file.
2. Read `PROJECT_STATE.md`.
3. Read `ARCHITECTURE.md`.
4. Read `DATABASE.md`.
5. Read `FEATURES.md`.
6. Inspect the actual source code.
7. Determine the current implementation state.
8. Make only the requested changes.

If documentation and implementation disagree, do not silently choose one.

Investigate the discrepancy and preserve data integrity.

---

# 2. PRODUCT VISION

UNS SCHOOL is a digital professional workspace for Algerian middle-school teachers.

Its purpose is to replace fragmented paper-based teacher workflows with one coherent local digital system.

The system should progressively replace or assist with:

* Cahier Journal
* Cahier de Textes
* lesson planning
* sequence planning
* curriculum tracking
* class registers
* student records
* attendance
* timetable
* assessment records
* gradebook
* competency tracking
* homework
* observations
* behaviour records
* remediation
* reports
* printable documents
* resource organization
* academic-year organization
* teacher administrative records

The application must feel like a **teacher's professional workspace**, not merely a student database.

---

# 3. CORE PRINCIPLE

## ENTER INFORMATION ONCE → REUSE IT EVERYWHERE

This is one of the most important architectural principles of UNS SCHOOL.

Information should have one authoritative source and be reused throughout the application.

For example:

A teacher creates a lesson once.

That lesson can subsequently provide data for:

* Cahier Journal
* Cahier de Textes
* attendance
* lesson history
* sequence progress
* homework
* reports
* future analytics
* planning history

The user should not be forced to enter the same information repeatedly into different modules.

---

# 4. SOURCE OF TRUTH PRINCIPLE

Every important piece of information must have a clearly defined authoritative source.

The system must avoid competing copies of the same fact.

Current conceptual model:

| Information        | Source of truth           |
| ------------------ | ------------------------- |
| Student identity   | `StudentPerson`           |
| Student enrollment | `StudentEnrollment`       |
| Class              | `SchoolClass`             |
| Academic year      | `AcademicYear`            |
| Lesson             | `Lesson`                  |
| Attendance         | `AttendanceRecord`        |
| Assessment         | `Assessment`              |
| Grade              | `GradeEntry`              |
| Homework           | `HomeworkTask`            |
| Curriculum         | Versioned curriculum data |
| Grading rules      | `GradingScheme`           |

Derived information should be calculated or generated from source data rather than stored as an independent competing record unless there is a documented reason.

Examples:

| Output                | Derived from                            |
| --------------------- | --------------------------------------- |
| Cahier Journal        | Lesson + Attendance                     |
| Cahier de Textes      | Lesson + Homework                       |
| Lesson History        | Lesson                                  |
| Sequence Progress     | Lesson + Curriculum                     |
| Attendance Statistics | AttendanceRecord                        |
| Grade Averages        | Assessment + GradeEntry + GradingScheme |
| Deliberation Sheet    | Grade data + grading rules              |

---

# 5. TARGET USERS

The primary user is an Algerian middle-school teacher.

Initial specialization:

**English teacher — 1AM, 2AM, 3AM, 4AM**

The architecture must remain extensible so that future versions can support additional subjects without rewriting the core system.

Do not over-specialize the core data model around English-only concepts.

English-specific curriculum data belongs in the curriculum/content layer, not in generic infrastructure.

---

# 6. ALGERIAN EDUCATIONAL CONTEXT

The product is designed for the Algerian middle-school environment.

The system should understand concepts such as:

* 1AM
* 2AM
* 3AM
* 4AM
* classes/divisions
* academic years
* sequences
* competencies
* learning objectives
* classroom sessions
* lesson activities
* assessment
* remediation
* teacher planning
* Cahier Journal
* Cahier de Textes
* student registers
* attendance
* school timetable
* teacher administrative documentation

The UI may use terminology appropriate to Algerian teachers.

However:

## NEVER INVENT OFFICIAL CURRICULUM CONTENT

AI-generated or developer-created educational content must NOT be labelled as official Algerian curriculum content unless its provenance has been verified.

Official curriculum content must be:

* sourced
* identifiable
* versioned
* traceable
* stored as curriculum data
* historically preserved

Do not fabricate official sequences, competencies, rubrics, learning objectives, or programme documents merely to populate the application.

---

# 7. CURRICULUM PRINCIPLE

The curriculum engine must be **data-driven and versioned**.

Curriculum structures must not be hardcoded into TypeScript enums or scattered through UI components.

Conceptual hierarchy:

```text
CurriculumVersion
        ↓
CurriculumLevelConfig
        ↓
CurriculumSequence
        ↓
CompetencyDefinition
        ↓
LearningObjectiveDefinition
        ↓
SessionRubricDefinition
        ↓
Lesson
```

A lesson must retain enough curriculum context to remain historically meaningful even if the curriculum changes later.

An old lesson must NOT silently switch to a newer curriculum version.

---

# 8. CURRICULUM VERSIONING

Curriculum may change over time.

Therefore curriculum data must be treated as versioned historical data.

A lesson created under Curriculum Version A must continue referencing Version A even after Version B becomes current.

Never rewrite historical lessons merely because a newer curriculum is installed.

Conceptually:

```text
Curriculum Version 1
       ↓
2025 lesson
       ↓
remains linked to Version 1

Curriculum Version 2
       ↓
2026 lesson
       ↓
uses Version 2
```

Historical integrity is mandatory.

---

# 9. GRADING PRINCIPLE

The grading system must be configurable.

Do NOT hardcode grading formulas throughout UI components.

The conceptual architecture is:

```text
GradingScheme
      ↓
Grading Components
      ↓
Weights / Coefficients / Maximum Scores
      ↓
Pure Grading Calculation Service
      ↓
Results
```

A grading scheme may contain:

* components
* maximum scores
* weights
* coefficients
* continuous assessment rules
* applicable levels
* term rules
* other documented configuration

The calculation engine must be a pure, testable service.

---

# 10. NEVER EXECUTE USER FORMULAS AS JAVASCRIPT

If future grading customization requires formulas, do NOT use:

```text
eval()
new Function()
Function()
```

Never execute arbitrary formula strings as JavaScript.

Use a declarative formula representation such as:

* validated tokens
* AST
* restricted DSL
* explicit calculation structures

Security and deterministic calculation are more important than convenience.

---

# 11. HISTORICAL DATA IS SACRED

UNS SCHOOL is a historical record system.

Data from previous academic years must remain meaningful.

Never solve a current workflow problem by destroying historical information.

Examples:

A student changing class does not mean modifying the old enrollment.

A new academic year does not mean overwriting the previous academic year.

A new curriculum does not mean rewriting old lessons.

A changed grading scheme does not mean recalculating historic records using today's configuration.

---

# 12. SCHOOL / ACADEMIC YEAR MODEL

A School is persistent.

An Academic Year belongs to a School.

Conceptually:

```text
School
 ├── AcademicYear 2024/2025
 ├── AcademicYear 2025/2026
 └── AcademicYear 2026/2027
```

The system must enforce:

```text
AcademicYear.schoolId === School.id
```

Only one academic year may be current for a school.

The repository/service layer—not only the UI—must enforce this invariant.

Archived academic years are historical records and should generally be read-only.

---

# 13. CLASS MODEL

A class belongs to exactly one academic year.

Therefore:

```text
SchoolClass.academicYearId
        ↓
AcademicYear.schoolId
```

and:

```text
SchoolClass.schoolId === AcademicYear.schoolId
```

must always be true.

The repository/service layer must validate this.

## CLASS ACADEMIC-YEAR IMMUTABILITY

Once a class is created, it must NOT be moved to another academic year by changing `academicYearId`.

If a similar class is needed in a new academic year:

Create a new class record.

Do not mutate the historical class.

---

# 14. STUDENT IDENTITY MODEL

Student identity and enrollment are deliberately separated.

## StudentPerson

Represents the real person.

It has a stable identity across academic years.

Possible identity information includes:

* stable UUID
* legal first name
* legal last name
* Latin names
* Arabic names
* date of birth
* gender
* guardian/contact information
* national identification number where appropriate

## StudentEnrollment

Represents the student's participation in a specific academic year/class.

It can contain:

* studentPersonId
* academicYearId
* classId
* register number
* enrollment status
* repeating status
* enrollment date
* transfer/exit information

Conceptually:

```text
StudentPerson
      ↓
Enrollment 2025/2026
      ↓
2AM-A

StudentPerson
      ↓
Enrollment 2026/2027
      ↓
3AM-B
```

The StudentPerson remains the same.

The enrollment changes.

---

# 15. STUDENT HISTORY

Promotion must create a new enrollment.

Do NOT overwrite the old enrollment.

Historical data must remain queryable.

Example:

```text
StudentPerson: Mohamed X

2024/2025 → 1AM-A
2025/2026 → 2AM-B
2026/2027 → 3AM-A
```

All three enrollments belong to the same StudentPerson.

This allows historical:

* classes
* attendance
* assessments
* observations
* remediation
* lessons
* academic records

to remain correctly anchored.

---

# 16. ENROLLMENT INVARIANTS

The application must enforce:

* StudentPerson exists.
* AcademicYear exists.
* Class exists.
* Class belongs to the selected AcademicYear.
* Class belongs to the selected School context.
* AcademicYear belongs to the selected School.
* Duplicate active enrollment rules are respected.
* Register number uniqueness rules are respected.
* Historical enrollment is preserved.

Never rely solely on Dexie indexes for uniqueness.

Dexie indexes do not themselves provide all domain-level uniqueness guarantees required by UNS SCHOOL.

Enforce uniqueness through repository/service transactions.

---

# 17. ATTENDANCE PRINCIPLE

The lesson is the primary classroom session anchor.

There should not be an unrelated independent attendance-session concept competing with Lesson.

Conceptually:

```text
Lesson
 ├── date
 ├── class
 ├── time
 ├── sequence
 ├── rubric
 └── activities

AttendanceRecord
 └── lessonId
```

Administrative roll-call events can be represented through the lesson/session model using a data-defined administrative rubric where appropriate.

Attendance must remain historically anchored to the correct lesson/session.

---

# 18. ATTENDANCE DATE INTEGRITY

AttendanceRecord date must agree with its Lesson date.

The UI must not allow an attendance record to silently drift to another date independently of its lesson.

The lesson is authoritative.

If the lesson date changes through an allowed workflow, associated attendance must remain consistent according to the defined transaction rules.

---

# 19. TIMETABLE

The timetable is planned for a later phase.

The initial Algerian school-week assumption is:

```text
Sunday
Monday
Tuesday
Wednesday
Thursday
```

Do not assume this is globally universal.

Keep the model configurable enough for future variations.

Do not implement timetable functionality before its designated roadmap phase.

---

# 20. LESSON ARCHITECTURE

The lesson will eventually become one of the central entities in UNS SCHOOL.

A lesson should be capable of representing:

* class
* date
* time
* sequence
* curriculum context
* session rubric
* objectives
* activities
* resources
* homework
* attendance relationship
* completion state
* teacher notes

The lesson must remain a source entity rather than merely a display record.

---

# 21. UNIFIED LESSON WORKFLOW

Future lesson creation should support a workflow such as:

```text
Select Class
      ↓
Select Date / Time
      ↓
Select Curriculum Context
      ↓
Select Sequence
      ↓
Select Session Rubric
      ↓
Define Objectives
      ↓
Build Activities
      ↓
Record Attendance
      ↓
Record Homework
      ↓
Complete Lesson
```

The exact UI may evolve.

The source-of-truth principle must not.

---

# 22. CAHIER JOURNAL

Cahier Journal should eventually be a structured digital representation of the teacher's daily pedagogical record.

It should primarily derive from lesson data.

It should not require teachers to re-enter the same lesson information.

Conceptually:

```text
Lesson
 + Attendance
      ↓
Cahier Journal
```

Future print/export functionality can format this information appropriately.

---

# 23. CAHIER DE TEXTES

Cahier de Textes should primarily derive from lesson and homework information.

Conceptually:

```text
Lesson
 + Homework
      ↓
Cahier de Textes
```

Do not create an unrelated duplicate lesson database for Cahier de Textes.

---

# 24. LESSON HISTORY

Lesson history should be derived from source lesson records.

Teachers should eventually be able to see:

* previous lessons
* classes taught
* sequences covered
* objectives
* activities
* homework
* attendance
* historical progress

The system should make past teaching information reusable.

---

# 25. PLANNING

Future planning functionality will include:

* annual planning
* sequence planning
* lesson planning
* curriculum progress
* expected vs completed work
* pacing
* teacher notes

Planning must remain connected to actual lesson records.

Avoid creating planning data that becomes disconnected from what the teacher actually taught.

---

# 26. ASSESSMENT AND GRADEBOOK

Future assessment functionality will include:

* assessment definitions
* assessment dates
* assessment components
* student grades
* gradebook
* term calculations
* averages
* coefficients
* grading schemes
* competency tracking
* reports
* deliberation outputs

Grades must belong to the appropriate StudentEnrollment and AcademicYear context.

Historic assessment calculations must remain reproducible.

---

# 27. GRADING SNAPSHOT PRINCIPLE

When an assessment is created, relevant grading configuration should be preserved/snapshotted as required by the domain model.

If a teacher changes the grading scheme later, historic assessments must not unexpectedly change.

Historical results must remain reproducible.

---

# 28. HOMEWORK

Future homework functionality will allow teachers to:

* create homework
* associate it with a class
* associate it with a lesson
* assign a due date
* track completion where appropriate

Homework should connect to the lesson source rather than becoming a second independent lesson record.

---

# 29. OBSERVATIONS / BEHAVIOUR

Future student observation functionality may include:

* pedagogical observations
* behaviour
* participation
* strengths
* difficulties
* teacher notes
* intervention notes

These records must be tied to the correct StudentEnrollment where the observation is academic-year-specific.

Avoid unnecessary exposure of sensitive information.

---

# 30. REMEDIATION

Future remediation functionality will allow teachers to record:

* students requiring remediation
* target competencies
* identified difficulties
* remediation sessions
* progress
* follow-up

Remediation must connect to curriculum and student history without destroying previous records.

---

# 31. RESOURCE LIBRARY

The application will eventually support a local resource library.

Resources may include:

* lesson materials
* worksheets
* documents
* images
* teaching aids
* audio/video where technically appropriate

Resources should remain locally stored where possible.

Resource records should have stable metadata and file integrity information.

---

# 32. BACKUP / RESTORE

UNS SCHOOL must provide reliable local data portability.

The intended backup format is:

```text
.unsschool
```

The container should conceptually include:

```text
manifest
database records
resource files
resource manifest
checksums
application version
format version
record counts
```

Checksums should use SHA-256 where appropriate.

Avoid circular checksum calculations.

---

# 33. SAFE RESTORE PRINCIPLE

Restore must never blindly overwrite the user's data.

Conceptual workflow:

```text
Select Backup
      ↓
Inspect Manifest
      ↓
Validate Structure
      ↓
Validate Checksums
      ↓
Check Compatibility
      ↓
Run Migration if Required
      ↓
Show Preview
      ↓
Create Safety Snapshot
      ↓
Atomic Restore
```

A failed restore must not leave a partially restored database.

---

# 34. STORAGE

Primary persistence is:

```text
IndexedDB
    ↓
Dexie.js
```

The application may request persistent browser storage.

Persistence status should be observable through application telemetry such as:

* `PERSISTENCE_GRANTED`
* `PERSISTENCE_NOT_GRANTED`
* `PERSISTENCE_UNAVAILABLE`

Also expose storage estimates where appropriate.

Important:

Browser persistence requests are requests, not guarantees.

The UI should not claim permanent storage merely because a persistence request was made.

Users should be encouraged to create periodic `.unsschool` backups.

---

# 35. OFFLINE-FIRST PRINCIPLE

Core UNS SCHOOL functionality must work without internet access.

The application must not require:

* cloud authentication
* server API
* cloud database
* network connection

for normal core teacher workflows.

Internet availability should not determine whether the teacher can access locally stored school data.

---

# 36. PWA

UNS SCHOOL is intended to be a Progressive Web App.

The application should support:

* installation
* offline shell
* cached application assets
* reliable startup
* local data access
* appropriate update behavior

Do not compromise local data integrity when updating the application.

---

# 37. CLIENT-ONLY ARCHITECTURE

This is a fundamental constraint.

UNS SCHOOL is intentionally:

**100% client-only.**

The application must not introduce a backend unless the architecture is explicitly re-approved in the future.

Current persistence:

```text
React
 ↓
Application Services
 ↓
Repositories
 ↓
Dexie
 ↓
IndexedDB
```

There is no required:

```text
React
 ↓
REST API
 ↓
Server
 ↓
Database
```

architecture.

---

# 38. PROHIBITED TECHNOLOGIES

Unless the project architecture is explicitly changed and approved, do NOT introduce:

* Express
* Firebase
* Supabase
* server-side database
* REST backend
* GraphQL backend
* cloud persistence
* authentication server
* cloud synchronization
* server analytics
* Gemini API as a required application service
* `@google/genai`
* arbitrary external APIs
* `axios`
* `fetch()` for application persistence/data workflows
* `eval()`
* `new Function()`
* `Function()`

Do not add backend infrastructure simply because an AI coding environment makes it easy to do so.

---

# 39. AI FEATURES

AI may be considered in the future.

However:

## AI MUST NEVER BE REQUIRED FOR CORE OPERATION

A teacher must be able to:

* create classes
* manage students
* create lessons
* record attendance
* manage assessments
* access history
* print/export
* backup/restore

without an AI service.

Future AI features must be:

* optional
* privacy-conscious
* clearly separated from core persistence
* disabled gracefully when unavailable

Never send student data to external AI services without explicit architectural approval and an appropriate privacy model.

---

# 40. PRIVACY

Student data is sensitive.

The application should follow data-minimization principles.

Particularly sensitive information such as national identification numbers must not be unnecessarily exposed.

Do not:

* broadly display NIN in student tables
* expose NIN in generic search-result labels
* unnecessarily log NIN
* transmit student data to external services

Search functionality should be privacy-conscious.

If NIN lookup is supported, it should be intentional and controlled.

---

# 41. INTERNATIONALIZATION

The long-term UI must support:

* English
* French
* Arabic

Arabic must support proper RTL behavior.

Internationalization should be designed into the architecture rather than implemented as scattered conditional strings.

Do not hardcode UI language assumptions into domain logic.

---

# 42. RESPONSIVE DESIGN

The application should work across:

* desktop
* laptop
* tablet
* mobile-sized screens where practical

The primary professional workflow is expected to be desktop/tablet friendly.

The interface should remain usable in real classroom/school environments.

---

# 43. UX PRINCIPLES

The application should be:

* fast
* clear
* predictable
* low-friction
* professional
* accessible
* responsive
* data-safe

Avoid unnecessary wizard steps.

Avoid duplicate entry.

Avoid hiding critical data behind excessive navigation.

Use clear terminology appropriate to teachers.

---

# 44. ACCESSIBILITY

Accessibility is a first-class requirement.

Future and current UI should consider:

* keyboard navigation
* focus management
* semantic HTML
* labels
* readable contrast
* form errors
* screen-reader support
* touch targets
* reduced motion where appropriate
* accessible dialogs
* accessible tables

Do not sacrifice accessibility for visual polish.

---

# 45. TECHNICAL STACK

Current intended stack:

```text
React 19
TypeScript
Vite
Tailwind CSS
shadcn/ui / Radix-style accessible primitives where appropriate
Dexie.js
IndexedDB
Zustand or lightweight state management where appropriate
React Hook Form
Zod
Vite PWA / Workbox
Client-side PDF generation
CSV/XLSX import/export
```

Use existing project dependencies before introducing new ones.

Do not add a dependency merely because it is convenient.

---

# 46. APPLICATION ARCHITECTURE

Preferred architecture:

```text
React UI
     ↓
Router
     ↓
Feature Modules
     ↓
Application Services
     ↓
Repository Layer
     ↓
Dexie
     ↓
IndexedDB
```

Feature organization:

```text
src/
├── app/
├── components/
├── db/
├── features/
├── services/
├── types/
└── utils/
```

Exact folder structure may evolve, but separation of concerns must remain.

---

# 47. UI / DATABASE SEPARATION

UI components must NOT directly manipulate Dexie tables.

Bad:

```text
Component
   ↓
db.lessons.add(...)
```

Preferred:

```text
Component
   ↓
Service
   ↓
Repository
   ↓
Dexie
```

This allows:

* testing
* validation
* transactions
* invariant enforcement
* future migrations
* predictable domain behavior

---

# 48. REPOSITORY RESPONSIBILITY

Repositories/services must enforce domain invariants.

Do not assume the UI has validated data correctly.

The following are examples of repository/service responsibilities:

* academic-year uniqueness
* school/year relationship
* class/year relationship
* class/school relationship
* class academic-year immutability
* enrollment uniqueness
* register-number uniqueness
* student identity validation
* historical protection
* archive protection
* transactional operations

---

# 49. TRANSACTIONS

Operations involving multiple related records must use appropriate Dexie transactions.

Examples:

* CSV student import
* student enrollment creation
* archive operations affecting dependent data
* future lesson/attendance operations
* backup restore

If a multi-record operation fails, it should not leave the database in a partially mutated state.

---

# 50. IMPORT SAFETY

CSV import must follow:

```text
Select
 ↓
Parse
 ↓
Validate
 ↓
Preview
 ↓
User confirms
 ↓
Transactional import
 ↓
Result summary
```

Cancel before confirmation must produce:

**ZERO database mutation.**

Validation errors should be reported by row.

Uncertain identity must not be automatically merged.

---

# 51. STUDENT IDENTITY MATCHING

Automatic identity matching must be conservative.

Strong matching:

### NIN

Exact NIN match can be considered a strong identity signal.

But conflicting identity information must be flagged.

### Name + DOB

Automatic matching may occur when:

* first name matches exactly under approved normalization
* last name matches exactly under approved normalization
* DOB exists in both records
* DOB matches exactly

### Missing DOB

Name-only matching must NOT automatically merge students when DOB is missing.

### Conflicting DOB

Same name + different DOB:

**DO NOT MERGE.**

### Ambiguous candidates

Multiple possible matches:

**DO NOT AUTOSELECT.**

Require review.

Core principle:

> False non-match is safer than false identity merge.

---

# 52. GENDER DATA

Never invent student demographic information.

Missing or invalid gender must never silently become Male.

Do not implement:

```text
normalizeGender(value) || "M"
```

If the current model requires gender:

* reject invalid/missing values appropriately,
* or explicitly support an unknown state only if the domain model already permits it.

Never fabricate a value.

---

# 53. DATE OF BIRTH DATA

If DOB is supplied but invalid:

**IMPORT ERROR.**

Do not silently convert invalid values to null.

Do not downgrade invalid supplied DOB to a warning.

A genuinely missing DOB may be allowed only if the domain model permits it.

Missing DOB must not be used to justify automatic identity matching.

---

# 54. ACADEMIC YEAR ARCHIVING

Archived academic years represent historical data.

Generally:

* historical viewing = allowed
* new classes = prohibited
* new enrollments = prohibited
* destructive mutation = prohibited
* historical records = preserved

Any exception must be explicitly defined by the domain.

---

# 55. CURRENT ACADEMIC YEAR

There should be at most one current academic year per school.

This is a service/repository invariant.

Do not rely solely on an IndexedDB index to enforce it.

When setting a year as current:

* unset previous current year
* set selected year
* perform the operation transactionally

---

# 56. DATA DELETION

Prefer archive/soft-delete where historical information matters.

Avoid hard deletion of:

* academic years
* student identity
* enrollments
* lessons
* attendance
* assessments
* grades

unless the domain explicitly permits it and safety checks are satisfied.

Resources may have explicit purge workflows where appropriate.

---

# 57. HISTORICAL IMMUTABILITY

Historical curriculum, enrollment, assessment, and lesson context must not silently change.

When an object is historical:

* preserve its original context
* avoid destructive edits
* avoid automatic migration to current configuration

Migration must be explicit and versioned where required.

---

# 58. DATA VALIDATION

Use appropriate validation at boundaries.

Preferred tools:

* Zod
* domain validation functions
* repository checks
* transactional integrity checks

Validation should distinguish:

* invalid
* missing
* conflicting
* ambiguous
* archived
* duplicate

Do not turn every problem into a generic "invalid data" message.

---

# 59. ERROR HANDLING

Errors should be:

* deterministic
* understandable
* actionable
* safe

Do not expose internal database details to normal users.

For imports, identify:

* row
* field
* problem
* recommended correction

---

# 60. TESTING PHILOSOPHY

Tests are part of the architecture.

Every important invariant should have regression tests.

Especially:

* academic-year invariants
* school/year relationships
* class/year relationships
* student identity matching
* enrollment uniqueness
* register number uniqueness
* archive protection
* import atomicity
* grading calculations
* historical integrity

When fixing a bug:

1. reproduce it
2. add a regression test
3. fix the implementation
4. run the full suite

---

# 61. REQUIRED VERIFICATION AFTER SIGNIFICANT CHANGES

At minimum, run:

```bash
npm run lint
npm test
npm run build
```

Also inspect for forbidden architecture patterns when relevant.

Search for:

```text
eval(
new Function(
Function(
@ts-ignore
fetch(
axios
firebase
supabase
@google/genai
express
GEMINI_API_KEY
Cloud Run
```

Every relevant match must be investigated.

---

# 62. DOCUMENTATION CONTRACT

The following files are permanent project documentation:

```text
PROJECT_CONTEXT.md
PROJECT_STATE.md
ARCHITECTURE.md
DATABASE.md
FEATURES.md
```

## PROJECT_CONTEXT.md

Contains:

* product vision
* architecture constitution
* global rules
* roadmap
* AI development protocol

## PROJECT_STATE.md

Contains:

* current phase
* implemented features
* current status
* recent changes
* known issues
* verification results

It must reflect reality.

## ARCHITECTURE.md

Contains:

* technical architecture
* modules
* services
* repositories
* domain boundaries
* integrity rules

## DATABASE.md

Contains:

* entities
* relationships
* indexes
* transactions
* migration rules
* historical rules

## FEATURES.md

Contains:

* product feature specifications
* current feature status
* future features
* scope boundaries

---

# 63. DOCUMENTATION MUST NOT LIE

Never update documentation merely to make a task appear complete.

If implementation is incomplete:

Say so.

If tests were not actually run:

Say so.

If external verification has not happened:

Say so.

Do not claim:

* "fully tested"
* "production ready"
* "approved"
* "complete"

unless the evidence supports the claim.

---

# 64. CURRENT DEVELOPMENT MODEL

UNS SCHOOL is developed incrementally.

The project is divided into controlled phases.

Only one phase should be implemented at a time.

A phase must be:

1. specified
2. implemented
3. tested
4. audited
5. approved

before the next phase begins.

---

# 65. PHASE ROADMAP

## PHASE 0 — Architecture & Domain Constitution

Purpose:

Establish the architecture, domain model, historical principles, source-of-truth rules, curriculum strategy, grading strategy, backup philosophy, and local-first principles.

Status:

**Completed conceptually.**

---

# 66. PHASE 1 — FOUNDATION

Purpose:

Build the technical foundation.

Expected scope:

* React/Vite foundation
* TypeScript
* Tailwind
* accessible UI primitives
* Dexie/IndexedDB foundation
* strict database schema foundation
* routing
* PWA foundation
* offline foundation
* storage telemetry
* repository/service structure
* core architectural tests

Status:

**Implemented.**

Must remain compatible with the architecture described in this document.

---

# 67. PHASE 2 — ADMINISTRATIVE CORE & STUDENT HISTORY

Purpose:

Build the administrative foundation required before classroom operations.

Scope:

* School management
* Teacher profile foundation
* Academic years
* academic-year switcher
* levels
* classes
* class archives
* StudentPerson
* StudentEnrollment
* historical student records
* class rosters
* CSV student import
* validation
* safe identity matching
* import preview
* transactional import
* privacy-conscious student directory

Phase 2 does NOT include classroom lesson functionality.

The phase must not implement:

* timetable
* lessons
* attendance
* Cahier Journal
* Cahier de Textes
* assessments
* gradebook
* homework
* remediation
* reporting

Phase 2 must be externally audited before Phase 3 begins.

---

# 68. PHASE 3 — CLASSROOM OPERATIONS

Purpose:

Connect administrative data to daily classroom operations.

Planned scope:

* Sunday–Thursday timetable
* timetable management
* class workspace
* lesson session anchoring
* lesson-anchored attendance
* attendance workflows
* student historical classroom portfolio
* classroom operational views

Core principle:

Lesson becomes the primary session anchor.

---

# 69. PHASE 4 — UNIFIED LESSON WORKFLOW

Purpose:

Create the central lesson workflow.

Planned scope:

* data-driven lesson creator
* curriculum-aware lesson creation
* sequence selection
* session rubric selection
* objectives
* activity builder
* lesson completion
* attendance integration
* homework integration
* derived Cahier Journal
* derived Cahier de Textes
* lesson history

Core principle:

One lesson record feeds multiple teacher workflows.

---

# 70. PHASE 5 — PLANNING & CURRICULUM

Purpose:

Build curriculum-aware planning.

Planned scope:

* curriculum versions
* level configurations
* sequences
* competencies
* learning objectives
* session rubrics
* sequence planner
* curriculum tracker
* expected vs completed progress
* planning analytics
* curriculum history

Curriculum data must remain versioned.

Official content requires provenance.

---

# 71. PHASE 6 — ASSESSMENT & GRADEBOOK

Purpose:

Build the assessment and grading system.

Planned scope:

* assessment creation
* assessment components
* grade entry
* gradebook
* configurable grading schemes
* coefficients
* term calculations
* competency tracking
* averages
* deliberation data
* historical calculation integrity

Grading calculations must remain deterministic and testable.

---

# 72. PHASE 7 — TEACHER WORKFLOW EXTRAS

Planned scope:

* homework management
* observations
* behaviour
* remediation
* intervention tracking
* teacher notes
* resource library
* classroom workflow improvements
* global search
* additional automation/templates

Do not let convenience features violate historical or privacy rules.

---

# 73. PHASE 8 — OFFICIAL DOCUMENTS & PRINTING

Planned scope:

* printable Cahier Journal
* printable Cahier de Textes
* class registers
* attendance sheets
* grade sheets
* reports
* official-format documents where verified
* PDF generation
* print layouts
* document templates

Official document formats must not be invented.

Where a document is described as official, its source must be verified.

---

# 74. PHASE 9 — BACKUP & RESTORE

Planned scope:

* `.unsschool` backup
* manifest
* checksums
* resource packaging
* backup validation
* restore preview
* compatibility checking
* migration
* safety snapshot
* atomic restore
* backup history/management

Do not sacrifice safety for convenience.

---

# 75. PHASE 10 — HARDENING

Planned scope:

* accessibility audit
* responsive audit
* offline stress testing
* large-dataset testing
* IndexedDB resilience
* backup/restore stress tests
* performance optimization
* privacy audit
* data-integrity audit
* migration testing
* PWA update testing
* error recovery
* final production hardening

---

# 76. PHASE DISCIPLINE

An AI coding agent MUST NOT start the next phase automatically.

At the end of a phase:

1. implement only that phase
2. run verification
3. update documentation
4. report results
5. stop

Then wait for explicit approval.

---

# 77. AI DEVELOPMENT PROTOCOL

Every AI coding session must follow this protocol.

## BEFORE CODING

Read:

```text
PROJECT_CONTEXT.md
PROJECT_STATE.md
ARCHITECTURE.md
DATABASE.md
FEATURES.md
```

Then inspect the relevant source code.

Determine:

* current phase
* existing implementation
* existing repositories
* existing services
* existing tests
* current schema
* known issues

Do not assume.

---

# 78. AI CHANGE CONTROL

Before changing architecture, ask:

> Is this actually required by the requested feature?

If not, do not change it.

Do not:

* refactor unrelated modules
* rename large portions of the application
* replace working libraries
* rewrite the database
* introduce new architecture
* add backend services
* change persistence strategy

just because a different design seems preferable.

---

# 79. MINIMAL CHANGE PRINCIPLE

When fixing a bug:

Prefer:

```text
small targeted fix
+
regression test
```

over:

```text
large rewrite
```

Preserve existing functionality.

Do not introduce unrelated improvements during a controlled phase.

---

# 80. NO SILENT SCOPE EXPANSION

If you discover another issue:

* document it
* fix it only if it directly blocks the requested task or violates a critical invariant
* otherwise report it as a known issue

Do not silently expand the scope.

---

# 81. DATABASE SAFETY PROTOCOL

Before changing database structures:

1. inspect current schema
2. inspect existing migrations
3. inspect repositories
4. determine whether schema change is actually necessary
5. avoid unnecessary version increments
6. preserve existing data
7. add migration logic when required
8. test old and new data behavior

Never change schema merely for convenience.

---

# 82. NO DIRECT DATA DESTRUCTION

AI agents must not:

* clear IndexedDB
* delete all records
* reset production data
* replace the database wholesale

unless the user explicitly requests a controlled destructive operation.

During development, prefer migrations and test fixtures.

---

# 83. IMPORT SAFETY PROTOCOL

For CSV/import work:

```text
Parse
 ↓
Normalize
 ↓
Validate
 ↓
Resolve identity
 ↓
Preview
 ↓
Confirm
 ↓
Transaction
```

Never mutate the database merely while parsing or previewing.

---

# 84. IDENTITY SAFETY PROTOCOL

When identity is uncertain:

```text
STOP
 ↓
REPORT
 ↓
REVIEW
```

Never:

```text
guess
 ↓
merge
 ↓
overwrite
```

False identity merges can corrupt years of student history.

---

# 85. PRIVACY-FIRST DEVELOPMENT

When deciding between two technically valid designs:

Prefer the design that exposes less student information.

Especially for:

* NIN
* guardian data
* contact information
* sensitive observations
* behaviour records

Do not expose sensitive data merely because it is available in the database.

---

# 86. PERFORMANCE PRINCIPLE

The application may eventually contain:

* many students
* many classes
* multiple academic years
* years of lessons
* attendance records
* grades
* resources

Design queries and UI flows with realistic growth in mind.

Avoid loading the entire database into memory unnecessarily.

Use indexed queries and appropriate repository methods.

---

# 87. SEARCH PRINCIPLE

Global search should eventually cover useful teacher information.

But sensitive fields must be intentionally controlled.

Normal search results should prioritize:

* student names
* class
* academic year
* lessons
* sequences
* resources
* assessments

Do not casually expose NIN or sensitive notes in global search.

---

# 88. REPORTING PRINCIPLE

Reports should be derived from authoritative source records.

Avoid manually maintained duplicate report data.

For example:

```text
Attendance records
      ↓
Attendance statistics
      ↓
Report
```

not:

```text
Teacher manually enters report statistics
```

---

# 89. AUTOMATION PRINCIPLE

Future automation should reduce repetitive teacher work.

Examples:

* automatic lesson reuse
* template duplication
* automatic progress calculations
* automatic attendance statistics
* automatic grade calculations
* automatic report generation
* reusable lesson activities

Automation must remain deterministic and transparent.

---

# 90. DATA PORTABILITY

The teacher owns the practical value of their local data.

The application should avoid vendor lock-in.

Users should eventually be able to:

* export
* backup
* restore
* migrate

their data independently.

The `.unsschool` format is a core part of this philosophy.

---

# 91. NO CLOUD DEPENDENCY

A teacher must not lose access to core records simply because:

* internet is unavailable
* an external service is down
* an API quota is exhausted
* an account expires
* a third-party API changes
* a cloud provider changes its policy

Core data belongs locally in the teacher's application.

---

# 92. MODEL-AGNOSTIC PROJECT

UNS SCHOOL must not depend on a particular AI model.

The project must remain understandable if development moves between:

* Gemini models
* Google AI Studio sessions
* different AI accounts
* different coding assistants
* human developers

The repository documentation exists specifically to make this possible.

---

# 93. AI STUDIO / REMIX RECOVERY PROTOCOL

If this project is opened in a new Google AI Studio Build/Remix session:

The AI MUST assume that previous conversation context may be missing.

Therefore:

1. Read `PROJECT_CONTEXT.md`.
2. Read `PROJECT_STATE.md`.
3. Read `ARCHITECTURE.md`.
4. Read `DATABASE.md`.
5. Read `FEATURES.md`.
6. Inspect the repository.
7. Continue only from the documented current state.

Do not rely on previous chat history.

Do not assume the model remembers the master prompt.

---

# 94. WHEN MODEL OR ACCOUNT CHANGES

Changing AI model or Google account does not change the project architecture.

The model must derive project context from repository documentation.

Never reinterpret the project simply because a different model is being used.

---

# 95. AI OUTPUT REQUIREMENTS

After making a controlled change, the AI should report:

1. What changed
2. Files changed
3. Why the change was necessary
4. Tests added/changed
5. Lint result
6. Test result
7. Build result
8. Any known issues
9. Whether architecture remained unchanged
10. Whether the requested phase remains the only phase modified

Do not report success without evidence.

---

# 96. GIT WORKFLOW

The preferred development workflow is:

```text
AI Studio
   ↓
Implement controlled task
   ↓
Run tests/lint/build
   ↓
Review changes
   ↓
Commit
   ↓
Push to GitHub
   ↓
External repository audit
   ↓
Approval
   ↓
Next task/phase
```

GitHub is the persistent project history.

---

# 97. EXTERNAL AUDIT PRINCIPLE

AI Studio's own statement that:

* tests passed
* build passed
* architecture is correct

is not sufficient by itself for final approval.

The actual repository should be externally inspected.

Where possible, verify:

* source code
* dependencies
* configuration
* tests
* documentation
* Git history
* architectural constraints

---

# 98. CURRENT PROJECT STATUS

The project is currently in:

**PHASE 2 — Administrative Core & Student History**

Phase 1 has been implemented.

Phase 2 has been implemented but must be treated as:

> **Implementation complete — external audit / integrity verification required until explicitly approved.**

Do not claim Phase 2 is fully approved merely because the implementation exists.

The current development priority is to resolve Phase 2 integrity findings before Phase 3.

---

# 99. CURRENT KNOWN INTEGRITY PRIORITIES

The following areas require special attention when working on Phase 2:

### Critical

1. Class must enforce:
   `SchoolClass.schoolId === AcademicYear.schoolId`

2. Class must not migrate between academic years.

3. CSV identity matching must never auto-merge based only on names when DOB is missing.

4. Same name + conflicting DOB must not merge.

5. Ambiguous identity must require review.

6. Missing/invalid gender must never default to Male.

7. Supplied invalid DOB must be an import error.

8. CSV school/year/class context must be validated completely.

### Important

9. CSV delimiter documentation must match implementation.

10. Obsolete backend/cloud/Gemini environment configuration must not remain as active architecture residue.

11. NIN must not be broadly exposed.

12. Curriculum data labelled "official" must have verified provenance.

13. Documentation must reflect actual implementation status.

---

# 100. CURRICULUM PROVENANCE WARNING

The repository may contain seeded curriculum-related data.

Any data marked as:

```text
official
```

must be treated carefully.

Before expanding curriculum functionality:

* verify source
* verify edition/version
* document provenance
* distinguish official content from application-generated/general content
* avoid presenting unverified content as Ministry-approved curriculum

This is a product integrity requirement.

---

# 101. WHAT NOT TO DO

Do NOT:

* rebuild the project from scratch
* replace Dexie with another database
* introduce a backend
* introduce cloud persistence
* introduce authentication infrastructure
* add AI APIs to core workflows
* invent official curriculum
* silently merge students
* silently alter historical records
* move classes between academic years
* default unknown student data
* expose sensitive data unnecessarily
* start a future phase early
* modify unrelated modules without reason
* claim tests passed without running them
* claim external approval without external review

---

# 102. DEFINITION OF DONE

A feature is not considered complete merely because it renders in the UI.

A feature is complete when:

* domain rules are implemented
* repositories/services enforce invariants
* validation exists
* error handling exists
* tests exist
* historical integrity is preserved
* privacy implications are considered
* UI behavior is correct
* offline behavior is correct where relevant
* documentation is updated
* lint passes
* tests pass
* build passes
* scope has remained controlled

---

# 103. PRODUCTION QUALITY STANDARD

UNS SCHOOL is intended to become a serious professional application.

Code should therefore prioritize:

* correctness
* maintainability
* testability
* data integrity
* privacy
* accessibility
* offline resilience
* historical correctness
* clear architecture

Do not optimize only for "looks good in the demo."

---

# 104. FINAL PRINCIPLE

The ultimate goal is not to build a collection of pages.

The goal is to build a coherent digital teacher workspace in which:

```text
School
   ↓
Academic Year
   ↓
Class
   ↓
Student Enrollment
   ↓
Student History
   ↓
Lesson
   ↓
Attendance
   ↓
Assessment
   ↓
Planning
   ↓
Reports
```

all connect to the same reliable underlying data model.

The teacher should enter information once and benefit from it throughout the entire application.

The system should preserve history, work offline, protect student data, remain portable, and evolve without breaking previously recorded academic information.

---

# 105. AI SESSION START COMMAND

When beginning any development task, internally follow this sequence:

```text
READ PROJECT_CONTEXT.md
READ PROJECT_STATE.md
READ ARCHITECTURE.md
READ DATABASE.md
READ FEATURES.md

INSPECT CURRENT CODE

IDENTIFY CURRENT PHASE

IDENTIFY REQUESTED SCOPE

CHECK ARCHITECTURAL CONSTRAINTS

CHECK DATA-INTEGRITY CONSTRAINTS

IMPLEMENT ONLY REQUESTED SCOPE

ADD/UPDATE REGRESSION TESTS

RUN LINT
RUN TESTS
RUN BUILD

UPDATE DOCUMENTATION

REPORT RESULTS

STOP
```

Never skip the repository inspection step.

Never assume previous AI context exists.

Never start the next phase automatically.

---

# 106. PROJECT COMMANDMENT

## ENTER INFORMATION ONCE.

## STORE IT CORRECTLY.

## REUSE IT EVERYWHERE.

## NEVER DESTROY HISTORY.

## NEVER GUESS IDENTITY.

## NEVER INVENT OFFICIAL DATA.

## KEEP CORE DATA LOCAL.

## PROTECT STUDENT PRIVACY.

## TEST THE INVARIANTS.

## CHANGE ONLY WHAT IS AUTHORIZED.

**UNS SCHOOL is a long-term professional system, not a disposable prototype.**
