# UNS SCHOOL — Features (Phase 1 Current Implementation)

A specialized, client-only digital workspace tailored for Algerian middle school English teachers.

## Implemented Core Features

### 1. Administrative Structure & Setup
- **School & Profile Management**: Configure school metadata (name in Latin and Arabic, commune, wilaya, school code) and teacher identification.
- **Academic Years & Trimesters**: School-scoped academic year management with trimester dates (1st, 2nd, 3rd Trimesters), current year assignment, and historical archiving.
- **Class Organization**: Classes for 1MS, 2MS, 3MS, and 4MS levels with room assignments and color tags.

### 2. Student Registry & Enrollment
- **Two-Tier Model**: Separation of civil identity (`StudentPerson`) from annual class placement (`StudentEnrollment`).
- **Class Lists**: Sequential register numbering (`registerNumber`) with strict uniqueness checks.
- **Enrollment Lifecycles**: Support for active, transferred, withdrawn, and graduated statuses with audit timestamps.

### 3. Curriculum Architecture
- **National Curriculum 2nd Generation (2016)**: Pre-seeded official competencies (C1, C2, C3), levels (1AM–4AM), exemplary sequences, and rubrics.
- **Data-Driven Model**: Extensible for multiple curriculum versions and syllabi without schema changes.

### 4. Lesson Planning & Session Execution
- **Lesson Management**: Structured lessons anchored to curriculum levels, sequences, and rubrics.
- **Cahier Journal & Cahier de Textes**: Pedagogical logs tracking classroom activities and homework tasks.

### 5. Attendance Management
- **Lesson-Anchored Attendance**: Attendance records bound directly to the lesson event and date.
- **Status Tracking**: Present, late (with minute tracking), excused absence, and unexcused absence.
- **Class Integrity**: Prevents logging attendance for students enrolled in different classes or years.

### 6. Official Grading & Assessments
- **Trimester Assessment Workflow**: Continuous assessment (assiduité / participation), term test (devoir surveillé), and composition exam.
- **Gradebook Entry**: Validated score inputs (0 to 20), absent tracking, and medical exemption handling.
- **Declarative Grade Calculation**: Weighted averages complying with ministerial circulars.

### 7. Local Storage & Offline Reliability
- **Offline PWA**: Full functionality without internet connection.
- **Storage Diagnostics**: StorageManager API persistence checks, quota estimation, and backup warnings.
