/**
 * UNS SCHOOL — Student CSV Import Modal
 * Multi-step client-side CSV import workflow with robust parsing, validation preview,
 * duplicate detection, and atomic transaction execution.
 */

import React, { useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { Modal, Button, Alert, Badge } from '../ui';
import {
  prepareStudentImportPreview,
  executeStudentImport,
  type ImportPreviewResult,
  type ImportExecutionSummary,
} from '../../services/studentImportService';
import type { SchoolClass } from '../../types';

interface StudentCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  schoolId: string;
  academicYearId: string;
  targetClass: SchoolClass;
}

const SAMPLE_CSV = `registerNumber,firstNameLatin,lastNameLatin,firstNameArabic,lastNameArabic,gender,dateOfBirth,isRepeating,nationalIdNumber
1,Youcef,Benali,يوسف,بن علي,M,2012-05-14,false,201216010012341
2,Amina,Kaddour,أمينة,قدور,F,2012-09-22,false,201216010012342
3,Karim,Saadi,كريم,ساعدي,M,2011-11-03,true,201116010012343`;

export const StudentCsvImportModal: React.FC<StudentCsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  schoolId,
  academicYearId,
  targetClass,
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [summary, setSummary] = useState<ImportExecutionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);

  const resetState = () => {
    setStep('upload');
    setCsvText('');
    setFileName('');
    setPreview(null);
    setSummary(null);
    setError(null);
    setIsValidating(false);
    setIsExecuting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text || '');
    };
    reader.onerror = () => {
      setError('Failed to read CSV file.');
    };
    reader.readAsText(file);
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_CSV);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handleUseSample = () => {
    setCsvText(SAMPLE_CSV);
    setFileName('sample_students.csv');
  };

  const handleParseAndValidate = async () => {
    if (!csvText.trim()) {
      setError('Please select a CSV file or paste CSV content.');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await prepareStudentImportPreview(csvText, {
        schoolId,
        academicYearId,
        classId: targetClass.id,
      });

      if (result.totalRows === 0) {
        setError('No data rows found in CSV. Please verify file content and header row.');
        setIsValidating(false);
        return;
      }

      setPreview(result);
      setStep('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error validating CSV import.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!preview || !preview.canExecute) return;

    setIsExecuting(true);
    setError(null);

    try {
      const result = await executeStudentImport(preview, {
        schoolId,
        academicYearId,
        classId: targetClass.id,
      });
      setSummary(result);
      setStep('result');
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import execution failed.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Import Students Roster — ${targetClass.name}`}
      description={`Import student roster directly into ${targetClass.name} (${targetClass.levelCode})`}
      maxWidth="3xl"
      footer={
        <>
          {step === 'upload' && (
            <>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleParseAndValidate}
                isLoading={isValidating}
                disabled={!csvText.trim()}
              >
                Validate & Preview
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('upload')}
                disabled={isExecuting}
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteImport}
                isLoading={isExecuting}
                disabled={!preview?.canExecute}
              >
                Import {preview?.validRows.length || 0} Students
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button variant="primary" size="sm" onClick={handleClose}>
              Done
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-xs">
        {error && (
          <Alert variant="error" title="Import Error">
            {error}
          </Alert>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 text-center">
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Choose a CSV file or drag and drop
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Supports comma, semicolon, and tab-delimited files (.csv, .txt)
              </p>

              <label className="mt-3 inline-block">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileSelected}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs">
                  <FileText className="w-3.5 h-3.5" />
                  {fileName ? fileName : 'Browse CSV file'}
                </span>
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Or paste CSV text directly:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySample}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSample ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedSample ? 'Copied' : 'Copy Sample CSV'}
                  </button>
                  <button
                    type="button"
                    onClick={handleUseSample}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium cursor-pointer"
                  >
                    Load Sample
                  </button>
                </div>
              </div>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="registerNumber,firstNameLatin,lastNameLatin,firstNameArabic,lastNameArabic,gender,dateOfBirth,isRepeating"
                rows={6}
                className="w-full font-mono text-[11px] p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 'preview' && preview && (
          <div className="space-y-4">
            {/* Metric counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="text-[11px] text-slate-500">Total Rows</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {preview.totalRows}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  Valid to Import
                </div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {preview.validRows.length}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20">
                <div className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                  Invalid Rows
                </div>
                <div className="text-lg font-bold text-rose-700 dark:text-rose-400">
                  {preview.invalidRows.length}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                  Matched Identities
                </div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {preview.duplicateCandidateCount}
                </div>
              </div>
            </div>

            {preview.invalidRows.length > 0 && (
              <Alert
                variant="error"
                title={`${preview.invalidRows.length} Invalid Row(s) Detected`}
              >
                All rows must be valid before the import can be committed to the database. Fix the errors below and re-validate.
              </Alert>
            )}

            {/* Invalid rows table */}
            {preview.invalidRows.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Invalid Rows (Must be fixed)
                </h4>
                <div className="max-h-48 overflow-y-auto border border-rose-200 dark:border-rose-900/60 rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 sticky top-0">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Student Name</th>
                        <th className="p-2">Register #</th>
                        <th className="p-2">Validation Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 dark:divide-rose-900/40">
                      {preview.invalidRows.map((row) => (
                        <tr key={row.rowNumber} className="bg-rose-50/30 dark:bg-rose-950/10">
                          <td className="p-2 font-mono font-bold">{row.rowNumber}</td>
                          <td className="p-2">
                            {row.firstNameLatin} {row.lastNameLatin}
                          </td>
                          <td className="p-2 font-mono">#{row.registerNumber}</td>
                          <td className="p-2 text-rose-600 dark:text-rose-400">
                            {row.errors.join('; ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Valid rows table */}
            {preview.validRows.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Valid Rows Ready for Import ({preview.validRows.length})
                </h4>
                <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Name (Latin)</th>
                        <th className="p-2">Name (Arabic)</th>
                        <th className="p-2">Gender</th>
                        <th className="p-2">DOB</th>
                        <th className="p-2">Identity Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {preview.validRows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="p-2 font-mono font-bold">#{row.registerNumber}</td>
                          <td className="p-2 font-medium">
                            {row.firstNameLatin} {row.lastNameLatin}
                          </td>
                          <td className="p-2" dir="rtl">
                            {row.firstNameArabic} {row.lastNameArabic}
                          </td>
                          <td className="p-2">{row.gender}</td>
                          <td className="p-2">{row.dateOfBirth || '—'}</td>
                          <td className="p-2">
                            {row.isNewPerson ? (
                              <Badge variant="success">New Person</Badge>
                            ) : (
                              <Badge variant="default">Matched Identity</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: RESULT */}
        {step === 'result' && summary && (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Roster Imported Successfully!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {summary.createdEnrollmentsCount} students have been enrolled into {targetClass.name}.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 max-w-md mx-auto text-left">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="text-[10px] text-slate-500">New Persons Created</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {summary.createdPersonsCount}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="text-[10px] text-slate-500">Existing Persons Matched</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {summary.matchedPersonsCount}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="text-[10px] text-slate-500">Class Enrollments</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {summary.createdEnrollmentsCount}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
