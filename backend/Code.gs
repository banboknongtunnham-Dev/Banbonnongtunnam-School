/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - GOOGLE APPS SCRIPT BACKEND API (Code.gs)
 * โรงเรียนบ้านบกหนองทันน้ำ (สพป.อุบลราชธานี เขต 2)
 * ============================================================================
 * รองรับ:
 * - อ่าน/เพิ่ม/แก้ไข/ลบข้อมูลใน Google Sheets ทั้ง 17 ตาราง พร้อม LockService
 * - อัปโหลดรูปภาพและเอกสาร PDF ไปยัง Google Drive แยกตามโฟลเดอร์
 * - ตรวจสอบสิทธิ์ RBAC (PUBLIC, TEACHER, ADMIN, DEVELOPER)
 * - การเข้าสู่ระบบด้วย SHA-256 Password Hash + Salt หรือ Google OAuth
 * - บันทึก Audit_Logs อัตโนมัติทุกการเปลี่ยนแปลง
 * - ตรวจสอบสถานะระบบ (System Health Check) และการสำรองข้อมูล (Database Backup)
 */

const ALLOWED_TABLES = [
  'School_Profile', 'School_History', 'Personnel', 'Students_Statistics',
  'News', 'Announcements', 'Activities', 'Gallery', 'Documents',
  'Academic_Data', 'Curriculum', 'School_Statistics', 'User_Accounts',
  'User_Roles', 'System_Modules', 'System_Settings', 'Audit_Logs'
];

const PUBLIC_READABLE_TABLES = [
  'School_Profile', 'School_History', 'Personnel', 'Students_Statistics',
  'News', 'Announcements', 'Activities', 'Gallery', 'Documents',
  'Academic_Data', 'Curriculum', 'School_Statistics', 'System_Settings'
];

