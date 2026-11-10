const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const DEFAULT_LINE_TOKEN = 'z8ydypnCgcH7Y7Gdk8TvpWJkZusmcxk5Q5xIlA8ZQdrq6bktwRgStmR4R1CHDReMz65XOlhI7RPqkDS1u3185bUDcuJaih3O8CwLuGR7Sy3hVVUQVb8Dx9nG2wAkh4r/VJyApEQnqmHAnlxndzkX7wdB04t89/1O/w1cDnyilFU=';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

let gitSyncTimer = null;
let gitSyncInProgress = false;
let gitSyncPending = false;

/**
 * ซิงค์ไฟล์ภาพและฐานข้อมูลขึ้น GitHub Pages อัตโนมัติเมื่อมีการแก้ไขจากเครื่องทำเว็บ
 * เพื่อให้เครื่องอื่นๆ ที่เปิดลิงก์เว็บไซต์เห็นข้อมูลและรูปภาพล่าสุดตรงกัน 100%
 */
function scheduleAutoGitSync(commitMsg = 'chore(cms): auto-sync database and drive images') {
  if (gitSyncTimer) clearTimeout(gitSyncTimer);
  gitSyncTimer = setTimeout(() => {
    runGitSync(commitMsg);
  }, 2000);
}

function runGitSync(commitMsg) {
  if (gitSyncInProgress) {
    gitSyncPending = true;
    return;
  }
  gitSyncInProgress = true;
  const safeMsg = String(commitMsg).replace(/"/g, '\\"');
  const cmd = `git add -A && git commit -m "${safeMsg}" && git push origin main`;

  exec(cmd, { cwd: ROOT, windowsHide: true }, (err, stdout, stderr) => {
    gitSyncInProgress = false;
    if (err) {
      // หากไม่มีการเปลี่ยนแปลงไฟล์ (nothing to commit) หรือออฟไลน์ชั่วคราว ไม่ต้องแจ้ง error รบกวน
      if (stdout && !stdout.includes('nothing to commit')) {
        console.log('[Auto-Git-Sync Note]', stdout.trim());
      }
      // หากมี commit ค้างแต่ยังไม่ได้ push ให้ลอง push ซ้ำ
      exec('git push origin main', { cwd: ROOT, windowsHide: true }, () => {});
    } else {
      console.log(`[Auto-Git-Sync Success] Pushed latest updates to GitHub Pages: ${safeMsg}`);
    }
    if (gitSyncPending) {
      gitSyncPending = false;
      scheduleAutoGitSync('chore(cms): follow-up auto-sync update');
    }
  });
}

/**
 * บันทึกไฟล์รูปภาพ/เอกสารจาก Base64 ลงใน:
 * 1) assets/img/uploads/<category>/ (เพื่อให้แสดงผลบนเว็บไซต์ทุกเครื่องผ่าน GitHub Pages CDN)
 * 2) Google_Drive_Sync/<category>/ (โฟลเดอร์สำรองข้อมูลไดร์ฟในเครื่องที่ใช้ทำเว็บ และไดร์ฟคลาวด์ในเครื่อง)
 */
function saveBase64ToPhysicalDriveAndAssets(base64DataUrl, folderCategory = 'School_Images', originalFileName = '') {
  if (!base64DataUrl || typeof base64DataUrl !== 'string' || !base64DataUrl.startsWith('data:')) {
    return null;
  }

  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  const base64Payload = match[2];
  const buffer = Buffer.from(base64Payload, 'base64');

  let ext = 'jpg';
  if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('webp')) ext = 'webp';
  else if (mimeType.includes('gif')) ext = 'gif';
  else if (mimeType.includes('svg')) ext = 'svg';
  else if (mimeType.includes('pdf')) ext = 'pdf';

  const safeCategory = String(folderCategory || 'School_Images')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40) || 'School_Images';

  const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 12);
  const cleanOrig = String(originalFileName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 24);
  const fileName = cleanOrig ? `${cleanOrig}_${hash}.${ext}` : `img_${hash}.${ext}`;

  // 1. บันทึกลงใน assets/img/uploads/<safeCategory>/<fileName> สำหรับแสดงผลบนเว็บไซต์ทุกเครื่อง
  const assetsRelDir = path.posix.join('assets', 'img', 'uploads', safeCategory);
  const assetsAbsDir = path.join(ROOT, 'assets', 'img', 'uploads', safeCategory);
  fs.mkdirSync(assetsAbsDir, { recursive: true });
  const assetsAbsFile = path.join(assetsAbsDir, fileName);
  if (!fs.existsSync(assetsAbsFile)) {
    fs.writeFileSync(assetsAbsFile, buffer);
  }

  // 2. บันทึกลงในโฟลเดอร์ Google_Drive_Sync/<safeCategory>/<fileName> ในเครื่องที่ใช้ทำเว็บ
  const driveSyncRelDir = path.posix.join('Google_Drive_Sync', safeCategory);
  const driveSyncAbsDir = path.join(ROOT, 'Google_Drive_Sync', safeCategory);
  try {
    fs.mkdirSync(driveSyncAbsDir, { recursive: true });
    const driveSyncFile = path.join(driveSyncAbsDir, fileName);
    if (!fs.existsSync(driveSyncFile)) {
      fs.writeFileSync(driveSyncFile, buffer);
    }
  } catch (e) {
    console.warn('[Drive Folder Write Warning]', e.message);
  }

  // 3. หากเครื่องที่ใช้ทำเว็บมีการติดตั้ง Google Drive Desktop (เช่น G:\My Drive หรือ OneDrive) ให้คัดลอกไปบันทึกด้วยอัตโนมัติ
  const externalDriveCandidates = [
    'G:\\My Drive\\Banbok_School_Drive',
    'G:\\ไดรฟ์ของฉัน\\Banbok_School_Drive',
    path.join(process.env.USERPROFILE || '', 'Google Drive', 'Banbok_School_Drive'),
    path.join(process.env.USERPROFILE || '', 'OneDrive', 'Banbok_School_Drive')
  ];
  for (const candidateRoot of externalDriveCandidates) {
    try {
      const parentDir = path.dirname(candidateRoot);
      if (parentDir && fs.existsSync(parentDir)) {
        const targetDir = path.join(candidateRoot, safeCategory);
        fs.mkdirSync(targetDir, { recursive: true });
        const targetFile = path.join(targetDir, fileName);
        if (!fs.existsSync(targetFile)) {
          fs.writeFileSync(targetFile, buffer);
        }
      }
    } catch (_) { /* ignore */ }
  }

  const relativeUrl = `${assetsRelDir}/${fileName}`;
  return {
    fileId: `DRV-${hash.toUpperCase()}`,
    fileName,
    relativeUrl,
    drivePath: `${driveSyncRelDir}/${fileName}`,
    sizeBytes: buffer.length
  };
}

