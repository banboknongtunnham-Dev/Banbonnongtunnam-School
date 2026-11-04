/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - INTERACTIVE SCHOOL DASHBOARD (Phase 9)
 * แสดงผลข้อมูลสถิติและกราฟแบบ Real-time จากฐานข้อมูล Google Sheets ทั้ง 17 ตาราง
 * รองรับ Bar Chart, Doughnut Chart, Line Chart, Pie Chart และตัวกรองปีการศึกษา
 * ============================================================================
 */

class DashboardView {
  constructor() {
    this.selectedYear = '2569';
    this.selectedSemester = 'ALL';
    this.selectedLevelGroup = 'ALL';
    this.chartInstances = {};
  }

  render() {
    const studentAll = window.dbAdapter.getTable('Students_Statistics');
    const personnel = window.dbAdapter.getTable('Personnel');
    const news = window.dbAdapter.getTable('News');
    const activities = window.dbAdapter.getTable('Activities');
    const documents = window.dbAdapter.getTable('Documents');
    const kpiStats = window.dbAdapter.getTable('School_Statistics');
    const academicAwards = window.dbAdapter.getTable('Academic_Data');

    const availableYears = [...new Set(studentAll.map((s) => String(s.academic_year || '2569')))];
    if (!availableYears.includes(this.selectedYear) && availableYears.length > 0) {
      this.selectedYear = availableYears[0];
    }

    const filteredStudents = studentAll.filter((s) => {
      const matchYear = String(s.academic_year || '2569') === String(this.selectedYear);
      const matchSem = this.selectedSemester === 'ALL' || String(s.semester) === String(this.selectedSemester);
      const matchLevel = this.selectedLevelGroup === 'ALL' || s.level_group === this.selectedLevelGroup;
      return matchYear && matchSem && matchLevel;
    });

    const totalStudents = filteredStudents.reduce((sum, r) => sum + Number(r.total_count || 0), 0);
    const totalMale = filteredStudents.reduce((sum, r) => sum + Number(r.male_count || 0), 0);
    const totalFemale = filteredStudents.reduce((sum, r) => sum + Number(r.female_count || 0), 0);
    const totalRooms = filteredStudents.reduce((sum, r) => sum + Number(r.classrooms || 1), 0);

    const kpiScoreRows = kpiStats.filter((k) => k.metric_group === 'ACADEMIC_SCORE');

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <!-- Header & Filters -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              REAL-TIME SCHOOL ANALYTICS DASHBOARD
            </div>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">ระบบสารสนเทศและสถิติภาพรวมโรงเรียนบ้านบกหนองทันน้ำ</h2>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              ประมวลผลข้อมูลโดยตรงจากตารางฐานข้อมูล Google Sheets (Students_Statistics, Personnel, School_Statistics, Activities, Documents)
            </p>
          </div>

          <!-- Filter Controls -->
          <div class="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">ปีการศึกษา</label>
              <select
                onchange="window.dashboardView.selectedYear=this.value; window.app.render();"
                class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
              >
                ${availableYears.map((y) => `<option value="${y}" ${this.selectedYear === y ? 'selected' : ''}>ปีการศึกษา ${y}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">ภาคเรียน</label>
              <select
                onchange="window.dashboardView.selectedSemester=this.value; window.app.render();"
                class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL" ${this.selectedSemester === 'ALL' ? 'selected' : ''}>ทุกภาคเรียน</option>
                <option value="1" ${this.selectedSemester === '1' ? 'selected' : ''}>ภาคเรียนที่ 1</option>
                <option value="2" ${this.selectedSemester === '2' ? 'selected' : ''}>ภาคเรียนที่ 2</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">ระดับการศึกษา</label>
              <select
                onchange="window.dashboardView.selectedLevelGroup=this.value; window.app.render();"
                class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL" ${this.selectedLevelGroup === 'ALL' ? 'selected' : ''}>ทุกระดับชั้น (อ.2 - ม.3)</option>
                <option value="ระดับปฐมวัย" ${this.selectedLevelGroup === 'ระดับปฐมวัย' ? 'selected' : ''}>ระดับปฐมวัย (อ.2 - อ.3)</option>
                <option value="ระดับประถมศึกษา" ${this.selectedLevelGroup === 'ระดับประถมศึกษา' ? 'selected' : ''}>ระดับประถมศึกษา (ป.1 - ป.6)</option>
                <option value="ระดับมัธยมศึกษาตอนต้น" ${this.selectedLevelGroup === 'ระดับมัธยมศึกษาตอนต้น' ? 'selected' : ''}>ระดับมัธยมศึกษาตอนต้น (ม.1 - ม.3)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 5 Summary Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div class="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-2xs">
            <div class="text-xs font-bold text-slate-400">จำนวนนักเรียนทั้งหมด</div>
            <div class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">${totalStudents.toLocaleString()} <span class="text-xs font-normal text-slate-500">คน</span></div>
            <div class="text-[11px] text-amber-700 font-semibold mt-1.5">ชาย ${totalMale} • หญิง ${totalFemale}</div>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
            <div class="text-xs font-bold text-slate-400">ครูและบุคลากร</div>
            <div class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">${personnel.length} <span class="text-xs font-normal text-slate-500">ท่าน</span></div>
            <div class="text-[11px] text-emerald-700 font-semibold mt-1.5">อัตราส่วนครู:นักเรียน 1:${Math.max(1, Math.round(totalStudents / Math.max(1, personnel.length)))}</div>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
            <div class="text-xs font-bold text-slate-400">จำนวนห้องเรียน</div>
            <div class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">${totalRooms} <span class="text-xs font-normal text-slate-500">ห้อง</span></div>
            <div class="text-[11px] text-slate-500 mt-1.5">เฉลี่ย ${Math.round(totalStudents / Math.max(1, totalRooms))} คน/ห้อง</div>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
            <div class="text-xs font-bold text-slate-400">ข่าวและกิจกรรม</div>
            <div class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">${news.length + activities.length} <span class="text-xs font-normal text-slate-500">รายการ</span></div>
            <div class="text-[11px] text-sky-700 font-semibold mt-1.5">ข่าว ${news.length} • กิจกรรม ${activities.length}</div>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
            <div class="text-xs font-bold text-slate-400">เอกสาร & รางวัล</div>
            <div class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">${documents.length + academicAwards.length} <span class="text-xs font-normal text-slate-500">รายการ</span></div>
            <div class="text-[11px] text-amber-700 font-semibold mt-1.5">เอกสาร ${documents.length} • ข้อมูลคุณภาพ ${academicAwards.length}</div>
          </div>
        </div>

        <!-- Charts Row 1: Bar Chart (Students by Grade) & Doughnut Chart (Personnel Ratio) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
            <div class="flex items-center justify-between mb-4">
              <div>
                <span class="text-[11px] font-bold text-amber-700 uppercase">BAR CHART • STUDENTS BY GRADE</span>
                <h3 class="text-base sm:text-lg font-bold text-slate-900">จำนวนนักเรียนแยกตามระดับชั้นและเพศ (อ.2 – ม.3)</h3>
              </div>
              <span class="text-xs font-semibold text-slate-500">ปีการศึกษา ${this.selectedYear}</span>
            </div>
            <div class="h-72 sm:h-80 relative">
              <canvas id="chart-students-bar"></canvas>
            </div>
          </div>

          <div class="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
            <div class="mb-4">
              <span class="text-[11px] font-bold text-amber-700 uppercase">DOUGHNUT CHART • PERSONNEL</span>
              <h3 class="text-base sm:text-lg font-bold text-slate-900">สัดส่วนบุคลากรตามกลุ่มงาน</h3>
            </div>
            <div class="h-64 relative flex items-center justify-center">
              <canvas id="chart-personnel-doughnut"></canvas>
            </div>
          </div>
        </div>

        <!-- Charts Row 2: Line Chart (3-Year Student Trend) & Pie Chart (Digital Content & Activities) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <span class="text-[11px] font-bold text-amber-700 uppercase">3-YEAR STUDENT GRAPH • ย้อนหลัง 3 ปีการศึกษา</span>
                <h3 class="text-base sm:text-lg font-bold text-slate-900">กราฟจำนวนนักเรียน 3 ปีย้อนหลัง (ปีการศึกษา 2567 – 2569)</h3>
                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                    <span class="w-2 h-2 rounded-full bg-blue-600"></span> ปี 2567
                  </span>
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                    <span class="w-2 h-2 rounded-full bg-emerald-600"></span> ปี 2568
                  </span>
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                    <span class="w-2 h-2 rounded-full bg-red-600"></span> ปี 2569
                  </span>
                </div>
              </div>
              ${
                window.authService.isTeacherOrAbove()
                  ? `
                  <button
                    onclick="window.app.handleAdminThreeYearStudentClick()"
                    class="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-400 text-amber-900 hover:text-slate-950 border border-amber-200 text-xs font-bold transition cursor-pointer"
                  >
                    แก้ไขข้อมูล 3 ปี
                  </button>
                  `
                  : ''
              }
            </div>
            <div class="h-64 sm:h-72 relative">
              <canvas id="chart-trend-line"></canvas>
            </div>
          </div>

          <div class="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
            <div class="mb-4">
              <span class="text-[11px] font-bold text-amber-700 uppercase">PIE CHART • DIGITAL CONTENT & ACTIVITIES</span>
              <h3 class="text-base sm:text-lg font-bold text-slate-900">สัดส่วนสารสนเทศ ข่าว กิจกรรม และเอกสารเผยแพร่</h3>
            </div>
            <div class="h-64 relative flex items-center justify-center">
              <canvas id="chart-content-pie"></canvas>
            </div>
          </div>
        </div>

        <!-- KPI Progress Bars (ผลสัมฤทธิ์และตัวชี้วัดคุณภาพการศึกษา) -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <span class="text-xs font-bold text-amber-700 uppercase">EDUCATIONAL QUALITY KPIs</span>
              <h3 class="text-lg font-bold text-slate-900">ตัวชี้วัดคุณภาพผู้เรียนและผลสัมฤทธิ์ทางการศึกษา (ตาราง School_Statistics)</h3>
            </div>
            ${
              window.authService.isAdminOrAbove()
                ? `<button onclick="window.app.navigate('admin'); window.adminDashboardView.activeTab='statistics';" class="text-xs font-semibold text-amber-700 hover:underline">+ แก้ไขข้อมูลสถิติใน Admin CMS</button>`
                : ''
            }
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            ${kpiScoreRows
              .map(
                (kpi) => `
                <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-700">${window.authService.sanitizeHTML(kpi.metric_name)}</span>
                    <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold">${kpi.metric_value}${kpi.metric_unit}</span>
                  </div>
                  <div class="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div class="h-full bg-amber-500 rounded-full" style="width: ${Math.min(100, Number(kpi.metric_value || 0))}%"></div>
                  </div>
                  <div class="flex items-center justify-between text-[11px] text-slate-500">
                    <span>ค่าเป้าหมาย: ${kpi.target_value}${kpi.metric_unit}</span>
                    <span class="text-emerald-700 font-medium">${window.authService.sanitizeHTML(kpi.notes)}</span>
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
   * วาดกราฟ Chart.js ทั้ง 4 รูปแบบหลังจาก DOM เรนเดอร์เสร็จ
   */
  mountCharts() {
    if (typeof Chart === 'undefined') return;

    // ทำลายอินสแตนซ์เดิมก่อนวาดใหม่เพื่อป้องกันกราฟซ้อน
    Object.values(this.chartInstances).forEach((inst) => {
      if (inst && typeof inst.destroy === 'function') inst.destroy();
    });
    this.chartInstances = {};

    const studentAll = window.dbAdapter.getTable('Students_Statistics').filter((s) => {
      const matchYear = String(s.academic_year || '2569') === String(this.selectedYear);
      const matchSem = this.selectedSemester === 'ALL' || String(s.semester) === String(this.selectedSemester);
      const matchLevel = this.selectedLevelGroup === 'ALL' || s.level_group === this.selectedLevelGroup;
      return matchYear && matchSem && matchLevel;
    });

    // 1. Bar Chart: นักเรียนแยกตามระดับชั้น (ชาย / หญิง)
    const barCtx = document.getElementById('chart-students-bar');
    if (barCtx) {
      this.chartInstances.bar = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: studentAll.map((s) => s.grade_level),
          datasets: [
            {
              label: 'นักเรียนชาย (คน)',
              data: studentAll.map((s) => Number(s.male_count || 0)),
              backgroundColor: '#0F172A',
              borderRadius: 6
            },
            {
              label: 'นักเรียนหญิง (คน)',
              data: studentAll.map((s) => Number(s.female_count || 0)),
              backgroundColor: '#F59E0B',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // 2. Doughnut Chart: สัดส่วนบุคลากรตามฝ่ายงาน
    const doughnutCtx = document.getElementById('chart-personnel-doughnut');
    if (doughnutCtx) {
      const personnel = window.dbAdapter.getTable('Personnel');
      const deptMap = {};
      personnel.forEach((p) => {
        const key = p.department || 'อื่นๆ';
        deptMap[key] = (deptMap[key] || 0) + 1;
      });

      this.chartInstances.doughnut = new Chart(doughnutCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(deptMap),
          datasets: [
            {
              data: Object.values(deptMap),
              backgroundColor: ['#0F172A', '#F59E0B', '#0284C7', '#10B981', '#8B5CF6', '#F43F5E'],
              borderWidth: 2,
              borderColor: '#FFFFFF'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }

    // 3. Bar/Line Chart: กราฟจำนวนนักเรียน 3 ปีย้อนหลัง (แสดง 3 ปีย้อนหลัง แยกสีตามปีการศึกษา)
    const lineCtx = document.getElementById('chart-trend-line');
    if (lineCtx) {
      const trends = window.dbAdapter
        .getTable('School_Statistics')
        .filter((k) => k.metric_group === 'STUDENT_TREND')
        .sort((a, b) => Number(a.academic_year) - Number(b.academic_year))
        .slice(-3);

      const yearColors = {
        '2567': '#2563EB', // น้ำเงิน
        '2568': '#059669', // เขียวมรกต
        '2569': '#DC2626'  // แดง
      };
      const fallbackPalette = ['#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED'];

      this.chartInstances.line = new Chart(lineCtx, {
        type: 'bar',
        data: {
          labels: trends.map((t) => {
            const rawVal = String(t.metric_value ?? '-').trim();
            return `ปีการศึกษา ${t.academic_year} (${rawVal === '-' || rawVal === '' ? '-' : `${rawVal} คน`})`;
          }),
          datasets: [
            {
              label: 'จำนวนนักเรียน (คน)',
              data: trends.map((t) => {
                const n = Number(t.metric_value);
                return Number.isFinite(n) && n > 0 ? n : 0;
              }),
              backgroundColor: trends.map((t, idx) => {
                const n = Number(t.metric_value);
                if (!Number.isFinite(n) || n <= 0) return '#CBD5E1';
                return yearColors[String(t.academic_year)] || fallbackPalette[idx % fallbackPalette.length];
              }),
              borderColor: trends.map((t, idx) => {
                const n = Number(t.metric_value);
                if (!Number.isFinite(n) || n <= 0) return '#94A3B8';
                return yearColors[String(t.academic_year)] || fallbackPalette[idx % fallbackPalette.length];
              }),
              borderWidth: 1.5,
              borderRadius: 10,
              maxBarThickness: 64
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false // ซ่อน legend เดี่ยว เพื่อให้แท่งกราฟแสดงแต่ละสีอย่างชัดเจน
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const row = trends[ctx.dataIndex];
                  const raw = row ? String(row.metric_value ?? '-').trim() : '-';
                  return raw === '-' || raw === '' || Number(raw) <= 0
                    ? ' จำนวนนักเรียน: - (รอข้อมูล)'
                    : ` จำนวนนักเรียน: ${Number(raw).toLocaleString()} คน`;
                }
              }
            }
          },
          scales: {
            y: { beginAtZero: true, suggestedMax: 350 }
          }
        }
      });
    }

    // 4. Pie Chart: สัดส่วนข้อมูลดิจิทัลในระบบ
    const pieCtx = document.getElementById('chart-content-pie');
    if (pieCtx) {
      const newsCount = window.dbAdapter.getTable('News').length;
      const actCount = window.dbAdapter.getTable('Activities').length;
      const docCount = window.dbAdapter.getTable('Documents').length;
      const galCount = window.dbAdapter.getTable('Gallery').length;

      this.chartInstances.pie = new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels: ['ข่าวประชาสัมพันธ์', 'กิจกรรมโรงเรียน', 'เอกสารเผยแพร่ (PDF)', 'คลังภาพกิจกรรม'],
          datasets: [
            {
              data: [newsCount, actCount, docCount, galCount],
              backgroundColor: ['#F59E0B', '#0F172A', '#0284C7', '#10B981'],
              borderWidth: 2,
              borderColor: '#FFFFFF'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }
  }
}

window.dashboardView = new DashboardView();