/**
 * HTTP GET Handler
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'healthCheck';
    const role = params.role || 'PUBLIC';

    if (action === 'healthCheck') {
      return jsonResponse(runSystemHealthCheck());
    }

    if (action === 'getAllData') {
      const ss = getSpreadsheet(params.spreadsheetId);
      const cache = CacheService.getScriptCache();
      if (role === 'PUBLIC') {
        const cachedAll = cache.get('BBK_ALL_PUBLIC_DATA');
        if (cachedAll) {
          return ContentService.createTextOutput(cachedAll).setMimeType(ContentService.MimeType.JSON);
        }
      }

      const result = {};
      const tablesToFetch = (role === 'ADMIN' || role === 'DEVELOPER')
        ? ALLOWED_TABLES
        : (role === 'TEACHER' ? PUBLIC_READABLE_TABLES.concat(['System_Modules']) : PUBLIC_READABLE_TABLES);

      tablesToFetch.forEach((tableName) => {
        result[tableName] = typeof getCachedTableData === 'function'
          ? getCachedTableData(ss, tableName, role)
          : readSheetData(ss, tableName, role);
      });

      const responseObj = {
        status: 'SUCCESS',
        cached: false,
        timestamp: new Date().toISOString(),
        data: result
      };

      if (role === 'PUBLIC') {
        try {
          const str = JSON.stringify({ ...responseObj, cached: true });
          if (str.length < 95000) cache.put('BBK_ALL_PUBLIC_DATA', str, 300);
        } catch (e) {}
      }

      return jsonResponse(responseObj);
    }

    if (action === 'getTable') {
      const tableName = params.table;
      if (!ALLOWED_TABLES.includes(tableName)) {
        return jsonResponse({ status: 'ERROR', message: 'Invalid table name: ' + tableName });
      }
      const ss = getSpreadsheet(params.spreadsheetId);
      return jsonResponse({
        status: 'SUCCESS',
        table: tableName,
        rows: readSheetData(ss, tableName, role)
      });
    }

    return jsonResponse({ status: 'ERROR', message: 'Unknown GET action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'ERROR', message: err.toString() });
  }
}

/**
 * HTTP POST Handler
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    const actor = body.actor || { user_id: 'PUBLIC', user_name: 'Anonymous', role: 'PUBLIC' };
    const ss = getSpreadsheet(body.spreadsheetId);

    // 1. ระบบยืนยันตัวตน (Authentication)
    if (action === 'login') {
      return jsonResponse(authenticateUser(ss, body.username, body.passwordHash, body.googleEmail));
    }

    // 2. สร้างโครงสร้างตารางและโฟลเดอร์เริ่มต้น
    if (action === 'initDatabase') {
      requireRole(actor.role, ['DEVELOPER', 'ADMIN']);
      const setupResult = setupBanbokDatabaseAndDrive();
      return jsonResponse(setupResult);
    }

    // 3. เพิ่มข้อมูล (Insert Row)
    if (action === 'insertRow') {
      requireRole(actor.role, ['ADMIN', 'DEVELOPER', 'TEACHER']);
      const res = insertRowToSheet(ss, body.table, body.row);
      if (typeof invalidateTableCache === 'function') invalidateTableCache(body.table);
      if (body.table === 'Activities' && typeof syncActivityToGoogleCalendar === 'function') {
        syncActivityToGoogleCalendar(body.row, body.calendarId);
      }
      appendAuditLog(ss, actor, 'INSERT', body.table, res.id, 'เพิ่มข้อมูลในตาราง ' + body.table);
      return jsonResponse({ status: 'SUCCESS', result: res });
    }

    // 4. แก้ไขข้อมูล (Update Row)
    if (action === 'updateRow') {
      requireRole(actor.role, ['ADMIN', 'DEVELOPER', 'TEACHER']);
      const res = updateRowInSheet(ss, body.table, body.primaryKey, body.primaryValue, body.row);
      if (typeof invalidateTableCache === 'function') invalidateTableCache(body.table);
      appendAuditLog(ss, actor, 'UPDATE', body.table, body.primaryValue, 'แก้ไขข้อมูลในตาราง ' + body.table);
      return jsonResponse({ status: 'SUCCESS', result: res });
    }

    // 5. ลบข้อมูล (Delete Row)
    if (action === 'deleteRow') {
      requireRole(actor.role, ['ADMIN', 'DEVELOPER']);
      const res = deleteRowFromSheet(ss, body.table, body.primaryKey, body.primaryValue);
      if (typeof invalidateTableCache === 'function') invalidateTableCache(body.table);
      appendAuditLog(ss, actor, 'DELETE', body.table, body.primaryValue, 'ลบข้อมูลจากตาราง ' + body.table);
      return jsonResponse({ status: 'SUCCESS', result: res });
    }

    // 6. ซิงค์ข้อมูลทั้งตารางหรือทั้งฐานข้อมูล (Bulk Sync)
    if (action === 'bulkSync') {
      requireRole(actor.role, ['ADMIN', 'DEVELOPER']);
      const syncedTables = [];
      const payload = body.tables || {};
      Object.keys(payload).forEach((tableName) => {
        if (ALLOWED_TABLES.includes(tableName)) {
          overwriteSheetWithObjects(ss, tableName, payload[tableName]);
          if (typeof invalidateTableCache === 'function') invalidateTableCache(tableName);
          syncedTables.push(tableName);
        }
      });
      appendAuditLog(ss, actor, 'BULK_SYNC', syncedTables.join(','), 'SYNC', 'ซิงค์ฐานข้อมูลขึ้น Google Sheets');
      return jsonResponse({ status: 'SUCCESS', syncedTables: syncedTables });
    }

    // 7. อัปโหลดไฟล์ไปยัง Google Drive
    if (action === 'uploadFile') {
      requireRole(actor.role, ['ADMIN', 'DEVELOPER', 'TEACHER']);
      const uploadRes = uploadBase64ToDrive(body.fileName, body.mimeType, body.base64Data, body.folderCategory, body.folderId, body.isPublic !== false);
      appendAuditLog(ss, actor, 'UPLOAD_FILE', 'Google_Drive', uploadRes.fileId, 'อัปโหลดไฟล์ ' + body.fileName);
      return jsonResponse({ status: 'SUCCESS', file: uploadRes });
    }

    // 8. สำรองฐานข้อมูลลง Google Drive (JSON Snapshot Backup)
    if (action === 'backupDatabaseToDrive') {
      requireRole(actor.role, ['DEVELOPER', 'ADMIN']);
      const backupRes = createDatabaseBackupFile(ss, body.folderId);
      appendAuditLog(ss, actor, 'BACKUP_DB', 'Google_Drive', backupRes.fileId, 'สำรองฐานข้อมูลทั้งหมดลง Google Drive');
      return jsonResponse({ status: 'SUCCESS', backup: backupRes });
    }

    // 9. ส่งอีเมลแจ้งเตือนผ่าน Gmail (MailApp)
    if (action === 'sendEmailNotification') {
      const mailRes = sendSchoolEmailNotification(body.recipientEmail, body.subject, body.htmlBody);
      appendAuditLog(ss, actor, 'GMAIL_NOTIFY', 'Google_Gmail', body.recipientEmail, 'ส่งอีเมลแจ้งเตือน: ' + body.subject);
      return jsonResponse({ status: 'SUCCESS', mail: mailRes });
    }

    // 9.1 ส่งข้อความแจ้งเตือนผ่าน LINE Messaging API
    if (action === 'sendLineNotification') {
      const lineRes = sendLineMessageViaGAS(ss, body);
      return jsonResponse({ status: 'SUCCESS', line: lineRes });
    }

    // 9.2 ส่งสรุปยอดผู้เข้าชมประจำวันเข้า LINE
    if (action === 'sendDailyVisitorSummary') {
      const lineRes = sendDailyVisitorSummaryToLine(ss, body);
      return jsonResponse({ status: 'SUCCESS', line: lineRes });
    }

    // 10. สร้างรายงาน PDF อัตโนมัติด้วย Google Docs & Drive
    if (action === 'generateOfficialPdfReport') {
      requireRole(actor.role, ['ADMIN', 'DEVELOPER', 'TEACHER']);
      const pdfRes = generateOfficialSummaryPdfInDrive(ss, body.folderId);
      appendAuditLog(ss, actor, 'GENERATE_PDF', 'Google_Docs_Drive', pdfRes.fileId, 'สร้างรายงาน PDF อัตโนมัติ: ' + pdfRes.fileName);
      return jsonResponse({ status: 'SUCCESS', pdf: pdfRes });
    }

    return jsonResponse({ status: 'ERROR', message: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'ERROR', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper: เปิด Spreadsheet ตาม ID หรือ Active Spreadsheet
 */
