import api from './api';

// Authentication Services
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  changePassword: async (data) => {
    const response = await api.put('/auth/change-password', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Super Admin Services
export const superAdminService = {
  getDashboard: async () => {
    const response = await api.get('/superadmin/dashboard');
    return response.data;
  },

  getColleges: async (params) => {
    const response = await api.get('/superadmin/colleges', { params });
    return response.data;
  },

  getCollegeStats: async (id) => {
    const response = await api.get(`/superadmin/colleges/${id}/stats`);
    return response.data;
  },

  createCollege: async (data) => {
    const response = await api.post('/superadmin/colleges', data);
    return response.data;
  },

  lookupPincode: async (pincode) => {
    const response = await api.get(`/superadmin/pincode/${pincode}`);
    return response.data;
  },

  updateCollege: async (id, data) => {
    const response = await api.put(`/superadmin/colleges/${id}`, data);
    return response.data;
  },

  deleteCollege: async (id) => {
    const response = await api.delete(`/superadmin/colleges/${id}`);
    return response.data;
  },

  updateCollegeStatus: async (id, status) => {
    const response = await api.put(`/superadmin/colleges/${id}/status`, { status });
    return response.data;
  },

  assignCollegeAdmin: async (collegeId, adminId) => {
    const response = await api.put(`/superadmin/colleges/${collegeId}/assign-admin`, { adminId });
    return response.data;
  },

  removeCollegeAdmin: async (collegeId, adminId) => {
    const response = await api.put(`/superadmin/colleges/${collegeId}/remove-admin`, { adminId });
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/superadmin/analytics');
    return response.data;
  },

  getAuditLogs: async (params) => {
    const response = await api.get('/superadmin/audit-logs', { params });
    return response.data;
  },

  getUsers: async (params) => {
    try {
      const response = await api.get('/superadmin/users', { params });
      return response.data;
    } catch (error) {
      console.error('Service getUsers error:', error);
      throw error;
    }
  },

  createUser: async (data) => {
    const response = await api.post('/superadmin/users', data);
    return response.data;
  },
  updateUser: async (id, data) => {
    const response = await api.put(`/superadmin/users/${id}`, data);
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/superadmin/users/${id}`);
    return response.data;
  },
  updateUserStatus: async (id, status) => {
    const response = await api.put(`/superadmin/users/${id}/status`, { status });
    return response.data;
  },

  // Question Management
  getQuestions: async (params) => {
    const response = await api.get('/superadmin/questions', { params });
    return response.data;
  },
  createQuestion: async (data) => {
    const response = await api.post('/superadmin/questions', data);
    return response.data;
  },
  updateQuestion: async (id, data) => {
    const response = await api.put(`/superadmin/questions/${id}`, data);
    return response.data;
  },
  deleteQuestion: async (id) => {
    const response = await api.delete(`/superadmin/questions/${id}`);
    return response.data;
  },
  updateQuestionStatus: async (id, status) => {
    const response = await api.put(`/superadmin/questions/${id}/status`, { status });
    return response.data;
  },
  getSubjects: async () => {
    const response = await api.get('/superadmin/subjects');
    return response.data;
  },
  getExams: async (params) => {
    const response = await api.get('/superadmin/exams', { params });
    return response.data;
  },
  bulkUploadQuestions: async (formData) => {
    const response = await api.post('/superadmin/questions/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  generateAICodingQuestion: async (params) => {
    const response = await api.post('/superadmin/questions/generate-ai', params);
    return response.data;
  },
  generateAIQuestions: async (params) => {
    const response = await api.post('/superadmin/questions/generate-ai-multi', params);
    return response.data;
  },
  getQuestionSets: async (params) => {
    const response = await api.get('/superadmin/question-sets', { params });
    return response.data;
  },
  createQuestionSet: async (data) => {
    const response = await api.post('/superadmin/question-sets', data);
    return response.data;
  },
  updateQuestionSet: async (id, data) => {
    const response = await api.put(`/superadmin/question-sets/${id}`, data);
    return response.data;
  },
  deleteQuestionSet: async (id) => {
    const response = await api.delete(`/superadmin/question-sets/${id}`);
    return response.data;
  },

  // College Department Management for Super Admin
  createCollegeDepartment: async (collegeId, data) => {
    const response = await api.post(`/superadmin/colleges/${collegeId}/departments`, data);
    return response.data;
  },
  updateCollegeDepartment: async (collegeId, deptId, data) => {
    const response = await api.put(`/superadmin/colleges/${collegeId}/departments/${deptId}`, data);
    return response.data;
  },
  deleteCollegeDepartment: async (collegeId, deptId) => {
    const response = await api.delete(`/superadmin/colleges/${collegeId}/departments/${deptId}`);
    return response.data;
  },
  bulkUploadUsers: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/superadmin/users/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  createSubject: async (collegeId, deptId, data) => {
    const response = await api.post(`/superadmin/colleges/${collegeId}/departments/${deptId}/subjects`, data);
    return response.data;
  },
  getDepartmentSubjects: async (collegeId, deptId) => {
    const response = await api.get(`/superadmin/colleges/${collegeId}/departments/${deptId}/subjects`);
    return response.data;
  },
  deleteSubject: async (id) => {
    const response = await api.delete(`/superadmin/subjects/${id}`);
    return response.data;
  },
};

// College Admin Services
export const collegeAdminService = {
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getDepartments: async (params) => {
    const response = await api.get('/admin/departments', { params });
    return response.data;
  },

  createDepartment: async (data) => {
    const response = await api.post('/admin/departments', data);
    return response.data;
  },

  updateDepartment: async (id, data) => {
    const response = await api.put(`/admin/departments/${id}`, data);
    return response.data;
  },

  assignDeptHead: async (deptId, userId) => {
    const response = await api.put(`/admin/departments/${deptId}/assign-head`, { deptHeadId: userId });
    return response.data;
  },

  deleteDepartment: async (id) => {
    const response = await api.delete(`/admin/departments/${id}`);
    return response.data;
  },

  getStudents: async (params) => {
    const response = await api.get('/admin/students', { params });
    return response.data;
  },

  getFaculty: async (params) => {
    const response = await api.get('/admin/faculty', { params });
    return response.data;
  },

  bulkUploadStudents: async (formData) => {
    const response = await api.post('/admin/students/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },

  getLeaderboard: async (params) => {
    const response = await api.get('/admin/leaderboard', { params });
    return response.data;
  },

  createUser: async (data) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  updateUser: async (id, data) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getDepartmentSubjects: async (deptId) => {
    const response = await api.get(`/admin/departments/${deptId}/subjects`);
    return response.data;
  },

  createSubject: async (data) => {
    const response = await api.post('/admin/subjects', data);
    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/admin/subjects/${id}`);
    return response.data;
  },
};

// Department Head Services
export const deptHeadService = {
  getDashboard: async () => {
    const response = await api.get('/depthead/dashboard');
    return response.data;
  },

  getSubjects: async (params) => {
    const response = await api.get('/depthead/subjects', { params });
    return response.data;
  },

  createSubject: async (data) => {
    const response = await api.post('/depthead/subjects', data);
    return response.data;
  },

  updateSubject: async (id, data) => {
    const response = await api.put(`/depthead/subjects/${id}`, data);
    return response.data;
  },

  assignFaculty: async (subjectId, facultyId) => {
    const response = await api.post(`/depthead/subjects/${subjectId}/assign-faculty`, { facultyId });
    return response.data;
  },

  getFaculty: async () => {
    const response = await api.get('/depthead/faculty');
    return response.data;
  },

  getStudents: async (params) => {
    const response = await api.get('/depthead/students', { params });
    return response.data;
  },

  getFacultyWorkload: async () => {
    const response = await api.get('/depthead/faculty/workload');
    return response.data;
  },

  approveExam: async (examId) => {
    const response = await api.patch(`/depthead/exams/${examId}/approve`);
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/depthead/analytics');
    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/depthead/subjects/${id}`);
    return response.data;
  },
};

// Faculty Services
export const facultyService = {
  getDashboard: async () => {
    const response = await api.get('/faculty/dashboard');
    return response.data;
  },

  getExams: async (params) => {
    const response = await api.get('/faculty/exams', { params });
    return response.data;
  },

  getExam: async (id) => {
    const response = await api.get(`/faculty/exams/${id}`);
    return response.data;
  },

  createExam: async (data) => {
    const response = await api.post('/faculty/exams', data);
    return response.data;
  },

  updateExam: async (id, data) => {
    const response = await api.put(`/faculty/exams/${id}`, data);
    return response.data;
  },

  deleteExam: async (id) => {
    const response = await api.delete(`/faculty/exams/${id}`);
    return response.data;
  },

  publishExam: async (id) => {
    const response = await api.post(`/faculty/exams/${id}/publish`);
    return response.data;
  },

  addQuestionToExam: async (examId, questionId) => {
    const response = await api.post(`/faculty/exams/${examId}/questions`, { questionId });
    return response.data;
  },
  updateExamQuestionMarks: async (examId, questionId, marks) => {
    const response = await api.put(`/faculty/exams/${examId}/questions/${questionId}/marks`, { marks });
    return response.data;
  },
  removeQuestionFromExam: async (examId, questionId) => {
    const response = await api.delete(`/faculty/exams/${examId}/questions/${questionId}`);
    return response.data;
  },

  getQuestions: async (params) => {
    const response = await api.get('/faculty/questions', { params });
    return response.data;
  },

  createQuestion: async (data) => {
    const response = await api.post('/faculty/questions', data);
    return response.data;
  },

  updateQuestion: async (id, data) => {
    const response = await api.put(`/faculty/questions/${id}`, data);
    return response.data;
  },

  deleteQuestion: async (id) => {
    const response = await api.delete(`/faculty/questions/${id}`);
    return response.data;
  },

  getExamResults: async (examId) => {
    const response = await api.get(`/faculty/exams/${examId}/results`);
    return response.data;
  },

  evaluateAnswer: async (resultId, answerId, data) => {
    const response = await api.post(`/faculty/evaluate/${resultId}`, { answerId, ...data });
    return response.data;
  },

  generateRandomQuestions: async (data) => {
    const { examId, ...params } = data;
    const response = await api.post(`/faculty/exams/${examId}/generate-questions`, params);
    return response.data;
  },
};

// Student Services
export const studentService = {
  getDashboard: async () => {
    const response = await api.get('/student/dashboard');
    return response.data;
  },

  getAvailableExams: async () => {
    const response = await api.get('/student/exams');
    return response.data;
  },

  getExamDetails: async (id) => {
    const response = await api.get(`/student/exams/${id}`);
    return response.data;
  },

  startExam: async (id) => {
    const response = await api.post(`/student/exams/${id}/start`);
    return response.data;
  },

  submitExam: async (id, data) => {
    const response = await api.post(`/student/exams/${id}/submit`, data);
    return response.data;
  },

  saveAnswer: async (id, data) => {
    const response = await api.put(`/student/exams/${id}/save-answer`, data);
    return response.data;
  },

  getResults: async () => {
    const response = await api.get('/student/results');
    return response.data;
  },

  getResultDetails: async (id) => {
    const response = await api.get(`/student/results/${id}`);
    return response.data;
  },

  getLeaderboard: async (params) => {
    const response = await api.get('/student/leaderboard', { params });
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/student/analytics');
    return response.data;
  },
};

export * from './competitionService';
