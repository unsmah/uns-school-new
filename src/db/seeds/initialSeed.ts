/**
 * UNS SCHOOL — Initial Pedagogical Seeding
 * Seeds authoritative versioned curriculum and official grading scheme data records into IndexedDB.
 *
 * IDEMPOTENCY GUARANTEE:
 * - Checks if curriculum/grading records exist before writing.
 * - Does not overwrite user modifications.
 * - Does not re-seed on subsequent application boots.
 */

import type { UnsSchoolDatabase } from '../database';
import type {
  CurriculumVersion,
  CurriculumLevelConfig,
  CompetencyDefinition,
  SessionRubricDefinition,
  CurriculumSequence,
  LearningObjectiveDefinition,
  GradingScheme,
} from '../../types';

import { seedContentData } from './contentSeed';

export async function seedInitialData(db: UnsSchoolDatabase): Promise<void> {
  const now = new Date().toISOString();

  // 1. Seed Curriculum Data if missing
  const existingVersion = await db.curriculumVersions.get('curr-dz-ms-en-gen2');
  if (!existingVersion) {
    await db.transaction(
      'rw',
      [
        db.curriculumVersions,
        db.curriculumLevels,
        db.competencies,
        db.sessionRubrics,
        db.curriculumSequences,
        db.learningObjectives,
      ],
      async () => {
        const sampleCurriculumVersion: CurriculumVersion = {
          id: 'curr-dz-ms-en-gen2',
          code: 'SAMPLE-DZ-MS-EN',
          title: 'Middle School English Curriculum (Demonstration / Sample Data)',
          description: 'Example structured pedagogical sequence and competency framework for demonstration purposes in Algerian middle schools (1AM to 4AM). Non-authoritative reference data.',
          status: 'active',
          isOfficial: false,
          sourceDocumentReference: 'Demonstration / Sample Curriculum Schema (Pending Official Syllabus Verification)',
          createdAt: now,
          updatedAt: now,
        };
        await db.curriculumVersions.add(sampleCurriculumVersion);

        // Levels: 1AM, 2AM, 3AM, 4AM
        const levels: CurriculumLevelConfig[] = [
          {
            id: 'lvl-1am',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '1MS',
            levelTitle: '1st Year Middle School (1AM / 1MS)',
            weeklyHoursRecommended: 3,
            exitProfileDescription: 'Learner can understand and produce simple spoken and written utterances of communicative value in everyday situations.',
            order: 1,
          },
          {
            id: 'lvl-2am',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '2MS',
            levelTitle: '2nd Year Middle School (2AM / 2MS)',
            weeklyHoursRecommended: 3,
            exitProfileDescription: 'Learner can interact, interpret and produce short descriptive and narrative texts related to personal environment and society.',
            order: 2,
          },
          {
            id: 'lvl-3am',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '3MS',
            levelTitle: '3rd Year Middle School (3AM / 3MS)',
            weeklyHoursRecommended: 3,
            exitProfileDescription: 'Learner can interpret and produce argumentative, instructional and narrative texts related to discoveries, history and solidarity.',
            order: 3,
          },
          {
            id: 'lvl-4am',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '4MS',
            levelTitle: '4th Year Middle School (4AM / 4MS)',
            weeklyHoursRecommended: 4,
            exitProfileDescription: 'BEM qualification level: Learner can interact with fluency and produce coherent written texts defending viewpoints and presenting projects.',
            order: 4,
          },
        ];
        for (const lvl of levels) {
          await db.curriculumLevels.add(lvl);
        }

        // Three National Core Competencies
        const competencies: CompetencyDefinition[] = [
          {
            id: 'comp-dz-c1',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: 'ALL',
            code: 'C1',
            name: 'Interact orally in English',
            description: 'Participate in spoken exchanges, ask and answer questions, state personal opinions and collaborate in classroom conversations.',
            order: 1,
          },
          {
            id: 'comp-dz-c2',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: 'ALL',
            code: 'C2',
            name: 'Interpret oral and written texts in English',
            description: 'Demonstrate comprehension of authentic audio materials, dialogues, informative articles, narratives and graphic aids.',
            order: 2,
          },
          {
            id: 'comp-dz-c3',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: 'ALL',
            code: 'C3',
            name: 'Produce oral and written texts in English',
            description: 'Express ideas clearly, synthesize information and write structured paragraphs, reports, letters and project presentations.',
            order: 3,
          },
        ];
        for (const comp of competencies) {
          await db.competencies.add(comp);
        }

        // Data-driven Algerian Pedagogical Session Rubrics
        const rubrics: SessionRubricDefinition[] = [
          {
            id: 'rub-initial-situation',
            curriculumVersionId: sampleCurriculumVersion.id,
            code: 'initial_situation',
            name: 'Initial Situation / Problem-solving Task',
            pedagogicalStage: 'Pre-requisite',
            defaultDurationMinutes: 60,
            description: 'Contextual entry problem mobilizing existing resources and creating need for new linguistic learning.',
            order: 1,
          },
          {
            id: 'rub-listen-and-do',
            curriculumVersionId: sampleCurriculumVersion.id,
            code: 'listen_and_do',
            name: 'I Listen and Do (Oral Interpretation)',
            pedagogicalStage: 'Presentation',
            defaultDurationMinutes: 60,
            description: 'Listening comprehension, sound recognition and receptive oral tasks.',
            order: 2,
          },
          {
            id: 'rub-pronounce',
            curriculumVersionId: sampleCurriculumVersion.id,
            code: 'pronounce',
            name: 'I Pronounce (Phonology / Mechanics)',
            pedagogicalStage: 'Practice',
            defaultDurationMinutes: 60,
            description: 'Explicit pronunciation practice, intonation, stress patterns and silent letters.',
            order: 3,
          },
          {
            id: 'rub-practise',
            curriculumVersionId: sampleCurriculumVersion.id,
            code: 'practise',
            name: 'I Practise (Grammar, Lexis & Functions)',
            pedagogicalStage: 'Practice',
            defaultDurationMinutes: 60,
            description: 'Structured drills, controlled communicative tasks and language consolidation.',
            order: 4,
          },
          {
            id: 'rub-read-and-discover',
            curriculumVersionId: sampleCurriculumVersion.id,
            code: 'read_and_discover',
            name: 'I Read and Discover (Reading Comprehension)',
            pedagogicalStage: 'Presentation',
            defaultDurationMinutes: 60,
            description: 'Extensive and intensive reading, skimming, scanning and semantic inference.',
            order: 5,
          },
          {
            id: 'rub-think-and-write',
            curriculumVersionId: sampleCurriculumVersion.id,
            code: 'think_and_write',
            name: 'I Think and Write (Written Production)',
            pedagogicalStage: 'Production',
            defaultDurationMinutes: 60,
            description: 'Drafting, peer review and final drafting of guided and semi-guided texts.',
            order: 6,
          },
          {
            id: 'rub-now-i-can',
            curriculumVersionId: sampleCurriculumVersion.id,
            code: 'now_i_can',
            name: 'Now I Can (Self-Assessment & Progress Check)',
            pedagogicalStage: 'Evaluation',
            defaultDurationMinutes: 60,
            description: 'Formative pupil self-evaluation against explicit sequence criteria.',
            order: 7,
          },
          {
            id: 'rub-integration',
            curriculumVersionId: sampleCurriculumVersion.id,
            code: 'integration_situation',
            name: 'Integration Situation (Complex Task)',
            pedagogicalStage: 'Integration',
            defaultDurationMinutes: 60,
            description: 'Synthesis of communicative and linguistic resources to solve a real-life situation.',
            order: 8,
          },
          {
            id: 'rub-remediation',
            curriculumVersionId: sampleCurriculumVersion.id,
            code: 'remediation',
            name: 'Remediation & Diagnostic Feedback',
            pedagogicalStage: 'Evaluation',
            defaultDurationMinutes: 60,
            description: 'Targeted support addressing identified learning hurdles and diagnostic gaps.',
            order: 9,
          },
        ];
        for (const rub of rubrics) {
          await db.sessionRubrics.add(rub);
        }

        // Exemplary National Sequences for 1AM, 2AM, 3AM & 4AM
        const sequences: CurriculumSequence[] = [
          {
            id: 'seq-1am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '1MS',
            sequenceNumber: 1,
            title: 'Sequence 1: Me and My Friends',
            communicativeObjective: 'Greet people, introduce oneself, ask for and give basic personal information.',
            projectWorkTitle: 'My Identity Card / Classroom Family Tree',
            targetedCompetencyIds: ['comp-dz-c1', 'comp-dz-c2', 'comp-dz-c3'],
            plannedSessionsCount: 12,
            order: 1,
          },
          {
            id: 'seq-1am-2',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '1MS',
            sequenceNumber: 2,
            title: 'Sequence 2: Me and My Family',
            communicativeObjective: 'Describe family members, relationships, occupations and physical traits.',
            projectWorkTitle: 'My Family Album',
            targetedCompetencyIds: ['comp-dz-c1', 'comp-dz-c2', 'comp-dz-c3'],
            plannedSessionsCount: 12,
            order: 2,
          },
          {
            id: 'seq-2am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '2MS',
            sequenceNumber: 1,
            title: 'Sequence 1: Me, My Friends and My Family',
            communicativeObjective: 'Describe personal appearance, personality traits, and daily routines.',
            projectWorkTitle: 'My Digital Friendship Profile',
            targetedCompetencyIds: ['comp-dz-c1', 'comp-dz-c2', 'comp-dz-c3'],
            plannedSessionsCount: 12,
            order: 1,
          },
          {
            id: 'seq-2am-2',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '2MS',
            sequenceNumber: 2,
            title: 'Sequence 2: Me and My Shopping',
            communicativeObjective: 'Inquire about prices, quantities, sizes and express shopping preferences.',
            projectWorkTitle: 'Classroom Flea Market Guide',
            targetedCompetencyIds: ['comp-dz-c1', 'comp-dz-c2', 'comp-dz-c3'],
            plannedSessionsCount: 12,
            order: 2,
          },
          {
            id: 'seq-3am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '3MS',
            sequenceNumber: 1,
            title: 'Sequence 1: Me, My Abilities and My Hobbies',
            communicativeObjective: 'Express abilities, disabilities, interests and leisure time activities.',
            projectWorkTitle: 'My Talent and Hobbies Showcase',
            targetedCompetencyIds: ['comp-dz-c1', 'comp-dz-c2', 'comp-dz-c3'],
            plannedSessionsCount: 12,
            order: 1,
          },
          {
            id: 'seq-3am-2',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '3MS',
            sequenceNumber: 2,
            title: 'Sequence 2: Me and My Environment',
            communicativeObjective: 'Describe local environmental issues, endangered species and conservation measures.',
            projectWorkTitle: 'Green School Eco-Charter',
            targetedCompetencyIds: ['comp-dz-c1', 'comp-dz-c2', 'comp-dz-c3'],
            plannedSessionsCount: 12,
            order: 2,
          },
          {
            id: 'seq-4am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '4MS',
            sequenceNumber: 1,
            title: 'Sequence 1: Me, My Community and Universal Landmarks',
            communicativeObjective: 'Describe remarkable historical figures, architectural heritage and national identity.',
            projectWorkTitle: 'Eco-Heritage Guidebook of Algerian Landmarks',
            targetedCompetencyIds: ['comp-dz-c1', 'comp-dz-c2', 'comp-dz-c3'],
            plannedSessionsCount: 14,
            order: 1,
          },
          {
            id: 'seq-4am-2',
            curriculumVersionId: sampleCurriculumVersion.id,
            levelCode: '4MS',
            sequenceNumber: 2,
            title: 'Sequence 2: Me, My Personality and Life Experiences',
            communicativeObjective: 'Narrate past childhood memories, significant role models and life choices.',
            projectWorkTitle: 'My Class Yearbook & Dream Board',
            targetedCompetencyIds: ['comp-dz-c1', 'comp-dz-c2', 'comp-dz-c3'],
            plannedSessionsCount: 14,
            order: 2,
          },
        ];
        for (const seq of sequences) {
          await db.curriculumSequences.add(seq);
        }

        // Learning Objectives for Seeded Sequences
        const objectives: LearningObjectiveDefinition[] = [
          // 1AM Seq 1
          {
            id: 'obj-1am-1-1',
            sequenceId: 'seq-1am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Communicative',
            description: 'Greet formally and informally (Hello, Good morning, Hi).',
            order: 1,
          },
          {
            id: 'obj-1am-1-2',
            sequenceId: 'seq-1am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Linguistic',
            description: 'Use personal pronouns (I, you, he, she) and the auxiliary "to be" in simple present.',
            order: 2,
          },
          {
            id: 'obj-1am-1-3',
            sequenceId: 'seq-1am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Methodological',
            description: 'Fill in an individual ID card with name, age, city, and school.',
            order: 3,
          },
          {
            id: 'obj-1am-1-4',
            sequenceId: 'seq-1am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Cultural',
            description: 'Compare Algerian and English greeting conventions and politeness norms.',
            order: 4,
          },

          // 1AM Seq 2
          {
            id: 'obj-1am-2-1',
            sequenceId: 'seq-1am-2',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Communicative',
            description: 'Introduce family members and describe their jobs/occupations.',
            order: 1,
          },
          {
            id: 'obj-1am-2-2',
            sequenceId: 'seq-1am-2',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Linguistic',
            description: 'Apply possessive adjectives (my, your, his, her) and the verb "have got".',
            order: 2,
          },

          // 2AM Seq 1
          {
            id: 'obj-2am-1-1',
            sequenceId: 'seq-2am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Communicative',
            description: 'Describe physical appearance (hair, eyes, height) and clothing items.',
            order: 1,
          },
          {
            id: 'obj-2am-1-2',
            sequenceId: 'seq-2am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Linguistic',
            description: 'Use present simple with action verbs and adjectives in correct order.',
            order: 2,
          },

          // 3AM Seq 1
          {
            id: 'obj-3am-1-1',
            sequenceId: 'seq-3am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Communicative',
            description: 'Express what one can or cannot do and express interests/likes.',
            order: 1,
          },
          {
            id: 'obj-3am-1-2',
            sequenceId: 'seq-3am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Linguistic',
            description: 'Master modal auxiliary "can / can\'t" and verbs of liking followed by gerund (-ing).',
            order: 2,
          },

          // 4AM Seq 1
          {
            id: 'obj-4am-1-1',
            sequenceId: 'seq-4am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Communicative',
            description: 'Describe famous Algerian and world historical monuments and universal heritage sites.',
            order: 1,
          },
          {
            id: 'obj-4am-1-2',
            sequenceId: 'seq-4am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Linguistic',
            description: 'Use passive voice in the past simple (was/were + past participle) and comparative/superlative forms.',
            order: 2,
          },
          {
            id: 'obj-4am-1-3',
            sequenceId: 'seq-4am-1',
            curriculumVersionId: sampleCurriculumVersion.id,
            type: 'Cultural',
            description: 'Value and preserve Algerian cultural heritage (Tipaza, Casbah of Algiers, Tassili n\'Ajjer).',
            order: 3,
          },
        ];
        for (const obj of objectives) {
          await db.learningObjectives.add(obj);
        }
      }
    );
  }

  // 2. Seed Official Grading Scheme if none exists
  const existingSchemesCount = await db.gradingSchemes.count();
  if (existingSchemesCount === 0) {
    await db.transaction('rw', db.gradingSchemes, async () => {
      const officialScheme: GradingScheme = {
        id: 'scheme-dz-ms-official',
        name: 'Official Algerian Middle School Evaluation Scheme',
        formulaType: 'weighted_average',
        maxOverallScore: 20,
        isOfficial: true,
        sourceReference: 'Ministère de l’Éducation Nationale — Circulaire ministérielle sur l’évaluation pédagogique continue',
        components: [
          {
            componentKey: 'continuous_assessment',
            label: "Évaluation continue (Assiduité, Devoirs maison, Travaux pratiques, Participation)",
            maxScore: 20,
            coefficient: 1,
            isMandatory: true,
          },
          {
            componentKey: 'term_test',
            label: 'Devoir surveillé (Test)',
            maxScore: 20,
            coefficient: 1,
            isMandatory: true,
          },
          {
            componentKey: 'exam_composition',
            label: 'Composition trimestrielle (Exam)',
            maxScore: 20,
            coefficient: 2,
            isMandatory: true,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      await db.gradingSchemes.add(officialScheme);
    });
  }

  // 3. Seed Starter Content Resources, Lesson Templates, and Calendar Events
  await seedContentData(db);
}
