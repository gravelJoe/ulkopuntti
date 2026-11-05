import { useEffect, useState } from 'react';
import * as auth from '../data/auth.js';

const snapshot = () => ({ user: auth.getUser(), entered: auth.hasEntered() });

/** { user, entered, login, continueAsGuest, logout } — user is null for guests. */
export function useAuth() {
  const [s, setS] = useState(snapshot);
  useEffect(() => auth.subscribe(() => setS(snapshot())), []);
  return { ...s, login: auth.login, continueAsGuest: auth.continueAsGuest, logout: auth.logout };
}
