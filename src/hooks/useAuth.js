import { useState, useCallback } from 'react';
import { login as authLogin, clearSession } from '../services/auth';

export function useAuth(initialUser) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async (usuario, senha) => {
    setError('');
    setLoading(true);
    try {
      const loggedUser = await authLogin(usuario, senha);
      setUser(loggedUser);
      return loggedUser;
    } catch (err) {
      const msg = err.message || 'Erro ao conectar. Tente novamente.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setError('');
  }, []);

  return { user, loading, error, login, logout, setError };
}
