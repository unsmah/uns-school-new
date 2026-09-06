/**
 * UNS SCHOOL — Class Roster View
 * Displays and manages the enrolled students for a specific class within an academic year.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ArrowLeft,
  Plus,
  Upload,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import { studentEnrollmentRepository, studentPersonRepository } from '../../db/repositories';
import { Card, Button, Badge, Alert, EmptyState, LoadingState, Modal } from '../../components/ui';
import { StudentCsvImportModal } from '../../components/import/StudentCsvImportModal';
import { EnrollStudentModal } from '../../components/students/EnrollStudentModal';
import { StudentPersonModal } from '../../components/students/StudentPersonModal';
import { ChangeEnrollmentStatusModal } from '../../components/students/ChangeEnrollmentStatusModal';
import { useI18n } from '../../i18n/I18nContext';
import type { SchoolClass, StudentEnrollment, StudentPerson, AcademicYear } from '../../types';

interface ClassRosterViewProps {
  schoolClass: SchoolClass;
  academicYear: AcademicYear;
  schoolId: string;
  isReadOnly?: boolean;
  onBack: () => void;
  onViewStudentProfile: (studentId: string) => void;
}

export const ClassRosterView: React.FC<ClassRosterViewProps> = ({
  schoolClass,
  academicYear,
  schoolId,
  isReadOnly = false,
  onBack,
  onViewStudentProfile,
}) => {
  const { language } = useI18n();
  const [roster, setRoster] = useState<
    Array<{ enrollment: StudentEnrollment; person: StudentPerson }>
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isNewPersonModalOpen, setIsNewPersonModalOpen] = useState(false);
  const [newlyCreatedPerson, setNewlyCreatedPerson] = useState<StudentPerson | null>(null);
  const [selectedEnrollmentForStatus, setSelectedEnrollmentForStatus] = useState<{
    enrollment: StudentEnrollment;
    studentName: string;
  } | null>(null);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await studentEnrollmentRepository.listByClass(schoolClass.id);
      // Sort strictly by register number
      items.sort((a, b) => a.enrollment.registerNumber - b.enrollment.registerNumber);
      setRoster(items);
    } catch (err) {
      console.error('Failed to load class roster:', err);
    } finally {
      setIsLoading(false);
    }
  }, [schoolClass.id]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const handleDeleteEnrollment = (enrollmentId: string, studentName: string) => {
    if (isReadOnly) return;
    setEnrollmentToDelete({ id: enrollmentId, name: studentName });
  };

  const handleConfirmDeleteEnrollment = async () => {
    if (!enrollmentToDelete) return;
    try {
      await studentEnrollmentRepository.delete(enrollmentToDelete.id);
      const name = enrollmentToDelete.name;
      setEnrollmentToDelete(null);
      await loadRoster();
      setFeedbackSuccess(`Removed ${name} from class roster.`);
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Cannot remove enrollment.');
      setEnrollmentToDelete(null);
    }
  };

  const filteredRoster = roster.filter(({ enrollment, person }) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      person.firstNameLatin.toLowerCase().includes(term) ||
      person.lastNameLatin.toLowerCase().includes(term) ||
      (person.firstNameArabic?.includes(term) ?? false) ||
      (person.lastNameArabic?.includes(term) ?? false) ||
      enrollment.registerNumber.toString() === term;

    const matchesStatus =
      statusFilter === 'all' || enrollment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
            Back to Classes
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{schoolClass.name}</span>
              <Badge variant="default">{schoolClass.levelCode}</Badge>
              {schoolClass.roomNumber && (
                <span className="text-xs font-normal text-slate-500">
                  Room: {schoolClass.roomNumber}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Academic Year: <span className="font-semibold">{academicYear.label}</span>
              {academicYear.isArchived && (
                <Badge variant="warning" className="ms-2">Archived (Read-Only)</Badge>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {!isReadOnly && !academicYear.isArchived && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCsvModalOpen(true)}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Import CSV Roster
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewPersonModalOpen(true)}
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              New Student
            </Button>
          </div>
        )}
      </div>

      {feedbackError && (
        <Alert variant="error" title="Error">
          {feedbackError}
        </Alert>
      )}
      {feedbackSuccess && (
        <Alert variant="success" title="Success">
          {feedbackSuccess}
        </Alert>
      )}

      {/* Roster Controls & Stats Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student by name or # register..."
                className="w-full ps-8 pe-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active only</option>
              <option value="transferred_out">Transferred</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
            <span>
              Total: <strong className="text-slate-900 dark:text-white">{roster.length}</strong>
            </span>
            <span>•</span>
            <span>
              Active:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {roster.filter((r) => r.enrollment.status === 'active').length}
              </strong>
            </span>
            <span>•</span>
            <span>
              Repeating:{' '}
              <strong className="text-amber-600 dark:text-amber-400">
                {roster.filter((r) => r.enrollment.isRepeating).length}
              </strong>
            </span>
          </div>
        </div>

        {/* Roster Table */}
        {filteredRoster.length === 0 ? (
          <EmptyState
            icon={<Users className="w-10 h-10" />}
            title="No Students in Roster"
            description={
              searchTerm
                ? 'No students matched your search criteria.'
                : 'This class has no students enrolled yet. Import a CSV roster or register students.'
            }
            action={
              !isReadOnly &&
              !academicYear.isArchived && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsCsvModalOpen(true)}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import CSV Roster
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-16 text-center"># Reg</th>
                  <th className="py-2.5 px-3">
                    {language === 'ar' ? 'الاسم واللقب باللاتينية' : language === 'fr' ? 'Nom et prénom (latin)' : 'Student Name (Latin)'}
                  </th>
                  <th className="py-2.5 px-3">
                    {language === 'ar' ? 'الاسم واللقب بالعربية' : language === 'fr' ? 'Nom et prénom (arabe)' : 'Student Name (Arabic)'}
                  </th>
                  <th className="py-2.5 px-3">
                    {language === 'ar' ? 'الجنس' : language === 'fr' ? 'Genre' : 'Gender'}
                  </th>
                  <th className="py-2.5 px-3">
                    {language === 'ar' ? 'تاريخ الميلاد' : language === 'fr' ? 'Date de naissance' : 'Date of Birth'}
                  </th>
                  <th className="py-2.5 px-3">
                    {language === 'ar' ? 'الصفة' : language === 'fr' ? 'Type' : 'Type'}
                  </th>
                  <th className="py-2.5 px-3">
                    {language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status'}
                  </th>
                  <th className="py-2.5 px-3 text-end">
                    {language === 'ar' ? 'الإجراءات' : language === 'fr' ? 'Actions' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRoster.map(({ enrollment, person }) => (
                  <tr
                    key={enrollment.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      #{enrollment.registerNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => onViewStudentProfile(person.id)}
                        className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 text-left cursor-pointer"
                      >
                        {person.lastNameLatin.toUpperCase()} {person.firstNameLatin}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300" dir="rtl">
                      {person.lastNameArabic || '—'} {person.firstNameArabic || ''}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {person.gender === 'M' ? 'M / Garçon' : 'F / Fille'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {person.dateOfBirth || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {enrollment.isRepeating ? (
                        <Badge variant="warning">Redoublant</Badge>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Regular</span>
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
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewStudentProfile(person.id)}
                          title="View student profile and historical record"
                        >
                          Profile
                        </Button>
                        {!isReadOnly && !academicYear.isArchived && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSelectedEnrollmentForStatus({
                                  enrollment,
                                  studentName: `${person.firstNameLatin} ${person.lastNameLatin}`,
                                })
                              }
                              title="Change status"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteEnrollment(
                                  enrollment.id,
                                  `${person.firstNameLatin} ${person.lastNameLatin}`
                                )
                              }
                              title="Remove enrollment"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CSV Import Modal */}
      <StudentCsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        schoolId={schoolId}
        academicYearId={academicYear.id}
        targetClass={schoolClass}
        onImportComplete={() => {
          loadRoster();
          setFeedbackSuccess('Student roster imported successfully.');
        }}
      />

      {/* New Student Person Modal */}
      <StudentPersonModal
        isOpen={isNewPersonModalOpen}
        onClose={() => setIsNewPersonModalOpen(false)}
        onSaved={(createdPerson) => {
          setNewlyCreatedPerson(createdPerson);
          setIsEnrollModalOpen(true);
        }}
      />

      {/* Enroll Student Modal */}
      {newlyCreatedPerson && (
        <EnrollStudentModal
          isOpen={isEnrollModalOpen}
          onClose={() => {
            setIsEnrollModalOpen(false);
            setNewlyCreatedPerson(null);
          }}
          person={newlyCreatedPerson}
          academicYearId={academicYear.id}
          defaultClassId={schoolClass.id}
          onEnrolled={() => {
            loadRoster();
            setFeedbackSuccess(`Enrolled ${newlyCreatedPerson.firstNameLatin} into class.`);
          }}
        />
      )}

      {/* Change Status Modal */}
      {selectedEnrollmentForStatus && (
        <ChangeEnrollmentStatusModal
          isOpen={Boolean(selectedEnrollmentForStatus)}
          onClose={() => setSelectedEnrollmentForStatus(null)}
          enrollment={selectedEnrollmentForStatus.enrollment}
          studentName={selectedEnrollmentForStatus.studentName}
          onStatusChanged={() => {
            loadRoster();
            setFeedbackSuccess('Updated student enrollment status.');
          }}
        />
      )}

      {/* Delete Enrollment Confirmation Modal */}
      {enrollmentToDelete && (
        <Modal
          isOpen={Boolean(enrollmentToDelete)}
          onClose={() => setEnrollmentToDelete(null)}
          title="Remove Student from Class"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to remove{' '}
              <strong className="text-slate-900 dark:text-slate-100">{enrollmentToDelete.name}</strong> from this class? This will delete their enrollment record for this year if no attendance or assessments are linked.
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setEnrollmentToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteEnrollment}>
                Remove Student
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
