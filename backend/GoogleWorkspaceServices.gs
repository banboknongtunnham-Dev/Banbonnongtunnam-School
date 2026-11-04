/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - GOOGLE WORKSPACE NATIVE SERVICES
 * เชื่อมต่อบริการ Google Workspace ระดับองค์กร:
 * 1. CacheService (เร่งความเร็วการอ่านข้อมูล Google Sheets ขึ้น 10 เท่า)
 * 2. Google Calendar Sync (ซิงค์ตาราง Activities เข้าปฏิทินโรงเรียนอัตโนมัติ)
 * 3. Gmail Notification (แจ้งเตือนอีเมลสารบรรณเมื่อมีผู้ติดต่อหรือส่งงาน)
 * 4. Google Docs & PDF Report Generator (สร้างรายงานราชการ PDF เก็บใน Drive)
 * 5. Google Forms Auto-Provisioner (สร้างฟอร์มรับสมัครนักเรียน/ติดต่อราชการ)
 * ============================================================================
 */

const CACHE_TTL_SECONDS = 300; // แคชข้อมูลบน Google Server นาน 5 นาที (ล้างอัตโนมัติเมื่อมีการแก้ไขข้อมูล)

/**
 * 1. ระบบจัดการ Server-Side Cache บน Google Apps Script
 */
function getCachedTableData(ss, tableName, role) {
  if (role !== 'PUBLIC') {
    // สำหรับ Teacher / Admin / Developer ให้อ่านข้อมูลสดหรือแคชแยกตามสิทธิ์
    return readSheetData(ss, tableName, role);
  }
  const cache = CacheService.getScriptCache();
  const cacheKey = 'BBK_TBL_' + tableName + '_PUBLIC';
  const cachedStr = cache.get(cacheKey);
  if (cachedStr) {
    try {
      return JSON.parse(cachedStr);
    } catch (e) {
      // หากแคชเสียหายให้อ่านใหม่จาก Sheet
    }
  }
  const freshData = readSheetData(ss, tableName, 'PUBLIC');
  try {
    const serialized = JSON.stringify(freshData);
    if (serialized.length < 95000) { // ข้อจำกัดของ Apps Script CacheService คือ 100KB ต่อคีย์
      cache.put(cacheKey, serialized, CACHE_TTL_SECONDS);
    }
  } catch (e) {
    // ข้ามกรณีขนาดเกิน 100KB
  }
  return freshData;
}

/**
 * ล้างแคชของตารางทันทีเมื่อมีการ Insert / Update / Delete
 */
function invalidateTableCache(tableName) {
  try {
    const cache = CacheService.getScriptCache();
    if (tableName) {
      cache.remove('BBK_TBL_' + tableName + '_PUBLIC');
    }
    cache.remove('BBK_ALL_PUBLIC_DATA');
  } catch (e) {
    // ignore
  }
}

/**
 * 2. ซิงค์กิจกรรมจากตาราง Activities เข้าสู่ Google Calendar ของโรงเรียน
 */
function syncActivityToGoogleCalendar(activityObj, calendarId) {
  try {
    const cal = calendarId
      ? CalendarApp.getCalendarById(calendarId)
      : CalendarApp.getDefaultCalendar();
    if (!cal) return { synced: false, reason: 'CALENDAR_NOT_FOUND' };

    const startDate = new Date(activityObj.start_date || new Date());
    const endDate = new Date(activityObj.end_date || activityObj.start_date || new Date());
    endDate.setDate(endDate.getDate() + 1);

    const event = cal.createAllDayEvent(
      '[รร.บ้านบกหนองทันน้ำ] ' + (activityObj.title || 'กิจกรรมโรงเรียน'),
      startDate,
      endDate,
      {
        location: activityObj.location || 'โรงเรียนบ้านบกหนองทันน้ำ',
        description: activityObj.description || ''
      }
    );

    return {
      synced: true,
      eventId: event.getId(),
      calendarName: cal.getName()
    };
  } catch (err) {
    return { synced: false, error: err.toString() };
  }
}

/**
 * 3. ส่งอีเมลแจ้งเตือนผ่านระบบ Google Gmail (MailApp)
 */
