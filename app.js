// ============================================================
// app.js — Main Application Logic
// Login, Supabase sync, SQLite rendering, PWA lifecycle
// ============================================================

const SUPABASE_URL = 'https://jjjvieragarzplulikbv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqanZpZXJhZ2FyenBsdWxpa2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzYyMzAsImV4cCI6MjA5NDY1MjIzMH0.y5cdFZuk9GiFVGSaSQcoIpT0CaGdNoJsbmSFePb0OWc';

let supabase = null;
let currentUser = null;
let searchTimeout = null;

// ─── DOM References ─────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  loginScreen: $('#loginScreen'),
  dashboardScreen: $('#dashboardScreen'),
  loginForm: $('#loginForm'),
  userInput: $('#userInput'),
  passInput: $('#passInput'),
  btnLogin: $('#btnLogin'),
  btnLoginText: $('#btnLoginText'),
  searchInput: $('#searchInput'),
  vehiclesGrid: $('#vehiclesGrid'),
  statTotal: $('#statTotal'),
  statBlocked: $('#statBlocked'),
  statSync: $('#statSync'),
  syncDot: $('#syncDot'),
  syncText: $('#syncText'),
  btnLogout: $('#btnLogout'),
  loadingOverlay: $('#loadingOverlay'),
  loadingText: $('#loadingText'),
  toastContainer: $('#toastContainer'),
  welcomeUser: $('#welcomeUser')
};

// ─── Initialize App ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  registerServiceWorker();
  initSupabase();
  bindEvents();
  checkSession();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('[App] SW registered:', reg.scope))
      .catch((err) => console.warn('[App] SW registration failed:', err));
  } else {
    console.log('[App] SW skipped (file:// protocol or not supported)');
  }
}

function initSupabase() {
  try {
    const { createClient } = window.supabase;
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[App] Supabase initialized');
  } catch (err) {
    console.warn('[App] Supabase init failed (offline mode):', err);
  }
}

function bindEvents() {
  DOM.loginForm.addEventListener('submit', handleLogin);
  DOM.btnLogout.addEventListener('click', handleLogout);
  DOM.searchInput.addEventListener('input', handleSearch);

  // Network status listener
  window.addEventListener('online', () => {
    updateSyncStatus('online');
    syncFromSupabase();
  });
  window.addEventListener('offline', () => updateSyncStatus('offline'));
}

function checkSession() {
  const saved = localStorage.getItem('pd_agent_session');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      showDashboard();
    } catch {
      localStorage.removeItem('pd_agent_session');
    }
  }
}

// ─── SHA-256 Hash (Pure JS — works on file:// protocol) ─────
async function sha256(message) {
  // Try Web Crypto API first (HTTPS/localhost)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { /* fallback below */ }
  }
  // Pure JS SHA-256 fallback for file:// or insecure contexts
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const k = [];
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
      h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const words = [];
  const asciiBitLength = message.length * 8;
  let i, j, isComposite;
  // Generate k values
  let primeCounter = 0;
  for (let candidate = 2; primeCounter < 64; candidate++) {
    isComposite = false;
    for (let factor = 2; factor * factor <= candidate; factor++) {
      if (candidate % factor === 0) { isComposite = true; break; }
    }
    if (!isComposite) {
      if (primeCounter < 8) {
        const h = mathPow(candidate, 0.5);
        [h0,h1,h2,h3,h4,h5,h6,h7][primeCounter] = (h - Math.floor(h)) * maxWord | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1/3) - Math.floor(mathPow(candidate, 1/3))) * maxWord | 0;
      primeCounter++;
    }
  }
  message += '\x80';
  while (message.length % 64 - 56) message += '\x00';
  for (i = 0; i < message.length; i++) {
    j = message.charCodeAt(i);
    if (j >> 8) return; // ASCII only
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      if (i >= 16) {
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      const S1 = rightRotate(h4, 6) ^ rightRotate(h4, 11) ^ rightRotate(h4, 25);
      const ch = (h4 & h5) ^ (~h4 & h6);
      const temp1 = (h7 + S1 + ch + k[i] + w[i]) | 0;
      const S0 = rightRotate(h0, 2) ^ rightRotate(h0, 13) ^ rightRotate(h0, 22);
      const maj = (h0 & h1) ^ (h0 & h2) ^ (h1 & h2);
      const temp2 = (S0 + maj) | 0;
      h7 = h6; h6 = h5; h5 = h4; h4 = (h3 + temp1) | 0;
      h3 = h2; h2 = h1; h1 = h0; h0 = (temp1 + temp2) | 0;
    }
    h0 = (h0 + oldHash[0]) | 0; h1 = (h1 + oldHash[1]) | 0;
    h2 = (h2 + oldHash[2]) | 0; h3 = (h3 + oldHash[3]) | 0;
    h4 = (h4 + oldHash[4]) | 0; h5 = (h5 + oldHash[5]) | 0;
    h6 = (h6 + oldHash[6]) | 0; h7 = (h7 + oldHash[7]) | 0;
  }
  for (const val of [h0, h1, h2, h3, h4, h5, h6, h7]) {
    result += (val >>> 0).toString(16).padStart(8, '0');
  }
  return result;
}

