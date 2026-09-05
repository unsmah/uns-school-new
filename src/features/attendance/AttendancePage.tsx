import React from 'react';
import { Phase1ModulePlaceholder } from '../../components/Phase1ModulePlaceholder';

export const AttendancePage: React.FC = () => {
  return (
    <Phase1ModulePlaceholder
      moduleName="Attendance Register"
      moduleCode="MOD-ATT"
      description="Lesson-anchored roll call register tracking absences, tardiness, and justifications."
      databaseTables={['attendance', 'lessons', 'studentEnrollments']}
      keyCapabilities={[
        'Strictly anchored to Lesson as the authoritative session event',
        'AttendanceRecord.date synchronized with parent Lesson.date',
        'Atomic batch transaction preventing duplicate roll calls per student',
        'Absence metrics aggregate automatically for official end-of-term reports',
      ]}
    />
  );
};