function getSpreadsheet(spreadsheetId) {
  if (spreadsheetId && spreadsheetId.trim() !== '') {
    return SpreadsheetApp.openById(spreadsheetId.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Helper: อ่านข้อมูลจาก Sheet แปลงเป็น Array of Objects
 */
function readSheetData(ss, tableName, requesterRole) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      // ป้องกันการส่ง password_hash หรือ salt ออกไปยัง Frontend สำหรับผู้ใช้ทั่วไป
      if (tableName === 'User_Accounts' && (headers[j] === 'password_hash' || headers[j] === 'salt') && requesterRole !== 'DEVELOPER') {
        obj[headers[j]] = '***REDACTED***';
      } else {
        obj[headers[j]] = values[i][j];
      }
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * Helper: เพิ่มแถวใหม่ลงใน Sheet
 */
function insertRowToSheet(ss, tableName, rowObj) {
  let sheet = ss.getSheetByName(tableName);
  if (!sheet) {
    setupBanbokDatabaseAndDrive();
    sheet = ss.getSheetByName(tableName);
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const pkField = headers[0];
  if (!rowObj[pkField]) {
    rowObj[pkField] = tableName.substring(0, 3).toUpperCase() + '-' + new Date().getTime();
  }
  const newRow = headers.map((h) => (rowObj[h] !== undefined ? rowObj[h] : ''));
  sheet.appendRow(newRow);
  return { id: rowObj[pkField], row: rowObj };
}

/**
 * Helper: แก้ไขแถวใน Sheet ตาม Primary Key
 */
function updateRowInSheet(ss, tableName, pkField, pkValue, rowObj) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) throw new Error('Sheet not found: ' + tableName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const pkIndex = headers.indexOf(pkField || headers[0]);
  if (pkIndex === -1) throw new Error('Primary key column not found');

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][pkIndex]) === String(pkValue)) {
      const updatedRow = headers.map((h, idx) => (rowObj[h] !== undefined ? rowObj[h] : values[i][idx]));
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
      return { updated: true, id: pkValue };
    }
  }
  // หากไม่พบแถวเดิม ให้เพิ่มใหม่
  return insertRowToSheet(ss, tableName, rowObj);
}

