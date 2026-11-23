import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Spinner from './components/ui/Spinner';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import CallsPage from './pages/calls/CallsPage';
import ChatsPage from './pages/chat/ChatsPage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import StatusPage from './pages/status/StatusPage';

const FullScreenLoader = () => (
  <div className="flex h-full items-center justify-center bg-app-bg">
    <Spinner label="Loading Chatly…" />
  </div>
);

const ProtectedRoute = () => {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <AppShell />;
};

const PublicOnly = ({ children }) => {
  const { user, booting } = useAuth();
  if (booting) return <FullScreenLoader />;
  if (user) return <Navigate to="/chat" replace />;
  return children;
};

const App = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <PublicOnly>
          <AuthPage mode="login" />
        </PublicOnly>
      }
    />
    <Route
      path="/register"
      element={
        <PublicOnly>
          <AuthPage mode="register" />
        </PublicOnly>
      }
    />

    <Route element={<ProtectedRoute />}>
      <Route index element={<Navigate to="/chat" replace />} />
      <Route path="/chat" element={<ChatsPage />} />
      <Route path="/chat/:conversationId" element={<ChatsPage />} />
      <Route path="/status" element={<StatusPage />} />
      <Route path="/calls" element={<CallsPage kind="audio" />} />
      <Route path="/video" element={<CallsPage kind="video" />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/:userId" element={<ProfilePage />} />
    </Route>

    <Route path="*" element={<Navigate to="/chat" replace />} />
  </Routes>
);

export default App;
