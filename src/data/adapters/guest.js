// Guest mode: you can use the app, but nothing is stored.
export const guestAdapter = {
  isGuest: true,
  async listSessions() {
    return [];
  },
  async getSession() {
    return null;
  },
  async saveSession(session) {
    return session;
  },
  async deleteSession() {},
};
