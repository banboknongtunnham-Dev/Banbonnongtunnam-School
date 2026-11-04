/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - MODERN TECH RED & GOLD HEADER & FOOTER
 * ธีมเหลือง-แดง (Crimson Red & Cyber Gold) โมเดิร์น ทันสมัย เป็นสัดเป็นส่วน ไม่รก
 * ============================================================================
 */

class NavbarComponent {
  renderHeader(activePage = 'home') {
    const profile = (window.dbAdapter.getTable('School_Profile')[0]) || {};
    const announcements = window.dbAdapter.getTable('Announcements').filter((a) => String(a.is_active) !== 'false');
    const newsItems = window.dbAdapter.getTable('News').filter((n) => n.publish_status !== 'DRAFT');
    const logoUrl = window.driveService.resolveDriveImageUrl(window.dbAdapter.getSetting('logo_url', 'assets/img/logo.png'));
    const user = window.authService.getCurrentUser();
    const role = window.authService.getCurrentRole();

    // เมนูหลักจัดหมวดหมู่ชัดเจน พร้อมไอคอนสีสันสดใสสไตล์ Facebook
    const navItems = [
      { id: 'home', label: 'หน้าแรก', emoji: '🏠', iconBg: 'bg-gradient-to-br from-rose-500 to-red-600' },
      { id: 'about', label: 'ข้อมูลโรงเรียน', emoji: '🏫', iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500' },
      { id: 'personnel', label: 'ทำเนียบบุคลากร', emoji: '👨‍🏫', iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600' },
      { id: 'news', label: 'ข่าวสาร & กิจกรรม', emoji: '📢', iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
      { id: 'academic', label: 'วิชาการ & หลักสูตร', emoji: '📚', iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600' },
      { id: 'documents', label: 'เอกสารเผยแพร่', emoji: '📂', iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600' },
      { id: 'dashboard', label: 'สถิติสารสนเทศ', emoji: '📊', iconBg: 'bg-gradient-to-br from-amber-500 to-red-600' },
      { id: 'contact', label: 'ติดต่อเรา', emoji: '📍', iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600' }
    ];

    const combinedTickerItems = [
      ...announcements.map((a) => ({ tag: a.category || 'ประกาศ', text: a.title, action: "window.app.navigate('news')" })),
      ...newsItems.map((n) => ({ tag: n.category || 'ข่าวสาร', text: n.title, action: `window.app.openNewsModal('${n.news_id}')` }))
    ];

    const tickerHtml = combinedTickerItems.length > 0
      ? [...combinedTickerItems, ...combinedTickerItems]
          .map(
            (item) => `
            <span onclick="${item.action}" class="inline-flex items-center gap-2 mx-6 cursor-pointer hover:text-yellow-300 transition">
              <span class="px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold">${window.authService.sanitizeHTML(item.tag)}</span>
              <span class="text-white/95 font-medium">${window.authService.sanitizeHTML(item.text)}</span>
            </span>
          `
          )
          .join('')
      : '<span class="mx-4">ยินดีต้อนรับสู่ BANBOK DIGITAL SCHOOL PLATFORM โรงเรียนบ้านบกหนองทันน้ำ สพป.อุบลราชธานี เขต 2</span>';

    return `
      <!-- Top Live Ticker Bar: แถบข่าววิ่งโทนแดงเข้ม-ทองเทคโนโลยี -->
      <div class="bbk-red-gold-bar text-white text-xs border-b border-yellow-400/30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-4">
          <div class="flex items-center gap-2.5 flex-1 overflow-hidden">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-yellow-400 text-red-950 shrink-0 shadow-xs">
              <span class="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
              <span>LIVE NEWS</span>
            </span>
            <div class="overflow-hidden flex-1 relative">
              <div class="bbk-marquee-track whitespace-nowrap text-xs">
                ${tickerHtml}
              </div>
            </div>
          </div>

          <div class="hidden md:flex items-center gap-2.5 shrink-0 text-[11px] text-yellow-100 pl-3 border-l border-white/20">
            <img src="assets/img/obec_logo.png" alt="โลโก้ สพป.อุบลราชธานี เขต 2" class="w-5 h-5 object-contain shrink-0" />
            <span>รหัสโรงเรียน: <strong>${window.authService.sanitizeHTML(profile.school_code_10 || '1034710083')}</strong></span>
            <span>•</span>
            <span>${window.authService.sanitizeHTML(profile.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุบลราชธานี เขต 2')}</span>
          </div>
        </div>
      </div>

      <!-- Main Modern Tech Header -->
      <header class="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b-2 border-red-700/15 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between py-3 gap-4">
            <!-- ซ้าย: โลโก้โรงเรียนและชื่อโรงเรียน (ไม่มีกรอบสี่เหลี่ยมครอบ) -->
            <div class="flex items-center gap-4 cursor-pointer group shrink-0" onclick="window.app.navigate('home')">
              <img
                src="${logoUrl}"
                alt="โลโก้โรงเรียนบ้านบกหนองทันน้ำ"
                class="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-md group-hover:scale-105 transition duration-300 shrink-0"
                onerror="this.src='assets/img/logo.png'"
              />
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-extrabold tracking-wider uppercase text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                    SMART DIGITAL SCHOOL
                  </span>
                </div>
                <h1 class="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight group-hover:text-red-700 transition leading-tight mt-0.5">
                  ${window.authService.sanitizeHTML(profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ')}
                </h1>
                <p class="text-sm sm:text-lg font-extrabold tracking-wide text-red-700 leading-tight">
                  BANBOKNONGTUNNAM SCHOOL
                </p>
                <p class="text-xs sm:text-sm text-slate-500 font-semibold hidden sm:block">
                  ${window.authService.sanitizeHTML(profile.education_level || 'อนุบาล-มัธยมศึกษาตอนต้น')}
                </p>
              </div>
            </div>

            <!-- ขวา: ปุ่มระบบครู / แอดมิน / เข้าสู่ระบบ (จัดระเบียบไม่ให้รก) -->
            <div class="flex items-center gap-2">
              <button
                onclick="window.app.openGoogleWorkspaceHubModal()"
                class="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-red-900 border border-amber-300 text-xs font-bold hover:bg-amber-100 transition cursor-pointer whitespace-nowrap"
                title="สถานะเชื่อมต่อ Google Workspace / Google Sheets API"
              >
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Google Cloud Connected</span>
              </button>

              <button
                onclick="window.app.navigate('teacher-portal')"
                class="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  activePage === 'teacher-portal'
                    ? 'bg-amber-400 text-red-950 border-amber-500 shadow-xs'
                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-400 hover:text-red-950'
                }"
              >
                <i data-lucide="cpu" class="w-4 h-4"></i>
                <span>ระบบดิจิทัลครู</span>
              </button>

              ${
                window.authService.isAdminOrAbove()
                  ? `
                  <button
                    onclick="window.app.navigate('admin')"
                    class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activePage === 'admin'
                        ? 'bg-red-700 text-yellow-300 shadow-xs'
                        : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                    }"
                  >
                    <i data-lucide="sliders" class="w-4 h-4"></i>
                    <span>จัดการเว็บ (Admin)</span>
                  </button>
                  `
                  : ''
              }

              ${
                window.authService.isDeveloper()
                  ? `
                  <button
                    onclick="window.app.navigate('dev-console')"
                    class="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-yellow-400 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <i data-lucide="terminal" class="w-4 h-4"></i>
                    <span>Dev</span>
                  </button>
                  `
                  : ''
              }

              ${
                user
                  ? `
                  <div class="flex items-center gap-2 pl-2 border-l border-slate-200">
                    <span class="hidden md:inline-block text-xs font-bold text-slate-800">${window.authService.sanitizeHTML(user.full_name)}</span>
                    <button
                      onclick="window.app.handleLogout()"
                      title="ออกจากระบบ"
                      class="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                    >
                      <i data-lucide="log-out" class="w-4 h-4"></i>
                      <span class="hidden sm:inline">ออก</span>
                    </button>
                  </div>
                  `
                  : `
                  <button
                    onclick="window.app.openLoginModal()"
                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-red-700 to-red-600 text-white hover:from-red-800 hover:to-red-700 shadow-xs transition cursor-pointer"
                  >
                    <i data-lucide="log-in" class="w-4 h-4 text-yellow-300"></i>
                    <span>เข้าสู่ระบบ</span>
                  </button>
                  `
              }

              <button
                onclick="window.app.toggleMobileMenu()"
                class="xl:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-700 hover:bg-red-50 border border-slate-200"
                aria-label="เปิดเมนูนำทาง"
              >
                <i data-lucide="menu" class="w-5 h-5"></i>
              </button>
            </div>
          </div>

          <!-- แถบเมนูนำทางหลัก (Clean Pill Navigation Bar บรรทัดเดียวเรียบร้อยสบายตา พร้อมไอคอนสีสันสดใส) -->
          <nav class="hidden xl:flex items-center border-t border-slate-100 py-2.5">
            <ul class="flex items-center justify-between w-full gap-2">
              ${navItems
                .map(
                  (item) => `
                  <li class="shrink-0">
                    <button
                      onclick="window.app.navigate('${item.id}')"
                      class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs xl:text-sm font-bold whitespace-nowrap transition cursor-pointer select-none ${
                        activePage === item.id
                          ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-xs'
                          : 'text-slate-700 hover:text-red-700 hover:bg-red-50/70'
                      }"
                    >
                      <span class="w-6 h-6 rounded-lg ${item.iconBg} flex items-center justify-center text-sm shadow-2xs shrink-0">${item.emoji}</span>
                      <span class="whitespace-nowrap leading-none">${item.label}</span>
                    </button>
                  </li>
                `
                )
                .join('')}
            </ul>
          </nav>
        </div>

        <!-- เมนูสำหรับมือถือ (Mobile Drawer) -->
        <div id="mobile-nav-drawer" class="hidden xl:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-5 shadow-xl">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${navItems
              .map(
                (item) => `
                <button
                  onclick="window.app.navigate('${item.id}'); window.app.toggleMobileMenu(false);"
                  class="flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs font-bold border transition ${
                    activePage === item.id
                      ? 'bg-red-700 border-red-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-red-50'
                  }"
                >
                  <span class="w-6 h-6 rounded-lg ${item.iconBg} flex items-center justify-center text-xs shadow-2xs shrink-0">${item.emoji}</span>
                  <span class="truncate">${item.label}</span>
                </button>
              `
              )
              .join('')}
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            <button
              onclick="window.app.navigate('teacher-portal'); window.app.toggleMobileMenu(false);"
              class="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-400 text-red-950"
            >
              ระบบบริการดิจิทัลสำหรับครู
            </button>
            ${
              window.authService.isAdminOrAbove()
                ? `<button onclick="window.app.navigate('admin'); window.app.toggleMobileMenu(false);" class="py-2.5 px-4 rounded-xl text-xs font-bold bg-red-700 text-white">Admin CMS</button>`
                : ''
            }
          </div>
        </div>
      </header>
    `;
  }

  renderFooter() {
    const profile = (window.dbAdapter.getTable('School_Profile')[0]) || {};
    const logoUrl = window.driveService.resolveDriveImageUrl(window.dbAdapter.getSetting('logo_url', 'assets/img/logo.png'));

    return `
      <footer class="bg-gradient-to-b from-red-950 to-slate-950 text-slate-300 border-t-4 border-yellow-400 mt-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <!-- Col 1: School Identity -->
            <div class="space-y-3">
              <div class="flex items-center gap-3.5">
                <div class="flex items-center gap-2 shrink-0">
                  <img src="${logoUrl}" alt="โลโก้โรงเรียน" class="w-16 h-16 object-contain drop-shadow-md shrink-0" onerror="this.src='assets/img/logo.png'" />
                  <img src="assets/img/obec_logo.png" alt="โลโก้ สพป.อุบลราชธานี เขต 2" class="w-12 h-12 object-contain drop-shadow-md shrink-0" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-white">${window.authService.sanitizeHTML(profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ')}</h3>
                  <p class="text-xs text-yellow-400 font-bold">${window.authService.sanitizeHTML(profile.school_name_en || 'BOKNONGTUNNAM')}</p>
                </div>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed">
                “${window.authService.sanitizeHTML(profile.motto || 'เรียนรู้สู่ความเป็นเลิศ เชิดชูคุณธรรม นำพาชุมชน')}”
              </p>
              <div class="pt-1 text-xs text-slate-400 space-y-0.5">
                <div><strong>รหัส 10 หลัก:</strong> ${window.authService.sanitizeHTML(profile.school_code_10 || '1034710083')} (SMIS: ${window.authService.sanitizeHTML(profile.smis_code_8 || '34020157')})</div>
                <div><strong>ต้นสังกัด:</strong> ${window.authService.sanitizeHTML(profile.affiliation || 'สพป.อุบลราชธานี เขต 2')}</div>
              </div>
            </div>

            <!-- Col 2: เมนูทางลัด -->
            <div>
              <h4 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-yellow-400 rounded-full"></span> หมวดหมู่ข้อมูลหลัก
              </h4>
              <ul class="space-y-2 text-xs">
                <li><button onclick="window.app.navigate('about')" class="hover:text-yellow-300 transition cursor-pointer">ข้อมูลพื้นฐานโรงเรียน 23 รายการ</button></li>
                <li><button onclick="window.app.navigate('personnel')" class="hover:text-yellow-300 transition cursor-pointer">ทำเนียบบุคลากร (18 ท่าน)</button></li>
                <li><button onclick="window.app.navigate('news')" class="hover:text-yellow-300 transition cursor-pointer">บอร์ดข่าวสาร & สไลด์โอกาสสำคัญ</button></li>
                <li><button onclick="window.app.navigate('dashboard')" class="hover:text-yellow-300 transition cursor-pointer">กราฟสถิตินักเรียน 3 ปีย้อนหลัง</button></li>
                <li><button onclick="window.app.navigate('teacher-portal')" class="text-yellow-300 hover:underline font-bold cursor-pointer">ระบบบริการดิจิทัลสำหรับครู</button></li>
              </ul>
            </div>

            <!-- Col 3: หน่วยงานต้นสังกัด -->
            <div>
              <h4 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-yellow-400 rounded-full"></span> หน่วยงานทางการศึกษา
              </h4>
              <ul class="space-y-2 text-xs">
                <li><a href="https://www.obec.go.th" target="_blank" rel="noopener" class="hover:text-yellow-300 transition">สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)</a></li>
                <li><a href="http://www.ubon2.go.th" target="_blank" rel="noopener" class="hover:text-yellow-300 transition">สพป.อุบลราชธานี เขต 2</a></li>
                <li><a href="https://schoolthai.in.th/index_view.php?School_ID=1034710083&page=info" target="_blank" rel="noopener" class="hover:text-yellow-300 transition">ฐานข้อมูลโรงเรียน SchoolThai</a></li>
              </ul>
            </div>

            <!-- Col 4: ข้อมูลติดต่อโรงเรียน -->
            <div>
              <h4 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-yellow-400 rounded-full"></span> ติดต่อสถานศึกษา
              </h4>
              <div class="space-y-2 text-xs text-slate-300">
                <p class="flex items-start gap-2">
                  <i data-lucide="map-pin" class="w-4 h-4 text-yellow-400 shrink-0 mt-0.5"></i>
                  <span>${window.authService.sanitizeHTML(profile.address || 'หมู่ที่ 2 บ้านบก ตำบลหนองทันน้ำ อำเภอกุดข้าวปุ้น จังหวัดอุบลราชธานี 34270')}</span>
                </p>
                <p class="flex items-center gap-2">
                  <i data-lucide="phone" class="w-4 h-4 text-yellow-400 shrink-0"></i>
                  <span>${window.authService.sanitizeHTML(profile.phone || '0892867399')}</span>
                </p>
                <p class="flex items-center gap-2">
                  <i data-lucide="mail" class="w-4 h-4 text-yellow-400 shrink-0"></i>
                  <span>${window.authService.sanitizeHTML(profile.email || 'banboknongtannham@gmail.com')}</span>
                </p>
              </div>
            </div>
          </div>

          <div class="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div>
              © ${new Date().getFullYear()} <strong>${window.authService.sanitizeHTML(profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ')}</strong> (${window.authService.sanitizeHTML(profile.school_name_en || 'BOKNONGTUNNAM')})
            </div>
            <div class="text-yellow-400/90 font-semibold">
              BANBOK SMART DIGITAL SCHOOL PLATFORM
            </div>
          </div>
        </div>
      </footer>
    `;
  }
}

window.navbarComponent = new NavbarComponent();
