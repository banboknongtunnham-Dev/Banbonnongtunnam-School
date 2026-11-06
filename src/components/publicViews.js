/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - PUBLIC WEBSITE VIEWS (Phase 2)
 * ดึงข้อมูลทุกส่วนจากฐานข้อมูลกลาง 17 ตาราง (ไม่ใช้ข้อมูล Hardcode ตายตัว)
 * ธีมสีขาวสะอาดตา (Clean White) ตัดสีเหลืองทองละมุน (Subtle Gold) เรียบหรู ทันสมัย
 * ============================================================================
 */

class PublicViews {
  constructor() {
    this.newsCategoryFilter = 'ALL';
    this.newsSearchQuery = '';
    this.personnelFilter = 'ALL';
    this.galleryCategoryFilter = 'ALL';
    this.docCategoryFilter = 'ALL';
    this.currentSlideIndex = 0;
    this.sliderMode = 'ALL'; // ALL = สไลด์รวม (โอกาสสำคัญ + ข่าวสาร), STUDENT = เฉพาะสไลด์โอกาสสำคัญนักเรียน, NEWS = เฉพาะสไลด์ข่าวสาร
    this.isSliderPaused = false;
    this.sliderTimer = null;

    // สถานะบอร์ดประชาสัมพันธ์เคลื่อนไหว (Interactive Moving Bulletin Board)
    this.bulletinFilter = 'ALL'; // ALL, NEWS, ANNOUNCE, ACTIVITY
    this.activeBulletinIndex = 0;
    this.isBulletinPaused = false;
    this.bulletinTimer = null;

    this.visitorChartInstance = null;
  }

  /**
   * ดึงรายการภาพสไลด์โชว์โอกาสสำคัญของนักเรียน (Pro Student Highlight Slider)
   */
  getStudentSlides() {
    const gallery = window.dbAdapter.getTable('Gallery');
    const slides = gallery.filter(
      (g) => g.is_slider === true || String(g.is_slider) === 'true' || String(g.category || '').includes('สไลด์')
    );
    if (slides.length > 0) return slides;
    return gallery.slice(0, 4);
  }

  /**
   * ดึงรายการสไลด์แบบรวม (ภาพโอกาสสำคัญของนักเรียน + ข่าวสารประชาสัมพันธ์ล่าสุด)
   */
  getCombinedShowcaseSlides() {
    const studentSlides = this.getStudentSlides().map((s) => ({
      slide_type: 'STUDENT_SLIDE',
      id: s.gallery_id,
      title: s.title,
      subtitle: s.caption || '',
      tag: s.occasion_tag || s.category || 'โอกาสสำคัญของนักเรียน',
      date: s.created_at || 'ปีการศึกษา 2569',
      image_url: s.image_url,
      facebook_url: s.facebook_url || 'https://www.facebook.com/profile.php?id=100014526581847',
      raw: s
    }));

    const newsSlides = window.dbAdapter
      .getTable('News')
      .filter((n) => n.publish_status !== 'DRAFT')
      .map((n) => ({
        slide_type: 'NEWS_SLIDE',
        id: n.news_id,
        title: n.title,
        subtitle: n.summary || n.content || '',
        tag: n.category || 'ข่าวประชาสัมพันธ์',
        date: n.published_at || 'ปีการศึกษา 2569',
        image_url: n.cover_image_url || 'assets/img/hero_banner.png',
        facebook_url: n.facebook_url || 'https://www.facebook.com/profile.php?id=100014526581847',
        raw: n
      }));

    if (this.sliderMode === 'STUDENT') return studentSlides;
    if (this.sliderMode === 'NEWS') return newsSlides.length > 0 ? newsSlides : studentSlides;
    return [...studentSlides, ...newsSlides];
  }

  setSliderMode(mode) {
    this.sliderMode = mode;
    this.currentSlideIndex = 0;
    this.updateSliderDOM();
  }

  toggleSliderPause() {
    this.isSliderPaused = !this.isSliderPaused;
    this.updateSliderDOM();
  }

  nextSlide() {
    const slides = this.getCombinedShowcaseSlides();
    if (slides.length === 0) return;
    this.currentSlideIndex = (this.currentSlideIndex + 1) % slides.length;
    this.updateSliderDOM();
  }

  prevSlide() {
    const slides = this.getCombinedShowcaseSlides();
    if (slides.length === 0) return;
    this.currentSlideIndex = (this.currentSlideIndex - 1 + slides.length) % slides.length;
    this.updateSliderDOM();
  }

  goToSlide(idx) {
    const slides = this.getCombinedShowcaseSlides();
    if (slides.length === 0) return;
    this.currentSlideIndex = Math.max(0, Math.min(idx, slides.length - 1));
    this.updateSliderDOM();
  }

  updateSliderDOM() {
    const container = document.getElementById('pro-student-slider-box');
    if (!container) return;
    container.innerHTML = this.renderStudentSliderInner();
    if (window.lucide) window.lucide.createIcons();
  }

  /**
   * ดึงรายการข้อมูลสำหรับบอร์ดประชาสัมพันธ์เคลื่อนไหว (ข่าวสาร + ประกาศ + กิจกรรม)
   */
  getBulletinBoardItems() {
    const news = window.dbAdapter
      .getTable('News')
      .filter((n) => n.publish_status !== 'DRAFT')
      .map((n) => ({
        type: 'NEWS',
        badge: n.category || 'ข่าวสาร',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500',
        title: n.title,
        desc: n.summary || '',
        date: n.published_at || '',
        image_url: n.cover_image_url || 'assets/img/logo.png',
        facebook_url: n.facebook_url || '',
        onClick: `window.app.openNewsModal('${n.news_id}')`
      }));

    const announces = window.dbAdapter
      .getTable('Announcements')
      .filter((a) => String(a.is_active) !== 'false')
      .map((a) => ({
        type: 'ANNOUNCE',
        badge: a.category || 'ประกาศโรงเรียน',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        dotColor: 'bg-amber-500',
        title: a.title,
        desc: a.description || '',
        date: a.published_date || '',
        image_url: 'assets/img/logo.png',
        facebook_url: '',
        onClick: "window.app.navigate('news')"
      }));

    const activities = window.dbAdapter.getTable('Activities').map((act) => ({
      type: 'ACTIVITY',
      badge: act.category || 'กิจกรรมโรงเรียน',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotColor: 'bg-emerald-500',
      title: act.title,
      desc: `สถานที่: ${act.location || 'โรงเรียนบ้านบกหนองทันน้ำ'} • ${act.description || ''}`,
      date: act.start_date || '',
      image_url: 'assets/img/logo.png',
      facebook_url: '',
      onClick: "window.app.navigate('news')"
    }));

    if (this.bulletinFilter === 'NEWS') return news;
    if (this.bulletinFilter === 'ANNOUNCE') return announces;
    if (this.bulletinFilter === 'ACTIVITY') return activities;
    return [...news, ...announces, ...activities];
  }

  setBulletinFilter(filter) {
    this.bulletinFilter = filter;
    this.activeBulletinIndex = 0;
    this.updateBulletinDOM();
  }

  toggleBulletinPause() {
    this.isBulletinPaused = !this.isBulletinPaused;
    this.updateBulletinDOM();
  }

  nextBulletinItem() {
    const items = this.getBulletinBoardItems();
    if (items.length === 0) return;
    this.activeBulletinIndex = (this.activeBulletinIndex + 1) % items.length;
    this.updateBulletinDOM();
  }

  prevBulletinItem() {
    const items = this.getBulletinBoardItems();
    if (items.length === 0) return;
    this.activeBulletinIndex = (this.activeBulletinIndex - 1 + items.length) % items.length;
    this.updateBulletinDOM();
  }

  selectBulletinItem(idx) {
    this.activeBulletinIndex = idx;
    this.updateBulletinDOM();
  }

  updateBulletinDOM() {
    const box = document.getElementById('live-bulletin-board-box');
    if (!box) return;
    box.innerHTML = this.renderLiveBulletinBoardInner();
    if (window.lucide) window.lucide.createIcons();
  }

