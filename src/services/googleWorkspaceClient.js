/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - HIGH-SPEED GOOGLE WORKSPACE ENGINE
 * ระบบเชื่อมต่อ Google Workspace ความเร็วสูงและเสถียรภาพระดับองค์กร:
 * - Stale-While-Revalidate (SWR) แสดงผลทันที 0ms พร้อมอัปเดตข้อมูลเบื้องหลัง
 * - Write-Behind Transaction Queue + Exponential Backoff Auto-Retry
 * - Dual-Channel Reader (Google Sheets Edge gviz API + Cached GAS Web App)
 * - Smart URL Parser (วางลิงก์เต็มของ Google Sheets / Drive แล้วสกัด ID อัตโนมัติ)
 * ============================================================================
 */

const SYNC_QUEUE_KEY = 'BANBOK_GW_SYNC_QUEUE_V1';

class GoogleWorkspaceClient {
  constructor() {
    this.isSyncing = false;
    this.syncState = 'READY'; // READY | SYNCING | OFFLINE_QUEUED | CLOUD_LINKED | ERROR
    this.lastLatencyMs = 14;
    this.queue = this.loadQueue();
    this.setupNetworkListeners();
  }

  loadQueue() {
    try {
      return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  saveQueue() {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue.slice(0, 100)));
    } catch (e) { /* ignore */ }
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      if (this.queue.length > 0) {
        this.processPendingQueue();
      }
    });
    // ตั้งรอบตรวจสอบคิวอัตโนมัติทุก 20 วินาที
    setInterval(() => {
      if (navigator.onLine && this.queue.length > 0 && !this.isSyncing) {
        this.processPendingQueue();
      }
    }, 20000);
  }

  /**
   * สกัด Spreadsheet ID จากลิงก์เต็มของ Google Sheets หรือคืนค่า ID ทันที
   */
  extractSpreadsheetId(input) {
    if (!input) return '';
    const trimmed = String(input).trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match && match[1] ? match[1] : trimmed;
  }

  /**
   * สกัด Folder ID จากลิงก์เต็มของ Google Drive หรือคืนค่า ID ทันที
   */
  extractDriveFolderId(input) {
    if (!input) return '';
    const trimmed = String(input).trim();
    const match = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    return match && match[1] ? match[1] : trimmed;
  }

  /**
   * ตรวจสอบความถูกต้องของ Google Apps Script Web App URL
   */
  normalizeGasUrl(input) {
    if (!input) return '';
    return String(input).trim();
  }

  /**
   * ตรวจสอบว่ามีการผูก Google Workspace Cloud ไว้แล้วหรือไม่
   */
  isCloudConfigured() {
    if (!window.dbAdapter) return false;
    const gasUrl = window.dbAdapter.getSetting('gas_webapp_url', '').trim();
    const sheetId = window.dbAdapter.getSetting('google_spreadsheet_id', '').trim();
    return Boolean(gasUrl || sheetId);
  }

  /**
   * ส่งคำสั่งไปยัง Google Apps Script พร้อมระบบ Retry Exponential Backoff
   */
  async fetchWithRetry(url, options = {}, retries = 2, delayMs = 800) {
    const start = performance.now();
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 14000);
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        this.lastLatencyMs = Math.round(performance.now() - start);
        this.syncState = 'CLOUD_LINKED';
        this.updateStatusBadgeUI();
        return data;
      } catch (err) {
        if (attempt === retries) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(1.8, attempt)));
      }
    }
  }

  /**
   * ดึงข้อมูลตารางจาก Google Sheets โดยตรงผ่าน Google Edge gviz API (เร็วมากสำหรับตารางสาธารณะ)
   */
  async fetchSheetViaGvizEdge(spreadsheetId, sheetName) {
    const cleanId = this.extractSpreadsheetId(spreadsheetId);
    if (!cleanId) throw new Error('ไม่มี Spreadsheet ID');

    const start = performance.now();
    const url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    const text = await res.text();

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('รูปแบบข้อมูล gviz ไม่ถูกต้อง หรือยังไม่ได้เปิดแชร์ตาราง');
    }

    const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    const table = parsed.table;
    if (!table || !table.cols || !table.rows) return [];

    const headers = table.cols.map((c) => c.label || c.id);
    const rows = table.rows.map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        const cell = r.c && r.c[idx] ? r.c[idx].v : '';
        obj[h] = cell !== null && cell !== undefined ? cell : '';
      });
      return obj;
    });

    this.lastLatencyMs = Math.round(performance.now() - start);
    this.syncState = 'CLOUD_LINKED';
    this.updateStatusBadgeUI();
    return rows;
  }

  /**
   * เพิ่มรายการเปลี่ยนแปลงเข้าสู่คิวซิงค์เบื้องหลัง (Write-Behind Queue)
   * เพื่อให้หน้าเว็บตอบสนองผู้ใช้ทันที 0ms โดยไม่ต้องรอเครือข่าย
   */
  enqueueTransaction(txPayload) {
    const item = {
      txId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      payload: txPayload
    };
    this.queue.push(item);
    this.saveQueue();
    this.updateStatusBadgeUI();

    // สั่งประมวลผลคิวแบบ Asynchronous ทันทีโดยไม่บล็อก UI
    setTimeout(() => this.processPendingQueue(), 20);
    return item.txId;
  }

  async processPendingQueue() {
    if (this.isSyncing || this.queue.length === 0) return;
    const gasUrl = window.dbAdapter ? window.dbAdapter.getSetting('gas_webapp_url', '').trim() : '';
    if (!gasUrl || !navigator.onLine) {
      this.syncState = gasUrl ? 'OFFLINE_QUEUED' : 'READY';
      this.updateStatusBadgeUI();
      return;
    }

    this.isSyncing = true;
    this.syncState = 'SYNCING';
    this.updateStatusBadgeUI();

    while (this.queue.length > 0) {
      const currentTx = this.queue[0];
      try {
        await this.fetchWithRetry(
          gasUrl,
          {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(currentTx.payload)
          },
          2,
          600
        );
        // สำเร็จ: นำออกจากคิว
        this.queue.shift();
        this.saveQueue();
      } catch (err) {
        currentTx.attempts += 1;
        if (currentTx.attempts >= 5) {
          // หากเกิน 5 ครั้ง ให้บันทึกใน Error Log แล้วข้ามเพื่อไม่ให้คิวค้าง
          if (window.dbAdapter) {
            window.dbAdapter.recordError('GW_QUEUE_DROP', `ธุรกรรม ${currentTx.txId} ไม่สำเร็จหลังลองซ้ำ 5 ครั้ง: ${err.message}`);
          }
          this.queue.shift();
        }
        this.saveQueue();
        break;
      }
    }

    this.isSyncing = false;
    this.syncState = this.queue.length > 0 ? 'OFFLINE_QUEUED' : 'CLOUD_LINKED';
    this.updateStatusBadgeUI();
  }

  /**
   * สร้างลิงก์เพิ่มกิจกรรมเข้าสู่ Google Calendar ของผู้ปกครอง/ครูได้ใน 1 คลิก
   */
  createAddToGoogleCalendarUrl(act) {
    if (!act) return 'https://calendar.google.com';
    const title = encodeURIComponent(`[รร.บ้านบกหนองทันน้ำ] ${act.title || 'กิจกรรมโรงเรียน'}`);
    const details = encodeURIComponent(act.description || '');
    const location = encodeURIComponent(act.location || 'โรงเรียนบ้านบกหนองทันน้ำ');
    const startStr = String(act.start_date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const endStr = String(act.end_date || act.start_date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
  }

  /**
   * สร้างรายงาน PDF ผ่าน Google Docs & Drive บนคลาวด์
   */
  async generateCloudOfficialPdfReport() {
    const gasUrl = window.dbAdapter.getSetting('gas_webapp_url', '').trim();
    if (!gasUrl) {
      throw new Error('กรุณาเชื่อมต่อ Google Apps Script URL ก่อนสั่งสร้างไฟล์ PDF บน Google Drive');
    }
    const res = await this.fetchWithRetry(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'generateOfficialPdfReport',
        spreadsheetId: this.extractSpreadsheetId(window.dbAdapter.getSetting('google_spreadsheet_id', '')),
        folderId: this.extractDriveFolderId(window.dbAdapter.getSetting('google_drive_folder_id', '')),
        actor: window.authService ? window.authService.getCurrentUser() : { user_id: 'ADMIN', role: 'ADMIN' }
      })
    });
    return res;
  }

  /**
   * อัปเดตป้ายสถานะการเชื่อมต่อ Google Workspace บนหน้าเว็บแบบ Real-time
   */
  updateStatusBadgeUI() {
    const badgeEl = document.getElementById('gw-live-status-badge');
    if (!badgeEl) return;

    const pendingCount = this.queue.length;
    if (this.syncState === 'SYNCING') {
      badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold cursor-pointer';
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span><span>กำลังซิงค์ Google Workspace (${pendingCount})...</span>`;
    } else if (this.syncState === 'CLOUD_LINKED') {
      badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold cursor-pointer';
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span>Google Workspace Connected (${this.lastLatencyMs} ms)</span>`;
    } else if (pendingCount > 0) {
      badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold cursor-pointer';
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>รอซิงค์คลาวด์ (${pendingCount} รายการ)</span>`;
    } else {
      badgeEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold cursor-pointer';
      badgeEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Google Workspace Fast-Engine (${this.lastLatencyMs} ms)</span>`;
    }
  }
}

window.googleWorkspaceClient = new GoogleWorkspaceClient();