// ─── LOGIN ──────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const usuario = DOM.userInput.value.trim().toLowerCase();
  const senha = DOM.passInput.value.trim();

  if (!usuario || !senha) {
    showToast('Preencha todos os campos', 'error');
    return;
  }

  // Parse nome.sobrenome format
  const parts = usuario.split('.');
  if (parts.length < 2) {
    showToast('Use o formato nome.sobrenome', 'error');
    return;
  }
  const nome = parts[0];
  const sobrenome = parts.slice(1).join('.');

  setLoginLoading(true);

  // Check connectivity
  if (!navigator.onLine) {
    const cached = localStorage.getItem('pd_agent_session');
    if (cached) {
      const data = JSON.parse(cached);
      if (data.usuario === usuario) {
        currentUser = data;
        showDashboard();
        setLoginLoading(false);
        return;
      }
    }
    showToast('Sem conexão. Faça login online primeiro.', 'error');
    setLoginLoading(false);
    return;
  }

  try {
    const senhaHash = await sha256(senha);

    // Fetch user by nome and sobrenome only, to verify hash and ativo in JS
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome, sobrenome, departamento, ativo, senha_hash')
      .eq('nome', nome)
      .eq('sobrenome', sobrenome)
      .maybeSingle();

    if (error) {
      console.error('[App] Supabase login query error:', error);
      throw error;
    }

    if (!data) {
      showToast('Usuário não cadastrado', 'error');
      setLoginLoading(false);
      return;
    }

    // Verify hash
    if (data.senha_hash !== senhaHash) {
      showToast('Senha incorreta', 'error');
      setLoginLoading(false);
      return;
    }

    // Verify ativo status (could be integer 1 or boolean true)
    if (data.ativo !== 1 && data.ativo !== true && String(data.ativo) !== "1" && String(data.ativo) !== "true") {
      showToast('Usuário inativo', 'error');
      setLoginLoading(false);
      return;
    }

    currentUser = {
      id: data.id,
      usuario: `${data.nome}.${data.sobrenome}`,
      departamento: data.departamento
    };
    localStorage.setItem('pd_agent_session', JSON.stringify(currentUser));
    showDashboard();
  } catch (err) {
    console.error('[App] Login error:', err);
    showToast('Erro ao conectar. Tente novamente.', 'error');
  }

  setLoginLoading(false);
}

function setLoginLoading(loading) {
  DOM.btnLogin.disabled = loading;
  DOM.btnLoginText.innerHTML = loading
    ? '<span class="spinner"></span> Autenticando...'
    : 'Entrar';
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('pd_agent_session');
  DOM.loginScreen.classList.add('active');
  DOM.dashboardScreen.classList.remove('active');
  DOM.userInput.value = '';
  DOM.passInput.value = '';
}

// ─── DASHBOARD ──────────────────────────────────────────────
async function showDashboard() {
  DOM.loginScreen.classList.remove('active');
  DOM.dashboardScreen.classList.add('active');
  if (DOM.welcomeUser) DOM.welcomeUser.textContent = currentUser.usuario;

  showLoading('Inicializando banco de dados...');

  try {
    await offlineDB.init();
    hideLoading();

    // Render from local SQLite immediately
    renderVehicles(offlineDB.getAllVeiculos());
    updateStats();

    // Then sync in background
    if (navigator.onLine) {
      syncFromSupabase();
    } else {
      updateSyncStatus('offline');
    }
  } catch (err) {
    console.error('[App] DB init error:', err);
    hideLoading();
    showToast('Erro ao inicializar banco local', 'error');
  }
}

// ─── SYNC ───────────────────────────────────────────────────
async function syncFromSupabase() {
  if (!supabase || !navigator.onLine) return;

  updateSyncStatus('syncing');

  try {
    const { data, error } = await supabase
      .from('veiculos_bloqueados')
      .select('id, chassi, placa, modelo_descricao, cor, ano_modelo, razao_social, status_financeiro, status_documentacao, status_final, bloqueado_em, removido_em')
      .is('removido_em', null)
      .order('bloqueado_em', { ascending: false });

    if (error) throw error;

    await offlineDB.upsertVeiculos(data || []);

    // Re-render with fresh data
    const query = DOM.searchInput.value.trim();
    if (query) {
      renderVehicles(offlineDB.searchVeiculos(query));
    } else {
      renderVehicles(offlineDB.getAllVeiculos());
    }
    updateStats();
    updateSyncStatus('online');
    showToast('Dados sincronizados', 'success');
  } catch (err) {
    console.error('[App] Sync error:', err);
    updateSyncStatus('offline');
    showToast('Falha na sincronização', 'error');
  }
}

