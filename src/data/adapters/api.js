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

  /** The user's program, or null if they haven't changed the default yet. */
  async getProgram() {
    return (await apiFetch('/api/program')).program;
  },

  async saveProgram(program) {
    return (await apiFetch('/api/program', { method: 'PUT', body: program })).program;
  },
};
