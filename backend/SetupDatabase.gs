/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - DATABASE & DRIVE AUTO-INITIALIZER
 * โรงเรียนบ้านบกหนองทันน้ำ (สพป.อุบลราชธานี เขต 2)
 * ============================================================================
 * วิธีใช้งาน:
 * 1. สร้างไฟล์ Google Sheets ใหม่ แล้วเปิดเมนู Extensions > Apps Script
 * 2. วางไฟล์ SetupDatabase.gs และ Code.gs ลงในโปรเจกต์
 * 3. เลือกฟังก์ชัน setupBanbokDatabaseAndDrive() แล้วกด Run เพื่อสร้างตารางทั้ง 17 ตาราง
 *    พร้อมโฟลเดอร์ Google Drive อัตโนมัติ
 */

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

/**
 * ฟังก์ชันหลักสำหรับสร้างฐานข้อมูล Google Sheets ทั้ง 17 ตาราง และโฟลเดอร์ Google Drive
 */
function setupBanbokDatabaseAndDrive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date().toISOString();

  // 1. สร้างตารางทั้ง 17 ตารางพร้อมจัดรูปแบบหัวตาราง
  Object.keys(SCHEMA_DEFINITION).forEach((sheetName) => {
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

  // 2. สร้างโครงสร้างโฟลเดอร์ Google Drive สำหรับจัดเก็บไฟล์ของโรงเรียน
  const driveFolders = createSchoolDriveStructure();

  // 3. บันทึกค่า Folder IDs ลงในตาราง System_Settings
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

  // 4. บันทึก Audit Log เริ่มต้น
  const auditSheet = ss.getSheetByName('Audit_Logs');
  if (auditSheet) {
    auditSheet.appendRow([
      'LOG-' + new Date().getTime(),
      now,
      'USR-DEV-001',
      'System Installer',
      'DEVELOPER',
      'INITIALIZE_DATABASE',
      'ALL_17_TABLES',
      ss.getId(),
      'สร้างโครงสร้างฐานข้อมูล 17 ตารางและโฟลเดอร์ Google Drive สำเร็จ',
      'Google Apps Script Engine',
      'SUCCESS'
    ]);
  }

  return {
    status: 'SUCCESS',
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    driveFolders: driveFolders,
    tablesCreated: Object.keys(SCHEMA_DEFINITION)
  };
}

/**
 * สร้างโฟลเดอร์จัดเก็บไฟล์บน Google Drive แยกตามหมวดหมู่
 */
function createSchoolDriveStructure() {
  const rootFolderName = 'BANBOK_DIGITAL_SCHOOL_STORAGE';
  let rootFolder;
  const existingRoots = DriveApp.getFoldersByName(rootFolderName);
  if (existingRoots.hasNext()) {
    rootFolder = existingRoots.next();
  } else {
    rootFolder = DriveApp.createFolder(rootFolderName);
  }

  const subFolderNames = [
    'School_Images',
    'Activity_Photos',
    'Official_Documents',
    'Personnel_Photos',
    'News_Attachments',
    'System_Backups'
  ];

  const subFolders = {};
  subFolderNames.forEach((name) => {
    const iter = rootFolder.getFoldersByName(name);
    if (iter.hasNext()) {
      subFolders[name] = iter.next().getId();
    } else {
      const created = rootFolder.createFolder(name);
      subFolders[name] = created.getId();
    }
  });

  return {
    rootId: rootFolder.getId(),
    rootUrl: rootFolder.getUrl(),
    subFolders: subFolders
  };
}
