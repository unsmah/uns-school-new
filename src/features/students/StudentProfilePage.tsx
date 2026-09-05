/**
 * UNS SCHOOL — Student Profile & Multi-Year History View
 * Displays permanent human identity, active enrollment, and multi-year chronological timeline.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  ArrowLeft,
  Calendar,
  GraduationCap,
  Phone,
  Shield,
  HeartPulse,
  FileText,
  Clock,
  Edit2,
  UserPlus,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  studentPersonRepository,
  studentEnrollmentRepository,
  classRepository,
  academicYearRepository,
} from '../../db/repositories';
import { Card, Button, Badge, Alert, LoadingState, EmptyState, Modal } from '../../components/ui';
import { StudentPersonModal } from '../../components/students/StudentPersonModal';
import { EnrollStudentModal } from '../../components/students/EnrollStudentModal';
import { ChangeEnrollmentStatusModal } from '../../components/students/ChangeEnrollmentStatusModal';
import type { StudentPerson, StudentEnrollment, SchoolClass, AcademicYear } from '../../types';

interface StudentProfilePageProps {
  studentPersonId: string;
  onBack: () => void;
}

interface HistoricalEnrollmentRecord {
  enrollment: StudentEnrollment;
  schoolClass?: SchoolClass;
  academicYear?: AcademicYear;
}

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({
  studentPersonId,
  onBack,
}) => {
  const { selectedAcademicYear, isArchived } = useAcademicYear();

  const [person, setPerson] = useState<StudentPerson | null>(null);
  const [history, setHistory] = useState<HistoricalEnrollmentRecord[]>([]);
  const [activeEnrollment, setActiveEnrollment] = useState<HistoricalEnrollmentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isEditIdentityModalOpen, setIsEditIdentityModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteStudent = async () => {
    if (!person) return;
    setIsDeleting(true);
    try {
      await studentPersonRepository.delete(person.id);
      setIsDeleteModalOpen(false);
      onBack();
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to delete student.');
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const loadStudentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const student = await studentPersonRepository.getById(studentPersonId);
      if (!student) {
        setPerson(null);
        setIsLoading(false);
        return;
      }
      setPerson(student);

      // Load all historical enrollments
      const enrollments = await studentEnrollmentRepository.listByStudent(studentPersonId);
      const enrichedHistory: HistoricalEnrollmentRecord[] = [];

      for (const e of enrollments) {
        const [cls, yr] = await Promise.all([
          classRepository.getById(e.classId),
          academicYearRepository.getById(e.academicYearId),
        ]);
        enrichedHistory.push({
          enrollment: e,
          schoolClass: cls,
          academicYear: yr,
        });
      }

      // Sort chronological descending (latest years first)
      enrichedHistory.sort((a, b) => {
        const yearA = a.academicYear?.startDate || '';
        const yearB = b.academicYear?.startDate || '';
        return yearB.localeCompare(yearA);
      });

      setHistory(enrichedHistory);

      // Identify enrollment in currently selected academic year if present
      if (selectedAcademicYear) {
        const currentRec = enrichedHistory.find(
          (h) => h.enrollment.academicYearId === selectedAcademicYear.id
        );
        setActiveEnrollment(currentRec || null);
      }
    } catch (err) {
      console.error('Failed to load student profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [studentPersonId, selectedAcademicYear]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  if (isLoading) {
    return <LoadingState message="Loading student profile & historical record..." />;
  }

  if (!person) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Button>
        <EmptyState
          icon={<User className="w-10 h-10" />}
          title="Student Record Not Found"
          description="The requested student identity record does not exist in the database."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>
                {person.lastNameLatin.toUpperCase()} {person.firstNameLatin}
              </span>
              {person.lastNameArabic && (
                <span className="text-base font-semibold text-slate-600 dark:text-slate-300" dir="rtl">
                  ({person.lastNameArabic} {person.firstNameArabic || ''})
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Permanent Identity ID:{' '}
              <span className="font-mono text-[11px]">{person.id.slice(0, 8)}...</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditIdentityModalOpen(true)}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Identity
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Student
          </Button>

          {selectedAcademicYear && !activeEnrollment && !isArchived && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsEnrollModalOpen(true)}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Enroll in {selectedAcademicYear.label}
            </Button>
          )}
        </div>
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

      {/* Grid: Identity Card & Current Enrollment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Civil Identity Record */}
        <div className="md:col-span-2 space-y-6">
          <Card
            header={
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  Permanent Civil Status Record
                </span>
                <Badge variant="default">Persistent Identity</Badge>
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-slate-500 font-medium">Full Name (Latin)</div>
                <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                  {person.firstNameLatin} {person.lastNameLatin}
                </div>
              </div>

              <div>
                <div className="text-slate-500 font-medium">الاسم الكامل (بالعربية)</div>
                <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5" dir="rtl">
                  {person.firstNameArabic || '—'} {person.lastNameArabic || ''}
                </div>
              </div>

              <div>
                <div className="text-slate-500 font-medium">Date & Place of Birth</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  {person.dateOfBirth || '—'}{' '}
                  {person.placeOfBirth ? `(${person.placeOfBirth})` : ''}
                </div>
              </div>

              <div>
                <div className="text-slate-500 font-medium">Gender</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {person.gender === 'M' ? 'Male / Garçon (ذكر)' : 'Female / Fille (أنثى)'}
                </div>
              </div>

              <div>
                <div className="text-slate-500 font-medium">National ID (NIN)</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  {person.nationalIdNumber || '—'}
                </div>
              </div>

              <div>
                <div className="text-slate-500 font-medium">Guardian</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                  <span>
                    {person.guardianName || '—'}{' '}
                    {person.guardianRelationship ? `(${person.guardianRelationship})` : ''}
                  </span>
                  {person.guardianPhone && (
                    <span className="font-mono text-emerald-600 flex items-center gap-0.5">
                      <Phone className="w-3 h-3" />
                      {person.guardianPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Medical Alerts & Pedagogical Notes */}
            {(person.medicalAlerts || person.generalNotes) && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                {person.medicalAlerts && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200">
                    <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                      Medical Alert / Allergy:
                    </div>
                    <div>{person.medicalAlerts}</div>
                  </div>
                )}

                {person.generalNotes && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Pedagogical Notes:
                    </div>
                    <div>{person.generalNotes}</div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Selected Year Status */}
        <div className="space-y-6">
          <Card
            header={
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-xs">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  {selectedAcademicYear ? selectedAcademicYear.label : 'Active'} Enrollment
                </span>
                {activeEnrollment && (
                  <Badge
                    variant={
                      activeEnrollment.enrollment.status === 'active'
                        ? 'success'
                        : activeEnrollment.enrollment.status === 'withdrawn'
                          ? 'error'
                          : 'neutral'
                    }
                  >
                    {activeEnrollment.enrollment.status}
                  </Badge>
                )}
              </div>
            }
          >
            {activeEnrollment ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Class:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {activeEnrollment.schoolClass?.name || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Level:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeEnrollment.schoolClass?.levelCode || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Register Number:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    #{activeEnrollment.enrollment.registerNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Academic Status:</span>
                  <span>
                    {activeEnrollment.enrollment.isRepeating ? (
                      <Badge variant="warning">Redoublant (Repeating)</Badge>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">Regular</span>
                    )}
                  </span>
                </div>

                {!isArchived && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setIsStatusModalOpen(true)}
                    >
                      Update Enrollment Status
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 space-y-3 text-xs">
                <p className="text-slate-500 dark:text-slate-400">
                  Student is not currently enrolled in {selectedAcademicYear?.label || 'this academic year'}.
                </p>
                {selectedAcademicYear && !isArchived && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsEnrollModalOpen(true)}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Enroll in Class
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Multi-Year Historical Timeline */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Multi-Year Academic History & Progression
            </span>
            <span className="text-xs text-slate-500">
              {history.length} Academic Year(s) Recorded
            </span>
          </div>
        }
      >
        {history.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-8 h-8" />}
            title="No Historical Records"
            description="This student has no past enrollment records in the system."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Academic Year</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Level</th>
                  <th className="py-2.5 px-3">Register #</th>
                  <th className="py-2.5 px-3">Repeating</th>
                  <th className="py-2.5 px-3">Final Status</th>
                  <th className="py-2.5 px-3">Status Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map(({ enrollment, schoolClass, academicYear }) => (
                  <tr
                    key={enrollment.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {academicYear?.label || enrollment.academicYearId.slice(0, 8)}
                      {academicYear?.isCurrent && (
                        <Badge variant="success" className="ms-2">Current</Badge>
                      )}
                      {academicYear?.isArchived && (
                        <Badge variant="neutral" className="ms-2">Archived</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {schoolClass?.name || enrollment.classId.slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="default">{schoolClass?.levelCode || '—'}</Badge>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      #{enrollment.registerNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      {enrollment.isRepeating ? (
                        <Badge variant="warning">Redoublant</Badge>
                      ) : (
                        <span className="text-slate-400">Regular</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {enrollment.status === 'active' && (
                        <Badge variant="success">Active</Badge>
                      )}
                      {enrollment.status === 'transferred_out' && (
                        <Badge variant="neutral">Transferred</Badge>
                      )}
                      {enrollment.status === 'withdrawn' && (
                        <Badge variant="error">Withdrawn</Badge>
                      )}
                      {enrollment.status === 'suspended' && (
                        <Badge variant="warning">Suspended</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {enrollment.statusChangeDate || enrollment.createdAt.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Identity Modal */}
      <StudentPersonModal
        isOpen={isEditIdentityModalOpen}
        onClose={() => setIsEditIdentityModalOpen(false)}
        existingPerson={person}
        onSaved={async () => {
          await loadStudentData();
          setFeedbackSuccess('Student civil identity updated.');
        }}
      />

      {/* Enroll in Selected Academic Year Modal */}
      {selectedAcademicYear && (
        <EnrollStudentModal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          person={person}
          academicYearId={selectedAcademicYear.id}
          onEnrolled={async () => {
            await loadStudentData();
            setFeedbackSuccess(`Student enrolled in ${selectedAcademicYear.label}.`);
          }}
        />
      )}

      {/* Update Enrollment Status Modal */}
      {activeEnrollment && (
        <ChangeEnrollmentStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          enrollment={activeEnrollment.enrollment}
          studentName={`${person.firstNameLatin} ${person.lastNameLatin}`}
          onStatusChanged={async () => {
            await loadStudentData();
            setFeedbackSuccess('Enrollment status updated.');
          }}
        />
      )}

      {/* Delete Student Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Permanent Student Record"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete student{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {person.lastNameLatin.toUpperCase()} {person.firstNameLatin}
              </strong>
              ? This will remove all their enrollments and grade records across all academic years.
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteStudent} isLoading={isDeleting}>
                Delete Student
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
