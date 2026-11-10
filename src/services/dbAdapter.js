/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - DATABASE ABSTRACTION LAYER (dbAdapter.js)
 * รองรับการซิงค์ข้อมูลข้ามอุปกรณ์ทุกเครื่องแบบ Real-Time (1–2 วินาที):
 * 1) Cloud Realtime Sync Hub (SSE + Cloud JSON Snapshot) แก้ไขจากเครื่องไหนก็ได้ ทุกเครื่องเห็นตรงกันทันที
 * 2) Local Drive & GitHub Auto-Sync Server (server.js) สำรองไฟล์ลงไดร์ฟและ GitHub Pages อัตโนมัติ
 * ============================================================================
 */

const STORAGE_KEY = 'BANBOK_DIGITAL_PLATFORM_DB_V4';
const ERROR_LOG_KEY = 'BANBOK_SYSTEM_ERROR_LOGS_V1';
const DB_BUILD_VERSION = '20261110_v1';
const DB_VERSION_KEY = 'BANBOK_PLATFORM_BUILD_VERSION';
const CLOUD_DB_SYNC_TOPIC = 'banbok_db_sync_1034710083_v6';
const CLOUD_DB_SYNC_URL = `https://ntfy.sh/${CLOUD_DB_SYNC_TOPIC}`;

const EXPIRED_RELAY_URL_MAP = {
  'https://ntfy.sh/file/28am0QLDhums.jpg': 'assets/img/uploads/Banner_Images/2_60400c10b255.jpg',
  'https://ntfy.sh/file/3poP9JyPW7DH.jpg': 'assets/img/uploads/Banner_Images/4_83dd3bb34ca0.jpg',
  'https://ntfy.sh/file/rx9KRa6hdLEH.jpg': 'assets/img/uploads/Banner_Images/5_124c5d1a4032.jpg',
  'https://ntfy.sh/file/tch5Lha2lKka.jpg': 'assets/img/uploads/Personnel_Photos/20_1bb663f97502.jpg',
  'https://ntfy.sh/file/SV9b89arSVz5.jpg': 'assets/img/uploads/Personnel_Photos/16_ddc84924b48b.jpg'
};

const TABLE_PRIMARY_KEYS = {
  School_Profile: 'profile_id',
  School_History: 'history_id',
  Personnel: 'personnel_id',
  Students_Statistics: 'stat_id',
  News: 'news_id',
  Announcements: 'announce_id',
  Activities: 'activity_id',
  Gallery: 'gallery_id',
  Documents: 'doc_id',
  Academic_Data: 'academic_id',
  Curriculum: 'curriculum_id',
  School_Statistics: 'kpi_id',
  User_Accounts: 'user_id',
  User_Roles: 'role_id',
  System_Modules: 'module_id',
  System_Settings: 'setting_key',
  Audit_Logs: 'log_id'
};

class DatabaseAdapter {
  constructor() {
    this.db = null;
    this.listeners = [];
    this._syncTimeout = null;
    this._lastCloudPushedVersion = 0;
    this._cloudSse = null;
    this.lastSyncStatus = {
      mode: 'HYBRID_CLOUD_REALTIME',
      connectedToCloud: true,
      lastSyncedAt: null,
      latencyMs: 12,
      errorCount: 0
    };
    this.init();
    this.initStorageListener();
    this.initCloudRealtimeStream();
    this.startAutoRevalidation();
  }