  /**
   * เลื่อนแถบสไลด์การ์ดข่าวสารแนวนอน (News Card Carousel)
   */
  scrollNewsCarousel(direction = 1) {
    const track = document.getElementById('news-cards-carousel-track');
    if (!track) return;
    const step = 360 * direction;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (direction > 0 && track.scrollLeft >= maxScroll - 20) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: step, behavior: 'smooth' });
    }
  }

  startSliderAutoPlay() {
    if (this.sliderTimer) clearInterval(this.sliderTimer);
    this.sliderTimer = setInterval(() => {
      const box = document.getElementById('pro-student-slider-box');
      if (box && !this.isSliderPaused && !box.matches(':hover')) {
        this.nextSlide();
      }
    }, 5500);

    if (this.bulletinTimer) clearInterval(this.bulletinTimer);
    this.bulletinTimer = setInterval(() => {
      const bBox = document.getElementById('live-bulletin-board-box');
      if (bBox && !this.isBulletinPaused && !bBox.matches(':hover')) {
        this.nextBulletinItem();
      }
    }, 3800);
  }

  stopSliderAutoPlay() {
    if (this.sliderTimer) {
      clearInterval(this.sliderTimer);
      this.sliderTimer = null;
    }
    if (this.bulletinTimer) {
      clearInterval(this.bulletinTimer);
      this.bulletinTimer = null;
    }
  }

  /**
   * เรนเดอร์เนื้อหาภายใน Pro Student & News Highlight Slider (สไลด์ภาพโอกาสสำคัญ + สไลด์ข่าวสาร)
   */
  renderStudentSliderInner() {
    const slides = this.getCombinedShowcaseSlides();
    const canManage = window.authService.isTeacherOrAbove();
    if (slides.length === 0) {
      return `
        <div class="p-12 text-center bg-white rounded-3xl border border-dashed border-amber-300">
          <p class="text-sm text-slate-600 font-semibold">ยังไม่มีรายการสไลด์</p>
          ${
            canManage
              ? `
              <button onclick="window.app.handleAdminSlideAddClick()" class="mt-3 px-4 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer">
                + อัปโหลดภาพสไลด์แรก
              </button>
              `
              : ''
          }
        </div>
      `;
    }

    if (this.currentSlideIndex >= slides.length) {
      this.currentSlideIndex = 0;
    }
    const current = slides[this.currentSlideIndex];
    const imgUrl = window.driveService.resolveDriveImageUrl(current.image_url);
    const fbUrl = current.facebook_url || 'https://www.facebook.com/profile.php?id=100014526581847';
    const isNewsSlide = current.slide_type === 'NEWS_SLIDE';

    return `
      <div class="bbk-soft-card rounded-3xl overflow-hidden bg-white flex flex-col h-full border border-slate-200/90 shadow-2xs">
        <!-- แถบเลือกโหมดสไลด์ด้านบน เรียบหรู สะอาดตา -->
        <div class="px-5 py-3.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              onclick="window.publicViews.setSliderMode('ALL')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                this.sliderMode === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }"
            >
              สไลด์ทั้งหมด
            </button>
            <button
              onclick="window.publicViews.setSliderMode('STUDENT')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                this.sliderMode === 'STUDENT'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
              }"
            >
              ผลงาน & โอกาสสำคัญนักเรียน
            </button>
            <button
              onclick="window.publicViews.setSliderMode('NEWS')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                this.sliderMode === 'NEWS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
              }"
            >
              ข่าวประชาสัมพันธ์
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              onclick="window.publicViews.toggleSliderPause()"
              class="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <i data-lucide="${this.isSliderPaused ? 'play' : 'pause'}" class="w-3 h-3 text-slate-700"></i>
              <span>${this.isSliderPaused ? 'เล่นต่อ' : 'อัตโนมัติ'}</span>
            </button>
            <span class="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-mono font-bold">${this.currentSlideIndex + 1}/${slides.length}</span>
          </div>
        </div>

        <!-- เส้น Progress Bar โทนทองแชมเปญเรียบหรู -->
        <div class="w-full h-1 bg-slate-100 overflow-hidden">
          <div class="h-full bg-gradient-to-r from-amber-500 to-amber-400 ${this.isSliderPaused ? 'w-1/2' : 'bbk-slide-progress'}"></div>
        </div>

        <!-- พื้นที่แสดงภาพสไลด์หลัก -->
        <div class="relative aspect-16/9 w-full bg-slate-950 overflow-hidden flex items-center justify-center group flex-1">
          <img
            src="${imgUrl}"
            alt=""
            class="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
            onerror="this.src='assets/img/logo.png'"
          />
          <img
            src="${imgUrl}"
            alt="${window.authService.sanitizeHTML(current.title)}"
            onclick="${
              isNewsSlide
                ? `window.app.openNewsModal('${current.id}')`
                : `window.app.openImageLightbox('${imgUrl}', '${window.authService.sanitizeHTML(current.title)}', '${window.authService.sanitizeHTML(current.subtitle)}')`
            }"
            class="relative z-10 w-full h-full object-cover cursor-pointer transition duration-700 group-hover:scale-[1.02] animate-fade-in"
            onerror="this.src='assets/img/logo.png'"
          />

          <div class="absolute inset-0 z-20 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent pointer-events-none"></div>

          <!-- ป้ายกำกับด้านบนซ้าย & ปุ่มแก้ไขด่วนสำหรับครู/แอดมิน/ผู้พัฒนาเท่านั้น -->
          <div class="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-amber-300 text-xs font-bold border border-white/20 shadow-xs">
              <i data-lucide="${isNewsSlide ? 'newspaper' : 'award'}" class="w-3.5 h-3.5 text-amber-300"></i>
              <span>${window.authService.sanitizeHTML(current.tag)}</span>
            </span>

            ${
              canManage
                ? `
                <button
                  onclick="${
                    isNewsSlide
                      ? `window.app.openNewsEditorModal('${current.id}')`
                      : `window.app.handleAdminSlideEditClick('${current.id}')`
                  }"
                  class="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-900 text-xs font-bold shadow-md inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <i data-lucide="edit-3" class="w-3.5 h-3.5 text-amber-700"></i>
                  <span>แก้ไขสไลด์</span>
                </button>
                `
                : ''
            }
          </div>

          <!-- ปุ่มลูกศรเลื่อนซ้าย-ขวา -->
          <button
            onclick="window.publicViews.prevSlide()"
            aria-label="สไลด์ก่อนหน้า"
            class="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-white hover:text-slate-950 text-white border border-white/20 flex items-center justify-center backdrop-blur-xs transition cursor-pointer"
          >
            <i data-lucide="chevron-left" class="w-5 h-5"></i>
          </button>
          <button
            onclick="window.publicViews.nextSlide()"
            aria-label="สไลด์ถัดไป"
            class="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-white hover:text-slate-950 text-white border border-white/20 flex items-center justify-center backdrop-blur-xs transition cursor-pointer"
          >
            <i data-lucide="chevron-right" class="w-5 h-5"></i>
          </button>

          <!-- คำบรรยายสไลด์ด้านล่าง กระชับ ชัดเจน -->
          <div class="absolute bottom-0 inset-x-0 z-30 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div class="space-y-1 max-w-2xl">
              <div class="text-xs font-bold text-amber-300">
                📅 ${window.authService.sanitizeHTML(current.date)}
              </div>
              <h3 class="text-lg sm:text-2xl font-extrabold text-white leading-snug">
                ${window.authService.sanitizeHTML(current.title)}
              </h3>
              <p class="text-xs sm:text-sm text-slate-200 line-clamp-2">
                ${window.authService.sanitizeHTML(current.subtitle)}
              </p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                onclick="${
                  isNewsSlide
                    ? `window.app.openNewsModal('${current.id}')`
                    : `window.app.openImageLightbox('${imgUrl}', '${window.authService.sanitizeHTML(current.title)}', '${window.authService.sanitizeHTML(current.subtitle)}')`
                }"
                class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>${isNewsSlide ? 'อ่านรายละเอียด' : 'ดูภาพขยาย'}</span>
              </button>
              <a
                href="${window.authService.sanitizeHTML(fbUrl)}"
                target="_blank"
                rel="noopener"
                class="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold backdrop-blur-xs inline-flex items-center gap-1.5 transition"
              >
                <img src="assets/img/facebook_logo.png" alt="FB" class="w-3.5 h-3.5 object-contain inline-block shrink-0" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>

        <!-- แถบจุดเลือกสไลด์ย่อด้านล่าง -->
        <div class="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
            ${slides
              .map((s, idx) => {
                const active = idx === this.currentSlideIndex;
                return `
                  <button
                    onclick="window.publicViews.goToSlide(${idx})"
                    class="px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer shrink-0 max-w-[160px] truncate ${
                      active
                        ? 'bg-red-50 border-red-500 text-red-800'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                    }"
                  >
                    ${idx + 1}. ${window.authService.sanitizeHTML(s.title)}
                  </button>
                `;
              })
              .join('')}
          </div>

          ${
            canManage
              ? `
              <button
                onclick="window.app.handleAdminSlideAddClick()"
                class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-yellow-300 text-xs font-bold transition cursor-pointer shrink-0"
              >
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span>อัปโหลดสไลด์</span>
              </button>
              `
              : ''
          }
        </div>
      </div>
    `;
  }

  /**
   * เรนเดอร์บอร์ดข่าวสารและประกาศเคลื่อนไหวอัตโนมัติ (Live Moving Digital Bulletin Board - โทนเหลือง-แดง เทคโนโลยี)
   */
  /**
   * เรนเดอร์บอร์ดข่าวสารและประกาศสำคัญทางการ (Executive Official Bulletin - ดีไซน์สะอาดตา เรียบหรู)
   */
  renderLiveBulletinBoardInner() {
    const items = this.getBulletinBoardItems();
    if (this.activeBulletinIndex >= items.length) {
      this.activeBulletinIndex = 0;
    }
    const activeItem = items[this.activeBulletinIndex] || null;

    const filterButtons = [
      { id: 'ALL', label: 'ทั้งหมด' },
      { id: 'NEWS', label: 'ข่าวสาร' },
      { id: 'ANNOUNCE', label: 'ประกาศ' },
      { id: 'ACTIVITY', label: 'กิจกรรม' }
    ];

    return `
      <div class="bbk-soft-card rounded-3xl bg-white overflow-hidden flex flex-col h-full border border-slate-200/90 shadow-2xs">
        <!-- ส่วนหัวบอร์ดโทนกรมท่า-ทอง เรียบหรู สะอาดตา -->
        <div class="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-amber-500/30">
          <div class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <div>
              <h4 class="text-sm sm:text-base font-bold text-white tracking-wide">OFFICIAL NOTICES • ประกาศทางการ</h4>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              onclick="window.publicViews.prevBulletinItem()"
              title="รายการก่อนหน้า"
              class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <i data-lucide="chevron-up" class="w-4 h-4"></i>
            </button>
            <button
              onclick="window.publicViews.toggleBulletinPause()"
              title="${this.isBulletinPaused ? 'เล่นต่อ' : 'หยุดชั่วคราว'}"
              class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <i data-lucide="${this.isBulletinPaused ? 'play' : 'pause'}" class="w-3.5 h-3.5"></i>
            </button>
            <button
              onclick="window.publicViews.nextBulletinItem()"
              title="รายการถัดไป"
              class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <i data-lucide="chevron-down" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- แถบสลับหมวดหมู่บนบอร์ด -->
        <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
          <div class="flex flex-wrap gap-1">
            ${filterButtons
              .map(
                (b) => `
                <button
                  onclick="window.publicViews.setBulletinFilter('${b.id}')"
                  class="px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    this.bulletinFilter === b.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-white'
                  }"
                >
                  ${b.label}
                </button>
              `
              )
              .join('')}
          </div>
          <span class="text-[11px] font-mono font-bold text-slate-500">${this.activeBulletinIndex + 1}/${items.length}</span>
        </div>

        <!-- กล่องไฮไลต์ข่าวที่กำลังแสดงผลบนบอร์ด -->
        ${
          activeItem
            ? `
            <div
              onclick="${activeItem.onClick}"
              class="mx-4 mt-4 p-4 rounded-2xl bg-slate-50/80 border-l-4 border-l-amber-600 border border-slate-200/80 shadow-2xs cursor-pointer transition animate-fade-in hover:bg-white"
            >
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <span class="px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-bold">
                  ${window.authService.sanitizeHTML(activeItem.badge)}
                </span>
                <span class="text-[11px] font-semibold text-slate-500">📅 ${window.authService.sanitizeHTML(activeItem.date)}</span>
              </div>
              <h5 class="text-sm font-bold text-slate-900 leading-snug">
                ${window.authService.sanitizeHTML(activeItem.title)}
              </h5>
              <p class="text-xs text-slate-600 mt-1 line-clamp-2">
                ${window.authService.sanitizeHTML(activeItem.desc)}
              </p>
            </div>
            `
            : ''
        }

        <!-- รายการข่าวสารบนบอร์ด -->
        <div class="p-4 space-y-2 flex-1 overflow-y-auto max-h-[270px]">
          ${items
            .map((item, idx) => {
              const isCurrent = idx === this.activeBulletinIndex;
              return `
                <div
                  onclick="window.publicViews.selectBulletinItem(${idx}); ${item.onClick}"
                  onmouseenter="window.publicViews.selectBulletinItem(${idx})"
                  class="p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-amber-50/80 border-amber-300 font-bold'
                      : 'bg-slate-50/50 hover:bg-white border-slate-200/60'
                  }"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-2 h-2 rounded-full shrink-0 ${isCurrent ? 'bg-amber-600 ring-4 ring-amber-100' : 'bg-slate-300'}"></span>
                    <div class="min-w-0">
                      <div class="text-xs sm:text-sm font-semibold text-slate-800 truncate">${window.authService.sanitizeHTML(item.title)}</div>
                      <div class="text-[10px] text-slate-400">${window.authService.sanitizeHTML(item.badge)} • ${window.authService.sanitizeHTML(item.date)}</div>
                    </div>
                  </div>
                  <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 shrink-0"></i>
                </div>
              `;
            })
            .join('')}
        </div>

        <!-- แถบปุ่มลัดด้านล่างบอร์ด -->
        <div class="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <a
            href="https://www.facebook.com/profile.php?id=100014526581847"
            target="_blank"
            rel="noopener"
            class="font-bold text-slate-700 hover:text-blue-600 inline-flex items-center gap-1.5"
          >
            <img src="assets/img/facebook_logo.png" alt="Facebook" class="w-4 h-4 object-contain shrink-0 inline-block" />
            <span>Facebook โรงเรียน</span>
          </a>
          ${
            window.authService.isTeacherOrAbove()
              ? `
              <button
                onclick="window.app.handleAdminFacebookNewsClick()"
                class="px-3 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
              >
                + ดึงข่าว FB
              </button>
              `
              : `<span class="text-[11px] text-slate-400 font-semibold">อัปเดตแบบเรียลไทม์</span>`
          }
        </div>
      </div>
    `;
  }

  /**
   * ดึงข้อมูลจำนวนนักเรียน 3 ปีย้อนหลัง (ปีการศึกษา 2567, 2568, 2569)
   * ตามคำสั่ง: ปีการศึกษา 2569 = 285, ปีการศึกษา 2568 = -, ปีการศึกษา 2567 = - (แสดงแค่ 3 ปีย้อนหลัง)
   */
  getThreeYearStudentTrend() {
    const kpiStats = window.dbAdapter
      .getTable('School_Statistics')
      .filter((k) => k.metric_group === 'STUDENT_TREND');

    // เรียงตามปีการศึกษา และตัดให้แสดงเฉพาะ 3 ปีย้อนหลังเท่านั้น
    kpiStats.sort((a, b) => Number(a.academic_year || 0) - Number(b.academic_year || 0));
    const latestThree = kpiStats.slice(-3);

    if (latestThree.length === 0) {
      return [
        { kpi_id: 'KPI-01', academic_year: '2567', metric_value: '-', notes: 'เว้นว่างรอข้อมูล' },
        { kpi_id: 'KPI-02', academic_year: '2568', metric_value: '-', notes: 'เว้นว่างรอข้อมูล' },
        { kpi_id: 'KPI-03', academic_year: '2569', metric_value: 285, notes: 'ข้อมูลปีการศึกษา 2569' }
      ];
    }
    return latestThree;
  }

  /**
   * ส่วนแสดงกราฟจำนวนนักเรียน 3 ปีย้อนหลัง สำหรับผู้เข้าเยี่ยมชม (แสดงผลทั้งกราฟ Chart.js และการ์ดตัวเลข)
   */
  renderThreeYearStudentGraphSection() {
    const trend3Years = this.getThreeYearStudentTrend();

    return `
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0 text-2xl">
              📊
            </div>
            <div>
              <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-extrabold mb-1">
                STUDENT ANALYTICS (3 YEARS) • ข้อมูลสถิตินักเรียน
              </span>
              <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">
                กราฟแสดงจำนวนนักเรียน 3 ปีย้อนหลัง (ปีการศึกษา 2567 – 2569)
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                โรงเรียนบ้านบกหนองทันน้ำ เปิดสอนระดับชั้นอนุบาล – มัธยมศึกษาตอนต้น
              </p>
            </div>
          </div>

          ${
            window.authService.isTeacherOrAbove()
              ? `
              <button
                onclick="window.app.handleAdminThreeYearStudentClick()"
                class="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white hover:from-red-600 hover:to-red-500 text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
              >
                <i data-lucide="edit-3" class="w-3.5 h-3.5 text-amber-300"></i>
                <span>อัปเดตตัวเลขนักเรียน</span>
              </button>
              `
              : ''
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <!-- ซ้าย: การ์ดสรุปตัวเลข 3 ปีย้อนหลัง แยกสีตามปีการศึกษาอย่างสวยงาม -->
          <div class="lg:col-span-5 space-y-3">
            ${trend3Years
              .map((item, idx) => {
                const rawVal = String(item.metric_value ?? '-').trim();
                const isNumeric = rawVal !== '-' && rawVal !== '' && !isNaN(Number(rawVal)) && Number(rawVal) > 0;
                const displayVal = isNumeric ? Number(rawVal).toLocaleString() : '-';
                const pctWidth = isNumeric ? Math.min(100, Math.round((Number(rawVal) / 350) * 100)) : 0;

                const colorThemes = [
                  { border: 'border-blue-200', bg: 'bg-blue-50/50', text: 'text-blue-700', progress: 'bg-gradient-to-r from-blue-600 to-sky-400', dot: 'bg-blue-600' },
                  { border: 'border-emerald-200', bg: 'bg-emerald-50/50', text: 'text-emerald-700', progress: 'bg-gradient-to-r from-emerald-600 to-teal-400', dot: 'bg-emerald-600' },
                  { border: 'border-red-200', bg: 'bg-red-50/50', text: 'text-red-700', progress: 'bg-gradient-to-r from-red-600 to-amber-500', dot: 'bg-red-600' }
                ];
                const theme = colorThemes[idx % colorThemes.length];

                return `
                  <div class="p-4 rounded-2xl border ${
                    isNumeric ? `${theme.bg} ${theme.border} shadow-2xs` : 'bg-slate-50 border-slate-200/80'
                  } space-y-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full ${isNumeric ? theme.dot : 'bg-slate-400'}"></span>
                        <div>
                          <span class="text-xs font-extrabold text-slate-900">ปีการศึกษา ${window.authService.sanitizeHTML(item.academic_year)}</span>
                          <span class="block text-[11px] text-slate-500">${isNumeric ? 'ข้อมูลจำนวนนักเรียนทั้งหมด' : 'เว้นว่างไว้รอการอัปเดตข้อมูล'}</span>
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="text-2xl font-extrabold ${isNumeric ? theme.text : 'text-slate-400'}">${displayVal}</span>
                        <span class="text-xs font-semibold text-slate-500 ml-1">${isNumeric ? 'คน' : ''}</span>
                      </div>
                    </div>
                    <div class="w-full h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                      <div class="h-full rounded-full ${isNumeric ? theme.progress : 'bg-slate-300'}" style="width: ${pctWidth}%"></div>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>

          <!-- ขวา: กราฟแท่ง Chart.js แสดงจำนวนนักเรียน 3 ปีย้อนหลัง แยกสีตามปี -->
          <div class="lg:col-span-7 bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span class="text-xs font-bold text-slate-700">กราฟเปรียบเทียบจำนวนนักเรียน 3 ปีย้อนหลัง (คน)</span>
              <div class="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-bold">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                  <span class="w-2 h-2 rounded-full bg-blue-600"></span> ปี 2567: 295 คน
                </span>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span class="w-2 h-2 rounded-full bg-emerald-600"></span> ปี 2568: 281 คน
                </span>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                  <span class="w-2 h-2 rounded-full bg-red-600"></span> ปี 2569: 285 คน
                </span>
              </div>
            </div>
            <div class="h-60 sm:h-64 relative">
              <canvas id="visitor-3yr-student-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * วาดกราฟ Chart.js จำนวนนักเรียน 3 ปีย้อนหลัง สำหรับผู้เข้าเยี่ยมชม (บนหน้าแรกและหน้าข้อมูลโรงเรียน)
   */
  mountVisitorThreeYearChart() {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('visitor-3yr-student-chart');
    if (!canvas) return;

    try {
      const existing = Chart.getChart(canvas);
      if (existing) existing.destroy();
    } catch (e) {}

    if (this.visitorChartInstance && typeof this.visitorChartInstance.destroy === 'function') {
      try {
        this.visitorChartInstance.destroy();
      } catch (e) {}
    }
    this.visitorChartInstance = null;

    const trend3Years = this.getThreeYearStudentTrend();
    const labels = trend3Years.map((t) => `ปีการศึกษา ${t.academic_year}`);
    const dataValues = trend3Years.map((t) => {
      const v = String(t.metric_value ?? '-').trim();
      return v === '-' || v === '' || isNaN(Number(v)) ? 0 : Number(v);
    });

    const barColors = [
      { bg: '#2563EB', border: '#1D4ED8' }, // ปี 2567: สีน้ำเงิน
      { bg: '#059669', border: '#047857' }, // ปี 2568: สีเขียวมรกต
      { bg: '#DC2626', border: '#B91C1C' }  // ปี 2569: สีแดงเข้มเทคโนโลยี
    ];

    this.visitorChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'จำนวนนักเรียนทั้งหมด (คน)',
            data: dataValues,
            backgroundColor: dataValues.map((v, i) => (v > 0 ? barColors[i % barColors.length].bg : '#E2E8F0')),
            borderColor: dataValues.map((v, i) => (v > 0 ? barColors[i % barColors.length].border : '#CBD5E1')),
            borderWidth: 2,
            borderRadius: 12,
            maxBarThickness: 72
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const rawItem = trend3Years[ctx.dataIndex];
                const rawStr = String(rawItem ? rawItem.metric_value : '-').trim();
                if (rawStr === '-' || ctx.raw === 0) {
                  return ' จำนวนนักเรียน: - (รอข้อมูล)';
                }
                return ` จำนวนนักเรียน: ${Number(ctx.raw).toLocaleString()} คน`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 320,
            ticks: {
              callback: (val) => `${val} คน`
            }
          }
        }
      }
    });
  }

  /**
   * ตารางแสดงข้อมูลพื้นฐานโรงเรียนบ้านบกหนองทันน้ำ จัดระเบียบแยกเป็น 4 หมวดหมู่ชัดเจน สวยงาม ไม่ปะปนกัน
   */
  renderSchoolBasicInfoTable(profile) {
    const categories = [
      {
        id: 'CAT_GENERAL',
        title: 'ข้อมูลทั่วไปและรหัสสถานศึกษา',
        subtitle: 'General Information & Official Identifiers',
        icon: '🏛️',
        iconBg: 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-600',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        items: [
          { label: 'ชื่อสถานศึกษา (ไทย)', value: profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ', highlight: true },
          { label: 'ชื่อสถานศึกษา (อังกฤษ)', value: profile.school_name_en || 'BOKNONGTUNNAM SCHOOL', highlight: true },
          { label: 'รหัสโรงเรียน 10 หลัก', value: profile.school_code_10 || profile.school_code || '1034710083', mono: true },
          { label: 'รหัส SMIS 8 หลัก', value: profile.smis_code_8 || '34020157', mono: true },
          { label: 'รหัส OBEC 6 หลัก', value: profile.obec_code_6 || '710083', mono: true },
          { label: 'วัน-เดือน-ปี ก่อตั้ง', value: `${profile.established_date || '12052512'} (12 พฤษภาคม พ.ศ. 2512)` },
          { label: 'ระดับชั้นที่เปิดสอน', value: profile.education_level || 'อนุบาล-มัธยมศึกษาตอนต้น (ขยายโอกาสทางการศึกษา)', highlight: true },
          { label: 'หน่วยงานต้นสังกัด', value: profile.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุบลราชธานี เขต 2' }
        ]
      },
      {
        id: 'CAT_PHILOSOPHY',
        title: 'ปรัชญา คำขวัญ วิสัยทัศน์ และอัตลักษณ์',
        subtitle: 'Motto, Vision & Institutional Identity',
        icon: '🎯',
        iconBg: 'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600',
        badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
        items: [
          { label: 'คำขวัญของโรงเรียน', value: `“${profile.motto || 'เรียนรู้สู่ความเป็นเลิศ เชิดชูคุณธรรม นำพาชุมชน'}”`, highlight: true, fullWidth: true },
          { label: 'อัตลักษณ์สถานศึกษา (Identity)', value: profile.identity || 'มีวินัย ใส่ใจจิตอาสา', highlight: true },
          { label: 'เอกลักษณ์สถานศึกษา (Uniqueness)', value: profile.uniqueness || 'โรงเรียนสะอาด บรรยากาศร่มรื่น', highlight: true },
          { label: 'วิสัยทัศน์ (Vision)', value: profile.vision || 'โรงเรียนบ้านบกหนองทันน้ำ มุ่งพัฒนาผู้เรียนทุกคนให้มีความรู้คู่คุณธรรม มีสุขภาพร่างกายแข็งแรง มีคุณภาพตามมาตรฐานการศึกษา ส่งเสริมวิชาการและเทคโนโลยี มีนิสัยรักการอ่าน สืบสานงานประเพณีวัฒนธรรมไทย มีใจรักสิ่งแวดล้อม ผสานกิจกรรมเพิ่มเวลารู้ สู่ประชาคมอาเซียน พัฒนาคุณภาพชีวิตให้มีทักษะอาชีพ น้อมนำศาสตร์พระราชา สู่การจัดการเรียนรู้ เน้นประสานความร่วมมือจากทุกภาคส่วน', fullWidth: true, isParagraph: true }
        ]
      },
      {
        id: 'CAT_LOCATION',
        title: 'ข้อมูลที่ตั้ง การปกครอง และระยะทาง',
        subtitle: 'School Location, Administrative Area & Distances',
        icon: '📍',
        iconBg: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-green-600',
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        items: [
          { label: 'ที่อยู่สถานศึกษา', value: profile.address || 'หมู่ที่ 2 บ้านบก ตำบลหนองทันน้ำ อำเภอกุดข้าวปุ้น จังหวัดอุบลราชธานี 34270', fullWidth: true },
          { label: 'กลุ่มโรงเรียน', value: profile.school_group || 'กลุ่มโรงเรียนหนองทันน้ำ' },
          { label: 'องค์กรปกครองส่วนท้องถิ่น (อปท.)', value: profile.local_gov ? `องค์การบริหารส่วนตำบล${profile.local_gov}` : 'องค์การบริหารส่วนตำบลหนองทันน้ำ' },
          { label: 'ระยะทางจาก รร. ถึง อำเภอ (กุดข้าวปุ้น)', value: profile.distance_to_district || '10 กิโลเมตร' },
          { label: 'ระยะทางจาก รร. ถึง สพท. (ตระการพืชผล)', value: profile.distance_to_area_office || '30 กิโลเมตร' }
        ]
      },
      {
        id: 'CAT_CONTACT',
        title: 'ช่องทางการติดต่อและเครือข่ายดิจิทัล',
        subtitle: 'Contact Details & Digital School Channels',
        icon: '📞',
        iconBg: 'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600',
        badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
        items: [
          { label: 'หมายเลขโทรศัพท์', value: profile.phone || '0892867399', isPhone: true },
          { label: 'โทรสาร (Fax)', value: profile.fax || '-' },
          { label: 'อีเมลทางการ (Email)', value: profile.email || 'banboknongtannham@gmail.com', isEmail: true },
          { label: 'เว็บไซต์โรงเรียน', value: 'https://banboknongtunnham-dev.github.io/Banbonnongtunnam-School/', isLink: true },
          { label: 'Facebook โรงเรียน', value: profile.facebook_url || 'https://www.facebook.com/profile.php?id=100014526581847', isLink: true },
          { label: 'LINE Official Account', value: profile.line_oa || '@322rfuuz (บ้านบกหนองทันน้ำWeb)', isLine: true }
        ]
      }
    ];

    return `
      <div class="space-y-6">
        <!-- แถบหัวข้อส่วนข้อมูลพื้นฐานโรงเรียน -->
        <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-1.5">
              <i data-lucide="info" class="w-3.5 h-3.5"></i>
              OFFICIAL SCHOOL PROFILE • ข้อมูลสารสนเทศสถานศึกษา 4 หมวดหมู่
            </span>
            <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">
              ข้อมูลพื้นฐานโรงเรียนบ้านบกหนองทันน้ำ (รหัส 10 หลัก: 1034710083)
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              จัดระเบียบตามมาตรฐานข้อมูลสถานศึกษา สพฐ. กระทรวงศึกษาธิการ
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <a
              href="${window.authService.sanitizeHTML(profile.external_info_url || 'https://schoolthai.in.th/index_view.php?School_ID=1034710083&page=info')}"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-bold transition"
            >
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
              <span>ข้อมูลอ้างอิง SchoolThai</span>
            </a>
            ${
              window.authService.isAdminOrAbove()
                ? `
                <button
                  onclick="window.app.navigate('admin'); window.adminDashboardView.activeTab='school_info'; window.app.render();"
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer"
                >
                  <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                  <span>แก้ไขข้อมูลพื้นฐาน</span>
                </button>
                `
                : ''
            }
          </div>
        </div>

        <!-- รายการหมวดหมู่ทั้ง 4 หมวด (Modular Bento Category Cards) -->
        <div class="space-y-6">
          ${categories
            .map(
              (cat) => `
              <div class="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4 hover:shadow-md transition">
                <!-- หัวข้อหมวดหมู่ -->
                <div class="flex items-center gap-3.5 border-b border-slate-100 pb-3.5">
                  <div class="w-11 h-11 rounded-2xl ${cat.iconBg} text-white flex items-center justify-center shrink-0 shadow-sm text-xl select-none">
                    ${cat.icon}
                  </div>
                  <div>
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      ${cat.subtitle}
                    </span>
                    <h4 class="text-base sm:text-lg font-extrabold text-slate-900">
                      ${cat.title}
                    </h4>
                  </div>
                </div>

                <!-- รายการข้อมูลภายในหมวดหมู่ -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  ${cat.items
                    .map((r) => {
                      let valHtml = window.authService.sanitizeHTML(r.value);
                      if (r.isEmail && r.value && r.value !== '-') {
                        valHtml = `<a href="mailto:${window.authService.sanitizeHTML(r.value)}" class="text-amber-700 hover:underline font-bold">${valHtml}</a>`;
                      } else if (r.isPhone && r.value && r.value !== '-') {
                        valHtml = `<a href="tel:${window.authService.sanitizeHTML(r.value)}" class="text-slate-900 hover:text-blue-600 font-bold">${valHtml}</a>`;
                      } else if (r.isLink && r.value && r.value !== '-') {
                        valHtml = `<a href="${window.authService.sanitizeHTML(r.value)}" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-bold break-all">${valHtml}</a>`;
                      } else if (r.isLine && r.value) {
                        valHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>${valHtml}</span>`;
                      }

                      if (r.isParagraph) {
                        return `
                          <div class="md:col-span-2 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                            <span class="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                              ${window.authService.sanitizeHTML(r.label)}
                            </span>
                            <p class="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed indent-6">
                              ${valHtml}
                            </p>
                          </div>
                        `;
                      }

                      return `
                        <div class="${r.fullWidth ? 'md:col-span-2' : ''} p-3.5 rounded-2xl ${
                          r.highlight
                            ? 'bg-amber-50/40 border border-amber-200/80'
                            : 'bg-slate-50/80 border border-slate-200/70'
                        } flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                          <span class="text-xs font-bold text-slate-500 shrink-0">
                            ${window.authService.sanitizeHTML(r.label)}
                          </span>
                          <span class="text-xs sm:text-sm ${
                            r.mono
                              ? 'font-mono font-extrabold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto'
                              : 'font-bold text-slate-900'
                          } sm:text-right">
                            ${valHtml}
                          </span>
                        </div>
                      `;
                    })
                    .join('')}
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
   * คำนวณสถิติภาพรวมจากตารางจริงในฐานข้อมูล
   */
  getLiveOverviewStats() {
    const studentRows = window.dbAdapter.getTable('Students_Statistics');
    const personnelRows = window.dbAdapter.getTable('Personnel');
    const newsRows = window.dbAdapter.getTable('News').filter((n) => n.publish_status !== 'DRAFT');
    const docRows = window.dbAdapter.getTable('Documents').filter((d) => d.access_level === 'PUBLIC' || window.authService.isTeacherOrAbove());

    // ตรวจสอบค่าปีการศึกษา 2569 จาก School_Statistics ก่อน หากมีให้ใช้ค่านั้นเป็นหลัก (285 คน)
    const trend2569 = window.dbAdapter
      .getTable('School_Statistics')
      .find((k) => k.metric_group === 'STUDENT_TREND' && String(k.academic_year) === '2569');
    const sumFromGrades = studentRows.reduce((sum, r) => sum + (Number(r.total_count) || (Number(r.male_count || 0) + Number(r.female_count || 0))), 0);
    const totalStudents = trend2569 && !isNaN(Number(trend2569.metric_value)) && Number(trend2569.metric_value) > 0
      ? Number(trend2569.metric_value)
      : (sumFromGrades || 285);

    const totalMale = studentRows.reduce((sum, r) => sum + Number(r.male_count || 0), 0);
    const totalFemale = studentRows.reduce((sum, r) => sum + Number(r.female_count || 0), 0);
    const totalClassrooms = studentRows.reduce((sum, r) => sum + Number(r.classrooms || 1), 0);

    return {
      totalStudents,
      totalMale,
      totalFemale,
      totalClassrooms,
      totalPersonnel: personnelRows.length,
      totalNews: newsRows.length,
      totalDocs: docRows.length,
      gradeLevelsCount: studentRows.length
    };
  }

  /**
   * 1. หน้าแรก (HOME LANDING PAGE) — ดีไซน์สะอาดตา โปรขึ้น เรียบหรูขึ้น (Clean & Luxury Prestige Theme)
   */
  renderHome() {
    const profile = (window.dbAdapter.getTable('School_Profile')[0]) || {};
    const stats = this.getLiveOverviewStats();
    const logoUrl = window.driveService.resolveDriveImageUrl(window.dbAdapter.getSetting('logo_url', 'assets/img/logo.png'));
    const heroBadge = window.dbAdapter.getSetting('hero_badge_text', profile.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุบลราชธานี เขต 2');
    const heroTitle = window.dbAdapter.getSetting('hero_welcome_title', profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ');

    const allNews = window.dbAdapter.getTable('News').filter((n) => n.publish_status !== 'DRAFT');
    allNews.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

    const personnelAll = window.dbAdapter.getTable('Personnel');
    const sortedPersonnel = [...personnelAll].sort((a, b) => {
      const isExecA = a.personnel_id === 'PER-001' || String(a.position).includes('ผู้อำนวยการโรงเรียน') ? 1 : (a.personnel_id === 'PER-002' || String(a.position).includes('รองผู้อำนวยการ') ? 2 : 3);
      const isExecB = b.personnel_id === 'PER-001' || String(b.position).includes('ผู้อำนวยการโรงเรียน') ? 1 : (b.personnel_id === 'PER-002' || String(b.position).includes('รองผู้อำนวยการ') ? 2 : 3);
      if (isExecA !== isExecB) return isExecA - isExecB;

      const orderA = a.sort_order != null && a.sort_order !== '' && !isNaN(Number(a.sort_order)) ? Number(a.sort_order) : 999;
      const orderB = b.sort_order != null && b.sort_order !== '' && !isNaN(Number(b.sort_order)) ? Number(b.sort_order) : 999;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.personnel_id || '').localeCompare(String(b.personnel_id || ''));
    });

    const directorObj = sortedPersonnel.find((p) => p.personnel_id === 'PER-001' || String(p.position).includes('ผู้อำนวยการโรงเรียน')) || sortedPersonnel[0] || {};
    const directorImg = directorObj.photo_url && String(directorObj.photo_url).trim() !== ''
      ? window.driveService.resolveDriveImageUrl(directorObj.photo_url)
      : 'assets/img/director_thongpoon.png';
    const executives = sortedPersonnel.slice(0, 4);
    const fbSchoolUrl = profile.facebook_url || 'https://www.facebook.com/profile.php?id=100014526581847';

    return `
      <!-- แถบสีทอง-แดงเกียรติยศด้านบนสุด -->
      <div class="h-1.5 bbk-red-gold-bar w-full"></div>

      <!-- ZONE 1: ICONIC CRIMSON RED EXECUTIVE HERO + PORTRAIT SHOWCASE -->
      <section class="bbk-tech-hero border-b-4 border-amber-400 text-white relative overflow-hidden">
        <!-- Subtle Grid & Ambient Lighting -->
        <div class="absolute inset-0 bbk-tech-grid-overlay pointer-events-none"></div>
        <div class="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-amber-400/15 blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-0 left-10 w-80 h-80 rounded-full bg-red-950/70 blur-3xl pointer-events-none"></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14 relative z-10">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            <!-- Left: ข้อมูลโรงเรียน สะอาดตา โปรขึ้น เรียบหรู ชัดเจน บนธีมแดงเอกลักษณ์ (7 Cols) -->
            <div class="lg:col-span-7 space-y-5">
              
              <!-- Badges: สังกัด สพป., รหัสสถานศึกษา และ เพจ Facebook ทางการ -->
              <div class="flex flex-wrap items-center gap-2">
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold backdrop-blur-md shadow-2xs">
                  <img src="assets/img/obec_logo.png" alt="โลโก้ สพป.อุบลราชธานี เขต 2" class="w-4 h-4 object-contain shrink-0" />
                  <span class="truncate">${window.authService.sanitizeHTML(heroBadge)}</span>
                </div>
                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-200 text-xs font-bold font-mono shadow-2xs backdrop-blur-md">
                  <span>ID: ${window.authService.sanitizeHTML(profile.school_code_10 || profile.school_code || '1034710083')}</span>
                </div>
                <a
                  href="${window.authService.sanitizeHTML(fbSchoolUrl)}"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold shadow-2xs transition backdrop-blur-md"
                >
                  <img src="assets/img/facebook_logo.png" alt="Facebook" class="w-3.5 h-3.5 object-contain shrink-0" />
                  <span>Facebook โรงเรียน</span>
                  <i data-lucide="external-link" class="w-3 h-3 text-blue-100"></i>
                </a>
              </div>

              <!-- หัวข้อชื่อโรงเรียน สไตล์สถาบันการศึกษาชั้นนำ -->
              <div class="space-y-2">
                <div class="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-amber-300 flex items-center gap-2">
                  <span>BANBOKNONGTUNNAM SCHOOL</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span class="text-rose-200/90 font-semibold lowercase">ubon ratchathani primary education</span>
                </div>
                <h1 class="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
                  ${window.authService.sanitizeHTML(heroTitle)}
                </h1>
                <p class="text-xs sm:text-sm text-rose-100/90 leading-relaxed font-normal">
                  📍 ${window.authService.sanitizeHTML(profile.address || 'หมู่ที่ 2 บ้านบก ตำบลหนองทันน้ำ อำเภอกุดข้าวปุ้น จังหวัดอุบลราชธานี 34270')} • จัดการศึกษา <strong class="text-amber-200 font-semibold">${window.authService.sanitizeHTML(profile.education_level || 'อนุบาล-มัธยมศึกษาตอนต้น')}</strong>
                </p>
              </div>

              <!-- คำขวัญโรงเรียนในกรอบทองกระจกหรูหราสง่างาม -->
              <div class="p-4 sm:p-5 rounded-2xl bg-black/25 backdrop-blur-md border border-amber-400/40 border-l-4 border-l-amber-400 shadow-sm">
                <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>✨ คำขวัญประจำสถานศึกษา</span>
                </div>
                <p class="text-sm sm:text-base font-bold text-white mt-1 italic leading-relaxed">
                  “${window.authService.sanitizeHTML(profile.motto || 'เรียนรู้สู่ความเป็นเลิศ เชิดชูคุณธรรม นำพาชุมชน')}”
                </p>
              </div>

              <!-- 4 Clean Bento KPI Metric Cards (Glass on Red Theme - เรียบร้อย ชัดเจน สมส่วน) -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div onclick="window.app.navigate('dashboard')" class="bbk-glass-on-red p-3 sm:p-4 rounded-2xl cursor-pointer hover:bg-white/15 transition shadow-sm">
                  <div class="flex items-center justify-between text-rose-200 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-rose-100">นักเรียนปี 2569</span>
                    <i data-lucide="graduation-cap" class="w-4 h-4 text-amber-300"></i>
                  </div>
                  <div class="text-xl sm:text-2xl font-extrabold text-white font-mono">
                    ${stats.totalStudents.toLocaleString()}
                    <span class="text-xs font-normal text-rose-200">คน</span>
                  </div>
                </div>

                <div onclick="window.app.navigate('personnel')" class="bbk-glass-on-red p-3 sm:p-4 rounded-2xl cursor-pointer hover:bg-white/15 transition shadow-sm">
                  <div class="flex items-center justify-between text-rose-200 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-rose-100">บุคลากร</span>
                    <i data-lucide="user-check" class="w-4 h-4 text-emerald-300"></i>
                  </div>
                  <div class="text-xl sm:text-2xl font-extrabold text-white font-mono">
                    ${stats.totalPersonnel.toLocaleString()}
                    <span class="text-xs font-normal text-rose-200">ท่าน</span>
                  </div>
                </div>

                <div onclick="window.app.navigate('about')" class="bbk-glass-on-red p-3 sm:p-4 rounded-2xl cursor-pointer hover:bg-white/15 transition shadow-sm">
                  <div class="flex items-center justify-between text-rose-200 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-rose-100">รหัสสถานศึกษา</span>
                    <i data-lucide="award" class="w-4 h-4 text-amber-300"></i>
                  </div>
                  <div class="text-sm sm:text-base font-extrabold text-white font-mono">
                    ${window.authService.sanitizeHTML(profile.school_code_10 || '1034710083')}
                  </div>
                </div>

                <div onclick="window.app.navigate('news')" class="bbk-glass-on-red p-3 sm:p-4 rounded-2xl cursor-pointer hover:bg-white/15 transition shadow-sm">
                  <div class="flex items-center justify-between text-rose-200 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-rose-100">ข่าวสาร & ผลงาน</span>
                    <i data-lucide="newspaper" class="w-4 h-4 text-amber-300"></i>
                  </div>
                  <div class="text-xl sm:text-2xl font-extrabold text-white font-mono">
                    ${(this.getStudentSlides().length + stats.totalNews).toLocaleString()}
                    <span class="text-xs font-normal text-rose-200">รายการ</span>
                  </div>
                </div>
              </div>

            </div>

            <!-- Right: ภาพผู้บริหารสถานศึกษาในกรอบ Executive Prestige สวยสง่างามบนพื้นหลังแดง (5 Cols) -->
            <div class="lg:col-span-5 flex flex-col items-center justify-center">
              <div
                onclick="window.app.navigate('personnel')"
                title="คลิกเพื่อดูทำเนียบบุคลากรทั้งหมด"
                class="relative cursor-pointer group flex flex-col items-center select-none w-full max-w-sm sm:max-w-md"
              >
                <!-- แสงเรืองทองด้านหลังภาพ -->
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-amber-400/30 via-yellow-300/20 to-transparent blur-3xl pointer-events-none"></div>

                <!-- กรอบรูปภาพผู้บริหาร -->
                <div class="relative z-10 w-full flex justify-center">
                  <img
                    src="${directorImg}"
                    alt="นายทองพูล สิงห์บุตร ผู้อำนวยการโรงเรียนบ้านบกหนองทันน้ำ"
                    class="w-[240px] sm:w-[310px] lg:w-[360px] max-h-[380px] sm:max-h-[460px] object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.45)] group-hover:scale-102 transition duration-500"
                    onerror="this.src='assets/img/logo.png'"
                  />
                </div>

                <!-- ป้ายชื่อตำแหน่งผู้บริหารหรูหรากระจกทองบนพื้นแดง -->
                <div class="relative z-20 -mt-6 w-11/12 bg-slate-950/85 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-amber-400/40 shadow-xl text-center space-y-0.5">
                  <span class="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    EXECUTIVE LEADERSHIP
                  </span>
                  <h3 class="text-sm sm:text-base font-extrabold text-white">
                    นายทองพูล สิงห์บุตร
                  </h3>
                  <p class="text-xs font-semibold text-rose-200">
                    ผู้อำนวยการโรงเรียนบ้านบกหนองทันน้ำ
                  </p>
                  <p class="text-[11px] text-amber-300 font-medium">
                    วิทยฐานะ ชำนาญการพิเศษ
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- ZONE 1.5: DIGITAL SERVICES & ACADEMIC PORTALS (จัดแถบเมนูบริการดิจิทัลให้ดูเรียบร้อย เป็นระเบียบ) -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-7 relative z-20">
        <div class="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-lg">
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="w-2 h-4 rounded-full bg-red-700"></span>
              <h3 class="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800">
                ระบบบริการดิจิทัลและงานสถานศึกษา • DIGITAL SCHOOL PORTALS
              </h3>
            </div>
            <span class="text-[11px] font-bold text-amber-700 hidden sm:inline">โรงเรียนบ้านบกหนองทันน้ำ</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            <!-- 1. ครู/พอร์ทัล -->
            <button
              onclick="window.app.navigate('teacher-portal')"
              class="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50/80 border border-slate-200/80 hover:border-amber-300 transition group cursor-pointer text-center"
            >
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-2">
                <i data-lucide="laptop" class="w-5 h-5"></i>
              </div>
              <span class="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-amber-800 transition">พอร์ทัลครู</span>
              <span class="text-[10px] text-slate-500 mt-0.5">บริการงาน 8 ฝ่าย</span>
            </button>

            <!-- 2. บุคลากร -->
            <button
              onclick="window.app.navigate('personnel')"
              class="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 transition group cursor-pointer text-center"
            >
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-2">
                <i data-lucide="users" class="w-5 h-5"></i>
              </div>
              <span class="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition">ทำเนียบบุคลากร</span>
              <span class="text-[10px] text-slate-500 mt-0.5">${stats.totalPersonnel} ท่านครบถ้วน</span>
            </button>

            <!-- 3. วิชาการ & ผลสอบ -->
            <button
              onclick="window.app.navigate('academic')"
              class="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/80 border border-slate-200/80 hover:border-emerald-300 transition group cursor-pointer text-center"
            >
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-2">
                <i data-lucide="graduation-cap" class="w-5 h-5"></i>
              </div>
              <span class="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition">วิชาการ & สอบ</span>
              <span class="text-[10px] text-slate-500 mt-0.5">O-NET / RT / NT</span>
            </button>

            <!-- 4. สถิติสารสนเทศ -->
            <button
              onclick="window.app.navigate('dashboard')"
              class="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-slate-50 hover:bg-rose-50/80 border border-slate-200/80 hover:border-rose-300 transition group cursor-pointer text-center"
            >
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-red-600 to-rose-400 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-2">
                <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
              </div>
              <span class="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-red-700 transition">สถิติสารสนเทศ</span>
              <span class="text-[10px] text-slate-500 mt-0.5">กราฟวิเคราะห์ 4 แบบ</span>
            </button>

            <!-- 5. เอกสารเผยแพร่ -->
            <button
              onclick="window.app.navigate('documents')"
              class="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/80 border border-slate-200/80 hover:border-purple-300 transition group cursor-pointer text-center"
            >
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-violet-400 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-2">
                <i data-lucide="folder-open" class="w-5 h-5"></i>
              </div>
              <span class="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition">เอกสารเผยแพร่</span>
              <span class="text-[10px] text-slate-500 mt-0.5">ITA / แบบฟอร์ม</span>
            </button>

            <!-- 6. ข้อมูลพื้นฐานโรงเรียน -->
            <button
              onclick="window.app.navigate('about')"
              class="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-300 transition group cursor-pointer text-center"
            >
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 text-amber-300 flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-2">
                <i data-lucide="building-2" class="w-5 h-5"></i>
              </div>
              <span class="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-slate-700 transition">ข้อมูลโรงเรียน</span>
              <span class="text-[10px] text-slate-500 mt-0.5">23 รายการสถานศึกษา</span>
            </button>
          </div>
        </div>
      </section>

      <!-- ZONE 2: CAMPUS SPOTLIGHT SLIDER (7 COLS) + OFFICIAL NOTICES BULLETIN (5 COLS) -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs shrink-0 text-xl font-bold">
              <i data-lucide="sparkles" class="w-5 h-5"></i>
            </div>
            <div>
              <span class="text-[11px] font-extrabold uppercase tracking-widest text-amber-700">
                CAMPUS SPOTLIGHT & OFFICIAL NOTICES
              </span>
              <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900">
                ผลงานและโอกาสสำคัญนักเรียน & ประกาศทางการ
              </h2>
            </div>
          </div>

          ${
            window.authService.isTeacherOrAbove()
              ? `
              <div class="flex flex-wrap items-center gap-2">
                <button
                  onclick="window.app.handleAdminSlideAddClick()"
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  <i data-lucide="image-plus" class="w-3.5 h-3.5 text-amber-400"></i>
                  <span>+ เพิ่มสไลด์ภาพ</span>
                </button>
                <button
                  onclick="window.app.handleAdminFacebookNewsClick()"
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-[#1877F2] hover:bg-blue-100 border border-blue-200 text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  <img src="assets/img/facebook_logo.png" alt="Facebook" class="w-3.5 h-3.5 object-contain shrink-0 inline-block" />
                  <span>+ ดึงโพสต์ Facebook</span>
                </button>
              </div>
              `
              : ''
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div id="pro-student-slider-box" class="lg:col-span-7">
            ${this.renderStudentSliderInner()}
          </div>
          <div id="live-bulletin-board-box" class="lg:col-span-5">
            ${this.renderLiveBulletinBoardInner()}
          </div>
        </div>
      </section>

      <!-- ZONE 3: EDITORIAL NEWS CAROUSEL + OFFICIAL FACEBOOK COMMUNITY HUB -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- ซ้าย (7 คอลัมน์): สไลด์การ์ดข่าวสารประชาสัมพันธ์ สะอาดตา เรียบหรู -->
          <div class="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shadow-xs shrink-0">
                  <i data-lucide="newspaper" class="w-5 h-5 text-slate-700"></i>
                </div>
                <div>
                  <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">SCHOOL PR & ACTIVITIES</span>
                  <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">ข่าวสารประชาสัมพันธ์และกิจกรรมโรงเรียน</h3>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  onclick="window.publicViews.scrollNewsCarousel(-1)"
                  title="เลื่อนไปทางซ้าย"
                  class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                >
                  <i data-lucide="chevron-left" class="w-4 h-4"></i>
                </button>
                <button
                  onclick="window.publicViews.scrollNewsCarousel(1)"
                  title="เลื่อนไปทางขวา"
                  class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                >
                  <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </button>
                <button
                  onclick="window.app.navigate('news')"
                  class="px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>ดูทั้งหมด (${allNews.length})</span>
                  <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-amber-400"></i>
                </button>
              </div>
            </div>

            <div id="news-cards-carousel-track" class="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-1">
              ${allNews
                .map(
                  (news) => `
                  <div class="w-[280px] sm:w-[310px] shrink-0">
                    ${this.renderNewsCard(news)}
                  </div>
                `
                )
                .join('')}
            </div>
          </div>

          <!-- ขวา (5 คอลัมน์): กล่องทางการเชื่อมต่อ Facebook โรงเรียน สวยงาม เสถียร ไม่หน่วง -->
          <div class="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <img src="assets/img/facebook_logo.png" alt="Facebook" class="w-6 h-6 object-contain shrink-0 inline-block" />
                </div>
                <div>
                  <span class="text-[10px] font-extrabold uppercase tracking-widest text-[#1877F2]">OFFICIAL FACEBOOK COMMUNITY</span>
                  <h3 class="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">เฟซบุ๊กโรงเรียนบ้านบกหนองทันน้ำ</h3>
                </div>
              </div>
              <a
                href="${window.authService.sanitizeHTML(fbSchoolUrl)}"
                target="_blank"
                rel="noopener"
                class="px-3 py-1.5 rounded-xl bg-[#1877F2] text-white hover:bg-blue-700 text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs shrink-0"
              >
                <span>เปิดดูบน FB</span>
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
              </a>
            </div>

            <!-- กล่องแนะนำเพจโรงเรียนอย่างเป็นทางการและไฮไลต์โพสต์ -->
            <div class="rounded-2xl p-5 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 border border-blue-100 space-y-4">
              <div class="flex items-center gap-3">
                <img src="${logoUrl}" alt="โลโก้" class="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-slate-200 shadow-2xs" />
                <div>
                  <h4 class="text-sm font-bold text-slate-900">โรงเรียนบ้านบกหนองทันน้ำ</h4>
                  <p class="text-xs text-slate-500">สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุบลราชธานี เขต 2</p>
                </div>
              </div>
              <p class="text-xs text-slate-600 leading-relaxed">
                ติดตามข่าวสาร กิจกรรมสด ภาพถ่ายการเรียนการสอน และประกาศด่วนจากทางโรงเรียนผ่านเพจ Facebook ทางการ
              </p>
              <div class="pt-2 flex flex-wrap gap-2">
                <a
                  href="${window.authService.sanitizeHTML(fbSchoolUrl)}"
                  target="_blank"
                  rel="noopener"
                  class="flex-1 text-center py-2 px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-2xs transition"
                >
                  👍 เยี่ยมชม & ติดตามเพจ
                </a>
                <button
                  onclick="window.app.handleAdminFacebookNewsClick()"
                  class="py-2 px-3 rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition"
                  title="เพิ่มโพสต์ล่าสุดลงเว็บ"
                >
                  🔗 ซิงค์โพสต์
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ZONE 4: 3-YEAR STUDENT ANALYTICS + ACADEMIC EXCELLENCE -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        ${this.renderThreeYearStudentGraphSection()}
      </section>

      <!-- ZONE 5: SCHOOL PHILOSOPHY & PERSONNEL DIRECTORY PREVIEW -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-14 space-y-6">
        <!-- 3 กล่องอัตลักษณ์ เอกลักษณ์ คำขวัญ เรียบหรู สะอาดตา -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- 1. คำขวัญ -->
          <div class="bg-white p-5 rounded-2xl border border-slate-200/90 border-l-4 border-l-amber-600 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 text-xl font-bold">
              🏆
            </div>
            <div>
              <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">คำขวัญของโรงเรียน</div>
              <div class="text-sm font-extrabold text-slate-900 mt-0.5">${window.authService.sanitizeHTML(profile.motto || 'เรียนรู้สู่ความเป็นเลิศ เชิดชูคุณธรรม นำพาชุมชน')}</div>
            </div>
          </div>

          <!-- 2. อัตลักษณ์ -->
          <div class="bg-white p-5 rounded-2xl border border-slate-200/90 border-l-4 border-l-blue-600 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 text-xl font-bold">
              🌟
            </div>
            <div>
              <div class="text-[11px] font-extrabold uppercase tracking-wider text-blue-800">อัตลักษณ์สถานศึกษา</div>
              <div class="text-sm font-extrabold text-slate-900 mt-0.5">${window.authService.sanitizeHTML(profile.identity || 'มีวินัย ใส่ใจจิตอาสา')}</div>
            </div>
          </div>

          <!-- 3. เอกลักษณ์ -->
          <div class="bg-white p-5 rounded-2xl border border-slate-200/90 border-l-4 border-l-emerald-600 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 text-xl font-bold">
              🌳
            </div>
            <div>
              <div class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">เอกลักษณ์สถานศึกษา</div>
              <div class="text-sm font-extrabold text-slate-900 mt-0.5">${window.authService.sanitizeHTML(profile.uniqueness || 'โรงเรียนสะอาด บรรยากาศร่มรื่น')}</div>
            </div>
          </div>
        </div>

        <!-- ทำเนียบผู้บริหารและบุคลากร (Preview 4 ท่านแรก ในกรอบคลีนเรียบหรู) -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div class="flex items-center gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden">
                <img src="${logoUrl}" alt="โลโก้โรงเรียนบ้านบกหนองทันน้ำ" class="w-full h-full object-contain" onerror="this.src='assets/img/logo.png'" />
              </div>
              <div>
                <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">FACULTY & STAFF DIRECTORY</span>
                <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">ทำเนียบผู้บริหารและบุคลากร (ทั้งหมด ${stats.totalPersonnel} ท่าน)</h3>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                onclick="window.app.navigate('about')"
                class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                ข้อมูลโรงเรียน
              </button>
              <button
                onclick="window.app.navigate('personnel')"
                class="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>ดูบุคลากรทั้งหมด ${stats.totalPersonnel} ท่าน</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-amber-400"></i>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${executives.map((p, idx) => this.renderPersonnelPortraitCard(p, idx < 2)).join('')}
          </div>
        </div>
      </section>
    `;
  }

  /**
   * การ์ดแสดงข่าวประชาสัมพันธ์ (รองรับลิงก์และการฝังโพสต์จาก Facebook)
   */
  renderNewsCard(news) {
    const imgUrl = window.driveService.resolveDriveImageUrl(news.cover_image_url);
    const fbLink = news.facebook_url || (String(news.attachment_url || '').includes('facebook.com') ? news.attachment_url : '');

    return `
      <article class="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-red-300 transition flex flex-col">
        <div class="aspect-16/9 bg-slate-100 relative overflow-hidden cursor-pointer" onclick="window.app.openNewsModal('${news.news_id}')">
          <img src="${imgUrl}" alt="${window.authService.sanitizeHTML(news.title)}" class="w-full h-full object-cover hover:scale-105 transition duration-500" onerror="this.src='assets/img/logo.png'" />
          <div class="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
            ${
              news.is_pinned
                ? `<span class="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-amber-500 text-white text-[10px] font-extrabold shadow-xs">📌 ปักหมุด</span>`
                : ''
            }
            <span class="px-2.5 py-0.5 rounded-md bg-slate-900/80 text-amber-300 text-[10px] font-semibold backdrop-blur-xs">
              ${window.authService.sanitizeHTML(news.category)}
            </span>
            ${
              fbLink
                ? `<span class="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shadow-xs">Facebook</span>`
                : ''
            }
          </div>
        </div>
        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>📅 ${window.authService.sanitizeHTML(news.published_at)}</span>
              <span>👁️ ${Number(news.views_count || 0).toLocaleString()} ครั้ง</span>
            </div>
            <h4
              onclick="window.app.openNewsModal('${news.news_id}')"
              class="text-sm font-bold text-slate-900 hover:text-red-700 cursor-pointer line-clamp-2 leading-snug"
            >
              ${window.authService.sanitizeHTML(news.title)}
            </h4>
            <p class="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
              ${window.authService.sanitizeHTML(news.summary)}
            </p>
          </div>
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              onclick="window.app.openNewsModal('${news.news_id}')"
              class="text-xs font-bold text-red-700 hover:text-red-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>อ่านรายละเอียด</span>
              <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </button>
            <div class="flex items-center gap-2">
              ${
                fbLink
                  ? `
                  <a
                    href="${window.authService.sanitizeHTML(fbLink)}"
                    target="_blank"
                    rel="noopener"
                    class="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <img src="assets/img/facebook_logo.png" alt="Facebook" class="w-3.5 h-3.5 object-contain shrink-0 inline-block" /> ดูโพสต์ FB
                  </a>
                  `
                  : ''
              }
              <button
                onclick="window.app.shareNewsToFacebook('${news.news_id}')"
                title="แชร์ไปยัง Facebook"
                class="text-[11px] text-slate-500 hover:text-red-600 inline-flex items-center gap-1 cursor-pointer"
              >
                <i data-lucide="share-2" class="w-3.5 h-3.5"></i> แชร์
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * 2. หน้าข้อมูลโรงเรียน (ABOUT SCHOOL, BASIC INFO TABLE, 3-YEAR GRAPH, HISTORY, VISION, BUILDINGS, QA)
   */
  renderAbout() {
    const profile = (window.dbAdapter.getTable('School_Profile')[0]) || {};
    const historyList = window.dbAdapter.getTable('School_History').sort((a, b) => Number(a.sort_order || 1) - Number(b.sort_order || 1));
    const academicData = window.dbAdapter.getTable('Academic_Data');
    const logoUrl = window.driveService.resolveDriveImageUrl(window.dbAdapter.getSetting('logo_url', 'assets/img/logo.png'));

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <!-- Page Banner -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center gap-6">
          <div class="flex items-center gap-3 shrink-0">
            <img src="${logoUrl}" alt="ตราโรงเรียนบ้านบกหนองทันน้ำ" class="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-sm shrink-0" />
            <img src="assets/img/obec_logo.png" alt="โลโก้ สพป.อุบลราชธานี เขต 2" class="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-sm shrink-0" />
          </div>
          <div class="space-y-2 text-center md:text-left">
            <span class="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              ข้อมูลพื้นฐานสถานศึกษา (School Profile)
            </span>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${window.authService.sanitizeHTML(profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ')}</h2>
            <p class="text-sm font-semibold text-slate-600">${window.authService.sanitizeHTML(profile.school_name_en || 'BOKNONGTUNNAM')} • ${window.authService.sanitizeHTML(profile.affiliation)}</p>
            <div class="flex flex-wrap justify-center md:justify-start gap-2 pt-1 text-xs text-slate-600">
              <span class="px-3 py-1 rounded-lg bg-slate-100">รหัส 10 หลัก: <strong>${window.authService.sanitizeHTML(profile.school_code_10 || profile.school_code || '1034710083')}</strong></span>
              <span class="px-3 py-1 rounded-lg bg-slate-100">SMIS 8 หลัก: <strong>${window.authService.sanitizeHTML(profile.smis_code_8 || '34020157')}</strong></span>
              <span class="px-3 py-1 rounded-lg bg-slate-100">OBEC 6 หลัก: <strong>${window.authService.sanitizeHTML(profile.obec_code_6 || '710083')}</strong></span>
              <span class="px-3 py-1 rounded-lg bg-slate-100">ก่อตั้งเมื่อ: <strong>12 พฤษภาคม พ.ศ. 2512</strong></span>
              <span class="px-3 py-1 rounded-lg bg-amber-50 text-amber-900 font-semibold">${window.authService.sanitizeHTML(profile.education_level || 'อนุบาล-มัธยมศึกษาตอนต้น')}</span>
            </div>
          </div>
        </div>

        <!-- ตารางข้อมูลพื้นฐานสถานศึกษาครบทุกรายการตามข้อมูลจริง -->
        ${this.renderSchoolBasicInfoTable(profile)}

        <!-- กราฟแสดงจำนวนนักเรียน 3 ปีย้อนหลัง -->
        ${this.renderThreeYearStudentGraphSection()}

        <!-- คำขวัญ วิสัยทัศน์ พันธกิจ อัตลักษณ์ เอกลักษณ์ (พร้อมไอคอนสีสันสดใสสไตล์ Facebook) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div class="flex items-start gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 text-white flex items-center justify-center shrink-0 shadow-sm text-xl">
                🏆
              </div>
              <div>
                <h3 class="text-base font-extrabold text-slate-900">คำขวัญของโรงเรียน</h3>
                <p class="text-sm sm:text-base font-extrabold text-amber-800 mt-0.5">
                  “${window.authService.sanitizeHTML(profile.motto || 'เรียนรู้สู่ความเป็นเลิศ เชิดชูคุณธรรม นำพาชุมชน')}”
                </p>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-start gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm text-xl">
                🚀
              </div>
              <div>
                <h3 class="text-base font-extrabold text-slate-900">วิสัยทัศน์ (Vision)</h3>
                <p class="text-sm text-slate-600 mt-0.5">${window.authService.sanitizeHTML(profile.vision || '-')}</p>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs text-lg">
                  🌟
                </div>
                <div>
                  <div class="text-[11px] font-extrabold text-blue-800">อัตลักษณ์ (Identity)</div>
                  <div class="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">${window.authService.sanitizeHTML(profile.identity || 'มีวินัย ใส่ใจจิตอาสา')}</div>
                </div>
              </div>
              <div class="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs text-lg">
                  🌳
                </div>
                <div>
                  <div class="text-[11px] font-extrabold text-emerald-800">เอกลักษณ์ (Uniqueness)</div>
                  <div class="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">${window.authService.sanitizeHTML(profile.uniqueness || 'โรงเรียนสะอาด บรรยากาศร่มรื่น')}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm text-xl">
                🎯
              </div>
              <h3 class="text-lg font-extrabold text-slate-900">พันธกิจ (Mission)</h3>
            </div>
            <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">${window.authService.sanitizeHTML(profile.mission)}</p>
          </div>
        </div>

        <!-- ประวัติความเป็นมาโรงเรียน (Timeline) -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <div class="mb-6">
            <span class="text-xs font-bold text-amber-700 uppercase">SCHOOL HISTORY TIMELINE</span>
            <h3 class="text-xl font-bold text-slate-900">ประวัติความเป็นมาโรงเรียนบ้านบกหนองทันน้ำ</h3>
          </div>
          <div class="space-y-6 border-l-2 border-amber-400 pl-6 ml-3">
            ${historyList
              .map(
                (h) => `
                <div class="relative">
                  <span class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-amber-400 border-4 border-white shadow-xs"></span>
                  <span class="inline-block px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-1">
                    ${window.authService.sanitizeHTML(h.year_be)}
                  </span>
                  <h4 class="text-base font-bold text-slate-900">${window.authService.sanitizeHTML(h.title)}</h4>
                  <p class="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">${window.authService.sanitizeHTML(h.description)}</p>
                </div>
              `
              )
              .join('')}
          </div>
        </div>

        <!-- อาคารสถานที่ แหล่งเรียนรู้ รางวัล และประกันคุณภาพ -->
        <div>
          <div class="mb-5">
            <span class="text-xs font-bold text-amber-700 uppercase">INFRASTRUCTURE & QUALITY ASSURANCE</span>
            <h3 class="text-xl font-bold text-slate-900">อาคารสถานที่ แหล่งเรียนรู้ รางวัล และการประกันคุณภาพการศึกษา</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            ${academicData
              .map(
                (item) => `
                <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-2">
                      <span class="px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                        ${window.authService.sanitizeHTML(item.category)}
                      </span>
                      <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        ${window.authService.sanitizeHTML(item.metric_value)}
                      </span>
                    </div>
                    <h4 class="text-base font-bold text-slate-900">${window.authService.sanitizeHTML(item.title)}</h4>
                    <p class="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">${window.authService.sanitizeHTML(item.description)}</p>
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
   * การ์ดแนะนำบุคลากรรูปแบบมาตรฐาน: ภาพด้านบน ชื่อและตำแหน่งด้านล่าง
   * คืนค่าสัดส่วนภาพแบบแนวตั้ง 3:4 เต็มใบ ชัดเจน สง่างาม ไม่ถูกบีบ พร้อมจัดวางสมดุล
   */
  renderPersonnelPortraitCard(person, isExecutive = false) {
    const hasCustomPhoto = Boolean(
      person.photo_url &&
      String(person.photo_url).trim() !== '' &&
      String(person.photo_url).trim() !== 'assets/img/logo.png'
    );
    const resolvedPhoto = hasCustomPhoto
      ? window.driveService.resolveDriveImageUrl(person.photo_url)
      : 'assets/img/logo.png';

    const fullName = `${person.prefix || ''}${person.first_name || ''} ${person.last_name || ''}`.trim();
    const posText = person.position || 'บุคลากรทางการศึกษา';
    const standing = person.academic_standing ? String(person.academic_standing).trim() : '-';
    const showStanding = posText === 'ครู' || (standing !== '-' && standing !== '');
    const canManage = window.authService.isTeacherOrAbove();

    return `
      <div
        onclick="window.app.openPersonnelDetailModal('${person.personnel_id}')"
        title="คลิกเพื่อดูประวัติและข้อมูลบุคลากร"
        class="group bg-white rounded-3xl overflow-hidden border ${
          isExecutive ? 'border-2 border-amber-400 shadow-md ring-2 ring-amber-200/80' : 'border border-slate-200/90 shadow-2xs'
        } hover:shadow-xl hover:border-red-400 transition duration-300 flex flex-col justify-between w-full cursor-pointer select-none"
      >
        <!-- ส่วนที่ 1: ภาพถ่ายบุคลากรด้านบน สัดส่วน 3:4 เต็มกรอบ สมส่วน สวยงาม -->
        <div class="relative aspect-[3/4] w-full ${
          isExecutive
            ? 'bg-amber-50/20 p-1.5'
            : 'bg-gradient-to-b from-amber-50/50 via-slate-50 to-slate-100'
        } overflow-hidden flex items-center justify-center border-b border-slate-100">
          ${
            hasCustomPhoto
              ? `
              <img
                src="${resolvedPhoto}"
                alt="${window.authService.sanitizeHTML(fullName)}"
                class="w-full h-full ${isExecutive ? 'object-contain object-center rounded-2xl' : 'object-cover object-top'} group-hover:scale-105 transition duration-500"
                onerror="this.src='assets/img/logo.png'"
              />
              `
              : `
              <!-- กรอบสำหรับรูปภาพบุคลากร -->
              <div class="flex flex-col items-center justify-center p-4 text-center select-none">
                <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 border-2 border-dashed border-amber-300 flex items-center justify-center shadow-2xs mb-2 relative">
                  <img src="assets/img/logo.png" alt="ตราโรงเรียน" class="w-10 h-10 object-contain opacity-35" />
                  <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center border border-white text-xs">
                    <i data-lucide="user" class="w-3.5 h-3.5"></i>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 text-[10px] font-semibold text-slate-400">
                  รูปภาพบุคลากร
                </span>
              </div>
              `
          }

          ${
            isExecutive
              ? `
              <span class="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-slate-900/90 text-amber-300 text-[10px] font-bold tracking-wide shadow-xs backdrop-blur-xs border border-amber-400/40">
                ผู้บริหารสถานศึกษา
              </span>
              `
              : ''
          }

          ${
            canManage
              ? `
              <!-- ปุ่มลัดบนภาพสำหรับ ครู/แอดมิน/ผู้พัฒนา เพื่อเปลี่ยนรูปหรือแก้ไขข้อมูล -->
              <button
                onclick="event.stopPropagation(); window.app.handleAdminPersonnelEditClick('${person.personnel_id}');"
                title="แก้ไขข้อมูล / อัปโหลดรูปภาพ"
                class="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-white/95 hover:bg-amber-400 text-slate-800 hover:text-slate-950 border border-slate-200/80 shadow-xs text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer z-10"
              >
                <i data-lucide="camera" class="w-3 h-3 text-amber-600"></i>
                <span>เปลี่ยนรูป</span>
              </button>
              `
              : ''
          }
        </div>

        <!-- ส่วนที่ 2: ชื่อ-นามสกุล และตำแหน่งด้านล่าง (ขนาดสมส่วน พอดีตา) -->
        <div class="p-4 sm:p-5 text-center space-y-1.5 bg-white flex-1 flex flex-col justify-center">
          <h3 class="text-sm sm:text-base font-extrabold text-slate-900 leading-snug line-clamp-1" title="${window.authService.sanitizeHTML(fullName)}">
            ${window.authService.sanitizeHTML(fullName)}
          </h3>

          <div class="text-xs sm:text-sm font-bold text-amber-700 truncate">
            ตำแหน่ง ${window.authService.sanitizeHTML(posText)}
          </div>

          ${
            showStanding
              ? `
              <div class="pt-0.5">
                <span class="inline-block px-3 py-0.5 rounded-full text-xs font-medium truncate max-w-full ${
                  standing !== '-'
                    ? 'bg-amber-50 text-amber-900 border border-amber-200/80'
                    : 'bg-slate-100 text-slate-500'
                }">
                  วิทยฐานะ ${window.authService.sanitizeHTML(standing)}
                </span>
              </div>
              `
              : ''
          }
        </div>
      </div>
    `;
  }

  /**
   * 3. หน้าแนะนำบุคลากร (PERSONNEL DIRECTORY)
   * แสดงจำนวนบุคลากรรวมโดยคำนวณอัตโนมัติจากยอดรายชื่อด้านล่าง พร้อมแยกผู้บริหาร ครู และบุคลากร
   */
  renderPersonnel() {
    const allPersonnel = [...window.dbAdapter.getTable('Personnel')].sort((a, b) => {
      const isExecA = a.personnel_id === 'PER-001' || String(a.position).includes('ผู้อำนวยการโรงเรียน') ? 1 : (a.personnel_id === 'PER-002' || String(a.position).includes('รองผู้อำนวยการ') ? 2 : 3);
      const isExecB = b.personnel_id === 'PER-001' || String(b.position).includes('ผู้อำนวยการโรงเรียน') ? 1 : (b.personnel_id === 'PER-002' || String(b.position).includes('รองผู้อำนวยการ') ? 2 : 3);
      if (isExecA !== isExecB) return isExecA - isExecB;

      const orderA = a.sort_order != null && a.sort_order !== '' && !isNaN(Number(a.sort_order)) ? Number(a.sort_order) : 999;
      const orderB = b.sort_order != null && b.sort_order !== '' && !isNaN(Number(b.sort_order)) ? Number(b.sort_order) : 999;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.personnel_id || '').localeCompare(String(b.personnel_id || ''));
    });

    // คำนวณยอดจำนวนบุคลากรจริงจากรายการด้านล่างอัตโนมัติ
    const totalCount = allPersonnel.length;
    const executivesList = allPersonnel.filter(
      (p) => p.role_group === 'EXECUTIVE' || String(p.position).includes('ผู้อำนวยการ')
    );
    const teachersList = allPersonnel.filter(
      (p) => !executivesList.includes(p) && (p.role_group === 'TEACHER' || String(p.position).includes('ครู'))
    );
    const supportStaffList = allPersonnel.filter(
      (p) => !executivesList.includes(p) && !teachersList.includes(p)
    );

    const filterTabs = [
      { id: 'ALL', label: `บุคลากรทั้งหมด (${totalCount})` },
      { id: 'EXECUTIVE', label: `คณะผู้บริหาร (${executivesList.length})` },
      { id: 'TEACHER', label: `ครูผู้สอน (${teachersList.length})` },
      { id: 'STAFF', label: `บุคลากรสนับสนุน (${supportStaffList.length})` }
    ];

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <!-- ส่วนหัวหน้าแนะนำบุคลากร + ตัวเลขจำนวนบุคลากรรวมที่เช็คจากยอดด้านล่างอัตโนมัติ -->
        <div class="bg-white p-6 sm:p-8 rounded-3xl border border-amber-200/80 shadow-xs space-y-6">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-2">
                <i data-lucide="users" class="w-3.5 h-3.5"></i>
                PERSONNEL DIRECTORY • ทำเนียบบุคลากรสถานศึกษา
              </span>
              <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">
                แนะนำคณะผู้บริหาร ครู และบุคลากรทางการศึกษา
              </h2>
              <p class="text-xs sm:text-sm text-slate-500 mt-1">
                โรงเรียนบ้านบกหนองทันน้ำ สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุบลราชธานี เขต 2
              </p>
            </div>

            ${
              window.authService.isTeacherOrAbove()
                ? `
                <!-- ปุ่มเพิ่มบุคลากร / เปิดฟอร์มจัดการสำหรับ ครู / แอดมิน / ผู้พัฒนา -->
                <div class="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onclick="window.app.handleAdminPersonnelAddClick()"
                    class="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
                  >
                    <i data-lucide="user-plus" class="w-4 h-4"></i>
                    <span>+ เพิ่มบุคลากร / อัปเดตข้อมูล</span>
                  </button>
                </div>
                `
                : ''
            }
          </div>

          <!-- แผงสรุปจำนวนบุคลากรรวม (คำนวณสดจากยอดรายชื่อด้านล่าง) -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-2 border-t border-slate-100">
            <div class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-300/80 flex items-center justify-between min-w-0">
              <div class="min-w-0">
                <div class="text-[11px] sm:text-xs font-bold text-amber-900 truncate">จำนวนบุคลากรรวม</div>
                <div class="text-[10px] text-slate-500 mt-0.5 truncate">คำนวณจากรายชื่อปัจจุบัน</div>
              </div>
              <div class="text-right shrink-0 ml-1">
                <span class="text-xl sm:text-3xl font-extrabold text-slate-900">${totalCount}</span>
                <span class="text-[10px] sm:text-xs font-bold text-slate-600 ml-0.5">ท่าน</span>
              </div>
            </div>

            <div class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between min-w-0">
              <div class="min-w-0">
                <div class="text-[11px] sm:text-xs font-bold text-slate-700 truncate">ผู้บริหารสถานศึกษา</div>
                <div class="text-[10px] text-slate-400 mt-0.5 truncate">ผอ. และ รอง ผอ.</div>
              </div>
              <div class="text-right shrink-0 ml-1">
                <span class="text-xl sm:text-2xl font-extrabold text-amber-700">${executivesList.length}</span>
                <span class="text-[10px] sm:text-xs font-semibold text-slate-500 ml-0.5">ท่าน</span>
              </div>
            </div>

            <div class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between min-w-0">
              <div class="min-w-0">
                <div class="text-[11px] sm:text-xs font-bold text-slate-700 truncate">ครูผู้สอน</div>
                <div class="text-[10px] text-slate-400 mt-0.5 truncate">8 กลุ่มสาระฯ</div>
              </div>
              <div class="text-right shrink-0 ml-1">
                <span class="text-xl sm:text-2xl font-extrabold text-blue-700">${teachersList.length}</span>
                <span class="text-[10px] sm:text-xs font-semibold text-slate-500 ml-0.5">ท่าน</span>
              </div>
            </div>

            <div class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between min-w-0">
              <div class="min-w-0">
                <div class="text-[11px] sm:text-xs font-bold text-slate-700 truncate">บุคลากรสนับสนุน</div>
                <div class="text-[10px] text-slate-400 mt-0.5 truncate">ธุรการ / ช่าง</div>
              </div>
              <div class="text-right shrink-0 ml-1">
                <span class="text-xl sm:text-2xl font-extrabold text-emerald-700">${supportStaffList.length}</span>
                <span class="text-[10px] sm:text-xs font-semibold text-slate-500 ml-0.5">ท่าน</span>
              </div>
            </div>
          </div>
              <div>
                <div class="text-xs font-bold text-slate-700">ข้าราชการครู</div>
                <div class="text-[11px] text-slate-400 mt-0.5">สายงานการสอน</div>
              </div>
              <div class="text-right">
                <span class="text-2xl font-extrabold text-sky-700">${teachersList.length}</span>
                <span class="text-xs font-semibold text-slate-500 ml-1">ท่าน</span>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div class="text-xs font-bold text-slate-700">บุคลากรสนับสนุน</div>
                <div class="text-[11px] text-slate-400 mt-0.5">ธุรการ / พี่เลี้ยง / ช่าง</div>
              </div>
              <div class="text-right">
                <span class="text-2xl font-extrabold text-emerald-700">${supportStaffList.length}</span>
                <span class="text-xs font-semibold text-slate-500 ml-1">ท่าน</span>
              </div>
            </div>
          </div>

          <!-- ปุ่มกรองหมวดหมู่บุคลากร -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div class="flex flex-wrap gap-2">
              ${filterTabs
                .map(
                  (tab) => `
                  <button
                    onclick="window.publicViews.personnelFilter='${tab.id}'; window.app.render();"
                    class="px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      this.personnelFilter === tab.id
                        ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                    }"
                  >
                    ${tab.label}
                  </button>
                `
                )
                .join('')}
            </div>
            ${
              window.authService.isTeacherOrAbove()
                ? `
                <div class="text-xs text-slate-400">
                  💡 สามารถคลิกปุ่ม <strong>"แก้ไข/เปลี่ยนรูป"</strong> บนการ์ดแต่ละท่านเพื่ออัปโหลดภาพถ่ายและแก้ไขข้อมูลได้ทันที
                </div>
                `
                : ''
            }
          </div>
        </div>

        <!-- หมวดที่ 1: คณะผู้บริหารสถานศึกษา (จัดวางตรงกลาง สง่างาม สมดุล) -->
        ${
          (this.personnelFilter === 'ALL' || this.personnelFilter === 'EXECUTIVE') && executivesList.length > 0
            ? `
            <div class="space-y-6">
              <div class="flex items-center gap-3">
                <span class="w-2.5 h-7 rounded-full bg-amber-500"></span>
                <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">คณะผู้บริหารสถานศึกษา (${executivesList.length} ท่าน)</h3>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-xl mx-auto">
                ${executivesList.map((exec) => this.renderPersonnelPortraitCard(exec, true)).join('')}
              </div>
            </div>
            `
            : ''
        }

        <!-- หมวดที่ 2: คณะครูผู้สอน (จัดระเบียบ 5 คอลัมน์สมดุล สวยงาม ภาพเต็มตา) -->
        ${
          (this.personnelFilter === 'ALL' || this.personnelFilter === 'TEACHER') && teachersList.length > 0
            ? `
            <div class="space-y-6">
              <div class="flex items-center gap-3">
                <span class="w-2.5 h-7 rounded-full bg-red-600"></span>
                <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">ข้าราชการครูและบุคลากรทางการศึกษา (${teachersList.length} ท่าน)</h3>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                ${teachersList.map((t) => this.renderPersonnelPortraitCard(t, false)).join('')}
              </div>
            </div>
            `
            : ''
        }

        <!-- หมวดที่ 3: บุคลากรสนับสนุนการสอน -->
        ${
          (this.personnelFilter === 'ALL' || this.personnelFilter === 'STAFF') && supportStaffList.length > 0
            ? `
            <div class="space-y-6">
              <div class="flex items-center gap-3">
                <span class="w-2.5 h-7 rounded-full bg-emerald-600"></span>
                <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">บุคลากรสนับสนุนการสอนและเจ้าหน้าที่ (${supportStaffList.length} ท่าน)</h3>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
                ${supportStaffList.map((s) => this.renderPersonnelPortraitCard(s, false)).join('')}
              </div>
            </div>
            `
            : ''
        }
      </div>
    `;
  }

  /**
   * ===================== ผลสอบระดับชาติ: O-NET ป.6 / O-NET ม.3 / RT ป.1 / NT ป.3 =====================
   * เก็บในตาราง School_Statistics (metric_group = 'EXAM_<CODE>') 1 แถวต่อ 1 วิชา/ด้าน ต่อ 1 ปีการศึกษา
   * ไม่มีการสร้างตัวเลขสมมติ: หากยังไม่มีข้อมูลจริงจะแสดง "รอข้อมูล" จนกว่าครูหรือแอดมินจะบันทึก
   */
  getExamConfigs() {
    const onetSubjects = ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ'];
    return [
      {
        code: 'ONET_P6',
        short: 'O-NET ป.6',
        title: 'ผลสอบ O-NET ชั้นประถมศึกษาปีที่ 6 (สทศ.)',
        subtitle: 'คะแนนเฉลี่ยร้อยละ จำแนกรายวิชา',
        icon: '📘',
        logoImg: 'assets/img/niets_logo.png',
        grad: 'from-blue-500 via-sky-500 to-indigo-600',
        subjects: onetSubjects
      },
      {
        code: 'ONET_M3',
        short: 'O-NET ม.3',
        title: 'ผลสอบ O-NET ชั้นมัธยมศึกษาปีที่ 3 (สทศ.)',
        subtitle: 'คะแนนเฉลี่ยร้อยละ จำแนกรายวิชา',
        icon: '📗',
        logoImg: 'assets/img/niets_logo.png',
        grad: 'from-emerald-500 via-teal-500 to-green-600',
        subjects: onetSubjects
      },
      {
        code: 'RT_P1',
        short: 'RT ป.1',
        title: 'ผลประเมิน RT (การอ่านออกเสียงและอ่านรู้เรื่อง) ชั้น ป.1',
        subtitle: 'คะแนนเฉลี่ยร้อยละ จำแนกรายด้าน',
        icon: '📖',
        grad: 'from-amber-400 via-orange-500 to-red-500',
        subjects: ['การอ่านออกเสียง', 'การอ่านรู้เรื่อง', 'ภาพรวม']
      },
      {
        code: 'NT_P3',
        short: 'NT ป.3',
        title: 'ผลประเมิน NT (ความสามารถพื้นฐานของผู้เรียน) ชั้น ป.3',
        subtitle: 'คะแนนเฉลี่ยร้อยละ จำแนกรายด้าน',
        icon: '🧮',
        grad: 'from-fuchsia-500 via-purple-500 to-indigo-600',
        subjects: ['ด้านภาษา (Literacy)', 'ด้านคำนวณ (Numeracy)', 'ด้านเหตุผล (Reasoning)', 'ภาพรวม']
      }
    ];
  }

  /**
   * ปีที่แสดงในกราฟ = 3 ปีย้อนหลังรวมปีล่าสุด (ปีล่าสุดอย่างน้อย 2569 และเลื่อนอัตโนมัติเมื่อมีการบันทึกปีใหม่)
   */
  getExamYears() {
    const rows = window.dbAdapter.getTable('School_Statistics').filter((k) => String(k.metric_group || '').startsWith('EXAM_'));
    const maxData = rows.reduce((m, r) => Math.max(m, Number(r.academic_year) || 0), 0);
    const latest = Math.max(2569, maxData);
    return [latest - 2, latest - 1, latest];
  }

  getExamValue(code, year, subject) {
    const row = window.dbAdapter
      .getTable('School_Statistics')
      .find((k) => k.metric_group === `EXAM_${code}` && String(k.academic_year) === String(year) && k.metric_name === subject);
    if (!row) return null;
    const v = String(row.metric_value ?? '').trim();
    if (v === '' || v === '-' || isNaN(Number(v))) return null;
    return Number(v);
  }

  renderExamSection() {
    const years = this.getExamYears();
    const latestYear = years[2];
    const canEdit = window.authService.isTeacherOrAbove();

    const cards = this.getExamConfigs()
      .map((cfg) => {
        const hasAny = cfg.subjects.some((s) => years.some((y) => this.getExamValue(cfg.code, y, s) !== null));
        const latestHas = cfg.subjects.some((s) => this.getExamValue(cfg.code, latestYear, s) !== null);

        return `
        <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div class="flex items-center gap-3.5">
              ${
                cfg.logoImg
                  ? `<div class="w-24 sm:w-28 h-12 sm:h-14 rounded-2xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                      <img src="${cfg.logoImg}" alt="${cfg.short}" class="w-full h-full object-contain" />
                    </div>`
                  : `<div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${cfg.grad} text-white flex items-center justify-center shadow-md shrink-0 text-2xl">${cfg.icon}</div>`
              }
              <div>
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-red-700">${cfg.short} • ย้อนหลัง 3 ปี</span>
                <h4 class="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">${cfg.title}</h4>
                <p class="text-[11px] text-slate-500">${cfg.subtitle}</p>
              </div>
            </div>
            ${
              canEdit
                ? `<button onclick="window.app.handleExamEditClick('${cfg.code}')" class="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 text-amber-300 hover:bg-red-700 hover:text-white text-xs font-bold cursor-pointer transition">✏️ <span>อัปเดตข้อมูล</span></button>`
                : ''
            }
          </div>

          ${
            latestHas
              ? ''
              : `<div class="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] sm:text-xs font-bold text-amber-900">⏳ ปีการศึกษา ${latestYear} รออัปเดตผลล่าสุด (กราฟจะเพิ่มข้อมูลให้อัตโนมัติเมื่อมีการบันทึก)</div>`
          }

          <div class="relative h-60 rounded-2xl bg-slate-50/70 border border-slate-200/80 p-3">
            <canvas id="exam-chart-${cfg.code}"></canvas>
            ${
              hasAny
                ? ''
                : `<div class="absolute inset-0 flex items-center justify-center pointer-events-none"><span class="px-4 py-2 rounded-xl bg-white/90 border border-slate-200 text-xs font-bold text-slate-500 shadow-2xs">ยังไม่มีข้อมูล • รอครูหรือแอดมินอัปเดต</span></div>`
            }
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs border-collapse">
              <thead>
                <tr class="bg-slate-900 text-white">
                  <th class="py-2 px-3 text-left rounded-tl-lg">วิชา / ด้าน</th>
                  ${years
                    .map(
                      (y, i) =>
                        `<th class="py-2 px-3 text-center ${i === 2 ? 'rounded-tr-lg bg-red-700' : ''}">${y}${i === 2 && !latestHas ? ' <span class="text-[9px] font-semibold text-amber-300">(รออัปเดต)</span>' : ''}</th>`
                    )
                    .join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${cfg.subjects
                  .map(
                    (s) => `
                  <tr>
                    <td class="py-2 px-3 font-bold text-slate-800">${s}</td>
                    ${years
                      .map((y) => {
                        const v = this.getExamValue(cfg.code, y, s);
                        return `<td class="py-2 px-3 text-center ${v === null ? 'text-slate-400' : 'font-extrabold text-slate-900'}">${v === null ? '-' : v.toFixed(2)}</td>`;
                      })
                      .join('')}
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>`;
      })
      .join('');

    return `
      <div class="space-y-5">
        <div class="flex items-center gap-4">
          <div class="w-24 sm:w-32 h-14 sm:h-16 rounded-2xl bg-white border border-slate-200/90 p-1.5 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            <img src="assets/img/niets_logo.png" alt="สทศ. NIETS" class="w-full h-full object-contain" />
          </div>
          <div>
            <span class="text-[11px] font-extrabold uppercase tracking-wider text-red-700">NATIONAL ASSESSMENT RESULTS • O-NET (สทศ.) / RT / NT</span>
            <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">ผลสอบระดับชาติ เปรียบเทียบ 3 ปีการศึกษา (${years[0]} – ${years[2]})</h3>
            <p class="text-xs text-slate-500 mt-0.5">สถาบันทดสอบทางการศึกษาแห่งชาติ (สทศ. NIETS) และ สพฐ. • แสดงเฉพาะ 3 ปีล่าสุดรวมปีปัจจุบัน</p>
          </div>
        </div>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">${cards}</div>
      </div>
    `;
  }

  mountExamCharts() {
    if (typeof Chart === 'undefined') return;
    this.examCharts = this.examCharts || {};
    const years = this.getExamYears();
    const colors = [
      { bg: '#94A3B8', border: '#64748B' },
      { bg: '#F59E0B', border: '#D97706' },
      { bg: '#DC2626', border: '#991B1B' }
    ];

    this.getExamConfigs().forEach((cfg) => {
      const canvas = document.getElementById(`exam-chart-${cfg.code}`);
      if (!canvas) return;
      try {
        const existing = Chart.getChart(canvas);
        if (existing) existing.destroy();
      } catch (e) {}
      if (this.examCharts[cfg.code] && typeof this.examCharts[cfg.code].destroy === 'function') {
        try {
          this.examCharts[cfg.code].destroy();
        } catch (e) {}
      }
      this.examCharts[cfg.code] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: cfg.subjects,
          datasets: years.map((y, i) => ({
            label: `ปี ${y}`,
            data: cfg.subjects.map((s) => this.getExamValue(cfg.code, y, s)),
            backgroundColor: colors[i].bg,
            borderColor: colors[i].border,
            borderWidth: 1.5,
            borderRadius: 8,
            maxBarThickness: 36
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: (ctx) => (ctx.raw === null ? ` ${ctx.dataset.label}: รอข้อมูล` : ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}%`)
              }
            }
          },
          scales: { y: { beginAtZero: true, suggestedMax: 100, ticks: { callback: (v) => `${v}%` } } }
        }
      });
    });
  }

  /**
   * 4. หน้าวิชาการและหลักสูตรสถานศึกษา (ACADEMIC & CURRICULUM)
   */
  renderAcademic() {
    const curriculums = window.dbAdapter.getTable('Curriculum');
    const studentRows = window.dbAdapter.getTable('Students_Statistics');
    const totalStudents = studentRows.reduce((s, r) => s + Number(r.total_count || 0), 0);

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
          <span class="text-xs font-bold text-amber-700 uppercase">CURRICULUM & ACADEMIC INFORMATION</span>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">หลักสูตรสถานศึกษาและข้อมูลทางวิชาการ</h2>
          <p class="text-xs sm:text-sm text-slate-600 mt-1">
            การจัดการศึกษาโรงเรียนขยายโอกาสทางการศึกษา ตั้งแต่ระดับปฐมวัย (อนุบาล 2–3) ระดับประถมศึกษา (ป.1–ป.6) ถึงระดับมัธยมศึกษาตอนต้น (ม.1–ม.3)
          </p>
        </div>

        <!-- ผลสอบระดับชาติ O-NET ป.6 / ม.3 • RT ป.1 • NT ป.3 (แยกส่วนกัน เปรียบเทียบ 3 ปี) -->
        ${this.renderExamSection()}

        <!-- โครงสร้างหลักสูตร 3 ระดับ -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          ${curriculums
            .map(
              (cur) => `
              <div class="bg-white rounded-3xl p-6 border border-amber-200/80 shadow-2xs flex flex-col justify-between">
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                      ${window.authService.sanitizeHTML(cur.level_group)}
                    </span>
                    <span class="text-xs font-mono text-slate-400">${window.authService.sanitizeHTML(cur.subject_code)}</span>
                  </div>
                  <h3 class="text-base font-bold text-slate-900">${window.authService.sanitizeHTML(cur.title)}</h3>
                  <p class="text-xs text-slate-600 leading-relaxed">${window.authService.sanitizeHTML(cur.description)}</p>
                </div>
                <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span class="text-slate-400">เวลาเรียน:</span>
                    <strong class="text-slate-800 ml-1">${window.authService.sanitizeHTML(cur.hours_per_year)}</strong>
                  </div>
                  <span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">${window.authService.sanitizeHTML(cur.credits)}</span>
                </div>
              </div>
            `
            )
            .join('')}
        </div>

        <!-- ตารางข้อมูลนักเรียนและห้องเรียนแยกตามระดับชั้น -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h3 class="text-lg font-bold text-slate-900">ตารางข้อมูลจำนวนนักเรียนและห้องเรียนแยกตามระดับชั้น</h3>
              <p class="text-xs text-slate-500">ข้อมูลปัจจุบันจากตาราง Students_Statistics ในฐานข้อมูล Google Sheets</p>
            </div>
            <span class="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              รวมนักเรียนทั้งหมด ${totalStudents.toLocaleString()} คน
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr class="bg-slate-900 text-white">
                  <th class="py-3 px-4 rounded-tl-xl">ระดับการศึกษา</th>
                  <th class="py-3 px-4">ชั้นเรียน</th>
                  <th class="py-3 px-4 text-center">จำนวนห้องเรียน</th>
                  <th class="py-3 px-4 text-center">นักเรียนชาย (คน)</th>
                  <th class="py-3 px-4 text-center">นักเรียนหญิง (คน)</th>
                  <th class="py-3 px-4 text-center rounded-tr-xl">รวมทั้งหมด (คน)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${studentRows
                  .map(
                    (row) => `
                    <tr class="hover:bg-amber-50/40 transition">
                      <td class="py-3 px-4 font-medium text-slate-600">${window.authService.sanitizeHTML(row.level_group)}</td>
                      <td class="py-3 px-4 font-bold text-slate-900">${window.authService.sanitizeHTML(row.grade_level)}</td>
                      <td class="py-3 px-4 text-center">${Number(row.classrooms || 1)}</td>
                      <td class="py-3 px-4 text-center text-sky-700 font-semibold">${Number(row.male_count || 0)}</td>
                      <td class="py-3 px-4 text-center text-rose-700 font-semibold">${Number(row.female_count || 0)}</td>
                      <td class="py-3 px-4 text-center font-extrabold text-slate-900 bg-amber-50/50">${Number(row.total_count || 0)}</td>
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
   * 5. หน้าข่าวสาร ประกาศ และปฏิทินกิจกรรม (NEWS, FACEBOOK PR, STUDENT SLIDER & CALENDAR)
   */
  renderNewsPage() {
    const profile = (window.dbAdapter.getTable('School_Profile')[0]) || {};
    const allNews = window.dbAdapter.getTable('News').filter((n) => n.publish_status !== 'DRAFT');
    const categories = ['ALL', 'ข่าวประชาสัมพันธ์', 'ข่าวกิจกรรม', 'ข่าวประกาศ', 'ข่าวรางวัลและผลงาน'];

    const filteredNews = allNews.filter((n) => {
      const matchCat = this.newsCategoryFilter === 'ALL' || n.category === this.newsCategoryFilter;
      const q = this.newsSearchQuery.trim().toLowerCase();
      const matchQuery = !q || String(n.title).toLowerCase().includes(q) || String(n.summary).toLowerCase().includes(q);
      return matchCat && matchQuery;
    });

    const activities = window.dbAdapter.getTable('Activities');
    const fbSchoolUrl = profile.facebook_url || 'https://www.facebook.com/profile.php?id=100014526581847';

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <!-- บอร์ดประชาสัมพันธ์เคลื่อนไหว & สไลด์ข่าวสารโอกาสสำคัญของนักเรียน -->
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-amber-700">LIVE BULLETIN BOARD & SLIDESHOW</span>
              <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">บอร์ดประชาสัมพันธ์เคลื่อนไหว & สไลด์โอกาสสำคัญนักเรียน</h2>
            </div>
            ${
              window.authService.isTeacherOrAbove()
                ? `
                <div class="flex flex-wrap gap-2">
                  <button
                    onclick="window.app.handleAdminSlideAddClick()"
                    class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold shadow-2xs transition cursor-pointer"
                  >
                    <i data-lucide="image-plus" class="w-4 h-4"></i>
                    <span>+ อัปโหลดไฟล์ภาพขึ้นสไลด์</span>
                  </button>
                  <button
                    onclick="window.app.handleAdminFacebookNewsClick()"
                    class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-xs font-bold shadow-2xs transition cursor-pointer"
                  >
                    <img src="assets/img/facebook_logo.png" alt="Facebook" class="w-4 h-4 object-contain shrink-0 inline-block" />
                    <span>+ ฝังข่าวจากลิงก์ Facebook</span>
                  </button>
                </div>
                `
                : ''
            }
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div id="pro-student-slider-box" class="lg:col-span-7">
              ${this.renderStudentSliderInner()}
            </div>
            <div id="live-bulletin-board-box" class="lg:col-span-5">
              ${this.renderLiveBulletinBoardInner()}
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span class="text-xs font-bold text-amber-700 uppercase">FACEBOOK & SCHOOL PR CENTER</span>
              <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900">ศูนย์ข่าวประชาสัมพันธ์ (เชื่อมโยง Facebook โรงเรียนบ้านบกหนองทันน้ำ)</h3>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <a
                href="${window.authService.sanitizeHTML(fbSchoolUrl)}"
                target="_blank"
                rel="noopener"
                class="px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <img src="assets/img/facebook_logo.png" alt="Facebook" class="w-3.5 h-3.5 object-contain shrink-0 inline-block" /> เพจ Facebook โรงเรียน
              </a>
              <div class="relative w-full sm:w-64">
                <input
                  type="text"
                  value="${window.authService.sanitizeHTML(this.newsSearchQuery)}"
                  oninput="window.publicViews.newsSearchQuery=this.value; window.app.render();"
                  placeholder="ค้นหาหัวข้อข่าว..."
                  class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5"></i>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            ${categories
              .map(
                (cat) => `
                <button
                  onclick="window.publicViews.newsCategoryFilter='${cat}'; window.app.render();"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    this.newsCategoryFilter === cat
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                  }"
                >
                  ${cat === 'ALL' ? 'ทุกหมวดหมู่' : cat}
                </button>
              `
              )
              .join('')}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          ${
            filteredNews.length > 0
              ? filteredNews.map((n) => this.renderNewsCard(n)).join('')
              : `<div class="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-sm text-slate-500">ไม่พบรายการข่าวที่ค้นหา</div>`
          }
        </div>

        <!-- ปฏิทินกิจกรรมโรงเรียน -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <h3 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <i data-lucide="calendar" class="w-5 h-5 text-amber-600"></i>
            ตารางปฏิทินกิจกรรมโรงเรียนบ้านบกหนองทันน้ำ
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${activities
              .map(
                (act) => `
                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-4">
                  <div class="flex items-start gap-4">
                    <div class="px-3.5 py-2 rounded-xl bg-white border border-amber-200 text-center shrink-0">
                      <div class="text-[10px] font-bold text-amber-700">เริ่มวันที่</div>
                      <div class="text-xs font-extrabold text-slate-900">${window.authService.sanitizeHTML(act.start_date)}</div>
                    </div>
                    <div>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">${window.authService.sanitizeHTML(act.category)}</span>
                      <h4 class="text-sm font-bold text-slate-900 mt-1">${window.authService.sanitizeHTML(act.title)}</h4>
                      <p class="text-xs text-slate-600 mt-1">${window.authService.sanitizeHTML(act.description)}</p>
                      <div class="text-[11px] text-slate-400 mt-1.5">📍 สถานที่: ${window.authService.sanitizeHTML(act.location)}</div>
                    </div>
                  </div>
                  <a
                    href="${window.googleWorkspaceClient ? window.googleWorkspaceClient.createAddToGoogleCalendarUrl(act) : 'https://calendar.google.com'}"
                    target="_blank"
                    rel="noopener"
                    class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 text-[11px] font-bold transition"
                  >
                    <i data-lucide="calendar-plus" class="w-3.5 h-3.5"></i>
                    <span>+ Google Calendar</span>
                  </a>
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
   * 6. หน้าคลังภาพกิจกรรม (GALLERY CONNECTED TO GOOGLE DRIVE)
   */
  renderGalleryPage() {
    const gallery = window.dbAdapter.getTable('Gallery');
    const categories = ['ALL', ...new Set(gallery.map((g) => g.category).filter(Boolean))];
    const filtered = this.galleryCategoryFilter === 'ALL'
      ? gallery
      : gallery.filter((g) => g.category === this.galleryCategoryFilter);

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div class="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span class="text-xs font-bold text-amber-700 uppercase">GOOGLE DRIVE GALLERY</span>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">คลังภาพกิจกรรมโรงเรียนบ้านบกหนองทันน้ำ</h2>
            <p class="text-xs text-slate-500 mt-1">จัดเก็บและดึงภาพถ่ายกิจกรรมจากระบบคลังไฟล์ Google Drive แยกตามหมวดหมู่</p>
          </div>
          <div class="flex flex-wrap gap-2">
            ${categories
              .map(
                (cat) => `
                <button
                  onclick="window.publicViews.galleryCategoryFilter='${cat}'; window.app.render();"
                  class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    this.galleryCategoryFilter === cat
                      ? 'bg-slate-900 text-amber-300 border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                  }"
                >
                  ${cat === 'ALL' ? 'ทั้งหมด (' + gallery.length + ')' : window.authService.sanitizeHTML(cat)}
                </button>
              `
              )
              .join('')}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          ${filtered
            .map(
              (item) => `
              <div
                onclick="window.app.openImageLightbox('${window.driveService.resolveDriveImageUrl(item.image_url)}', '${window.authService.sanitizeHTML(item.title)}', '${window.authService.sanitizeHTML(item.caption)}')"
                class="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-amber-300 transition cursor-pointer"
              >
                <div class="aspect-16/10 bg-slate-100 overflow-hidden relative">
                  <img
                    src="${window.driveService.resolveDriveImageUrl(item.image_url)}"
                    alt="${window.authService.sanitizeHTML(item.title)}"
                    class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    onerror="this.src='assets/img/logo.png'"
                  />
                  <span class="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/80 text-amber-300 text-[10px] font-semibold">
                    ${window.authService.sanitizeHTML(item.category)}
                  </span>
                </div>
                <div class="p-5">
                  <h3 class="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">${window.authService.sanitizeHTML(item.title)}</h3>
                  <p class="text-xs text-slate-500 mt-1">${window.authService.sanitizeHTML(item.caption)}</p>
                  <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>อัปโหลดโดย: ${window.authService.sanitizeHTML(item.uploaded_by || '-')}</span>
                    <span>${window.authService.sanitizeHTML(item.created_at || '')}</span>
                  </div>
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
   * 7. หน้าเอกสารเผยแพร่และดาวน์โหลด (PUBLIC DOCUMENTS & SAR)
   */
  renderDocumentsPage() {
    const allDocs = window.dbAdapter.getTable('Documents').filter(
      (d) => d.access_level === 'PUBLIC' || window.authService.isTeacherOrAbove()
    );
    const categories = ['ALL', ...new Set(allDocs.map((d) => d.category).filter(Boolean))];
    const filtered = this.docCategoryFilter === 'ALL'
      ? allDocs
      : allDocs.filter((d) => d.category === this.docCategoryFilter);

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div class="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span class="text-xs font-bold text-amber-700 uppercase">GOOGLE DRIVE DOCUMENT REPOSITORY</span>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">ศูนย์เอกสารเผยแพร่ รายงานประจำปี (SAR) และแผนปฏิบัติการ</h2>
            <p class="text-xs text-slate-500 mt-1">บริการดาวน์โหลดเอกสารราชการ รายงานการประเมินตนเองของสถานศึกษา และคู่มือผู้ปกครอง</p>
          </div>
          <div class="flex flex-wrap gap-2">
            ${categories
              .map(
                (cat) => `
                <button
                  onclick="window.publicViews.docCategoryFilter='${cat}'; window.app.render();"
                  class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    this.docCategoryFilter === cat
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                  }"
                >
                  ${cat === 'ALL' ? 'ทั้งหมด' : window.authService.sanitizeHTML(cat)}
                </button>
              `
              )
              .join('')}
          </div>
        </div>

        <div class="bg-white rounded-3xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100">
          ${filtered
            .map(
              (doc) => `
              <div class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-amber-50/30 transition">
                <div class="flex items-start gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex flex-col items-center justify-center font-extrabold text-xs shrink-0">
                    <i data-lucide="file-text" class="w-4 h-4 mb-0.5"></i>
                    <span>${window.authService.sanitizeHTML(doc.file_type || 'PDF')}</span>
                  </div>
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        ${window.authService.sanitizeHTML(doc.category)}
                      </span>
                      <span class="text-[11px] text-amber-700 font-semibold">ปีการศึกษา ${window.authService.sanitizeHTML(doc.academic_year)}</span>
                      ${
                        doc.access_level === 'TEACHER'
                          ? `<span class="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">เฉพาะครูและบุคลากร</span>`
                          : ''
                      }
                    </div>
                    <h3 class="text-sm sm:text-base font-bold text-slate-900 mt-1">${window.authService.sanitizeHTML(doc.title)}</h3>
                    <div class="text-xs text-slate-500 mt-1">
                      ขนาดไฟล์: ${window.authService.sanitizeHTML(doc.file_size || '-')} • อัปโหลดโดย: ${window.authService.sanitizeHTML(doc.uploaded_by)} • เผยแพร่เมื่อ: ${window.authService.sanitizeHTML(doc.published_date)} • ดาวน์โหลดแล้ว <strong>${doc.download_count || 0}</strong> ครั้ง
                    </div>
                  </div>
                </div>
                <button
                  onclick="window.app.downloadDocumentById('${doc.doc_id}')"
                  class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 text-xs font-semibold transition shrink-0 cursor-pointer"
                >
                  <i data-lucide="download" class="w-4 h-4"></i>
                  <span>เปิดดู / ดาวน์โหลด PDF</span>
                </button>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  /**
   * 8. หน้าติดต่อโรงเรียนและแผนที่ (CONTACT & GOOGLE MAPS)
   */
  renderContactPage() {
    const profile = (window.dbAdapter.getTable('School_Profile')[0]) || {};
    const mapsEnabled = window.dbAdapter.getSetting('enable_google_maps', 'true') === 'true';
    const formsEnabled = window.dbAdapter.getSetting('enable_google_forms', 'true') === 'true';
    const mapQuery = `${profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ'} ตำบลหนองทันน้ำ อำเภอกุดข้าวปุ้น จังหวัดอุบลราชธานี 34270`;

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
          <span class="text-xs font-bold text-amber-700 uppercase">CONTACT & LOCATION</span>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">ติดต่อโรงเรียนบ้านบกหนองทันน้ำ (${window.authService.sanitizeHTML(profile.school_name_en || 'BOKNONGTUNNAM')})</h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">${window.authService.sanitizeHTML(profile.affiliation)} • รหัสโรงเรียน 10 หลัก: ${window.authService.sanitizeHTML(profile.school_code_10 || '1034710083')}</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <!-- ข้อมูลติดต่อและแผนที่ (7 คอลัมน์) -->
          <div class="lg:col-span-7 space-y-6">
            <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <h3 class="text-lg font-bold text-slate-900">ข้อมูลสถานที่ตั้งและช่องทางติดต่อราชการ</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm text-slate-700">
                <div class="sm:col-span-2 flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <i data-lucide="map-pin" class="w-4 h-4"></i>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-400">ที่อยู่สถานศึกษา</div>
                    <div class="font-bold text-slate-900">${window.authService.sanitizeHTML(profile.address || 'หมู่ที่ 2 บ้านบก ตำบลหนองทันน้ำ อำเภอกุดข้าวปุ้น จังหวัดอุบลราชธานี 34270')}</div>
                  </div>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <i data-lucide="phone" class="w-4 h-4"></i>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-400">โทรศัพท์ / โทรสาร</div>
                    <div class="font-bold text-slate-900">${window.authService.sanitizeHTML(profile.phone || '0892867399')} (โทรสาร: ${window.authService.sanitizeHTML(profile.fax || '-')})</div>
                  </div>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <i data-lucide="mail" class="w-4 h-4"></i>
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-slate-400">อีเมล (Email)</div>
                    <a href="mailto:${window.authService.sanitizeHTML(profile.email || 'banboknongtannham@gmail.com')}" class="font-bold text-amber-700 hover:underline break-all">${window.authService.sanitizeHTML(profile.email || 'banboknongtannham@gmail.com')}</a>
                  </div>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <img src="assets/img/facebook_logo.png" alt="Facebook" class="w-4 h-4 object-contain shrink-0 inline-block" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-slate-400">Facebook โรงเรียน</div>
                    <a href="${window.authService.sanitizeHTML(profile.facebook_url || 'https://www.facebook.com/profile.php?id=100014526581847')}" target="_blank" rel="noopener" class="font-bold text-blue-600 hover:underline text-xs break-all">เปิดเพจ Facebook โรงเรียน</a>
                  </div>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <i data-lucide="navigation" class="w-4 h-4"></i>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-400">อปท. / ระยะทาง</div>
                    <div class="font-bold text-slate-900 text-xs">อปท. ${window.authService.sanitizeHTML(profile.local_gov || 'หนองทันน้ำ')} • ถึงอำเภอ ${window.authService.sanitizeHTML(profile.distance_to_district || '10 กม.')} • ถึง สพท. ${window.authService.sanitizeHTML(profile.distance_to_area_office || '30 กม.')}</div>
                  </div>
                </div>
              </div>
            </div>

            ${
              mapsEnabled
                ? `
                <div class="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs">
                  <div class="flex items-center justify-between px-2 pb-3">
                    <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <i data-lucide="map" class="w-4 h-4 text-amber-600"></i> แผนที่ตั้งโรงเรียนบ้านบกหนองทันน้ำ ต.หนองทันน้ำ อ.กุดข้าวปุ้น (Google Maps)
                    </span>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}"
                      target="_blank"
                      rel="noopener"
                      class="text-xs font-semibold text-amber-700 hover:underline"
                    >
                      เปิดในแอป Google Maps
                    </a>
                  </div>
                  <div class="rounded-2xl overflow-hidden h-72 bg-slate-100 border border-slate-200">
                    <iframe
                      title="แผนที่โรงเรียนบ้านบกหนองทันน้ำ"
                      width="100%"
                      height="100%"
                      style="border:0"
                      loading="lazy"
                      allowfullscreen
                      src="https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed"
                    ></iframe>
                  </div>
                </div>
                `
                : ''
            }
          </div>

          <!-- แบบฟอร์มติดต่อสอบถามออนไลน์ (5 คอลัมน์) -->
          <div class="lg:col-span-5">
            ${
              formsEnabled
                ? `
                <div class="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-xs">
                  <span class="text-xs font-bold text-amber-700 uppercase">ONLINE INQUIRY FORM</span>
                  <h3 class="text-lg font-bold text-slate-900 mt-1">ส่งข้อความติดต่อ / สอบถามข้อมูล</h3>
                  <p class="text-xs text-slate-500 mt-1 mb-5">ข้อมูลจะถูกบันทึกเข้าสู่ระบบสารบรรณและแจ้งเตือนผู้ดูแลระบบของโรงเรียน</p>

                  <form onsubmit="window.app.submitContactForm(event)" class="space-y-4">
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">ชื่อ - นามสกุล ผู้ติดต่อ *</label>
                      <input type="text" name="sender_name" required placeholder="ระบุชื่อ-นามสกุลของคุณ" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ หรือ อีเมลติดต่อกลับ *</label>
                      <input type="text" name="sender_contact" required placeholder="08x-xxx-xxxx หรืออีเมล" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">เรื่องที่ต้องการติดต่อ *</label>
                      <select name="subject_type" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500">
                        <option value="สอบถามการรับสมัครนักเรียน">สอบถามการรับสมัครนักเรียน (อ.2 - ม.3)</option>
                        <option value="ติดต่อราชการ/งานธุรการ">ติดต่อราชการ / ขอเอกสารทางการศึกษา (ปพ.1 / ปพ.7)</option>
                        <option value="ข้อเสนอแนะผู้ปกครองและชุมชน">ข้อเสนอแนะจากผู้ปกครองและชุมชน</option>
                        <option value="อื่นๆ">เรื่องอื่น ๆ</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">รายละเอียดข้อความ *</label>
                      <textarea name="message" rows="4" required placeholder="พิมพ์รายละเอียดที่ต้องการติดต่อ..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500"></textarea>
                    </div>
                    <button type="submit" class="w-full py-3 rounded-xl bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 font-bold text-sm transition cursor-pointer">
                      ส่งข้อความถึงโรงเรียนบ้านบกหนองทันน้ำ
                    </button>
                  </form>
                </div>
                `
                : ''
            }
          </div>
        </div>
      </div>
    `;
  }
}

window.publicViews = new PublicViews();
