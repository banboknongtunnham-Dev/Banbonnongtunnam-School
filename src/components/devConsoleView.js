/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - DEVELOPER CONSOLE (Phase 8 & 12)
 * สงวนสิทธิ์เฉพาะผู้พัฒนาระบบสูงสุด (Role: DEVELOPER เท่านั้น)
 * ไม่อนุญาตให้ Public User หรือ Admin ทั่วไปเข้าถึงการตั้งค่าระดับนักพัฒนา
 * ============================================================================
 */

class DevConsoleView {
  constructor() {
    this.activeSection = 'monitoring';
    this.inspectTable = 'School_Profile';
  }

  render() {
    // ตรวจสอบสิทธิ์ระดับ DEVELOPER เท่านั้น (Admin ทั่วไปก็เข้าไม่ได้ตามข้อกำหนด 3.3)
    if (!window.authService.isDeveloper()) {
      return `
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-amber-500/40 shadow-2xl text-center space-y-5">
            <div class="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto">
              <i data-lucide="terminal" class="w-8 h-8"></i>
            </div>
            <span class="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
              SUPER ADMIN / DEVELOPER CLEARANCE REQUIRED
            </span>
            <h2 class="text-2xl font-extrabold">Developer Console (ส่วนของผู้พัฒนาระบบ)</h2>
            <p class="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              หน้าจอนี้สงวนไว้สำหรับผู้พัฒนาระบบ (Developer / Super Admin) ที่ได้รับอนุญาตเท่านั้น ผู้ใช้งานทั่วไปและผู้ดูแลระบบทั่วไป (Admin) ไม่สามารถเข้าถึงการตั้งค่าโครงสร้าง API และฐานข้อมูลระดับนักพัฒนาได้
            </p>
            <div class="flex justify-center gap-3 pt-2">
              <button
                onclick="window.app.openLoginModal('dev-console')"
                class="px-6 py-3 rounded-2xl bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm hover:bg-amber-300 transition cursor-pointer"
              >
                เข้าสู่ระบบด้วยบัญชี Developer
              </button>
              <button
                onclick="window.app.navigate('home')"
                class="px-5 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      `;
    }

    const s = window.dbAdapter.getSettingsMap();
    const syncStatus = window.dbAdapter.lastSyncStatus;
    const errorLogs = window.dbAdapter.getErrorLogs();
    const auditLogs = window.dbAdapter.getTable('Audit_Logs');
    const modules = window.dbAdapter.getTable('System_Modules');
    const allTables = Object.keys(window.dbAdapter.db || {});

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <!-- Developer Console Header -->
        <div class="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-amber-400/40 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              DEVELOPER & SYSTEM ARCHITECT CONSOLE v2.5
            </div>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-white">ศูนย์ควบคุมโครงสร้างระบบและ Google Ecosystem API</h2>
            <p class="text-xs sm:text-sm text-slate-400">
              จัดการการเชื่อมต่อ Google Apps Script, ตรวจสอบสถานะฐานข้อมูล 17 ตาราง, Google Drive Storage, Audit Logs และระบบสำรองข้อมูล
            </p>
          </div>

          <div class="flex flex-wrap gap-2.5">
            <button
              onclick="window.app.testCloudConnection()"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition cursor-pointer"
            >
              <i data-lucide="activity" class="w-4 h-4"></i> ทดสอบสถานะระบบ (Health Check)
            </button>
            <button
              onclick="window.app.downloadFullBackup()"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/15 font-semibold text-xs transition cursor-pointer"
            >
              <i data-lucide="download-cloud" class="w-4 h-4 text-amber-300"></i> สำรองฐานข้อมูล (JSON)
            </button>
          </div>
        </div>

        <!-- Developer Console Sub-navigation -->
        <div class="bg-white rounded-2xl p-2 border border-slate-200 flex flex-wrap gap-2">
          ${[
            { id: 'monitoring', label: '1. System Monitoring & สถานะบริการ', icon: 'cpu' },
            { id: 'api_config', label: '2. ตั้งค่า Google API & Apps Script', icon: 'cloud-cog' },
            { id: 'schema_inspector', label: '3. โครงสร้างฐานข้อมูล 17 ตาราง', icon: 'database' },
            { id: 'logs_backup', label: '4. Audit Logs, Error Logs & สำรองข้อมูล', icon: 'shield-check' }
          ]
            .map(
              (item) => `
              <button
                onclick="window.devConsoleView.activeSection='${item.id}'; window.app.render();"
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  this.activeSection === item.id
                    ? 'bg-slate-900 text-amber-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }"
              >
                <i data-lucide="${item.icon}" class="w-4 h-4"></i>
                <span>${item.label}</span>
              </button>
            `
            )
            .join('')}
        </div>

        <!-- SECTION 1: SYSTEM MONITORING -->
        ${
          this.activeSection === 'monitoring'
            ? `
            <div class="space-y-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-500">สถานะ Google Sheets DB</span>
                    <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">ONLINE (17/17 ตาราง)</span>
                  </div>
                  <div class="text-xl font-extrabold text-slate-900 mt-2">พร้อมใช้งาน 100%</div>
                  <div class="text-xs text-slate-500 mt-1">โหมดการทำงาน: ${syncStatus.mode} (${syncStatus.latencyMs} ms)</div>
                </div>

                <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-500">สถานะคลังไฟล์ Google Drive</span>
                    <span class="px-2.5 py-0.5 rounded-full ${s.enable_google_drive !== 'false' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'} text-[11px] font-bold">
                      ${s.enable_google_drive !== 'false' ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                  <div class="text-xl font-extrabold text-slate-900 mt-2">6 โฟลเดอร์มาตรฐาน</div>
                  <div class="text-xs text-slate-500 mt-1">Folder ID: ${s.google_drive_folder_id || 'Auto-Managed Root'}</div>
                </div>

                <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-500">สถานะ Apps Script API</span>
                    <span class="px-2.5 py-0.5 rounded-full ${s.gas_webapp_url ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} text-[11px] font-bold">
                      ${s.gas_webapp_url ? 'CLOUD LINKED' : 'HYBRID LOCAL READY'}
                    </span>
                  </div>
                  <div class="text-xl font-extrabold text-slate-900 mt-2">${s.gas_webapp_url ? 'เชื่อมต่อ Web App แล้ว' : 'พร้อมผูก URL คลาวด์'}</div>
                  <div class="text-xs text-slate-500 mt-1">ตรวจสอบสิทธิ์ฝั่ง Backend ทุกครั้ง</div>
                </div>

                <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-500">สถานะ Authentication & RBAC</span>
                    <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">SHA-256 + OAUTH</span>
                  </div>
                  <div class="text-xl font-extrabold text-slate-900 mt-2">4 ระดับสิทธิ์ปลอดภัย</div>
                  <div class="text-xs text-slate-500 mt-1">PUBLIC / TEACHER / ADMIN / DEVELOPER</div>
                </div>

                <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-500">สถานะระบบย่อย (Modules)</span>
                    <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                      เปิด ${modules.filter((m) => m.is_enabled).length}/${modules.length} ระบบ
                    </span>
                  </div>
                  <div class="text-xl font-extrabold text-slate-900 mt-2">Teacher Portal Ready</div>
                  <div class="text-xs text-slate-500 mt-1">ซ่อนจากผู้ใช้ทั่วไปอัตโนมัติ</div>
                </div>

                <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-500">ข้อผิดพลาดของระบบ (Error Logs)</span>
                    <span class="px-2.5 py-0.5 rounded-full ${errorLogs.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} text-[11px] font-bold">
                      ${errorLogs.length === 0 ? '0 ERRORS' : errorLogs.length + ' LOGS'}
                    </span>
                  </div>
                  <div class="text-xl font-extrabold text-slate-900 mt-2">${errorLogs.length === 0 ? 'ทำงานปกติสมบูรณ์' : `พบ ${errorLogs.length} รายการ`}</div>
                  <div class="text-xs text-slate-500 mt-1">บันทึก Audit Logs รวม ${auditLogs.length} รายการ</div>
                </div>
              </div>
            </div>
            `
            : ''
        }

        <!-- SECTION 2: GOOGLE API & APPS SCRIPT CONFIGURATION -->
        ${
          this.activeSection === 'api_config'
            ? `
            <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-6">
              <div>
                <h3 class="text-lg font-bold text-slate-900">ตั้งค่าการเชื่อมต่อ Google API, Google Apps Script, Sheets และ Drive</h3>
                <p class="text-xs text-slate-500 mt-1">
                  นำ URL ที่ได้จากการ Deploy ไฟล์ <code>backend/Code.gs</code> และ <code>backend/SetupDatabase.gs</code> มาวางที่นี่เพื่อเชื่อมต่อฐานข้อมูลคลาวด์แบบ Real-time
                </p>
              </div>

              <form onsubmit="window.app.saveDevApiConfigForm(event)" class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Google Apps Script Web App URL (Exec Endpoint)</label>
                  <input type="text" name="gas_webapp_url" value="${window.authService.sanitizeHTML(s.gas_webapp_url || '')}" placeholder="https://script.google.com/macros/s/AKfycb.../exec" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-mono text-xs" />
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Google Spreadsheet ID (17 ตาราง)</label>
                    <input type="text" name="google_spreadsheet_id" value="${window.authService.sanitizeHTML(s.google_spreadsheet_id || '')}" placeholder="เช่น 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs" />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Google Drive Root Folder ID</label>
                    <input type="text" name="google_drive_folder_id" value="${window.authService.sanitizeHTML(s.google_drive_folder_id || '')}" placeholder="โฟลเดอร์หลักเก็บไฟล์ของโรงเรียน" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs" />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Google OAuth 2.0 Client ID</label>
                    <input type="text" name="google_oauth_client_id" value="${window.authService.sanitizeHTML(s.google_oauth_client_id || '')}" placeholder="xxxx.apps.googleusercontent.com" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs" />
                  </div>
                </div>

                <!-- การตั้งค่า LINE Messaging API / OpenChat Webhook -->
                <div class="pt-4 border-t border-slate-100 space-y-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-800">การตั้งค่า LINE API (แจ้งเตือนข้อความติดต่อจากเว็บไซต์เข้า LINE)</h4>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">LINE Channel Access Token (Messaging API)</label>
                      <input type="password" name="line_channel_access_token" value="${window.authService.sanitizeHTML(s.line_channel_access_token || '')}" placeholder="คัดลอกจาก LINE Developers Console" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">LINE Target ID หรือ Group ID (เว้นว่างไว้จะส่ง Broadcast)</label>
                      <input type="text" name="line_target_id" value="${window.authService.sanitizeHTML(s.line_target_id || '')}" placeholder="เช่น Uxxxxxxxxxxxx หรือ Group ID" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs" />
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3 pt-2">
                  <button type="submit" class="px-5 py-2.5 rounded-xl bg-slate-900 text-amber-300 font-bold text-xs hover:bg-slate-800 cursor-pointer">
                    บันทึกการตั้งค่า API Configuration
                  </button>
                  <button type="button" onclick="window.app.syncLocalToCloudNow()" class="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 cursor-pointer">
                    อัปโหลดข้อมูลทั้ง 17 ตารางขึ้น Google Sheets (Push Sync)
                  </button>
                  <button type="button" onclick="window.app.pullCloudToLocalNow()" class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 cursor-pointer">
                    ดึงข้อมูลล่าสุดจาก Google Sheets (Pull Sync)
                  </button>
                </div>
              </form>
            </div>
            `
            : ''
        }

        <!-- SECTION 3: DATABASE SCHEMA INSPECTOR (17 TABLES) -->
        ${
          this.activeSection === 'schema_inspector'
            ? `
            <div class="bg-white rounded-3xl p-6 border border-slate-200 space-y-5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 class="text-lg font-bold text-slate-900">ตรวจสอบโครงสร้างตารางฐานข้อมูล Google Sheets ทั้ง 17 ตาราง</h3>
                  <p class="text-xs text-slate-500">เลือกตารางเพื่อตรวจสอบ Primary Key, คอลัมน์ และข้อมูลภายในตาราง</p>
                </div>
                <select
                  onchange="window.devConsoleView.inspectTable=this.value; window.app.render();"
                  class="px-4 py-2 rounded-xl bg-slate-900 text-amber-300 font-mono text-xs font-bold"
                >
                  ${allTables
                    .map(
                      (t, idx) => `<option value="${t}" ${this.inspectTable === t ? 'selected' : ''}>${idx + 1}. ${t} (${window.dbAdapter.getTable(t).length} แถว)</option>`
                    )
                    .join('')}
                </select>
              </div>

              ${this.renderTableInspector(this.inspectTable)}
            </div>
            `
            : ''
        }

        <!-- SECTION 4: AUDIT LOGS, ERROR LOGS & BACKUP/RESTORE -->
        ${
          this.activeSection === 'logs_backup'
            ? `
            <div class="space-y-6">
              <!-- Backup & Restore Controls -->
              <div class="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 class="text-base font-bold text-slate-900">ระบบสำรองและกู้คืนฐานข้อมูล (Database Backup & Restore)</h3>
                  <p class="text-xs text-slate-500">ดาวน์โหลดฐานข้อมูลทั้ง 17 ตารางเก็บเป็นไฟล์ JSON หรืออัปโหลดไฟล์สำรองเพื่อกู้คืนข้อมูล</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button onclick="window.app.downloadFullBackup()" class="px-4 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">
                    ดาวน์โหลดไฟล์สำรอง (.JSON)
                  </button>
                  <label class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer">
                    <span>นำเข้าไฟล์กู้คืนข้อมูล</span>
                    <input type="file" accept=".json" onchange="window.app.restoreBackupFromFile(event)" class="hidden" />
                  </label>
                  <button onclick="window.app.resetDatabaseConfirm()" class="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer">
                    รีเซ็ตค่าเริ่มต้นโรงงาน
                  </button>
                </div>
              </div>

              <!-- Error Logs -->
              <div class="bg-white rounded-3xl p-6 border border-slate-200">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-base font-bold text-slate-900">Error Logs (${errorLogs.length})</h3>
                  <button onclick="window.dbAdapter.clearErrorLogs(); window.app.render();" class="text-xs text-rose-600 font-semibold hover:underline cursor-pointer">ล้างรายการ Error</button>
                </div>
                ${
                  errorLogs.length === 0
                    ? `<div class="p-6 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-semibold text-center">ไม่พบข้อผิดพลาดในการทำงานของระบบ (0 System Errors)</div>`
                    : `<div class="space-y-2 max-h-48 overflow-y-auto">${errorLogs.map((e) => `<div class="p-2.5 rounded-xl bg-rose-50 text-rose-900 text-xs font-mono">[${e.timestamp}] ${e.code}: ${window.authService.sanitizeHTML(e.message)}</div>`).join('')}</div>`
                }
              </div>

              <!-- Full Audit Logs -->
              <div class="bg-white rounded-3xl p-6 border border-slate-200">
                <h3 class="text-base font-bold text-slate-900 mb-3">Audit_Logs (ประวัติการเปลี่ยนแปลงทั้งหมด ${auditLogs.length} รายการ)</h3>
                <div class="overflow-x-auto max-h-96">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr class="bg-slate-900 text-white sticky top-0">
                        <th class="p-2.5">Log ID</th>
                        <th class="p-2.5">เวลา</th>
                        <th class="p-2.5">ผู้ดำเนินการ</th>
                        <th class="p-2.5">สิทธิ์</th>
                        <th class="p-2.5">Action</th>
                        <th class="p-2.5">ตาราง</th>
                        <th class="p-2.5">รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      ${auditLogs
                        .map(
                          (l) => `
                          <tr class="hover:bg-slate-50">
                            <td class="p-2.5 font-mono text-[10px] text-slate-400">${l.log_id}</td>
                            <td class="p-2.5 font-mono text-[11px]">${new Date(l.timestamp).toLocaleString('th-TH')}</td>
                            <td class="p-2.5 font-bold">${window.authService.sanitizeHTML(l.user_name)}</td>
                            <td class="p-2.5"><span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">${l.user_role}</span></td>
                            <td class="p-2.5 font-mono font-bold">${l.action_type}</td>
                            <td class="p-2.5 font-mono text-amber-800">${l.target_table}</td>
                            <td class="p-2.5 text-slate-600">${window.authService.sanitizeHTML(l.details)}</td>
                          </tr>
                        `
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            `
            : ''
        }
      </div>
    `;
  }

  renderTableInspector(tableName) {
    const rows = window.dbAdapter.getTable(tableName);
    const pk = window.dbAdapter.getPrimaryKeyName(tableName);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [pk];

    return `
      <div class="space-y-3">
        <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <strong>ชื่อตาราง:</strong> <span class="font-mono text-amber-800">${tableName}</span> •
            <strong>Primary Key:</strong> <span class="font-mono text-emerald-700">${pk}</span> •
            <strong>จำนวนข้อมูล:</strong> ${rows.length} แถว
          </div>
          <button onclick="window.app.openGenericModal('${tableName}')" class="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold cursor-pointer">
            + เพิ่มแถวใน ${tableName}
          </button>
        </div>

        <div class="overflow-x-auto max-h-96 border border-slate-200 rounded-2xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-900 text-amber-300 font-mono">
                ${headers.map((h) => `<th class="p-2.5 border-r border-slate-800 whitespace-nowrap">${h}</th>`).join('')}
                <th class="p-2.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${rows
                .map(
                  (r) => `
                  <tr class="hover:bg-amber-50/30">
                    ${headers
                      .map(
                        (h) => `<td class="p-2.5 border-r border-slate-100 max-w-xs truncate font-mono text-[11px]">${window.authService.sanitizeHTML(String(r[h] ?? ''))}</td>`
                      )
                      .join('')}
                    <td class="p-2.5 text-right whitespace-nowrap">
                      <button onclick="window.app.openGenericModal('${tableName}', '${r[pk]}')" class="px-2 py-1 rounded bg-slate-100 hover:bg-amber-100 font-semibold mr-1 cursor-pointer">แก้ไข</button>
                      <button onclick="window.app.deleteRowConfirm('${tableName}', '${r[pk]}')" class="px-2 py-1 rounded bg-rose-50 text-rose-700 font-semibold cursor-pointer">ลบ</button>
                    </td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

window.devConsoleView = new DevConsoleView();
