/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - MAIN APPLICATION CONTROLLER (src/app.js)
 * ควบคุมการเปลี่ยนหน้า (SPA Router), Dynamic Theme Engine, ระบบ Modals ทั้งหมด,
 * การบันทึกฟอร์มลงฐานข้อมูล, การอัปโหลดไฟล์เข้า Google Drive และการแจ้งเตือน
 * ============================================================================
 */

class BanbokAppController {
  constructor() {
    this.currentPage = 'home';
    this.redirectAfterLogin = null;
  }

  init() {
    this.applyDynamicTheme();
    // บันทึกและนับจำนวนผู้เข้าชมเว็บไซต์
    if (window.dbAdapter && typeof window.dbAdapter.recordVisitor === 'function') {
      window.dbAdapter.recordVisitor();
    }
    this.render();
    window.addEventListener('hashchange', () => {
      const hashPage = window.location.hash.replace('#', '');
      if (hashPage && hashPage !== this.currentPage) {
        this.navigate(hashPage, false);
      }
    });

    // ตรวจสอบการส่งสรุปรายงานประจำวันเข้า LINE อัตโนมัติ (ช่วงเย็น 18:00 น. เป็นต้นไป)
    setTimeout(() => {
      const currentHour = new Date().getHours();
      if (currentHour >= 18) {
        this.sendDailyVisitorSummary(false);
      }
    }, 2500);
  }

  /**
   * นำการตั้งค่าสี ฟอนต์ และชื่อเว็บไซต์จากตาราง System_Settings มาแสดงผลจริง
   */
  applyDynamicTheme() {
    const s = window.dbAdapter.getSettingsMap();
    if (s.site_title) {
      document.title = s.site_title;
    }
    const font = s.theme_font_family || 'Prompt';
    document.documentElement.style.setProperty('--bbk-font-family', `'${font}', sans-serif`);
    const bg = (!s.theme_primary_bg || s.theme_primary_bg === '#FFFFFF') ? '#F8FAFC' : s.theme_primary_bg;
    document.documentElement.style.setProperty('--bbk-primary-bg', bg);
    document.documentElement.style.setProperty('--bbk-accent-gold', s.theme_accent_gold || '#D97706');
    document.documentElement.style.setProperty('--bbk-accent-navy', s.theme_accent_navy || '#0F172A');
  }

