import React from 'react';
import { Phase1ModulePlaceholder } from '../../components/Phase1ModulePlaceholder';

export const LessonsPage: React.FC = () => {
  return (
    <Phase1ModulePlaceholder
      moduleName="Lesson Records"
      moduleCode="MOD-LES"
      description="Primary authoritative source of truth for pedagogical events, attendance, and journal generation."
      databaseTables={['lessons', 'attendance']}
      keyCapabilities={[
        'Central pedagogical event: title, objectives, rubric, stage, activities',
        'Direct link to sequenceId and rubricId in curriculum data',
        'Serves as the sole authoritative record generating Cahier Journal and Cahier de Textes',
        'Atomic cascade deleting or updating anchored attendance records',
      ]}
    />
  );
};
