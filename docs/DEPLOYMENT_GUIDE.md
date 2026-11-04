# คู่มือการติดตั้งและเชื่อมต่อระบบ Google Ecosystem (Phase 10: Deployment & Security Guide)
## โครงการ: BANBOK DIGITAL SCHOOL PLATFORM
**โรงเรียนบ้านบกหนองทันน้ำ สำนักงานเขตพื้นที่การศึกษาประถมศึกษาอุบลราชธานี เขต 2**

---

## 1. การติดตั้งฐานข้อมูล Google Sheets 17 ตาราง และ Google Drive อัตโนมัติ

1. เข้าสู่บัญชี Google Workspace หรือ Gmail ของโรงเรียน แล้วสร้างไฟล์ **Google Sheets** ใหม่ ตั้งชื่อว่า `BANBOK_DIGITAL_SCHOOL_DB`
2. ไปที่เมนูด้านบน **Extensions (ส่วนขยาย) > Apps Script**
3. สร้างไฟล์สคริปต์ 2 ไฟล์ในโปรเจกต์ Apps Script:
   - คัดลอกโค้ดทั้งหมดจาก [`backend/SetupDatabase.gs`](../backend/SetupDatabase.gs) ไปวางในไฟล์ `SetupDatabase.gs`
   - คัดลอกโค้ดทั้งหมดจาก [`backend/Code.gs`](../backend/Code.gs) ไปวางในไฟล์ `Code.gs`
4. เลือกฟังก์ชัน `setupBanbokDatabaseAndDrive` จากแถบด้านบน แล้วกดปุ่ม **Run (เรียกใช้)**
   - ระบบจะขอสิทธิ์เข้าถึง Google Sheets และ Google Drive (กด Allow / อนุญาต)
   - ระบบจะสร้างตารางทั้ง **17 ตาราง** พร้อมหัวตารางสีกรมท่า-ทอง และสร้างโฟลเดอร์จัดเก็บไฟล์บน **Google Drive** ทั้ง 6 หมวดหมู่อัตโนมัติ

---

## 2. การเผยแพร่ Backend API (Google Apps Script Web App)

1. ในหน้าจอ Google Apps Script กดปุ่ม **Deploy (การทำให้ใช้งานได้) > New deployment (การทำให้ใช้งานได้รายการใหม่)**
2. เลือกประเภทเป็น **Web app (เว็บแอป)**
3. ตั้งค่าดังนี้:
   - **Description**: `BANBOK Digital School Platform API v1`
   - **Execute as (ดำเนินการในฐานะ)**: `Me (บัญชีผู้ดูแลระบบโรงเรียน)`
   - **Who has access (ผู้ที่มีสิทธิ์เข้าถึง)**: `Anyone (ทุกคน)` เพื่อให้หน้าเว็บไซต์เรียกอ่านข้อมูลสาธารณะได้ (ส่วนการเพิ่ม/ลบ/แก้ไขมีระบบตรวจสอบสิทธิ์ RBAC ใน `Code.gs` กำกับทุกครั้ง)
4. กด **Deploy** แล้วคัดลอก **Web App URL (`https://script.google.com/macros/s/.../exec`)**

---

## 3. การผูกระบบเข้ากับหน้าเว็บไซต์ผ่าน Developer Console

1. เปิดเว็บไซต์ **BANBOK DIGITAL SCHOOL PLATFORM** (`index.html`)
2. คลิกปุ่ม **เข้าสู่ระบบ** มุมขวาบน แล้วเข้าสู่ระบบด้วยบัญชี **Developer**:
   - **Username**: `developer`
   - **Password**: `dev1234`
3. เข้าสู่เมนู **Dev Console** > แท็บ **2. ตั้งค่า Google API & Apps Script**
4. วาง **Google Apps Script Web App URL** และ **Spreadsheet ID** แล้วกด **บันทึกการตั้งค่า API Configuration**
5. กดปุ่ม **อัปโหลดข้อมูลทั้ง 17 ตารางขึ้น Google Sheets (Push Sync)** เพื่อส่งข้อมูลตั้งต้นทั้งหมดของโรงเรียนบ้านบกหนองทันน้ำขึ้นไปเก็บใน Google Sheets ทันที

---

## 4. บัญชีผู้ใช้งานเริ่มต้นสำหรับทดสอบสิทธิ์ทั้ง 4 ระดับ (RBAC)

| ระดับสิทธิ์ (Role) | ชื่อผู้ใช้งาน (Username) | รหัสผ่าน (Password) | การเข้ารหัสในฐานข้อมูล | สิทธิ์การเข้าถึง |
| :--- | :--- | :--- | :--- | :--- |
| **1. Public User** | *(ไม่ต้องเข้าสู่ระบบ)* | - | - | เข้าชมหน้าเว็บไซต์หลัก ข้อมูลโรงเรียน บุคลากร ข่าวสาร เอกสารสาธารณะ และ Dashboard สถิติ |
| **2. Teacher & Staff** | `teacher` | `teacher1234` | SHA-256 + Salt | เข้าใช้งานเมนู **"ระบบบริการดิจิทัลสำหรับครูและบุคลากร"** (Module 01 – 08+) และดาวน์โหลดแบบฟอร์มภายใน |
| **3. Administrator** | `admin` | `admin1234` | SHA-256 + Salt | เข้าใช้งาน **Admin CMS Dashboard** เพิ่ม/ลบ/แก้ไขข้อมูลทั้ง 17 ตาราง, จัดการ Module ครู, และปรับแต่งธีมสีเว็บไซต์ |
| **4. Developer** | `developer` | `dev1234` | SHA-256 + Salt | เข้าใช้งาน **Developer Console** ตั้งค่า Google API, ตรวจสอบสถานะระบบ, ดู Audit Logs และสำรองฐานข้อมูล |
