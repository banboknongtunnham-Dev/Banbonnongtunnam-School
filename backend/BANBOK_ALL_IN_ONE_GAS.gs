/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - ALL-IN-ONE GOOGLE APPS SCRIPT
 * โรงเรียนบ้านบกหนองทันน้ำ (สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุบลราชธานี เขต 2)
 * ============================================================================
 * วิธีติดตั้งใน Google Sheets (ใช้เวลา 1 นาที):
 * 1. เปิด Google Sheets ไฟล์ใหม่ แล้วไปที่เมนู "ส่วนขยาย (Extensions)" > "Apps Script"
 * 2. ลบโค้ดเดิมในหน้าจอ Apps Script ออกทั้งหมด แล้ววางโค้ดชุดนี้ลงไปแทน
 * 3. กดไอคอนรูปแผ่นดิสก์ (Save) ด้านบน
 * 4. เลือกชื่อฟังก์ชันด้านบนเป็น "setupBanbokDatabaseAndDrive" แล้วกดปุ่ม "เรียกใช้ (Run)"
 *    (ระบบจะสร้างตารางทั้ง 17 ตาราง และโฟลเดอร์ Google Drive 6 หมวดหมู่อัตโนมัติ)
 * 5. กดปุ่มสีน้ำเงินมุมขวาบน "การทำให้ใช้งานได้ (Deploy)" > "การทำให้ใช้งานได้รายการใหม่ (New deployment)"
 *    - เลือกประเภทเป็น "เว็บแอป (Web app)"
 *    - ช่อง "ผู้ที่มีสิทธิ์เข้าถึง (Who has access)" เลือกเป็น "ทุกคน (Anyone)"
 *    - กดปุ่ม Deploy แล้วคัดลอกลิงก์ Web App URL มาวางในหน้าเว็บได้เลย
 * ============================================================================
 */

function myFunction() {
  return setupBanbokDatabaseAndDrive();
}

const SCHEMA_DEFINITION = {
  School_Profile: [
    'profile_id', 'school_name_th', 'school_name_en', 'affiliation', 'school_type',
    'education_level', 'school_code', 'established_year', 'area_size', 'vision',
    'mission', 'identity', 'uniqueness', 'motto', 'philosophy', 'address',
    'subdistrict', 'district', 'province', 'postal_code', 'phone', 'email',
    'facebook_url', 'latitude', 'longitude', 'director_name', 'director_position',
    'director_photo_url', 'director_message', 'updated_at'
  ],
  School_History: [
    'history_id', 'year_be', 'title', 'description', 'image_url', 'sort_order', 'updated_at'
  ],
  Personnel: [
    'personnel_id', 'prefix', 'first_name', 'last_name', 'position', 'academic_standing',
    'department', 'subject_group', 'education_degree', 'phone', 'email', 'photo_url',
    'role_group', 'sort_order', 'status', 'updated_at'
  ],
  Students_Statistics: [
    'stat_id', 'academic_year', 'semester', 'grade_level', 'level_group',
    'classrooms', 'male_count', 'female_count', 'total_count', 'updated_at'
  ],
  News: [
    'news_id', 'title', 'slug', 'category', 'summary', 'content', 'cover_image_url',
    'gallery_urls_json', 'attachment_url', 'is_featured', 'is_pinned', 'publish_status',
    'published_at', 'author_id', 'author_name', 'views_count', 'created_at', 'updated_at'
  ],
  Announcements: [
    'announce_id', 'title', 'category', 'urgency_level', 'description', 'file_url',
    'published_date', 'expire_date', 'is_active', 'author_name', 'created_at'
  ],
  Activities: [
    'activity_id', 'title', 'academic_year', 'semester', 'category', 'start_date',
    'end_date', 'location', 'description', 'cover_image_url', 'drive_folder_url',
    'status', 'created_at'
  ],
  Gallery: [
    'gallery_id', 'activity_id', 'title', 'category', 'image_url', 'drive_file_id',
    'caption', 'uploaded_by', 'created_at'
  ],
  Documents: [
    'doc_id', 'title', 'category', 'academic_year', 'file_type', 'file_size',
    'drive_file_id', 'download_url', 'access_level', 'download_count',
    'uploaded_by', 'published_date'
  ],
  Academic_Data: [
    'academic_id', 'data_type', 'academic_year', 'title', 'category', 'description',
    'metric_value', 'image_url', 'doc_url', 'updated_at'
  ],
  Curriculum: [
    'curriculum_id', 'level_group', 'subject_code', 'subject_group', 'title',
    'description', 'hours_per_year', 'credits', 'structure_doc_url', 'status', 'updated_at'
  ],
  School_Statistics: [
    'kpi_id', 'academic_year', 'semester', 'metric_group', 'metric_name',
    'metric_value', 'metric_unit', 'target_value', 'notes', 'updated_at'
  ],
  User_Accounts: [
    'user_id', 'username', 'email', 'password_hash', 'salt', 'full_name',
    'position', 'role_id', 'allowed_modules_json', 'avatar_url', 'is_active',
    'last_login', 'created_at'
  ],
  User_Roles: [
    'role_id', 'role_code', 'role_name_th', 'permissions_json', 'description', 'access_level'
  ],
  System_Modules: [
    'module_id', 'module_code', 'module_name', 'category', 'description',
    'icon_name', 'color_accent', 'target_url', 'open_mode', 'min_role',
    'allowed_users_json', 'is_enabled', 'sort_order', 'updated_at'
  ],
  System_Settings: [
    'setting_key', 'setting_group', 'setting_value', 'data_type',
    'description', 'updated_by', 'updated_at'
  ],
  Audit_Logs: [
    'log_id', 'timestamp', 'user_id', 'user_name', 'user_role', 'action_type',
    'target_table', 'target_id', 'details', 'ip_or_client', 'status'
  ]
};