/**
 * สแกนฐานข้อมูลทั้งหมด หากพบรูปภาพที่เป็น Base64 ขนาดใหญ่ฝังอยู่
 * ให้แปลงเป็นไฟล์จริงลงในโฟลเดอร์ assets/img/uploads และ Google_Drive_Sync อัตโนมัติ
 * เพื่อป้องกันปัญหา localStorage เต็ม (QuotaExceededError) และทำให้ทุกเครื่องโหลดภาพได้ทันที
 */
function extractEmbeddedBase64FromDatabase(db) {
  if (!db || typeof db !== 'object') return 0;
  let extractedCount = 0;

  const categoryByTable = {
    Gallery: 'Banner_Images',
    Personnel: 'Personnel_Photos',
    News: 'News_Attachments',
    School_Profile: 'School_Profile',
    Documents: 'Official_Documents',
    Activities: 'Activity_Photos',
    Academic_Data: 'Academic_Images',
    System_Settings: 'System_Assets'
  };

  Object.keys(db).forEach((tableName) => {
    if (tableName.startsWith('_')) return;
    const rows = db[tableName];
    if (!Array.isArray(rows)) return;
    const folderCat = categoryByTable[tableName] || 'School_Images';

    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      Object.keys(row).forEach((field) => {
        const val = row[field];
        if (typeof val === 'string' && val.startsWith('data:image/')) {
          const saved = saveBase64ToPhysicalDriveAndAssets(val, folderCat, `${tableName}_${field}`);
          if (saved && saved.relativeUrl) {
            row[field] = saved.relativeUrl;
            extractedCount++;
          }
        }
      });
    });
  });

  return extractedCount;
}

