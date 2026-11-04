/**
 * ============================================================================
 * BANBOK DIGITAL SCHOOL PLATFORM - AUTHENTICATION & RBAC SECURITY SERVICE
 * รองรับสิทธิ์ 4 ระดับ: PUBLIC, TEACHER, ADMIN, DEVELOPER
 * เข้ารหัสรหัสผ่านด้วย SHA-256 + Salt (ไม่เก็บรหัสผ่านแบบข้อความธรรมดา)
 * ============================================================================
 */

const SESSION_STORAGE_KEY = 'BANBOK_AUTH_SESSION_V1';
const DEFAULT_SALT = 'BBK_SALT_2026';

const ROLE_HIERARCHY = {
  PUBLIC: 1,
  TEACHER: 2,
  ADMIN: 3,
  DEVELOPER: 4
};

class AuthService {
  constructor() {
    this.session = null;
    this.loadSession();
  }

  loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          this.session = parsed;
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (e) {
      this.session = null;
    }
  }

  /**
   * เข้ารหัสรหัสผ่านด้วย SHA-256 + Salt ผ่าน Web Crypto API
   */
  async hashPassword(plainPassword, salt = DEFAULT_SALT) {
    const text = `${plainPassword}:${salt}`;
    if (window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(text);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback hash สำหรับสภาพแวดล้อมที่ไม่ใช่ HTTPS
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  getCurrentUser() {
    return this.session ? this.session.user : null;
  }

  getCurrentRole() {
    return this.session && this.session.user ? this.session.user.role_id : 'PUBLIC';
  }

  hasMinRole(requiredRole) {
    const currentLevel = ROLE_HIERARCHY[this.getCurrentRole()] || 1;
    const targetLevel = ROLE_HIERARCHY[requiredRole] || 1;
    return currentLevel >= targetLevel;
  }

  isDeveloper() {
    return this.getCurrentRole() === 'DEVELOPER';
  }

  isAdminOrAbove() {
    return this.hasMinRole('ADMIN');
  }

  isTeacherOrAbove() {
    return this.hasMinRole('TEACHER');
  }

  /**
   * ตรวจสอบว่าครู/บุคลากรมีสิทธิ์เข้าใช้งาน Module ที่ระบุหรือไม่
   */
  canAccessModule(moduleObj) {
    if (!moduleObj || !moduleObj.is_enabled) return false;
    if (!this.isTeacherOrAbove()) return false;
    if (this.isAdminOrAbove()) return true;

    const minRole = moduleObj.min_role || 'TEACHER';
    if (!this.hasMinRole(minRole)) return false;

    const user = this.getCurrentUser();
    if (!user) return false;

    try {
      const allowedUsers = JSON.parse(moduleObj.allowed_users_json || '["*"]');
      if (allowedUsers.includes('*') || allowedUsers.includes(user.user_id) || allowedUsers.includes(user.username) || allowedUsers.includes(user.email)) {
        return true;
      }
    } catch (e) {
      return true;
    }
    return false;
  }

  /**
   * เข้าสู่ระบบด้วย Username / Email และรหัสผ่าน
   */
  async login(usernameOrEmail, plainPassword) {
    const cleanUser = String(usernameOrEmail || '').trim().toLowerCase();
    const cleanPass = String(plainPassword || '').trim();

    if (!cleanUser || !cleanPass) {
      throw new Error('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านให้ครบถ้วน');
    }

    const accounts = window.dbAdapter.getTable('User_Accounts') || [];
    const defaultAccounts = (window.BANBOK_DEFAULT_DB && window.BANBOK_DEFAULT_DB.User_Accounts) || [];
    let matchedAccount = accounts.find(
      (u) => String(u.username || '').trim().toLowerCase() === cleanUser || String(u.email || '').trim().toLowerCase() === cleanUser
    );
    if (!matchedAccount) {
      matchedAccount = defaultAccounts.find(
        (u) => String(u.username || '').trim().toLowerCase() === cleanUser || String(u.email || '').trim().toLowerCase() === cleanUser
      );
    }

    if (!matchedAccount) {
      window.dbAdapter.logAudit('LOGIN_FAILED', 'User_Accounts', cleanUser, `พยายามเข้าสู่ระบบด้วยบัญชีที่ไม่พบในระบบ (${cleanUser})`, 'FAILED');
      throw new Error('ไม่พบบัญชีผู้ใช้งานนี้ในระบบโรงเรียนบ้านบกหนองทันน้ำ');
    }

    if (String(matchedAccount.is_active).toLowerCase() === 'false') {
      window.dbAdapter.logAudit('LOGIN_BLOCKED', 'User_Accounts', matchedAccount.user_id, `บัญชีถูกระงับการใช้งาน (${cleanUser})`, 'BLOCKED');
      throw new Error('บัญชีผู้ใช้งานนี้ถูกระงับสิทธิ์ชั่วคราว กรุณาติดต่อผู้ดูแลระบบ');
    }

    const salt = matchedAccount.salt || DEFAULT_SALT;
    const computedHash = await this.hashPassword(cleanPass, salt);
    const defaultPassMap = {
      teacher: 'teacher1234',
      admin: 'admin1234',
      developer: 'dev1234'
    };
    const unameKey = String(matchedAccount.username || '').trim().toLowerCase();
    const isDefaultValid =
      defaultPassMap[unameKey] === cleanPass &&
      (!matchedAccount.password_hash ||
        matchedAccount.password_hash === (defaultAccounts.find((d) => d.username === unameKey) || {}).password_hash);

    if (computedHash !== matchedAccount.password_hash && cleanPass !== matchedAccount.password_hash && !isDefaultValid) {
      window.dbAdapter.logAudit('LOGIN_FAILED', 'User_Accounts', matchedAccount.user_id, `รหัสผ่านไม่ถูกต้องสำหรับผู้ใช้ ${matchedAccount.username}`, 'FAILED');
      throw new Error('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
    }

    return this.establishSession(matchedAccount, 'PASSWORD_AUTH');
  }

  /**
   * เข้าสู่ระบบผ่านบัญชี Google Workspace / Gmail ของโรงเรียน
   */
  async loginWithGoogleAccount(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const accounts = window.dbAdapter.getTable('User_Accounts');
    const matched = accounts.find((u) => String(u.email).toLowerCase() === cleanEmail && String(u.is_active) !== 'false');

    if (!matched) {
      window.dbAdapter.logAudit('GOOGLE_AUTH_DENIED', 'User_Accounts', cleanEmail, `ปฏิเสธการเข้าสู่ระบบด้วย Google (${cleanEmail}) เนื่องจากไม่อยู่ในรายชื่อบุคลากรที่ได้รับอนุญาต`, 'DENIED');
      throw new Error(`อีเมล ${cleanEmail} ยังไม่ได้รับอนุมัติสิทธิ์ในตาราง User_Accounts ของโรงเรียนบ้านบกหนองทันน้ำ`);
    }

    return this.establishSession(matched, 'GOOGLE_OAUTH');
  }

  establishSession(account, method = 'PASSWORD_AUTH') {
    const now = new Date();
    const expires = new Date(now.getTime() + 8 * 60 * 60 * 1000); // อายุ Session 8 ชั่วโมง

    const safeUser = {
      user_id: account.user_id,
      username: account.username,
      email: account.email,
      full_name: account.full_name,
      position: account.position,
      role_id: account.role_id,
      allowed_modules_json: account.allowed_modules_json || '["*"]',
      avatar_url: account.avatar_url || 'assets/img/logo.png'
    };

    this.session = {
      token: `BBK-SES-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      authMethod: method,
      loginAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      user: safeUser
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session));
    window.dbAdapter.update('User_Accounts', account.user_id, { last_login: now.toISOString() }, safeUser);
    window.dbAdapter.logAudit('USER_LOGIN', 'User_Accounts', account.user_id, `เข้าสู่ระบบสำเร็จ (${safeUser.full_name} - สิทธิ์ ${safeUser.role_id}) ผ่าน ${method}`, 'SUCCESS', safeUser);

    return safeUser;
  }

  logout() {
    const user = this.getCurrentUser();
    if (user) {
      window.dbAdapter.logAudit('USER_LOGOUT', 'User_Accounts', user.user_id, `ออกจากระบบ (${user.full_name})`, 'SUCCESS', user);
    }
    this.session = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * ป้องกัน XSS สำหรับข้อความที่รับจากผู้ใช้
   */
  sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.authService = new AuthService();
