import React from 'react';
import { Phase1ModulePlaceholder } from '../../components/Phase1ModulePlaceholder';

export const PlanningPage: React.FC = () => {
  return (
    <Phase1ModulePlaceholder
      moduleName="Yearly & Sequence Planning"
      moduleCode="MOD-PLN"
      description="Yearly progressions (répartition annuelle) and sequence breakdown by learning project."
      databaseTables={['curriculumSequences', 'learningObjectives', 'competencies']}
      keyCapabilities={[
        'Data-driven sequences linked to active curriculum version',
        'Target competencies and learning objectives linked per sequence',
        'Project culmination planning (tâche complexe / target situation)',
        'Zero hardcoded sequence numbers or assumptions',
      ]}
    />
  );
};
