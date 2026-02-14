import api from './api';

export const competitionService = {
    getGlobalLeaderboard: async (params) => {
        const response = await api.get('/competitions/leaderboard', { params });
        return response.data;
    },

    getActiveCompetitions: async () => {
        const response = await api.get('/competitions');
        return response.data;
    },

    createCompetition: async (data) => {
        const response = await api.post('/competitions', data);
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

    getAllCompetitions: async (params) => {
        const response = await api.get('/competitions/admin/all', { params });
        return response.data;
    },
};