const server = http.createServer((req, res) => {
  // CORS & Private Network Access headers (รองรับการเรียกจากทั้ง localhost และ GitHub Pages HTTPS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);

  // 1. API Endpoint for Image / File Upload to Drive & Web Assets
  if (req.method === 'POST' && cleanUrl === '/api/upload-image') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const bodyData = Buffer.concat(chunks).toString('utf8');
        const payload = JSON.parse(bodyData || '{}');
        const base64Data = payload.base64Data || '';
        const folderCategory = payload.folderCategory || 'School_Images';
        const fileName = payload.fileName || 'uploaded_image.jpg';

        const saved = saveBase64ToPhysicalDriveAndAssets(base64Data, folderCategory, fileName);
        if (!saved) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ status: 'ERROR', success: false, error: 'ข้อมูลไฟล์รูปภาพไม่ถูกต้อง' }));
          return;
        }

        // ซิงค์ไฟล์ภาพขึ้น GitHub Pages เบื้องหลังทันทีเพื่อให้เครื่องอื่นเปิดดูเห็นภาพด้วย
        scheduleAutoGitSync(`chore(drive): upload image ${saved.fileName} to ${folderCategory}`);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          status: 'SUCCESS',
          success: true,
          fileId: saved.fileId,
          fileName: saved.fileName,
          url: saved.relativeUrl,
          downloadUrl: saved.relativeUrl,
          drivePath: saved.drivePath
        }));
      } catch (err) {
        console.error('[Upload Image Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ERROR', success: false, error: err.message }));
      }
    });
    return;
  }

  // 2. API Endpoint for LINE Notification (Server-side relay to bypass browser CORS)
  if (req.method === 'POST' && cleanUrl === '/api/line-notify') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const bodyData = Buffer.concat(chunks).toString('utf8');
        const payload = JSON.parse(bodyData || '{}');
        const token = payload.token || DEFAULT_LINE_TOKEN;
        const targetId = payload.targetId || '';
        const messageText = payload.message || '🔔 แจ้งเตือนจากเว็บไซต์โรงเรียนบ้านบกหนองทันน้ำ';

        const isPush = Boolean(targetId);
        const apiPath = isPush ? '/v2/bot/message/push' : '/v2/bot/message/broadcast';
        const linePayload = JSON.stringify(
          isPush
            ? { to: targetId, messages: [{ type: 'text', text: messageText }] }
            : { messages: [{ type: 'text', text: messageText }] }
        );

        const options = {
          hostname: 'api.line.me',
          port: 443,
          path: apiPath,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': Buffer.byteLength(linePayload)
          }
        };

        const lineReq = https.request(options, (lineRes) => {
          let lineRespData = '';
          lineRes.on('data', (chunk) => { lineRespData += chunk; });
          lineRes.on('end', () => {
            res.writeHead(lineRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: lineRes.statusCode >= 200 && lineRes.statusCode < 300,
              statusCode: lineRes.statusCode,
              lineResponse: lineRespData
            }));
          });
        });

        lineReq.on('error', (err) => {
          console.error('[LINE Relay Error]', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        });

        lineReq.write(linePayload);
        lineReq.end();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 3. API Endpoint for Database Sync (Saves database into data_backup.json & defaultData.js + Auto Git Push)
  if (req.method === 'POST' && (cleanUrl === '/api/sync-database' || cleanUrl === '/api/database')) {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const bodyData = Buffer.concat(chunks).toString('utf8');
        const payload = JSON.parse(bodyData || '{}');
        const db = payload.database || payload;
        if (!db || typeof db !== 'object' || !Array.isArray(db.School_Profile)) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: 'Invalid database payload' }));
          return;
        }

        // แปลงรูปภาพ Base64 หรือลิงก์ชั่วคราวที่อาจฝังอยู่ในตารางต่างๆ ให้เป็นไฟล์จริงถาวรในโฟลเดอร์ไดร์ฟและ assets อัตโนมัติ
        const extractedBase64Count = extractEmbeddedBase64FromDatabase(db);
        const mirroredRelayCount = await mirrorCloudRelayImagesToDrive(db);
        const extractedImagesCount = extractedBase64Count + mirroredRelayCount;

        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        const incomingVersion = (db._meta && Number(db._meta.version)) || 0;
        db._meta = {
          version: Math.max(nowMs, incomingVersion),
          updated_at: nowIso
        };

        if (Array.isArray(payload.tombstones)) {
          db._tombstones = payload.tombstones;
        } else if (!Array.isArray(db._tombstones)) {
          db._tombstones = [];
        }

        // 1. บันทึกลง data_backup.json (สำหรับดึงข้อมูลสดแบบ Real-time ข้ามเครื่อง)
        const backupFile = path.join(ROOT, 'data_backup.json');
        fs.writeFileSync(backupFile, JSON.stringify(db, null, 2), 'utf8');

        // 2. บันทึกลงโฟลเดอร์ Google_Drive_Sync/BANBOK_MASTER_DB_LATEST.json ด้วย
        try {
          const driveDbDir = path.join(ROOT, 'Google_Drive_Sync', 'Database_Backups');
          fs.mkdirSync(driveDbDir, { recursive: true });
          fs.writeFileSync(path.join(driveDbDir, 'BANBOK_MASTER_DB_LATEST.json'), JSON.stringify(db, null, 2), 'utf8');
        } catch (_) {}

        // 3. อัปเดต src/config/defaultData.js เพื่อให้ทุกเครื่องที่เปิดเว็บใหม่ได้รับข้อมูลล่าสุดทันที
        const defaultDataFile = path.join(ROOT, 'src', 'config', 'defaultData.js');
        const header = `/**\n * BANBOK DIGITAL SCHOOL PLATFORM - DEFAULT MASTER DATABASE\n * Updated automatically via Multi-Platform Sync at ${nowIso}\n */\n\n`;
        const fileContent = `${header}window.BANBOK_DEFAULT_DB = ${JSON.stringify(db, null, 2)};\n`;
        fs.writeFileSync(defaultDataFile, fileContent, 'utf8');

        // 4. สั่งซิงค์ขึ้น GitHub Pages เบื้องหลังอัตโนมัติ เพื่อให้เครื่องอื่นเห็นข้อมูลตรงกัน
        scheduleAutoGitSync(`chore(cms): auto-sync web update at ${nowIso}`);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          status: 'SUCCESS',
          message: 'บันทึกฐานข้อมูลและซิงค์ขึ้นระบบออนไลน์สำหรับทุกเครื่องเรียบร้อยแล้ว',
          updated_at: nowIso,
          _meta: db._meta,
          extractedImagesCount,
          database: extractedImagesCount > 0 ? db : undefined
        }));
      } catch (err) {
        console.error('[Database Sync Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 4. API Endpoint to Get Live Master Database
  if (req.method === 'GET' && cleanUrl === '/api/database') {
    try {
      const backupFile = path.join(ROOT, 'data_backup.json');
      if (fs.existsSync(backupFile)) {
        const data = fs.readFileSync(backupFile, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        res.end(data);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, message: 'Using default database' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 5. API Endpoint for Multi-Platform Health & Sync Status
  if (req.method === 'GET' && cleanUrl === '/api/sync-status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      platform: 'BANBOK_DIGITAL_SCHOOL_PLATFORM',
      sync_mode: 'MULTI_PLATFORM_HYBRID_AUTO_GIT_DRIVE',
      server_time: new Date().toISOString(),
      backup_exists: fs.existsSync(path.join(ROOT, 'data_backup.json'))
    }));
    return;
  }

  // 6. Static File Serving
  const relPath = cleanUrl === '/' ? '/index.html' : cleanUrl;
  const filePath = path.join(ROOT, relPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end(content);
  });
});

