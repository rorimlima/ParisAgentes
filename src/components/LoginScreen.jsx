import { useState, useRef } from 'react';
import './LoginScreen.css';

export default function LoginScreen({ onLogin, loading, error }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const u = usuario.trim().toLowerCase();
    const s = senha.trim();
    if (!u || !s) return;
    onLogin(u, s);
  };

  return (
    <section className="login-screen">
      {/* Animated background */}
      <div className="login-bg">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="login-container">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <div className="logo-shield">
              <span className="shield-icon">🛡️</span>
              <div className="shield-pulse" />
            </div>
            <h1>Paris Dakar</h1>
            <p>Sistema de Veículos Bloqueados</p>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} autoComplete="off">
            <div className="input-group">
              <label htmlFor="userInput">Usuário</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="userInput"
                  type="text"
                  placeholder="nome.sobrenome"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="passInput">Senha</label>
              <div className="input-wrapper">
                <span className="input-icon">🔑</span>
                <input
                  id="passInput"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex={-1}
                  aria-label="Mostrar senha"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <span>🔒 Acesso restrito a agentes autorizados</span>
          </div>
        </div>
      </div>
    </section>
  );
}