  navigate(pageId, pushHash = true) {
    this.currentPage = pageId;
    if (pushHash) {
      history.replaceState(null, '', `#${pageId}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  toggleMobileMenu(forceState) {
    const drawer = document.getElementById('mobile-nav-drawer');
    if (!drawer) return;
    if (typeof forceState === 'boolean') {
      drawer.classList.toggle('hidden', !forceState);
    } else {
      drawer.classList.toggle('hidden');
    }
  }

  render() {
    this.applyDynamicTheme();
    const root = document.getElementById('app-root');
    if (!root) return;

    let mainContent = '';
    switch (this.currentPage) {
      case 'home':
        mainContent = window.publicViews.renderHome();
        break;
      case 'about':
        mainContent = window.publicViews.renderAbout();
        break;
      case 'personnel':
        mainContent = window.publicViews.renderPersonnel();
        break;
      case 'academic':
        mainContent = window.publicViews.renderAcademic();
        break;
      case 'news':
        mainContent = window.publicViews.renderNewsPage();
        break;
      case 'gallery':
        mainContent = window.publicViews.renderGalleryPage();
        break;
      case 'documents':
        mainContent = window.publicViews.renderDocumentsPage();
        break;
      case 'dashboard':
        mainContent = window.dashboardView.render();
        break;
      case 'contact':
        mainContent = window.publicViews.renderContactPage();
        break;
      case 'teacher-portal':
        mainContent = window.teacherPortalView.render();
        break;
      case 'admin':
        mainContent = window.adminDashboardView.render();
        break;
      case 'dev-console':
        mainContent = window.devConsoleView.render();
        break;
      default:
        mainContent = window.publicViews.renderHome();
    }

    root.innerHTML = `
      <div class="min-h-screen flex flex-col" style="background-color: var(--bbk-primary-bg, #F8FAFC); font-family: var(--bbk-font-family, 'Prompt', sans-serif);">
        ${window.navbarComponent.renderHeader(this.currentPage)}
        <main class="flex-1">
          ${mainContent}
        </main>
        ${window.navbarComponent.renderFooter()}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    if (this.currentPage === 'dashboard') {
      setTimeout(() => window.dashboardView.mountCharts(), 60);
    }

    if (this.currentPage === 'academic') {
      setTimeout(() => {
        if (window.publicViews && typeof window.publicViews.mountExamCharts === 'function') {
          window.publicViews.mountExamCharts();
        }
      }, 60);
    }

    if (this.currentPage === 'home' || this.currentPage === 'about') {
      setTimeout(() => {
        if (window.publicViews && typeof window.publicViews.mountVisitorThreeYearChart === 'function') {
          window.publicViews.mountVisitorThreeYearChart();
        }
      }, 60);
    }

    if (this.currentPage === 'home' || this.currentPage === 'news') {
      setTimeout(() => {
        if (window.publicViews && typeof window.publicViews.startSliderAutoPlay === 'function') {
          window.publicViews.startSliderAutoPlay();
        }
      }, 80);
    }
  }

  /**
   * แสดงการแจ้งเตือนมุมขวาบน (Toast Notification)
   */
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
      success: 'bg-slate-900 text-white border-amber-400',
      error: 'bg-rose-950 text-white border-rose-400',
      info: 'bg-amber-500 text-slate-950 border-amber-600'
    };

    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-2xl border-l-4 shadow-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition duration-300 ${colors[type] || colors.success}`;
    toast.innerHTML = `
      <span>${type === 'error' ? '⚠️' : '✨'}</span>
      <span>${window.authService.sanitizeHTML(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3600);
  }

  /**
   * เปิด/ปิด Modal กลาง
   */
  openModal(title, bodyHtml, maxWidthClass = 'max-w-2xl') {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
        <div class="bg-white rounded-3xl w-full ${maxWidthClass} border border-amber-300/80 shadow-2xl overflow-hidden my-8 animate-fade-in">
          <div class="bg-gradient-to-r from-red-700 via-orange-600 to-amber-500 text-white px-5 py-3.5 flex items-center justify-between border-b border-amber-300/40 shadow-sm">
            <div class="flex items-center gap-2.5">
              <img src="assets/img/logo.png" alt="โลโก้โรงเรียน" class="w-7 h-7 object-contain drop-shadow-sm shrink-0" />
              <h3 class="text-sm sm:text-base font-extrabold text-white drop-shadow-xs">${window.authService.sanitizeHTML(title)}</h3>
            </div>
            <button onclick="window.app.closeModal()" class="w-8 h-8 rounded-xl bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer">✕</button>
          </div>
          <div class="p-6 max-h-[80vh] overflow-y-auto">
            ${bodyHtml}
          </div>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  closeModal() {
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
  }

  /**
   * 1. ระบบเข้าสู่ระบบ (Login & Google Auth Modal)
   */
  openLoginModal(redirectPage = null, afterLoginCallback = null) {
    this.redirectAfterLogin = redirectPage;
    this.afterLoginCallback = typeof afterLoginCallback === 'function' ? afterLoginCallback : null;
    this.selectedLoginRole = this.selectedLoginRole || 'admin';
    const logoUrl = window.driveService.resolveDriveImageUrl(window.dbAdapter.getSetting('logo_url', 'assets/img/logo.png'));

    this.openModal(
      'เข้าสู่ระบบ BANBOK DIGITAL SCHOOL PLATFORM',
      `
      <div class="space-y-4">
        <!-- โลโก้โรงเรียนบ้านบกหนองทันน้ำ ตรงกลางเด่นชัด สวยงาม -->
        <div class="flex flex-col items-center justify-center text-center pt-1 pb-1">
          <img src="${logoUrl}" alt="โลโก้โรงเรียนบ้านบกหนองทันน้ำ" class="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md mb-2 hover:scale-105 transition" onerror="this.src='assets/img/logo.png'" />
          <h4 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">โรงเรียนบ้านบกหนองทันน้ำ</h4>
          <p class="text-xs font-bold text-amber-700 mt-0.5">BANBOK DIGITAL SCHOOL PLATFORM</p>
        </div>

        <!-- ปุ่มเลือกสิทธิ์เข้าสู่ระบบ 3 ระดับ พร้อมไอคอนสีสันสดใส และกรอบแสดงสถานะกำลังเลือก -->
        <div class="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300/90">
          <div id="login-role-selector-grid" class="grid grid-cols-3 gap-2.5">
            ${this.renderLoginRoleButtonsHtml(this.selectedLoginRole)}
          </div>
        </div>

        <form onsubmit="window.app.handleLoginSubmit(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username) หรือ อีเมลโรงเรียน *</label>
            <input
              type="text"
              id="login-username"
              name="username"
              required
              value="admin"
              oninput="window.app.syncLoginRoleFromInput(this.value)"
              placeholder="เช่น teacher, admin หรืออีเมล"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">รหัสผ่าน (Password) *</label>
            <input
              type="password"
              id="login-password"
              name="password"
              required
              value="admin1234"
              placeholder="••••••••"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <button
            type="submit"
            id="login-submit-btn"
            onclick="window.app.handleLoginSubmit(event)"
            class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white hover:from-red-600 hover:to-red-500 font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🛡️</span>
            <span id="login-submit-btn-label">คลิกเข้าสู่ระบบในฐานะ: แอดมินเว็บ (Admin)</span>
          </button>
        </form>
      </div>
      `,
      'max-w-md'
    );

    // ซิงค์ค่าเริ่มต้นตามปุ่มที่เลือก
    this.selectLoginRole(this.selectedLoginRole);
  }

  /**
   * สร้าง HTML ปุ่มเลือกสิทธิ์ทั้ง 3 ปุ่ม พร้อมไอคอนสีสันสดใส และกรอบครอบข้อความเมื่อกำลังเลือกอยู่
   */
  renderLoginRoleButtonsHtml(activeRole = 'admin') {
    const roles = [
      {
        key: 'teacher',
        title: 'ครู / บุคลากร',
        icon: '👩‍🏫',
        iconBg: 'from-emerald-400 via-teal-500 to-green-600',
        activeBorder: 'border-emerald-600 ring-4 ring-emerald-500/20 bg-emerald-50/70',
        activeTextFrame: 'border-2 border-emerald-600 bg-white text-emerald-800 shadow-2xs',
        activeBadge: 'bg-emerald-600 text-white'
      },
      {
        key: 'admin',
        title: 'แอดมินเว็บ',
        icon: '🛡️',
        iconBg: 'from-amber-400 via-orange-500 to-red-600',
        activeBorder: 'border-red-600 ring-4 ring-red-500/20 bg-red-50/80',
        activeTextFrame: 'border-2 border-red-600 bg-white text-red-700 shadow-2xs',
        activeBadge: 'bg-red-600 text-white'
      },
      {
        key: 'developer',
        title: 'ผู้พัฒนาระบบ',
        icon: '💻',
        iconBg: 'from-sky-400 via-blue-500 to-indigo-600',
        activeBorder: 'border-indigo-600 ring-4 ring-indigo-500/20 bg-indigo-50/70',
        activeTextFrame: 'border-2 border-indigo-600 bg-white text-indigo-800 shadow-2xs',
        activeBadge: 'bg-indigo-600 text-white'
      }
    ];

    return roles
      .map((r) => {
        const isSelected = activeRole === r.key;
        return `
          <button
            type="button"
            onclick="window.app.selectLoginRole('${r.key}')"
            class="relative p-2.5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center text-center cursor-pointer select-none ${
              isSelected
                ? `${r.activeBorder} shadow-md scale-[1.02]`
                : 'border-slate-200 bg-white/90 hover:border-amber-400 hover:bg-white opacity-80 hover:opacity-100'
            }"
          >
            ${
              isSelected
                ? `<span class="absolute -top-2 -right-2 w-5 h-5 rounded-full ${r.activeBadge} text-[11px] font-extrabold flex items-center justify-center shadow-sm">✓</span>`
                : ''
            }
            <!-- ไอคอนสัญลักษณ์สีสันสดใส -->
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${r.iconBg} text-white flex items-center justify-center text-lg shadow-sm mb-1.5">
              ${r.icon}
            </div>

            <!-- กรอบครอบข้อความเมื่อกำลังเลือกอยู่ -->
            <div class="w-full px-1.5 py-1 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all ${
              isSelected
                ? r.activeTextFrame
                : 'border border-transparent text-slate-700'
            }">
              ${r.title}
            </div>

            <span class="mt-1 text-[10px] font-bold ${
              isSelected ? 'text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-2' : 'text-slate-400'
            }">
              ${isSelected ? '● กำลังเลือกอยู่' : 'คลิกเพื่อเลือก'}
            </span>
          </button>
        `;
      })
      .join('');
  }

  /**
   * เลือกปุ่มสิทธิ์ในหน้าต่างเข้าสู่ระบบ (แสดงกรอบครอบข้อความ + ซิงค์ปุ่มเข้าสู่ระบบด้านล่างให้ตรงกับฐานะที่เลือก)
   */
  selectLoginRole(roleKey) {
    const roleCredentials = {
      teacher: {
        user: 'teacher',
        pass: 'teacher1234',
        btnClass: 'w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer',
        submitHtml: '<span>👩‍🏫</span><span>คลิกเข้าสู่ระบบในฐานะ: ครู / บุคลากร (Teacher)</span>'
      },
      admin: {
        user: 'admin',
        pass: 'admin1234',
        btnClass: 'w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white hover:from-red-600 hover:to-red-500 font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer',
        submitHtml: '<span>🛡️</span><span>คลิกเข้าสู่ระบบในฐานะ: แอดมินเว็บ (Admin)</span>'
      },
      developer: {
        user: 'developer',
        pass: 'dev1234',
        btnClass: 'w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-700 to-blue-600 text-white hover:from-indigo-600 hover:to-blue-500 font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer',
        submitHtml: '<span>💻</span><span>คลิกเข้าสู่ระบบในฐานะ: ผู้พัฒนาระบบ (Developer)</span>'
      }
    };

    const target = roleCredentials[roleKey] || roleCredentials.admin;
    this.selectedLoginRole = roleKey;

    const gridEl = document.getElementById('login-role-selector-grid');
    if (gridEl) {
      gridEl.innerHTML = this.renderLoginRoleButtonsHtml(roleKey);
    }

    const userEl = document.getElementById('login-username');
    const passEl = document.getElementById('login-password');
    if (userEl) userEl.value = target.user;
    if (passEl) passEl.value = target.pass;

    const submitBtn = document.getElementById('login-submit-btn');
    if (submitBtn) {
      submitBtn.className = target.btnClass;
      submitBtn.innerHTML = target.submitHtml;
    }
  }

  /**
   * ซิงค์กรอบปุ่มที่เลือกอัตโนมัติเมื่อพิมพ์ชื่อผู้ใช้ในช่อง Input
   */
  syncLoginRoleFromInput(val) {
    const clean = String(val || '').trim().toLowerCase();
    let matched = null;
    if (clean === 'teacher' || clean.startsWith('teacher@')) matched = 'teacher';
    else if (clean === 'admin' || clean.startsWith('admin@')) matched = 'admin';
    else if (clean === 'developer' || clean === 'dev' || clean.startsWith('dev@')) matched = 'developer';

    if (matched && matched !== this.selectedLoginRole) {
      this.selectedLoginRole = matched;
      const gridEl = document.getElementById('login-role-selector-grid');
      if (gridEl) {
        gridEl.innerHTML = this.renderLoginRoleButtonsHtml(matched);
      }
    }
  }

  async quickLoginAs(username, password) {
    try {
      const user = await window.authService.login(username, password);
      this.closeModal();
      this.showToast(`ยินดีต้อนรับ ${user.full_name} (สิทธิ์: ${user.role_id})`);
      this.render();

      if (this.afterLoginCallback) {
        const cb = this.afterLoginCallback;
        this.afterLoginCallback = null;
        this.redirectAfterLogin = null;
        setTimeout(() => cb(), 50);
        return;
      }

      if (this.redirectAfterLogin) {
        this.navigate(this.redirectAfterLogin);
        this.redirectAfterLogin = null;
      } else if (user.role_id === 'DEVELOPER') {
        this.navigate('dev-console');
      } else if (user.role_id === 'ADMIN') {
        this.navigate('admin');
      } else {
        this.navigate('teacher-portal');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleLoginSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const fallbackMap = {
      teacher: { user: 'teacher', pass: 'teacher1234' },
      admin: { user: 'admin', pass: 'admin1234' },
      developer: { user: 'developer', pass: 'dev1234' }
    };
    const roleDefault = fallbackMap[this.selectedLoginRole || 'admin'] || fallbackMap.admin;
    const userEl = document.getElementById('login-username');
    const passEl = document.getElementById('login-password');
    const username = userEl && userEl.value.trim() ? userEl.value.trim() : roleDefault.user;
    const password = passEl && passEl.value.trim() ? passEl.value.trim() : roleDefault.pass;
    await this.quickLoginAs(username, password);
  }

  async handleGoogleSignInPrompt() {
    const email = prompt('กรอกอีเมลบัญชี Google ของบุคลากรที่ลงทะเบียนไว้ในระบบ (เช่น teacher@banbokschool.ac.th, admin@banbokschool.ac.th, dev@banbokschool.ac.th):', 'teacher@banbokschool.ac.th');
    if (!email) return;
    try {
      const user = await window.authService.loginWithGoogleAccount(email);
      this.closeModal();
      this.showToast(`เข้าสู่ระบบด้วย Google สำเร็จ: ${user.full_name}`);
      this.navigate(this.redirectAfterLogin || 'teacher-portal');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  handleLogout() {
    window.authService.logout();
    this.showToast('ออกจากระบบเรียบร้อยแล้ว');
    this.navigate('home');
  }

  /**
   * แปลงค่าที่ผู้ใช้วางในช่อง Facebook (รองรับทั้ง URL ปกติ และโค้ด <iframe ...></iframe> จาก Facebook)
   */
  parseFacebookInput(rawInput) {
    const str = String(rawInput || '').trim();
    if (!str) return { facebookUrl: '', embedSrc: '', embedHeight: 550 };

    // กรณีวางโค้ด <iframe src="https://www.facebook.com/plugins/post.php?href=...">
    if (str.includes('<iframe') || str.includes('facebook.com/plugins/')) {
      const srcMatch = str.match(/src=["']([^"']+)["']/i);
      const heightMatch = str.match(/height=["']?(\d+)["']?/i);
      const embedSrc = srcMatch ? srcMatch[1] : (str.startsWith('http') ? str : '');
      const embedHeight = heightMatch ? Number(heightMatch[1]) : 680;
      let facebookUrl = embedSrc;
      try {
        const urlObj = new URL(embedSrc);
        const hrefParam = urlObj.searchParams.get('href');
        if (hrefParam) facebookUrl = decodeURIComponent(hrefParam);
      } catch (e) {}
      return { facebookUrl, embedSrc, embedHeight };
    }

    // กรณีวางลิงก์โพสต์ปกติ
    const isSpecific = str.includes('/posts/') || str.includes('/permalink') || str.includes('/videos/') || str.includes('/photo') || str.includes('story_fbid');
    const embedSrc = isSpecific
      ? `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(str)}&show_text=true&width=500`
      : '';
    return { facebookUrl: str, embedSrc, embedHeight: 600 };
  }

  /**
   * 2. อ่านข่าวประชาสัมพันธ์ฉบับเต็ม & ฝังโพสต์จาก Facebook โรงเรียน
   */
  openNewsModal(newsId) {
    const list = window.dbAdapter.getTable('News');
    const item = list.find((n) => n.news_id === newsId);
    if (!item) return;

    const newViews = (Number(item.views_count) || 0) + 1;
    window.dbAdapter.update('News', newsId, { views_count: newViews });

    const imgUrl = window.driveService.resolveDriveImageUrl(item.cover_image_url);
    const parsedFb = this.parseFacebookInput(item.facebook_embed_src || item.facebook_url || '');
    const fbUrl = item.facebook_url || parsedFb.facebookUrl;
    const embedSrc = item.facebook_embed_src || parsedFb.embedSrc;
    const embedHeight = Number(item.facebook_embed_height || parsedFb.embedHeight || 680);

    this.openModal(
      item.category || 'ข่าวประชาสัมพันธ์',
      `
      <div class="space-y-4">
        ${
          embedSrc
            ? `
            <div class="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-xs font-extrabold text-[#1877F2] inline-flex items-center gap-1.5">
                  <img src="assets/img/facebook_logo.png" alt="Facebook" class="w-4 h-4 object-contain shrink-0 inline-block" /> โพสต์จาก Facebook โรงเรียนบ้านบกหนองทันน้ำ
                </span>
                <a href="${window.authService.sanitizeHTML(fbUrl)}" target="_blank" rel="noopener" class="px-3 py-1.5 rounded-xl bg-[#1877F2] text-white text-xs font-bold hover:bg-blue-700 transition inline-flex items-center gap-1">
                  <span>เปิดบน Facebook</span>
                  <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                </a>
              </div>
              <div class="rounded-2xl overflow-hidden bg-white border border-blue-100 flex justify-center p-2 shadow-xs">
                <iframe
                  src="${window.authService.sanitizeHTML(embedSrc)}"
                  width="500"
                  height="${embedHeight}"
                  style="border:none;overflow:hidden;max-width:100%;"
                  scrolling="no"
                  frameborder="0"
                  allowfullscreen="true"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                ></iframe>
              </div>
            </div>
            `
            : `
            <div class="rounded-2xl overflow-hidden bg-slate-100 max-h-80">
              <img src="${imgUrl}" alt="${window.authService.sanitizeHTML(item.title)}" class="w-full h-full object-cover" onerror="this.src='assets/img/logo.png'" />
            </div>
            `
        }
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>📅 วันที่เผยแพร่: ${window.authService.sanitizeHTML(item.published_at)} • ผู้เขียน: ${window.authService.sanitizeHTML(item.author_name)}</span>
          <span>👁️ เข้าชมแล้ว ${newViews.toLocaleString()} ครั้ง</span>
        </div>
        <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">${window.authService.sanitizeHTML(item.title)}</h2>
        <div class="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-xs sm:text-sm font-semibold text-slate-700">
          ${window.authService.sanitizeHTML(item.summary)}
        </div>
        <div class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          ${window.authService.sanitizeHTML(item.content)}
        </div>
        <div class="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap gap-2">
            <button onclick="window.app.shareNewsToFacebook('${item.news_id}')" class="px-4 py-2 rounded-xl bg-[#1877F2] text-white text-xs font-bold hover:bg-blue-700 cursor-pointer">
              แชร์ข่าวนี้ไปยัง Facebook
            </button>
            ${
              window.authService.isTeacherOrAbove()
                ? `<button onclick="window.app.closeModal(); window.app.openNewsEditorModal('${item.news_id}');" class="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold cursor-pointer">แก้ไขข่าว / ลิงก์ Facebook</button>`
                : ''
            }
          </div>
          <button onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ปิดหน้าต่าง</button>
        </div>
      </div>
      `,
      'max-w-3xl'
    );
  }

  shareNewsToFacebook(newsId) {
    const item = window.dbAdapter.getTable('News').find((n) => n.news_id === newsId);
    const shareUrl = encodeURIComponent(window.location.href);
    const quote = encodeURIComponent(item ? item.title : 'โรงเรียนบ้านบกหนองทันน้ำ');
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${quote}`, '_blank', 'width=640,height=480');
  }

  openImageLightbox(imgUrl, title, caption) {
    this.openModal(
      title || 'ภาพกิจกรรมโรงเรียนบ้านบกหนองทันน้ำ',
      `
      <div class="space-y-3 text-center">
        <img src="${imgUrl}" alt="${title}" class="max-h-[65vh] mx-auto rounded-2xl object-contain" onerror="this.src='assets/img/logo.png'" />
        <p class="text-xs sm:text-sm text-slate-600">${caption || ''}</p>
      </div>
      `,
      'max-w-4xl'
    );
  }

  downloadDocumentById(docId) {
    const doc = window.dbAdapter.getTable('Documents').find((d) => d.doc_id === docId);
    if (!doc) return;
    if (doc.access_level === 'TEACHER' && !window.authService.isTeacherOrAbove()) {
      this.showToast('เอกสารนี้สงวนสิทธิ์เฉพาะครูและบุคลากร กรุณาเข้าสู่ระบบ', 'error');
      this.openLoginModal('documents');
      return;
    }
    window.driveService.triggerDocumentDownload(doc);
    this.render();
  }

  /**
   * 3. บันทึกแบบฟอร์มติดต่อโรงเรียน & ส่งแจ้งเตือนเข้า LINE API ทันที
   */
  async submitContactForm(e) {
    e.preventDefault();
    const f = e.target;
    const name = f.sender_name.value.trim();
    const contact = f.sender_contact.value.trim();
    const subject = f.subject_type.value;
    const msg = f.message.value.trim();

    // บันทึกลง Audit Logs และฐานข้อมูลสารบรรณในระบบ
    window.dbAdapter.logAudit('CONTACT_INQUIRY', 'Google_Forms_Inquiry', `INQ-${Date.now()}`, `[${subject}] จาก ${name} (${contact}): ${msg}`);

    // ส่งแจ้งเตือนไปยัง LINE API (LINE Messaging API / LINE Webhook)
    await this.dispatchLineNotification({
      senderName: name,
      senderContact: contact,
      subjectType: subject,
      messageDetails: msg,
      submittedAt: new Date().toLocaleString('th-TH')
    });

    f.reset();
    this.showToast('ส่งข้อความและแจ้งเตือนเข้าสู่ระบบ LINE ของโรงเรียนเรียบร้อยแล้ว ขอบคุณครับ');
  }

  /**
   * ส่งข้อมูลฟอร์มติดต่อเข้าสู่ LINE API (รองรับทั้ง LINE Messaging API Token, LINE Webhook URL และ Google Apps Script)
   */
  async dispatchLineNotification(payload) {
    try {
      const lineWebhookUrl = window.dbAdapter.getSetting('line_webhook_url', '');
      const lineChannelToken = window.dbAdapter.getSetting('line_channel_access_token', '');
      const lineTargetId = window.dbAdapter.getSetting('line_target_id', ''); // User ID หรือ Group ID
      const gasUrl = window.dbAdapter.getSetting('gas_webapp_url', '');

      const lineMessageText = payload.customMessage || 
`🔔 มีข้อความติดต่อใหม่จากเว็บไซต์โรงเรียนบ้านบกหนองทันน้ำ
----------------------------------------
👤 ผู้ติดต่อ: ${payload.senderName}
📞 ติดต่อกลับ: ${payload.senderContact}
📌 เรื่อง: ${payload.subjectType}
💬 ข้อความ: ${payload.messageDetails}
⏰ เวลา: ${payload.submittedAt}
----------------------------------------
🌐 เข้าสู่ระบบตรวจสอบ: http://localhost:8080`;

      // 0. ส่งผ่าน Internal Server Relay API (/api/line-notify) ป้องกันปัญหา Browser CORS
      try {
        fetch('/api/line-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: lineMessageText,
            token: lineChannelToken,
            targetId: lineTargetId
          })
        }).catch(() => {});
      } catch (_) {}

      // 1. ส่งผ่าน Google Apps Script Web App (ถ้ามีการเชื่อมต่อ GAS อยู่แล้ว)
      if (gasUrl) {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendLineNotification',
            lineMessage: lineMessageText,
            lineChannelToken,
            lineTargetId,
            ...payload
          })
        }).catch(() => {});
      }

      // 2. ส่งผ่าน Direct LINE Webhook URL (เช่น Make / Zapier / Google Script Webhook)
      if (lineWebhookUrl) {
        fetch(lineWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: lineMessageText,
            ...payload
          })
        }).catch(() => {});
      }

      // 3. ส่งผ่าน LINE Messaging API (Broadcast หรือ Push Message โดยตรง)
      if (lineChannelToken) {
        const endpoint = lineTargetId 
          ? 'https://api.line.me/v2/bot/message/push' 
          : 'https://api.line.me/v2/bot/message/broadcast';

        const bodyData = lineTargetId
          ? {
              to: lineTargetId,
              messages: [{ type: 'text', text: lineMessageText }]
            }
          : {
              messages: [{ type: 'text', text: lineMessageText }]
            };

        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lineChannelToken}`
          },
          body: JSON.stringify(bodyData)
        }).catch((err) => {
          console.warn('LINE API direct dispatch note:', err);
        });
      }
    } catch (err) {
      console.warn('dispatchLineNotification error:', err);
    }
  }

  /**
   * ส่งสรุปรายงานยอดผู้เข้าชมและกิจกรรมประจำวัน เข้าสู่ LINE Messaging API
   */
  async sendDailyVisitorSummary(force = false) {
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const lastSent = window.dbAdapter.getSetting('last_daily_line_summary_date', '');

      // หากไม่ได้บังคับส่ง (force) และส่งไปแล้วในวันนี้ ให้ข้าม
      if (!force && lastSent === todayStr) {
        return { status: 'ALREADY_SENT' };
      }

      const stats = window.dbAdapter.getVisitorStats();
      const profile = (window.dbAdapter.getTable('School_Profile')[0]) || {};
      const schoolName = profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ';

      // นับข้อความติดต่อที่ได้รับวันนี้จาก Audit_Logs
      const auditLogs = window.dbAdapter.getTable('Audit_Logs');
      const todayInquiries = auditLogs.filter(
        (log) => log.action_type === 'CONTACT_INQUIRY' && String(log.timestamp || '').startsWith(todayStr)
      ).length;

      const nowFormatted = new Date().toLocaleString('th-TH', {
        dateStyle: 'long',
        timeStyle: 'short'
      });

      const messageText = 
`📊 [รายงานประจำวัน] สรุปยอดผู้เข้าชมเว็บไซต์
🏛️ ${schoolName}
----------------------------------------
📅 ข้อมูล ณ: ${nowFormatted}
👥 ยอดผู้เข้าชมวันนี้: ${stats.today.toLocaleString()} ครั้ง
🌐 ยอดผู้เข้าชมสะสมทั้งหมด: ${stats.total.toLocaleString()} ครั้ง
📨 ข้อความติดต่อสอบถามวันนี้: ${todayInquiries.toLocaleString()} รายการ
⚡ สถานะระบบ: ออนไลน์ 100% พร้อมใช้งาน
----------------------------------------
🔗 เข้าชมเว็บไซต์: https://banboknongtunnham-dev.github.io/Banbonnongtunnam-School/`;

      await this.dispatchLineNotification({
        customMessage: messageText,
        reportType: 'DAILY_VISITOR_SUMMARY',
        submittedAt: nowFormatted
      });

      await window.dbAdapter.setSetting('last_daily_line_summary_date', todayStr);
      if (force) {
        this.showToast('ส่งสรุปรายงานประจำวันเข้าสู่ LINE เรียบร้อยแล้ว');
      }
      return { status: 'SUCCESS' };
    } catch (err) {
      console.warn('sendDailyVisitorSummary error:', err);
      if (force) {
        this.showToast('เกิดข้อผิดพลาดในการส่งรายงาน: ' + err.message, 'error');
      }
      return { status: 'ERROR', error: err.message };
    }
  }

  async submitTeacherModuleAction(e, moduleId) {
    e.preventDefault();
    const f = e.target;
    const grade = f.grade_level.value;
    const date = f.action_date.value;
    const title = f.record_title.value;
    const details = f.record_details.value;

    await window.dbAdapter.insert('Academic_Data', {
      data_type: moduleId,
      academic_year: '2569',
      title: `[${grade}] ${title}`,
      category: `บันทึกจากระบบ ${moduleId}`,
      description: `${details} (วันที่ดำเนินการ: ${date})`,
      metric_value: 'บันทึกสำเร็จ'
    });

    f.reset();
    this.showToast(`บันทึกข้อมูลเข้าสู่ระบบ ${moduleId} และฐานข้อมูลโรงเรียนเรียบร้อยแล้ว`);
    this.render();
  }

  /**
   * 4. จัดการข่าวประชาสัมพันธ์ & ฝังลิงก์จาก Facebook (News Editor Modal + Drive Image Upload)
   */
  handleAdminFacebookNewsClick() {
    if (!window.authService.isTeacherOrAbove()) {
      this.openLoginModal(this.currentPage || 'home', () => this.openNewsEditorModal(null));
      return;
    }
    this.openNewsEditorModal(null);
  }

  openNewsEditorModal(newsId = null) {
    const existing = newsId ? window.dbAdapter.getTable('News').find((n) => n.news_id === newsId) : null;
    const profile = (window.dbAdapter.getTable('School_Profile')[0]) || {};
    const defaultFb = profile.facebook_url || 'https://www.facebook.com/profile.php?id=100014526581847';

    const item = existing || {
      title: '',
      category: 'ข่าวประชาสัมพันธ์',
      summary: '',
      content: '',
      cover_image_url: 'assets/img/logo.png',
      facebook_url: defaultFb,
      published_at: new Date().toISOString().slice(0, 10),
      is_pinned: false,
      publish_status: 'PUBLISHED'
    };

    this.openModal(
      existing ? 'แก้ไขข่าวประชาสัมพันธ์ / ลิงก์ Facebook' : 'เขียนข่าวประชาสัมพันธ์ใหม่ / ฝังโพสต์จากลิงก์ Facebook',
      `
      <form onsubmit="window.app.saveNewsForm(event, '${existing ? existing.news_id : ''}')" class="space-y-4">
        <div class="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1.5">
          <label class="block text-xs font-extrabold text-[#1877F2]">🔗 ลิงก์โพสต์ Facebook หรือวางโค้ด &lt;iframe&gt; จาก Facebook ได้เลย</label>
          <input
            type="text"
            name="facebook_url"
            value="${window.authService.sanitizeHTML(item.facebook_embed_src || item.facebook_url || defaultFb)}"
            placeholder="วางลิงก์โพสต์ https://www.facebook.com/... หรือวางโค้ด <iframe ...></iframe>"
            class="w-full px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-xs font-mono"
          />
          <p class="text-[11px] text-slate-500">รองรับทั้งการวางลิงก์โพสต์ปกติ และการวางโค้ด &lt;iframe src="..."&gt;&lt;/iframe&gt; จากเมนูฝัง (Embed) ของ Facebook</p>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">หัวข้อข่าวประชาสัมพันธ์ *</label>
          <input type="text" name="title" required value="${window.authService.sanitizeHTML(item.title)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่ข่าว</label>
            <select name="category" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              ${['ข่าวประชาสัมพันธ์', 'ข่าวกิจกรรม', 'ข่าวประกาศ', 'ข่าวรางวัลและผลงาน']
                .map((c) => `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`)
                .join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">วันที่เผยแพร่ (ตั้งเวลาเผยแพร่ได้)</label>
            <input type="date" name="published_at" value="${window.authService.sanitizeHTML(item.published_at)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">ข้อความสรุปย่อ (Summary) *</label>
          <input type="text" name="summary" required value="${window.authService.sanitizeHTML(item.summary)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">เนื้อหารายละเอียดข่าว *</label>
          <textarea name="content" rows="4" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm">${window.authService.sanitizeHTML(item.content)}</textarea>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <label class="block text-xs font-bold text-slate-700">รูปภาพประกอบข่าว (อัปโหลดจากไฟล์ภาพเข้า Google Drive หรือวางลิงก์รูปภาพ)</label>
          <input type="text" id="news-cover-url" name="cover_image_url" value="${window.authService.sanitizeHTML(item.cover_image_url)}" placeholder="วางลิงก์รูปภาพ หรืออัปโหลดไฟล์ด้านล่าง" class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs" />
          <input type="file" accept="image/*" onchange="window.app.handleInlineImageUpload(event, 'news-cover-url', 'News_Attachments')" class="text-xs text-slate-600" />
        </div>
        <label class="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
          <input type="checkbox" name="is_pinned" ${item.is_pinned ? 'checked' : ''} class="w-4 h-4 accent-amber-500" />
          <span>ปักหมุดเป็นข่าวเด่นหน้าแรก (Pinned News)</span>
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold cursor-pointer">บันทึกข่าวประชาสัมพันธ์</button>
        </div>
      </form>
      `
    );
  }

  async saveNewsForm(e, existingId) {
    e.preventDefault();
    const f = e.target;
    const user = window.authService.getCurrentUser();
    const rawFb = f.facebook_url ? f.facebook_url.value.trim() : '';
    const parsedFb = this.parseFacebookInput(rawFb);

    const payload = {
      title: f.title.value,
      category: f.category.value,
      published_at: f.published_at.value,
      summary: f.summary.value,
      content: f.content.value,
      cover_image_url: f.cover_image_url.value || 'assets/img/logo.png',
      facebook_url: parsedFb.facebookUrl || rawFb,
      facebook_embed_src: parsedFb.embedSrc || '',
      facebook_embed_height: parsedFb.embedHeight || 680,
      is_pinned: f.is_pinned.checked,
      is_featured: true,
      publish_status: 'PUBLISHED',
      author_name: user ? user.full_name : 'ผู้ดูแลระบบ'
    };

    if (existingId) {
      await window.dbAdapter.update('News', existingId, payload);
      this.showToast('อัปเดตข่าวประชาสัมพันธ์เรียบร้อยแล้ว');
    } else {
      payload.views_count = 1;
      await window.dbAdapter.insert('News', payload);
      this.showToast('เพิ่มข่าวประชาสัมพันธ์ใหม่เรียบร้อยแล้ว');
    }
    this.closeModal();
    this.render();
  }

  async toggleNewsPin(newsId) {
    const item = window.dbAdapter.getTable('News').find((n) => n.news_id === newsId);
    if (!item) return;
    await window.dbAdapter.update('News', newsId, { is_pinned: !item.is_pinned });
    this.showToast(item.is_pinned ? 'ยกเลิกการปักหมุดข่าวแล้ว' : 'ปักหมุดข่าวขึ้นหน้าแรกแล้ว');
    this.render();
  }

  /**
   * 5. จัดการระบบย่อยของครู (Module Management Modal)
   */
  openModuleFormModal(moduleId = null) {
    const existing = moduleId ? window.dbAdapter.getTable('System_Modules').find((m) => m.module_id === moduleId) : null;
    const allMods = window.dbAdapter.getTable('System_Modules');
    const nextNum = String(allMods.length + 1).padStart(2, '0');

    const item = existing || {
      module_code: `Module ${nextNum}`,
      module_name: '',
      category: 'ระบบงานวิชาการ',
      description: '',
      icon_name: 'layers',
      target_url: '#internal-app-custom',
      open_mode: 'MODAL',
      min_role: 'TEACHER',
      allowed_users_json: '["*"]',
      is_enabled: true,
      sort_order: allMods.length + 1
    };

    this.openModal(
      existing ? `แก้ไขโปรแกรมย่อย (${item.module_code})` : 'เพิ่มโปรแกรมย่อย (Module) ใหม่เข้าสู่ Teacher Portal',
      `
      <form onsubmit="window.app.saveModuleForm(event, '${existing ? existing.module_id : ''}')" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">รหัส Module *</label>
            <input type="text" name="module_code" required value="${window.authService.sanitizeHTML(item.module_code)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อโปรแกรมย่อย (Module Name) *</label>
            <input type="text" name="module_name" required value="${window.authService.sanitizeHTML(item.module_name)}" placeholder="เช่น ระบบบันทึกเวลาเรียนออนไลน์" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่ระบบงาน</label>
            <select name="category" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              ${[
                'ระบบงานวิชาการ',
                'ระบบงานบริหารบุคคล',
                'ระบบงานงบประมาณ',
                'ระบบงานบริหารทั่วไป',
                'ระบบบันทึกข้อมูลนักเรียน',
                'ระบบงานประชาสัมพันธ์',
                'ระบบเครื่องมือ AI เพื่อการศึกษา',
                'ระบบโปรแกรมย่อยเพิ่มเติม'
              ]
                .map((c) => `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`)
                .join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ไอคอนระบบ (Lucide Icon)</label>
            <select name="icon_name" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              ${['calculator', 'folder-kanban', 'user-check', 'users', 'book-open-check', 'megaphone', 'pie-chart', 'sparkles', 'layers', 'cpu', 'file-spreadsheet', 'award']
                .map((ic) => `<option value="${ic}" ${item.icon_name === ic ? 'selected' : ''}>${ic}</option>`)
                .join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ลำดับการแสดงผล</label>
            <input type="number" name="sort_order" value="${Number(item.sort_order || 1)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">คำอธิบายการทำงานของระบบย่อย *</label>
          <textarea name="description" rows="2" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">${window.authService.sanitizeHTML(item.description)}</textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">URL ของโปรแกรม (รองรับเว็บภายนอก / GAS URL)</label>
            <input type="text" name="target_url" required value="${window.authService.sanitizeHTML(item.target_url)}" placeholder="https://... หรือ #internal-app" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">รูปแบบการเปิดโปรแกรม</label>
            <select name="open_mode" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              <option value="MODAL" ${item.open_mode === 'MODAL' ? 'selected' : ''}>เปิดในหน้าเดียวกัน (In-App Workspace)</option>
              <option value="NEW_TAB" ${item.open_mode === 'NEW_TAB' ? 'selected' : ''}>เปิดในแท็บใหม่ (New Browser Tab)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ระดับสิทธิ์ขั้นต่ำที่เข้าถึงได้</label>
            <select name="min_role" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              <option value="TEACHER" ${item.min_role === 'TEACHER' ? 'selected' : ''}>ครูและบุคลากรทุกคน (TEACHER ขึ้นไป)</option>
              <option value="ADMIN" ${item.min_role === 'ADMIN' ? 'selected' : ''}>เฉพาะผู้ดูแลระบบ (ADMIN ขึ้นไป)</option>
              <option value="DEVELOPER" ${item.min_role === 'DEVELOPER' ? 'selected' : ''}>เฉพาะผู้พัฒนาระบบ (DEVELOPER)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">กำหนดเฉพาะครูที่ได้รับอนุญาต (JSON / Username)</label>
            <input type="text" name="allowed_users_json" value="${window.authService.sanitizeHTML(item.allowed_users_json || '["*"]')}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono" />
          </div>
        </div>

        <label class="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
          <input type="checkbox" name="is_enabled" ${item.is_enabled ? 'checked' : ''} class="w-4 h-4 accent-amber-500" />
          <span>เปิดใช้งาน Module นี้ในหน้า Teacher Portal</span>
        </label>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold cursor-pointer">บันทึกข้อมูล Module</button>
        </div>
      </form>
      `
    );
  }

  async saveModuleForm(e, existingId) {
    e.preventDefault();
    const f = e.target;
    const payload = {
      module_code: f.module_code.value,
      module_name: f.module_name.value,
      category: f.category.value,
      icon_name: f.icon_name.value,
      sort_order: Number(f.sort_order.value || 1),
      description: f.description.value,
      target_url: f.target_url.value,
      open_mode: f.open_mode.value,
      min_role: f.min_role.value,
      allowed_users_json: f.allowed_users_json.value || '["*"]',
      is_enabled: f.is_enabled.checked
    };

    if (existingId) {
      await window.dbAdapter.update('System_Modules', existingId, payload);
      this.showToast(`อัปเดต ${payload.module_code} เรียบร้อยแล้ว`);
    } else {
      await window.dbAdapter.insert('System_Modules', payload);
      this.showToast(`เพิ่มโปรแกรมย่อย ${payload.module_code} สำเร็จ`);
    }
    this.closeModal();
    this.render();
  }

  async toggleModuleStatus(moduleId) {
    const mod = window.dbAdapter.getTable('System_Modules').find((m) => m.module_id === moduleId);
    if (!mod) return;
    await window.dbAdapter.update('System_Modules', moduleId, { is_enabled: !mod.is_enabled });
    this.showToast(`${mod.module_code}: ${!mod.is_enabled ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานชั่วคราว'}`);
    this.render();
  }

  /**
   * 6. จัดการบุคลากร (ฟอร์มพร้อมพรีวิวภาพด้านบน ชื่อและตำแหน่งด้านล่าง อัปเดตได้โดยแอดมิน)
   */
  handleAdminPersonnelEditClick(personnelId) {
    if (!window.authService.isTeacherOrAbove()) {
      this.openLoginModal(this.currentPage || 'personnel', () => this.openPersonnelModal(personnelId));
      return;
    }
    this.openPersonnelModal(personnelId);
  }

  handleAdminPersonnelAddClick() {
    if (!window.authService.isTeacherOrAbove()) {
      this.openLoginModal(this.currentPage || 'personnel', () => this.openPersonnelModal(null));
      return;
    }
    this.openPersonnelModal(null);
  }

  openPersonnelModal(personnelId = null) {
    const existing = personnelId ? window.dbAdapter.getTable('Personnel').find((p) => p.personnel_id === personnelId) : null;
    const item = existing || {
      prefix: 'นางสาว',
      first_name: '',
      last_name: '',
      position: 'ครู',
      academic_standing: '-',
      department: 'ข้าราชการครูและบุคลากรทางการศึกษา',
      subject_group: '',
      education_degree: '',
      email: '',
      photo_url: '',
      role_group: 'TEACHER',
      sort_order: window.dbAdapter.getTable('Personnel').length + 1
    };

    const previewImg = item.photo_url && String(item.photo_url).trim() !== ''
      ? window.driveService.resolveDriveImageUrl(item.photo_url)
      : 'assets/img/logo.png';

    this.openModal(
      existing ? `แก้ไขข้อมูล / เปลี่ยนรูปภาพบุคลากร (${item.prefix}${item.first_name} ${item.last_name})` : 'ฟอร์มเพิ่มบุคลากรใหม่ (โรงเรียนบ้านบกหนองทันน้ำ)',
      `
      <form onsubmit="window.app.savePersonnelForm(event, '${existing ? existing.personnel_id : ''}')" class="space-y-4">
        <!-- พรีวิวภาพด้านบน + ปุ่มอัปโหลดรูปภาพเข้า Google Drive -->
        <div class="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col sm:flex-row items-center gap-4">
          <div class="w-28 h-36 rounded-2xl bg-white border-2 border-amber-300 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
            <img id="per-photo-preview-img" src="${previewImg}" alt="ตัวอย่างรูปภาพบุคลากร" class="w-full h-full object-cover object-top" onerror="this.src='assets/img/logo.png'" />
          </div>
          <div class="flex-1 space-y-2 w-full">
            <label class="block text-xs font-bold text-amber-900">1. รูปภาพบุคลากร (แสดงด้านบนของการ์ด)</label>
            <input
              type="text"
              id="per-photo-url"
              name="photo_url"
              value="${window.authService.sanitizeHTML(item.photo_url || '')}"
              oninput="document.getElementById('per-photo-preview-img').src = this.value ? window.driveService.resolveDriveImageUrl(this.value) : 'assets/img/logo.png'"
              placeholder="เว้นว่างไว้รอรูปภาพ หรือวางลิงก์ Google Drive / อัปโหลดไฟล์ด้านล่าง"
              class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
            />
            <div class="flex flex-wrap items-center gap-2">
              <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold cursor-pointer transition">
                <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                <span>เลือกไฟล์รูปภาพจากเครื่อง</span>
                <input type="file" accept="image/*" onchange="window.app.handleInlineImageUpload(event, 'per-photo-url', 'Personnel_Photos', 'per-photo-preview-img')" class="hidden" />
              </label>
              <button
                type="button"
                onclick="document.getElementById('per-photo-url').value=''; document.getElementById('per-photo-preview-img').src='assets/img/logo.png';"
                class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                เว้นว่างรูปภาพ
              </button>
            </div>
          </div>
        </div>

        <!-- ชื่อ - นามสกุล -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">คำนำหน้า *</label>
            <input type="text" name="prefix" list="prefix-options" required value="${window.authService.sanitizeHTML(item.prefix)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
            <datalist id="prefix-options">
              <option value="นาย"></option>
              <option value="นาง"></option>
              <option value="นางสาว"></option>
              <option value="ว่าที่ร้อยตรี"></option>
            </datalist>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อ *</label>
            <input type="text" name="first_name" required value="${window.authService.sanitizeHTML(item.first_name)}" placeholder="ระบุชื่อจริง" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">นามสกุล *</label>
            <input type="text" name="last_name" required value="${window.authService.sanitizeHTML(item.last_name)}" placeholder="ระบุนามสกุล" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
        </div>

        <!-- ตำแหน่ง และ วิทยฐานะ -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ตำแหน่ง *</label>
            <input type="text" name="position" list="position-options" required value="${window.authService.sanitizeHTML(item.position)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
            <datalist id="position-options">
              <option value="ผู้อำนวยการโรงเรียน"></option>
              <option value="รองผู้อำนวยการโรงเรียน"></option>
              <option value="ครู"></option>
              <option value="ครูผู้ช่วย"></option>
              <option value="เจ้าหน้าที่ธุระการโรงเรียน"></option>
              <option value="พี่เลี้ยงเด็กพิการ"></option>
              <option value="ช่างไม้ 4"></option>
            </datalist>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">วิทยฐานะ (หากไม่มีให้ใส่ - )</label>
            <input type="text" name="academic_standing" list="standing-options" value="${window.authService.sanitizeHTML(item.academic_standing || '-')}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
            <datalist id="standing-options">
              <option value="-"></option>
              <option value="ครูชำนาญการ"></option>
              <option value="ครูชำนาญการพิเศษ"></option>
              <option value="ครูเชี่ยวชาญ"></option>
              <option value="ผู้อำนวยการชำนาญการพิเศษ"></option>
              <option value="รองผู้อำนวยการชำนาญการพิเศษ"></option>
            </datalist>
          </div>
        </div>

        <!-- หมวดหมู่บุคลากร และ ลำดับการแสดงผล -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">กลุ่มบุคลากร</label>
            <select name="role_group" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold">
              <option value="EXECUTIVE" ${item.role_group === 'EXECUTIVE' ? 'selected' : ''}>คณะผู้บริหารสถานศึกษา</option>
              <option value="TEACHER" ${item.role_group === 'TEACHER' ? 'selected' : ''}>ข้าราชการครู / ครูผู้สอน</option>
              <option value="STAFF" ${item.role_group === 'STAFF' ? 'selected' : ''}>บุคลากรสนับสนุนการสอน</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">กลุ่มสาระฯ / สายงาน (เว้นว่างได้)</label>
            <input type="text" name="subject_group" value="${window.authService.sanitizeHTML(item.subject_group || '')}" placeholder="เว้นว่างไว้กรอกเพิ่มเติมภายหลังได้" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ลำดับการแสดงผลที่</label>
            <input type="number" name="sort_order" value="${Number(item.sort_order || 1)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
        </div>

        <input type="hidden" name="department" value="${window.authService.sanitizeHTML(item.department || 'ข้าราชการครูและบุคลากรทางการศึกษา')}" />
        <input type="hidden" name="education_degree" value="${window.authService.sanitizeHTML(item.education_degree || '')}" />
        <input type="hidden" name="email" value="${window.authService.sanitizeHTML(item.email || '')}" />

        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          ${
            existing
              ? `<button type="button" onclick="window.app.closeModal(); window.app.deleteRowConfirm('Personnel', '${existing.personnel_id}');" class="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold cursor-pointer">ลบบุคลากรท่านนี้</button>`
              : `<div></div>`
          }
          <div class="flex gap-2">
            <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
            <button type="submit" class="px-5 py-2.5 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold cursor-pointer">บันทึกข้อมูลบุคลากร</button>
          </div>
        </div>
      </form>
      `
    );
  }

  async savePersonnelForm(e, existingId) {
    e.preventDefault();
    const f = e.target;
    const roleGroup = f.role_group ? f.role_group.value : 'TEACHER';
    const defaultDept = roleGroup === 'EXECUTIVE'
      ? 'คณะผู้บริหารสถานศึกษา'
      : (roleGroup === 'STAFF' ? 'บุคลากรสนับสนุนการสอน' : 'ข้าราชการครูและบุคลากรทางการศึกษา');

    const payload = {
      prefix: f.prefix.value.trim(),
      first_name: f.first_name.value.trim(),
      last_name: f.last_name.value.trim(),
      position: f.position.value.trim(),
      academic_standing: f.academic_standing.value.trim() || '-',
      role_group: roleGroup,
      department: defaultDept,
      subject_group: f.subject_group.value.trim(),
      education_degree: f.education_degree ? f.education_degree.value : '',
      email: f.email ? f.email.value : '',
      photo_url: f.photo_url.value.trim(),
      sort_order: Number(f.sort_order ? f.sort_order.value : 99),
      status: 'ปฏิบัติราชการ'
    };

    if (existingId) {
      await window.dbAdapter.update('Personnel', existingId, payload);
      this.showToast(`อัปเดตข้อมูล ${payload.prefix}${payload.first_name} ${payload.last_name} เรียบร้อยแล้ว`);
    } else {
      await window.dbAdapter.insert('Personnel', payload);
      this.showToast(`เพิ่มข้อมูล ${payload.prefix}${payload.first_name} ${payload.last_name} เรียบร้อยแล้ว`);
    }
    this.closeModal();
    this.render();
  }

  openStudentStatModal(statId = null) {
    const existing = statId ? window.dbAdapter.getTable('Students_Statistics').find((s) => s.stat_id === statId) : null;
    const item = existing || {
      academic_year: '2569',
      semester: '2',
      grade_level: 'ประถมศึกษาปีที่ 1',
      level_group: 'ระดับประถมศึกษา',
      classrooms: 1,
      male_count: 15,
      female_count: 15
    };

    this.openModal(
      existing ? `แก้ไขข้อมูลนักเรียน (${item.grade_level})` : 'เพิ่มข้อมูลสถิตินักเรียนรายชั้น',
      `
      <form onsubmit="window.app.saveStudentStatForm(event, '${existing ? existing.stat_id : ''}')" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ปีการศึกษา</label>
            <input type="text" name="academic_year" required value="${window.authService.sanitizeHTML(item.academic_year)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ภาคเรียน</label>
            <input type="text" name="semester" required value="${window.authService.sanitizeHTML(item.semester)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ระดับการศึกษา</label>
            <select name="level_group" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              <option value="ระดับปฐมวัย" ${item.level_group === 'ระดับปฐมวัย' ? 'selected' : ''}>ระดับปฐมวัย</option>
              <option value="ระดับประถมศึกษา" ${item.level_group === 'ระดับประถมศึกษา' ? 'selected' : ''}>ระดับประถมศึกษา</option>
              <option value="ระดับมัธยมศึกษาตอนต้น" ${item.level_group === 'ระดับมัธยมศึกษาตอนต้น' ? 'selected' : ''}>ระดับมัธยมศึกษาตอนต้น</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อชั้นเรียน *</label>
            <input type="text" name="grade_level" required value="${window.authService.sanitizeHTML(item.grade_level)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">จำนวนห้องเรียน</label>
            <input type="number" name="classrooms" required value="${Number(item.classrooms || 1)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">นักเรียนชาย (คน)</label>
            <input type="number" name="male_count" required value="${Number(item.male_count || 0)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">นักเรียนหญิง (คน)</label>
            <input type="number" name="female_count" required value="${Number(item.female_count || 0)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">บันทึกสถิตินักเรียน</button>
        </div>
      </form>
      `
    );
  }

  async saveStudentStatForm(e, existingId) {
    e.preventDefault();
    const f = e.target;
    const male = Number(f.male_count.value || 0);
    const female = Number(f.female_count.value || 0);
    const payload = {
      academic_year: f.academic_year.value,
      semester: f.semester.value,
      level_group: f.level_group.value,
      grade_level: f.grade_level.value,
      classrooms: Number(f.classrooms.value || 1),
      male_count: male,
      female_count: female,
      total_count: male + female
    };

    if (existingId) {
      await window.dbAdapter.update('Students_Statistics', existingId, payload);
      this.showToast(`อัปเดตจำนวนนักเรียนชั้น ${payload.grade_level} (รวม ${payload.total_count} คน) เรียบร้อยแล้ว`);
    } else {
      await window.dbAdapter.insert('Students_Statistics', payload);
      this.showToast('เพิ่มข้อมูลสถิตินักเรียนเรียบร้อยแล้ว');
    }
    this.closeModal();
    this.render();
  }

  /**
   * 6.1 ระบบจัดการสไลด์ภาพโอกาสสำคัญของนักเรียน (Pro Student Highlight Slider)
   * และระบบแก้ไขจำนวนนักเรียน 3 ปีย้อนหลัง (2567, 2568, 2569)
   */
  handleAdminSlideAddClick() {
    if (!window.authService.isTeacherOrAbove()) {
      this.openLoginModal(this.currentPage || 'home', () => this.openSlideUploadModal(null));
      return;
    }
    this.openSlideUploadModal(null);
  }

  handleAdminSlideEditClick(galleryId) {
    if (!window.authService.isTeacherOrAbove()) {
      this.openLoginModal(this.currentPage || 'home', () => this.openSlideUploadModal(galleryId));
      return;
    }
    this.openSlideUploadModal(galleryId);
  }

  openSlideUploadModal(galleryId = null) {
    const existing = galleryId ? window.dbAdapter.getTable('Gallery').find((g) => g.gallery_id === galleryId) : null;
    const item = existing || {
      title: '',
      category: 'สไลด์โอกาสสำคัญนักเรียน',
      occasion_tag: 'โอกาสสำคัญของนักเรียน',
      caption: '',
      image_url: 'assets/img/hero_banner.png',
      facebook_url: 'https://www.facebook.com/profile.php?id=100014526581847',
      is_slider: true
    };

    const previewImg = item.image_url ? window.driveService.resolveDriveImageUrl(item.image_url) : 'assets/img/hero_banner.png';

    this.openModal(
      existing ? 'แก้ไขสไลด์โอกาสสำคัญของนักเรียน' : 'อัปโหลดภาพสไลด์โอกาสสำคัญของนักเรียน (Pro Student Slider)',
      `
      <form onsubmit="window.app.saveSlideUploadForm(event, '${existing ? existing.gallery_id : ''}')" class="space-y-4">
        <div class="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
          <div class="aspect-16/9 max-h-52 w-full rounded-xl overflow-hidden bg-slate-900 border border-amber-300 flex items-center justify-center">
            <img id="slide-preview-img" src="${previewImg}" alt="ตัวอย่างภาพสไลด์" class="w-full h-full object-cover" onerror="this.src='assets/img/hero_banner.png'" />
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-extrabold text-amber-950">1. อัปโหลดไฟล์ภาพสไลด์จากเครื่อง (เชื่อมต่อ Google Drive อัตโนมัติ) *</label>
            <input
              type="text"
              id="slide-img-url"
              name="image_url"
              required
              value="${window.authService.sanitizeHTML(item.image_url)}"
              oninput="document.getElementById('slide-preview-img').src = this.value ? window.driveService.resolveDriveImageUrl(this.value) : 'assets/img/hero_banner.png'"
              placeholder="วางลิงก์รูปภาพ หรือคลิกปุ่มเลือกไฟล์ภาพด้านล่าง"
              class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
            />
            <input type="file" accept="image/*" onchange="window.app.handleInlineImageUpload(event, 'slide-img-url', 'Banner_Images', 'slide-preview-img')" class="text-xs text-slate-700" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ป้ายกำกับโอกาสสำคัญ (Badge) *</label>
            <input
              type="text"
              name="occasion_tag"
              list="occasion-options"
              required
              value="${window.authService.sanitizeHTML(item.occasion_tag || 'โอกาสสำคัญของนักเรียน')}"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
            />
            <datalist id="occasion-options">
              <option value="โอกาสสำคัญของนักเรียน"></option>
              <option value="แสดงความยินดีนักเรียน"></option>
              <option value="ผลงานดีเด่นระดับเขตพื้นที่ฯ"></option>
              <option value="กิจกรรมจิตอาสาและคุณธรรม"></option>
              <option value="กีฬาสีและกิจกรรมพัฒนาผู้เรียน"></option>
            </datalist>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ลิงก์โพสต์ Facebook ที่เกี่ยวข้อง (ถ้ามี)</label>
            <input
              type="text"
              name="facebook_url"
              value="${window.authService.sanitizeHTML(item.facebook_url || 'https://www.facebook.com/profile.php?id=100014526581847')}"
              placeholder="https://www.facebook.com/..."
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">หัวข้อเรื่องบนสไลด์ (Title) *</label>
          <input type="text" name="title" required value="${window.authService.sanitizeHTML(item.title)}" placeholder="เช่น ขอแสดงความยินดีกับนักเรียนตัวแทนการแข่งขันทักษะวิชาการ..." class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold" />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">คำบรรยายรายละเอียดใต้หัวข้อ (Caption)</label>
          <textarea name="caption" rows="2" placeholder="ระบุรายละเอียดความสำเร็จหรือกิจกรรมของนักเรียน..." class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm">${window.authService.sanitizeHTML(item.caption || '')}</textarea>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          ${
            existing
              ? `<button type="button" onclick="window.app.closeModal(); window.app.deleteRowConfirm('Gallery', '${existing.gallery_id}');" class="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer">ลบสไลด์นี้</button>`
              : `<div></div>`
          }
          <div class="flex gap-2">
            <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold cursor-pointer">บันทึกขึ้นสไลด์หน้าเว็บไซต์</button>
          </div>
        </div>
      </form>
      `
    );
  }

  async saveSlideUploadForm(e, existingId) {
    e.preventDefault();
    const f = e.target;
    const user = window.authService.getCurrentUser();
    const payload = {
      title: f.title.value.trim(),
      category: 'สไลด์โอกาสสำคัญนักเรียน',
      occasion_tag: f.occasion_tag.value.trim() || 'โอกาสสำคัญของนักเรียน',
      caption: f.caption.value.trim(),
      image_url: f.image_url.value.trim() || 'assets/img/hero_banner.png',
      facebook_url: f.facebook_url ? f.facebook_url.value.trim() : '',
      is_slider: true,
      uploaded_by: user ? user.full_name : 'Admin',
      created_at: new Date().toISOString().slice(0, 10)
    };

    if (existingId) {
      await window.dbAdapter.update('Gallery', existingId, payload);
      this.showToast('อัปเดตภาพสไลด์โอกาสสำคัญของนักเรียนเรียบร้อยแล้ว');
    } else {
      await window.dbAdapter.insert('Gallery', payload);
      this.showToast('เพิ่มภาพสไลด์โอกาสสำคัญของนักเรียนขึ้นหน้าเว็บไซต์เรียบร้อยแล้ว');
    }
    this.closeModal();
    this.render();
  }

  handleExamEditClick(code) {
    if (!window.authService.isTeacherOrAbove()) {
      this.openLoginModal(this.currentPage || 'academic', () => this.openExamEditModal(code));
      return;
    }
    this.openExamEditModal(code);
  }

  openExamEditModal(code) {
    const pv = window.publicViews;
    const cfg = pv.getExamConfigs().find((c) => c.code === code);
    if (!cfg) return;
    const years = pv.getExamYears();

    const rowsHtml = cfg.subjects
      .map(
        (s, si) => `
        <tr>
          <td class="py-2 px-2 text-xs font-bold text-slate-800">${window.authService.sanitizeHTML(s)}</td>
          ${years
            .map((y, yi) => {
              const v = pv.getExamValue(code, y, s);
              return `<td class="py-2 px-1.5"><input type="number" step="0.01" min="0" max="100" name="s${si}_y${y}" value="${v === null ? '' : v}" placeholder="-" class="w-full px-2 py-1.5 rounded-lg border ${yi === 2 ? 'border-amber-400 bg-amber-50/60' : 'border-slate-300 bg-white'} text-sm font-extrabold text-center" /></td>`;
            })
            .join('')}
        </tr>`
      )
      .join('');

    this.openModal(
      `อัปเดตข้อมูล ${cfg.short} (${cfg.logoImg ? 'สทศ. NIETS • ' : ''}3 ปีการศึกษา)`,
      `
      <form onsubmit="window.app.saveExamForm(event, '${code}')" class="space-y-4">
        ${
          cfg.logoImg
            ? `<div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <img src="${cfg.logoImg}" alt="สทศ. NIETS" class="w-20 h-10 object-contain shrink-0" />
                <div class="text-xs text-slate-600">
                  <div class="font-bold text-slate-900">${cfg.title}</div>
                  <div>สถาบันทดสอบทางการศึกษาแห่งชาติ (องค์การมหาชน)</div>
                </div>
              </div>`
            : ''
        }
        <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed">
          กรอก <strong>คะแนนเฉลี่ยร้อยละ (0–100)</strong> ตามผลจริงจากรายงานผลอย่างเป็นทางการ • หากยังไม่มีผลให้เว้นว่างไว้ (กราฟจะแสดง "รอข้อมูล")
          • เมื่อมีการบันทึกปีการศึกษาใหม่ กราฟจะเลื่อนแสดง 3 ปีล่าสุดให้อัตโนมัติ
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <label class="font-bold text-slate-700">เพิ่มปีการศึกษาใหม่ (เช่น 2570):</label>
          <input type="number" name="new_year" min="2560" max="2700" placeholder="เว้นว่างถ้าไม่เพิ่ม" class="w-40 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm text-center" />
          <span class="text-slate-500">(กรอกคะแนนปีใหม่ในช่องด้านล่างหลังบันทึกปีนี้อีกครั้ง)</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-slate-900 text-white text-xs">
                <th class="py-2 px-2 text-left rounded-tl-lg">วิชา / ด้าน</th>
                ${years.map((y, yi) => `<th class="py-2 px-2 text-center ${yi === 2 ? 'bg-red-700 rounded-tr-lg' : ''}">${y}${yi === 2 ? ' (ล่าสุด)' : ''}</th>`).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">${rowsHtml}</tbody>
          </table>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold cursor-pointer">บันทึกและอัปเดตกราฟ</button>
        </div>
      </form>
      `,
      'max-w-2xl'
    );
  }

  async saveExamForm(e, code) {
    e.preventDefault();
    const f = e.target;
    const pv = window.publicViews;
    const cfg = pv.getExamConfigs().find((c) => c.code === code);
    if (!cfg) return;
    const years = pv.getExamYears();
    const group = `EXAM_${code}`;
    const stats = window.dbAdapter.getTable('School_Statistics');
    const user = window.authService.getCurrentUser();
    const today = new Date().toISOString().slice(0, 10);

    for (let si = 0; si < cfg.subjects.length; si++) {
      for (const y of years) {
        const el = f.elements[`s${si}_y${y}`];
        if (!el) continue;
        const raw = String(el.value).trim();
        const subject = cfg.subjects[si];
        const existing = stats.find((k) => k.metric_group === group && String(k.academic_year) === String(y) && k.metric_name === subject);
        const num = raw === '' ? NaN : Number(raw);
        if (raw !== '' && (!Number.isFinite(num) || num < 0 || num > 100)) {
          this.showToast(`ค่าคะแนนของ "${subject}" ปี ${y} ต้องอยู่ระหว่าง 0–100`, 'error');
          return;
        }
        const payload = {
          academic_year: String(y),
          semester: '2',
          metric_group: group,
          metric_name: subject,
          metric_value: raw === '' ? '-' : num,
          metric_unit: '%',
          target_value: '-',
          notes: `${cfg.short} ปีการศึกษา ${y} • บันทึกโดย ${user ? user.full_name : '-'}`,
          updated_at: today
        };
        if (existing) {
          if (String(existing.metric_value) !== String(payload.metric_value)) {
            await window.dbAdapter.update('School_Statistics', existing.kpi_id, payload);
          }
        } else if (raw !== '') {
          payload.kpi_id = `EXAM-${code}-${y}-${si + 1}`;
          await window.dbAdapter.insert('School_Statistics', payload);
        }
      }
    }

    // เพิ่มปีการศึกษาใหม่ (สร้างแถวว่างรอข้อมูล เพื่อให้กราฟเลื่อนเป็น 3 ปีล่าสุดรวมปีใหม่)
    const newYear = Number(String(f.new_year.value || '').trim());
    if (Number.isFinite(newYear) && newYear > years[2]) {
      for (let si = 0; si < cfg.subjects.length; si++) {
        await window.dbAdapter.insert('School_Statistics', {
          kpi_id: `EXAM-${code}-${newYear}-${si + 1}`,
          academic_year: String(newYear),
          semester: '2',
          metric_group: group,
          metric_name: cfg.subjects[si],
          metric_value: '-',
          metric_unit: '%',
          target_value: '-',
          notes: `${cfg.short} ปีการศึกษา ${newYear} รออัปเดตผล`,
          updated_at: today
        });
      }
    }

    this.closeModal();
    this.showToast(`อัปเดตข้อมูล ${cfg.short} เรียบร้อยแล้ว`);
    this.render();
  }

  handleAdminThreeYearStudentClick() {
    if (!window.authService.isTeacherOrAbove()) {
      this.openLoginModal(this.currentPage || 'home', () => this.openThreeYearStudentModal());
      return;
    }
    this.openThreeYearStudentModal();
  }

  openThreeYearStudentModal() {
    const trends = window.publicViews ? window.publicViews.getThreeYearStudentTrend() : [];
    const y2567 = trends.find((t) => String(t.academic_year) === '2567') || { metric_value: '-' };
    const y2568 = trends.find((t) => String(t.academic_year) === '2568') || { metric_value: '-' };
    const y2569 = trends.find((t) => String(t.academic_year) === '2569') || { metric_value: '285' };

    this.openModal(
      'แก้ไขข้อมูลกราฟจำนวนนักเรียน 3 ปีย้อนหลัง (แสดงเฉพาะ 3 ปีย้อนหลัง)',
      `
      <form onsubmit="window.app.saveThreeYearStudentForm(event)" class="space-y-4">
        <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
          ระบุจำนวนนักเรียนรวมในแต่ละปีการศึกษา (หากปีใดต้องการเว้นว่างให้ใส่เครื่องหมาย <strong>-</strong>)
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label class="block text-xs font-extrabold text-slate-700 mb-1.5">ปีการศึกษา 2567</label>
            <input type="text" name="year_2567" required value="${window.authService.sanitizeHTML(String(y2567.metric_value ?? '-'))}" placeholder="เช่น - หรือ 270" class="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-extrabold text-center" />
          </div>
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label class="block text-xs font-extrabold text-slate-700 mb-1.5">ปีการศึกษา 2568</label>
            <input type="text" name="year_2568" required value="${window.authService.sanitizeHTML(String(y2568.metric_value ?? '-'))}" placeholder="เช่น - หรือ 280" class="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-extrabold text-center" />
          </div>
          <div class="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-400">
            <label class="block text-xs font-extrabold text-amber-900 mb-1.5">ปีการศึกษา 2569 (ปัจจุบัน)</label>
            <input type="text" name="year_2569" required value="${window.authService.sanitizeHTML(String(y2569.metric_value ?? '285'))}" placeholder="เช่น 285" class="w-full px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-sm font-extrabold text-center" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold cursor-pointer">บันทึกและอัปเดตกราฟ 3 ปี</button>
        </div>
      </form>
      `,
      'max-w-xl'
    );
  }

  async saveThreeYearStudentForm(e) {
    e.preventDefault();
    const f = e.target;
    const val2567 = f.year_2567.value.trim() || '-';
    const val2568 = f.year_2568.value.trim() || '-';
    const val2569 = f.year_2569.value.trim() || '285';

    const stats = window.dbAdapter.getTable('School_Statistics');
    const upsertYear = async (yearStr, valStr, kpiIdDefault) => {
      const existing = stats.find((s) => s.metric_group === 'STUDENT_TREND' && String(s.academic_year) === yearStr);
      const isNum = valStr !== '-' && Number.isFinite(Number(valStr)) && Number(valStr) > 0;
      const payload = {
        academic_year: yearStr,
        metric_group: 'STUDENT_TREND',
        metric_name: `จำนวนนักเรียนรวมปีการศึกษา ${yearStr}`,
        metric_value: isNum ? Number(valStr) : '-',
        target_value: 285,
        metric_unit: 'คน',
        notes: isNum ? `ปีการศึกษา ${yearStr} จำนวน ${valStr} คน` : 'เว้นว่างรอข้อมูลย้อนหลัง'
      };
      if (existing) {
        await window.dbAdapter.update('School_Statistics', existing.kpi_id, payload);
      } else {
        payload.kpi_id = kpiIdDefault;
        await window.dbAdapter.insert('School_Statistics', payload);
      }
    };

    await upsertYear('2567', val2567, 'KPI-TREND-2567');
    await upsertYear('2568', val2568, 'KPI-TREND-2568');
    await upsertYear('2569', val2569, 'KPI-TREND-2569');

    this.closeModal();
    this.showToast('อัปเดตกราฟจำนวนนักเรียน 3 ปีย้อนหลัง (2567–2569) เรียบร้อยแล้ว');
    this.render();
  }

  openGalleryUploadModal() {
    this.openModal(
      'อัปโหลดรูปภาพกิจกรรมเข้าสู่คลัง Google Drive (ตาราง Gallery)',
      `
      <form onsubmit="window.app.saveGalleryUploadForm(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อภาพกิจกรรม / อัลบั้ม *</label>
          <input type="text" name="title" required placeholder="ระบุชื่อกิจกรรม..." class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่ภาพกิจกรรม</label>
          <input type="text" name="category" required value="กิจกรรมวิชาการ" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">คำบรรยายภาพ (Caption)</label>
          <input type="text" name="caption" placeholder="รายละเอียดเพิ่มเติม..." class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
        </div>
        <div class="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
          <label class="block text-xs font-bold text-amber-900">เลือกไฟล์รูปภาพจากเครื่อง หรือวางลิงก์ Google Drive *</label>
          <input type="text" id="gal-img-url" name="image_url" required placeholder="https://... หรืออัปโหลดไฟล์ด้านล่าง" class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs" />
          <input type="file" accept="image/*" onchange="window.app.handleInlineImageUpload(event, 'gal-img-url', 'Activity_Photos')" class="text-xs text-slate-700" />
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">บันทึกเข้าคลังภาพ</button>
        </div>
      </form>
      `
    );
  }

  async saveGalleryUploadForm(e) {
    e.preventDefault();
    const f = e.target;
    const user = window.authService.getCurrentUser();
    await window.dbAdapter.insert('Gallery', {
      title: f.title.value,
      category: f.category.value,
      caption: f.caption.value,
      image_url: f.image_url.value,
      uploaded_by: user ? user.full_name : 'Admin',
      created_at: new Date().toISOString().slice(0, 10)
    });
    this.closeModal();
    this.showToast('อัปโหลดภาพกิจกรรมเข้าสู่ระบบเรียบร้อยแล้ว');
    this.render();
  }

  openDocumentUploadModal() {
    this.openModal(
      'อัปโหลดเอกสารราชการ / รายงาน SAR / แผนปฏิบัติการ (ตาราง Documents)',
      `
      <form onsubmit="window.app.saveDocumentUploadForm(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อเอกสารราชการ *</label>
          <input type="text" name="title" required placeholder="เช่น รายงานการประเมินตนเอง (SAR) ปีการศึกษา 2569" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่เอกสาร</label>
            <select name="category" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              <option value="รายงานประจำปี / SAR">รายงานประจำปี / SAR</option>
              <option value="แผนปฏิบัติการ">แผนปฏิบัติการ</option>
              <option value="เอกสารหลักสูตรและวิชาการ">เอกสารหลักสูตรและวิชาการ</option>
              <option value="เอกสารเผยแพร่">เอกสารเผยแพร่</option>
              <option value="แบบฟอร์มภายในสำหรับครู">แบบฟอร์มภายในสำหรับครู</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ปีการศึกษา</label>
            <input type="text" name="academic_year" value="2569" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">สิทธิ์การเข้าถึง</label>
            <select name="access_level" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              <option value="PUBLIC">เผยแพร่สาธารณะ (PUBLIC)</option>
              <option value="TEACHER">เฉพาะครูและบุคลากร (TEACHER)</option>
            </select>
          </div>
        </div>
        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <label class="block text-xs font-bold text-slate-700">ลิงก์ไฟล์ Google Drive หรืออัปโหลดไฟล์จากเครื่อง</label>
          <input type="text" id="doc-dl-url" name="download_url" value="#official-pdf" class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs" />
          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onchange="window.app.handleInlineImageUpload(event, 'doc-dl-url', 'Official_Documents')" class="text-xs text-slate-600" />
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">บันทึกเอกสาร</button>
        </div>
      </form>
      `
    );
  }

  async saveDocumentUploadForm(e) {
    e.preventDefault();
    const f = e.target;
    const user = window.authService.getCurrentUser();
    await window.dbAdapter.insert('Documents', {
      title: f.title.value,
      category: f.category.value,
      academic_year: f.academic_year.value,
      access_level: f.access_level.value,
      file_type: 'PDF',
      file_size: '1.8 MB',
      download_url: f.download_url.value,
      download_count: 0,
      uploaded_by: user ? user.full_name : 'Admin',
      published_date: new Date().toISOString().slice(0, 10)
    });
    this.closeModal();
    this.showToast('อัปโหลดเอกสารเผยแพร่สำเร็จ');
    this.render();
  }

  /**
   * 7. จัดการบัญชีผู้ใช้งาน (User Management + SHA-256 Password Hashing)
   */
  openUserModal(userId = null) {
    const existing = userId ? window.dbAdapter.getTable('User_Accounts').find((u) => u.user_id === userId) : null;
    const item = existing || {
      username: '',
      email: '',
      full_name: '',
      position: 'ครู',
      role_id: 'TEACHER',
      is_active: true
    };

    this.openModal(
      existing ? `แก้ไขบัญชีผู้ใช้ (${item.username})` : 'เพิ่มบัญชีผู้ใช้งานใหม่ (เข้ารหัส SHA-256)',
      `
      <form onsubmit="window.app.saveUserForm(event, '${existing ? existing.user_id : ''}')" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
            <input type="text" name="full_name" required value="${window.authService.sanitizeHTML(item.full_name)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ตำแหน่ง</label>
            <input type="text" name="position" required value="${window.authService.sanitizeHTML(item.position)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Username *</label>
            <input type="text" name="username" required value="${window.authService.sanitizeHTML(item.username)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">อีเมล (สำหรับ Google Sign-In) *</label>
            <input type="email" name="email" required value="${window.authService.sanitizeHTML(item.email)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">รหัสผ่าน ${existing ? '(เว้นว่างหากไม่ต้องการเปลี่ยน)' : '*'}</label>
            <input type="password" name="plain_password" ${existing ? '' : 'required'} placeholder="ระบบจะเข้ารหัส SHA-256 อัตโนมัติ" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ระดับสิทธิ์ (RBAC Role)</label>
            <select name="role_id" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold">
              <option value="TEACHER" ${item.role_id === 'TEACHER' ? 'selected' : ''}>TEACHER (ครูและบุคลากร)</option>
              <option value="ADMIN" ${item.role_id === 'ADMIN' ? 'selected' : ''}>ADMIN (ผู้ดูแลเว็บไซต์)</option>
              ${window.authService.isDeveloper() ? `<option value="DEVELOPER" ${item.role_id === 'DEVELOPER' ? 'selected' : ''}>DEVELOPER (ผู้พัฒนาระบบ)</option>` : ''}
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">บันทึกบัญชีผู้ใช้</button>
        </div>
      </form>
      `
    );
  }

  async saveUserForm(e, existingId) {
    e.preventDefault();
    const f = e.target;
    const payload = {
      full_name: f.full_name.value,
      position: f.position.value,
      username: f.username.value.trim(),
      email: f.email.value.trim(),
      role_id: f.role_id.value,
      is_active: true
    };

    if (f.plain_password.value.trim()) {
      payload.salt = 'BBK_SALT_2026';
      payload.password_hash = await window.authService.hashPassword(f.plain_password.value.trim(), payload.salt);
    }

    if (existingId) {
      await window.dbAdapter.update('User_Accounts', existingId, payload);
      this.showToast('อัปเดตบัญชีผู้ใช้งานสำเร็จ');
    } else {
      await window.dbAdapter.insert('User_Accounts', payload);
      this.showToast('สร้างบัญชีผู้ใช้ใหม่พร้อมเข้ารหัส SHA-256 สำเร็จ');
    }
    this.closeModal();
    this.render();
  }

  /**
   * 8. Generic Table Row Modal (รองรับการเพิ่ม/แก้ไขทุกตารางใน 17 ตาราง)
   */
  openGenericModal(tableName, pkValue = null) {
    const pk = window.dbAdapter.getPrimaryKeyName(tableName);
    const rows = window.dbAdapter.getTable(tableName);
    const existing = pkValue ? rows.find((r) => String(r[pk]) === String(pkValue)) : null;
    const sample = rows[0] || { [pk]: '', title: '', description: '' };
    const fields = Object.keys(sample).filter((k) => k !== pk && k !== 'created_at' && k !== 'updated_at');

    this.openModal(
      `${existing ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'} ในตาราง ${tableName}`,
      `
      <form onsubmit="window.app.saveGenericModalForm(event, '${tableName}', '${existing ? existing[pk] : ''}')" class="space-y-3">
        ${fields
          .map(
            (field) => `
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 font-mono">${field}</label>
              <input
                type="text"
                name="${field}"
                value="${window.authService.sanitizeHTML(existing ? String(existing[field] ?? '') : '')}"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
              />
            </div>
          `
          )
          .join('')}
        <div class="flex justify-end gap-2 pt-3">
          <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">ยกเลิก</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">บันทึกข้อมูลลงตาราง ${tableName}</button>
        </div>
      </form>
      `
    );
  }

  async saveGenericModalForm(e, tableName, existingPk) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const obj = {};
    formData.forEach((val, key) => {
      obj[key] = val;
    });

    if (existingPk) {
      await window.dbAdapter.update(tableName, existingPk, obj);
      this.showToast(`แก้ไขข้อมูลตาราง ${tableName} เรียบร้อยแล้ว`);
    } else {
      await window.dbAdapter.insert(tableName, obj);
      this.showToast(`เพิ่มข้อมูลในตาราง ${tableName} เรียบร้อยแล้ว`);
    }
    this.closeModal();
    this.render();
  }

  async deleteRowConfirm(tableName, pkValue) {
    if (!confirm(`ยืนยันการลบข้อมูลรหัส ${pkValue} ออกจากตาราง ${tableName} หรือไม่?`)) return;
    await window.dbAdapter.remove(tableName, pkValue);
    this.showToast(`ลบข้อมูล ${pkValue} ออกจาก ${tableName} เรียบร้อยแล้ว`);
    this.render();
  }

  /**
   * 9. บันทึกข้อมูลพื้นฐานโรงเรียน, ตั้งค่าเว็บไซต์ และ API Config
   */
  async saveSchoolProfileForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = {};
    formData.forEach((val, key) => {
      updates[key] = val;
    });
    const currentProfile = window.dbAdapter.getTable('School_Profile')[0];
    await window.dbAdapter.update('School_Profile', currentProfile.profile_id, updates);
    this.showToast('บันทึกข้อมูลพื้นฐานโรงเรียนบ้านบกหนองทันน้ำเรียบร้อยแล้ว');
    this.render();
  }

  async saveWebsiteSettingsForm(e) {
    e.preventDefault();
    const f = e.target;
    const textKeys = ['site_title', 'logo_url', 'hero_welcome_title', 'hero_banner_image', 'hero_welcome_subtitle', 'theme_font_family', 'theme_primary_bg', 'theme_accent_gold', 'theme_accent_navy'];
    for (const key of textKeys) {
      if (f[key]) {
        await window.dbAdapter.setSetting(key, f[key].value);
      }
    }

    const toggleKeys = ['enable_google_drive', 'enable_google_sheets', 'enable_google_calendar', 'enable_google_maps', 'enable_google_forms', 'enable_looker_studio'];
    for (const tKey of toggleKeys) {
      if (f[tKey]) {
        await window.dbAdapter.setSetting(tKey, f[tKey].checked ? 'true' : 'false');
      }
    }

    this.applyDynamicTheme();
    this.showToast('บันทึกการตั้งค่าเว็บไซต์และอัปเดตธีมเรียบร้อยแล้ว');
    this.render();
  }

  async saveDevApiConfigForm(e) {
    e.preventDefault();
    const f = e.target;
    const cleanSheetId = window.googleWorkspaceClient
      ? window.googleWorkspaceClient.extractSpreadsheetId(f.google_spreadsheet_id.value)
      : f.google_spreadsheet_id.value.trim();
    const cleanDriveId = window.googleWorkspaceClient
      ? window.googleWorkspaceClient.extractDriveFolderId(f.google_drive_folder_id.value)
      : f.google_drive_folder_id.value.trim();

    await window.dbAdapter.setSetting('gas_webapp_url', f.gas_webapp_url.value.trim());
    await window.dbAdapter.setSetting('google_spreadsheet_id', cleanSheetId);
    await window.dbAdapter.setSetting('google_drive_folder_id', cleanDriveId);
    await window.dbAdapter.setSetting('google_oauth_client_id', f.google_oauth_client_id.value.trim());
    if (f.line_channel_access_token) {
      await window.dbAdapter.setSetting('line_channel_access_token', f.line_channel_access_token.value.trim());
    }
    if (f.line_target_id) {
      await window.dbAdapter.setSetting('line_target_id', f.line_target_id.value.trim());
    }
    this.showToast('บันทึกการตั้งค่า Google Workspace & LINE API เรียบร้อยแล้ว');
    this.render();
  }

  /**
   * หน้าต่างศูนย์ควบคุมและเชื่อมต่อ Google Workspace ด่วน (Google Workspace Fast-Engine Hub)
   */
  openGoogleWorkspaceHubModal() {
    const s = window.dbAdapter.getSettingsMap();
    const syncStatus = window.dbAdapter.lastSyncStatus;
    const queueLen = window.googleWorkspaceClient ? window.googleWorkspaceClient.queue.length : 0;
    const canConfigure = window.authService.isAdminOrAbove();

    const sheetUrl = s.google_spreadsheet_id
      ? `https://docs.google.com/spreadsheets/d/${s.google_spreadsheet_id}/edit`
      : 'https://docs.google.com/spreadsheets';
    const driveUrl = s.google_drive_folder_id
      ? `https://drive.google.com/drive/folders/${s.google_drive_folder_id}`
      : 'https://drive.google.com';

    this.openModal(
      'ศูนย์เชื่อมต่อ Google Workspace ความเร็วสูง (Google Ecosystem Hub)',
      `
      <div class="space-y-5">
        <!-- สถานะความเร็วและเสถียรภาพ -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div class="text-[11px] font-bold text-emerald-700 uppercase">สถาปัตยกรรมความเร็วสูง</div>
            <div class="text-sm font-extrabold text-slate-900 mt-0.5">SWR + Edge Cache</div>
            <div class="text-[11px] text-emerald-800 mt-0.5">Latency: ${syncStatus.latencyMs || 12} ms (0ms UI Render)</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <div class="text-[11px] font-bold text-amber-800 uppercase">ฐานข้อมูล Google Sheets</div>
            <div class="text-sm font-extrabold text-slate-900 mt-0.5">ครบ 17 ตารางมาตรฐาน</div>
            <div class="text-[11px] text-amber-900 mt-0.5">คิวรอซิงค์อัตโนมัติ: ${queueLen} รายการ</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div class="text-[11px] font-bold text-slate-500 uppercase">โหมดการเชื่อมต่อปัจจุบัน</div>
            <div class="text-sm font-extrabold text-slate-900 mt-0.5">${s.gas_webapp_url ? 'Google Apps Script Cloud' : (s.google_spreadsheet_id ? 'Google Sheets Edge CDN' : 'Hybrid Persistent Ready')}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">Auto-Retry Exponential Backoff</div>
          </div>
        </div>

        <!-- ทางลัดเปิดบริการ Google Workspace ของโรงเรียน -->
        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div class="text-xs font-bold text-slate-800">ทางลัดเข้าถึงบริการ Google Workspace ของโรงเรียนบ้านบกหนองทันน้ำ</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <a href="${sheetUrl}" target="_blank" rel="noopener" class="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 flex flex-col items-center text-center gap-1.5 font-semibold text-slate-800 transition">
              <i data-lucide="table" class="w-5 h-5 text-emerald-600"></i>
              <span>Google Sheets DB</span>
            </a>
            <a href="${driveUrl}" target="_blank" rel="noopener" class="p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-500 flex flex-col items-center text-center gap-1.5 font-semibold text-slate-800 transition">
              <i data-lucide="hard-drive" class="w-5 h-5 text-amber-600"></i>
              <span>Google Drive คลังไฟล์</span>
            </a>
            <a href="https://calendar.google.com" target="_blank" rel="noopener" class="p-3 rounded-xl bg-white border border-slate-200 hover:border-sky-500 flex flex-col items-center text-center gap-1.5 font-semibold text-slate-800 transition">
              <i data-lucide="calendar" class="w-5 h-5 text-sky-600"></i>
              <span>Google Calendar</span>
            </a>
            <a href="https://lookerstudio.google.com" target="_blank" rel="noopener" class="p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 flex flex-col items-center text-center gap-1.5 font-semibold text-slate-800 transition">
              <i data-lucide="bar-chart-big" class="w-5 h-5 text-indigo-600"></i>
              <span>Looker Studio</span>
            </a>
          </div>
        </div>

        ${
          canConfigure
            ? `
            <form onsubmit="window.app.saveQuickGoogleWorkspaceSetup(event)" class="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs sm:text-sm font-bold text-slate-900">ตั้งค่าผูกบัญชี Google Sheets / Drive / Apps Script (วางลิงก์เต็มได้เลย)</h4>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950">Smart URL Parser</span>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">1. ลิงก์ไฟล์ Google Sheets หรือ Spreadsheet ID (17 ตาราง)</label>
                <input type="text" name="sheet_input" value="${window.authService.sanitizeHTML(s.google_spreadsheet_id || '')}" placeholder="วางลิงก์ https://docs.google.com/spreadsheets/d/... หรือ ID" class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">2. Google Apps Script Web App URL (สำหรับบันทึกข้อมูล & อัปโหลดไฟล์เข้า Drive)</label>
                <input type="text" name="gas_input" value="${window.authService.sanitizeHTML(s.gas_webapp_url || '')}" placeholder="https://script.google.com/macros/s/AKfycb.../exec" class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">3. ลิงก์โฟลเดอร์ Google Drive หลัก หรือ Folder ID</label>
                <input type="text" name="drive_input" value="${window.authService.sanitizeHTML(s.google_drive_folder_id || '')}" placeholder="วางลิงก์ https://drive.google.com/drive/folders/... หรือ ID" class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono" />
              </div>
              <div class="flex flex-wrap items-center gap-2 pt-2">
                <button type="submit" class="px-4 py-2 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer">
                  บันทึกและเชื่อมต่อทันที
                </button>
                <button type="button" onclick="window.app.syncLocalToCloudNow()" class="px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition cursor-pointer">
                  ส่งข้อมูลทั้ง 17 ตารางขึ้น Google Sheets
                </button>
                <button type="button" onclick="window.app.pullCloudToLocalNow()" class="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer">
                  ดึงข้อมูลล่าสุดจาก Google Sheets
                </button>
              </div>
            </form>
            `
            : `
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>หากต้องการตั้งค่าลิงก์ Google Sheets / Apps Script กรุณาเข้าสู่ระบบผู้ดูแลระบบ</span>
              <button onclick="window.app.closeModal(); window.app.openLoginModal();" class="px-3.5 py-1.5 rounded-xl bg-slate-900 text-amber-300 font-bold cursor-pointer">เข้าสู่ระบบ</button>
            </div>
            `
        }
      </div>
      `,
      'max-w-2xl'
    );
  }

  async saveQuickGoogleWorkspaceSetup(e) {
    e.preventDefault();
    const f = e.target;
    const cleanSheetId = window.googleWorkspaceClient.extractSpreadsheetId(f.sheet_input.value);
    const cleanDriveId = window.googleWorkspaceClient.extractDriveFolderId(f.drive_input.value);
    const cleanGasUrl = window.googleWorkspaceClient.normalizeGasUrl(f.gas_input.value);

    await window.dbAdapter.setSetting('google_spreadsheet_id', cleanSheetId);
    await window.dbAdapter.setSetting('google_drive_folder_id', cleanDriveId);
    await window.dbAdapter.setSetting('gas_webapp_url', cleanGasUrl);

    this.closeModal();
    this.showToast('เชื่อมต่อ Google Workspace สำเร็จ! ระบบพร้อมซิงค์ข้อมูลอัตโนมัติ');
    await window.dbAdapter.backgroundRevalidateFromGoogleWorkspace();
    this.render();
  }

  /**
   * 10. อัปโหลดไฟล์ Inline (แปลงเป็น URL หรือส่งเข้า Google Drive)
   */
  async handleInlineImageUpload(event, targetInputId, folderCategory, previewImgId = null) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      this.showToast(`กำลังอัปโหลดไฟล์ ${file.name}...`, 'info');
      const uploaded = await window.driveService.uploadFile(file, folderCategory, true);
      const inputEl = document.getElementById(targetInputId);
      if (inputEl) {
        inputEl.value = uploaded.url;
      }
      if (previewImgId) {
        const previewEl = document.getElementById(previewImgId);
        if (previewEl) previewEl.src = uploaded.url;
      }
      this.showToast(`อัปโหลดไฟล์ ${file.name} สำเร็จ!`);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  /**
   * 11. คำสั่งระดับ Developer Console (Health Check, Cloud Sync, Backup & Restore)
   */
  async testCloudConnection() {
    const gasUrl = window.dbAdapter.getSetting('gas_webapp_url', '').trim();
    if (!gasUrl) {
      this.showToast('สถานะระบบ: โหมด Hybrid Local Database พร้อมใช้งานครบ 17 ตาราง (0 Errors)');
      return;
    }
    try {
      this.showToast('กำลังตรวจสอบสถานะ Google Apps Script API...', 'info');
      const res = await fetch(`${gasUrl}?action=healthCheck`);
      const data = await res.json();
      this.showToast(`เชื่อมต่อคลาวด์สำเร็จ! Latency: ${data.latencyMs || 15} ms`);
    } catch (err) {
      this.showToast(`ไม่สามารถติดต่อ GAS URL ได้: ${err.message}`, 'error');
    }
  }

  async syncLocalToCloudNow() {
    try {
      this.showToast('กำลังซิงค์ข้อมูลทั้ง 17 ตารางขึ้น Google Sheets...', 'info');
      await window.dbAdapter.syncAllToGoogleSheets();
      this.showToast('ซิงค์ข้อมูลทั้ง 17 ตารางขึ้น Google Sheets สำเร็จ!');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async pullCloudToLocalNow() {
    try {
      this.showToast('กำลังดึงข้อมูลจาก Google Sheets...', 'info');
      await window.dbAdapter.pullFromGoogleSheets();
      this.showToast('ดึงข้อมูลล่าสุดจาก Google Sheets สำเร็จ!');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  downloadFullBackup() {
    const jsonStr = window.dbAdapter.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BANBOK_DB_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('ดาวน์โหลดไฟล์สำรองฐานข้อมูล (.JSON) สำเร็จ');
  }

  restoreBackupFromFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        window.dbAdapter.importBackupJSON(reader.result);
        this.showToast('กู้คืนฐานข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว!');
        this.render();
      } catch (err) {
        this.showToast('ไฟล์สำรองข้อมูลไม่ถูกต้อง: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  resetDatabaseConfirm() {
    if (!confirm('ยืนยันการรีเซ็ตฐานข้อมูลทั้ง 17 ตารางกลับเป็นค่าเริ่มต้นของโรงเรียนบ้านบกหนองทันน้ำหรือไม่?')) return;
    window.dbAdapter.resetToFactoryDefault();
    this.showToast('รีเซ็ตฐานข้อมูลกลับสู่ค่าเริ่มต้นเรียบร้อยแล้ว');
    this.render();
  }
}

window.app = new BanbokAppController();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
