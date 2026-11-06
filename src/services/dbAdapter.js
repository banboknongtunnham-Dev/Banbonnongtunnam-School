/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - DATABASE ABSTRACTION LAYER (dbAdapter.js)
 * แยกชั้นฐานข้อมูลออกจาก Frontend รองรับการเชื่อมต่อ Google Sheets API (ผ่าน GAS)
 * และระบบ Persistent Storage พร้อมบันทึก Audit Logs ทุกการเปลี่ยนแปลง
 * ============================================================================
 */

const STORAGE_KEY = 'BANBOK_DIGITAL_PLATFORM_DB_V3';
const ERROR_LOG_KEY = 'BANBOK_SYSTEM_ERROR_LOGS_V1';

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

  initStorageListener() {
    if (typeof window !== 'undefined') {
      // 1. Cross-Tab Real-time Broadcast Synchronization
      if ('BroadcastChannel' in window) {
        try {
          this.broadcastChannel = new BroadcastChannel('banbok_platform_sync');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'DB_UPDATED' && event.data.database) {
              this.db = event.data.database;
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db)); } catch (e) {}
              this.notifyListeners();
            }
          };
        } catch (e) { /* ignore */ }
      }

      // 2. LocalStorage Event Listener
      if (window.addEventListener) {
        window.addEventListener('storage', (event) => {
          if (event.key === STORAGE_KEY && event.newValue) {
            try {
              this.db = JSON.parse(event.newValue);
              this.notifyListeners();
            } catch (e) { /* ignore */ }
          }
        });
      }
    }
  }

  startAutoRevalidation() {
    if (typeof window === 'undefined') return;
    // ตรวจสอบและดึงข้อมูลอัปเดตจาก Cloud / Google Workspace / Central Server ทุก 20 วินาทีแบบ Real-Time Polling
    setInterval(() => {
      this.backgroundRevalidateFromGoogleWorkspace();
    }, 20000);
  }

  init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // ตรวจสอบให้ครบทั้ง 17 ตาราง หากตารางไหนขาดให้เติมจากค่าเริ่มต้น
        this.db = {};
        Object.keys(TABLE_PRIMARY_KEYS).forEach((table) => {
          this.db[table] = Array.isArray(parsed[table]) && parsed[table].length > 0
            ? parsed[table]
            : JSON.parse(JSON.stringify(window.BANBOK_DEFAULT_DB[table] || []));
        });
        // อัปเดต URL ของ Google Apps Script อัตโนมัติหากในแคชเดิมยังว่างอยู่
        const currentGasUrl = this.getSetting('gas_webapp_url', '');
        const defaultGasSetting = (window.BANBOK_DEFAULT_DB.System_Settings || []).find((s) => s.setting_key === 'gas_webapp_url');
        if (!currentGasUrl && defaultGasSetting && defaultGasSetting.setting_value) {
          const idx = this.db.System_Settings.findIndex((s) => s.setting_key === 'gas_webapp_url');
          if (idx > -1) {
            this.db.System_Settings[idx].setting_value = defaultGasSetting.setting_value;
          } else {
            this.db.System_Settings.push(defaultGasSetting);
          }
          this.saveLocal();
        }
        // อัปเดต LINE Messaging API Token อัตโนมัติหากในแคชเดิมยังว่างอยู่
        const currentLineToken = this.getSetting('line_channel_access_token', '');
        const defaultLineTokenSetting = (window.BANBOK_DEFAULT_DB.System_Settings || []).find((s) => s.setting_key === 'line_channel_access_token');
        if (!currentLineToken && defaultLineTokenSetting && defaultLineTokenSetting.setting_value) {
          const idx = this.db.System_Settings.findIndex((s) => s.setting_key === 'line_channel_access_token');
          if (idx > -1) {
            this.db.System_Settings[idx].setting_value = defaultLineTokenSetting.setting_value;
          } else {
            this.db.System_Settings.push(defaultLineTokenSetting);
          }
          this.saveLocal();
        }
        // ตรวจสอบและเพิ่มโพสต์ฝัง Facebook ล่าสุด (NEWS-FB-EMBED-001) เข้าสู่แคชเดิมอัตโนมัติ
        const defaultFbEmbedNews = (window.BANBOK_DEFAULT_DB.News || []).find((n) => n.news_id === 'NEWS-FB-EMBED-001');
        if (defaultFbEmbedNews && Array.isArray(this.db.News)) {
          const existsFb = this.db.News.some((n) => n.news_id === 'NEWS-FB-EMBED-001');
          if (!existsFb) {
            this.db.News.unshift(JSON.parse(JSON.stringify(defaultFbEmbedNews)));
            this.saveLocal();
          }
        }
        // อัปเดตภาพถ่ายบุคลากรทั้งหมดอัตโนมัติหากในแคชเดิมยังว่างอยู่
        if (Array.isArray(this.db.Personnel)) {
          let updatedAny = false;
          // ตรวจสอบและเติมบุคลากรใหม่จากค่าเริ่มต้น (เช่น PER-019, PER-020)
          (window.BANBOK_DEFAULT_DB.Personnel || []).forEach((defP) => {
            const exists = this.db.Personnel.some((p) => p.personnel_id === defP.personnel_id);
            if (!exists) {
              this.db.Personnel.push(JSON.parse(JSON.stringify(defP)));
              updatedAny = true;
            }
          });
          this.db.Personnel.forEach((p) => {
            const def = (window.BANBOK_DEFAULT_DB.Personnel || []).find((dp) => dp.personnel_id === p.personnel_id);
            if (def && def.photo_url && (!p.photo_url || p.photo_url === '' || p.photo_url === 'assets/img/logo.png')) {
              p.photo_url = def.photo_url;
              updatedAny = true;
            }
            if (p.personnel_id === 'PER-001') {
              p.photo_url = 'assets/img/director_thongpoon.png';
              updatedAny = true;
            }
            if (def && def.academic_standing && def.academic_standing !== '-' && (!p.academic_standing || p.academic_standing === '-')) {
              p.academic_standing = def.academic_standing;
              updatedAny = true;
            }
          });
          if (updatedAny) {
            this.saveLocal();
          }
        }

        // ตรวจสอบและอัปเดตสถิติ School_Statistics (กราฟ 3 ปีย้อนหลัง และผลสอบระดับชาติ O-NET, RT, NT)
        if (Array.isArray(this.db.School_Statistics)) {
          let updatedStats = false;
          // อัปเดตสถิตินักเรียน 3 ปีย้อนหลังให้ตรงความจริง: 295 (ปี 67), 281 (ปี 68), 285 (ปี 69)
          const s67 = this.db.School_Statistics.find((s) => s.metric_group === 'STUDENT_TREND' && String(s.academic_year) === '2567');
          if (s67 && (s67.metric_value === '-' || !s67.metric_value || s67.metric_value === 0)) {
            s67.metric_value = 295;
            updatedStats = true;
          }
          const s68 = this.db.School_Statistics.find((s) => s.metric_group === 'STUDENT_TREND' && String(s.academic_year) === '2568');
          if (s68 && (s68.metric_value === '-' || !s68.metric_value || s68.metric_value === 0)) {
            s68.metric_value = 281;
            updatedStats = true;
          }
          const s69 = this.db.School_Statistics.find((s) => s.metric_group === 'STUDENT_TREND' && String(s.academic_year) === '2569');
          if (s69 && (s69.metric_value === '-' || !s69.metric_value || s69.metric_value === 0)) {
            s69.metric_value = 285;
            updatedStats = true;
          }

          // เติมผลสอบระดับชาติ O-NET, RT, NT หากในเครื่องยังไม่มี
          (window.BANBOK_DEFAULT_DB.School_Statistics || []).forEach((defS) => {
            if (String(defS.metric_group || '').startsWith('EXAM_')) {
              const exists = this.db.School_Statistics.some((s) => s.kpi_id === defS.kpi_id);
              if (!exists) {
                this.db.School_Statistics.push(JSON.parse(JSON.stringify(defS)));
                updatedStats = true;
              }
            }
          });

          if (updatedStats) {
            this.saveLocal();
          }
        }
      } else {
        this.db = JSON.parse(JSON.stringify(window.BANBOK_DEFAULT_DB));
        this.saveLocal();
      }
      // Stale-While-Revalidate: ซิงค์ข้อมูลเบื้องหลังจาก Google Workspace โดยไม่บล็อกหน้าเว็บ
      setTimeout(() => this.backgroundRevalidateFromGoogleWorkspace(), 150);
    } catch (err) {
      this.recordError('DB_INIT_ERROR', err.message);
      this.db = JSON.parse(JSON.stringify(window.BANBOK_DEFAULT_DB));
    }
  }

  /**
   * ดึงข้อมูลสดจาก Google Workspace และ Central Server เบื้องหลังอัตโนมัติ (Stale-While-Revalidate)
   */
  async backgroundRevalidateFromGoogleWorkspace() {
    try {
      // 1. ซิงค์กับ Central Server ก่อนเสมอเพื่ออัปเดตข้อมูลล่าสุดข้ามอุปกรณ์
      await this.syncWithCentralServer();

      const gasUrl = this.getSetting('gas_webapp_url', '').trim();
      const sheetId = this.getSetting('google_spreadsheet_id', '').trim();
      const sheetsEnabled = this.getSetting('enable_google_sheets', 'true') === 'true';
      if (!sheetsEnabled) return;

      let gasSuccess = false;
      if (gasUrl) {
        try {
          await this.pullFromGoogleSheets(true);
          gasSuccess = true;
        } catch (e) {
          gasSuccess = false;
        }
      }

      // หาก GAS ติดขัด หรือไม่ได้ตั้งค่า แต่มี Spreadsheet ID ให้ดึงผ่าน Google Sheets Edge GViz CDN อัตโนมัติ
      if (!gasSuccess && sheetId && window.googleWorkspaceClient) {
        await this.pullFromGoogleSheetsEdgeGviz(sheetId, true);
      }
    } catch (e) {
      // ทำงานต่อด้วย Local Cache อย่างราบรื่นหากออฟไลน์
    }
  }

  async pullFromGoogleSheetsEdgeGviz(spreadsheetId, silent = false) {
    if (!window.googleWorkspaceClient) return;
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
          this.db[table] = rows;
          updatedCount++;
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
      this.saveLocal();
      if (!silent && window.app) window.app.render();
    }
    return updatedCount;
  }

  saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch (err) {
      this.recordError('DB_LOCAL_STORAGE_QUOTA_ERROR', err.message);
    }

    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'DB_UPDATED', database: this.db, timestamp: Date.now() });
      }
    } catch (e) {}

    try {
      this.notifyListeners();
    } catch (e) {}

    try {
      this.autoSyncToLocalServer();
    } catch (e) {}
  }

  autoSyncToLocalServer() {
    if (this._syncTimeout) clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(async () => {
      try {
        if (typeof window !== 'undefined' && typeof fetch === 'function') {
          await fetch('/api/database', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ database: this.db })
          });
        }
      } catch (_) { /* silent fallback */ }
    }, 400);
  }

  /**
   * ดึงฐานข้อมูลหลักจากเซิร์ฟเวอร์กลาง (Central / Local Server Sync)
   */
  async syncWithCentralServer() {
    try {
      if (typeof window !== 'undefined' && typeof fetch === 'function') {
        const res = await fetch('/api/database', { cache: 'no-cache' });
        if (res.ok) {
          const remoteDb = await res.json();
          if (remoteDb && remoteDb.School_Profile && Array.isArray(remoteDb.School_Profile)) {
            this.db = remoteDb;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
            if (this.broadcastChannel) {
              try {
                this.broadcastChannel.postMessage({ type: 'DB_UPDATED', database: this.db, timestamp: Date.now() });
              } catch (_) {}
            }
            this.notifyListeners();
            return true;
          }
        }
      }
    } catch (e) {}
    return false;
  }

  /**
   * ซิงค์เชื่อมโยงทุกแพลตฟอร์มแบบครบวงจร (Universal Multi-Platform Sync)
   * โยงทั้ง Central Server, Google Sheets Edge GViz / GAS, และ Local Cache
   */
  async syncAllPlatforms(silent = false) {
    const results = {
      serverConnected: false,
      googleSheetsConnected: false,
      timestamp: new Date().toISOString()
    };

    // 1. ซิงค์กับ Central Server
    try {
      const serverUpdated = await this.syncWithCentralServer();
      results.serverConnected = serverUpdated;
    } catch (_) {}

    // 2. ซิงค์กับ Google Workspace / Sheets
    try {
      await this.backgroundRevalidateFromGoogleWorkspace();
      results.googleSheetsConnected = Boolean(this.lastSyncStatus && this.lastSyncStatus.connectedToCloud);
    } catch (_) {}

    if (!silent && window.app) {
      window.app.render();
      if (typeof window.app.showToast === 'function') {
        window.app.showToast('✅ ซิงค์เชื่อมโยงทุกแพลตฟอร์มเป็นปัจจุบันแล้ว', 'success');
      }
    }
    return results;
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
   * บันทึกและนับจำนวนผู้เข้าชมเว็บไซต์ (Visitor Analytics & Daily Tracking)
   */
  recordVisitor() {
    try {
      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      let totalVisitors = parseInt(this.getSetting('total_visitors', '1280'), 10);
      let todayVisitors = parseInt(this.getSetting('today_visitors', '0'), 10);
      const lastRecordedDate = this.getSetting('today_visitor_date', '');
      let history = {};
      try {
        history = JSON.parse(this.getSetting('visitor_history_json', '{}'));
      } catch (_) {
        history = {};
      }

      // เมื่อขึ้นวันใหม่ รีเซ็ตยอดวันนี้
      if (lastRecordedDate !== todayStr) {
        todayVisitors = 0;
        this.setSetting('today_visitor_date', todayStr);
      }

      // ตรวจสอบ session (นับ 1 ครั้งต่อ 1 เซสชันบราวเซอร์ เพื่อความแม่นยำ)
      const sessionKey = 'bbk_visited_session';
      if (!sessionStorage.getItem(sessionKey)) {
        totalVisitors++;
        todayVisitors++;
        history[todayStr] = (history[todayStr] || 0) + 1;
        sessionStorage.setItem(sessionKey, todayStr);

        this.setSetting('total_visitors', String(totalVisitors));
        this.setSetting('today_visitors', String(todayVisitors));
        this.setSetting('visitor_history_json', JSON.stringify(history));
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
    if (!this.db[tableName]) return [];
    return JSON.parse(JSON.stringify(this.db[tableName]));
  }

  getSetting(key, fallback = '') {
    const settings = this.db.System_Settings || [];
    const item = settings.find((s) => s.setting_key === key);
    return item ? item.setting_value : fallback;
  }

  getSettingsMap() {
    const map = {};
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

    this.db[tableName].unshift(newRow);
    this.logAudit('INSERT', tableName, newRow[pk], `เพิ่มข้อมูลใหม่ในตาราง ${tableName} (${newRow.title || newRow.first_name || newRow.module_name || newRow[pk]})`, 'SUCCESS', actor);
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
    this.saveLocal();

    await this.pushChangeToCloud('updateRow', tableName, pk, pkValue, updatedRow, actor);
    return updatedRow;
  }

  async remove(tableName, pkValue, actor = null) {
    if (!TABLE_PRIMARY_KEYS[tableName]) {
      throw new Error(`ตาราง ${tableName} ไม่ถูกต้องตามโครงสร้างฐานข้อมูล`);
    }
    const pk = this.getPrimaryKeyName(tableName);
    const list = this.db[tableName] || [];
    const target = list.find((item) => String(item[pk]) === String(pkValue));
    this.db[tableName] = list.filter((item) => String(item[pk]) !== String(pkValue));

    const label = target ? (target.title || target.first_name || target.module_name || pkValue) : pkValue;
    this.logAudit('DELETE', tableName, pkValue, `ลบข้อมูลจากตาราง ${tableName}: ${label}`, 'SUCCESS', actor);
    this.saveLocal();

    await this.pushChangeToCloud('deleteRow', tableName, pk, pkValue, null, actor);
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
      ip_or_client: navigator.userAgent.includes('Mobile') ? 'Mobile Web Client' : 'Desktop Web Client',
      status: status
    };

    if (!this.db.Audit_Logs) this.db.Audit_Logs = [];
    this.db.Audit_Logs.unshift(entry);
    if (this.db.Audit_Logs.length > 300) {
      this.db.Audit_Logs = this.db.Audit_Logs.slice(0, 300);
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
      localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(logs.slice(0, 100)));
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

    // ใช้ Write-Behind Queue ของ GoogleWorkspaceClient เพื่อให้ UI ตอบสนองทันที 0ms และ Retry อัตโนมัติ
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

    // ตรวจสอบว่าตารางบน Google Sheets มีรหัสโรงเรียนจริง 1034710083 และรายชื่อบุคลากรจริง 18 ท่านแล้วหรือยัง
    const cloudProfileRows = payload.data.School_Profile || [];
    const cloudPersonnelRows = payload.data.Personnel || [];
    const hasRealDirectorInCloud = cloudPersonnelRows.some((p) => String(p.first_name || '').includes('ทองพูล'));
    const hasRealSchoolCodeInCloud = cloudProfileRows.some((p) => String(p.school_code_10 || p.school_code || '').includes('1034710083'));
    if (cloudProfileRows.length === 0 || !hasRealDirectorInCloud || !hasRealSchoolCodeInCloud) {
      // ส่งข้อมูลจริงทั้ง 17 ตาราง (รหัสโรงเรียน 1034710083, นักเรียน 285 คน, บุคลากร 18 ท่าน) ขึ้นไปบรรจุใน Google Sheets อัตโนมัติทันที!
      await this.syncAllToGoogleSheets();
      return payload;
    }

    Object.keys(payload.data).forEach((table) => {
      if (Array.isArray(payload.data[table]) && payload.data[table].length > 0) {
        this.db[table] = payload.data[table];
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
    this.saveLocal();
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
    this.logAudit('FACTORY_RESET', 'ALL_17_TABLES', 'DEFAULT', 'รีเซ็ตฐานข้อมูลกลับสู่ค่าเริ่มต้นของโรงเรียนบ้านบกหนองทันน้ำ', 'SUCCESS');
    this.saveLocal();
    return true;
  }

  /**
   * ส่งออกฐานข้อมูลทั้งหมดเป็นไฟล์ JSON สำหรับสำรองข้อมูล
   */
  exportBackupJSON() {
    this.logAudit('EXPORT_BACKUP', 'ALL_17_TABLES', 'JSON_FILE', 'ดาวน์โหลดไฟล์สำรองฐานข้อมูล (Full JSON Snapshot)', 'SUCCESS');
    this.saveLocal();
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
    this.logAudit('IMPORT_BACKUP', 'ALL_17_TABLES', 'JSON_RESTORE', 'กู้คืนฐานข้อมูลจากไฟล์สำรองสำเร็จ', 'SUCCESS');
    this.saveLocal();
    return true;
  }
}

window.dbAdapter = new DatabaseAdapter();
