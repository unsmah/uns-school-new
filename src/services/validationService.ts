/**
 * UNS SCHOOL — Validation Schemas
 * Boundary validation using Zod to prevent malformed data from entering IndexedDB.
 */

import { z } from 'zod';

export const SchoolSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, 'School name must be at least 2 characters'),
  nameArabic: z.string().optional(),
  commune: z.string().min(2, 'Commune is required'),
  wilaya: z.string().min(2, 'Wilaya is required'),
  schoolCode: z.string().optional(),
  inspectorDistrict: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AcademicYearSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  label: z.string().regex(/^\d{4}-\d{4}$/, 'Academic year label must be in YYYY-YYYY format (e.g. 2026-2027)'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format'),
  isCurrent: z.boolean(),
  isArchived: z.boolean(),
  terms: z.array(
    z.object({
      id: z.string(),
      termNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      name: z.string().min(1),
      startDate: z.string(),
      endDate: z.string(),
    })
  ).min(1, 'At least one term must be configured'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const SchoolClassSchema = z.object({
  id: z.string().uuid(),
  academicYearId: z.string().uuid(),
  schoolId: z.string().uuid(),
  levelCode: z.string().min(2, 'Level code is required (e.g. 1MS, 2MS, 3MS, 4MS)'),
  name: z.string().min(1, 'Class name is required (e.g. 3MS 1)'),
  roomNumber: z.string().optional(),
  colorTag: z.string().optional(),
  isArchived: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StudentPersonSchema = z.object({
  id: z.string().uuid(),
  nationalIdNumber: z.string().optional(),
  firstNameLatin: z.string().min(1, 'First name is required'),
  lastNameLatin: z.string().min(1, 'Last name is required'),
  firstNameArabic: z.string().optional(),
  lastNameArabic: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  placeOfBirth: z.string().optional(),
  gender: z.enum(['M', 'F']),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianRelationship: z.enum(['Father', 'Mother', 'Legal Guardian']).optional(),
  medicalAlerts: z.string().optional(),
  generalNotes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StudentEnrollmentSchema = z.object({
  id: z.string().uuid(),
  studentPersonId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  registerNumber: z.number().int().positive('Register number must be a positive integer'),
  isRepeating: z.boolean().default(false),
  status: z.enum(['active', 'transferred_out', 'withdrawn', 'suspended']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
