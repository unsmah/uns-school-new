#!/bin/bash
cat << 'INNER_EOF' > patch_planning.js
const fs = require('fs');
let content = fs.readFileSync('src/features/reports/PlanningReport.tsx', 'utf8');

const replacement = `
  useEffect(() => {
    if (!selectedClassId || !selectedAcademicYear) return;
    
    // We need levelCode from class, sequences from curriculum, lessons from class
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return;

    import('../../db/repositories/curriculumRepository').then(({curriculumRepository}) => {
      import('../../db/repositories/lessonRepository').then(({lessonRepository}) => {
        Promise.all([
          curriculumRepository.getActiveVersion().then(v => v ? curriculumRepository.listSequences(v.id, selectedClass.levelCode) : []),
          lessonRepository.listByClassAndAcademicYear(selectedClassId, selectedAcademicYear.id)
        ]).then(([sequences, lessons]) => {
          const result = computeClassPlanningOverview({
            classId: selectedClassId,
            academicYearId: selectedAcademicYear.id,
            levelCode: selectedClass.levelCode,
            sequences,
            lessons
          });
          setOverview(result);
        });
      });
    });
  }, [selectedClassId, selectedAcademicYear, classes]);
`;

content = content.replace(/useEffect\(\(\) => \{\n\s*if \(\!selectedClassId \|\| \!selectedAcademicYear\) return;\n\s*Promise\.resolve\(computeClassPlanningOverview.*?\n\s*\.then\(result => setOverview\(result\)\);\n\s*\}, \[selectedClassId, selectedAcademicYear\]\);/s, replacement);

fs.writeFileSync('src/features/reports/PlanningReport.tsx', content);
INNER_EOF
node patch_planning.js
