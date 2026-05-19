// ============================================================
// db.js — SQLite (sql.js) + IndexedDB Persistence Layer
// Offline-First Database Manager
// ============================================================

const DB_CONFIG = {
  IDB_NAME: 'ParisDakarAgente',
  IDB_STORE: 'sqlitedb',
  IDB_KEY: 'main',
  SQL_JS_CDN: 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm'
};

class OfflineDB {
  constructor() {
    this.db = null;
    this.SQL = null;
    this._ready = null;
  }

  // ─── Initialize sql.js and restore from IndexedDB ─────────
  async init() {
    if (this._ready) return this._ready;

    this._ready = (async () => {
      try {
        // Load sql.js WASM
        this.SQL = await initSqlJs({
          locateFile: () => DB_CONFIG.SQL_JS_CDN
        });

        // Try to restore from IndexedDB
        const savedData = await this._loadFromIDB();
        if (savedData) {
          this.db = new this.SQL.Database(new Uint8Array(savedData));
          console.log('[DB] Restored database from IndexedDB');
        } else {
          this.db = new this.SQL.Database();
          console.log('[DB] Created new database');
        }

        // Ensure tables exist
        this._createTables();
        return true;
      } catch (err) {
        console.error('[DB] Initialization error:', err);
        throw err;
      }
    })();

    return this._ready;
  }

  // ─── Create schema ────────────────────────────────────────
  _createTables() {
    // Migration: Drop and recreate table if schema is outdated
    try {
      const info = this.db.exec("PRAGMA table_info(veiculos_bloqueados)");
      if (info.length > 0) {
        const columns = info[0].values.map(col => col[1]);
        const idColumn = info[0].values.find(col => col[1] === 'id');
        const needsMigration = 
          (idColumn && idColumn[2].toUpperCase() === 'INTEGER') ||
          !columns.includes('cor') ||
          !columns.includes('razao_social') ||
          !columns.includes('status_financeiro');
        
        if (needsMigration) {
          console.log('[DB] Migrating local veiculos_bloqueados table to new schema...');
          this.db.run("DROP TABLE veiculos_bloqueados");
        }
      }
    } catch (e) {
      console.warn('[DB] Migration check failed:', e);
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS veiculos_bloqueados (
        id TEXT PRIMARY KEY,
        placa TEXT,
        modelo TEXT,
        chassi TEXT,
        cor TEXT,
        razao_social TEXT,
        status TEXT,
        status_financeiro TEXT,
        status_documentacao TEXT,
        data_bloqueio TEXT,
        synced_at TEXT DEFAULT (datetime('now'))
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  // ─── IndexedDB Read ───────────────────────────────────────
  _loadFromIDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.IDB_NAME, 1);

      request.onupgradeneeded = (e) => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains(DB_CONFIG.IDB_STORE)) {
          idb.createObjectStore(DB_CONFIG.IDB_STORE);
        }
      };

      request.onsuccess = (e) => {
        const idb = e.target.result;
        const tx = idb.transaction(DB_CONFIG.IDB_STORE, 'readonly');
        const store = tx.objectStore(DB_CONFIG.IDB_STORE);
        const getReq = store.get(DB_CONFIG.IDB_KEY);

        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };

