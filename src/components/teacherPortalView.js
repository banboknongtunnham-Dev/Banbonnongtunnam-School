/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - TEACHER PORTAL & MODULE LAUNCHER (Phase 6 & 7)
 * "ระบบบริการดิจิทัลสำหรับครูและบุคลากร"
 * สงวนสิทธิ์เฉพาะครูและบุคลากรที่เข้าสู่ระบบแล้วเท่านั้น (ห้ามบุคคลทั่วไปเห็น Module ภายใน)
 * ============================================================================
 */

class TeacherPortalView {
  constructor() {
    this.selectedCategory = 'ALL';
    this.searchQuery = '';
    this.activeInternalModule = null;
  }

  render() {
    // ตรวจสอบสิทธิ์: ห้ามแสดง Module ภายในให้บุคคลทั่วไปเห็นโดยเด็ดขาด
    if (!window.authService.isTeacherOrAbove()) {
      return `
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="bg-white rounded-3xl p-8 sm:p-12 border border-amber-200 shadow-lg text-center space-y-6">
            <div class="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <i data-lucide="lock-keyhole" class="w-10 h-10"></i>
            </div>
            <div class="space-y-2">
              <span class="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                RESTRICTED TEACHER PORTAL • เฉพาะบุคลากรภายใน
              </span>
              <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">
                ระบบบริการดิจิทัลสำหรับครูและบุคลากร
              </h2>
              <p class="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                พื้นที่ปฏิบัติงานดิจิทัลและศูนย์รวมโปรแกรมย่อยภายใน (Internal Modules) สงวนสิทธิ์เฉพาะผู้บริหาร ครู และบุคลากรของ<strong>โรงเรียนบ้านบกหนองทันน้ำ</strong> ที่ได้รับอนุญาตเท่านั้น กรุณาเข้าสู่ระบบก่อนใช้งาน
              </p>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onclick="window.app.openLoginModal('teacher-portal')"
                class="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 font-bold text-sm shadow-sm transition cursor-pointer"
              >
                <i data-lucide="log-in" class="w-4 h-4 text-amber-400"></i>
                <span>เข้าสู่ระบบสำหรับครูและบุคลากร</span>
              </button>
              <button
                onclick="window.app.navigate('home')"
                class="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-sm transition cursor-pointer"
              >
                <span>กลับหน้าเว็บไซต์หลัก</span>
              </button>
            </div>

            <div class="pt-4 border-t border-slate-100 text-xs text-slate-400">
              ระบบรักษาความปลอดภัยตามมาตรฐาน Role-Based Access Control (RBAC) และ PDPA
            </div>
          </div>
        </div>
      `;
    }

    const user = window.authService.getCurrentUser();
    const allModules = window.dbAdapter
      .getTable('System_Modules')
      .filter((m) => window.authService.canAccessModule(m))
      .sort((a, b) => Number(a.sort_order || 99) - Number(b.sort_order || 99));

    const categories = ['ALL', ...new Set(allModules.map((m) => m.category).filter(Boolean))];
    const filteredModules = allModules.filter((m) => {
      const matchCat = this.selectedCategory === 'ALL' || m.category === this.selectedCategory;
      const q = this.searchQuery.trim().toLowerCase();
      const matchQ = !q || String(m.module_name).toLowerCase().includes(q) || String(m.module_code).toLowerCase().includes(q) || String(m.description).toLowerCase().includes(q);
      return matchCat && matchQ;
    });

    const internalDocs = window.dbAdapter.getTable('Documents').filter((d) => d.access_level === 'TEACHER');

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <!-- Welcome Banner สำหรับครูและบุคลากร -->
        <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-amber-400/30 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
              ยืนยันสิทธิ์บุคลากรแล้ว: ${window.authService.sanitizeHTML(user.full_name)} (${window.authService.sanitizeHTML(user.position)})
            </div>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-white">
              ระบบบริการดิจิทัลสำหรับครูและบุคลากร
            </h2>
            <p class="text-xs sm:text-sm text-slate-300">
              ศูนย์กลางโปรแกรมย่อย (Smart Modular Workspace) โรงเรียนบ้านบกหนองทันน้ำ — เลือกใช้งานระบบงานวิชาการ บุคคล งบประมาณ และเครื่องมือดิจิทัล
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 shrink-0">
            ${
              window.authService.isAdminOrAbove()
                ? `
                <button
                  onclick="window.app.openModuleFormModal()"
                  class="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm hover:bg-amber-300 transition shadow-xs cursor-pointer"
                >
                  <i data-lucide="plus-circle" class="w-4 h-4"></i>
                  <span>เพิ่มโปรแกรมย่อย (Module) ใหม่</span>
                </button>
                <button
                  onclick="window.app.navigate('admin'); window.adminDashboardView.activeTab='modules';"
                  class="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 border border-white/15 font-semibold text-xs sm:text-sm transition cursor-pointer"
                >
                  <i data-lucide="settings" class="w-4 h-4 text-amber-300"></i>
                  <span>จัดการสิทธิ์/ลำดับ Module</span>
                </button>
                `
                : ''
            }
          </div>
        </div>

        <!-- Search & Category Filter Bar -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex flex-wrap gap-2">
              ${categories
                .map(
                  (cat) => `
                  <button
                    onclick="window.teacherPortalView.selectedCategory='${cat}'; window.app.render();"
                    class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      this.selectedCategory === cat
                        ? 'bg-slate-900 text-amber-300 border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                    }"
                  >
                    ${cat === 'ALL' ? `ทุกระบบงาน (${allModules.length})` : window.authService.sanitizeHTML(cat)}
                  </button>
                `
                )
                .join('')}
            </div>

            <div class="relative w-full md:w-72">
              <input
                type="text"
                value="${window.authService.sanitizeHTML(this.searchQuery)}"
                oninput="window.teacherPortalView.searchQuery=this.value; window.app.render();"
                placeholder="ค้นหาชื่อ Module หรือรหัส..."
                class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5"></i>
            </div>
          </div>
        </div>

        <!-- Module Launcher Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          ${filteredModules.map((mod) => this.renderModuleCard(mod)).join('')}
        </div>

        <!-- Internal Workspace View (เมื่อคลิกเปิด Module แบบหน้าเดียวกัน) -->
        ${this.activeInternalModule ? this.renderInternalModuleWorkspace(this.activeInternalModule) : ''}

        <!-- คลังแบบฟอร์มและเอกสารภายในสำหรับครู -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <div class="flex items-center justify-between mb-5">
            <div>
              <span class="text-xs font-bold text-amber-700 uppercase">INTERNAL FORMS & DOCUMENTS</span>
              <h3 class="text-lg font-bold text-slate-900">แบบฟอร์มราชการและเอกสารภายในสำหรับครูและบุคลากร</h3>
            </div>
            <span class="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
              เฉพาะบุคลากรภายใน (${internalDocs.length} รายการ)
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${internalDocs
              .map(
                (doc) => `
                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4 hover:border-amber-300 transition">
                  <div class="min-w-0">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">${window.authService.sanitizeHTML(doc.category)}</span>
                    <h4 class="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">${window.authService.sanitizeHTML(doc.title)}</h4>
                    <p class="text-[11px] text-slate-500 mt-0.5">ขนาดไฟล์: ${window.authService.sanitizeHTML(doc.file_size)} • ดาวน์โหลด ${doc.download_count || 0} ครั้ง</p>
                  </div>
                  <button
                    onclick="window.app.downloadDocumentById('${doc.doc_id}')"
                    class="px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 text-xs font-semibold shrink-0 transition cursor-pointer"
                  >
                    ดาวน์โหลด
                  </button>
                </div>
              `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderModuleCard(mod) {
    return `
      <div class="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-400 transition flex flex-col justify-between group">
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-extrabold">
              ${window.authService.sanitizeHTML(mod.module_code)}
            </span>
            <div class="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition">
              <i data-lucide="${window.authService.sanitizeHTML(mod.icon_name || 'layers')}" class="w-5 h-5"></i>
            </div>
          </div>

          <div class="text-[11px] font-semibold text-amber-700 mb-1">${window.authService.sanitizeHTML(mod.category)}</div>
          <h3 class="text-sm sm:text-base font-bold text-slate-900 leading-snug">${window.authService.sanitizeHTML(mod.module_name)}</h3>
          <p class="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-3">${window.authService.sanitizeHTML(mod.description)}</p>
        </div>

        <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onclick="window.teacherPortalView.launchModule('${mod.module_id}')"
            class="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 text-white group-hover:bg-amber-500 group-hover:text-slate-950 text-xs font-bold transition cursor-pointer"
          >
            <span>เข้าใช้งานระบบ</span>
            <i data-lucide="${mod.open_mode === 'NEW_TAB' ? 'external-link' : 'arrow-right'}" class="w-3.5 h-3.5"></i>
          </button>

          ${
            window.authService.isAdminOrAbove()
              ? `
              <button
                onclick="window.app.openModuleFormModal('${mod.module_id}')"
                title="แก้ไขการตั้งค่า Module"
                class="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-900 transition cursor-pointer"
              >
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              `
              : ''
          }
        </div>
      </div>
    `;
  }

  /**
   * เปิดใช้งาน Module ตามโหมดที่ตั้งค่าไว้ (หน้าเดียวกัน หรือ แท็บใหม่)
   */
  launchModule(moduleId) {
    const modules = window.dbAdapter.getTable('System_Modules');
    const mod = modules.find((m) => m.module_id === moduleId);
    if (!mod) return;

    window.dbAdapter.logAudit('LAUNCH_MODULE', 'System_Modules', mod.module_id, `เข้าใช้งาน ${mod.module_code}: ${mod.module_name}`);

    if (mod.open_mode === 'NEW_TAB' && mod.target_url && mod.target_url.startsWith('http')) {
      window.open(mod.target_url, '_blank', 'noopener,noreferrer');
      return;
    }

    this.activeInternalModule = mod;
    window.app.render();
    setTimeout(() => {
      const el = document.getElementById('internal-module-workspace');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  /**
   * พื้นที่ทำงานของระบบย่อยภายใน (Interactive Sub-Application Workspace)
   */
  renderInternalModuleWorkspace(mod) {
    const isExternalIframe = mod.target_url && mod.target_url.startsWith('http');
    const students = window.dbAdapter.getTable('Students_Statistics');

    return `
      <div id="internal-module-workspace" class="bg-white rounded-3xl border-2 border-amber-400 shadow-xl overflow-hidden">
        <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-extrabold">${window.authService.sanitizeHTML(mod.module_code)}</span>
            <div>
              <h3 class="text-sm sm:text-base font-bold">${window.authService.sanitizeHTML(mod.module_name)}</h3>
              <p class="text-[11px] text-slate-300">${window.authService.sanitizeHTML(mod.category)}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${
              isExternalIframe
                ? `<a href="${window.authService.sanitizeHTML(mod.target_url)}" target="_blank" rel="noopener" class="px-3 py-1.5 rounded-xl bg-white/10 text-amber-300 text-xs font-semibold hover:bg-white/20">เปิดแท็บใหม่</a>`
                : ''
            }
            <button
              onclick="window.teacherPortalView.activeInternalModule=null; window.app.render();"
              class="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              ปิดหน้าต่างระบบย่อย ✕
            </button>
          </div>
        </div>

        <div class="p-6 sm:p-8">
          ${
            isExternalIframe
              ? `
              <div class="rounded-2xl overflow-hidden border border-slate-200 h-[550px]">
                <iframe src="${window.authService.sanitizeHTML(mod.target_url)}" class="w-full h-full border-0" title="${window.authService.sanitizeHTML(mod.module_name)}"></iframe>
              </div>
              `
              : `
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div class="lg:col-span-7 space-y-4">
                  <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                    <div class="text-xs font-bold text-amber-800">คำอธิบายการทำงานของระบบย่อย</div>
                    <p class="text-xs sm:text-sm text-slate-700 mt-1">${window.authService.sanitizeHTML(mod.description)}</p>
                  </div>

                  <form onsubmit="window.app.submitTeacherModuleAction(event, '${mod.module_id}')" class="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                    <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <i data-lucide="file-plus-2" class="w-4 h-4 text-amber-600"></i>
                      บันทึกข้อมูล / ส่งรายงานในระบบ ${window.authService.sanitizeHTML(mod.module_code)}
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">เลือกระดับชั้นเรียน</label>
                        <select name="grade_level" class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold">
                          ${students.map((s) => `<option value="${s.grade_level}">${s.grade_level} (${s.total_count} คน)</option>`).join('')}
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">วันที่ดำเนินการ</label>
                        <input type="date" name="action_date" value="${new Date().toISOString().slice(0, 10)}" required class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold" />
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">หัวข้อรายการ / รายวิชา / เรื่องที่ดำเนินการ *</label>
                      <input type="text" name="record_title" required placeholder="เช่น ส่งผลคะแนนเก็บกลางภาค / เช็กชื่อประจำวัน / ส่งแผนการสอน" class="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">รายละเอียดการปฏิบัติงาน / ลิงก์ไฟล์ Google Drive</label>
                      <textarea name="record_details" rows="3" required placeholder="ระบุรายละเอียดผลการดำเนินงาน หรือวางลิงก์เอกสาร Google Docs / Sheets..." class="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm"></textarea>
                    </div>
                    <button type="submit" class="px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer">
                      บันทึกข้อมูลเข้าสู่ฐานข้อมูลโรงเรียน
                    </button>
                  </form>
                </div>

                <div class="lg:col-span-5 space-y-4">
                  <div class="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <h4 class="text-sm font-bold text-slate-900">การเชื่อมต่อโปรแกรมภายนอก (External App URL)</h4>
                    <p class="text-xs text-slate-500 leading-relaxed">
                      ระบบ Module Management รองรับการเชื่อมต่อ Web App ที่พัฒนาเพิ่มเติมในอนาคต (เช่น Google Apps Script แยก, ระบบ ปพ.5 ออนไลน์, Canva, Looker Studio) โดยผู้ดูแลระบบสามารถเปลี่ยน URL ของแต่ละ Module ได้ตลอดเวลา
                    </p>
                    <div class="p-3 rounded-xl bg-slate-50 text-xs font-mono text-slate-600 break-all">
                      Target URL: ${window.authService.sanitizeHTML(mod.target_url || '#internal')}
                    </div>
                  </div>
                </div>
              </div>
              `
          }
        </div>
      </div>
    `;
  }
}

window.teacherPortalView = new TeacherPortalView();
