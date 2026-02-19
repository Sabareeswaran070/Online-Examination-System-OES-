import api from './api';

export const competitionService = {
  // ── Leaderboard ──
  getGlobalLeaderboard: async (params) => {
    const response = await api.get('/competitions/leaderboard', { params });
    return response.data;
  },

  // ── Super Admin CRUD ──
  createCompetition: async (data) => {
    const response = await api.post('/competitions', data);
    return response.data;
  },

  getAllCompetitions: async (params) => {
    const response = await api.get('/competitions/admin/all', { params });
    return response.data;
  },

  getCompetition: async (id) => {
    const response = await api.get(`/competitions/${id}`);
    return response.data;
  },

  updateCompetition: async (id, data) => {
    const response = await api.put(`/competitions/${id}`, data);
    return response.data;
  },

  deleteCompetition: async (id) => {
    const response = await api.delete(`/competitions/${id}`);
    return response.data;
  },

  // ── Super Admin Workflow ──
  publishCompetition: async (id) => {
    const response = await api.put(`/competitions/${id}/publish`);
    return response.data;
  },

  makeCompetitionLive: async (id) => {
    const response = await api.put(`/competitions/${id}/live`);
    return response.data;
  },

  getCompetitionColleges: async (id) => {
    const response = await api.get(`/competitions/${id}/colleges`);
    return response.data;
  },

  approveCollege: async (competitionId, collegeId, approve, note) => {
    const response = await api.put(
      `/competitions/${competitionId}/colleges/${collegeId}/approve`,
      { approve, note }
    );
    return response.data;
  },

  approveAllAccepted: async (id) => {
    const response = await api.put(`/competitions/${id}/approve-all`);
    return response.data;
  },

  // ── Live Scores ──
  getCompetitionLiveScores: async (id) => {
    const response = await api.get(`/competitions/${id}/live-scores`);
    return response.data;
  },

  // ── College Admin ──
  getCollegeCompetitions: async () => {
    const response = await api.get('/competitions/college/my');
    return response.data;
  },

  respondToCompetition: async (competitionId, action, rejectReason) => {
    const response = await api.put(
      `/competitions/college/${competitionId}/respond`,
      { action, rejectReason }
    );
    return response.data;
  },

  // ── Student ──
  getStudentCompetitions: async () => {
    const response = await api.get('/competitions/student/available');
    return response.data;
  },
};