const ALLOWED_TABLES = Object.keys(SCHEMA_DEFINITION);

const PUBLIC_READABLE_TABLES = [
  'School_Profile', 'School_History', 'Personnel', 'Students_Statistics',
  'News', 'Announcements', 'Activities', 'Gallery', 'Documents',
  'Academic_Data', 'Curriculum', 'School_Statistics', 'System_Settings'
];

const CACHE_TTL_SECONDS = 300;

/**
 * ฟังก์ชันที่ 1: กด Run ครั้งแรกเพื่อสร้างตารางทั้ง 17 ตาราง และโฟลเดอร์ Google Drive อัตโนมัติ
 */
function setupBanbokDatabaseAndDrive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date().toISOString();

  ALLOWED_TABLES.forEach((sheetName) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    const headers = SCHEMA_DEFINITION[sheetName];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#0F172A');
      headerRange.setFontColor('#FBBF24');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });

  const driveFolders = createSchoolDriveStructure();

  const settingsSheet = ss.getSheetByName('System_Settings');
  if (settingsSheet && settingsSheet.getLastRow() <= 1) {
    const initialSettings = [
      ['drive_root_folder_id', 'GOOGLE_DRIVE', driveFolders.rootId, 'string', 'โฟลเดอร์หลักจัดเก็บไฟล์โรงเรียนบ้านบกหนองทันน้ำ', 'SYSTEM', now],
      ['drive_school_images_id', 'GOOGLE_DRIVE', driveFolders.subFolders.School_Images, 'string', 'โฟลเดอร์รูปภาพโรงเรียนและแบนเนอร์', 'SYSTEM', now],
      ['drive_activity_photos_id', 'GOOGLE_DRIVE', driveFolders.subFolders.Activity_Photos, 'string', 'โฟลเดอร์รูปภาพกิจกรรม', 'SYSTEM', now],
      ['drive_official_docs_id', 'GOOGLE_DRIVE', driveFolders.subFolders.Official_Documents, 'string', 'โฟลเดอร์เอกสารราชการและไฟล์ PDF', 'SYSTEM', now],
      ['drive_personnel_photos_id', 'GOOGLE_DRIVE', driveFolders.subFolders.Personnel_Photos, 'string', 'โฟลเดอร์รูปภาพบุคลากร', 'SYSTEM', now],
      ['drive_news_attachments_id', 'GOOGLE_DRIVE', driveFolders.subFolders.News_Attachments, 'string', 'โฟลเดอร์ไฟล์ประกอบข่าวประชาสัมพันธ์', 'SYSTEM', now],
      ['drive_backups_id', 'GOOGLE_DRIVE', driveFolders.subFolders.System_Backups, 'string', 'โฟลเดอร์สำรองฐานข้อมูลระบบ', 'SYSTEM', now]
    ];
    settingsSheet.getRange(2, 1, initialSettings.length, initialSettings[0].length).setValues(initialSettings);
  }

  return {
    status: 'SUCCESS',
    spreadsheetId: ss.getId(),
    driveFolders: driveFolders
  };
}

