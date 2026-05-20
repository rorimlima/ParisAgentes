import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchVeiculos, searchVeiculos, getStats } from '../services/vehicles';
import VehicleCard from './VehicleCard';
import './Dashboard.css';

export default function Dashboard({ user, onLogout }) {
  const [veiculos, setVeiculos] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('loading');
  const [lastSync, setLastSync] = useState(null);
  const [toast, setToast] = useState(null);
  const searchTimer = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setSyncStatus('syncing');
    try {
      const data = await fetchVeiculos();
      setVeiculos(data);
      setFiltered(data);
      setSyncStatus('online');
      setLastSync(new Date());
      showToast('Dados sincronizados', 'success');
    } catch (err) {
      console.error('[Sync] Error:', err);
      setSyncStatus('offline');
      showToast('Falha na sincronização', 'error');
    } finally {
      setSyncing(false);
    }
  }, [showToast]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFiltered(searchVeiculos(veiculos, query));
    }, 250);
    return () => clearTimeout(searchTimer.current);
  }, [query, veiculos]);

  const stats = getStats(veiculos);
  const syncTimeStr = lastSync
    ? lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <section className="dashboard">
      {/* Header */}
      <header className="dash-header">
        <div className="header-left">
          <div className="header-brand">
            <span className="brand-shield">🛡️</span>
            <div>
              <h1>PD Bloqueios</h1>
              <span className="header-user">
                Agente: <strong>{user.usuario}</strong>
              </span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className={`sync-badge ${syncStatus}`}>
            <span className="sync-dot" />
            <span className="sync-label">
              {syncStatus === 'syncing' ? 'Sincronizando...' :
               syncStatus === 'online' ? 'Online' : 
               syncStatus === 'loading' ? 'Carregando...' : 'Offline'}
            </span>
          </div>

          <button className="btn-logout" onClick={onLogout}>
            <span>Sair</span>
            <span>🚪</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="dash-main">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon stat-total">📋</div>
            <div className="stat-body">
              <h2>{stats.total}</h2>
              <p>Total Veículos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-blocked">🔒</div>
            <div className="stat-body">
              <h2>{stats.bloqueados}</h2>
              <p>Bloqueados</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-sync">🔄</div>
            <div className="stat-body">
              <h2>{syncTimeStr}</h2>
              <p>Última Sincronia</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por placa, chassi ou modelo..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {/* Results info */}
        {query && (
          <div className="results-info">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "<strong>{query}</strong>"
          </div>
        )}

        {/* Vehicles Grid */}
        <div className="vehicles-grid">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🚗</div>
              <h3>{syncing ? 'Carregando veículos...' : 'Nenhum veículo encontrado'}</h3>
              <p>
                {syncing
                  ? 'Aguarde a sincronização dos dados.'
                  : query
                    ? 'Sua busca não retornou resultados.'
                    : 'Não há veículos bloqueados para exibir.'}
              </p>
            </div>
          ) : (
            filtered.map(v => <VehicleCard key={v.id} vehicle={v} />)
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* FAB — Sync Button */}
      <button
        id="fab-sync"
        className={`fab-sync${syncing ? ' fab-syncing' : ''}`}
        onClick={sync}
        disabled={syncing}
        title="Atualizar dados"
        aria-label="Sincronizar dados"
      >
        <span className="fab-icon">🔄</span>
        <span className="fab-label">{syncing ? 'Atualizando...' : 'Atualizar'}</span>
      </button>
    </section>
  );
}
