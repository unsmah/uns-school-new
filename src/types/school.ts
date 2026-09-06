/**
 * UNS SCHOOL — School & Academic Structure Types
 * Client-only, offline-first digital workspace for Algerian middle school English teachers.
 */

export interface School {
  id: string; // UUID
  name: string; // e.g. "CEM Frères Bouchami"
  nameArabic?: string; // e.g. "متوسطة الإخوة بوشامي"
  commune: string;
  wilaya: string;
  schoolCode?: string; // Matricule d'établissement
  inspectorDistrict?: string; // Circonscription pédagogique
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface TeacherProfile {
  id: string;
  fullNameLatin: string;
  fullNameArabic?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: string; // YYYY-MM-DD
  placeOfBirth?: string;
  nationalIdNumber?: string; // Numéro d'Identification Nationale (NIN)
  nationalRegistrationNumber?: string; // Numéro de sécurité sociale / Matricule
  financialRegistrationNumber?: string; // N° Matricule Financier / CCP
  email?: string;
  phone?: string;
  address?: string;
  wilaya?: string;
  commune?: string;

  // Professional & Administrative Details
  subject?: string; // e.g. "English Language" / "اللغة الإنجليزية"
  corpsRank?: string; // PEM, Professeur Principal, Professeur Formateur, Stagiaire, Contractuel
  echelon?: number | string; // 1 to 12
  echelonDate?: string; // Date de promotion à l'échelon actuel
  firstAppointmentDate?: string; // Date de 1er recrutement
  currentSchoolInstallationDate?: string; // Date d'installation dans l'établissement actuel
  qualificationDegree?: string; // Licence d'Anglais, Master, Diplôme ENS, CAPEM
  assignedLevels?: string[]; // e.g., ["1MS", "2MS", "3MS", "4MS"]
  weeklyHoursQuota?: number; // e.g., 18
  inspectorDistrict?: string; // Circonscription pédagogique
  inspectorName?: string; // Nom de l'inspecteur
  assignedSchoolName?: string; // Nom de l'établissement actuel
  pedagogicalNotes?: string; // Bio / Teaching statement
  avatarUrl?: string; // Base64 data URL or preset avatar

  createdAt: string;
  updatedAt: string;
}

export interface TermPeriod {
  id: string;
  termNumber: 1 | 2 | 3;
  name: string; // "1st Trimester" / "1er Trimestre" / "الفصل الأول"
  startDate: string; // ISO Date YYYY-MM-DD
  endDate: string;
  examinationStartDate?: string;
  examinationEndDate?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // ISO Date YYYY-MM-DD
  endDate?: string;   // ISO Date YYYY-MM-DD
  eventType: 'holiday' | 'exam_period' | 'pedagogical_day' | 'term_border' | 'school_event' | 'teacher_note';
  description?: string;
  status: 'official_verified' | 'sample' | 'user_created';
  isOfficial?: boolean;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  label: string; // e.g. "2026-2027"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isArchived: boolean; // Historical years become read-only
  terms: TermPeriod[];
  calendarEvents?: CalendarEvent[];
  activeCurriculumVersionId?: string;
  activeGradingSchemeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolClass {
  id: string;
  academicYearId: string;
  schoolId: string;
  levelCode: string; // e.g., "1MS", "2MS", "3MS", "4MS"
  name: string; // e.g., "3MS 1", "3MS 2"
  roomNumber?: string;
  colorTag?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GradingComponentConfig {
  componentKey: string; // e.g., "continuous_assessment", "homework_test", "composition_exam"
  label: string; // e.g., "Note d'assiduité / Évaluation continue"
  maxScore: number; // e.g., 20
  coefficient: number; // e.g., 1 or 2
  isMandatory: boolean;
}

export interface GradingScheme {
  id: string;
  name: string; // e.g., "Standard Middle School Trimester"
  academicYearId?: string;
  applicableLevels?: string[]; // null or empty means all levels
  components: GradingComponentConfig[];
  formulaType: 'weighted_average' | 'sum_divided_by_total_coefficients' | 'proportional_rubric';
  maxOverallScore: number; // Usually 20
  isOfficial: boolean;
  sourceReference?: string;
  createdAt: string;
  updatedAt: string;
}
