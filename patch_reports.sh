#!/bin/bash
sed -i 's/${teacher.lastName} ${teacher.firstName}/${teacher.fullNameLatin}/g' src/components/print/PrintableDocument.tsx

sed -i "s/grade?.remarks/grade?.teacherRemarks/g" src/features/reports/AssessmentReport.tsx
sed -i "s/assessment.term/assessment.termNumber/g" src/features/reports/AssessmentReport.tsx
sed -i "s/assessment.type/assessment.componentKey/g" src/features/reports/AssessmentReport.tsx

sed -i "s/=== 'absent'/=== 'Absent'/g" src/features/reports/AttendanceReport.tsx
sed -i "s/=== 'excused'/=== 'Excused'/g" src/features/reports/AttendanceReport.tsx
sed -i "s/=== 'late'/=== 'Late'/g" src/features/reports/AttendanceReport.tsx
sed -i "s/=== 'present'/=== 'Present'/g" src/features/reports/CahierJournalReport.tsx
sed -i "s/=== 'absent'/=== 'Absent'/g" src/features/reports/CahierJournalReport.tsx
sed -i "s/=== 'excused'/=== 'Excused'/g" src/features/reports/CahierJournalReport.tsx
sed -i "s/=== 'late'/=== 'Late'/g" src/features/reports/CahierJournalReport.tsx

sed -i "s/a.periodNumber - b.periodNumber/a.startTime.localeCompare(b.startTime)/g" src/features/reports/CahierJournalReport.tsx
sed -i "s/rubric.type/rubric.pedagogicalStage/g" src/features/reports/CahierJournalReport.tsx
sed -i "s/lesson.lessonTitle/lesson.title/g" src/features/reports/CahierJournalReport.tsx
sed -i "s/Period {lesson.periodNumber} | Day: {lesson.dayOfWeek}/{lesson.startTime} - {lesson.endTime}/g" src/features/reports/CahierJournalReport.tsx
sed -i "s/lesson.learningObjectiveIds/lesson.specificObjectives/g" src/features/reports/CahierJournalReport.tsx

sed -i "s/a.periodNumber - b.periodNumber/a.startTime.localeCompare(b.startTime)/g" src/features/reports/CahierTextesReport.tsx
sed -i "s/Period {lesson.periodNumber}/{lesson.startTime} - {lesson.endTime}/g" src/features/reports/CahierTextesReport.tsx
sed -i "s/lesson.lessonTitle/lesson.title/g" src/features/reports/CahierTextesReport.tsx
sed -i "s/rubric?.nameArabic/rubric?.name/g" src/features/reports/CahierTextesReport.tsx
sed -i "s/lesson.dayOfWeek/new Date(lesson.date).toLocaleDateString('en-US', { weekday: 'long' })/g" src/features/reports/CahierTextesReport.tsx

sed -i "s/planningCalculationService.computeClassPlanningOverview/computeClassPlanningOverview/g" src/features/reports/PlanningReport.tsx
sed -i "s/import { planningCalculationService } from/import { computeClassPlanningOverview } from/g" src/features/reports/PlanningReport.tsx

