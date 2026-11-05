import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { useTheme } from './hooks/useTheme.js';
import { verify } from './data/auth.js';
import { useAuth } from './hooks/useAuth.js';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import WorkoutScreen from './screens/WorkoutScreen.jsx';
import HistoryScreen from './screens/HistoryScreen.jsx';
import SessionDetailScreen from './screens/SessionDetailScreen.jsx';
import WelcomeScreen from './screens/WelcomeScreen.jsx';
import ChangePasswordScreen from './screens/ChangePasswordScreen.jsx';

export default function App() {
  const [theme, setTheme] = useTheme();
  const { entered } = useAuth();
  useEffect(() => {
    verify();
  }, []);

  return (
    <ConfirmProvider>
      <Routes>
        <Route path="/welcome" element={<WelcomeScreen />} />
        {entered ? (
          <>
            <Route path="/" element={<HomeScreen theme={theme} setTheme={setTheme} />} />
            <Route path="/workout/:workoutId" element={<WorkoutScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
            <Route path="/history/:sessionId" element={<SessionDetailScreen />} />
            <Route path="/account/password" element={<ChangePasswordScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          // First launch or logged out: everything goes to the welcome screen.
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        )}
      </Routes>
    </ConfirmProvider>
  );
}