/**
 * Helper: ลบแถวใน Sheet ตาม Primary Key
 */
function deleteRowFromSheet(ss, tableName, pkField, pkValue) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) throw new Error('Sheet not found: ' + tableName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const pkIndex = headers.indexOf(pkField || headers[0]);

  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][pkIndex]) === String(pkValue)) {
      sheet.deleteRow(i + 1);
      return { deleted: true, id: pkValue };
    }
  }
  return { deleted: false, id: pkValue };
}

/**
 * Helper: เขียนทับตารางด้วย Array of Objects (สำหรับ Bulk Sync)
 */
function overwriteSheetWithObjects(ss, tableName, objectsArray) {
  let sheet = ss.getSheetByName(tableName);
  if (!sheet) {
    sheet = ss.insertSheet(tableName);
  }
  const headers = SCHEMA_DEFINITION[tableName] || (objectsArray[0] ? Object.keys(objectsArray[0]) : []);
  if (!headers.length) return;

  sheet.clearContents();
  const matrix = [headers];
  objectsArray.forEach((obj) => {
    matrix.push(headers.map((h) => (obj[h] !== undefined && obj[h] !== null ? obj[h] : '')));
  });
  sheet.getRange(1, 1, matrix.length, headers.length).setValues(matrix);
}

/**
 * Helper: อัปโหลดไฟล์ Base64 ไปยัง Google Drive
 */
