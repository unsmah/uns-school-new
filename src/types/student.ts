/**
 * UNS SCHOOL — Student Person & Enrollment Types
 * Two-tier model separating permanent human identity from yearly class enrollment.
 */

export interface StudentPerson {
  id: string; // Persistent UUID across all years
  nationalIdNumber?: string; // Numéro d'identification national (NIN)
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameArabic?: string;
  lastNameArabic?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  placeOfBirth?: string;
  gender: 'M' | 'F';
  guardianName?: string;
  guardianPhone?: string;
  guardianRelationship?: 'Father' | 'Mother' | 'Legal Guardian';
  medicalAlerts?: string;
  generalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentEnrollment {
  id: string; // Specific to this class and academic year
  studentPersonId: string; // Foreign key to StudentPerson
  academicYearId: string; // Foreign key to AcademicYear
  classId: string; // Foreign key to SchoolClass
  registerNumber: number; // Numéro d'ordre in class register (1, 2, 3...)
  isRepeating: boolean; // Redoublant status for this school year
  status: 'active' | 'transferred_out' | 'withdrawn' | 'suspended';
  statusChangeDate?: string;
  statusChangeReason?: string;
  createdAt: string;
  updatedAt: string;
}