const CLOUD_DB_SYNC_URL = 'https://ntfy.sh/banbok_db_sync_1034710083_v6';

/**
 * ดึงฐานข้อมูลที่แอดมินแก้ไขจากเครื่องอื่น (ผ่าน Cloud Realtime Sync Hub)
 * มาบันทึกลงไดร์ฟ (Google_Drive_Sync), data_backup.json, defaultData.js และซิงค์ขึ้น GitHub Pages อัตโนมัติ
 */
async function pollCloudRelayAndSyncToDisk() {
  try {
    const res = await fetch(`${CLOUD_DB_SYNC_URL}/json?poll=1&t=${Date.now()}`);
    if (!res.ok) return;
    const text = await res.text();
    if (!text || !text.trim()) return;

    const lines = text.trim().split('\n');
    let latestAttachmentUrl = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const msg = JSON.parse(lines[i]);
        if (msg && msg.attachment && msg.attachment.url) {
          latestAttachmentUrl = msg.attachment.url;
          break;
        }
      } catch (_) {}
    }
    if (!latestAttachmentUrl) return;

    const fileRes = await fetch(latestAttachmentUrl);
    if (!fileRes.ok) return;
    const cloudDb = await fileRes.json();
    if (!cloudDb || !Array.isArray(cloudDb.School_Profile)) return;

    const cloudVer = (cloudDb._meta && Number(cloudDb._meta.version)) || 0;
    const backupFile = path.join(ROOT, 'data_backup.json');
    let localVer = 0;
    if (fs.existsSync(backupFile)) {
      try {
        const localDb = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        localVer = (localDb._meta && Number(localDb._meta.version)) || 0;
      } catch (_) {}
    }

    if (cloudVer <= localVer) return;

    // แปลงรูปภาพ Base64 และดาวน์โหลดรูปภาพที่อัปโหลดมาจากเครื่องอื่นลงโฟลเดอร์ Google_Drive_Sync และ assets/img/uploads
    extractEmbeddedBase64FromDatabase(cloudDb);
    await mirrorCloudRelayImagesToDrive(cloudDb);

    const nowIso = (cloudDb._meta && cloudDb._meta.updated_at) || new Date().toISOString();
    fs.writeFileSync(backupFile, JSON.stringify(cloudDb, null, 2), 'utf8');

    try {
      const driveDbDir = path.join(ROOT, 'Google_Drive_Sync', 'Database_Backups');
      fs.mkdirSync(driveDbDir, { recursive: true });
      fs.writeFileSync(path.join(driveDbDir, 'BANBOK_MASTER_DB_LATEST.json'), JSON.stringify(cloudDb, null, 2), 'utf8');
    } catch (_) {}

    const defaultDataFile = path.join(ROOT, 'src', 'config', 'defaultData.js');
    const header = `/**\n * BANBOK DIGITAL SCHOOL PLATFORM - DEFAULT MASTER DATABASE\n * Updated automatically via Multi-Platform Sync at ${nowIso}\n */\n\n`;
    fs.writeFileSync(defaultDataFile, `${header}window.BANBOK_DEFAULT_DB = ${JSON.stringify(cloudDb, null, 2)};\n`, 'utf8');

    console.log(`[Cloud-to-Local Sync] Synced newer database version ${cloudVer} from remote device.`);
    scheduleAutoGitSync(`chore(cms): auto-sync remote admin update v${cloudVer}`);
  } catch (_) {}
}

