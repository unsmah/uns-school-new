#!/bin/bash
sed -i "s/lesson.customObjective/lesson.specificObjectives?.length/g" src/features/reports/CahierJournalReport.tsx
sed -i "s/lesson.customObjective/lesson.specificObjectives?.join(', ')/g" src/features/reports/CahierTextesReport.tsx
sed -i "s/computeClassPlanningOverview(selectedClassId, selectedAcademicYear.id)/Promise.resolve(computeClassPlanningOverview({classId: selectedClassId, academicYearId: selectedAcademicYear.id}))/g" src/features/reports/PlanningReport.tsx
