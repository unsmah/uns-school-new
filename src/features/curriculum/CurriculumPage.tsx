import React from 'react';
import { Phase1ModulePlaceholder } from '../../components/Phase1ModulePlaceholder';

export const CurriculumPage: React.FC = () => {
  return (
    <Phase1ModulePlaceholder
      moduleName="Curriculum & Competencies"
      moduleCode="MOD-CURR"
      description="Data-driven versioned Algerian middle school English curriculum (1AM–4AM)."
      databaseTables={[
        'curriculumVersions',
        'curriculumLevels',
        'competencies',
        'sessionRubrics',
        'curriculumSequences',
        'learningObjectives',
      ]}
      keyCapabilities={[
        'Pure IndexedDB data storage: Zero hardcoded enums in application logic',
        'Fully supports curriculum version upgrades without rewriting code',
        'Hierarchical: CurriculumVersion → Level → Sequence → Project → Competencies → Rubrics → Objectives',
        'Custom teacher rubric additions alongside ministerial rubrics',
      ]}
    />
  );
};