function uploadBase64ToDrive(fileName, mimeType, base64Data, folderCategory, explicitFolderId, isPublic) {
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const decoded = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(decoded, mimeType || 'application/octet-stream', fileName);

  let targetFolder;
  if (explicitFolderId) {
    targetFolder = DriveApp.getFolderById(explicitFolderId);
  } else {
    const structure = createSchoolDriveStructure();
    const subId = structure.subFolders[folderCategory] || structure.rootId;
    targetFolder = DriveApp.getFolderById(subId);
  }

  const file = targetFolder.createFile(blob);
  if (isPublic) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  const fileId = file.getId();
  return {
    fileId: fileId,
    fileName: file.getName(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
    viewUrl: 'https://drive.google.com/uc?export=view&id=' + fileId,
    thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId,
    webViewLink: file.getUrl()
  };
}

/**
 * Helper: ตรวจสอบสิทธิ์ RBAC
 */
function requireRole(userRole, allowedRoles) {
  if (!allowedRoles.includes(userRole)) {
    throw new Error('ACCESS_DENIED: สิทธิ์ผู้ใช้งาน (' + userRole + ') ไม่ได้รับอนุญาตให้ดำเนินการนี้');
  }
}

/**
 * Helper: ตรวจสอบการเข้าสู่ระบบจากตาราง User_Accounts
 */
function authenticateUser(ss, username, passwordHash, googleEmail) {
  const users = readSheetData(ss, 'User_Accounts', 'DEVELOPER');
  const found = users.find((u) => {
    if (String(u.is_active) === 'false') return false;
    if (googleEmail && String(u.email).toLowerCase() === String(googleEmail).toLowerCase()) return true;
    return (
      (String(u.username).toLowerCase() === String(username).toLowerCase() ||
       String(u.email).toLowerCase() === String(username).toLowerCase()) &&
      String(u.password_hash) === String(passwordHash)
    );
  });

  if (!found) {
    return { status: 'ERROR', message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง หรือไม่มีสิทธิ์ในระบบ' };
  }

  return {
    status: 'SUCCESS',
    user: {
      user_id: found.user_id,
      username: found.username,
      email: found.email,
      full_name: found.full_name,
      position: found.position,
      role_id: found.role_id,
      allowed_modules_json: found.allowed_modules_json,
      avatar_url: found.avatar_url
    }
  };
}

/**
 * Helper: บันทึกประวัติลงตาราง Audit_Logs
 */
function appendAuditLog(ss, actor, actionType, targetTable, targetId, details) {
  try {
    let sheet = ss.getSheetByName('Audit_Logs');
    if (!sheet) return;
    sheet.appendRow([
      'LOG-' + new Date().getTime(),
      new Date().toISOString(),
      actor.user_id || 'UNKNOWN',
      actor.user_name || 'Unknown User',
      actor.role || 'PUBLIC',
      actionType,
      targetTable,
      targetId,
      details,
      'GAS Web App API',
      'SUCCESS'
    ]);
  } catch (e) {
    // ไม่ให้การบันทึก Log ขัดจังหวะธุรกรรมหลัก
  }
}

/**
 * Helper: ตรวจสอบสถานะการทำงานของระบบ (Health Check)
 */
function runSystemHealthCheck() {
  const start = new Date().getTime();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existingSheets = ss.getSheets().map((s) => s.getName());
  const missingTables = ALLOWED_TABLES.filter((t) => !existingSheets.includes(t));
  const driveQuotaUsed = DriveApp.getStorageUsed();
  const driveQuotaLimit = DriveApp.getStorageLimit();

  return {
    status: 'ONLINE',
    service: 'BANBOK DIGITAL SCHOOL PLATFORM - Google Apps Script API',
    latencyMs: new Date().getTime() - start,
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    totalTablesExpected: ALLOWED_TABLES.length,
    existingTablesCount: existingSheets.length,
    missingTables: missingTables,
    driveStorageUsedMB: Math.round(driveQuotaUsed / (1024 * 1024)),
    driveStorageLimitMB: Math.round(driveQuotaLimit / (1024 * 1024)),
    timestamp: new Date().toISOString()
  };
}

/**
 * Helper: สำรองข้อมูลทั้งหมดเป็นไฟล์ JSON เก็บไว้ใน Google Drive
 */
function createDatabaseBackupFile(ss, backupFolderId) {
  const snapshot = {};
  ALLOWED_TABLES.forEach((t) => {
    snapshot[t] = readSheetData(ss, t, 'DEVELOPER');
  });
  const fileName = 'BANBOK_DB_BACKUP_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd_HHmmss') + '.json';
  const folder = backupFolderId ? DriveApp.getFolderById(backupFolderId) : DriveApp.getRootFolder();
  const file = folder.createFile(fileName, JSON.stringify(snapshot, null, 2), MimeType.PLAIN_TEXT);
  return {
    fileId: file.getId(),
    fileName: fileName,
    fileUrl: file.getUrl(),
    createdAt: new Date().toISOString()
  };
}

/**
 * Helper: ส่งข้อความแจ้งเตือนผ่าน LINE Messaging API ด้วย UrlFetchApp
 */
function sendLineMessageViaGAS(ss, body) {
  try {
    const token = (body.lineChannelToken || '').trim() || getSettingValue(ss, 'line_channel_access_token');
    const targetId = (body.lineTargetId || '').trim() || getSettingValue(ss, 'line_target_id');
    const messageText = body.lineMessage || ('🔔 มีข้อความใหม่จาก: ' + (body.senderName || 'ผู้เข้าชมเว็บไซต์'));

    if (!token) {
      return { status: 'SKIPPED', message: 'No LINE Channel Access Token configured' };
    }

    const endpoint = targetId 
      ? 'https://api.line.me/v2/bot/message/push'
      : 'https://api.line.me/v2/bot/message/broadcast';

    const payload = targetId
      ? { to: targetId, messages: [{ type: 'text', text: messageText }] }
      : { messages: [{ type: 'text', text: messageText }] };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(endpoint, options);
    const respCode = response.getResponseCode();
    const respText = response.getContentText();

    appendAuditLog(ss, { fullName: body.senderName || 'Web Visitor', role: 'PUBLIC' }, 'LINE_NOTIFY', 'LINE_API', targetId || 'BROADCAST', 'ส่งแจ้งเตือน LINE สำเร็จ: HTTP ' + respCode);
    return { code: respCode, response: respText };
  } catch (err) {
    return { status: 'ERROR', message: err.toString() };
  }
}

/**
 * Helper: คืนค่า JSON Response
 */
function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ฟังก์ชันส่งสรุปยอดผู้เข้าชมเว็บไซต์ประจำวันเข้า LINE อัตโนมัติ (Google Apps Script Time-Driven Trigger)
 */
function sendDailyVisitorSummaryToLine(ss, body = {}) {
  try {
    if (!ss) ss = getSpreadsheet();
    const token = (body.lineChannelToken || '').trim() || getSettingValue(ss, 'line_channel_access_token');
    if (!token) {
      return { status: 'SKIPPED', message: 'No LINE Token configured' };
    }

    const todayVisitors = (body.todayVisitors != null ? body.todayVisitors : getSettingValue(ss, 'today_visitors')) || '0';
    const totalVisitors = (body.totalVisitors != null ? body.totalVisitors : getSettingValue(ss, 'total_visitors')) || '1280';
    const schoolName = getSettingValue(ss, 'hero_welcome_title') || 'โรงเรียนบ้านบกหนองทันน้ำ';

    const now = new Date();
    const dateStr = Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm น.');

    const messageText = 
`📊 [รายงานประจำวัน] สรุปยอดผู้เข้าชมเว็บไซต์
🏛️ ${schoolName}
----------------------------------------
📅 ข้อมูล ณ: ${dateStr}
👥 ยอดผู้เข้าชมวันนี้: ${todayVisitors} ครั้ง
🌐 ยอดผู้เข้าชมสะสมทั้งหมด: ${totalVisitors} ครั้ง
⚡ สถานะระบบ: ออนไลน์ 100% ปกติ
----------------------------------------
🔗 ตรวจสอบเว็บไซต์: https://banboknongtunnham-dev.github.io/Banbonnongtunnam-School/`;

    return sendLineMessageViaGAS(ss, {
      lineChannelToken: token,
      lineMessage: messageText
    });
  } catch (err) {
    return { status: 'ERROR', message: err.toString() };
  }
}

/**
 * ฟังก์ชันสร้างตัวจับเวลาอัตโนมัติ (Trigger) ให้ Apps Script รันส่งสรุปเข้า LINE ทุกวันเวลา 18:00 - 19:00 น.
 */
function setupDailySummaryTrigger() {
  // ลบ Trigger เดิมเพื่อไม่ให้ซ้ำซ้อน
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendDailyVisitorSummaryToLine') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // สร้าง Trigger ทำงานทุกวัน เวลา 18:00 - 19:00 น.
  ScriptApp.newTrigger('sendDailyVisitorSummaryToLine')
    .timeBased()
    .everyDays(1)
    .atHour(18)
    .nearMinute(30)
    .inTimezone('Asia/Bangkok')
    .create();

  return 'Daily Trigger created successfully (18:30 ทุกวัน)';
}
