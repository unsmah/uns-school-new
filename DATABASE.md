# UNS SCHOOL — Database Schema Reference (Version 1)

Database Name: `uns_school_db`  
Database Engine: `Dexie.js` on `IndexedDB`  
Schema Version: `1`

---

## Normalized Tables Summary

| Table | Primary Key | Key Indexes & Lookup Patterns | Purpose |
|---|---|---|---|
| `schools` | `id` (UUID) | `schoolCode`, `commune`, `wilaya` | Official middle school administrative profile |
| `teacherProfile` | `id` (UUID) | `email`, `eppn` | Teacher credentials and ministerial identifiers |
| `academicYears` | `id` (UUID) | `schoolId`, `label`, `startDate`, `isCurrent`, `isArchived` | Academic year periods with single-current invariant |
| `gradingSchemes` | `id` (UUID) | `name`, `isDefault` | Declarative calculation schemes and coefficients |
| `classes` | `id` (UUID) | `academicYearId`, `levelCode`, `name`, `isArchived`, `[academicYearId+levelCode]` | Middle school class divisions (e.g. 1MS 1, 4MS 2) |
| `studentPersons` | `id` (UUID) | `nationalIdNumber`, `lastNameLatin`, `firstNameLatin`, `gender`, `dateOfBirth` | Permanent human identity across multiple years |
| `studentEnrollments` | `id` (UUID) | `studentPersonId`, `academicYearId`, `classId`, `registerNumber`, `status`, `[classId+registerNumber]`, `[academicYearId+studentPersonId]` | Year-specific enrollment and class register numbers |
| `curriculumVersions` | `id` (UUID) | `code`, `status` | Versioned curriculum container (e.g. Official 2016 Reform) |
| `curriculumLevels` | `id` (UUID) | `curriculumVersionId`, `levelCode`, `order`, `[curriculumVersionId+levelCode]` | Grade level definitions (1MS–4MS) |
| `competencies` | `id` (UUID) | `curriculumVersionId`, `levelCode`, `code`, `order` | Ministerial competency matrix |
| `sessionRubrics` | `id` (UUID) | `curriculumVersionId`, `code`, `order` | Session types (e.g. I listen and do, My project) |
| `curriculumSequences` | `id` (UUID) | `curriculumVersionId`, `levelCode`, `sequenceNumber`, `[curriculumVersionId+levelCode+sequenceNumber]` | Sequence progression and project themes |
| `learningObjectives` | `id` (UUID) | `sequenceId`, `code`, `order` | Granular pedagogical targets per sequence |
| `lessons` | `id` (UUID) | `academicYearId`, `classId`, `sequenceId`, `rubricId`, `date`, `status`, `[classId+date]`, `[academicYearId+date]` | Authoritative source record for teaching sessions |
| `attendance` | `id` (UUID) | `lessonId`, `studentEnrollmentId`, `classId`, `date`, `status`, `[lessonId+studentEnrollmentId]`, `[classId+date]` | Roll call records strictly anchored to Lessons |
| `assessments` | `id` (UUID) | `academicYearId`, `classId`, `termNumber`, `componentKey`, `date`, `isLocked`, `[classId+termNumber]` | Tests, continuous assessments, and exams |
| `grades` | `id` (UUID) | `assessmentId`, `studentEnrollmentId`, `isAbsent`, `[assessmentId+studentEnrollmentId]` | Individual student assessment scores |
| `homework` | `id` (UUID) | `academicYearId`, `classId`, `lessonId`, `dueDate`, `isCompleted` | Assigned homework and follow-up tracking |
| `observations` | `id` (UUID) | `studentEnrollmentId`, `classId`, `date`, `category` | Private pedagogical and behavioral notes |
| `remediation` | `id` (UUID) | `academicYearId`, `classId`, `sequenceId`, `scheduledDate`, `status` | Targeted pedagogical support sessions |
| `timetable` | `id` (UUID) | `academicYearId`, `classId`, `dayOfWeek`, `periodNumber`, `[academicYearId+dayOfWeek+periodNumber]` | Weekly Sunday–Thursday class schedule |
| `resources` | `id` (UUID) | `category`, `createdAt`, `title` | Local teaching materials and flashcard storage |

---

## Referential Integrity & Cascade Rules

Because IndexedDB does not have built-in foreign key constraints, all integrity rules are enforced transactionally within the repository layer:

1. **Lesson -> Attendance Cascade**: Deleting a `Lesson` deletes all `attendance` records where `lessonId === lesson.id` inside a readwrite Dexie transaction.
2. **Assessment -> Grade Cascade**: Deleting an `Assessment` deletes all `grades` records referencing that `assessmentId`.
3. **Class Deletion Guard**: A `class` cannot be deleted if active `studentEnrollments` or `lessons` are attached. It must be archived (`isArchived: true`) instead.
4. **Single Current Academic Year**: Setting an academic year to `isCurrent: true` automatically demotes all other years to `isCurrent: false`.
5. **Class Register Number Uniqueness**: When enrolling or modifying a student, uniqueness of `registerNumber` within that `classId` is validated before insertion.
