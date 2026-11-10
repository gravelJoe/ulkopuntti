import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useLayoutEffect } from 'react';
import { useTheme } from './hooks/useTheme.js';
import { verify } from './data/auth.js';
import { useAuth } from './hooks/useAuth.js';
import { useProgram } from './program/store.js';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import WorkoutScreen from './screens/WorkoutScreen.jsx';
import HistoryScreen from './screens/HistoryScreen.jsx';
import SessionDetailScreen from './screens/SessionDetailScreen.jsx';
import WelcomeScreen from './screens/WelcomeScreen.jsx';
import ChangePasswordScreen from './screens/ChangePasswordScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';
import WorkoutsScreen from './screens/WorkoutsScreen.jsx';
import WorkoutEditScreen from './screens/WorkoutEditScreen.jsx';
import ExercisesScreen from './screens/ExercisesScreen.jsx';
import ExerciseEditScreen from './screens/ExerciseEditScreen.jsx';
import PlacesScreen from './screens/PlacesScreen.jsx';
import GymEditScreen from './screens/GymEditScreen.jsx';
import OwnPlatesScreen from './screens/OwnPlatesScreen.jsx';

// Every new screen starts at the top (the browser otherwise keeps the
// previous screen's scroll position). Layout effect = no visible jump.
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const { entered } = useAuth();
  useProgram(); // re-render all screens when workouts/exercises change
  useEffect(() => {
    verify();
  }, []);

  return (
    <ConfirmProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/welcome" element={<WelcomeScreen />} />
        {entered ? (
          <>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/settings" element={<SettingsScreen theme={theme} setTheme={setTheme} />} />
            <Route path="/workout/:workoutId" element={<WorkoutScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
            <Route path="/history/:sessionId" element={<SessionDetailScreen />} />
            <Route path="/account/password" element={<ChangePasswordScreen />} />
            <Route path="/settings/workouts" element={<WorkoutsScreen />} />
            <Route path="/settings/workouts/:editId" element={<WorkoutEditScreen />} />
            <Route path="/settings/exercises" element={<ExercisesScreen />} />
            <Route path="/settings/exercises/:exerciseId" element={<ExerciseEditScreen />} />
            <Route path="/settings/places" element={<PlacesScreen />} />
            <Route path="/settings/places/:gymId" element={<GymEditScreen />} />
            <Route path="/settings/plates" element={<OwnPlatesScreen />} />
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
