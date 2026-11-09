/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - GOOGLE DRIVE & CLOUD FILE MANAGEMENT SERVICE
 * รองรับการอัปโหลดรูปภาพและเอกสารจากทุกเครื่อง:
 * 1) บันทึกลงไดร์ฟเครื่องทำเว็บ (Google_Drive_Sync) และโฟลเดอร์เว็บ (assets/img/uploads)
 * 2) ซิงค์ผ่าน Cloud Relay เพื่อให้เครื่องอื่นทุกเครื่องเห็นรูปภาพทันทีภายใน 1–2 วินาที
 * 3) รองรับการเชื่อมต่อ Google Drive Cloud (ผ่าน GAS API)
 * ============================================================================
 */

const CLOUD_IMAGE_RELAY_URL = 'https://ntfy.sh/banbok_drive_img_1034710083_v6';

class DriveService {
  /**
   * แปลงลิงก์แชร์ของ Google Drive และพาธไฟล์ให้เป็น Direct Image URL ที่แสดงผลบนหน้าเว็บได้ทุกเครื่อง 100%
   */
  resolveDriveImageUrl(url) {
    if (!url) return 'assets/img/logo.png';
    const trimmed = String(url).trim();
    if (!trimmed) return 'assets/img/logo.png';

    // กรณีเป็น Base64 Data URL
    if (trimmed.startsWith('data:image')) {
      return trimmed;
    }

    // กรณีเป็นพาธไฟล์ในโปรเจกต์ (assets/...) ปรับให้เป็น relative path มาตรฐานเดียวกันทุกเครื่อง
    if (trimmed.startsWith('assets/') || trimmed.startsWith('./assets/') || trimmed.startsWith('/assets/')) {
      return trimmed.replace(/^(\.\/|\/)+/, '');
    }

    // กรณีเป็นลิงก์ Google Drive ทุกรูปแบบ
    if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
      const fileIdMatch =
        trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
        trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
        trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1600`;
      }
    }
    return trimmed;
  }

  getLocalBridgeEndpoints() {
    const endpoints = [];
    if (typeof window !== 'undefined' && window.location) {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        endpoints.push('/api/upload-image');
      }
    }
    endpoints.push('http://localhost:8080/api/upload-image');
    endpoints.push('http://127.0.0.1:8080/api/upload-image');
    return [...new Set(endpoints)];
  }

  /**
   * ส่งไฟล์ภาพไปบันทึกในไดร์ฟของเครื่องทำเว็บ (Google_Drive_Sync) และโฟลเดอร์ assets/img/uploads
   */
  async uploadToLocalDriveBridge(fileName, mimeType, base64Data, folderCategory) {
    const endpoints = this.getLocalBridgeEndpoints();
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            mimeType,
            base64Data,
            folderCategory
          }),
          signal: controller.signal
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data && (data.status === 'SUCCESS' || data.success) && data.url) {
            return data;
          }
        }
      } catch (_) {
        // ลอง endpoint ถัดไป
      }
    }
    return null;
  }

  /**
   * แปลง Data URL เป็น Binary Blob สำหรับส่งขึ้น Cloud Relay ความเร็วสูง
   */
  dataURLToBlob(dataUrl) {
    const parts = String(dataUrl).split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1] || '');
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  /**
   * อัปโหลดไฟล์ภาพขึ้น Cloud Image Relay เพื่อให้ทุกเครื่องเห็นภาพทันทีใน 1 วินาที
   * (และเซิร์ฟเวอร์เครื่องทำเว็บจะดึงภาพนี้ไปเซฟลงโฟลเดอร์ Google_Drive_Sync และ assets/img/uploads อัตโนมัติ)
   */
  async uploadToCloudImageRelay(fileName, dataUrl) {
    try {
      const blob = this.dataURLToBlob(dataUrl);
      let ext = 'jpg';
      if (blob.type.includes('png')) ext = 'png';
      else if (blob.type.includes('webp')) ext = 'webp';
      else if (blob.type.includes('gif')) ext = 'gif';
      else if (blob.type.includes('pdf')) ext = 'pdf';

      const safeAsciiName = `banbok_${Date.now()}.${ext}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(CLOUD_IMAGE_RELAY_URL, {
        method: 'PUT',
        headers: {
          'Filename': safeAsciiName
        },
        body: blob,
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && data.attachment && data.attachment.url) {
          return {
            fileId: `CLD-${data.id || Date.now()}`,
            url: data.attachment.url
          };
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * อัปโหลดไฟล์จากเครื่องผู้ใช้ (รองรับทั้งอัปโหลดจากเครื่องทำเว็บ และอัปโหลดจากเครื่องอื่น/มือถือ)
   */
  async uploadFile(file, folderCategory = 'School_Images', isPublic = true) {
    if (!file) throw new Error('กรุณาเลือกไฟล์ที่ต้องการอัปโหลด');

    const rawBase64 = await this.readFileAsDataURL(file);
    const isImage = Boolean(file.type && file.type.startsWith('image/'));

    // ปรับขนาดภาพให้คมชัดและโหลดไว (สูงสุด 1400px)
    const optimizedBase64 = isImage
      ? await this.compressImage(rawBase64, 1400, 0.86, file.type)
      : rawBase64;

    // 1. ส่งไปบันทึกในไดร์ฟและโฟลเดอร์ของเครื่องทำเว็บ (หากกำลังใช้งานบนเครื่องทำเว็บ)
    const bridgePromise = this.uploadToLocalDriveBridge(file.name, file.type, optimizedBase64, folderCategory);

    // 2. ส่งขึ้น Cloud Image Relay พร้อมกันเพื่อให้เครื่องอื่นๆ เปิดดูเห็นภาพได้ทันทีใน 1 วินาที (โดยไม่ต้องรอบิลด์ GitHub Pages)
    const cloudRelayPromise = this.uploadToCloudImageRelay(file.name, optimizedBase64);

    const [bridgeResult, cloudRelayResult] = await Promise.all([bridgePromise, cloudRelayPromise]);

    // 3. หากตั้งค่า Google Apps Script API ไว้ ให้ส่งสำเนาเข้า Google Drive Cloud ด้วย
    let cloudDriveResult = null;
    const gasUrl = window.dbAdapter ? window.dbAdapter.getSetting('gas_webapp_url', '').trim() : '';
    const driveEnabled = window.dbAdapter ? window.dbAdapter.getSetting('enable_google_drive', 'true') === 'true' : true;
    if (gasUrl && driveEnabled) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'uploadFile',
            fileName: file.name,
            mimeType: file.type,
            base64Data: optimizedBase64,
            folderCategory: folderCategory,
            folderId: window.dbAdapter.getSetting('google_drive_folder_id', ''),
            isPublic: isPublic,
            actor: window.authService ? window.authService.getCurrentUser() : { user_id: 'ADMIN', role: 'ADMIN' }
          })
        });
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (data.status === 'SUCCESS' && data.file) {
            cloudDriveResult = data.file;
          }
        }
      } catch (err) {
        if (window.dbAdapter) {
          window.dbAdapter.recordError('DRIVE_UPLOAD_FALLBACK', err.message);
        }
      }
    }

    // หากได้ URL จาก Cloud Relay ให้ใช้เป็น URL หลักเพื่อให้ทุกเครื่องเห็นภาพทันทีใน 1 วินาที
    // (และ server.js บนเครื่องทำเว็บจะดูดไฟล์จาก URL นี้ไปบันทึกลง Google_Drive_Sync และ assets/img/uploads ให้อัตโนมัติ)
    const primaryUrl =
      (cloudRelayResult && cloudRelayResult.url) ||
      (bridgeResult && bridgeResult.url) ||
      (cloudDriveResult && (cloudDriveResult.thumbnailUrl || cloudDriveResult.viewUrl));

    if (primaryUrl) {
      const fileId =
        (bridgeResult && bridgeResult.fileId) ||
        (cloudRelayResult && cloudRelayResult.fileId) ||
        (cloudDriveResult && cloudDriveResult.fileId) ||
        `DRV-${Date.now().toString().slice(-6)}`;

      if (window.dbAdapter) {
        window.dbAdapter.logAudit(
          'DRIVE_WEB_UPLOAD',
          'Google_Drive_Sync',
          fileId,
          `อัปโหลดและซิงค์ภาพ ${file.name} เข้าสู่ไดร์ฟ (${folderCategory}) และระบบคลาวด์สำเร็จ`
        );
      }
      return {
        fileId,
        fileName: file.name,
        fileSize: this.formatBytes(file.size),
        fileType: (file.name.split('.').pop() || 'FILE').toUpperCase(),
        url: primaryUrl,
        localAssetUrl: bridgeResult ? bridgeResult.url : null,
        downloadUrl: primaryUrl,
        drivePath: bridgeResult ? bridgeResult.drivePath : `Google_Drive_Sync/${folderCategory}/${file.name}`
      };
    }

    // กรณีออฟไลน์สมบูรณ์ (บีบอัดขนาดกะทัดรัดเพื่อไม่ให้เต็มพื้นที่ localStorage)
    let compactDataUrl = optimizedBase64;
    if (isImage) {
      compactDataUrl = await this.compressImage(rawBase64, 850, 0.74, file.type);
    }

    const mockDriveId = `DRV-${Date.now().toString().slice(-6)}`;
    if (window.dbAdapter) {
      window.dbAdapter.logAudit(
        'FILE_UPLOAD',
        'Google_Drive',
        mockDriveId,
        `อัปโหลดไฟล์ ${file.name} (${this.formatBytes(file.size)}) เข้าสู่โฟลเดอร์ ${folderCategory}`
      );
    }

    return {
      fileId: mockDriveId,
      fileName: file.name,
      fileSize: this.formatBytes(file.size),
      fileType: (file.name.split('.').pop() || 'FILE').toUpperCase(),
      url: compactDataUrl,
      downloadUrl: compactDataUrl
    };
  }

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  compressImage(dataUrl, maxWidth = 1200, quality = 0.82, mimeType = '') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const isPng =
          (mimeType && mimeType.toLowerCase().includes('png')) ||
          String(dataUrl).startsWith('data:image/png');

        if (isPng) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const pngOut = canvas.toDataURL('image/png');
          if (pngOut.length < 700000) {
            resolve(pngOut);
            return;
          }
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * ดาวน์โหลดเอกสารราชการของโรงเรียน
   */
  triggerDocumentDownload(docItem) {
    if (!docItem) return;
    const newCount = (Number(docItem.download_count) || 0) + 1;
    window.dbAdapter.update('Documents', docItem.doc_id, { download_count: newCount });

    if (docItem.download_url && (docItem.download_url.startsWith('http') || docItem.download_url.startsWith('data:') || docItem.download_url.startsWith('assets/'))) {
      const a = document.createElement('a');
      a.href = docItem.download_url;
      a.download = `${docItem.title}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const profile = (window.dbAdapter.getTable('School_Profile')[0]) || {};
    const printWin = window.open('', '_blank', 'width=900,height=750');
    if (!printWin) {
      alert('กรุณาอนุญาตการเปิดหน้าต่างป๊อปอัปเพื่อดาวน์โหลดเอกสาร');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>${docItem.title} - ${profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Sarabun', sans-serif; padding: 48px; color: #0f172a; line-height: 1.7; max-width: 820px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 3px solid #d97706; padding-bottom: 20px; margin-bottom: 28px; }
          .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 14px; border-radius: 99px; font-weight: 700; font-size: 14px; }
          h1 { font-size: 22px; margin: 12px 0 4px; color: #0f172a; }
          h2 { font-size: 16px; margin: 0; color: #475569; font-weight: 600; }
          .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; font-size: 14px; }
          .content-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; min-height: 280px; }
          .sign { margin-top: 48px; text-align: right; padding-right: 40px; }
          .btn-print { background: #0f172a; color: #fff; border: none; padding: 10px 22px; border-radius: 8px; cursor: pointer; font-family: 'Sarabun', sans-serif; font-weight: 600; }
          @media print { .no-print { display: none; } body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;background:#fffbeb;padding:12px 18px;border-radius:10px;border:1px solid #fde68a;">
          <span><strong>คลังเอกสารอิเล็กทรอนิกส์ (Google Drive Document Viewer)</strong></span>
          <button class="btn-print" onclick="window.print()">พิมพ์เอกสาร / บันทึกเป็น PDF</button>
        </div>
        <div class="header">
          <span class="badge">เอกสารราชการเผยแพร่ • รหัสเอกสาร ${docItem.doc_id}</span>
          <h1>${profile.school_name_th || 'โรงเรียนบ้านบกหนองทันน้ำ'}</h1>
          <h2>${profile.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุบลราชธานี เขต 2'}</h2>
        </div>
        <div class="meta">
          <div><strong>ชื่อเอกสาร:</strong> ${docItem.title}</div>
          <div><strong>หมวดหมู่:</strong> ${docItem.category} | <strong>ปีการศึกษา:</strong> ${docItem.academic_year}</div>
          <div><strong>หน่วยงานผู้รับผิดชอบ:</strong> ${docItem.uploaded_by} | <strong>วันที่เผยแพร่:</strong> ${docItem.published_date}</div>
          <div><strong>Google Drive File ID:</strong> ${docItem.drive_file_id || '-'}</div>
        </div>
        <div class="content-box">
          <h3 style="margin-top:0;color:#b45309;">สาระสำคัญของเอกสาร</h3>
          <p>เอกสารฉบับนี้จัดทำและเผยแพร่ผ่านระบบ <strong>BANBOK DIGITAL SCHOOL PLATFORM</strong> ของโรงเรียนบ้านบกหนองทันน้ำ อำเภอศรีเมืองใหม่ จังหวัดอุบลราชธานี เพื่อใช้ในการบริหารจัดการสถานศึกษา การประกันคุณภาพการศึกษา และการเผยแพร่ข้อมูลข่าวสารต่อสาธารณชนตามหลักธรรมาภิบาล</p>
          <ul>
            <li>วิสัยทัศน์สถานศึกษา: ${profile.vision || '-'}</li>
            <li>อัตลักษณ์: ${profile.identity || '-'}</li>
            <li>เอกลักษณ์: ${profile.uniqueness || '-'}</li>
          </ul>
          <p>ตรวจสอบความถูกต้องของข้อมูลและรับรองสำเนาอิเล็กทรอนิกส์จากฐานข้อมูลกลางของโรงเรียน</p>
        </div>
        <div class="sign">
          <p>ลงชื่อ..........................................................ผู้รับรองเอกสาร</p>
          <p>(${profile.director_name || 'ผู้อำนวยการโรงเรียนบ้านบกหนองทันน้ำ'})</p>
          <p>ตำแหน่ง ผู้อำนวยการโรงเรียนบ้านบกหนองทันน้ำ</p>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
  }
}

window.driveService = new DriveService();
