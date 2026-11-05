// Logged-in users: workouts live on the server.
import { apiFetch } from '../http.js';

export const apiAdapter = {
  isGuest: false,

  async listSessions() {
    return (await apiFetch('/api/workouts')).workouts;
  },

  async getSession(id) {
    try {
      return (await apiFetch(`/api/workouts/${encodeURIComponent(id)}`)).workout;
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  async saveSession(session) {
    return (await apiFetch('/api/workouts', { method: 'POST', body: session })).workout;
  },

  async deleteSession(id) {
    await apiFetch(`/api/workouts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