      request.onerror = () => resolve(null);
    });
  }

  // ─── IndexedDB Write ──────────────────────────────────────
  async _saveToIDB() {
    const data = this.db.export();
    const buffer = data.buffer;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.IDB_NAME, 1);

      request.onupgradeneeded = (e) => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains(DB_CONFIG.IDB_STORE)) {
          idb.createObjectStore(DB_CONFIG.IDB_STORE);
        }
      };

      request.onsuccess = (e) => {
        const idb = e.target.result;
        const tx = idb.transaction(DB_CONFIG.IDB_STORE, 'readwrite');
        const store = tx.objectStore(DB_CONFIG.IDB_STORE);
        store.put(buffer, DB_CONFIG.IDB_KEY);

        tx.oncomplete = () => {
          console.log('[DB] Saved to IndexedDB');
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ─── Upsert veículos from Supabase data ───────────────────
  async upsertVeiculos(veiculos) {
    if (!veiculos || veiculos.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO veiculos_bloqueados 
        (id, placa, modelo, chassi, cor, razao_social, status, status_financeiro, status_documentacao, data_bloqueio, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    // Get IDs from server to detect deletions
    const serverIds = new Set(veiculos.map(v => v.id));

    // Delete records that no longer exist on server
    const localIds = this.db.exec("SELECT id FROM veiculos_bloqueados");
    if (localIds.length > 0) {
      localIds[0].values.forEach(([localId]) => {
        if (!serverIds.has(localId)) {
          this.db.run("DELETE FROM veiculos_bloqueados WHERE id = ?", [localId]);
        }
      });
    }

    // Upsert all current records
    veiculos.forEach((v) => {
      stmt.run([
        v.id,
        v.placa || '',
        v.modelo_descricao || '',
        v.chassi || '',
        v.cor || '',
        v.razao_social || '',
        v.status_final || '',
        v.status_financeiro || '',
        v.status_documentacao || '',
        v.bloqueado_em || ''
      ]);
    });
    stmt.free();

    // Update sync timestamp
    this.db.run(`
      INSERT OR REPLACE INTO sync_meta (key, value) 
      VALUES ('last_sync', datetime('now'))
    `);

    // Persist to IndexedDB
    await this._saveToIDB();
    console.log(`[DB] Upserted ${veiculos.length} veículos`);
  }

  // ─── Get all veículos ─────────────────────────────────────
  getAllVeiculos() {
    try {
      const result = this.db.exec(`
        SELECT id, placa, modelo, chassi, cor, razao_social, status, status_financeiro, status_documentacao, data_bloqueio, synced_at
        FROM veiculos_bloqueados
        ORDER BY data_bloqueio DESC
      `);

      if (!result.length) return [];

      return result[0].values.map((row) => ({
        id: row[0],
        placa: row[1],
        modelo: row[2],
        chassi: row[3],
        cor: row[4],
        razao_social: row[5],
        status: row[6],
        status_financeiro: row[7],
        status_documentacao: row[8],
        data_bloqueio: row[9],
        synced_at: row[10]
      }));
    } catch (err) {
      console.error('[DB] Error reading veículos:', err);
      return [];
    }
  }

  // ─── Search veículos by placa or chassi ────────────────────
  searchVeiculos(query) {
    if (!query || query.trim() === '') return this.getAllVeiculos();

    const q = `%${query.toUpperCase().trim()}%`;
    try {
      const result = this.db.exec(`
        SELECT id, placa, modelo, chassi, cor, razao_social, status, status_financeiro, status_documentacao, data_bloqueio, synced_at
        FROM veiculos_bloqueados
        WHERE UPPER(placa) LIKE ? OR UPPER(chassi) LIKE ? OR UPPER(modelo) LIKE ? OR UPPER(razao_social) LIKE ?
        ORDER BY data_bloqueio DESC
      `, [q, q, q, q]);

      if (!result.length) return [];

      return result[0].values.map((row) => ({
        id: row[0],
        placa: row[1],
        modelo: row[2],
        chassi: row[3],
        cor: row[4],
        razao_social: row[5],
        status: row[6],
        status_financeiro: row[7],
        status_documentacao: row[8],
        data_bloqueio: row[9],
        synced_at: row[10]
      }));
    } catch (err) {
      console.error('[DB] Search error:', err);
      return [];
    }
  }

  // ─── Get last sync time ───────────────────────────────────
  getLastSync() {
    try {
      const result = this.db.exec(
        "SELECT value FROM sync_meta WHERE key = 'last_sync'"
      );
      return result.length ? result[0].values[0][0] : null;
    } catch {
      return null;
    }
  }

  // ─── Get total count ──────────────────────────────────────
  getCount() {
    try {
      const result = this.db.exec("SELECT COUNT(*) FROM veiculos_bloqueados");
      return result.length ? result[0].values[0][0] : 0;
    } catch {
      return 0;
    }
  }
}

// Export singleton
const offlineDB = new OfflineDB();
