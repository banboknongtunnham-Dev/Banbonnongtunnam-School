const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

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
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);

  // API Endpoint for LINE Notification (Server-side relay to bypass browser CORS)
  if (req.method === 'POST' && cleanUrl === '/api/line-notify') {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', () => {
      try {
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

        const lineReq = https.request(options, lineRes => {
          let lineRespData = '';
          lineRes.on('data', chunk => { lineRespData += chunk; });
          lineRes.on('end', () => {
            res.writeHead(lineRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: lineRes.statusCode >= 200 && lineRes.statusCode < 300,
              statusCode: lineRes.statusCode,
              lineResponse: lineRespData
            }));
          });
        });

        lineReq.on('error', err => {
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

  // API Endpoint for Database Sync (Saves localStorage database into defaultData.js)
  if (req.method === 'POST' && cleanUrl === '/api/sync-database') {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(bodyData || '{}');
        const db = payload.database || payload;
        if (!db || typeof db !== 'object') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid database payload' }));
          return;
        }

        // 1. Save JSON snapshot backup
        const backupFile = path.join(ROOT, 'data_backup.json');
        fs.writeFileSync(backupFile, JSON.stringify(db, null, 2), 'utf8');

        // 2. Update defaultData.js
        const defaultDataFile = path.join(ROOT, 'src', 'config', 'defaultData.js');
        const header = `/**\n * BANBOK DIGITAL SCHOOL PLATFORM - DEFAULT MASTER DATABASE\n * Updated automatically via Local Admin Sync at ${new Date().toISOString()}\n */\n\n`;
        const fileContent = `${header}window.BANBOK_DEFAULT_DB = ${JSON.stringify(db, null, 2)};\n`;
        fs.writeFileSync(defaultDataFile, fileContent, 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'บันทึกฐานข้อมูลลงในระบบหลักสำเร็จแล้ว' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
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

server.listen(PORT, () => {
  console.log(`BANBOK DIGITAL SCHOOL PLATFORM running at http://localhost:${PORT}`);
});
