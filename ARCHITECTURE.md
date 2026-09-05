# UNS SCHOOL — Architectural Blueprint (Phase 1 Foundation)

## 1. Executive Summary & Philosophy

**UNS SCHOOL** is a client-only, offline-first digital workspace designed for Algerian middle-school English teachers (1AM–4AM). It replaces fragmented paper documents (Cahier Journal, Cahier de Textes, Gradebook, Student Registers, Attendance sheets, and Lesson Plans) with a unified, high-reliability local application.

The core design principle is:
> **"Enter information once, reuse it everywhere."**

An administrative entry (e.g. conducting a lesson on Sunday period 1) automatically anchors student attendance, generates the inspector-mandated **Cahier Journal** entry, populates the class **Cahier de Textes**, and logs pedagogical sequence progression without redundant manual transcription.

---

## 2. High-Level Layered Architecture

The application strictly enforces a unidirectional data-flow with clean separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                       React 19 UI                       │
│  (Tailwind CSS, App Shell, Multilingual EN/FR/AR, PWA) │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     Feature Modules                     │
│  (Dashboard, Classes, Students, Lessons, Journal, etc.) │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Application & Domain Services              │
│  - Storage Telemetry Service (Persistence / Quota)      │
│  - Declarative Grading Calculation Engine (No eval)     │
│  - Zod Domain Schema Validation                         │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Repository Layer                     │
│  (Transactional Integrity, Referencing & Uniqueness)    │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                        Dexie.js                         │
│  (IndexedDB Wrapper, Compound Indexing, Migrations)     │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Browser IndexedDB Store                 │
│         (Authoritative Client-Side Persistence)         │
└─────────────────────────────────────────────────────────┘
```

### Inviolable Architectural Boundaries
1. **Zero Raw Dexie in UI Components**: UI components never call `db.table.add()` or `db.table.where()` directly; they interact exclusively through typed repositories in `src/db/repositories/`.
2. **Authoritative Store**: IndexedDB is the authoritative store of record. `localStorage` is reserved exclusively for non-critical client UI preferences (active language, dark/light theme).
3. **No External Backend**: There is no server-side database or remote API. Privacy and data sovereignty are strictly maintained on the teacher's device.
4. **Declarative Grading Engine**: Grading logic is evaluated strictly via deterministic arithmetic formulas. The use of `eval()`, `new Function()`, or dynamic code execution is strictly prohibited.

---

## 3. Core Domain Models & Invariants

### 3.1. Curriculum as Data (Not Code)
- Ministerial pedagogical rubrics (e.g. *I listen and do*, *I pronounce*, *My project*), sequences, and competency matrices are stored as versioned data inside IndexedDB tables (`curriculumVersions`, `curriculumLevels`, `curriculumSequences`, `competencies`, `sessionRubrics`, `learningObjectives`).
- Application code is completely agnostic to specific curricular reforms, allowing future curriculum revisions to be imported as data without rebuilding the software.

### 3.2. Two-Tier Student Identity
- **`StudentPerson`**: Represents the permanent, stable human identity across the student's 4-year middle-school journey (name in Latin and Arabic, date of birth, gender, national ID number, guardian contact, medical alerts).
- **`StudentEnrollment`**: Captures class-specific, academic-year-specific enrollment (class assignment, register number / *numéro d'ordre*, repeating flag, status).
- **Invariants**:
  - A student person can have at most **one active enrollment** per academic year.
  - The register number (`registerNumber`) is strictly unique within an individual class roster.
  - **`StudentEnrollment.academicYearId` Immutability**: `academicYearId` cannot be mutated on an existing enrollment record. Progression/promotion to a new academic year creates a distinct new `StudentEnrollment`, permanently preserving the historical enrollment record.

### 3.3. Academic Year & School Ownership Invariants
- **`AcademicYear.schoolId` Immutability**: Once created, an `AcademicYear` belongs permanently to its `School`. Modifying `schoolId` on an existing academic year is rejected at the repository level.
- **Archived Academic Year Read-Only Protection**: Once `isArchived: true`, an academic year cannot be modified through ordinary updates (including changes to labels, dates, or current flags). Editability can only be restored through the explicit `unarchive()` repository method.
- **Class Academic Year & School Immutability**: Classes permanently belong to their assigned academic year and school; `academicYearId` and `schoolId` cannot be mutated after creation.

### 3.4. Authoritative Lesson Session Model
- A **`Lesson`** record is the single source of truth for pedagogical execution.
- **`Cahier Journal`** (daily log across all classes) and **`Cahier de Textes`** (chronological class log) are **derived projections** generated directly from `Lesson` records. They do not store redundant duplicate content.
- **Attendance Anchoring**: `AttendanceRecord` is anchored to a `Lesson`. The date of an attendance record is synchronized to the lesson date. When a lesson is deleted, linked attendance records are purged atomically in a Dexie transaction.

---

## 4. Storage Telemetry & Disaster Recovery

### 4.1. Persistence Grants
- Uses `navigator.storage.persisted()` and `navigator.storage.estimate()` to inspect storage state.
- Accurately classifies persistence into `PERSISTENCE_GRANTED`, `PERSISTENCE_NOT_GRANTED`, and `PERSISTENCE_UNAVAILABLE`.
- UI provides an explicit **Request Persistence** action without making false guarantees of permanent immunity to browser eviction.

### 4.2. Portable Backup Format (`.unsschool`)
- Because the workspace is client-only, user-managed backups are the primary protection against device failure or browser data eviction.
- `.unsschool` packages encapsulate a complete snapshot of all normalized tables, version header, manifest, and export timestamp.
