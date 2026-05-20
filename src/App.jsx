import { getSavedSession } from './services/auth';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import './index.css';

export default function App() {
  const savedUser = getSavedSession();
  const { user, loading, error, login, logout } = useAuth(savedUser);

  if (!user) {
    return (
      <LoginScreen
        onLogin={login}
        loading={loading}
        error={error}
      />
    );
  }

  return <Dashboard user={user} onLogout={logout} />;
}