function updateSyncStatus(status) {
  const dot = DOM.syncDot;
  const text = DOM.syncText;

  dot.className = 'sync-dot';
  switch (status) {
    case 'online':
      dot.classList.add('online');
      text.textContent = 'Online';
      break;
    case 'offline':
      dot.classList.add('offline');
      text.textContent = 'Offline';
      break;
    case 'syncing':
      dot.classList.add('syncing');
      text.textContent = 'Sincronizando...';
      break;
  }
}

function updateStats() {
  const veiculos = offlineDB.getAllVeiculos();
  const total = veiculos.length;
  const bloqueados = veiculos.filter(v =>
    v.status && (v.status.toLowerCase().includes('bloqueio') || v.status.toLowerCase().includes('bloqueado'))
  ).length;
  const lastSync = offlineDB.getLastSync();

  DOM.statTotal.textContent = total;
  DOM.statBlocked.textContent = bloqueados;
  DOM.statSync.textContent = lastSync
    ? new Date(lastSync + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
}

// ─── SEARCH ─────────────────────────────────────────────────
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const query = DOM.searchInput.value.trim();
    const results = query
      ? offlineDB.searchVeiculos(query)
      : offlineDB.getAllVeiculos();
    renderVehicles(results);
  }, 250);
}

// ─── RENDER ─────────────────────────────────────────────────
function renderVehicles(veiculos) {
  if (!veiculos || veiculos.length === 0) {
    DOM.vehiclesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚗</div>
        <h3>Nenhum veículo encontrado</h3>
        <p>Não há veículos bloqueados para exibir ou sua busca não retornou resultados.</p>
      </div>`;
    return;
  }

  DOM.vehiclesGrid.innerHTML = veiculos.map((v) => {
    const statusLabel = formatStatus(v.status);
    const statusClass = getStatusClass(v.status);
    const dataFormatted = formatDate(v.data_bloqueio);

    return `
      <div class="vehicle-card">
        <div class="vehicle-header">
          <span class="vehicle-placa">${escapeHtml(v.placa || 'N/A')}</span>
          <span class="vehicle-status ${statusClass}">${statusLabel}</span>
        </div>
        <div class="vehicle-details">
          <div class="vehicle-detail">
            <span class="detail-label">Modelo</span>
            <span class="detail-value">${escapeHtml(v.modelo || '—')}</span>
          </div>
          <div class="vehicle-detail">
            <span class="detail-label">Chassi</span>
            <span class="detail-value">${escapeHtml(v.chassi || '—')}</span>
          </div>
          ${v.cor ? `<div class="vehicle-detail">
            <span class="detail-label">Cor</span>
            <span class="detail-value">${escapeHtml(v.cor)}</span>
          </div>` : ''}
          ${v.razao_social ? `<div class="vehicle-detail">
            <span class="detail-label">Cliente</span>
            <span class="detail-value">${escapeHtml(v.razao_social)}</span>
          </div>` : ''}
          <div class="vehicle-detail">
            <span class="detail-label">Bloqueio</span>
            <span class="detail-value">${dataFormatted}</span>
          </div>
          ${v.status_financeiro || v.status_documentacao ? `<div class="vehicle-detail">
            <span class="detail-label">Financeiro</span>
            <span class="detail-value">${escapeHtml(v.status_financeiro || '—')}</span>
          </div>
          <div class="vehicle-detail">
            <span class="detail-label">Documentação</span>
            <span class="detail-value">${escapeHtml(v.status_documentacao || '—')}</span>
          </div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function getStatusClass(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s.includes('duplo') || s.includes('total')) return 'total';
  return 'blocked';
}

function formatStatus(status) {
  if (!status) return 'Bloqueado';
  const s = status.toLowerCase();
  if (s.includes('duplo')) return '🔒🔒 Duplo Bloqueio';
  if (s.includes('total')) return '🔒 Bloqueio Total';
  if (s.includes('financ')) return '💰 Financeiro';
  if (s.includes('doc')) return '📄 Documentação';
  if (s.includes('bloqueado') || s.includes('bloqueio')) return '🔒 ' + status;
  return status;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── TOAST ──────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fadeOut');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── LOADING OVERLAY ────────────────────────────────────────
function showLoading(text = 'Carregando...') {
  DOM.loadingText.textContent = text;
  DOM.loadingOverlay.classList.add('active');
}

function hideLoading() {
  DOM.loadingOverlay.classList.remove('active');
}