function sendSchoolEmailNotification(recipientEmail, subject, htmlBody) {
  try {
    if (!recipientEmail) return { sent: false, reason: 'NO_RECIPIENT' };
    const remainingQuota = MailApp.getRemainingDailyQuota();
    if (remainingQuota <= 0) return { sent: false, reason: 'QUOTA_EXCEEDED' };

    MailApp.sendEmail({
      to: recipientEmail,
      subject: '[BANBOK DIGITAL PLATFORM] ' + subject,
      htmlBody: `
        <div style="font-family: 'Sarabun', sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background: #0f172a; color: #ffffff; padding: 20px 24px; border-bottom: 4px solid #f59e0b;">
            <h2 style="margin: 0; font-size: 18px;">โรงเรียนบ้านบกหนองทันน้ำ (BANBOK DIGITAL SCHOOL PLATFORM)</h2>
            <p style="margin: 4px 0 0; font-size: 12px; color: #fcd34d;">สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุบลราชธานี เขต 2</p>
          </div>
          <div style="padding: 24px; color: #1e293b; line-height: 1.6; font-size: 14px;">
            ${htmlBody}
          </div>
          <div style="background: #f8fafc; padding: 14px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            ส่งอัตโนมัติจากระบบสารสนเทศดิจิทัล โรงเรียนบ้านบกหนองทันน้ำ (โควตาอีเมลคงเหลือวันนี้: ${remainingQuota - 1} ฉบับ)
          </div>
        </div>
      `
    });
    return { sent: true, quotaRemaining: remainingQuota - 1 };
  } catch (err) {
    return { sent: false, error: err.toString() };
  }
}

/**
 * 4. สร้างเอกสารรายงานสรุปสถิติโรงเรียนเป็นไฟล์ PDF เก็บลง Google Drive อัตโนมัติ
 */
function generateOfficialSummaryPdfInDrive(ss, targetFolderId) {
  const profileRows = readSheetData(ss, 'School_Profile', 'ADMIN');
  const profile = profileRows[0] || { school_name_th: 'โรงเรียนบ้านบกหนองทันน้ำ', affiliation: 'สพป.อุบลราชธานี เขต 2' };
  const students = readSheetData(ss, 'Students_Statistics', 'ADMIN');
  const personnel = readSheetData(ss, 'Personnel', 'ADMIN');

  const totalStudents = students.reduce((sum, r) => sum + Number(r.total_count || 0), 0);
  const reportTitle = 'รายงานสารสนเทศสถิติโรงเรียนบ้านบกหนองทันน้ำ_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd_HHmm');

  const doc = DocumentApp.create(reportTitle);
  const body = doc.getBody();

  body.appendParagraph(profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(profile.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุบลราชธานี เขต 2')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('รายงานสรุปข้อมูลสารสนเทศจากระบบ BANBOK DIGITAL SCHOOL PLATFORM ณ วันที่ ' + Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm'))
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendHorizontalRule();

  body.appendParagraph('1. สรุปจำนวนบุคลากรและนักเรียน').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendListItem('จำนวนผู้บริหาร ครู และบุคลากรทางการศึกษา: ' + personnel.length + ' ท่าน');
  body.appendListItem('จำนวนนักเรียนทั้งหมด (ระดับปฐมวัย - มัธยมศึกษาปีที่ 3): ' + totalStudents + ' คน');

  if (students.length > 0) {
    const tableMatrix = [['ระดับการศึกษา', 'ชั้นเรียน', 'ห้องเรียน', 'ชาย (คน)', 'หญิง (คน)', 'รวม (คน)']];
    students.forEach((s) => {
      tableMatrix.push([
        String(s.level_group || ''),
        String(s.grade_level || ''),
        String(s.classrooms || '1'),
        String(s.male_count || '0'),
        String(s.female_count || '0'),
        String(s.total_count || '0')
      ]);
    });
    body.appendTable(tableMatrix);
  }

  doc.saveAndClose();

  const docFile = DriveApp.getFileById(doc.getId());
  const pdfBlob = docFile.getAs(MimeType.PDF).setName(reportTitle + '.pdf');

  let folder;
  if (targetFolderId) {
    folder = DriveApp.getFolderById(targetFolderId);
  } else {
    const structure = createSchoolDriveStructure();
    folder = DriveApp.getFolderById(structure.subFolders.Official_Documents);
  }

  const pdfFile = folder.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  // ลบไฟล์ร่าง Google Doc ชั่วคราวหลังแปลงเป็น PDF เสร็จ
  docFile.setTrashed(true);

  return {
    fileId: pdfFile.getId(),
    fileName: pdfFile.getName(),
    viewUrl: pdfFile.getUrl(),
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + pdfFile.getId()
  };
}
