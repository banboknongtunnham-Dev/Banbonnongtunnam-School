/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - ADMIN CMS DASHBOARD (Phase 3, 8, 9, 11)
 * ระบบผู้ดูแลเว็บไซต์แบบครบวงจร แก้ไขข้อมูลได้ครบทั้ง 17 ตารางโดยไม่ต้องแก้โค้ด
 * ============================================================================
 */

class AdminDashboardView {
  constructor() {
    this.activeTab = 'overview';
  }

  render() {
    if (!window.authService.isAdminOrAbove()) {
      return `
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="bg-white rounded-3xl p-8 sm:p-12 border border-amber-200 shadow-lg text-center space-y-5">
            <div class="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <i data-lucide="shield-alert" class="w-8 h-8"></i>
            </div>
            <h2 class="text-2xl font-extrabold text-slate-900">สำหรับผู้ดูแลระบบ (Administrator Dashboard)</h2>
            <p class="text-sm text-slate-600 max-w-lg mx-auto">
              กรุณาเข้าสู่ระบบด้วยบัญชีระดับ <strong>ADMIN</strong> หรือ <strong>DEVELOPER</strong> เพื่อบริหารจัดการข้อมูลเว็บไซต์โรงเรียนบ้านบกหนองทันน้ำ
            </p>
            <button
              onclick="window.app.openLoginModal('admin')"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 font-bold text-sm transition cursor-pointer"
            >
              <i data-lucide="log-in" class="w-4 h-4 text-amber-400"></i>
              <span>เข้าสู่ระบบผู้ดูแลเว็บไซต์</span>
            </button>
          </div>
        </div>
      `;
    }

    const tabs = [
      { id: 'overview', label: 'ภาพรวมระบบ', icon: 'layout-dashboard' },
      { id: 'school_info', label: 'ข้อมูลโรงเรียน & หลักสูตร', icon: 'school' },
      { id: 'news_cms', label: 'ข่าวสาร & ประกาศ', icon: 'newspaper' },
      { id: 'personnel', label: 'บุคลากร', icon: 'users' },
      { id: 'students_stats', label: 'นักเรียน & สถิติ', icon: 'bar-chart-2' },
      { id: 'activities_gallery', label: 'กิจกรรม & คลังภาพ', icon: 'image' },
      { id: 'documents', label: 'เอกสารดาวน์โหลด', icon: 'file-text' },
      { id: 'modules', label: 'จัดการ Module ครู', icon: 'boxes' },
      { id: 'users', label: 'ผู้ใช้งาน & สิทธิ์', icon: 'user-cog' },
      { id: 'settings', label: 'ตั้งค่าเว็บไซต์ & ธีม', icon: 'palette' }
    ];

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <!-- Admin Top Banner -->
        <div class="bg-white rounded-3xl p-6 border border-amber-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
              <i data-lucide="sliders" class="w-6 h-6"></i>
            </div>
            <div>
              <span class="text-[11px] font-bold text-amber-700 uppercase">ADMINISTRATION & CONTENT MANAGEMENT SYSTEM</span>
              <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900">ระบบบริหารจัดการเว็บไซต์โรงเรียนบ้านบกหนองทันน้ำ</h2>
              <p class="text-xs text-slate-500">เพิ่ม แก้ไข ลบ และอัปเดตข้อมูลทุกหมวดหมู่ลงฐานข้อมูลได้ทันทีโดยไม่ต้องแก้ไข Source Code</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              onclick="window.app.openGoogleWorkspaceHubModal()"
              class="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <i data-lucide="cloud-lightning" class="w-4 h-4"></i> เชื่อมต่อ Google Workspace ด่วน
            </button>
            <button
              onclick="window.app.navigate('home')"
              class="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              ดูหน้าเว็บไซต์จริง
            </button>
            ${
              window.authService.isDeveloper()
                ? `
                <button
                  onclick="window.app.navigate('dev-console')"
                  class="px-3.5 py-2 rounded-xl bg-slate-900 text-amber-400 hover:bg-slate-800 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <i data-lucide="terminal" class="w-3.5 h-3.5"></i> Developer Console
                </button>
                `
                : ''
            }
          </div>
        </div>

        <!-- Admin Navigation Tabs -->
        <div class="bg-white rounded-2xl p-2 border border-slate-200/90 shadow-2xs flex flex-wrap gap-1.5">
          ${tabs
            .map(
              (t) => `
              <button
                onclick="window.adminDashboardView.activeTab='${t.id}'; window.app.render();"
                class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  this.activeTab === t.id
                    ? 'bg-slate-900 text-amber-300 shadow-2xs'
                    : 'text-slate-600 hover:bg-amber-50 hover:text-slate-900'
                }"
              >
                <i data-lucide="${t.icon}" class="w-4 h-4"></i>
                <span>${t.label}</span>
              </button>
            `
            )
            .join('')}
        </div>

        <!-- Active Tab Content -->
        <div>
          ${this.renderActiveTabContent()}
        </div>
      </div>
    `;
  }

  renderActiveTabContent() {
    switch (this.activeTab) {
      case 'overview':
        return this.renderOverviewTab();
      case 'school_info':
        return this.renderSchoolInfoTab();
      case 'news_cms':
        return this.renderNewsCMSTab();
      case 'personnel':
        return this.renderPersonnelTab();
      case 'students_stats':
        return this.renderStudentsStatsTab();
      case 'activities_gallery':
        return this.renderActivitiesGalleryTab();
      case 'documents':
        return this.renderDocumentsTab();
      case 'modules':
        return this.renderModulesTab();
      case 'users':
        return this.renderUsersTab();
      case 'settings':
        return this.renderSettingsTab();
      default:
        return this.renderOverviewTab();
    }
  }

  /**
   * TAB 1: ภาพรวมระบบผู้ดูแลและ Audit Logs ล่าสุด
   */
  renderOverviewTab() {
    const news = window.dbAdapter.getTable('News');
    const personnel = window.dbAdapter.getTable('Personnel');
    const students = window.dbAdapter.getTable('Students_Statistics');
    const modules = window.dbAdapter.getTable('System_Modules');
    const docs = window.dbAdapter.getTable('Documents');
    const logs = window.dbAdapter.getTable('Audit_Logs').slice(0, 10);
    const totalStudents = students.reduce((s, r) => s + Number(r.total_count || 0), 0);

    return `
      <div class="space-y-6">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div onclick="window.adminDashboardView.activeTab='news_cms'; window.app.render();" class="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 cursor-pointer transition">
            <div class="text-xs font-bold text-slate-400">ข่าวประชาสัมพันธ์</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1">${news.length} รายการ</div>
            <div class="text-[11px] text-amber-700 font-semibold mt-1">คลิกเพื่อจัดการข่าว →</div>
          </div>
          <div onclick="window.adminDashboardView.activeTab='personnel'; window.app.render();" class="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 cursor-pointer transition">
            <div class="text-xs font-bold text-slate-400">บุคลากรทั้งหมด</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1">${personnel.length} ท่าน</div>
            <div class="text-[11px] text-amber-700 font-semibold mt-1">คลิกเพื่อจัดการบุคลากร →</div>
          </div>
          <div onclick="window.adminDashboardView.activeTab='students_stats'; window.app.render();" class="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 cursor-pointer transition">
            <div class="text-xs font-bold text-slate-400">จำนวนนักเรียน</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1">${totalStudents} คน</div>
            <div class="text-[11px] text-amber-700 font-semibold mt-1">คลิกเพื่ออัปเดตสถิติ →</div>
          </div>
          <div onclick="window.adminDashboardView.activeTab='documents'; window.app.render();" class="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 cursor-pointer transition">
            <div class="text-xs font-bold text-slate-400">เอกสารดาวน์โหลด</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1">${docs.length} ไฟล์</div>
            <div class="text-[11px] text-amber-700 font-semibold mt-1">คลิกเพื่ออัปโหลดไฟล์ →</div>
          </div>
          <div onclick="window.adminDashboardView.activeTab='modules'; window.app.render();" class="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 cursor-pointer transition">
            <div class="text-xs font-bold text-slate-400">โปรแกรมย่อยครู (Modules)</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1">${modules.length} ระบบ</div>
            <div class="text-[11px] text-amber-700 font-semibold mt-1">คลิกเพื่อเพิ่ม Module →</div>
          </div>
        </div>

        <!-- ประวัติการใช้งานล่าสุด (Audit Logs) -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="history" class="w-5 h-5 text-amber-600"></i>
              ประวัติการดำเนินการล่าสุดในระบบ (Audit_Logs)
            </h3>
            <span class="text-xs text-slate-400">แสดง 10 รายการล่าสุด</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-100 text-slate-700">
                  <th class="p-3 rounded-tl-xl">วัน-เวลา</th>
                  <th class="p-3">ผู้ดำเนินการ</th>
                  <th class="p-3">สิทธิ์</th>
                  <th class="p-3">การกระทำ</th>
                  <th class="p-3">ตารางเป้าหมาย</th>
                  <th class="p-3 rounded-tr-xl">รายละเอียด</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${logs
                  .map(
                    (l) => `
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-mono text-[11px] text-slate-500">${new Date(l.timestamp).toLocaleString('th-TH')}</td>
                      <td class="p-3 font-bold text-slate-800">${window.authService.sanitizeHTML(l.user_name)}</td>
                      <td class="p-3"><span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[10px]">${window.authService.sanitizeHTML(l.user_role)}</span></td>
                      <td class="p-3 font-semibold text-slate-900">${window.authService.sanitizeHTML(l.action_type)}</td>
                      <td class="p-3 font-mono text-slate-600">${window.authService.sanitizeHTML(l.target_table)}</td>
                      <td class="p-3 text-slate-600">${window.authService.sanitizeHTML(l.details)}</td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * TAB 2: จัดการข้อมูลพื้นฐานโรงเรียน ประวัติ อาคาร แหล่งเรียนรู้ และหลักสูตร
   */
  renderSchoolInfoTab() {
    const profile = (window.dbAdapter.getTable('School_Profile')[0]) || {};
    const historyList = window.dbAdapter.getTable('School_History');
    const academicData = window.dbAdapter.getTable('Academic_Data');
    const curriculums = window.dbAdapter.getTable('Curriculum');

    return `
      <div class="space-y-8">
        <!-- ฟอร์มแก้ไขข้อมูลพื้นฐานโรงเรียน (School_Profile) -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <h3 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <i data-lucide="building-2" class="w-5 h-5 text-amber-600"></i>
            1. แก้ไขข้อมูลพื้นฐานสถานศึกษา วิสัยทัศน์ พันธกิจ และข้อมูลติดต่อ (ตาราง School_Profile)
          </h3>
          <form onsubmit="window.app.saveSchoolProfileForm(event)" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">รหัสโรงเรียน 10 หลัก</label>
                <input type="text" name="school_code_10" value="${window.authService.sanitizeHTML(profile.school_code_10 || '1034710083')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono font-bold" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">รหัส Smis 8 หลัก</label>
                <input type="text" name="smis_code_8" value="${window.authService.sanitizeHTML(profile.smis_code_8 || '34020157')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono font-bold" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">รหัส Obec 6 หลัก</label>
                <input type="text" name="obec_code_6" value="${window.authService.sanitizeHTML(profile.obec_code_6 || '710083')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono font-bold" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อสถานศึกษา (ภาษาไทย)</label>
                <input type="text" name="school_name_th" value="${window.authService.sanitizeHTML(profile.school_name_th)}" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อสถานศึกษา (อังกฤษ)</label>
                <input type="text" name="school_name_en" value="${window.authService.sanitizeHTML(profile.school_name_en)}" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">หน่วยงานต้นสังกัด</label>
                <input type="text" name="affiliation" value="${window.authService.sanitizeHTML(profile.affiliation)}" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">ประเภทสถานศึกษา</label>
                <input type="text" name="school_type" value="${window.authService.sanitizeHTML(profile.school_type)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">ระดับที่เปิดสอน</label>
                <input type="text" name="education_level" value="${window.authService.sanitizeHTML(profile.education_level)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">วัน-เดือน-ปี ก่อตั้ง</label>
                <input type="text" name="established_date" value="${window.authService.sanitizeHTML(profile.established_date || '12052512')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้อำนวยการโรงเรียน</label>
                <input type="text" name="director_name" value="${window.authService.sanitizeHTML(profile.director_name)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">อัตลักษณ์สถานศึกษา</label>
                <input type="text" name="identity" value="${window.authService.sanitizeHTML(profile.identity)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">เอกลักษณ์สถานศึกษา</label>
                <input type="text" name="uniqueness" value="${window.authService.sanitizeHTML(profile.uniqueness)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div class="md:col-span-3">
                <label class="block text-xs font-bold text-slate-700 mb-1">คำขวัญของโรงเรียน</label>
                <input type="text" name="motto" value="${window.authService.sanitizeHTML(profile.motto)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">วิสัยทัศน์ (Vision - เว้นว่างได้โดยใส่ -)</label>
                <textarea name="vision" rows="3" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm">${window.authService.sanitizeHTML(profile.vision)}</textarea>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">พันธกิจ (Mission)</label>
                <textarea name="mission" rows="3" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm">${window.authService.sanitizeHTML(profile.mission)}</textarea>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">สารจากผู้อำนวยการโรงเรียน</label>
              <textarea name="director_message" rows="2" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm">${window.authService.sanitizeHTML(profile.director_message)}</textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-slate-700 mb-1">ที่อยู่โรงเรียน</label>
                <input type="text" name="address" value="${window.authService.sanitizeHTML(profile.address)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">โทรศัพท์</label>
                <input type="text" name="phone" value="${window.authService.sanitizeHTML(profile.phone)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">โทรสาร</label>
                <input type="text" name="fax" value="${window.authService.sanitizeHTML(profile.fax || '-')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">อีเมลโรงเรียน</label>
                <input type="text" name="email" value="${window.authService.sanitizeHTML(profile.email)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">เว็บไซต์โรงเรียน</label>
                <input type="text" name="website_url" value="${window.authService.sanitizeHTML(profile.website_url || 'http://www.banbok-ntn.ac.th')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">ลิงก์เพจ Facebook โรงเรียน</label>
                <input type="text" name="facebook_url" value="${window.authService.sanitizeHTML(profile.facebook_url || 'https://www.facebook.com/profile.php?id=100014526581847')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">LINE OA</label>
                <input type="text" name="line_oa" value="${window.authService.sanitizeHTML(profile.line_oa || '-')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">กลุ่มโรงเรียน</label>
                <input type="text" name="school_group" value="${window.authService.sanitizeHTML(profile.school_group || '-')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">องค์กรปกครองส่วนท้องถิ่น (อปท.)</label>
                <input type="text" name="local_gov" value="${window.authService.sanitizeHTML(profile.local_gov || 'หนองทันน้ำ')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">ระยะทางจาก รร. ถึง สพท.</label>
                <input type="text" name="distance_to_area_office" value="${window.authService.sanitizeHTML(profile.distance_to_area_office || '30 กม.')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">ระยะทาง รร. ถึง อำเภอ</label>
                <input type="text" name="distance_to_district" value="${window.authService.sanitizeHTML(profile.distance_to_district || '10 กม.')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
            </div>

            <button type="submit" class="px-6 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 font-bold text-xs sm:text-sm transition cursor-pointer">
              บันทึกข้อมูลพื้นฐานโรงเรียน (School_Profile)
            </button>
          </form>
        </div>

        <!-- จัดการประวัติโรงเรียน (School_History) -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-900">2. จัดการประวัติความเป็นมาของโรงเรียน (ตาราง School_History)</h3>
            <button onclick="window.app.openGenericModal('School_History')" class="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 cursor-pointer">+ เพิ่มช่วงเวลาประวัติ</button>
          </div>
          <div class="space-y-2">
            ${historyList
              .map(
                (h) => `
                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-bold">${window.authService.sanitizeHTML(h.year_be)}</span>
                    <strong class="text-xs sm:text-sm text-slate-900 ml-2">${window.authService.sanitizeHTML(h.title)}</strong>
                    <p class="text-xs text-slate-500 mt-1">${window.authService.sanitizeHTML(h.description)}</p>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button onclick="window.app.openGenericModal('School_History', '${h.history_id}')" class="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold hover:border-amber-400 cursor-pointer">แก้ไข</button>
                    <button onclick="window.app.deleteRowConfirm('School_History', '${h.history_id}')" class="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 cursor-pointer">ลบ</button>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        </div>

        <!-- จัดการข้อมูลอาคาร แหล่งเรียนรู้ รางวัล และประกันคุณภาพ (Academic_Data) -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-900">3. จัดการข้อมูลอาคารสถานที่ แหล่งเรียนรู้ รางวัล และประกันคุณภาพ (ตาราง Academic_Data)</h3>
            <button onclick="window.app.openGenericModal('Academic_Data')" class="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 cursor-pointer">+ เพิ่มข้อมูลวิชาการ/อาคาร/รางวัล</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${academicData
              .map(
                (a) => `
                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                  <div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">${window.authService.sanitizeHTML(a.category)}</span>
                    <h4 class="text-xs sm:text-sm font-bold text-slate-900 mt-1">${window.authService.sanitizeHTML(a.title)}</h4>
                    <p class="text-xs text-slate-500 mt-1">${window.authService.sanitizeHTML(a.description)}</p>
                  </div>
                  <div class="flex gap-1 shrink-0">
                    <button onclick="window.app.openGenericModal('Academic_Data', '${a.academic_id}')" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold cursor-pointer">แก้ไข</button>
                    <button onclick="window.app.deleteRowConfirm('Academic_Data', '${a.academic_id}')" class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold cursor-pointer">ลบ</button>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        </div>

        <!-- จัดการหลักสูตรสถานศึกษา (Curriculum) -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-900">4. จัดการโครงสร้างหลักสูตรสถานศึกษา (ตาราง Curriculum)</h3>
            <button onclick="window.app.openGenericModal('Curriculum')" class="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 cursor-pointer">+ เพิ่มหลักสูตร</button>
          </div>
          <div class="space-y-2">
            ${curriculums
              .map(
                (c) => `
                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-bold">${window.authService.sanitizeHTML(c.level_group)}</span>
                    <strong class="text-xs sm:text-sm text-slate-900 ml-2">${window.authService.sanitizeHTML(c.title)}</strong>
                    <p class="text-xs text-slate-500 mt-1">${window.authService.sanitizeHTML(c.description)}</p>
                  </div>
                  <div class="flex gap-1.5 shrink-0">
                    <button onclick="window.app.openGenericModal('Curriculum', '${c.curriculum_id}')" class="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold cursor-pointer">แก้ไข</button>
                    <button onclick="window.app.deleteRowConfirm('Curriculum', '${c.curriculum_id}')" class="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold cursor-pointer">ลบ</button>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * TAB 3: จัดการข่าวประชาสัมพันธ์ (News) และประกาศโรงเรียน (Announcements)
   */
  renderNewsCMSTab() {
    const newsList = window.dbAdapter.getTable('News');
    const annList = window.dbAdapter.getTable('Announcements');

    return `
      <div class="space-y-8">
        <!-- ข่าวประชาสัมพันธ์ -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 class="text-lg font-bold text-slate-900">ระบบจัดการข่าวประชาสัมพันธ์ & สไลด์ภาพหน้าเว็บ (Spotlight CMS)</h3>
              <p class="text-xs text-slate-500">รองรับการจัดการสไลด์ภาพผลงานครู/นักเรียน/ประชาสัมพันธ์, ฝังลิงก์โพสต์ Facebook และปักหมุดข่าวเด่น</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                onclick="window.app.handleAdminSlideAddClick()"
                class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-extrabold transition cursor-pointer"
              >
                <i data-lucide="image-plus" class="w-4 h-4"></i> + จัดการ/เพิ่มสไลด์ประชาสัมพันธ์
              </button>
              <button
                onclick="window.app.openNewsEditorModal()"
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                <i data-lucide="plus" class="w-4 h-4"></i> + เขียนข่าว / ฝังลิงก์ Facebook
              </button>
            </div>
          </div>

          <div class="space-y-3">
            ${newsList
              .map(
                (n) => `
                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div class="flex items-start gap-3.5 min-w-0">
                    <img src="${window.driveService.resolveDriveImageUrl(n.cover_image_url)}" alt="ปกข่าว" class="w-20 h-14 rounded-xl object-cover bg-slate-200 shrink-0" onerror="this.src='assets/img/logo.png'" />
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-1.5">
                        ${n.is_pinned ? `<span class="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-extrabold">📌 ปักหมุด</span>` : ''}
                        <span class="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-semibold">${window.authService.sanitizeHTML(n.category)}</span>
                        <span class="text-[11px] text-slate-400">📅 ${window.authService.sanitizeHTML(n.published_at)} • ผู้สร้าง: ${window.authService.sanitizeHTML(n.author_name)}</span>
                      </div>
                      <h4 class="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">${window.authService.sanitizeHTML(n.title)}</h4>
                      <p class="text-xs text-slate-500 truncate">${window.authService.sanitizeHTML(n.summary)}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button onclick="window.app.toggleNewsPin('${n.news_id}')" class="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold cursor-pointer">
                      ${n.is_pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
                    </button>
                    <button onclick="window.app.openNewsEditorModal('${n.news_id}')" class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-amber-400 text-xs font-semibold cursor-pointer">แก้ไข</button>
                    <button onclick="window.app.deleteRowConfirm('News', '${n.news_id}')" class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold cursor-pointer">ลบ</button>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        </div>

        <!-- ประกาศโรงเรียน -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-900">จัดการประกาศทางราชการและแถบข่าววิ่ง (Announcements)</h3>
            <button onclick="window.app.openGenericModal('Announcements')" class="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer">+ เพิ่มประกาศใหม่</button>
          </div>
          <div class="space-y-2.5">
            ${annList
              .map(
                (a) => `
                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">${window.authService.sanitizeHTML(a.category)}</span>
                    <strong class="text-xs sm:text-sm text-slate-900 ml-2">${window.authService.sanitizeHTML(a.title)}</strong>
                    <p class="text-xs text-slate-500 mt-0.5">${window.authService.sanitizeHTML(a.description)}</p>
                  </div>
                  <div class="flex gap-1.5 shrink-0">
                    <button onclick="window.app.openGenericModal('Announcements', '${a.announce_id}')" class="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold cursor-pointer">แก้ไข</button>
                    <button onclick="window.app.deleteRowConfirm('Announcements', '${a.announce_id}')" class="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold cursor-pointer">ลบ</button>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * TAB 4: จัดการบุคลากร (Personnel - ภาพด้านบน ชื่อและตำแหน่งด้านล่าง)
   */
  renderPersonnelTab() {
    const personnel = window.dbAdapter.getTable('Personnel').sort((a, b) => Number(a.sort_order || 99) - Number(b.sort_order || 99));

    return `
      <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold">
              จำนวนบุคลากรรวมทั้งหมด ${personnel.length} ท่าน
            </span>
            <h3 class="text-lg font-bold text-slate-900 mt-1.5">จัดการทำเนียบผู้บริหาร ครู และบุคลากร (ตาราง Personnel)</h3>
            <p class="text-xs text-slate-500">คลิกปุ่ม "แก้ไข / เปลี่ยนรูปภาพ" เพื่ออัปโหลดรูปถ่ายและแก้ไขชื่อ-ตำแหน่งได้ทันที</p>
          </div>
          <div class="flex flex-wrap items-center gap-2.5">
            <button
              onclick="window.app.openPersonnelModal()"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <i data-lucide="user-plus" class="w-4 h-4"></i>
              <span>+ เพิ่มบุคลากรใหม่</span>
            </button>
            <button
              onclick="window.app.saveAndConfirmPersonnelData()"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title="บันทึกยืนยันข้อมูลบุคลากรทั้งหมดลงสู่ฐานข้อมูลหลัก"
            >
              <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-200"></i>
              <span>บันทึกยืนยันข้อมูลบุคลากร</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          ${personnel
            .map((p) => {
              const hasCustomPhoto = Boolean(p.photo_url && String(p.photo_url).trim() !== '' && String(p.photo_url).trim() !== 'assets/img/logo.png');
              const imgUrl = hasCustomPhoto ? window.driveService.resolveDriveImageUrl(p.photo_url) : 'assets/img/logo.png';
              return `
                <div class="rounded-3xl bg-slate-50 border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-amber-400 transition">
                  <!-- ภาพด้านบน -->
                  <div class="aspect-3/4 bg-white border-b border-slate-200/70 relative flex items-center justify-center overflow-hidden">
                    ${
                      hasCustomPhoto
                        ? `<img src="${imgUrl}" alt="${window.authService.sanitizeHTML(p.first_name)}" class="w-full h-full object-cover object-top" onerror="this.src='assets/img/logo.png'" />`
                        : `
                        <div class="text-center p-4">
                          <img src="assets/img/logo.png" alt="รอรูปภาพ" class="w-16 h-16 mx-auto object-contain opacity-35 mb-2" />
                          <span class="text-[11px] text-slate-400 font-semibold block">เว้นว่างรอรูปภาพ</span>
                        </div>
                        `
                    }
                    <span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 text-amber-300 text-[10px] font-bold">#${p.sort_order || '-'}</span>
                  </div>

                  <!-- ชื่อและตำแหน่งด้านล่าง -->
                  <div class="p-4 text-center space-y-1 bg-white flex-1 flex flex-col justify-between">
                    <div>
                      <div class="text-sm font-extrabold text-slate-900">${window.authService.sanitizeHTML(p.prefix + p.first_name + ' ' + p.last_name)}</div>
                      <div class="text-xs font-bold text-amber-700 mt-0.5">ตำแหน่ง ${window.authService.sanitizeHTML(p.position)}</div>
                      <div class="text-[11px] text-slate-500 mt-0.5">วิทยฐานะ ${window.authService.sanitizeHTML(p.academic_standing || '-')}</div>
                    </div>

                    <div class="pt-3 mt-3 border-t border-slate-100 flex items-center gap-1.5">
                      <button onclick="window.app.openPersonnelModal('${p.personnel_id}')" class="flex-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-400 text-amber-900 hover:text-slate-950 border border-amber-200 text-xs font-bold transition cursor-pointer">
                        แก้ไข / เปลี่ยนรูป
                      </button>
                      <button onclick="window.app.deleteRowConfirm('Personnel', '${p.personnel_id}')" class="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer">
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  /**
   * TAB 5: จัดการข้อมูลนักเรียน (Students_Statistics) และสถิติ KPI (School_Statistics)
   */
  renderStudentsStatsTab() {
    const students = window.dbAdapter.getTable('Students_Statistics');
    const kpis = window.dbAdapter.getTable('School_Statistics');

    return `
      <div class="space-y-8">
        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">จัดการข้อมูลจำนวนนักเรียนแยกตามระดับชั้น (Students_Statistics)</h3>
              <p class="text-xs text-slate-500">เมื่อแก้ไขจำนวนนักเรียนชาย/หญิง ระบบจะคำนวณยอดรวมและอัปเดตกราฟในหน้า Dashboard ทันที</p>
            </div>
            <button onclick="window.app.openStudentStatModal()" class="px-4 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">+ เพิ่มชั้นเรียน/ปีการศึกษา</button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-900 text-white">
                  <th class="p-3 rounded-tl-xl">ปีการศึกษา/ภาคเรียน</th>
                  <th class="p-3">ระดับชั้น</th>
                  <th class="p-3 text-center">ห้องเรียน</th>
                  <th class="p-3 text-center">ชาย (คน)</th>
                  <th class="p-3 text-center">หญิง (คน)</th>
                  <th class="p-3 text-center">รวม (คน)</th>
                  <th class="p-3 text-right rounded-tr-xl">จัดการ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${students
                  .map(
                    (s) => `
                    <tr class="hover:bg-amber-50/40">
                      <td class="p-3 font-semibold">${s.academic_year} / ${s.semester}</td>
                      <td class="p-3 font-bold text-slate-900">${window.authService.sanitizeHTML(s.grade_level)} <span class="text-slate-400 font-normal">(${window.authService.sanitizeHTML(s.level_group)})</span></td>
                      <td class="p-3 text-center">${s.classrooms}</td>
                      <td class="p-3 text-center font-bold text-sky-700">${s.male_count}</td>
                      <td class="p-3 text-center font-bold text-rose-700">${s.female_count}</td>
                      <td class="p-3 text-center font-extrabold bg-amber-50/60">${s.total_count}</td>
                      <td class="p-3 text-right space-x-1">
                        <button onclick="window.app.openStudentStatModal('${s.stat_id}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-100 font-semibold cursor-pointer">แก้ไข</button>
                        <button onclick="window.app.deleteRowConfirm('Students_Statistics', '${s.stat_id}')" class="px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-semibold cursor-pointer">ลบ</button>
                      </td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-base font-bold text-slate-900">จัดการกราฟจำนวนนักเรียน 3 ปีย้อนหลัง (2567–2569) และตัวชี้วัด KPI (ตาราง School_Statistics)</h3>
              <p class="text-xs text-slate-500">คลิกปุ่ม "แก้ไขจำนวนนักเรียน 3 ปีย้อนหลัง" เพื่ออัปเดตตัวเลขปีการศึกษา 2569 (285 คน), 2568 (-), 2567 (-)</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="window.app.openThreeYearStudentModal()" class="px-3.5 py-2 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold cursor-pointer">
                📊 แก้ไขจำนวนนักเรียน 3 ปีย้อนหลัง
              </button>
              <button onclick="window.app.openGenericModal('School_Statistics')" class="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer">+ เพิ่มตัวชี้วัด KPI</button>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${kpis
              .map(
                (k) => `
                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">ปี ${k.academic_year} • ${k.metric_group}</span>
                    <div class="text-xs sm:text-sm font-bold text-slate-900 mt-1">${window.authService.sanitizeHTML(k.metric_name)}: <span class="text-amber-700">${k.metric_value} ${k.metric_unit}</span> (เป้า: ${k.target_value})</div>
                  </div>
                  <div class="flex gap-1 shrink-0">
                    <button onclick="window.app.openGenericModal('School_Statistics', '${k.kpi_id}')" class="px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-semibold cursor-pointer">แก้ไข</button>
                    <button onclick="window.app.deleteRowConfirm('School_Statistics', '${k.kpi_id}')" class="px-2.5 py-1 rounded bg-rose-50 text-rose-700 text-xs font-semibold cursor-pointer">ลบ</button>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * TAB 6: จัดการกิจกรรม (Activities) และคลังภาพ (Gallery)
   */
  renderActivitiesGalleryTab() {
    const gallery = window.dbAdapter.getTable('Gallery');
    const activities = window.dbAdapter.getTable('Activities');

    return `
      <div class="space-y-8">
        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">คลังภาพกิจกรรม & สไลด์โอกาสสำคัญของนักเรียน (Gallery เชื่อมต่อ Google Drive)</h3>
              <p class="text-xs text-slate-500">อัปโหลดภาพขึ้นเป็นสไลด์มือโปรหน้าแรกสำหรับโอกาสสำคัญของนักเรียน หรือเพิ่มเข้าคลังภาพกิจกรรม</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="window.app.openSlideUploadModal()" class="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-extrabold cursor-pointer">
                ✨ + อัปโหลดภาพสไลด์โอกาสสำคัญนักเรียน
              </button>
              <button onclick="window.app.openGalleryUploadModal()" class="px-4 py-2.5 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">+ อัปโหลดรูปภาพกิจกรรม</button>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${gallery
              .map(
                (g) => `
                <div class="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col justify-between">
                  <img src="${window.driveService.resolveDriveImageUrl(g.image_url)}" alt="${window.authService.sanitizeHTML(g.title)}" class="w-full h-36 object-cover bg-slate-200" onerror="this.src='assets/img/logo.png'" />
                  <div class="p-3.5">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">${window.authService.sanitizeHTML(g.category)}</span>
                    <h4 class="text-xs font-bold text-slate-900 mt-1 line-clamp-1">${window.authService.sanitizeHTML(g.title)}</h4>
                    <div class="mt-2 pt-2 border-t border-slate-200/60 flex justify-end gap-1.5">
                      <button onclick="window.app.openSlideUploadModal('${g.gallery_id}')" class="px-2.5 py-1 rounded bg-white border border-slate-200 hover:border-amber-400 text-xs font-semibold cursor-pointer">แก้ไข / เปลี่ยนภาพ</button>
                      <button onclick="window.app.deleteRowConfirm('Gallery', '${g.gallery_id}')" class="px-2.5 py-1 rounded bg-rose-50 text-rose-700 text-xs font-semibold cursor-pointer">ลบ</button>
                    </div>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        </div>

        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-900">ปฏิทินกิจกรรมโรงเรียน (ตาราง Activities)</h3>
            <button onclick="window.app.openGenericModal('Activities')" class="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer">+ เพิ่มกิจกรรมใหม่</button>
          </div>
          <div class="space-y-2.5">
            ${activities
              .map(
                (act) => `
                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-bold">${window.authService.sanitizeHTML(act.start_date)}</span>
                    <strong class="text-xs sm:text-sm text-slate-900 ml-2">${window.authService.sanitizeHTML(act.title)}</strong>
                    <span class="text-xs text-slate-500 ml-2">(${window.authService.sanitizeHTML(act.location)})</span>
                  </div>
                  <div class="flex gap-1.5 shrink-0">
                    <button onclick="window.app.openGenericModal('Activities', '${act.activity_id}')" class="px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-semibold cursor-pointer">แก้ไข</button>
                    <button onclick="window.app.deleteRowConfirm('Activities', '${act.activity_id}')" class="px-2.5 py-1 rounded bg-rose-50 text-rose-700 text-xs font-semibold cursor-pointer">ลบ</button>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * TAB 7: จัดการเอกสารเผยแพร่ (Documents)
   */
  renderDocumentsTab() {
    const docs = window.dbAdapter.getTable('Documents');

    return `
      <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900">จัดการเอกสารเผยแพร่ รายงาน SAR และแบบฟอร์มครู (ตาราง Documents)</h3>
            <p class="text-xs text-slate-500">อัปโหลดไฟล์ PDF/DOCX เข้าสู่ Google Drive พร้อมกำหนดสิทธิ์การดาวน์โหลด (PUBLIC หรือ เฉพาะ TEACHER)</p>
          </div>
          <button onclick="window.app.openDocumentUploadModal()" class="px-4 py-2.5 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">+ อัปโหลดเอกสารใหม่</button>
        </div>

        <div class="space-y-2.5">
          ${docs
            .map(
              (d) => `
              <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">${window.authService.sanitizeHTML(d.category)}</span>
                    <span class="px-2 py-0.5 rounded ${d.access_level === 'TEACHER' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'} text-[10px] font-bold">สิทธิ์: ${d.access_level}</span>
                    <span class="text-xs text-slate-400">ปีการศึกษา ${window.authService.sanitizeHTML(d.academic_year)}</span>
                  </div>
                  <h4 class="text-xs sm:text-sm font-bold text-slate-900 mt-1">${window.authService.sanitizeHTML(d.title)}</h4>
                  <div class="text-[11px] text-slate-500">ขนาด: ${d.file_size} • ดาวน์โหลด: ${d.download_count || 0} ครั้ง</div>
                </div>
                <div class="flex gap-1.5 shrink-0">
                  <button onclick="window.app.openGenericModal('Documents', '${d.doc_id}')" class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold cursor-pointer">แก้ไข</button>
                  <button onclick="window.app.deleteRowConfirm('Documents', '${d.doc_id}')" class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold cursor-pointer">ลบ</button>
                </div>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  /**
   * TAB 8: ระบบจัดการโปรแกรมย่อยของครู (Module Management)
   */
  renderModulesTab() {
    const modules = window.dbAdapter.getTable('System_Modules').sort((a, b) => Number(a.sort_order || 99) - Number(b.sort_order || 99));

    return `
      <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span class="text-xs font-bold text-amber-700 uppercase">CORE MODULE MANAGEMENT ENGINE</span>
            <h3 class="text-lg font-bold text-slate-900">บริหารจัดการระบบย่อยสำหรับครูและบุคลากร (ตาราง System_Modules)</h3>
            <p class="text-xs text-slate-500">เพิ่มโปรแกรมย่อยใหม่ แก้ไขไอคอน เปลี่ยน URL เปิด/ปิดการใช้งาน กำหนดสิทธิ์ และจัดลำดับการแสดงผลโดยไม่ต้องสร้างเว็บใหม่</p>
          </div>
          <button
            onclick="window.app.openModuleFormModal()"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer"
          >
            <i data-lucide="plus-circle" class="w-4 h-4"></i> เพิ่ม Module ใหม่
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-900 text-white">
                <th class="p-3 rounded-tl-xl">ลำดับ</th>
                <th class="p-3">รหัส / ชื่อโปรแกรมย่อย (Module)</th>
                <th class="p-3">หมวดหมู่</th>
                <th class="p-3">การเปิดหน้า</th>
                <th class="p-3">สิทธิ์ขั้นต่ำ</th>
                <th class="p-3 text-center">สถานะ</th>
                <th class="p-3 text-right rounded-tr-xl">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${modules
                .map(
                  (m) => `
                  <tr class="hover:bg-amber-50/30">
                    <td class="p-3 font-bold text-slate-700">#${m.sort_order}</td>
                    <td class="p-3">
                      <div class="font-bold text-slate-900">${window.authService.sanitizeHTML(m.module_code)}: ${window.authService.sanitizeHTML(m.module_name)}</div>
                      <div class="text-[11px] text-slate-400 font-mono truncate max-w-xs">URL: ${window.authService.sanitizeHTML(m.target_url)}</div>
                    </td>
                    <td class="p-3 text-slate-600">${window.authService.sanitizeHTML(m.category)}</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">${m.open_mode === 'NEW_TAB' ? 'แท็บใหม่' : 'ในหน้าเดียวกัน'}</span></td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold">${m.min_role}</span></td>
                    <td class="p-3 text-center">
                      <button
                        onclick="window.app.toggleModuleStatus('${m.module_id}')"
                        class="px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                          m.is_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                        }"
                      >
                        ${m.is_enabled ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'}
                      </button>
                    </td>
                    <td class="p-3 text-right space-x-1">
                      <button onclick="window.app.openModuleFormModal('${m.module_id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 font-semibold cursor-pointer">แก้ไข</button>
                      <button onclick="window.app.deleteRowConfirm('System_Modules', '${m.module_id}')" class="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold cursor-pointer">ลบ</button>
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

  /**
   * TAB 9: จัดการผู้ใช้งานและสิทธิ์ RBAC (User_Accounts & User_Roles)
   */
  renderUsersTab() {
    const users = window.dbAdapter.getTable('User_Accounts');
    const roles = window.dbAdapter.getTable('User_Roles');

    return `
      <div class="space-y-8">
        <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">จัดการบัญชีผู้ใช้งานและสิทธิ์การเข้าถึง (RBAC User Management)</h3>
              <p class="text-xs text-slate-500">รหัสผ่านทุกบัญชีถูกเข้ารหัสด้วย SHA-256 + Salt ก่อนบันทึกลงตาราง User_Accounts (ไม่เก็บ Plaintext)</p>
            </div>
            <button onclick="window.app.openUserModal()" class="px-4 py-2.5 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">+ เพิ่มบัญชีผู้ใช้ใหม่</button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-900 text-white">
                  <th class="p-3 rounded-tl-xl">ชื่อ-นามสกุล / ตำแหน่ง</th>
                  <th class="p-3">ชื่อผู้ใช้ (Username)</th>
                  <th class="p-3">อีเมล (สำหรับ Google Auth)</th>
                  <th class="p-3">ระดับสิทธิ์ (Role)</th>
                  <th class="p-3">การเข้ารหัสรหัสผ่าน</th>
                  <th class="p-3 text-right rounded-tr-xl">จัดการ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${users
                  .map(
                    (u) => `
                    <tr class="hover:bg-amber-50/30">
                      <td class="p-3">
                        <div class="font-bold text-slate-900">${window.authService.sanitizeHTML(u.full_name)}</div>
                        <div class="text-[11px] text-slate-500">${window.authService.sanitizeHTML(u.position)}</div>
                      </td>
                      <td class="p-3 font-mono font-bold text-slate-800">${window.authService.sanitizeHTML(u.username)}</td>
                      <td class="p-3 text-slate-600">${window.authService.sanitizeHTML(u.email)}</td>
                      <td class="p-3"><span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px]">${window.authService.sanitizeHTML(u.role_id)}</span></td>
                      <td class="p-3 font-mono text-[10px] text-emerald-700">SHA-256 (${String(u.password_hash).slice(0, 12)}...)</td>
                      <td class="p-3 text-right space-x-1">
                        <button onclick="window.app.openUserModal('${u.user_id}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-100 font-semibold cursor-pointer">แก้ไข/เปลี่ยนรหัส</button>
                        <button onclick="window.app.deleteRowConfirm('User_Accounts', '${u.user_id}')" class="px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-semibold cursor-pointer">ลบ</button>
                      </td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${roles
            .map(
              (r) => `
              <div class="bg-white p-5 rounded-2xl border border-slate-200">
                <span class="px-2.5 py-0.5 rounded bg-slate-900 text-amber-300 text-[10px] font-bold">Level ${r.access_level}: ${r.role_code}</span>
                <h4 class="text-sm font-bold text-slate-900 mt-2">${window.authService.sanitizeHTML(r.role_name_th)}</h4>
                <p class="text-xs text-slate-500 mt-1">${window.authService.sanitizeHTML(r.description)}</p>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  /**
   * TAB 10: ตั้งค่าเว็บไซต์ ธีมสี ฟอนต์ แบนเนอร์ และเปิด/ปิดบริการ Google (Website Configuration)
   */
  renderSettingsTab() {
    const s = window.dbAdapter.getSettingsMap();

    return `
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <div class="mb-6">
          <span class="text-xs font-bold text-amber-700 uppercase">DYNAMIC WEBSITE & THEME CONFIGURATION</span>
          <h3 class="text-lg font-bold text-slate-900">ตั้งค่าระบบเว็บไซต์ ธีมสี ฟอนต์ แบนเนอร์ และบริการ Google (ตาราง System_Settings)</h3>
          <p class="text-xs text-slate-500">ปรับแต่งสีหลัก สีเหลืองทองเน้นรายละเอียด ฟอนต์ โลโก้ ภาพแบนเนอร์ และการเปิด/ปิดโมดูลบริการ Google ได้ทันที</p>
        </div>

        <form onsubmit="window.app.saveWebsiteSettingsForm(event)" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อเว็บไซต์บนแท็บเบราว์เซอร์ (Site Title)</label>
              <input type="text" name="site_title" value="${window.authService.sanitizeHTML(s.site_title || '')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">URL โลโก้โรงเรียน (หรือลิงก์ Google Drive)</label>
              <input type="text" name="logo_url" value="${window.authService.sanitizeHTML(s.logo_url || 'assets/img/logo.png')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">หัวข้อต้อนรับหน้าแรก (Hero Title)</label>
              <input type="text" name="hero_welcome_title" value="${window.authService.sanitizeHTML(s.hero_welcome_title || '')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">URL ภาพแบนเนอร์หน้าแรก (Hero Banner Image)</label>
              <input type="text" name="hero_banner_image" value="${window.authService.sanitizeHTML(s.hero_banner_image || '')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ข้อความต้อนรับหน้าแรก (Hero Subtitle)</label>
            <input type="text" name="hero_welcome_subtitle" value="${window.authService.sanitizeHTML(s.hero_welcome_subtitle || '')}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
          </div>

          <!-- ปรับแต่งธีมสีและฟอนต์ -->
          <div class="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ฟอนต์หลักของเว็บไซต์</label>
              <select name="theme_font_family" class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold">
                <option value="Prompt" ${s.theme_font_family === 'Prompt' ? 'selected' : ''}>Prompt (โมเดิร์น ทันสมัย)</option>
                <option value="Sarabun" ${s.theme_font_family === 'Sarabun' ? 'selected' : ''}>Sarabun (มาตรฐานราชการไทย)</option>
                <option value="Kanit" ${s.theme_font_family === 'Kanit' ? 'selected' : ''}>Kanit (คมชัด ร่วมสมัย)</option>
                <option value="Noto Sans Thai" ${s.theme_font_family === 'Noto Sans Thai' ? 'selected' : ''}>Noto Sans Thai (Google Standard)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">สีพื้นหลังหลัก (White Theme)</label>
              <input type="color" name="theme_primary_bg" value="${s.theme_primary_bg || '#FFFFFF'}" class="w-full h-10 rounded-xl border border-slate-200 cursor-pointer bg-white p-1" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">สีเน้นรายละเอียด (Yellow/Gold Accent)</label>
              <input type="color" name="theme_accent_gold" value="${s.theme_accent_gold || '#D97706'}" class="w-full h-10 rounded-xl border border-slate-200 cursor-pointer bg-white p-1" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">สีหัวข้อหลัก (Navy Contrast)</label>
              <input type="color" name="theme_accent_navy" value="${s.theme_accent_navy || '#0F172A'}" class="w-full h-10 rounded-xl border border-slate-200 cursor-pointer bg-white p-1" />
            </div>
          </div>

          <!-- สวิตช์เปิด-ปิดบริการ Google -->
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 class="text-sm font-bold text-slate-900">การเปิด/ปิดการแสดงผลบริการ Google Services</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <label class="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <input type="checkbox" name="enable_google_drive" ${s.enable_google_drive !== 'false' ? 'checked' : ''} class="w-4 h-4 accent-amber-500" />
                <span class="font-semibold text-slate-800">เชื่อมต่อคลังไฟล์ Google Drive</span>
              </label>
              <label class="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <input type="checkbox" name="enable_google_sheets" ${s.enable_google_sheets !== 'false' ? 'checked' : ''} class="w-4 h-4 accent-amber-500" />
                <span class="font-semibold text-slate-800">เชื่อมต่อฐานข้อมูล Google Sheets</span>
              </label>
              <label class="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <input type="checkbox" name="enable_google_calendar" ${s.enable_google_calendar !== 'false' ? 'checked' : ''} class="w-4 h-4 accent-amber-500" />
                <span class="font-semibold text-slate-800">แสดงปฏิทิน Google Calendar</span>
              </label>
              <label class="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <input type="checkbox" name="enable_google_maps" ${s.enable_google_maps !== 'false' ? 'checked' : ''} class="w-4 h-4 accent-amber-500" />
                <span class="font-semibold text-slate-800">แสดงแผนที่โรงเรียน Google Maps</span>
              </label>
              <label class="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <input type="checkbox" name="enable_google_forms" ${s.enable_google_forms !== 'false' ? 'checked' : ''} class="w-4 h-4 accent-amber-500" />
                <span class="font-semibold text-slate-800">เปิดใช้งานแบบฟอร์มติดต่อ (Forms)</span>
              </label>
              <label class="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <input type="checkbox" name="enable_looker_studio" ${s.enable_looker_studio !== 'false' ? 'checked' : ''} class="w-4 h-4 accent-amber-500" />
                <span class="font-semibold text-slate-800">เปิดระบบ Dashboard & Looker Studio</span>
              </label>
            </div>
          </div>

          <button type="submit" class="px-6 py-3 rounded-xl bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 font-bold text-sm transition cursor-pointer">
            บันทึกการตั้งค่าเว็บไซต์และอัปเดตธีมทันที
          </button>
        </form>
      </div>
    `;
  }
}

window.adminDashboardView = new AdminDashboardView();