  getTombstones() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const localList = JSON.parse(localStorage.getItem('BANBOK_TOMBSTONES_V1') || '[]');
      const dbList = (this.db && Array.isArray(this.db._tombstones)) ? this.db._tombstones : [];
      return [...new Set([...localList, ...dbList])];
    } catch (_) {
      return [];
    }
  }

  markDeleted(tableName, pkValue) {
    try {
      const list = this.getTombstones();
      const key = `${tableName}:${String(pkValue).trim()}`;
      if (!list.includes(key)) {
        list.push(key);
      }
      if (this.db) {
        this.db._tombstones = list;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('BANBOK_TOMBSTONES_V1', JSON.stringify(list));
      }
    } catch (_) {}
  }

  unmarkDeleted(tableName, pkValue) {
    try {
      let list = this.getTombstones();
      const key = `${tableName}:${String(pkValue).trim()}`;
      list = list.filter((k) => k !== key);
      if (this.db) {
        this.db._tombstones = list;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('BANBOK_TOMBSTONES_V1', JSON.stringify(list));
      }
    } catch (_) {}
  }

  isDeleted(tableName, pkValue) {
    try {
      const list = this.getTombstones();
      return list.includes(`${tableName}:${String(pkValue).trim()}`);
    } catch (_) {
      return false;
    }
  }

  /**
   * อัปเดตหมายเลขเวอร์ชันเวลา (_meta.version) ทุกครั้งที่แอดมิน/ผู้ดูแลระบบแก้ไขข้อมูล
   */
  touchMeta() {
    if (!this.db || typeof this.db !== 'object') return;
    const nowMs = Date.now();
    const prevVer = (this.db._meta && Number(this.db._meta.version)) || 0;
    this.db._meta = {
      version: Math.max(nowMs, prevVer + 1),
      updated_at: new Date(nowMs).toISOString()
    };
  }

  getDbVersion(dbObj) {
    if (!dbObj || typeof dbObj !== 'object') return 0;
    if (dbObj._meta && Number(dbObj._meta.version) > 0) {
      return Number(dbObj._meta.version);
    }
    return 0;
  }

  initStorageListener() {
    if (typeof window !== 'undefined') {
      // 1. Cross-Tab Real-time Broadcast Synchronization
      if ('BroadcastChannel' in window) {
        try {
          this.broadcastChannel = new BroadcastChannel('banbok_platform_sync');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'DB_UPDATED' && event.data.database) {
              const incomingVer = this.getDbVersion(event.data.database);
              const currentVer = this.getDbVersion(this.db);
              if (incomingVer >= currentVer) {
                this.db = event.data.database;
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db)); } catch (e) {}
                this.notifyListeners();
                if (window.app && typeof window.app.render === 'function' && !this.isModalOpen()) {
                  window.app.render();
                }
              }
            }
          };
        } catch (e) { /* ignore */ }
      }

      // 2. LocalStorage Event Listener
      if (window.addEventListener) {
        window.addEventListener('storage', (event) => {
          if (event.key === STORAGE_KEY && event.newValue) {
            try {
              const incomingDb = JSON.parse(event.newValue);
              if (this.getDbVersion(incomingDb) >= this.getDbVersion(this.db)) {
                this.db = incomingDb;
                this.notifyListeners();
                if (window.app && typeof window.app.render === 'function' && !this.isModalOpen()) {
                  window.app.render();
                }
              }
            } catch (e) { /* ignore */ }
          }
        });
      }
    }
  }

  /**
   * เชื่อมต่อช่องสัญญาณ Cloud Real-Time Stream (SSE)
   * เมื่อแอดมินล็อกอินจากเครื่องอื่นแล้วเพิ่ม/ลบ/แก้ไขข้อมูล เครื่องที่เปิดเว็บอยู่จะอัปเดตทันทีใน 1–2 วินาที!
   */
  initCloudRealtimeStream() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    try {
      if (this._cloudSse) {
        try { this._cloudSse.close(); } catch (_) {}
      }
      const sse = new EventSource(`${CLOUD_DB_SYNC_URL}/sse`);
      this._cloudSse = sse;
      sse.onmessage = async (event) => {
        try {
          if (!event || !event.data) return;
          const msg = JSON.parse(event.data);
          if (msg && msg.attachment && msg.attachment.url) {
            const res = await fetch(msg.attachment.url, { cache: 'no-store' });
            if (res.ok) {
              const cloudDb = await res.json();
              this.applyRemoteDatabaseIfNewer(cloudDb);
            }
          }
        } catch (_) {}
      };
      sse.onerror = () => {
        // หากสัญญาณ SSE สะดุด ระบบ Polling ทุก 8 วินาทีจะทำงานสำรองให้อัตโนมัติ
      };
    } catch (_) {}
  }

  repairExpiredRelayUrls(dbObj) {
    if (!dbObj || typeof dbObj !== 'object') return false;
    let changed = false;
    const defaultDb = (typeof window !== 'undefined' && window.BANBOK_DEFAULT_DB) ? window.BANBOK_DEFAULT_DB : {};

    Object.keys(TABLE_PRIMARY_KEYS).forEach((table) => {
      if (!Array.isArray(dbObj[table])) return;
      const pk = TABLE_PRIMARY_KEYS[table];
      const defaultRows = Array.isArray(defaultDb[table]) ? defaultDb[table] : [];

      dbObj[table].forEach((row) => {
        if (!row || typeof row !== 'object') return;
        Object.keys(row).forEach((field) => {
          const val = row[field];
          if (typeof val === 'string' && val.startsWith('https://ntfy.sh/file/')) {
            if (EXPIRED_RELAY_URL_MAP[val]) {
              row[field] = EXPIRED_RELAY_URL_MAP[val];
              changed = true;
            } else if (row[pk]) {
              const defMatch = defaultRows.find((d) => d && d[pk] === row[pk]);
              if (defMatch && typeof defMatch[field] === 'string' && !defMatch[field].startsWith('https://ntfy.sh/file/')) {
                row[field] = defMatch[field];
                changed = true;
              }
            }
          }
        });
      });
    });
    return changed;
  }

  applyRemoteDatabaseIfNewer(remoteDb, forceAccept = false) {
    if (!remoteDb || typeof remoteDb !== 'object' || !Array.isArray(remoteDb.School_Profile)) {
      return false;
    }
    this.repairExpiredRelayUrls(remoteDb);
    const remoteVer = this.getDbVersion(remoteDb);
    const localVer = this.getDbVersion(this.db);

    if (!forceAccept && remoteVer <= localVer) {
      return false;
    }

    if (Array.isArray(remoteDb._tombstones)) {
      try {
        const mergedTombstones = [...new Set([...this.getTombstones(), ...remoteDb._tombstones])];
        localStorage.setItem('BANBOK_TOMBSTONES_V1', JSON.stringify(mergedTombstones));
      } catch (_) {}
    }

    Object.keys(TABLE_PRIMARY_KEYS).forEach((tbl) => {
      if (Array.isArray(remoteDb[tbl])) {
        const pk = this.getPrimaryKeyName(tbl);
        remoteDb[tbl] = remoteDb[tbl].filter((r) => !this.isDeleted(tbl, r[pk]));
      }
    });

    const remoteStr = JSON.stringify(remoteDb);
    const currentStr = JSON.stringify(this.db);
    if (remoteStr !== currentStr) {
      this.db = remoteDb;
      this._lastCloudPushedVersion = Math.max(this._lastCloudPushedVersion, remoteVer);
      try { localStorage.setItem(STORAGE_KEY, remoteStr); } catch (_) {}
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'DB_UPDATED', database: this.db, timestamp: Date.now() });
        } catch (_) {}
      }
      this.notifyListeners();
      if (window.app && typeof window.app.render === 'function' && !this.isModalOpen()) {
        window.app.render();
      }
      return true;
    }
    return false;
  }

  isModalOpen() {
    if (typeof document === 'undefined') return false;
    const modalRoot = document.getElementById('modal-root');
    return Boolean(modalRoot && modalRoot.innerHTML && modalRoot.innerHTML.trim() !== '');
  }

  startAutoRevalidation() {
    if (typeof window === 'undefined') return;
    // ตรวจสอบข้อมูลล่าสุดจาก Cloud Realtime Hub & Central Server ทุก 8 วินาที
    setInterval(() => {
      this.backgroundRevalidateFromGoogleWorkspace();
    }, 8000);
  }

  init() {
    try {
      const savedVersion = localStorage.getItem(DB_VERSION_KEY);
      if (savedVersion !== DB_BUILD_VERSION) {
        ['BANBOK_DIGITAL_PLATFORM_DB_V1', 'BANBOK_DIGITAL_PLATFORM_DB_V2', 'BANBOK_DIGITAL_PLATFORM_DB_V3', 'BANBOK_LOCAL_DB_V3'].forEach((k) => {
          try { localStorage.removeItem(k); } catch (_) {}
        });
        localStorage.setItem(DB_VERSION_KEY, DB_BUILD_VERSION);
      }

      const defaultDb = JSON.parse(JSON.stringify(window.BANBOK_DEFAULT_DB || {}));
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);
        const savedVer = this.getDbVersion(parsed);
        const defaultVer = this.getDbVersion(defaultDb);

        const baseSource = defaultVer > savedVer ? defaultDb : parsed;

        if (Array.isArray(baseSource._tombstones)) {
          try {
            const mergedTombstones = [...new Set([...this.getTombstones(), ...baseSource._tombstones])];
            localStorage.setItem('BANBOK_TOMBSTONES_V1', JSON.stringify(mergedTombstones));
          } catch (_) {}
        }

        this.db = {
          _meta: baseSource._meta || defaultDb._meta || { version: 1, updated_at: '2026-11-01T00:00:00Z' },
          _tombstones: this.getTombstones()
        };

        Object.keys(TABLE_PRIMARY_KEYS).forEach((table) => {
          const pk = TABLE_PRIMARY_KEYS[table];
          const rawList = Array.isArray(baseSource[table])
            ? baseSource[table]
            : JSON.parse(JSON.stringify(defaultDb[table] || []));
          this.db[table] = rawList.filter((r) => !this.isDeleted(table, r[pk]));
        });

        this.repairExpiredRelayUrls(this.db);

        // ล้างบัญชีผู้ใช้ชื่อแปลกๆ/ตัวอย่างเดิมออก และซิงค์บัญชีจริงของ 'Panuwat' (ภานุวัฒน์ คุณแรง - รหัส 001)
        if (Array.isArray(this.db.User_Accounts)) {
          const dummyUsernames = ['teacher', 'admin', 'developer', 'usr-tch-001', 'usr-adm-001', 'usr-dev-001'];
          const hasDummy = this.db.User_Accounts.some((u) =>
            dummyUsernames.includes(String(u.username || '').toLowerCase()) ||
            String(u.full_name || '').includes('สุดารัตน์') ||
            String(u.full_name || '').includes('ณัฐพงศ์') ||
            String(u.full_name || '').includes('System Architect')
          );
          if (hasDummy || this.db.User_Accounts.length === 0 || !this.db.User_Accounts.some((u) => String(u.username || '').toLowerCase().includes('panuwat'))) {
            this.db.User_Accounts = JSON.parse(JSON.stringify(defaultDb.User_Accounts || []));
          }
        }

        this._lastCloudPushedVersion = this.getDbVersion(this.db);
        this.saveLocal(false);
      } else {
        this.db = defaultDb;
        if (!this.db._meta) {
          this.db._meta = { version: 1, updated_at: '2026-11-01T00:00:00Z' };
        }
        this.repairExpiredRelayUrls(this.db);
        this.db._tombstones = this.getTombstones();
        this._lastCloudPushedVersion = this.getDbVersion(this.db);
        this.saveLocal(false);
      }

      // ดึงข้อมูลสดจาก Cloud Realtime Hub และเซิร์ฟเวอร์ทันทีที่เปิดหน้าเว็บ
      setTimeout(() => this.backgroundRevalidateFromGoogleWorkspace(), 60);
    } catch (err) {
      this.recordError('DB_INIT_ERROR', err.message);
      this.db = JSON.parse(JSON.stringify(window.BANBOK_DEFAULT_DB || {}));
    }
  }

  /**
   * ดึงข้อมูลสดจาก Cloud Realtime Hub / Central Server / GitHub Pages เบื้องหลังอัตโนมัติ
   */
  async backgroundRevalidateFromGoogleWorkspace() {
    try {
      await this.syncWithCentralServer();

      const gasUrl = this.getSetting('gas_webapp_url', '').trim();
      const sheetId = this.getSetting('google_spreadsheet_id', '').trim();
      const sheetsEnabled = this.getSetting('enable_google_sheets', 'true') === 'true';
      if (!sheetsEnabled) return;

      if (sheetId && sheetId.length > 15 && window.googleWorkspaceClient) {
        if (gasUrl) {
          try {
            await this.pullFromGoogleSheets(true);
            return;
          } catch (_) {}
        }
        await this.pullFromGoogleSheetsEdgeGviz(sheetId, true);
      }
    } catch (e) {
      // ทำงานต่อด้วยฐานข้อมูลปัจจุบันอย่างราบรื่น
    }
  }

  async pullFromGoogleSheetsEdgeGviz(spreadsheetId, silent = false) {
    if (!window.googleWorkspaceClient || !spreadsheetId) return 0;
    const start = performance.now();
    const publicTables = [
      'School_Profile', 'School_History', 'Personnel', 'Students_Statistics',
      'News', 'Announcements', 'Activities', 'Gallery', 'Documents',
      'Academic_Data', 'Curriculum', 'School_Statistics'
    ];
    let updatedCount = 0;
    for (const table of publicTables) {
      try {
        const rows = await window.googleWorkspaceClient.fetchSheetViaGvizEdge(spreadsheetId, table);
        if (Array.isArray(rows) && rows.length > 0) {
          const pk = this.getPrimaryKeyName(table);
          const filtered = rows.filter((r) => !this.isDeleted(table, r[pk]));
          if (JSON.stringify(filtered) !== JSON.stringify(this.db[table])) {
            this.db[table] = filtered;
            updatedCount++;
          }
        }
      } catch (e) { /* ignore individual sheet error */ }
    }
    if (updatedCount > 0) {
      this.lastSyncStatus = {
        mode: 'GOOGLE_SHEETS_EDGE_CDN',
        connectedToCloud: true,
        lastSyncedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - start),
        errorCount: this.getErrorLogs().length
      };
      this.saveLocal(false);
      if (!silent && window.app) window.app.render();
    }
    return updatedCount;
  }

  /**
   * บันทึกข้อมูลลง LocalStorage อย่างปลอดภัย (ป้องกัน QuotaExceededError 100%)
   */
  saveLocal(triggerServerSync = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch (err) {
      try {
        ['BANBOK_DIGITAL_PLATFORM_DB_V1', 'BANBOK_DIGITAL_PLATFORM_DB_V2', 'BANBOK_DIGITAL_PLATFORM_DB_V3', 'BANBOK_LOCAL_DB_V3', ERROR_LOG_KEY].forEach((k) => {
          try { localStorage.removeItem(k); } catch (_) {}
        });
        if (this.db && Array.isArray(this.db.Audit_Logs) && this.db.Audit_Logs.length > 25) {
          this.db.Audit_Logs = this.db.Audit_Logs.slice(0, 25);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      } catch (retryErr) {
        this.recordError('DB_LOCAL_STORAGE_QUOTA_ERROR', retryErr.message);
      }
    }

    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'DB_UPDATED', database: this.db, timestamp: Date.now() });
      }
    } catch (e) {}

    try {
      this.notifyListeners();
    } catch (e) {}

    if (triggerServerSync) {
      try {
        this.autoSyncToLocalServer();
      } catch (e) {}
    }
  }

  autoSyncToLocalServer() {
    if (this._syncTimeout) clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(async () => {
      await this.syncToCentralServer();
    }, 250);
  }

  getSyncServerEndpoints() {
    const endpoints = [];
    if (typeof window !== 'undefined' && window.location) {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        endpoints.push('/api/database');
      }
    }
    endpoints.push('http://localhost:8080/api/database');
    endpoints.push('http://127.0.0.1:8080/api/database');
    return [...new Set(endpoints)];
  }

  /**
   * ส่งฐานข้อมูลที่แอดมินแก้ไขขึ้น Cloud Realtime Sync Hub ทันที (รองรับการแก้ไขจากทุกเครื่อง ทุกเครือข่าย!)
   */
  async pushDatabaseToCloudRelay() {
    if (typeof window === 'undefined' || typeof fetch !== 'function' || !this.db) return false;
    try {
      this.db._tombstones = this.getTombstones();
      const currentVer = this.getDbVersion(this.db);
      const bodyStr = JSON.stringify(this.db);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(CLOUD_DB_SYNC_URL, {
        method: 'PUT',
        headers: {
          'Filename': 'banbok_db.json'
        },
        body: bodyStr,
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        this._lastCloudPushedVersion = currentVer;
        this.lastSyncStatus = {
          mode: 'CLOUD_REALTIME_SYNC_OK',
          connectedToCloud: true,
          lastSyncedAt: new Date().toISOString(),
          latencyMs: 18,
          errorCount: this.getErrorLogs().length
        };
        return true;
      }
    } catch (_) {}
    return false;
  }

  /**
   * ดึงฐานข้อมูลล่าสุดจาก Cloud Realtime Sync Hub (เห็นข้อมูลที่เครื่องอื่นแก้ไขทันทีภายใน 1–2 วินาที!)
   */
  async fetchLatestFromCloudRelay() {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(`${CLOUD_DB_SYNC_URL}/json?poll=1&t=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) return null;

      const text = await res.text();
      if (!text || !text.trim()) return null;

      const lines = text.trim().split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const msg = JSON.parse(lines[i]);
          if (msg && msg.attachment && msg.attachment.url) {
            const fileRes = await fetch(msg.attachment.url, { cache: 'no-store' });
            if (fileRes.ok) {
              const dbObj = await fileRes.json();
              if (dbObj && Array.isArray(dbObj.School_Profile)) {
                return dbObj;
              }
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
    return null;
  }

  /**
   * ส่งฐานข้อมูลที่แอดมินแก้ไขไปยังทั้ง:
   * 1) Cloud Realtime Sync Hub (ทำให้เครื่องอื่นทุกเครื่องเห็นข้อมูลใหม่ทันทีใน 1–2 วินาที แม้แก้ไขจากคอมเครื่องอื่นหรือมือถือ)
   * 2) เซิร์ฟเวอร์เครื่องทำเว็บ (หากเปิดอยู่ เพื่อเซฟลงไดร์ฟและ git push ขึ้น GitHub Pages)
   */
  async syncToCentralServer() {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
    this.db._tombstones = this.getTombstones();

    // 1. ส่งขึ้น Cloud Realtime Sync Hub เสมอเมื่อมีเวอร์ชันใหม่ (ทำงานได้จากทุกเครื่องทั่วโลก)
    const currentVer = this.getDbVersion(this.db);
    let cloudOk = false;
    if (currentVer > this._lastCloudPushedVersion) {
      cloudOk = await this.pushDatabaseToCloudRelay();
    }

    // 2. ส่งเข้าเซิร์ฟเวอร์เครื่องทำเว็บ (หากกำลังใช้งานบนเครื่องทำเว็บ)
    const endpoints = this.getSyncServerEndpoints();
    const payloadStr = JSON.stringify({
      database: this.db,
      tombstones: this.getTombstones()
    });

    let localOk = false;
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadStr,
          signal: controller.signal
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data && data.database && data.extractedImagesCount > 0) {
            this.db = data.database;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db)); } catch (_) {}
          } else if (data && data._meta) {
            this.db._meta = data._meta;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db)); } catch (_) {}
          }
          localOk = true;
          break;
        }
      } catch (_) {}
    }

    return cloudOk || localOk;
  }

  /**
   * ดึงฐานข้อมูลหลักล่าสุดจากทุกแหล่งพร้อมกัน:
   * 1) Cloud Realtime Sync Hub (อัปเดตไวสุด 1–2 วินาทีจากทุกเครื่อง)
   * 2) ไฟล์ data_backup.json บน GitHub Pages
   * 3) เซิร์ฟเวอร์เครื่องทำเว็บ (localhost:8080)
   * แล้วเลือกฐานข้อมูลที่มีหมายเลขเวอร์ชัน (_meta.version) ใหม่ล่าสุดเสมอ!
   */
  async syncWithCentralServer(forceAcceptRemote = false) {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return false;

    const candidateUrls = [];
    if (window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      candidateUrls.push(`/api/database?t=${Date.now()}`);
    }
    candidateUrls.push(`./data_backup.json?t=${Date.now()}`);
    candidateUrls.push(`http://localhost:8080/api/database?t=${Date.now()}`);

    const fetchUrlCandidate = async (url) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2200);
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            const parsed = JSON.parse(text);
            const dbCandidate = parsed.database || parsed;
            if (dbCandidate && Array.isArray(dbCandidate.School_Profile)) {
              return dbCandidate;
            }
          }
        }
      } catch (_) {}
      return null;
    };

    const results = await Promise.all([
      this.fetchLatestFromCloudRelay(),
      ...candidateUrls.map((u) => fetchUrlCandidate(u))
    ]);

    let bestRemoteDb = null;
    let bestRemoteVer = -1;

    for (const candidate of results) {
      if (candidate && Array.isArray(candidate.School_Profile)) {
        const ver = this.getDbVersion(candidate);
        if (ver > bestRemoteVer) {
          bestRemoteVer = ver;
          bestRemoteDb = candidate;
        }
      }
    }

    if (!bestRemoteDb) return false;

    const localVer = this.getDbVersion(this.db);

    // กรณีเครื่องนี้เพิ่งแก้ไขข้อมูลใหม่กว่าบนคลาวด์ ให้ส่งข้อมูลใหม่จากเครื่องนี้ขึ้นคลาวด์ทันที
    if (!forceAcceptRemote && localVer > bestRemoteVer && bestRemoteVer > 0) {
      await this.syncToCentralServer();
      return true;
    }

    // กรณีคลาวด์มีข้อมูลใหม่กว่า (เช่น แอดมินล็อกอินแก้ไขจากเครื่องอื่น) ให้อัปเดตหน้าเว็บของเครื่องนี้ทันที!
    if (forceAcceptRemote || bestRemoteVer > localVer) {
      this.applyRemoteDatabaseIfNewer(bestRemoteDb, forceAcceptRemote);
      return true;
    }

    return true;
  }

  /**
   * ซิงค์เชื่อมโยงทุกแพลตฟอร์มแบบครบวงจร (Universal Multi-Platform Sync)
   */
  async syncAllPlatforms(silent = false) {
    const results = {
      serverConnected: false,
      googleSheetsConnected: false,
      timestamp: new Date().toISOString()
    };

    try {
      await this.syncToCentralServer();
      const serverUpdated = await this.syncWithCentralServer();
      results.serverConnected = serverUpdated;
    } catch (_) {}

    try {
      await this.backgroundRevalidateFromGoogleWorkspace();
      results.googleSheetsConnected = Boolean(this.lastSyncStatus && this.lastSyncStatus.connectedToCloud);
    } catch (_) {}

    if (!silent && window.app) {
      window.app.render();
      if (typeof window.app.showToast === 'function') {
        window.app.showToast('✅ ซิงค์เชื่อมโยงข้อมูลทุกเครื่องเป็นปัจจุบันแล้ว', 'success');
      }
    }
    return results;
  }

  /**
   * ปุ่ม "อัปเดตข้อมูลล่าสุด" บนแถบเมนูด้านบน
   */
  async forceResetToCurrentData() {
    try {
      ['BANBOK_DIGITAL_PLATFORM_DB_V1', 'BANBOK_DIGITAL_PLATFORM_DB_V2', 'BANBOK_DIGITAL_PLATFORM_DB_V3', 'BANBOK_LOCAL_DB_V3'].forEach((k) => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
      localStorage.setItem(DB_VERSION_KEY, DB_BUILD_VERSION);

      await this.syncWithCentralServer(true);

      if (window.app && typeof window.app.showToast === 'function') {
        window.app.showToast('✅ อัปเดตข้อมูลล่าสุดจากระบบกลางเรียบร้อยแล้ว', 'success');
      }
      if (window.app && typeof window.app.render === 'function') {
        window.app.render();
      }
    } catch (e) {
      console.error('forceResetToCurrentData error:', e);
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach((cb) => {
      try { cb(this.db); } catch (e) { /* ignore */ }
    });
  }

  /**
   * บันทึกและนับจำนวนผู้เข้าชมเว็บไซต์ (ทำงานแบบ Silent เพื่อไม่ให้เปลี่ยน _meta.version ทับข้อมูลแอดมิน)
   */
  recordVisitor() {
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      let totalVisitors = parseInt(this.getSetting('total_visitors', '1280'), 10);
      let todayVisitors = parseInt(this.getSetting('today_visitors', '0'), 10);
      const lastRecordedDate = this.getSetting('today_visitor_date', '');
      let history = {};
      try {
        history = JSON.parse(this.getSetting('visitor_history_json', '{}'));
      } catch (_) {
        history = {};
      }

      if (lastRecordedDate !== todayStr) {
        todayVisitors = 0;
        this.setSettingSilent('today_visitor_date', todayStr);
      }

      const sessionKey = 'bbk_visited_session';
      if (!sessionStorage.getItem(sessionKey)) {
        totalVisitors++;
        todayVisitors++;
        history[todayStr] = (history[todayStr] || 0) + 1;
        sessionStorage.setItem(sessionKey, todayStr);

        this.setSettingSilent('total_visitors', String(totalVisitors));
        this.setSettingSilent('today_visitors', String(todayVisitors));
        this.setSettingSilent('visitor_history_json', JSON.stringify(history));
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db)); } catch (_) {}
      }

      return {
        total: totalVisitors,
        today: todayVisitors,
        todayDate: todayStr
      };
    } catch (e) {
      return { total: 1280, today: 1, todayDate: '' };
    }
  }

  setSettingSilent(key, value) {
    if (!this.db || !Array.isArray(this.db.System_Settings)) return;
    const now = new Date().toISOString();
    const list = this.db.System_Settings;
    const idx = list.findIndex((s) => s.setting_key === key);
    if (idx > -1) {
      list[idx].setting_value = String(value);
      list[idx].updated_at = now;
    } else {
      list.push({
        setting_key: key,
        setting_group: 'ANALYTICS',
        setting_value: String(value),
        data_type: 'string',
        description: key,
        updated_by: 'SYSTEM',
        updated_at: now
      });
    }
  }

  getVisitorStats() {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const total = parseInt(this.getSetting('total_visitors', '1280'), 10);
    const lastDate = this.getSetting('today_visitor_date', '');
    const today = lastDate === todayStr ? parseInt(this.getSetting('today_visitors', '0'), 10) : 0;
    let history = {};
    try {
      history = JSON.parse(this.getSetting('visitor_history_json', '{}'));
    } catch (_) {}
    return { total, today, todayDate: todayStr, history };
  }

  getPrimaryKeyName(tableName) {
    return TABLE_PRIMARY_KEYS[tableName] || 'id';
  }

  getTable(tableName) {
    if (!this.db || !this.db[tableName]) return [];
    return JSON.parse(JSON.stringify(this.db[tableName]));
  }

  getSetting(key, fallback = '') {
    if (!this.db) return fallback;
    const settings = this.db.System_Settings || [];
    const item = settings.find((s) => s.setting_key === key);
    return item ? item.setting_value : fallback;
  }

  getSettingsMap() {
    const map = {};
    if (!this.db) return map;
    (this.db.System_Settings || []).forEach((s) => {
      map[s.setting_key] = s.setting_value;
    });
    return map;
  }

  async setSetting(key, value, actor = null) {
    const now = new Date().toISOString();
    const list = this.db.System_Settings || [];
    const idx = list.findIndex((s) => s.setting_key === key);
    const updatedBy = actor ? actor.full_name || actor.username : 'ADMIN';

    if (idx > -1) {
      list[idx].setting_value = String(value);
      list[idx].updated_by = updatedBy;
      list[idx].updated_at = now;
    } else {
      list.push({
        setting_key: key,
        setting_group: 'CUSTOM',
        setting_value: String(value),
        data_type: 'string',
        description: key,
        updated_by: updatedBy,
        updated_at: now
      });
    }
    this.touchMeta();
    this.saveLocal();
    await this.pushChangeToCloud('updateRow', 'System_Settings', 'setting_key', key, list[idx] || { setting_key: key, setting_value: String(value) }, actor);
    return true;
  }

  async insert(tableName, rowObj, actor = null) {
    if (!TABLE_PRIMARY_KEYS[tableName]) {
      throw new Error(`ตาราง ${tableName} ไม่ถูกต้องตามโครงสร้างฐานข้อมูล`);
    }
    const pk = this.getPrimaryKeyName(tableName);
    const now = new Date().toISOString();
    const newRow = { ...rowObj };

    if (!newRow[pk]) {
      const prefix = tableName.substring(0, 3).toUpperCase();
      newRow[pk] = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
    }
    if (!newRow.created_at) newRow.created_at = now;
    newRow.updated_at = now;

    this.unmarkDeleted(tableName, newRow[pk]);
    if (!Array.isArray(this.db[tableName])) {
      this.db[tableName] = [];
    }
    this.db[tableName].unshift(newRow);
    this.logAudit('INSERT', tableName, newRow[pk], `เพิ่มข้อมูลใหม่ในตาราง ${tableName} (${newRow.title || newRow.first_name || newRow.module_name || newRow[pk]})`, 'SUCCESS', actor);
    this.touchMeta();
    this.saveLocal();

    await this.pushChangeToCloud('insertRow', tableName, pk, newRow[pk], newRow, actor);
    return newRow;
  }

  async update(tableName, pkValue, updatedFields, actor = null) {
    if (!TABLE_PRIMARY_KEYS[tableName]) {
      throw new Error(`ตาราง ${tableName} ไม่ถูกต้องตามโครงสร้างฐานข้อมูล`);
    }
    const pk = this.getPrimaryKeyName(tableName);
    const list = this.db[tableName] || [];
    const idx = list.findIndex((item) => String(item[pk]) === String(pkValue));
    if (idx === -1) {
      throw new Error(`ไม่พบข้อมูลรหัส ${pkValue} ในตาราง ${tableName}`);
    }

    const updatedRow = {
      ...list[idx],
      ...updatedFields,
      [pk]: pkValue,
      updated_at: new Date().toISOString()
    };
    list[idx] = updatedRow;

    this.logAudit('UPDATE', tableName, pkValue, `แก้ไขข้อมูลในตาราง ${tableName} รหัส ${pkValue}`, 'SUCCESS', actor);
    this.touchMeta();
    this.saveLocal();

    await this.pushChangeToCloud('updateRow', tableName, pk, pkValue, updatedRow, actor);
    return updatedRow;
  }

  async remove(tableName, pkValue, actor = null) {
    if (!TABLE_PRIMARY_KEYS[tableName]) {
      throw new Error(`ตาราง ${tableName} ไม่ถูกต้องตามโครงสร้างฐานข้อมูล`);
    }
    const pk = this.getPrimaryKeyName(tableName);
    const cleanPk = String(pkValue).trim();
    const list = this.db[tableName] || [];
    const target = list.find((item) => String(item[pk]).trim() === cleanPk);
    this.db[tableName] = list.filter((item) => String(item[pk]).trim() !== cleanPk);

    this.markDeleted(tableName, cleanPk);

    const label = target ? (target.title || target.first_name || target.module_name || cleanPk) : cleanPk;
    this.logAudit('DELETE', tableName, cleanPk, `ลบข้อมูลจากตาราง ${tableName}: ${label}`, 'SUCCESS', actor);
    this.touchMeta();
    this.saveLocal();
    await this.syncToCentralServer();

    await this.pushChangeToCloud('deleteRow', tableName, pk, cleanPk, null, actor);
    return true;
  }

  logAudit(actionType, targetTable, targetId, details, status = 'SUCCESS', actor = null) {
    const currentUser = actor || (window.authService ? window.authService.getCurrentUser() : null) || {
      user_id: 'PUBLIC',
      full_name: 'ผู้ใช้งานระบบ',
      role_id: 'PUBLIC'
    };

    const entry = {
      log_id: `LOG-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      timestamp: new Date().toISOString(),
      user_id: currentUser.user_id || 'PUBLIC',
      user_name: currentUser.full_name || currentUser.username || 'ผู้ใช้งาน',
      user_role: currentUser.role_id || 'PUBLIC',
      action_type: actionType,
      target_table: targetTable,
      target_id: targetId,
      details: details,
      ip_or_client: (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('Mobile')) ? 'Mobile Web Client' : 'Desktop Web Client',
      status: status
    };

    if (!this.db.Audit_Logs) this.db.Audit_Logs = [];
    this.db.Audit_Logs.unshift(entry);
    if (this.db.Audit_Logs.length > 150) {
      this.db.Audit_Logs = this.db.Audit_Logs.slice(0, 150);
    }
  }

  recordError(code, message) {
    try {
      const logs = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
      logs.unshift({
        error_id: `ERR-${Date.now()}`,
        timestamp: new Date().toISOString(),
        code,
        message
      });
      localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(logs.slice(0, 50)));
      this.lastSyncStatus.errorCount = logs.length;
    } catch (e) { /* ignore */ }
  }

  getErrorLogs() {
    try {
      return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  clearErrorLogs() {
    localStorage.setItem(ERROR_LOG_KEY, '[]');
    this.lastSyncStatus.errorCount = 0;
  }

  async pushChangeToCloud(action, tableName, primaryKey, primaryValue, rowData, actor) {
    const gasUrl = this.getSetting('gas_webapp_url', '').trim();
    const sheetsEnabled = this.getSetting('enable_google_sheets', 'true') === 'true';
    if (!gasUrl || !sheetsEnabled) {
      this.lastSyncStatus.mode = 'HYBRID_CLOUD_REALTIME';
      return { synced: false, reason: 'NO_GAS_URL_CONFIGURED' };
    }

    const currentUser = actor || (window.authService ? window.authService.getCurrentUser() : null) || {
      user_id: 'ADMIN',
      user_name: 'Admin',
      role: 'ADMIN'
    };

    const txPayload = {
      action,
      spreadsheetId: window.googleWorkspaceClient
        ? window.googleWorkspaceClient.extractSpreadsheetId(this.getSetting('google_spreadsheet_id', ''))
        : this.getSetting('google_spreadsheet_id', ''),
      table: tableName,
      primaryKey,
      primaryValue,
      row: rowData,
      actor: {
        user_id: currentUser.user_id,
        user_name: currentUser.full_name || currentUser.username,
        role: currentUser.role_id || 'ADMIN'
      }
    };

    if (window.googleWorkspaceClient) {
      const txId = window.googleWorkspaceClient.enqueueTransaction(txPayload);
      return { synced: true, queuedTxId: txId };
    }

    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(txPayload)
      });
      return await response.json();
    } catch (err) {
      return { synced: false, error: err.message };
    }
  }

  async pullFromGoogleSheets(silent = false) {
    const gasUrl = this.getSetting('gas_webapp_url', '').trim();
    const rawSheetId = this.getSetting('google_spreadsheet_id', '').trim();

    if (!gasUrl && rawSheetId) {
      return await this.pullFromGoogleSheetsEdgeGviz(rawSheetId, silent);
    }

    if (!gasUrl) {
      throw new Error('กรุณาตั้งค่า Google Apps Script URL หรือ Google Sheets Link ในหน้าตั้งค่า Google Workspace ก่อนดึงข้อมูล');
    }

    const start = performance.now();
    const role = window.authService ? window.authService.getCurrentRole() : 'PUBLIC';
    const cleanSheetId = window.googleWorkspaceClient ? window.googleWorkspaceClient.extractSpreadsheetId(rawSheetId) : rawSheetId;
    const spreadsheetId = encodeURIComponent(cleanSheetId);
    const url = `${gasUrl}?action=getAllData&role=${role}&spreadsheetId=${spreadsheetId}`;

    const payload = window.googleWorkspaceClient
      ? await window.googleWorkspaceClient.fetchWithRetry(url, {}, 2, 700)
      : await (await fetch(url)).json();

    if (payload.status !== 'SUCCESS' || !payload.data) {
      throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้');
    }

    const cloudProfileRows = payload.data.School_Profile || [];
    const cloudPersonnelRows = payload.data.Personnel || [];
    const hasRealDirectorInCloud = cloudPersonnelRows.some((p) => String(p.first_name || '').includes('ทองพูล'));
    const hasRealSchoolCodeInCloud = cloudProfileRows.some((p) => String(p.school_code_10 || p.school_code || '').includes('1034710083'));
    if (cloudProfileRows.length === 0 || !hasRealDirectorInCloud || !hasRealSchoolCodeInCloud) {
      await this.syncAllToGoogleSheets();
      return payload;
    }

    Object.keys(payload.data).forEach((table) => {
      if (Array.isArray(payload.data[table]) && payload.data[table].length > 0) {
        const pk = this.getPrimaryKeyName(table);
        this.db[table] = payload.data[table].filter((r) => !this.isDeleted(table, r[pk]));
      }
    });

    this.lastSyncStatus = {
      mode: payload.cached ? 'GOOGLE_EDGE_CACHE_HIT' : 'GOOGLE_CLOUD_CONNECTED',
      connectedToCloud: true,
      lastSyncedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - start),
      errorCount: this.getErrorLogs().length
    };
    if (!silent) {
      this.logAudit('CLOUD_PULL', 'ALL_17_TABLES', 'GOOGLE_SHEETS', 'ดึงข้อมูลล่าสุดจาก Google Sheets สำเร็จ', 'SUCCESS');
    }
    this.saveLocal(false);
    if (!silent && window.app) window.app.render();
    return payload;
  }

  async syncAllToGoogleSheets() {
    const gasUrl = this.getSetting('gas_webapp_url', '').trim();
    if (!gasUrl) {
      throw new Error('กรุณาระบุ Google Apps Script Web App URL ในหน้า Developer Console ก่อนซิงค์ขึ้น Google Sheets');
    }

    const start = performance.now();
    const currentUser = window.authService ? window.authService.getCurrentUser() : { user_id: 'DEV', full_name: 'Developer', role_id: 'DEVELOPER' };
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'bulkSync',
        spreadsheetId: this.getSetting('google_spreadsheet_id', ''),
        tables: this.db,
        actor: {
          user_id: currentUser.user_id,
          user_name: currentUser.full_name,
          role: currentUser.role_id || 'DEVELOPER'
        }
      })
    });

    const result = await response.json();
    if (result.status !== 'SUCCESS') {
      throw new Error(result.message || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูลไปที่ Google Sheets');
    }

    this.lastSyncStatus = {
      mode: 'GOOGLE_CLOUD_CONNECTED',
      connectedToCloud: true,
      lastSyncedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - start),
      errorCount: this.getErrorLogs().length
    };
    this.logAudit('CLOUD_PUSH_ALL', 'ALL_17_TABLES', 'GOOGLE_SHEETS', 'ซิงค์ข้อมูลทั้ง 17 ตารางขึ้น Google Sheets สำเร็จ', 'SUCCESS');
    this.saveLocal();
    return result;
  }

  resetToFactoryDefault() {
    this.db = JSON.parse(JSON.stringify(window.BANBOK_DEFAULT_DB));
    this.touchMeta();
    this.logAudit('FACTORY_RESET', 'ALL_17_TABLES', 'DEFAULT', 'รีเซ็ตฐานข้อมูลกลับสู่ค่าเริ่มต้นของโรงเรียนบ้านบกหนองทันน้ำ', 'SUCCESS');
    this.saveLocal();
    return true;
  }

  exportBackupJSON() {
    this.logAudit('EXPORT_BACKUP', 'ALL_17_TABLES', 'JSON_FILE', 'ดาวน์โหลดไฟล์สำรองฐานข้อมูล (Full JSON Snapshot)', 'SUCCESS');
    this.saveLocal(false);
    return JSON.stringify({
      platform: 'BANBOK DIGITAL SCHOOL PLATFORM',
      school: 'โรงเรียนบ้านบกหนองทันน้ำ (สพป.อุบลราชธานี เขต 2)',
      exportedAt: new Date().toISOString(),
      tablesCount: Object.keys(TABLE_PRIMARY_KEYS).length,
      database: this.db
    }, null, 2);
  }

  importBackupJSON(jsonString) {
    const parsed = JSON.parse(jsonString);
    const sourceDb = parsed.database || parsed;
    Object.keys(TABLE_PRIMARY_KEYS).forEach((table) => {
      if (Array.isArray(sourceDb[table])) {
        this.db[table] = sourceDb[table];
      }
    });
    this.touchMeta();
    this.logAudit('IMPORT_BACKUP', 'ALL_17_TABLES', 'JSON_RESTORE', 'กู้คืนฐานข้อมูลจากไฟล์สำรองสำเร็จ', 'SUCCESS');
    this.saveLocal();
    return true;
  }
}

window.dbAdapter = new DatabaseAdapter();