function createSchoolDriveStructure() {
  const rootFolderName = 'BANBOK_DIGITAL_SCHOOL_STORAGE';
  let rootFolder;
  const existingRoots = DriveApp.getFoldersByName(rootFolderName);
  rootFolder = existingRoots.hasNext() ? existingRoots.next() : DriveApp.createFolder(rootFolderName);

  const subFolderNames = [
    'School_Images', 'Activity_Photos', 'Official_Documents',
    'Personnel_Photos', 'News_Attachments', 'System_Backups'
  ];
  const subFolders = {};
  subFolderNames.forEach((name) => {
    const iter = rootFolder.getFoldersByName(name);
    subFolders[name] = iter.hasNext() ? iter.next().getId() : rootFolder.createFolder(name).getId();
  });

  return { rootId: rootFolder.getId(), rootUrl: rootFolder.getUrl(), subFolders: subFolders };
}

/**
 * HTTP GET API (อ่านข้อมูลตารางด้วยความเร็วสูงผ่าน CacheService)
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'healthCheck';
    const role = params.role || 'PUBLIC';

    if (action === 'healthCheck') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      return jsonResponse({
        status: 'ONLINE',
        service: 'BANBOK DIGITAL SCHOOL PLATFORM API',
        spreadsheetId: ss.getId(),
        spreadsheetName: ss.getName(),
        timestamp: new Date().toISOString()
      });
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
        result[tableName] = readSheetData(ss, tableName, role);
      });

      const responseObj = { status: 'SUCCESS', cached: false, timestamp: new Date().toISOString(), data: result };
      if (role === 'PUBLIC') {
        try {
          const str = JSON.stringify({ ...responseObj, cached: true });
          if (str.length < 95000) cache.put('BBK_ALL_PUBLIC_DATA', str, CACHE_TTL_SECONDS);
        } catch (err) {}
      }
      return jsonResponse(responseObj);
    }

    if (action === 'getTable') {
      const ss = getSpreadsheet(params.spreadsheetId);
      return jsonResponse({ status: 'SUCCESS', table: params.table, rows: readSheetData(ss, params.table, role) });
    }

    return jsonResponse({ status: 'ERROR', message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'ERROR', message: err.toString() });
  }
}

/**
 * HTTP POST API (เพิ่ม/แก้ไข/ลบข้อมูล, ซิงค์ 17 ตาราง, และอัปโหลดไฟล์เข้า Google Drive)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    const actor = body.actor || { user_id: 'ADMIN', user_name: 'Admin', role: 'ADMIN' };
    const ss = getSpreadsheet(body.spreadsheetId);

    if (action === 'insertRow') {
      const res = insertRowToSheet(ss, body.table, body.row);
      invalidateTableCache(body.table);
      appendAuditLog(ss, actor, 'INSERT', body.table, res.id, 'เพิ่มข้อมูลในตาราง ' + body.table);
      return jsonResponse({ status: 'SUCCESS', result: res });
    }

    if (action === 'updateRow') {
      const res = updateRowInSheet(ss, body.table, body.primaryKey, body.primaryValue, body.row);
      invalidateTableCache(body.table);
      appendAuditLog(ss, actor, 'UPDATE', body.table, body.primaryValue, 'แก้ไขข้อมูลในตาราง ' + body.table);
      return jsonResponse({ status: 'SUCCESS', result: res });
    }

    if (action === 'deleteRow') {
      const res = deleteRowFromSheet(ss, body.table, body.primaryKey, body.primaryValue);
      invalidateTableCache(body.table);
      appendAuditLog(ss, actor, 'DELETE', body.table, body.primaryValue, 'ลบข้อมูลจากตาราง ' + body.table);
      return jsonResponse({ status: 'SUCCESS', result: res });
    }

    if (action === 'bulkSync') {
      const syncedTables = [];
      const payload = body.tables || {};
      Object.keys(payload).forEach((tableName) => {
        if (ALLOWED_TABLES.includes(tableName)) {
          overwriteSheetWithObjects(ss, tableName, payload[tableName]);
          invalidateTableCache(tableName);
          syncedTables.push(tableName);
        }
      });
      appendAuditLog(ss, actor, 'BULK_SYNC', 'ALL_17_TABLES', 'SYNC', 'ซิงค์ฐานข้อมูล 17 ตารางขึ้น Google Sheets');
      return jsonResponse({ status: 'SUCCESS', syncedTables: syncedTables });
    }

    if (action === 'uploadFile') {
      const uploadRes = uploadBase64ToDrive(body.fileName, body.mimeType, body.base64Data, body.folderCategory, body.folderId, body.isPublic !== false);
      appendAuditLog(ss, actor, 'UPLOAD_FILE', 'Google_Drive', uploadRes.fileId, 'อัปโหลดไฟล์ ' + body.fileName);
      return jsonResponse({ status: 'SUCCESS', file: uploadRes });
    }

    return jsonResponse({ status: 'ERROR', message: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'ERROR', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet(spreadsheetId) {
  if (spreadsheetId && String(spreadsheetId).trim() !== '') {
    return SpreadsheetApp.openById(String(spreadsheetId).trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function invalidateTableCache(tableName) {
  try {
    const cache = CacheService.getScriptCache();
    if (tableName) cache.remove('BBK_TBL_' + tableName + '_PUBLIC');
    cache.remove('BBK_ALL_PUBLIC_DATA');
  } catch (e) {}
}

function readSheetData(ss, tableName, requesterRole) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
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

function updateRowInSheet(ss, tableName, pkField, pkValue, rowObj) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return insertRowToSheet(ss, tableName, rowObj);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const pkIndex = headers.indexOf(pkField || headers[0]);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][pkIndex]) === String(pkValue)) {
      const updatedRow = headers.map((h, idx) => (rowObj[h] !== undefined ? rowObj[h] : values[i][idx]));
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
      return { updated: true, id: pkValue };
    }
  }
  return insertRowToSheet(ss, tableName, rowObj);
}

function deleteRowFromSheet(ss, tableName, pkField, pkValue) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return { deleted: false };
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const pkIndex = headers.indexOf(pkField || headers[0]);
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][pkIndex]) === String(pkValue)) {
      sheet.deleteRow(i + 1);
      return { deleted: true, id: pkValue };
    }
  }
  return { deleted: false };
}

function overwriteSheetWithObjects(ss, tableName, objectsArray) {
  let sheet = ss.getSheetByName(tableName);
  if (!sheet) sheet = ss.insertSheet(tableName);
  const headers = SCHEMA_DEFINITION[tableName] || (objectsArray[0] ? Object.keys(objectsArray[0]) : []);
  if (!headers.length) return;
  sheet.clearContents();
  const matrix = [headers];
  objectsArray.forEach((obj) => {
    matrix.push(headers.map((h) => (obj[h] !== undefined && obj[h] !== null ? obj[h] : '')));
  });
  sheet.getRange(1, 1, matrix.length, headers.length).setValues(matrix);
}

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
  if (isPublic) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = file.getId();
  return {
    fileId: fileId,
    fileName: file.getName(),
    viewUrl: 'https://drive.google.com/uc?export=view&id=' + fileId,
    thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId
  };
}

function appendAuditLog(ss, actor, actionType, targetTable, targetId, details) {
  try {
    const sheet = ss.getSheetByName('Audit_Logs');
    if (!sheet) return;
    sheet.appendRow([
      'LOG-' + new Date().getTime(), new Date().toISOString(),
      actor.user_id || 'ADMIN', actor.user_name || 'Admin', actor.role || 'ADMIN',
      actionType, targetTable, targetId, details, 'GAS API', 'SUCCESS'
    ]);
  } catch (e) {}
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
