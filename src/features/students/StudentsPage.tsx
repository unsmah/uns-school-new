/**
 * UNS SCHOOL — Students Directory Page
 * Search, filter, and manage permanent student human identities and active enrollments.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  UserPlus,
  GraduationCap,
  Calendar,
  Eye,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  studentPersonRepository,
  studentEnrollmentRepository,
  classRepository,
} from '../../db/repositories';
import { Card, Button, Badge, Alert, LoadingState, EmptyState } from '../../components/ui';
import { StudentPersonModal } from '../../components/students/StudentPersonModal';
import { EnrollStudentModal } from '../../components/students/EnrollStudentModal';
import { StudentProfilePage } from './StudentProfilePage';
import type { StudentPerson, StudentEnrollment, SchoolClass } from '../../types';

interface EnrichedStudentRow {
  person: StudentPerson;
  activeEnrollment?: StudentEnrollment;
  schoolClass?: SchoolClass;
  totalEnrollmentsCount: number;
}

export const StudentsPage: React.FC = () => {
  const { selectedAcademicYear, isArchived } = useAcademicYear();

  const [students, setStudents] = useState<EnrichedStudentRow[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'enrolled_only' | 'unenrolled_only'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Modals
  const [isNewPersonModalOpen, setIsNewPersonModalOpen] = useState(false);
  const [enrollingPerson, setEnrollingPerson] = useState<StudentPerson | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [persons, yearClasses] = await Promise.all([
        studentPersonRepository.listAll(),
        selectedAcademicYear
          ? classRepository.listByAcademicYear(selectedAcademicYear.id)
          : Promise.resolve([]),
      ]);

      setClasses(yearClasses);

      // Load enrollments
      let yearEnrollments: StudentEnrollment[] = [];
      if (selectedAcademicYear) {
        yearEnrollments = await studentEnrollmentRepository.listByAcademicYear(
          selectedAcademicYear.id
        );
      }

      const classMap = new Map<string, SchoolClass>(yearClasses.map((c) => [c.id, c]));
      const enrollmentMap = new Map<string, StudentEnrollment>(
        yearEnrollments.map((e) => [e.studentPersonId, e])
      );

      const enriched: EnrichedStudentRow[] = [];
      for (const p of persons) {
        const activeE = enrollmentMap.get(p.id);
        const cls = activeE ? classMap.get(activeE.classId) : undefined;
        const allStudentEnrollments = await studentEnrollmentRepository.listByStudent(p.id);

        enriched.push({
          person: p,
          activeEnrollment: activeE,
          schoolClass: cls,
          totalEnrollmentsCount: allStudentEnrollments.length,
        });
      }

      setStudents(enriched);
    } catch (err) {
      console.error('Failed to load students directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // If a student is selected for profile view
  if (selectedStudentId) {
    return (
      <StudentProfilePage
        studentPersonId={selectedStudentId}
        onBack={() => {
          setSelectedStudentId(null);
          loadData();
        }}
      />
    );
  }

  const filteredStudents = students.filter(({ person, activeEnrollment, schoolClass }) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      person.firstNameLatin.toLowerCase().includes(term) ||
      person.lastNameLatin.toLowerCase().includes(term) ||
      (person.firstNameArabic?.includes(term) ?? false) ||
      (person.lastNameArabic?.includes(term) ?? false) ||
      (person.nationalIdNumber?.toLowerCase().includes(term) ?? false) ||
      (activeEnrollment?.registerNumber.toString() === term);

    const matchesView =
      viewFilter === 'all'
        ? true
        : viewFilter === 'enrolled_only'
          ? Boolean(activeEnrollment)
          : !activeEnrollment;

    const matchesClass =
      classFilter === 'all' ? true : activeEnrollment?.classId === classFilter;

    return matchesSearch && matchesView && matchesClass;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Students Directory & Registry (سجل التلاميذ)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Permanent civil identities and academic progression across middle school years.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsNewPersonModalOpen(true)}
        >
          <UserPlus className="w-4 h-4" />
          Register New Student
        </Button>
      </div>

      {feedbackSuccess && (
        <Alert variant="success" title="Success">
          {feedbackSuccess}
        </Alert>
      )}
      {feedbackError && (
        <Alert variant="error" title="Error">
          {feedbackError}
        </Alert>
      )}

      {/* Search & Filter Bar */}
      <Card>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs mb-4">
          <div className="flex items-center gap-2 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Latin/Arabic name, NIN, # reg..."
                className="w-full ps-8 pe-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <select
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="all">All Students ({students.length})</option>
              <option value="enrolled_only">Enrolled in Active Year</option>
              <option value="unenrolled_only">Not Enrolled</option>
            </select>

            {classes.length > 0 && (
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.levelCode})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>
              Total Registered:{' '}
              <strong className="text-slate-900 dark:text-white">{students.length}</strong>
            </span>
            <span>•</span>
            <span>
              Enrolled in {selectedAcademicYear?.label || 'Active Year'}:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {students.filter((s) => s.activeEnrollment).length}
              </strong>
            </span>
          </div>
        </div>

        {/* Directory Table */}
        {isLoading ? (
          <LoadingState message="Loading student records..." />
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            icon={<Users className="w-10 h-10" />}
            title="No Students Found"
            description={
              searchTerm || viewFilter !== 'all' || classFilter !== 'all'
                ? 'No student identities matched your filter query.'
                : 'No student identities registered in the system yet. Register a new student to get started.'
            }
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewPersonModalOpen(true)}
              >
                <UserPlus className="w-4 h-4" />
                Register First Student
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Student Name (Latin)</th>
                  <th className="py-2.5 px-3">Student Name (العربية)</th>
                  <th className="py-2.5 px-3">Gender</th>
                  <th className="py-2.5 px-3">DOB</th>
                  <th className="py-2.5 px-3">
                    Active Enrollment ({selectedAcademicYear?.label || 'Year'})
                  </th>
                  <th className="py-2.5 px-3">Total Years</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map(
                  ({ person, activeEnrollment, schoolClass, totalEnrollmentsCount }) => (
                    <tr
                      key={person.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => setSelectedStudentId(person.id)}
                          className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 text-left cursor-pointer"
                        >
                          {person.lastNameLatin.toUpperCase()} {person.firstNameLatin}
                        </button>
                      </td>
                      <td
                        className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300"
                        dir="rtl"
                      >
                        {person.lastNameArabic || '—'} {person.firstNameArabic || ''}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {person.gender === 'M' ? 'M' : 'F'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {person.dateOfBirth || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {activeEnrollment && schoolClass ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {schoolClass.name}
                            </span>
                            <span className="font-mono text-emerald-600 font-semibold">
                              #{activeEnrollment.registerNumber}
                            </span>
                            {activeEnrollment.isRepeating && (
                              <Badge variant="warning">Redoublant</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Not enrolled</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {totalEnrollmentsCount} yr(s)
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStudentId(person.id)}
                            title="View student profile & history"
                          >
                            <Eye className="w-3.5 h-3.5 me-1" />
                            Profile
                          </Button>

                          {!activeEnrollment && selectedAcademicYear && !isArchived && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEnrollingPerson(person)}
                              title="Enroll in selected academic year"
                            >
                              Enroll
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Student Person Modal */}
      <StudentPersonModal
        isOpen={isNewPersonModalOpen}
        onClose={() => setIsNewPersonModalOpen(false)}
        onSaved={async (createdPerson) => {
          await loadData();
          setFeedbackSuccess(
            `Registered student identity for ${createdPerson.firstNameLatin} ${createdPerson.lastNameLatin}.`
          );
        }}
      />

      {/* Enroll Modal */}
      {enrollingPerson && selectedAcademicYear && (
        <EnrollStudentModal
          isOpen={Boolean(enrollingPerson)}
          onClose={() => setEnrollingPerson(null)}
          person={enrollingPerson}
          academicYearId={selectedAcademicYear.id}
          onEnrolled={async () => {
            await loadData();
            setFeedbackSuccess(
              `Enrolled ${enrollingPerson.firstNameLatin} in ${selectedAcademicYear.label}.`
            );
          }}
        />
      )}
    </div>
  );
};
