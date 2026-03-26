// ════════════════════════════════════════════════════════════════
//  api.js — Tất cả giao tiếp với Google Apps Script
//  Không có logic UI ở đây. Chỉ fetch/JSONP/response parsing.
// ════════════════════════════════════════════════════════════════

const API = {

  // ── Kiểm tra GAS đã cấu hình chưa ──────────────────────────
  isConfigured() {
    const url = window.APP_CONFIG.GAS_URL || '';
    return url.includes('script.google.com') && url.includes('/exec');
  },

  // ── Log helper ──────────────────────────────────────────────
  _log(msg) { console.log('[API]', msg) },

  // ── JSONP call (GET) — dùng cho mọi action thông thường ────
  async call(payload, timeoutMs) {
    timeoutMs = timeoutMs || APP_CONFIG.GAS_TIMEOUT_DEFAULT;
    if (!this.isConfigured()) {
      this._log('❌ GAS URL chưa cấu hình');
      return null;
    }
    this._log('→ ' + payload.action + ' (timeout: ' + timeoutMs + 'ms)');
    const t0 = Date.now();

    return new Promise(resolve => {
      const cb  = '_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const enc = encodeURIComponent(JSON.stringify(payload));
      const s   = document.createElement('script');
      let done  = false;

      const finish = (data) => {
        if (done) return;
        done = true;
        delete window[cb];
        s.remove();
        const ms = Date.now() - t0;
        if (data) this._log('✅ ' + payload.action + ' OK (' + ms + 'ms)');
        else      this._log('❌ ' + payload.action + ' FAIL/TIMEOUT (' + ms + 'ms)');
        resolve(data);
      };

      window[cb] = (data) => finish(data);
      s.src      = `${APP_CONFIG.GAS_URL}?data=${enc}&callback=${cb}`;
      s.onerror  = () => { this._log('❌ script error: ' + payload.action); finish(null); };
      setTimeout(() => { if (!done) { this._log('⏱ timeout: ' + payload.action); finish(null); } }, timeoutMs);
      document.head.appendChild(s);
    });
  },

  // ── POST call — dùng cho payload lớn (uploadDocx) ──────────
  async post(payload) {
    if (!this.isConfigured()) return null;
    try {
      const res  = await fetch(APP_CONFIG.GAS_URL, {
        method : 'POST',
        body   : JSON.stringify(payload),
      });
      return await res.json();
    } catch (e) {
      this._log('❌ POST error: ' + e.message);
      return null;
    }
  },

  // ── Kiểm tra kết nối GAS ────────────────────────────────────
  testConnection(onResult) {
    const url = APP_CONFIG.GAS_URL;
    const cb  = '_gastest_' + Date.now();
    const s   = document.createElement('script');
    let   done = false;

    window[cb] = (data) => {
      done = true; delete window[cb]; s.remove();
      onResult(!!data, 'ok');
    };
    s.src    = url + '?callback=' + cb;
    s.onerror = () => { if (!done) { done=true; delete window[cb]; s.remove(); onResult(false, 'error'); } };
    setTimeout(()  => { if (!done) { done=true; delete window[cb]; s.remove(); onResult(false, 'timeout'); } }, 8000);
    document.head.appendChild(s);
  },

  // ══════════════════════════════════════════════════
  //  Các action cụ thể — wrapper có tên rõ ràng
  // ══════════════════════════════════════════════════

  async signup(name, email, msgv, hashedPass) {
    return this.call({ action:'signup', name, email, msgv, pass:hashedPass, timestamp:new Date().toISOString() });
  },

  async login(email, hashedPass) {
    return this.call({ action:'login', email, pass:hashedPass });
  },

  async forgotPass(email) {
    return this.call({ action:'forgotPass', email });
  },

  async requestOTP(email) {
    return this.call({ action:'resetPass', email });
  },

  async changePass(email, { otp, oldPass, newPass }) {
    return this.call({ action:'changePass', email, otp, oldPass, newPass });
  },

  async getMenuData() {
    return this.call({ action:'getMenuData' }, 15000);
  },

  async saveDecuong(data, user, opts) {
    opts = opts || {};
    return this.call({
      action       : 'saveDecuong',
      userEmail    : user.email,
      userName     : user.name || user.email,
      data,
      timestamp    : new Date().toISOString(),
      isUpdate     : opts.isUpdate || false,
      sourceSheetId: opts.sourceSheetId || '',
    }, APP_CONFIG.GAS_TIMEOUT_SAVE);
  },

  async saveDCTQ(data, user) {
    return this.call({
      action    : 'saveDCTQ',
      userEmail : user.email,
      userName  : user.name || user.email,
      data,
      timestamp : new Date().toISOString(),
    }, APP_CONFIG.GAS_TIMEOUT_SAVE);
  },

  async getMyFiles(userEmail) {
    return this.call({ action:'getMyFiles', userEmail });
  },

  async getSheetFiles(user) {
    return this.call({ action:'getSheetFiles', userEmail:user.email, userName:user.name });
  },

  async loadDecuong(sheetId) {
    return this.call({ action:'loadDecuong', sheetId }, 25000);
  },

  // ── Upload Docx lên Drive qua POST ──────────────────────────
  // Dùng fetch POST (không set Content-Type) — GAS nhận được
  // Không bị CORS vì không có preflight khi không có custom header
  async uploadDocx(blob, fileName, type, tenMon, sheetId) {
    if (!this.isConfigured()) return null;
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res(reader.result.split(',')[1]);
        reader.onerror = () => rej(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
      const payload = {
        action  : 'uploadDocx',
        fileName,
        base64,
        tenMon  : (tenMon || '').replace(/\s+/g,'_').substring(0, 40),
        type    : type    || 'sheet',
        sheetId : sheetId || '',
      };
      const res  = await fetch(APP_CONFIG.GAS_URL, {
        method : 'POST',
        body   : JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (e) {
      console.warn('uploadDocx:', e.message);
      return null;
    }
  },
};

window.API = API;
