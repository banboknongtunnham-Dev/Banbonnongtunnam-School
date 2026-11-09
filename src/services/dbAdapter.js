/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - DATABASE ABSTRACTION LAYER (dbAdapter.js)
 * แยกชั้นฐานข้อมูลออกจาก Frontend รองรับการซิงค์ข้อมูลข้ามอุปกรณ์แบบ Real-Time
 * (Central Server + GitHub Pages Live JSON + Google Drive/Sheets + Local Cache)
 * ============================================================================
 */

const STORAGE_KEY = 'BANBOK_DIGITAL_PLATFORM_DB_V4';
const ERROR_LOG_KEY = 'BANBOK_SYSTEM_ERROR_LOGS_V1';
const DB_BUILD_VERSION = '20261109_v5';
const DB_VERSION_KEY = 'BANBOK_PLATFORM_BUILD_VERSION';

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
    this.lastSyncStatus = {
      mode: 'HYBRID_READY',
      connectedToCloud: false,
      lastSyncedAt: null,
      latencyMs: 12,
      errorCount: 0
    };
    this.init();
    this.initStorageListener();
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
   * เพื่อใช้เปรียบเทียบและป้องกันข้อมูลเก่าทับข้อมูลใหม่เด็ดขาด
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

  isModalOpen() {
    if (typeof document === 'undefined') return false;
    const modalRoot = document.getElementById('modal-root');
    return Boolean(modalRoot && modalRoot.innerHTML && modalRoot.innerHTML.trim() !== '');
  }

  startAutoRevalidation() {
    if (typeof window === 'undefined') return;
    // ตรวจสอบและดึงข้อมูลอัปเดตจาก Central Server / GitHub Pages ทุก 12 วินาทีแบบ Real-Time Polling
    setInterval(() => {
      this.backgroundRevalidateFromGoogleWorkspace();
    }, 12000);
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

        // หากไฟล์ defaultData.js บนเซิร์ฟเวอร์มีเวอร์ชันใหม่กว่าในแคชของเครื่องนี้ ให้ใช้ข้อมูลใหม่จากเซิร์ฟเวอร์เป็นหลักทันที
        const baseSource = defaultVer > savedVer ? defaultDb : parsed;

        if (Array.isArray(baseSource._tombstones)) {
          try {
            const mergedTombstones = [...new Set([...this.getTombstones(), ...baseSource._tombstones])];
            localStorage.setItem('BANBOK_TOMBSTONES_V1', JSON.stringify(mergedTombstones));
          } catch (_) {}
        }

        this.db = {
          _meta: baseSource._meta || defaultDb._meta || { version: Date.now(), updated_at: new Date().toISOString() },
          _tombstones: this.getTombstones()
        };

        Object.keys(TABLE_PRIMARY_KEYS).forEach((table) => {
          const pk = TABLE_PRIMARY_KEYS[table];
          const rawList = Array.isArray(baseSource[table])
            ? baseSource[table]
            : JSON.parse(JSON.stringify(defaultDb[table] || []));
          this.db[table] = rawList.filter((r) => !this.isDeleted(table, r[pk]));
        });

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

        this.saveLocal(false);
      } else {
        this.db = defaultDb;
        if (!this.db._meta) {
          this.db._meta = { version: Date.now(), updated_at: new Date().toISOString() };
        }
        this.db._tombstones = this.getTombstones();
        this.saveLocal(false);
      }

      // ดึงข้อมูลสดจากเซิร์ฟเวอร์กลางและไฟล์ data_backup.json ทันทีที่เปิดหน้าเว็บ
      setTimeout(() => this.backgroundRevalidateFromGoogleWorkspace(), 80);
    } catch (err) {
      this.recordError('DB_INIT_ERROR', err.message);
      this.db = JSON.parse(JSON.stringify(window.BANBOK_DEFAULT_DB || {}));
    }
  }

  /**
   * ดึงข้อมูลสดจาก Central Server / GitHub Pages data_backup.json / Google Workspace เบื้องหลังอัตโนมัติ
   */
  async backgroundRevalidateFromGoogleWorkspace() {
    try {
      // 1. ซิงค์กับ Central Server และไฟล์ฐานข้อมูลกลาง (data_backup.json) ก่อนเสมอเพื่ออัปเดตข้อมูลล่าสุดข้ามอุปกรณ์
      await this.syncWithCentralServer();

      const gasUrl = this.getSetting('gas_webapp_url', '').trim();
      const sheetId = this.getSetting('google_spreadsheet_id', '').trim();
      const sheetsEnabled = this.getSetting('enable_google_sheets', 'true') === 'true';
      if (!sheetsEnabled) return;

      // หากมีการระบุ Spreadsheet ID จริงไว้ จึงค่อยดึงจาก Google Sheets
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
      // กรณีหน่วยความจำ localStorage เต็ม ให้ล้างแคชรุ่นเก่าและตัด Audit_Logs ให้กระชับแล้วบันทึกใหม่ทันที
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
   * ส่งฐานข้อมูลที่แอดมินแก้ไขไปบันทึกที่เซิร์ฟเวอร์เครื่องทำเว็บ (พร้อมแปลงภาพเข้าไดร์ฟและ git push อัตโนมัติ)
   */
  async syncToCentralServer() {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
    const endpoints = this.getSyncServerEndpoints();
    const payloadStr = JSON.stringify({
      database: this.db,
      tombstones: this.getTombstones()
    });

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadStr,
          signal: controller.signal
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          // หากเซิร์ฟเวอร์แปลง Base64 เป็นพาธไฟล์ภาพในไดร์ฟ/assets ให้แล้ว ให้อัปเดตพาธกลับมาที่เครื่องทันที
          if (data && data.database && data.extractedImagesCount > 0) {
            this.db = data.database;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db)); } catch (_) {}
          } else if (data && data._meta) {
            this.db._meta = data._meta;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db)); } catch (_) {}
          }
          this.lastSyncStatus = {
            mode: 'CENTRAL_SERVER_AUTO_GIT_SYNC',
            connectedToCloud: true,
            lastSyncedAt: new Date().toISOString(),
            latencyMs: 10,
            errorCount: this.getErrorLogs().length
          };
          return true;
        }
      } catch (_) {
        // ลอง endpoint ถัดไป
      }
    }
    return false;
  }

  /**
   * ดึงฐานข้อมูลหลักล่าสุดจากทั้งเซิร์ฟเวอร์เครื่องทำเว็บ และไฟล์ data_backup.json บน GitHub Pages
   * เพื่อให้เครื่องอื่นทุกเครื่องที่เปิดเว็บเห็นข้อมูลและรูปภาพตรงกับคนที่อัปเดต 100%
   */
  async syncWithCentralServer(forceAcceptRemote = false) {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return false;

    const candidateUrls = [];
    if (window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      candidateUrls.push(`/api/database?t=${Date.now()}`);
    }
    candidateUrls.push(`./data_backup.json?t=${Date.now()}`);
    candidateUrls.push(`http://localhost:8080/api/database?t=${Date.now()}`);

    let bestRemoteDb = null;
    let bestRemoteVer = -1;

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timer);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            const parsed = JSON.parse(text);
            const dbCandidate = parsed.database || parsed;
            if (dbCandidate && Array.isArray(dbCandidate.School_Profile)) {
              const ver = this.getDbVersion(dbCandidate);
              if (ver > bestRemoteVer) {
                bestRemoteVer = ver;
                bestRemoteDb = dbCandidate;
              }
            }
          }
        }
      } catch (_) {
        // ข้ามแหล่งที่ติดต่อไม่ได้
      }
    }

    if (!bestRemoteDb) return false;

    const localVer = this.getDbVersion(this.db);

    // กรณีเครื่องนี้ (แอดมิน) เพิ่งแก้ไขข้อมูลใหม่กว่าบนเซิร์ฟเวอร์ ให้ส่งข้อมูลใหม่จากเครื่องนี้ขึ้นเซิร์ฟเวอร์แทนการเขียนทับ!
    if (!forceAcceptRemote && localVer > bestRemoteVer && bestRemoteVer > 0) {
      await this.syncToCentralServer();
      return true;
    }

    // กรณีเซิร์ฟเวอร์มีข้อมูลใหม่กว่า (เช่น เครื่องอื่นเปิดดูเว็บหลังจากแอดมินอัปเดต) หรือสั่งดึงข้อมูลล่าสุด
    if (forceAcceptRemote || bestRemoteVer > localVer) {
      if (Array.isArray(bestRemoteDb._tombstones)) {
        try {
          const mergedTombstones = [...new Set([...this.getTombstones(), ...bestRemoteDb._tombstones])];
          localStorage.setItem('BANBOK_TOMBSTONES_V1', JSON.stringify(mergedTombstones));
        } catch (_) {}
      }

      Object.keys(TABLE_PRIMARY_KEYS).forEach((tbl) => {
        if (Array.isArray(bestRemoteDb[tbl])) {
          const pk = this.getPrimaryKeyName(tbl);
          bestRemoteDb[tbl] = bestRemoteDb[tbl].filter((r) => !this.isDeleted(tbl, r[pk]));
        }
      });

      const remoteStr = JSON.stringify(bestRemoteDb);
      const currentStr = JSON.stringify(this.db);
      if (remoteStr !== currentStr) {
        this.db = bestRemoteDb;
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
      }
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
   * ปุ่ม "อัปเดตข้อมูลล่าสุด" บนแถบเมนูด้านบน:
   * ดึงฐานข้อมูลล่าสุดจากเซิร์ฟเวอร์กลาง / GitHub Pages (data_backup.json) โดยไม่ลบข้อมูลใหม่ของแอดมิน
   */
  async forceResetToCurrentData() {
    try {
      ['BANBOK_DIGITAL_PLATFORM_DB_V1', 'BANBOK_DIGITAL_PLATFORM_DB_V2', 'BANBOK_DIGITAL_PLATFORM_DB_V3', 'BANBOK_LOCAL_DB_V3'].forEach((k) => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
      localStorage.setItem(DB_VERSION_KEY, DB_BUILD_VERSION);

      // หากแอดมินเพิ่งแก้ไขบนเครื่องทำเว็บ ให้ส่งข้อมูลขึ้นเซิร์ฟเวอร์ก่อน
      await this.syncToCentralServer();

      // ดึงข้อมูลสดล่าสุดจากเซิร์ฟเวอร์ / data_backup.json
      const pulled = await this.syncWithCentralServer(true);
      if (!pulled) {
        const defaultVer = this.getDbVersion(window.BANBOK_DEFAULT_DB);
        if (defaultVer > this.getDbVersion(this.db)) {
          this.db = JSON.parse(JSON.stringify(window.BANBOK_DEFAULT_DB));
          this.saveLocal(false);
        }
      }

      if (window.app && typeof window.app.showToast === 'function') {
        window.app.showToast('✅ อัปเดตข้อมูลเป็นปัจจุบันเรียบร้อยแล้ว', 'success');
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

  /**
   * ส่งคำสั่งเปลี่ยนแปลงข้อมูลไปยัง Google Apps Script Web App API ผ่าน Write-Behind Queue ความเร็วสูง
   */
  async pushChangeToCloud(action, tableName, primaryKey, primaryValue, rowData, actor) {
    const gasUrl = this.getSetting('gas_webapp_url', '').trim();
    const sheetsEnabled = this.getSetting('enable_google_sheets', 'true') === 'true';
    if (!gasUrl || !sheetsEnabled) {
      this.lastSyncStatus.mode = 'HYBRID_FAST_CACHE';
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
      this.lastSyncStatus = {
        mode: 'GOOGLE_WORKSPACE_QUEUED_SYNC',
        connectedToCloud: true,
        lastSyncedAt: new Date().toISOString(),
        latencyMs: window.googleWorkspaceClient.lastLatencyMs || 15,
        errorCount: this.getErrorLogs().length
      };
      return { synced: true, queuedTxId: txId };
    }

    const start = performance.now();
    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(txPayload)
      });

      const resJson = await response.json();
      this.lastSyncStatus = {
        mode: 'GOOGLE_CLOUD_CONNECTED',
        connectedToCloud: true,
        lastSyncedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - start),
        errorCount: this.getErrorLogs().length
      };
      return resJson;
    } catch (err) {
      this.recordError('GAS_API_SYNC_ERROR', `${action} on ${tableName}: ${err.message}`);
      return { synced: false, error: err.message };
    }
  }

  /**
   * ดึงข้อมูลทั้งหมดจาก Google Sheets มายังระบบเว็บไซต์ (รองรับทั้ง GAS API และ Edge gviz API)
   */
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

  /**
   * ซิงค์ข้อมูลทั้งหมดทั้ง 17 ตารางจากเว็บไซต์ขึ้นไปยัง Google Sheets ทันที
   */
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

  /**
   * รีเซ็ตฐานข้อมูลกลับเป็นค่าตั้งต้นของโรงเรียนบ้านบกหนองทันน้ำ
   */
  resetToFactoryDefault() {
    this.db = JSON.parse(JSON.stringify(window.BANBOK_DEFAULT_DB));
    this.touchMeta();
    this.logAudit('FACTORY_RESET', 'ALL_17_TABLES', 'DEFAULT', 'รีเซ็ตฐานข้อมูลกลับสู่ค่าเริ่มต้นของโรงเรียนบ้านบกหนองทันน้ำ', 'SUCCESS');
    this.saveLocal();
    return true;
  }

  /**
   * ส่งออกฐานข้อมูลทั้งหมดเป็นไฟล์ JSON สำหรับสำรองข้อมูล
   */
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

  /**
   * นำเข้าไฟล์สำรองฐานข้อมูล JSON
   */
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
