/**
 * UNS SCHOOL — Multilingual Dictionary
 * English (default), French, and Arabic.
 */

export type AppLanguage = 'en' | 'fr' | 'ar';
export type TextDirection = 'ltr' | 'rtl';

export const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    app_title: 'UNS SCHOOL',
    app_subtitle: "Middle School English Teacher's Workspace",
    
    // Navigation
    nav_dashboard: 'Dashboard',
    nav_academic_years: 'Academic Years',
    nav_classes: 'Classes',
    nav_students: 'Students',
    nav_planning: 'Yearly & Sequence Planning',
    nav_lessons: 'Lessons',
    nav_cahier_journal: 'Cahier Journal',
    nav_cahier_textes: 'Cahier de Textes',
    nav_attendance: 'Attendance',
    nav_assessment: 'Assessments',
    nav_gradebook: 'Gradebook',
    nav_curriculum: 'Curriculum & Competencies',
    nav_resources: 'Teaching Resources',
    nav_reports: 'Reports & Export',
    nav_calendar: 'Academic Calendar',
    nav_settings: 'Settings',
    nav_backup: 'Backup & Restore',
    
    // Storage Telemetry
    storage_title: 'Local Storage Status',
    storage_persistence_granted: 'Persistent Storage Granted',
    storage_persistence_not_granted: 'Standard Browser Storage',
    storage_persistence_unavailable: 'Persistence API Unavailable',
    storage_request_button: 'Request Persistence',
    storage_backup_recommendation: 'Remember to export a .unsschool backup regularly to protect your data.',
    storage_used: 'Used',
    storage_quota: 'Quota',
    
    // Common Actions
    action_save: 'Save',
    action_cancel: 'Cancel',
    action_delete: 'Delete',
    action_edit: 'Edit',
    action_install_app: 'Install App',
    action_retry: 'Try Again',
    action_close: 'Close',
    
    // Phase 1 Placeholder
    phase_1_status: 'Phase 1 Foundation',
    phase_1_description: 'The architectural and database foundation for this module has been successfully provisioned.',
    phase_1_coming_soon: 'Full interface workflows will be unlocked in the subsequent phase.',
  },
  fr: {
    app_title: 'UNS SCHOOL',
    app_subtitle: 'Espace de Travail Enseignant CEM Anglais',
    
    // Navigation
    nav_dashboard: 'Tableau de bord',
    nav_academic_years: 'Années Scolaires',
    nav_classes: 'Classes',
    nav_students: 'Élèves',
    nav_planning: 'Planification & Répartition',
    nav_lessons: 'Leçons & Séances',
    nav_cahier_journal: 'Cahier Journal',
    nav_cahier_textes: 'Cahier de Textes',
    nav_attendance: 'Registre des Présences',
    nav_assessment: 'Évaluations',
    nav_gradebook: 'Carnet de Notes',
    nav_curriculum: 'Programme & Compétences',
    nav_resources: 'Ressources Pédagogiques',
    nav_reports: 'Rapports & Délibérations',
    nav_calendar: 'Calendrier Scolaire',
    nav_settings: 'Paramètres',
    nav_backup: 'Sauvegarde & Restauration',
    
    // Storage Telemetry
    storage_title: 'État du Stockage Local',
    storage_persistence_granted: 'Stockage Persistant Accordé',
    storage_persistence_not_granted: 'Stockage Navigateur Standard',
    storage_persistence_unavailable: 'API de Persistance Indisponible',
    storage_request_button: 'Demander la persistance',
    storage_backup_recommendation: 'Pensez à exporter régulièrement une sauvegarde .unsschool.',
    storage_used: 'Utilisé',
    storage_quota: 'Quota',
    
    // Common Actions
    action_save: 'Enregistrer',
    action_cancel: 'Annuler',
    action_delete: 'Supprimer',
    action_edit: 'Modifier',
    action_install_app: "Installer l'application",
    action_retry: 'Réessayer',
    action_close: 'Fermer',
    
    // Phase 1 Placeholder
    phase_1_status: 'Fondation Phase 1',
    phase_1_description: "La fondation architecturale et la base de données de ce module sont prêtes.",
    phase_1_coming_soon: 'Les flux complets seront activés lors de la phase suivante.',
  },
  ar: {
    app_title: 'مدرسة أنس',
    app_subtitle: 'مساحة العمل الرقمية لأستاذ اللغة الإنجليزية في التعليم المتوسط',
    
    // Navigation
    nav_dashboard: 'لوحة القيادة',
    nav_academic_years: 'السنوات الدراسية',
    nav_classes: 'الأفواج التربوية',
    nav_students: 'سجل التلاميذ',
    nav_planning: 'التوزيع السنوي والمخططات',
    nav_lessons: 'الدروس والحصص',
    nav_cahier_journal: 'دفتر اليومية (Cahier Journal)',
    nav_cahier_textes: 'دفتر النصوص (Cahier de Textes)',
    nav_attendance: 'سجل الحضور والغياب',
    nav_assessment: 'التقويمات والامتحانات',
    nav_gradebook: 'دفتر التنقيط ومداولات النقاط',
    nav_curriculum: 'المنهاج والكفاءات',
    nav_resources: 'الموارد والوسائل التعليمية',
    nav_reports: 'التقارير والكشوفات',
    nav_calendar: 'الرزنامة المدرسية',
    nav_settings: 'الإعدادات',
    nav_backup: 'النسخ الاحتياطي والاسترجاع',
    
    // Storage Telemetry
    storage_title: 'حالة التخزين المحلي',
    storage_persistence_granted: 'تم منح إذن التخزين الدائم',
    storage_persistence_not_granted: 'تخزين قياسي في المتصفح',
    storage_persistence_unavailable: 'واجهة التخزين الدائم غير متوفرة',
    storage_request_button: 'طلب التخزين الدائم',
    storage_backup_recommendation: 'يُرجى تصدير ملف النسخ الاحتياطي .unsschool بانتظام لضمان حماية بياناتك.',
    storage_used: 'المستخدم',
    storage_quota: 'السعة الإجمالية',
    
    // Common Actions
    action_save: 'حفظ',
    action_cancel: 'إلغاء',
    action_delete: 'حذف',
    action_edit: 'تعديل',
    action_install_app: 'تثبيت التطبيق',
    action_retry: 'إعادة المحاولة',
    action_close: 'إغلاق',
    
    // Phase 1 Placeholder
    phase_1_status: 'المرحلة 1: البنية التأسيسية',
    phase_1_description: 'تم تجهيز البنية وقواعد البيانات بنجاح لهذا القسم.',
    phase_1_coming_soon: 'سيتم فتح واجهات العمل التفاعلية الكاملة في المرحلة القادمة.',
  },
};
