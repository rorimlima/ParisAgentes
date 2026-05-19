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
  welcomeUser: $('#welcomeUser'),
  loginThemeBtn: $('#loginThemeBtn'),
  dashThemeBtn: $('#dashThemeBtn'),
  themeColorMeta: $('#themeColorMeta')
};

// ─── Initialize App ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  registerServiceWorker();
  initSupabase();
  initTheme();
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

// ─── THEME ───────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('pd_theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
  const icon = theme === 'light' ? '🌙' : '☀️';
  if (DOM.loginThemeBtn) DOM.loginThemeBtn.textContent = icon;
  if (DOM.dashThemeBtn)  DOM.dashThemeBtn.textContent  = icon;

  // Update meta theme-color for PWA
  const metaColor = theme === 'light' ? '#FAF7F2' : '#080C10';
  if (DOM.themeColorMeta) DOM.themeColorMeta.setAttribute('content', metaColor);

  localStorage.setItem('pd_theme', theme);
}

function toggleTheme() {
  const current = localStorage.getItem('pd_theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function bindEvents() {
  DOM.loginForm.addEventListener('submit', handleLogin);
  DOM.btnLogout.addEventListener('click', handleLogout);
  DOM.searchInput.addEventListener('input', handleSearch);

  // Theme toggles
  if (DOM.loginThemeBtn) DOM.loginThemeBtn.addEventListener('click', toggleTheme);
  if (DOM.dashThemeBtn)  DOM.dashThemeBtn.addEventListener('click', toggleTheme);

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

// ─── SHA-256 Hash ───────────────────────────────────────────
async function sha256(message) {
  // Web Crypto API (works on HTTPS / localhost)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('[SHA256] crypto.subtle failed, using fallback:', e);
    }
  }

  // Pure JS SHA-256 fallback (for file:// or insecure contexts)
  function rightRotate(val, amt) {
    return (val >>> amt) | (val << (32 - amt));
  }

  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  // Pre-processing: convert to bytes, pad
  const bytes = [];
  for (let i = 0; i < message.length; i++) {
    bytes.push(message.charCodeAt(i));
  }
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);

  // Append bit length as 64-bit big-endian
  const bitLen = message.length * 8;
  for (let i = 56; i >= 0; i -= 8) {
    bytes.push((bitLen / Math.pow(2, i)) & 0xff);
  }

  // Process each 512-bit (64-byte) block
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const W = new Array(64);
    for (let t = 0; t < 16; t++) {
      W[t] = (bytes[offset + t * 4] << 24) | (bytes[offset + t * 4 + 1] << 16) |
             (bytes[offset + t * 4 + 2] << 8) | bytes[offset + t * 4 + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(W[t-15], 7) ^ rightRotate(W[t-15], 18) ^ (W[t-15] >>> 3);
      const s1 = rightRotate(W[t-2], 17) ^ rightRotate(W[t-2], 19) ^ (W[t-2] >>> 10);
      W[t] = (W[t-16] + s0 + W[t-7] + s1) | 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    H0 = (H0 + a) | 0; H1 = (H1 + b) | 0; H2 = (H2 + c) | 0; H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0; H5 = (H5 + f) | 0; H6 = (H6 + g) | 0; H7 = (H7 + h) | 0;
  }

  return [H0, H1, H2, H3, H4, H5, H6, H7]
    .map(v => (v >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

// ─── LOGIN ──────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const usuario = DOM.userInput.value.trim().toLowerCase();
  const senha = DOM.passInput.value.trim();

  console.log('[Login] Tentativa:', usuario);

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
    // Verify supabase client is ready
    if (!supabase) {
      console.error('[Login] Supabase client not initialized!');
      showToast('Erro: cliente Supabase não inicializado. Recarregue a página.', 'error');
      setLoginLoading(false);
      return;
    }

    const senhaHash = await sha256(senha);
    console.log('[Login] Hash gerado:', senhaHash.substring(0, 16) + '...');

    // Fetch user by nome and sobrenome
    console.log('[Login] Buscando:', nome, sobrenome);
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome, sobrenome, departamento, ativo, senha_hash')
      .eq('nome', nome)
      .eq('sobrenome', sobrenome)
      .maybeSingle();

    console.log('[Login] Resposta Supabase:', { data: data ? 'encontrado' : 'null', error });

    if (error) {
      console.error('[Login] Supabase query error:', error);
      showToast('Erro na consulta: ' + (error.message || 'desconhecido'), 'error');
      setLoginLoading(false);
      return;
    }

    if (!data) {
      showToast('Usuário não cadastrado', 'error');
      setLoginLoading(false);
      return;
    }

    console.log('[Login] Ativo:', data.ativo, '| Hash match:', data.senha_hash === senhaHash);

    // Verify hash
    if (data.senha_hash !== senhaHash) {
      showToast('Senha incorreta', 'error');
      setLoginLoading(false);
      return;
    }

    // Verify ativo status (could be integer 1 or boolean true)
    const isAtivo = data.ativo === 1 || data.ativo === true || String(data.ativo) === "1" || String(data.ativo) === "true";
    if (!isAtivo) {
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
    console.log('[Login] Sucesso! Usuário:', currentUser.usuario);
    showDashboard();
  } catch (err) {
    console.error('[Login] Erro inesperado:', err);
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
