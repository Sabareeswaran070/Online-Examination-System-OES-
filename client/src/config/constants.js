// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Token configuration
export const TOKEN_KEY = 'exam_system_token';
export const USER_KEY = 'exam_system_user';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Exam configuration
export const EXAM_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const QUESTION_TYPES = {
  MCQ: 'MCQ',
  DESCRIPTIVE: 'Descriptive',
  TRUE_FALSE: 'True/False',
  CODING: 'Coding',
};

export const USER_ROLES = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  DEPT_HEAD: 'depthead',
  FACULTY: 'faculty',
  STUDENT: 'student',
};

export const RESULT_STATUS = {
  IN_PROGRESS: 'in-progress',
  SUBMITTED: 'submitted',
  EVALUATED: 'evaluated',
};

// Routes configuration
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  
  // Super Admin
  SUPER_ADMIN: {
    DASHBOARD: '/super-admin/dashboard',
    COLLEGES: '/super-admin/colleges',
    ANALYTICS: '/super-admin/analytics',
    AUDIT_LOGS: '/super-admin/audit-logs',
    USERS: '/super-admin/users',
  },
  
  // College Admin
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    DEPARTMENTS: '/admin/departments',
    STUDENTS: '/admin/students',
    FACULTY: '/admin/faculty',
    ANALYTICS: '/admin/analytics',
    LEADERBOARD: '/admin/leaderboard',
  },
  
  // Department Head
  DEPT_HEAD: {
    DASHBOARD: '/dept-head/dashboard',
    SUBJECTS: '/dept-head/subjects',
    FACULTY: '/dept-head/faculty',
    STUDENTS: '/dept-head/students',
    EXAMS: '/dept-head/exams',
    ANALYTICS: '/dept-head/analytics',
  },
  
  // Faculty
  FACULTY: {
    DASHBOARD: '/faculty/dashboard',
    EXAMS: '/faculty/exams',
    QUESTIONS: '/faculty/questions',
    RESULTS: '/faculty/results',
    EVALUATE: '/faculty/evaluate',
  },
  
  // Student
  STUDENT: {
    DASHBOARD: '/student/dashboard',
    EXAMS: '/student/exams',
    RESULTS: '/student/results',
    LEADERBOARD: '/student/leaderboard',
    ANALYTICS: '/student/analytics',
  },
};

// Chart colors
export const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

// Date formats
export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
export const TIME_FORMAT = 'HH:mm';
