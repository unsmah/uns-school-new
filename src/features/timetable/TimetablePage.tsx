/**
 * UNS SCHOOL — Weekly Timetable Page
 * Algerian Middle School Teaching Week (Sunday - Thursday).
 * Interactive weekly schedule manager for English teachers.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Plus,
  Clock,
  DoorOpen,
  Edit2,
  Trash2,
  Printer,
  AlertCircle,
  Filter,
  Layers,
  Lock,
  Unlock,
  X,
  FileText,
  Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { timetableRepository, classRepository, teacherRepository } from '../../db/repositories';
import { Card, Button, Badge, Alert, LoadingState, EmptyState, Select, Modal } from '../../components/ui';
import { TimetableSlotModal } from '../../components/timetable/TimetableSlotModal';
import { useI18n } from '../../i18n/I18nContext';
import type { TimetableSlot, SchoolClass } from '../../types';

const DAYS_OF_WEEK: TimetableSlot['dayOfWeek'][] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
];

const PERIOD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

const PERIOD_LABELS: Record<number, string> = {
  1: '08:00 - 09:00',
  2: '09:00 - 10:00',
  3: '10:00 - 11:00',
  4: '11:00 - 12:00',
  5: '13:00 - 14:00',
  6: '14:00 - 15:00',
  7: '15:00 - 16:00',
  8: '16:00 - 17:00',
};

const DAY_LABELS_AR: Record<string, string> = {
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

const DAY_LABELS_FR: Record<string, string> = {
  Sunday: 'Dimanche',
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
};

export const TimetablePage: React.FC = () => {
  const { school, selectedAcademicYear, isArchived } = useAcademicYear();
  const { language } = useI18n();

  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [isEditMode, setIsEditMode] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Modals & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<TimetableSlot | null>(null);
  const [targetDayForNewSlot, setTargetDayForNewSlot] = useState<TimetableSlot['dayOfWeek']>('Sunday');
  const [targetPeriodForNewSlot, setTargetPeriodForNewSlot] = useState<number>(1);

  const [isLoading, setIsLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!selectedAcademicYear) {
      setSlots([]);
      setClasses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [yearSlots, yearClasses, profile] = await Promise.all([
        timetableRepository.listByAcademicYear(selectedAcademicYear.id),
        classRepository.listByAcademicYear(selectedAcademicYear.id),
        teacherRepository.getOrCreate(),
      ]);
      setSlots(yearSlots);
      setClasses(yearClasses);
      setTeacherProfile(profile);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddSlot = (day: TimetableSlot['dayOfWeek'] = 'Sunday', period: number = 1) => {
    if (isArchived || !isEditMode) return;
    setEditingSlot(null);
    setTargetDayForNewSlot(day);
    setTargetPeriodForNewSlot(period);
    setIsModalOpen(true);
  };

  const handleEditSlot = (slot: TimetableSlot) => {
    if (isArchived || !isEditMode) return;
    setEditingSlot(slot);
    setIsModalOpen(true);
  };

  const handleDeleteSlot = (slot: TimetableSlot) => {
    if (isArchived || !isEditMode) return;
    setSlotToDelete(slot);
  };

  const handleConfirmDeleteSlot = async () => {
    if (!slotToDelete) return;
    try {
      await timetableRepository.delete(slotToDelete.id);
      setSlotToDelete(null);
      await loadData();
      setFeedbackSuccess(`Timetable slot removed.`);
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to delete slot.');
      setSlotToDelete(null);
    }
  };

  const filteredSlots = slots.filter((s) =>
    selectedClassFilter === 'ALL' ? true : s.classId === selectedClassFilter
  );

  const classMap = React.useMemo(() => {
    const map = new Map<string, SchoolClass>();
    for (const c of classes) {
      map.set(c.id, c);
    }
    return map;
  }, [classes]);

  // Compute stats
  const totalWeeklyHours = slots.length;
  const classesTaughtCount = new Set(slots.map((s) => s.classId)).size;

  const exportPdf = async () => {
    const element = document.getElementById('timetable-print-sheet');
    if (!element) return;

    setIsExporting(true);
    try {
      // 1.5 scale is the mathematical sweet spot for extremely fast vector render without any visual artifacts
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 0,
      });

      // Compress to 0.85 JPEG instead of 1.0 which is extremely slow on browser CPU main threads
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      const filename = `${teacherProfile?.fullNameLatin || 'Teacher'}_Timetable.pdf`.replace(/\s+/g, '_');
      pdf.save(filename);
      setFeedbackSuccess('Timetable PDF downloaded successfully.');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setFeedbackError('Failed to export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    try {
      // Focus the active window to bypass standard iframe sandboxing security rules, allowing native printing
      window.focus();
      window.print();
    } catch (err) {
      console.error('Failed to trigger native print dialog:', err);
    }
  };

  const exportDocx = () => {
    const schoolName = school?.name || 'School Name';
    const schoolNameAr = school?.nameArabic || school?.name || 'اسم المؤسسة';
    const teacherName = teacherProfile?.fullNameLatin || 'Teacher Name';
    const teacherNameAr = teacherProfile?.fullNameArabic || '';
    const yearLabel = selectedAcademicYear?.label || '';
    const wilaya = school?.wilaya || '';
    const commune = school?.commune || '';
    const schoolCode = school?.schoolCode || '—';
    const district = school?.inspectorDistrict || teacherProfile?.inspectorDistrict || '—';
    const subject = teacherProfile?.subject || 'English Language / اللغة الإنجليزية';
    const rank = teacherProfile?.corpsRank || 'PEM';
    const echelon = teacherProfile?.echelon !== undefined ? teacherProfile.echelon : '—';

    let tableRows = '';
    const PERIOD_NUMS = [1, 2, 3, 4, 5, 6, 7, 8];

    PERIOD_NUMS.forEach((periodNum) => {
      if (periodNum === 5) {
        tableRows += `
          <tr style="background-color: #f8fafc; font-weight: bold; font-style: italic; height: 35px;">
            <td colspan="6" style="padding: 6px; text-align: center; border: 1px solid #cbd5e1; font-size: 11px;">
              Pause de midi (12:00 &ndash; 13:00) / فترة الغداء والراحة
            </td>
          </tr>
        `;
      }

      tableRows += `<tr style="height: 60px;">`;
      tableRows += `
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; background-color: #f8fafc; font-weight: bold; width: 120px;">
          <div style="font-size: 12px; color: #0f172a;">P${periodNum}</div>
          <div style="font-size: 9px; color: #64748b; font-weight: normal; margin-top: 2px;">${PERIOD_LABELS[periodNum]}</div>
        </td>
      `;

      DAYS_OF_WEEK.forEach((day) => {
        const slot = slots.find((s) => s.dayOfWeek === day && s.periodNumber === periodNum);
        if (slot) {
          const cls = classMap.get(slot.classId);
          tableRows += `
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; background-color: #ecfdf5; vertical-align: top; width: 150px;">
              <div style="font-weight: bold; color: #065f46; font-size: 13px;">${cls?.name || 'Class'}</div>
              <div style="font-size: 10px; color: #047857; margin-top: 3px;">Room: ${slot.roomNumber || cls?.roomNumber || '—'}</div>
              ${slot.notes ? `<div style="font-size: 9px; color: #4b5563; font-style: italic; margin-top: 4px;">${slot.notes}</div>` : ''}
            </td>
          `;
        } else {
          tableRows += `<td style="padding: 8px; border: 1px solid #cbd5e1; width: 150px;"></td>`;
        }
      });

      tableRows += `</tr>`;
    });

    const htmlDoc = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Weekly Timetable - ${teacherName}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4 landscape;
            margin: 1.5cm 1.5cm 1.5cm 1.5cm;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            direction: ltr;
            margin: 0;
            padding: 0;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-bottom: 20px;
          }
          .header-td {
            border: none;
            padding: 4px;
            vertical-align: top;
            font-size: 10px;
            color: #334155;
            line-height: 1.4;
          }
          .title-container {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #10b981;
            padding-bottom: 10px;
          }
          .info-grid {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-bottom: 20px;
            background-color: #f8fafc;
          }
          .info-td {
            border: none;
            padding: 8px 12px;
            font-size: 11px;
            color: #1e293b;
          }
          table.main-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #cbd5e1;
          }
          th.main-th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: bold;
            padding: 10px;
            border: 1px solid #cbd5e1;
            font-size: 11px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="header-td" style="width: 50%;">
              <strong>REPUBLIQUE ALGERIENNE DEMOCRATIQUE ET POPULAIRE</strong><br/>
              <strong>MINISTERE DE L'EDUCATION NATIONALE</strong><br/>
              Direction de l'Éducation de la Wilaya de: ${wilaya}<br/>
              Établissement: ${schoolName}
            </td>
            <td class="header-td" style="width: 50%; text-align: right; direction: rtl;">
              <strong>الجمهورية الجزائرية الديمقراطية الشعبية</strong><br/>
              <strong>وزارة التربية الوطنية</strong><br/>
              مديرية التربية لولاية: ${wilaya}<br/>
              المؤسسة: ${schoolNameAr}
            </td>
          </tr>
        </table>

        <div class="title-container">
          <h2 style="margin: 0; color: #065f46; font-size: 18px;">WEEKLY TEACHING SCHEDULE / جدول التوقيت الأسبوعي</h2>
          <div style="font-size: 11px; color: #475569; margin-top: 5px;">Academic Year / الموسم الدراسي: ${yearLabel}</div>
        </div>

        <table class="info-grid" style="border: 1px solid #e2e8f0; border-radius: 6px;">
          <tr>
            <td class="info-td" style="width: 33%; border-bottom: 1px solid #e2e8f0;">
              <strong>Teacher / الأستاذ:</strong> ${teacherName} ${teacherNameAr ? `(${teacherNameAr})` : ''}
            </td>
            <td class="info-td" style="width: 33%; border-bottom: 1px solid #e2e8f0;">
              <strong>Subject / المادة:</strong> ${subject}
            </td>
            <td class="info-td" style="width: 33%; border-bottom: 1px solid #e2e8f0;">
              <strong>Rank &amp; Echelon / الرتبة والدرجة:</strong> ${rank} (Step/الدرجة ${echelon})
            </td>
          </tr>
          <tr>
            <td class="info-td">
              <strong>School Code / رمز المؤسسة:</strong> ${schoolCode}
            </td>
            <td class="info-td">
              <strong>Commune / البلدية:</strong> ${commune}
            </td>
            <td class="info-td">
              <strong>District / المقاطعة:</strong> ${district}
            </td>
          </tr>
        </table>

        <table class="main-table">
          <thead>
            <tr>
              <th class="main-th" style="width: 120px;">Period / Time</th>
              <th class="main-th">Sunday / الأحد</th>
              <th class="main-th">Monday / الإثنين</th>
              <th class="main-th">Tuesday / الثلاثاء</th>
              <th class="main-th">Wednesday / الأربعاء</th>
              <th class="main-th">Thursday / الخميس</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div style="margin-top: 40px; width: 100%;">
          <table style="width: 100%; border: none;">
            <tr>
              <td style="border: none; font-size: 11px; width: 50%; color: #334155;">
                <strong>Teacher's Signature / توقيع الأستاذ:</strong>
              </td>
              <td style="border: none; font-size: 11px; width: 50%; text-align: right; color: #334155;">
                <strong>Director's Approval / مصادقة مدير المؤسسة:</strong>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlDoc], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${teacherName.replace(/\s+/g, '_')}_timetable_${yearLabel.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedbackSuccess('Timetable DOCX downloaded successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2 break-words">
            <CalendarDays className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              {language === 'ar' ? 'جدول التوقيت الأسبوعي' : language === 'fr' ? 'Emploi du temps hebdomadaire' : 'Weekly Timetable'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 break-words">
            {language === 'ar'
              ? `برنامج تدريس مادة اللغة الإنجليزية للموسم الدراسي ${selectedAcademicYear?.label || ''} (الأحد – الخميس).`
              : language === 'fr'
              ? `Planning hebdomadaire d'anglais pour l'année scolaire ${selectedAcademicYear?.label || ''} (Dimanche – Jeudi).`
              : `Weekly English teaching schedule for academic year ${selectedAcademicYear?.label || 'None'} (Sunday – Thursday).`}
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          {/* Print Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>
              {language === 'ar' ? 'طباعة وتصدير' : language === 'fr' ? 'Imprimer / Exporter' : 'Print / Export'}
            </span>
          </Button>

          {/* Edit/Lock Toggle Button */}
          {classes.length > 0 && !isArchived && (
            <Button
              variant={isEditMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              className="flex items-center gap-1.5"
            >
              {isEditMode ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>
                    {language === 'ar' ? 'قفل وحفظ الجدول' : language === 'fr' ? 'Verrouiller' : 'Lock Timetable'}
                  </span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>
                    {language === 'ar' ? 'تعديل جدول التوقيت' : language === 'fr' ? "Modifier l'emploi" : 'Edit Timetable'}
                  </span>
                </>
              )}
            </Button>
          )}

          {/* Add Teaching Slot Button (Only in Edit Mode) */}
          {classes.length > 0 && !isArchived && isEditMode && (
            <Button variant="primary" size="sm" onClick={() => handleAddSlot('Sunday', 1)}>
              <Plus className="w-4 h-4" />
              <span>
                {language === 'ar' ? 'إضافة حصة' : language === 'fr' ? 'Ajouter un créneau' : 'Add Teaching Slot'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {isArchived && (
        <div className="print:hidden">
          <Alert variant="warning" title={language === 'ar' ? 'موسم دراسي مؤرشف (للقراءة فقط)' : language === 'fr' ? 'Année scolaire archivée (Lecture seule)' : 'Archived Academic Year (Read-Only)'}>
            {language === 'ar' ? 'أنت تتصفح جدول توقيت لموسم مؤرشف. تعديل الحصص محمي وغير مسموح به.' : 'You are viewing an archived academic year timetable. Modifying past timetable slots is restricted.'}
          </Alert>
        </div>
      )}

      {feedbackSuccess && (
        <div className="print:hidden">
          <Alert variant="success" title={language === 'ar' ? 'تم بنجاح' : 'Success'}>
            {feedbackSuccess}
          </Alert>
        </div>
      )}
      {feedbackError && (
        <div className="print:hidden">
          <Alert variant="error" title={language === 'ar' ? 'خطأ' : 'Error'}>
            {feedbackError}
          </Alert>
        </div>
      )}

      {/* Metrics & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{language === 'ar' ? 'الحجم الساعي الأسبوعي:' : language === 'fr' ? 'Charge hebdomadaire:' : 'Weekly Workload:'}</span>
            <strong className="font-mono text-slate-900 dark:text-white text-xs sm:text-sm">
              {totalWeeklyHours} {language === 'ar' ? 'سا' : 'hrs'}
            </strong>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{language === 'ar' ? 'الأفواج المسندة:' : language === 'fr' ? 'Classes actives:' : 'Active Classes:'}</span>
            <strong className="font-mono text-slate-900 dark:text-white text-xs sm:text-sm">
              {classesTaughtCount}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500 font-medium">
            {language === 'ar' ? 'تصفية الفوج:' : language === 'fr' ? 'Classe:' : 'Filter:'}
          </span>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer w-full sm:w-auto min-w-[130px] max-w-[180px]"
          >
            <option value="ALL">
              {language === 'ar' ? 'جميع الأفواج' : language === 'fr' ? 'Toutes les classes' : 'All Classes'}
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.levelCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timetable Weekly Grid */}
      {!selectedAcademicYear ? (
        <EmptyState
          icon={<AlertCircle className="w-10 h-10" />}
          title={language === 'ar' ? 'لم يتم تحديد موسم دراسي' : 'No Academic Year Selected'}
          description={language === 'ar' ? 'يرجى اختيار موسم دراسي لإدارة جدول التوقيت.' : 'Please select an academic year to manage your timetable.'}
        />
      ) : classes.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-10 h-10" />}
          title={language === 'ar' ? 'لا توجد أفواج مسجلة' : 'No Classes Available'}
          description={language === 'ar' ? 'قم بإنشاء الأفواج التربوية أولاً قبل تعيين حصص جدول التوقيت.' : 'Create your classes first in the Classes workspace before adding timetable slots.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full border-collapse text-left rtl:text-right min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-3 w-28 text-center text-[11px] font-bold tracking-wider uppercase border-e border-slate-200 dark:border-slate-800">
                  {language === 'ar' ? 'الحصة / التوقيت' : language === 'fr' ? 'Séance / Horaire' : 'Period / Time'}
                </th>
                {DAYS_OF_WEEK.map((day) => (
                  <th
                    key={day}
                    className="py-3 px-3 text-center text-xs font-bold tracking-tight border-e last:border-e-0 border-slate-200 dark:border-slate-800"
                  >
                    <div>
                      {language === 'ar' ? DAY_LABELS_AR[day] : language === 'fr' ? DAY_LABELS_FR[day] : day}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {PERIOD_NUMBERS.map((periodNum) => {
                const isMiddayBreak = periodNum === 5;

                return (
                  <React.Fragment key={periodNum}>
                    {/* Midday Lunch Break Divider */}
                    {isMiddayBreak && (
                      <tr className="bg-slate-100/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                        <td
                          colSpan={6}
                          className="py-1.5 px-4 text-center tracking-wide uppercase italic text-[11px]"
                        >
                          {language === 'ar'
                            ? 'فترة الظهيرة والراحة (12:00 – 13:00)'
                            : language === 'fr'
                            ? 'Pause de midi (12:00 – 13:00)'
                            : 'Midday Pause (12:00 – 13:00)'}
                        </td>
                      </tr>
                    )}

                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Period Header */}
                      <td className="py-2 px-2 text-center border-e border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
                        <div className="font-bold text-slate-900 dark:text-white font-mono">
                          P{periodNum}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {PERIOD_LABELS[periodNum]}
                        </div>
                      </td>

                      {/* Day Columns */}
                      {DAYS_OF_WEEK.map((day) => {
                        const masterHasSlot = slots.some(
                          (s) => s.dayOfWeek === day && s.periodNumber === periodNum
                        );
                        const cellSlots = filteredSlots.filter(
                          (s) => s.dayOfWeek === day && s.periodNumber === periodNum
                        );

                        return (
                          <td
                            key={`${day}-${periodNum}`}
                            className="py-2 px-2 border-e last:border-e-0 border-slate-200 dark:border-slate-800 align-top min-h-[72px]"
                          >
                            {cellSlots.length > 0 ? (
                              <div className="space-y-1.5">
                                {cellSlots.map((slot) => {
                                  const cls = classMap.get(slot.classId);
                                  return (
                                    <div
                                      key={slot.id}
                                      className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-slate-900 dark:text-slate-100 group relative flex flex-col justify-between"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                          <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200">
                                            {cls?.name || 'Class'}
                                          </span>
                                          {cls?.levelCode && (
                                            <Badge variant="default" className="text-[10px] px-1 py-0">
                                              {cls.levelCode}
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                                          <DoorOpen className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="truncate">
                                            {slot.roomNumber || cls?.roomNumber || 'Room —'}
                                          </span>
                                        </div>

                                        {slot.notes && (
                                          <div className="text-[10px] text-slate-500 italic mt-1 line-clamp-1">
                                            {slot.notes}
                                          </div>
                                        )}
                                      </div>

                                      {!isArchived && isEditMode && (
                                        <div className="flex items-center justify-end gap-1 mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => handleEditSlot(slot)}
                                            className="p-1 rounded text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                                            title="Edit slot"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSlot(slot)}
                                            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                            title="Delete slot"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              !isArchived && isEditMode && !masterHasSlot && (
                                <button
                                  onClick={() => handleAddSlot(day, periodNum)}
                                  className="w-full h-full min-h-[54px] rounded-lg border border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-slate-300 dark:text-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                                  title={`Add teaching slot for ${day} Period ${periodNum}`}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Timetable Modal */}
      {selectedAcademicYear && school && (
        <TimetableSlotModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSlot(null);
          }}
          academicYearId={selectedAcademicYear.id}
          schoolId={school.id}
          classes={classes}
          existingSlot={editingSlot}
          defaultDay={targetDayForNewSlot}
          defaultPeriod={targetPeriodForNewSlot}
          onSaved={() => {
            loadData();
            setFeedbackSuccess(
              editingSlot ? 'Timetable slot updated.' : 'New timetable slot added.'
            );
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {slotToDelete && (
        <Modal
          isOpen={Boolean(slotToDelete)}
          onClose={() => setSlotToDelete(null)}
          title="Delete Timetable Slot"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to delete this timetable slot for{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {classes.find((c) => c.id === slotToDelete.classId)?.name || 'Class'}
              </strong>{' '}
              on {slotToDelete.dayOfWeek} (Period {slotToDelete.periodNumber})?
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setSlotToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteSlot}>
                Delete Slot
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Print & Export Overlay Modal */}
      {isExportModalOpen && createPortal(
        <div id="timetable-print-overlay" className="fixed inset-0 z-50 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex flex-col items-center">
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
            
            #timetable-print-sheet {
              font-family: 'Cairo', 'Segoe UI', system-ui, -apple-system, sans-serif !important;
              color-scheme: light !important;
              box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25) !important;
            }

            #timetable-print-sheet * {
              color-scheme: light !important;
            }

            /* Flawless responsive preview sizing via standard CSS zoom */
            @media screen and (max-width: 640px) {
              #timetable-print-sheet {
                zoom: 0.38 !important;
              }
            }
            @media screen and (min-width: 641px) and (max-width: 768px) {
              #timetable-print-sheet {
                zoom: 0.52 !important;
              }
            }
            @media screen and (min-width: 769px) and (max-width: 1024px) {
              #timetable-print-sheet {
                zoom: 0.68 !important;
              }
            }
            @media screen and (min-width: 1025px) and (max-width: 1280px) {
              #timetable-print-sheet {
                zoom: 0.82 !important;
              }
            }
            @media screen and (min-width: 1281px) {
              #timetable-print-sheet {
                zoom: 0.95 !important;
              }
            }

            /* Force light theme values for the sheet to protect against global dark mode */
            .dark #timetable-print-sheet {
              background-color: #ffffff !important;
              color: #0f172a !important;
            }
            .dark #timetable-print-sheet h1 {
              color: #065f46 !important;
            }
            .dark #timetable-print-sheet div,
            .dark #timetable-print-sheet p,
            .dark #timetable-print-sheet span {
              color: inherit;
            }
            .dark #timetable-print-sheet table {
              border-color: #475569 !important;
            }
            .dark #timetable-print-sheet th {
              background-color: #0f172a !important;
              color: #ffffff !important;
              border-color: #475569 !important;
            }
            .dark #timetable-print-sheet th * {
              color: #ffffff !important;
            }
            .dark #timetable-print-sheet td {
              border-color: #cbd5e1 !important;
              color: #0f172a !important;
            }
            .dark #timetable-print-sheet tr {
              background-color: transparent !important;
            }

            @media print {
              @page {
                size: A4 landscape;
                margin: 0;
              }
              body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* Hide all siblings of the overlay at the root level */
              body > div:not(#timetable-print-overlay) {
                display: none !important;
              }
              #timetable-print-overlay {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print {
                display: none !important;
              }
              #timetable-print-sheet {
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                width: 297mm !important;
                height: 210mm !important;
                max-width: none !important;
                padding: 1.5cm !important;
                transform: none !important;
                zoom: 1 !important; /* Ensure printing is at standard 100% size */
                box-sizing: border-box !important;
                page-break-inside: avoid !important;
                background-color: #ffffff !important;
              }
            }
          `}</style>
          
          {/* Action Header Panel */}
          <div className="no-print w-full max-w-5xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-800 shadow-xl sticky top-0 z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  <span className="text-slate-900 dark:text-white">
                    {language === 'ar' ? 'تصدير ورقة جدول التوقيت' : language === 'fr' ? 'Exporter Emploi du Temps' : 'Export & Print Schedule'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'ar' ? 'اختر صيغة التحميل أو اطبع الجدول الأسبوعي للمؤسسة.' : 'Download or print your official Algerian weekly school schedule.'}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  onClick={exportPdf}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-none py-1.5 px-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isExporting ? (language === 'ar' ? 'جاري التحضير...' : 'Generating...') : (language === 'ar' ? 'تحميل ملف PDF' : 'Download PDF')}
                  </span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={exportDocx}
                  className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 py-1.5 px-3"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    {language === 'ar' ? 'تحميل ملف Word' : 'Export Word (.doc)'}
                  </span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 py-1.5 px-3"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {language === 'ar' ? 'طباعة مباشرة' : 'Print Sheet'}
                  </span>
                </Button>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white ml-2"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Senior Administrative Tip */}
            <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 text-base leading-none">💡</span>
              <p className="leading-relaxed">
                {language === 'ar' 
                  ? 'نصيحة إدارية: للحصول على أفضل جودة خط عربي وتنسيق مثالي، يُنصح بالضغط على "طباعة مباشرة" ثم اختيار "حفظ كملف PDF" من خيارات الطابعة الخاصة بمتصفحك.' 
                  : 'Administrative Tip: For high-fidelity vector text, perfect Arabic font-joining, and precise scaling, click "Print Sheet" and choose "Save as PDF" in your browser print dialog.'
                }
              </p>
            </div>
          </div>

          {/* Scalable Container representing A4 Landscape Page */}
          <div className="w-full max-w-5xl overflow-x-auto p-4 flex justify-center bg-white dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-900 shadow-inner no-print mb-8">
            {/* Aspect lock wrapper */}
            <div>
              <div
                id="timetable-print-sheet"
                className="rounded flex flex-col justify-between"
                style={{
                  width: '297mm',
                  height: '210mm',
                  minWidth: '297mm',
                  minHeight: '210mm',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  padding: '1.5cm',
                  position: 'relative',
                }}
              >
                {/* Official Algerian School Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #047857', paddingBottom: '6px', marginBottom: '8px' }}>
                  {/* French side */}
                  <div style={{ fontSize: '9px', lineHeight: '1.2', color: '#334155', textAlign: 'left', flex: '1' }}>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.2px' }}>République Algérienne Démocratique et Populaire</p>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', margin: '1px 0 3px 0' }}>Ministère de l'Éducation Nationale</p>
                    <p style={{ margin: '0' }}>Direction de l'Éducation de la Wilaya de: <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{school?.wilaya || '—'}</span></p>
                    <p style={{ margin: '0' }}>Établissement: <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{school?.name || '—'}</span></p>
                  </div>

                  {/* Algerian National Crescent & Star Emblem SVG */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
                    <svg width="42" height="42" viewBox="0 0 100 100" style={{ color: '#047857' }}>
                      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                      <path d="M50 25 A21 21 0 1 0 72 47 A17 17 0 1 1 50 25 Z" fill="currentColor" transform="rotate(-30 50 50)" />
                      <polygon points="56,38 58,44 64,44 59,48 61,54 56,50 51,54 53,48 48,44 54,44" fill="currentColor" />
                    </svg>
                  </div>

                  {/* Arabic side */}
                  <div dir="rtl" style={{ fontSize: '9px', lineHeight: '1.2', color: '#334155', textAlign: 'right', flex: '1', fontFamily: "'Cairo', sans-serif" }}>
                    <p style={{ fontWeight: 'bold', color: '#0f172a' }}>الجمهورية الجزائرية الديمقراطية الشعبية</p>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', margin: '1px 0 3px 0' }}>وزارة التربية الوطنية</p>
                    <p style={{ margin: '0' }}>مديرية التربية لولاية: <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{school?.wilaya || '—'}</span></p>
                    <p style={{ margin: '0' }}>المؤسسة: <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{school?.nameArabic || school?.name || '—'}</span></p>
                  </div>
                </div>

                {/* Title and Academic Year */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <h1 style={{ fontSize: '15px', fontWeight: '800', color: '#065f46', textTransform: 'uppercase', margin: '0', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span>WEEKLY TEACHING SCHEDULE</span>
                    <span style={{ color: '#94a3b8' }}>/</span>
                    <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>جدول التوقيت الأسبوعي للأستاذ</span>
                  </h1>
                  <p style={{ fontSize: '10px', fontWeight: '600', color: '#475569', margin: '2px 0 0 0' }}>
                    Academic Year / الموسم الدراسي: {selectedAcademicYear?.label || '—'}
                  </p>
                </div>

                {/* Professional Teacher & School Information Block */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '10px',
                  marginBottom: '10px',
                }}>
                  {/* Column 1 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '8.5px' }}>
                      <span>Teacher Name</span>
                      <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>اسم الأستاذ(ة)</span>
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ textTransform: 'uppercase' }}>{teacherProfile?.fullNameLatin || '—'}</span>
                      {teacherProfile?.fullNameArabic && <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", color: '#047857', fontSize: '10px' }}>{teacherProfile.fullNameArabic}</span>}
                    </div>
                  </div>

                  {/* Column 2 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '8.5px' }}>
                      <span>Teaching Subject</span>
                      <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>المادة المدرسة</span>
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{teacherProfile?.subject || 'English Language'}</span>
                      <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", color: '#047857' }}>اللغة الإنجليزية</span>
                    </div>
                  </div>

                  {/* Column 3 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '8.5px' }}>
                      <span>Rank & Step (Echelon)</span>
                      <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>الرتبة والدرجة</span>
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{teacherProfile?.corpsRank || 'PEM'}</span>
                      <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", color: '#047857' }}>
                        الدرجة {teacherProfile?.echelon !== undefined ? teacherProfile.echelon : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Row 2 - Column 1 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid #e2e8f0', paddingTop: '4px', borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '8.5px' }}>
                      <span>School Code</span>
                      <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>رمز المؤسسة</span>
                    </div>
                    <div style={{ fontWeight: '700', fontFamily: 'monospace', color: '#1e293b' }}>
                      {school?.schoolCode || '—'}
                    </div>
                  </div>

                  {/* Row 2 - Column 2 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid #e2e8f0', paddingTop: '4px', borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '8.5px' }}>
                      <span>Commune / Wilaya</span>
                      <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>البلدية / الولاية</span>
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{school?.commune || '—'}</span>
                      <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", color: '#047857' }}>{school?.wilaya || '—'}</span>
                    </div>
                  </div>

                  {/* Row 2 - Column 3 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '8.5px' }}>
                      <span>Inspectorate District</span>
                      <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>مقاطعة التفتيش</span>
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                      {school?.inspectorDistrict || teacherProfile?.inspectorDistrict || '—'}
                    </div>
                  </div>
                </div>

                {/* Timetable Table Grid - Fixed layout to align perfectly in A4 landscape */}
                <div style={{ flexGrow: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'center',
                    tableLayout: 'fixed',
                    fontSize: '10px',
                    border: '1.5px solid #475569',
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', borderBottom: '1.5px solid #475569' }}>
                        <th style={{
                          border: '1.5px solid #475569',
                          color: '#ffffff',
                          fontWeight: '800',
                          padding: '6px 4px',
                          width: '12%',
                        }}>
                          <div>PERIOD</div>
                          <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", fontSize: '9px', fontWeight: 'bold', marginTop: '1px' }}>الحصة</div>
                        </th>
                        {DAYS_OF_WEEK.map((day) => (
                          <th key={day} style={{
                            border: '1.5px solid #475569',
                            color: '#ffffff',
                            fontWeight: '800',
                            padding: '6px 4px',
                            width: '17.6%',
                          }}>
                            <div style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{day}</div>
                            <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10.5px', marginTop: '1px', fontWeight: '700' }}>
                              {day === 'Sunday' && 'الأحد'}
                              {day === 'Monday' && 'الإثنين'}
                              {day === 'Tuesday' && 'الثلاثاء'}
                              {day === 'Wednesday' && 'الأربعاء'}
                              {day === 'Thursday' && 'الخميس'}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((periodNum) => {
                        const isMiddayBreak = periodNum === 5;
                        return (
                          <React.Fragment key={periodNum}>
                            {isMiddayBreak && (
                              <tr style={{ backgroundColor: '#f8fafc', height: '22px' }}>
                                <td colSpan={6} style={{
                                  border: '1.5px solid #475569',
                                  color: '#334155',
                                  textAlign: 'center',
                                  fontSize: '9.5px',
                                  fontWeight: '700',
                                  verticalAlign: 'middle',
                                }}>
                                  <span style={{ marginRight: '8px' }}>Pause de midi (12:00 - 13:00)</span>
                                  <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", color: '#047857' }}>• فترة الاستراحة والغداء الأسبوعية •</span>
                                </td>
                              </tr>
                            )}
                            <tr style={{ height: '36px' }}>
                              {/* Period Identifier Column */}
                              <td style={{
                                border: '1.5px solid #475569',
                                backgroundColor: '#f8fafc',
                                fontWeight: 'bold',
                                padding: '4px',
                                verticalAlign: 'middle',
                              }}>
                                <div style={{ color: '#0f172a', fontWeight: '800', fontSize: '10px' }}>P{periodNum}</div>
                                <div style={{ fontSize: '7.5px', color: '#64748b', fontWeight: 'normal', marginTop: '1px' }}>{PERIOD_LABELS[periodNum]}</div>
                              </td>

                              {/* Days slots */}
                              {DAYS_OF_WEEK.map((day) => {
                                const slot = slots.find((s) => s.dayOfWeek === day && s.periodNumber === periodNum);
                                if (slot) {
                                  const cls = classMap.get(slot.classId);
                                  return (
                                    <td key={day} style={{
                                      border: '1.5px solid #475569',
                                      padding: '3px 5px',
                                      textAlign: 'left',
                                      verticalAlign: 'top',
                                      backgroundColor: '#f0fdf4',
                                      borderLeft: '4.5px solid #10b981',
                                      height: '36px',
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2px' }}>
                                        <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#065f46' }}>{cls?.name || 'Class'}</span>
                                        <span style={{ fontSize: '7.5px', backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold' }}>
                                          Room: {slot.roomNumber || cls?.roomNumber || '—'}
                                        </span>
                                      </div>
                                      {slot.notes && (
                                        <div style={{
                                          fontSize: '7.5px',
                                          color: '#475569',
                                          fontStyle: 'italic',
                                          marginTop: '1px',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          maxWidth: '120px',
                                        }} title={slot.notes}>
                                          {slot.notes}
                                        </div>
                                      )}
                                    </td>
                                  );
                                }
                                return <td key={day} style={{ border: '1.5px solid #cbd5e1', backgroundColor: '#ffffff' }} />;
                              })}
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Signatures - Perfectly organized */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '9.5px',
                  color: '#475569',
                  fontWeight: '600',
                  borderTop: '1.5px solid #047857',
                  paddingTop: '8px',
                  marginTop: '12px',
                }}>
                  <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <p style={{ color: '#0f172a', margin: '0' }}>Teacher's Signature / توقيع الأستاذ:</p>
                    <div style={{ height: '32px' }}></div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '3px' }} dir="rtl">
                    <p style={{ color: '#0f172a', margin: '0', fontFamily: "'Cairo', sans-serif" }}>مصادقة وختم مدير المؤسسة / Director's Approval & Seal:</p>
                    <div style={{ height: '32px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
