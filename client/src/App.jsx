import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout.jsx';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

// Super Admin Pages
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import Colleges from './pages/superadmin/Colleges';
import SuperAdminAnalytics from './pages/superadmin/Analytics';
import Users from './pages/superadmin/Users';
import AuditLogs from './pages/superadmin/AuditLogs';
import AdminCompetitions from './pages/superadmin/Competitions';
import AdminQuestions from './pages/superadmin/Questions';
import SuperAdminStudents from './pages/superadmin/Students';
import SuperAdminFaculty from './pages/superadmin/Faculty';
import SuperAdminExams from './pages/superadmin/Exams';

// College Admin Pages
import CollegeAdminDashboard from './pages/admin/Dashboard';
import Departments from './pages/admin/Departments';
import Students from './pages/admin/Students';
import Faculty from './pages/admin/Faculty';
import AdminAnalytics from './pages/admin/Analytics';
import Leaderboard from './pages/admin/Leaderboard';
import CollegeCompetitions from './pages/admin/Competitions';

// Dept Head Pages
import DeptHeadDashboard from './pages/depthead/Dashboard';

// Faculty Pages
import FacultyDashboard from './pages/faculty/Dashboard';
import FacultyExams from './pages/faculty/Exams';
import FacultyExamDetails from './pages/faculty/ExamDetails';
const FacultyQuestions = lazy(() => import('./pages/faculty/Questions'));
const FacultyResults = lazy(() => import('./pages/faculty/Results'));
const FacultySubmissions = lazy(() => import('./pages/faculty/Submissions'));

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
const AvailableExams = lazy(() => import('./pages/student/AvailableExams'));
import ExamPreview from './pages/student/ExamPreview';
import TakeExam from './pages/student/TakeExam';
import Results from './pages/student/Results';
import ResultDetails from './pages/student/ResultDetails';
import StudentAnalytics from './pages/student/Analytics';
import StudentLeaderboard from './pages/student/Leaderboard';
import Competitions from './pages/student/Competitions';
import GlobalLeaderboard from './pages/Leaderboard';

// Icons
import { FiHome, FiUsers, FiBarChart, FiFileText, FiBook, FiTrendingUp, FiAward, FiSettings, FiCheckCircle } from 'react-icons/fi';

import { USER_ROLES } from './config/constants';

// Navigation configurations for each role
const navigationConfig = {
  [USER_ROLES.SUPER_ADMIN]: [
    { path: '/super-admin/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/super-admin/colleges', label: 'Colleges', icon: FiBook },
    { path: '/super-admin/students', label: 'Students', icon: FiUsers },
    { path: '/super-admin/faculty', label: 'Faculty', icon: FiUsers },
    { path: '/super-admin/users', label: 'Users', icon: FiUsers },
    { path: '/super-admin/exams', label: 'Exams', icon: FiFileText },
    { path: '/super-admin/analytics', label: 'Analytics', icon: FiBarChart },
    { path: '/super-admin/competitions', label: 'Competitions', icon: FiAward },
    { path: '/super-admin/questions', label: 'Question Bank', icon: FiBook },
    { path: '/super-admin/audit-logs', label: 'Audit Logs', icon: FiFileText },
  ],
  [USER_ROLES.ADMIN]: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/admin/departments', label: 'Departments', icon: FiBook },
    { path: '/admin/students', label: 'Students', icon: FiUsers },
    { path: '/admin/faculty', label: 'Faculty', icon: FiUsers },
    { path: '/admin/competitions', label: 'Competitions', icon: FiAward },
    { path: '/admin/analytics', label: 'Analytics', icon: FiBarChart },
    { path: '/admin/leaderboard', label: 'Leaderboard', icon: FiAward },
  ],
  [USER_ROLES.DEPT_HEAD]: [
    { path: '/dept-head/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/dept-head/subjects', label: 'Subjects', icon: FiBook },
    { path: '/dept-head/faculty', label: 'Faculty', icon: FiUsers },
    { path: '/dept-head/students', label: 'Students', icon: FiUsers },
    { path: '/dept-head/exams', label: 'Exams', icon: FiFileText },
    { path: '/dept-head/analytics', label: 'Analytics', icon: FiBarChart },
  ],
  [USER_ROLES.FACULTY]: [
    { path: '/faculty/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/faculty/exams', label: 'Exams', icon: FiFileText },
    { path: '/faculty/questions', label: 'Questions', icon: FiBook },
    { path: '/faculty/evaluations', label: 'Evaluations', icon: FiCheckCircle },
  ],
  [USER_ROLES.STUDENT]: [
    { path: '/student/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/student/exams', label: 'Exams', icon: FiFileText },
    { path: '/student/competitions', label: 'Competitions', icon: FiAward },
    { path: '/student/results', label: 'Results', icon: FiBarChart },
    { path: '/student/leaderboard', label: 'Leaderboard', icon: FiAward },
    { path: '/student/global-leaderboard', label: 'Global Ranking', icon: FiAward },
    { path: '/student/analytics', label: 'Analytics', icon: FiTrendingUp },
  ],
};

const RoleBasedRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  switch (user?.role) {
    case USER_ROLES.SUPER_ADMIN:
      return <Navigate to="/super-admin/dashboard" replace />;
    case USER_ROLES.ADMIN:
      return <Navigate to="/admin/dashboard" replace />;
    case USER_ROLES.DEPT_HEAD:
      return <Navigate to="/dept-head/dashboard" replace />;
    case USER_ROLES.FACULTY:
      return <Navigate to="/faculty/dashboard" replace />;
    case USER_ROLES.STUDENT:
      return <Navigate to="/student/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const SuperAdminRoutes = () => {
  const { user } = useAuth();
  return (
    <DashboardLayout navigation={navigationConfig[USER_ROLES.SUPER_ADMIN]}>
      <Routes>
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="colleges" element={<Colleges />} />
        <Route path="students" element={<SuperAdminStudents />} />
        <Route path="faculty" element={<SuperAdminFaculty />} />
        <Route path="users" element={<Users />} />
        <Route path="exams" element={<SuperAdminExams />} />
        <Route path="exams/:id" element={<FacultyExamDetails />} />
        <Route path="exams/:id/results" element={<FacultyResults />} />
        <Route path="analytics" element={<SuperAdminAnalytics />} />
        <Route path="competitions" element={<AdminCompetitions />} />
        <Route path="questions" element={<AdminQuestions />} />
        <Route path="audit-logs" element={<AuditLogs />} />
      </Routes>
    </DashboardLayout>
  );
};

const AdminRoutes = () => {
  return (
    <DashboardLayout navigation={navigationConfig[USER_ROLES.ADMIN]}>
      <Routes>
        <Route path="dashboard" element={<CollegeAdminDashboard />} />
        <Route path="departments" element={<Departments />} />
        <Route path="students" element={<Students />} />
        <Route path="faculty" element={<Faculty />} />
        <Route path="competitions" element={<CollegeCompetitions />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="leaderboard" element={<Leaderboard />} />
      </Routes>
    </DashboardLayout>
  );
};

const DeptHeadRoutes = () => {
  return (
    <DashboardLayout navigation={navigationConfig[USER_ROLES.DEPT_HEAD]}>
      <Routes>
        <Route path="dashboard" element={<DeptHeadDashboard />} />
        <Route path="subjects" element={<div>Subjects Page (Coming Soon)</div>} />
        <Route path="faculty" element={<div>Faculty Page (Coming Soon)</div>} />
        <Route path="students" element={<div>Students Page (Coming Soon)</div>} />
        <Route path="exams" element={<div>Exams Page (Coming Soon)</div>} />
        <Route path="analytics" element={<div>Analytics Page (Coming Soon)</div>} />
      </Routes>
    </DashboardLayout>
  );
};

const FacultyRoutes = () => {
  return (
    <DashboardLayout navigation={navigationConfig[USER_ROLES.FACULTY]}>
      <Routes>
        <Route path="dashboard" element={<FacultyDashboard />} />
        <Route path="exams" element={<FacultyExams />} />
        <Route path="exams/:id" element={<FacultyExamDetails />} />
        <Route path="exams/:id/results" element={<FacultyResults />} />
        <Route path="evaluations" element={<FacultySubmissions />} />
        <Route path="questions" element={<FacultyQuestions />} />
      </Routes>
    </DashboardLayout>
  );
};

const StudentRoutes = () => {
  return (
    <>
      <Routes>
        {/* Routes with layout */}
        <Route path="/" element={<DashboardLayout navigation={navigationConfig[USER_ROLES.STUDENT]} />}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="exams" element={<AvailableExams />} />
          <Route path="exams/:id" element={<ExamPreview />} />
          <Route path="results" element={<Results />} />
          <Route path="results/:id" element={<ResultDetails />} />
          <Route path="competitions" element={<Competitions />} />
          <Route path="leaderboard" element={<StudentLeaderboard />} />
          <Route path="global-leaderboard" element={<GlobalLeaderboard />} />
          <Route path="analytics" element={<StudentAnalytics />} />
        </Route>

        {/* Exam taking route - no layout (full screen) */}
        <Route path="exams/:id/take" element={<TakeExam />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Root redirect */}
            <Route path="/" element={<RoleBasedRedirect />} />

            {/* Protected Routes by Role */}
            <Route
              path="/super-admin/*"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]}>
                  <SuperAdminRoutes />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <AdminRoutes />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dept-head/*"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.DEPT_HEAD]}>
                  <DeptHeadRoutes />
                </ProtectedRoute>
              }
            />

            <Route
              path="/faculty/*"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.FACULTY]}>
                  <FacultyRoutes />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/*"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STUDENT]}>
                  <StudentRoutes />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#363636',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