/**
 * หากมีการอัปโหลดภาพผ่าน Cloud Relay (https://ntfy.sh/file/...)
 * ให้ดาวน์โหลดไฟล์ภาพมาเก็บสำรองไว้ในโฟลเดอร์ Google_Drive_Sync และ assets/img/uploads ของเครื่องทำเว็บอัตโนมัติ
 */
async function mirrorCloudRelayImagesToDrive(db) {
  if (!db || typeof db !== 'object') return 0;
  let mirroredCount = 0;
  const categoryByTable = {
    Gallery: 'Banner_Images',
    Personnel: 'Personnel_Photos',
    News: 'News_Attachments',
    School_Profile: 'School_Profile',
    Documents: 'Official_Documents',
    Activities: 'Activity_Photos',
    Academic_Data: 'Academic_Images'
  };

  for (const tableName of Object.keys(db)) {
    if (tableName.startsWith('_')) continue;
    const rows = db[tableName];
    if (!Array.isArray(rows)) continue;
    const folderCat = categoryByTable[tableName] || 'School_Images';

    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      for (const field of Object.keys(row)) {
        const val = row[field];
        if (typeof val === 'string' && val.startsWith('https://ntfy.sh/file/')) {
          try {
            const imgRes = await fetch(val);
            if (imgRes.ok) {
              const arrBuf = await imgRes.arrayBuffer();
              const buf = Buffer.from(arrBuf);
              const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
              const dataUrl = `data:${contentType};base64,${buf.toString('base64')}`;
              const saved = saveBase64ToPhysicalDriveAndAssets(dataUrl, folderCat, `${tableName}_${field}`);
              if (saved && saved.relativeUrl) {
                row[field] = saved.relativeUrl;
                mirroredCount++;
              }
            }
          } catch (_) {}
        }
      }
    }
  }
  return mirroredCount;
}

server.listen(PORT, () => {
  console.log(`BANBOK DIGITAL SCHOOL PLATFORM running at http://localhost:${PORT}`);
  pollCloudRelayAndSyncToDisk();
  setInterval(pollCloudRelayAndSyncToDisk, 6000);
});
