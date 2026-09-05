import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { classRepository } from '../../db/repositories/classRepository';
import { computeClassPlanningOverview } from '../../services/planningCalculationService';
import { schoolRepository } from '../../db/repositories/schoolRepository';
import { teacherRepository } from '../../db/repositories/teacherRepository';
import type { SchoolClass, School, TeacherProfile } from '../../types';
import { PrintableDocument } from '../../components/print/PrintableDocument';
import { Button, Card } from '../../components/ui';
import { ArrowLeft, Printer } from 'lucide-react';

export const PlanningReport: React.FC<{onBack: () => void}> = ({onBack}) => {
  const { selectedAcademicYear } = useAcademicYear();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  const [school, setSchool] = useState<School | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);

  useEffect(() => {
    schoolRepository.get().then(s => setSchool(s || null));
    teacherRepository.get().then(t => setTeacher(t || null));
  }, []);

  useEffect(() => {
    if (!selectedAcademicYear) return;
    classRepository.listByAcademicYear(selectedAcademicYear.id).then(cls => {
      setClasses(cls);
      if (cls.length > 0 && !selectedClassId) {
        setSelectedClassId(cls[0].id);
      }
    });
  }, [selectedAcademicYear]);

  useEffect(() => {
    if (!selectedClassId || !selectedAcademicYear) return;
    
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return;

    let isSubscribed = true;

    async function loadPlanningData() {
      const { curriculumRepository } = await import('../../db/repositories/curriculumRepository');
      const { lessonRepository } = await import('../../db/repositories/lessonRepository');

      const lessons = await lessonRepository.listByClassAndAcademicYear(selectedClassId, selectedAcademicYear.id);

      // Determine historical curriculum version ID directly from source records
      const versionIds = Array.from(new Set(lessons.map(l => l.curriculumVersionId).filter(Boolean)));
      
      let targetVersionId: string | null = null;
      let errorMsg: string | null = null;

      if (versionIds.length === 1) {
        targetVersionId = versionIds[0];
      } else if (versionIds.length > 1) {
        errorMsg = 'Multiple conflicting curriculum versions found across lessons for this class.';
      } else {
        // Fall back to academic year's assigned active curriculum version if set
        if (selectedAcademicYear.activeCurriculumVersionId) {
          targetVersionId = selectedAcademicYear.activeCurriculumVersionId;
        } else {
          errorMsg = 'No curriculum version context found for this historical academic year or lesson set.';
        }
      }

      if (!targetVersionId || errorMsg) {
        if (isSubscribed) {
          setOverview(null);
          setCurriculumError(errorMsg || 'Unable to determine historical curriculum context.');
        }
        return;
      }

      const curriculumVersion = await curriculumRepository.getVersionById(targetVersionId);
      if (!curriculumVersion) {
        if (isSubscribed) {
          setOverview(null);
          setCurriculumError(`Associated curriculum version (${targetVersionId}) is unavailable.`);
        }
        return;
      }

      const sequences = await curriculumRepository.listSequences(targetVersionId, selectedClass.levelCode);

      if (isSubscribed) {
        setCurriculumError(null);
        const result = computeClassPlanningOverview({
          classId: selectedClassId,
          academicYearId: selectedAcademicYear.id,
          levelCode: selectedClass.levelCode,
          sequences,
          lessons
        });
        setOverview(result);
      }
    }

    loadPlanningData();

    return () => { isSubscribed = false; };
  }, [selectedClassId, selectedAcademicYear, classes]);


  const handlePrint = () => window.print();
  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-bold">Planning & Progression Report</h2>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="text-sm rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={handlePrint} disabled={!selectedClassId || !overview}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {curriculumError && (
        <Card className="p-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-800 dark:text-amber-200">
          <div className="font-semibold text-base mb-1">Historical Curriculum Context Unavailable</div>
          <div className="text-sm">{curriculumError}</div>
        </Card>
      )}

      {selectedClass && overview && (
        <Card className="print:border-none print:shadow-none overflow-hidden">
          <PrintableDocument
            title="Curriculum Pacing & Progress (تدرج التعلمات)"
            subtitle={`Class: ${selectedClass.name} | Curriculum Level: ${selectedClass.levelCode}`}
            school={school}
            teacher={teacher}
            academicYear={selectedAcademicYear}
          >
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="border border-slate-800 p-3 text-center bg-slate-50">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Total Lessons</div>
                <div className="text-xl font-bold">{overview.totalCompletedLessons} / {overview.totalRecordedLessons}</div>
              </div>
              <div className="border border-slate-800 p-3 text-center bg-slate-50">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Planned Target</div>
                <div className="text-sm font-bold mt-1">
                  {overview.isPlannedTargetConfigured ? `${overview.totalPlannedSessions} Sessions` : 'Target Unconfigured'}
                </div>
              </div>
              <div className="border border-slate-800 p-3 text-center bg-slate-50">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Sequences Completed</div>
                <div className="text-xl font-bold">
                  {overview.sequencesMetrics.filter((s: any) => s.completionPercentage === 100).length} / {overview.sequencesMetrics.length}
                </div>
              </div>
              <div className="border border-slate-800 p-3 text-center bg-slate-50">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Overall Progress</div>
                <div className="text-xl font-bold">
                  {overview.overallProgressPercentage !== null ? `${overview.overallProgressPercentage}%` : 'Target Unconfigured'}
                </div>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-800 text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-800 p-2 w-16 text-center">Seq #</th>
                  <th className="border border-slate-800 p-2">Sequence Title</th>
                  <th className="border border-slate-800 p-2 w-28 text-center">Planned Sessions</th>
                  <th className="border border-slate-800 p-2 w-24 text-center">Completed Sessions</th>
                  <th className="border border-slate-800 p-2 w-24 text-center">Remaining</th>
                  <th className="border border-slate-800 p-2 w-32 text-center">Progress</th>
                  <th className="border border-slate-800 p-2 w-20 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.sequencesMetrics.map((metric: any) => {
                  const seq = metric.sequence;
                  const hasTarget = metric.isPlannedTargetConfigured && metric.plannedSessionsCount !== null;
                  const isDone = hasTarget && metric.completionPercentage === 100;

                  return (
                    <tr key={seq.id} className={isDone ? 'bg-slate-50 text-slate-500' : ''}>
                      <td className="border border-slate-800 p-2 text-center font-bold">{seq.sequenceNumber}</td>
                      <td className="border border-slate-800 p-2 font-medium">{seq.title}</td>
                      <td className="border border-slate-800 p-2 text-center">
                        {hasTarget ? metric.plannedSessionsCount : <span className="text-slate-400 italic font-normal">Target Unconfigured</span>}
                      </td>
                      <td className="border border-slate-800 p-2 text-center font-bold text-emerald-700">{metric.completedLessonsCount}</td>
                      <td className="border border-slate-800 p-2 text-center">
                        {hasTarget ? metric.remainingSessionsCount : '—'}
                      </td>
                      <td className="border border-slate-800 p-2 text-center">
                        {hasTarget && metric.completionPercentage !== null ? (
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-600" 
                                style={{ width: `${Math.min(100, metric.completionPercentage)}%` }} 
                              />
                            </div>
                            <span className="text-[10px] w-6">{metric.completionPercentage}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-normal">Target Unconfigured</span>
                        )}
                      </td>
                      <td className="border border-slate-800 p-2 text-center text-[10px] font-bold uppercase">
                        {isDone ? 'Done' : metric.completedLessonsCount > 0 ? 'In Progress' : 'Not Started'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </PrintableDocument>
        </Card>
      )}
    </div>
  );
};
