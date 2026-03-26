// ════════════════════════════════════════════════════════════════
//  app.js — Điều phối toàn bộ ứng dụng
//  - App: quản lý module (dashboard / form / library / admin)
//  - UI: toast, modal, GAS config widget
//  - FormState: draft, edit mode
//  - Navigation: goTo, highlightEmpty
//  - Hooks khởi động
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  UI — helpers hiển thị
// ════════════════════════════════════════════════════════════════
const UI = {

  _toastTimer: null,

  toast(msg, type) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className   = 'toast ' + (type || '');
    clearTimeout(this._toastTimer);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('show'));
    });
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  },

  updateGasStatus(msg, type) {
    const el = document.getElementById('gasStatus');
    if (!el) return;
    if (!msg) {
      const url = APP_CONFIG.GAS_URL || '';
      if (!url || !url.includes('script.google.com')) {
        el.textContent = '⚠ Chưa có URL';
        el.style.color = 'rgba(200,144,42,.8)';
      } else {
        const short = url.substring(url.indexOf('/s/')+3, url.indexOf('/s/')+13) + '...';
        el.textContent = '● ' + short;
        el.style.color = 'rgba(255,255,255,.3)';
      }
      return;
    }
    el.textContent = msg;
    el.style.color = type==='ok' ? 'var(--success)' : type==='err' ? 'var(--danger)' : 'rgba(255,255,255,.5)';
  },

  previewGasUrl(val) {
    const el = document.getElementById('gasUrlInput');
    const ok = val.includes('script.google.com') && val.includes('/exec');
    el.className = val ? (ok ? 'ok' : 'err') : '';
  },

  saveGasUrl() {
    const val = document.getElementById('gasUrlInput').value.trim();
    if (!val)                                          { this.updateGasStatus('Chưa nhập URL','err'); return; }
    if (!val.includes('script.google.com') || !val.includes('/exec')) { this.updateGasStatus('URL không hợp lệ','err'); return; }
    APP_CONFIG.GAS_URL = val;
    window._GAS_URL    = val;
    this.updateGasStatus('✓ Đã lưu — đang test...','ok');
    API.testConnection((ok) => this.updateGasStatus(ok ? '✓ Kết nối OK' : '❌ Lỗi kết nối', ok ? 'ok' : 'err'));
  },
};

window.UI = UI;

function showToast(msg, type)    { UI.toast(msg, type)          }
function updateGasStatus(msg, t) { UI.updateGasStatus(msg, t)   }
function previewGasUrl(v)        { UI.previewGasUrl(v)          }
function saveGasUrl()            { UI.saveGasUrl()               }

// ════════════════════════════════════════════════════════════════
//  App — điều hướng module (tích hợp RBAC)
// ════════════════════════════════════════════════════════════════
const App = {
  // ✅ Thêm 'admin' vào danh sách modules
  modules : ['dashboard', 'library', 'form', 'admin', 'tonghop'],
  current : null,

  show(name) {
    if (!this.modules.includes(name)) { console.warn('App.show: unknown module', name); return; }

    // ✅ Kiểm tra quyền trước khi hiển thị
    if (!RBAC.canAccess(name)) {
      UI.toast('⛔ Bạn không có quyền truy cập chức năng này.', 'err');
      return;
    }

    this.current = name;

    this.modules.forEach(m => {
      document.getElementById('mod-' + m)?.classList.toggle('mod-active', m === name);
    });

    const formItems   = document.getElementById('navFormItems');
    const progressBar = document.querySelector('.progress-bar');
    const isForm      = name === 'form';

    if (formItems)   formItems.style.display   = isForm ? '' : 'none';
    if (progressBar) progressBar.style.display = isForm ? '' : 'none';

    // ✅ Cập nhật active cho tất cả nav items
    document.getElementById('navHome')?.classList.toggle('active', name === 'dashboard');
    document.querySelectorAll('[data-nav-module]').forEach(el => {
      el.classList.toggle('active', el.dataset.navModule === name);
    });

    if (isForm) {
      document.querySelectorAll('#navFormItems .nav-item')
        .forEach((n, i) => n.classList.toggle('active', i === currentSection));
    }

    if (name === 'dashboard') FormState._refreshDraftBar();
    document.getElementById('saveDraftArea')?.style.setProperty('display', isForm ? '' : 'none');
  },
};
window.App = App;

// ════════════════════════════════════════════════════════════════
//  Navigation — section steps trong form
// ════════════════════════════════════════════════════════════════
let currentSection = 0;

function goTo(idx) {
  if (typeof currentSection !== 'undefined' && idx > currentSection) {
    const empty = Form.validate(currentSection);
    if (empty > 0) UI.toast(`⚠️ Còn ${empty} field chưa điền trong mục này!`, 'err');
  }
  if (App.current !== 'form') App.show('form');
  document.querySelectorAll('.section').forEach((s, i) => s.classList.toggle('active', i === idx));
  document.querySelectorAll('#navFormItems .nav-item').forEach((n, i) => n.classList.toggle('active', i === idx));
  currentSection = idx;
  document.getElementById('progressFill').style.width = ((idx+1)/10*100) + '%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goHomeFromForm() {
  const d = Form.collectAll();
  if (d.tenViet || d.maHP || d.moTa) {
    FormState.saveDraft();
    UI.toast('💾 Đã tự lưu nháp', 'ok');
  }
  App.show('dashboard');
}

function startNewForm() {
  FormState.editMode = false; FormState.editLabel = ''; FormState.editSheetId = '';
  document.getElementById('editBadge')?.classList.remove('show');
  Form.reset();
  _resetHoanThanhBtn();
  App.show('form');
  goTo(0);
}

window.goTo           = goTo;
window.goHomeFromForm = goHomeFromForm;
window.startNewForm   = startNewForm;

// ════════════════════════════════════════════════════════════════
//  FormState — draft & edit mode
// ════════════════════════════════════════════════════════════════
const FormState = {
  DRAFT_KEY   : 'dcuong_draft_v2',
  editMode    : false,
  editLabel   : '',
  editSheetId : '',

  saveDraft() {
    const d = Form.collectAll();
    if (!d.tenViet && !d.maHP) return;
    try {
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify({
        data        : d,
        savedAt     : new Date().toISOString(),
        editMode    : this.editMode,
        editLabel   : this.editLabel,
        editSheetId : this.editSheetId,
      }));
      this._updateDraftSavedAt(new Date().toISOString());
    } catch(e) { console.warn('Draft save failed:', e) }
  },

  getDraft() {
    try { return JSON.parse(localStorage.getItem(this.DRAFT_KEY)); } catch(e) { return null; }
  },

  clearDraft() {
    try { localStorage.removeItem(this.DRAFT_KEY); } catch(e) {}
    document.getElementById('draftBar')?.classList.remove('show');
    const el = document.getElementById('draftSavedAt');
    if (el) el.textContent = '';
    document.getElementById('btnSaveDraft')?.classList.remove('saved');
  },

  _updateDraftSavedAt(isoStr) {
    const el = document.getElementById('draftSavedAt');
    if (!el || !isoStr) return;
    const d = new Date(isoStr);
    el.textContent = 'Đã lưu ' + d.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'});
    const btn = document.getElementById('btnSaveDraft');
    if (btn) { btn.classList.add('saved'); setTimeout(() => btn.classList.remove('saved'), 2000); }
  },

  async restoreDraft() {
    const draft = this.getDraft();
    if (!draft) return;
    if (!window._menuLoaded) await loadMenuData();
    Form.fill(draft.data);
    // ✅ Gọi lại auto-fill sau Form.fill
    if (window._giangVienMap) _autoFillChuNhiem(window._giangVienMap);
    if (draft.editMode) {
      this.editMode = true; this.editLabel = draft.editLabel || ''; this.editSheetId = draft.editSheetId || '';
      this._showEditBadge();
    }
    this.clearDraft();
    App.show('form');
    goTo(0);
    UI.toast('✓ Đã khôi phục nháp!', 'ok');
  },

  discardDraft() {
    if (!confirm('Bỏ nháp? Dữ liệu chưa lưu sẽ mất.')) return;
    this.clearDraft();
    UI.toast('Đã xóa nháp.', 'ok');
    this._refreshDraftBar();
  },

  _refreshDraftBar() {
    const bar   = document.getElementById('draftBar');
    const draft = this.getDraft();
    if (!bar) return;
    if (draft && (draft.data?.tenViet || draft.data?.maHP)) {
      const label = draft.data.tenViet || draft.data.maHP || 'Không tên';
      document.getElementById('draftLabel').textContent = label;
      bar.classList.add('show');
    } else {
      bar.classList.remove('show');
    }
  },

  startEdit(sheetId, label) {
    this.editMode = true; this.editLabel = label; this.editSheetId = sheetId;
    this._showEditBadge();
  },

  cancelEdit() {
    if (!confirm('Hủy chỉnh sửa? Mọi thay đổi chưa lưu sẽ mất.')) return;
    this.editMode = false; this.editLabel = ''; this.editSheetId = '';
    document.getElementById('editBadge')?.classList.remove('show');
    Form.reset();
    App.show('dashboard');
  },

  finishEdit() {
    this.editMode = false; this.editLabel = ''; this.editSheetId = '';
    document.getElementById('editBadge')?.classList.remove('show');
    this.clearDraft();
  },

  _showEditBadge() {
    const badge = document.getElementById('editBadge');
    const lbl   = document.getElementById('editBadgeLabel');
    if (lbl)   lbl.textContent = this.editLabel;
    if (badge) badge.classList.add('show');
  },
};
window.FormState = FormState;

function manualSaveDraft() {
  const d = Form.collectAll();
  if (!d.tenViet && !d.maHP) { UI.toast('Form đang trống, chưa có gì để lưu.', 'err'); return; }
  FormState.saveDraft();
  UI.toast('💾 Đã lưu nháp!', 'ok');
}
window.manualSaveDraft = manualSaveDraft;

// ════════════════════════════════════════════════════════════════
//  Library — thư viện đề cương
// ════════════════════════════════════════════════════════════════
const Library = {
  type : null,
  _data: [],

  async open(type) {
    this.type = type;
    const titles = {
      dctq    : '📋 Bản mô tả học phần',
      decuong : '📚 Đề cương chi tiết',
      edit    : '✏️ Chọn version để sửa',
    };
    const titleEl = document.getElementById('libTitle');
    if (titleEl) titleEl.textContent = titles[type] || 'Danh sách file';

    const searchEl = document.getElementById('libSearch');
    if (searchEl) searchEl.value = '';

    this._setState('loading');
    App.show('library');

    if (!API.isConfigured()) { this._setState('error', 'Chưa cấu hình GAS URL'); return; }

    const user    = window._currentUser || {};
    const action  = type === 'edit' ? 'getSheetFiles' : 'getMyFiles';
    const payload = type === 'edit'
      ? { action, userEmail: user.email, userName: user.name }
      : { action: 'getMyFiles', fileType: type, userEmail: user.email };

    const res = await API.call(payload, 30000);
    if (!res) {
      this._setState('error', '❌ Không nhận được phản hồi từ GAS.<br><small>Kiểm tra GAS URL và đã deploy chưa?</small>');
      return;
    }
    if (!res.success) {
      this._setState('error', '❌ ' + (res.message || 'Lỗi không xác định'));
      return;
    }
    this._data = res.files || [];
    this._render(this._data);
  },

  filter() {
    const q = (document.getElementById('libSearch')?.value || '').toLowerCase().trim();
    this._render(q
      ? this._data.filter(r => (r.tenHP||'').toLowerCase().includes(q) || (r.maHP||'').toLowerCase().includes(q))
      : this._data
    );
  },

  _setState(state, msg) {
    const st = document.getElementById('libState');
    const tb = document.getElementById('libTable');
    if (!st) return;
    if (state === 'loading') {
      st.innerHTML = '<p class="lib-state"><span class="icon">⏳</span><br>Đang tải danh sách...</p>';
      st.style.display = 'block'; if (tb) tb.style.display = 'none';
    } else if (state === 'empty') {
      st.innerHTML = '<p class="lib-state"><span class="icon">📂</span><br>Chưa có file nào được lưu</p>';
      st.style.display = 'block'; if (tb) tb.style.display = 'none';
    } else if (state === 'error') {
      st.innerHTML = `<p class="lib-state"><span class="icon">⚠️</span><br>
        <span style="color:var(--danger)">${msg||'Lỗi'}</span><br><br>
        <button onclick="Library.open(Library.type)"
          style="padding:7px 16px;border-radius:6px;border:1.5px solid var(--border);background:#fff;cursor:pointer;font-size:13px;font-weight:600">
          ↺ Thử lại
        </button></p>`;
      st.style.display = 'block'; if (tb) tb.style.display = 'none';
    } else {
      st.style.display = 'none'; if (tb) tb.style.display = 'table';
    }
  },

  _render(rows) {
    if (!rows.length) { this._setState('empty'); return; }
    this._setState('ok');

    const isEdit  = this.type === 'edit';
    const editCol = document.getElementById('libEditCol');
    if (editCol) editCol.style.display = isEdit ? '' : 'none';

    const tbody = document.getElementById('libBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      const linkCell = r.docUrl
        ? `<a class="dl-btn" href="${r.docUrl}" target="_blank">📄 Tải Word</a>`
        : (r.sheetId
          ? `<button class="dl-btn" onclick="Library.exportFromSheet('${r.sheetId}','${this.type}',this)">📄 Xuất Word</button>`
          : `<span style="color:var(--muted);font-size:12px">Chưa có</span>`);

      const editCell = isEdit
        ? (r.sheetId
          ? `<button class="edit-btn" onclick="Library.startEdit('${r.sheetId}','${(r.tenHP||'').replace(/'/g,'')} — ${r.version||''}')">✏️ Sửa</button>`
          : `<span style="color:var(--muted);font-size:12px">N/A</span>`)
        : '';

      tr.innerHTML = `
        <td style="text-align:center;color:var(--muted)">${i+1}</td>
        <td>
          <strong>${r.tenHP||'—'}</strong>
          ${r.maHP ? `<br><span style="color:var(--muted);font-size:12px">${r.maHP}</span>` : ''}
        </td>
        <td><span class="ver-pill">${r.version||'—'}</span></td>
        <td>${linkCell}</td>
        ${isEdit ? `<td>${editCell}</td>` : ''}
      `;
      tbody.appendChild(tr);
    });
  },

  async exportFromSheet(sheetId, type, btn) {
    const origText = btn.textContent;
    btn.textContent = '⏳ Đang tải...';
    btn.disabled = true;
    try {
      if (!window._menuLoaded) await loadMenuData();
      const res = await API.loadDecuong(sheetId);
      if (!res || !res.success) { UI.toast('❌ Không tải được dữ liệu', 'err'); return; }
      Form.fill(res.data);
      await new Promise(r => setTimeout(r, 300));
      if (type === 'dctq') await exportWordDCTQ();
      else                 await exportWord();
      UI.toast('✅ Xuất Word thành công!', 'ok');
    } catch(e) {
      UI.toast('❌ Lỗi xuất Word: ' + e.message, 'err');
    } finally {
      btn.textContent = origText;
      btn.disabled = false;
    }
  },

  async startEdit(sheetId, label) {
    UI.toast('⏳ Đang tải dữ liệu...', 'ok');
    if (!window._menuLoaded) await loadMenuData();
    const res = await API.loadDecuong(sheetId);
    if (!res || !res.success) {
      UI.toast('❌ ' + ((res && res.message) || 'Không tải được dữ liệu'), 'err');
      return;
    }
    Form.reset();
    _resetHoanThanhBtn();
    Form.fill(res.data);
    // ✅ Gọi lại auto-fill sau Form.fill để không bị ghi đè
    if (window._giangVienMap) _autoFillChuNhiem(window._giangVienMap);
    FormState.startEdit(sheetId, label);
    App.show('form');
    goTo(0);
    UI.toast('✓ Đã tải — hãy chỉnh sửa và nhấn Hoàn thành', 'ok');
  },
};
window.Library = Library;

// ── Hướng dẫn sử dụng ────────────────────────────────────────────
function openHuongDan() {
  const url = APP_CONFIG.HUONG_DAN_URL || '#';
  if (url === '#') {
    alert('Chưa cấu hình URL hướng dẫn.\nVui lòng thêm HUONG_DAN_URL vào config/app.config.js');
    return;
  }
  window.open(url, '_blank');
}
window.openHuongDan = openHuongDan;

// ════════════════════════════════════════════════════════════════
//  Menu data từ GAS
// ════════════════════════════════════════════════════════════════
function fillDatalist(id, items) {
  const dl = document.getElementById(id);
  if (!dl || !items || !items.length) return;
  dl.innerHTML = items.map(v => `<option value="${v}">`).join('');
}

function fillSelect(id, items, keepFirst) {
  const el = document.getElementById(id);
  if (!el || !items || !items.length) return;
  const firstOpt = keepFirst ? el.options[0] : null;
  if (firstOpt && firstOpt.text.includes('Đang tải')) firstOpt.text = '-- Chọn --';
  el.innerHTML = '';
  if (firstOpt) el.appendChild(firstOpt);
  items.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    el.appendChild(opt);
  });
}

async function loadMenuData() {
  if (!API.isConfigured()) return;
  const res = await API.getMenuData();
  if (!res || !res.success) return;
  const d = res.data;

  fillDatalist('dl-hocphan-viet', d.hocphanViet  || []);
  fillDatalist('dl-hocphan-anh',  d.hocphanAnh   || []);
  fillDatalist('dl-bomon',        d.donViCongTac || []);
  fillDatalist('dl-gv',           d.giangVien    || []);
  fillDatalist('dl-ppgd',         d.ppgd         || []);
  fillDatalist('dl-ppht',         d.ppht         || []);
  fillDatalist('dl-ppdg',         d.ppdg         || []);
  fillDatalist('dl-truongkhoa',   d.truongKhoa   || []);
  fillDatalist('dl-truongbm',     d.truongBM     || []);
  fillDatalist('dl-chuyennganh',  d.chuyenNganh  || []);
  window._hocphanMap = d.hocphanMap || {};

  if (d.trinhDo && d.trinhDo.length) fillSelect('trinhDo', d.trinhDo);
  if (d.khoiKT  && d.khoiKT.length)  fillSelect('khoiKT',  d.khoiKT,  true);
  if (d.loaiHP  && d.loaiHP.length)  fillSelect('loaiHP',  d.loaiHP);
  if (d.hocKy   && d.hocKy.length)   fillSelect('hocKy',   d.hocKy,   true);
  if (d.khoaDT  && d.khoaDT.length)  fillSelect('khoaDT',  d.khoaDT,  true);

  if (d.hdDanhGia && d.hdDanhGia.length) {
    window._hdDanhGia = d.hdDanhGia;
    const hdOpts = '<option value="">-- Chọn --</option>' +
      d.hdDanhGia.map(v => `<option>${v}</option>`).join('');
    document.querySelectorAll('#dgBody tr').forEach(tr => {
      const sel = tr.querySelector('select');
      if (sel) { const cur = sel.value; sel.innerHTML = hdOpts; if (cur) sel.value = cur; }
    });
  }

  if (d.giangVienMap && Object.keys(d.giangVienMap).length) {
    window._giangVienMap = d.giangVienMap;
    // ── Auto-fill Chủ nhiệm học phần theo email user đăng nhập ──
    _autoFillChuNhiem(d.giangVienMap);
  }

  if (d.hinhThucGD && d.hinhThucGD.length) {
    window._hinhThucGD = d.hinhThucGD;
    _fillHinhThucCheckboxes(d.hinhThucGD);
  }

  if (d.cdrCtdt && d.cdrCtdt.length) {
    window._cdrCtdt = d.cdrCtdt;
    _updatePloOptions(d.cdrCtdt);
  }

  window._menuLoaded = true;
}

// ── Auto-fill + lock field Chủ nhiệm học phần ────────────────────
// Tra email user → tìm trong giangVienMap → điền tên + disable field
function _autoFillChuNhiem(giangVienMap) {
  const el = document.getElementById('chunhiem');
  if (!el) return;

  const userEmail = (window._currentUser?.email || '').trim().toLowerCase();
  if (!userEmail) return;

  // Tìm ngược: giangVienMap có cấu trúc { tenGV: { email, donvi } }
  // Duyệt để tìm tên GV có email khớp với user đang đăng nhập
  let tenGV = '';
  for (const [ten, info] of Object.entries(giangVienMap)) {
    if ((info.email || '').trim().toLowerCase() === userEmail) {
      tenGV = ten;
      break;
    }
  }

  if (tenGV) {
    // Tìm thấy → điền tên và khóa field lại
    el.value    = tenGV;
    el.readOnly = true;
    el.title    = 'Tự động điền theo tài khoản đăng nhập';
    el.style.background = 'var(--surface)';
    el.style.color      = 'var(--muted)';
    el.style.cursor     = 'not-allowed';
  } else {
    // Không tìm thấy → để trống, cho phép nhập tay (Admin hoặc GV chưa có trong sheet)
    el.readOnly = false;
    el.title    = '';
    el.style.background = '';
    el.style.color      = '';
    el.style.cursor     = '';
  }
}
window._autoFillChuNhiem = _autoFillChuNhiem;

function _fillHinhThucCheckboxes(items) {
  const container = document.querySelector('.checkbox-row[data-ht]');
  if (!container) return;
  container.innerHTML = items.map(v =>
    `<label class="checkbox-label">
      <input type="checkbox" class="ht-checkbox" value="${v}"/> ${v}
    </label>`
  ).join('');
}

function _updatePloOptions(items) {
  const opts = '<option value="">PLO</option>' + items.map(v => `<option value="${v}">${v}</option>`).join('');
  document.querySelectorAll('#cloBody select').forEach(sel => { sel.innerHTML = opts; });
  window._ploOptions = opts;
}
window.loadMenuData = loadMenuData;

// ════════════════════════════════════════════════════════════════
//  Hoàn thành — lưu & xuất Word
// ════════════════════════════════════════════════════════════════
let _hoanThanhDone = false;

function _resetHoanThanhBtn() {
  const btn     = document.getElementById('btnHoanThanh');
  const lamTiep = document.getElementById('btnLamTiep');
  if (btn)     { btn.disabled = false; btn.textContent = '✓ Hoàn thành'; }
  if (lamTiep) lamTiep.disabled = true;
  _hoanThanhDone = false;
}

async function doHoanThanh() {
  const missing = Form.validateFinal();
  if (missing.length > 0) {
    const labels = missing.map(f => '• ' + f.label).join('\n');
    alert('⚠ Không thể hoàn thành!\n\nCác thông tin bắt buộc chưa điền:\n' + labels + '\n\nVui lòng quay lại điền đầy đủ.');
    missing.forEach(f => document.getElementById(f.id)?.classList.add('field-empty'));
    const ids = missing.map(f => f.id);
    if (ids.includes('tenViet') || ids.includes('maHP')) goTo(0); else goTo(9);
    return;
  }

  const btn = document.getElementById('btnHoanThanh');
  btn.disabled = true; btn.textContent = '⏳ Đang xử lý...';

  try {
    const d    = Form.collectAll();
    const user = window._currentUser || {};

    if (API.isConfigured()) {
      UI.toast('☁ Đang lưu lên Drive...', 'ok');
      const saveRes = await API.saveDecuong(d, user, {
        isUpdate     : FormState.editMode,
        sourceSheetId: FormState.editSheetId
      });
      if (saveRes && saveRes.spreadsheetId) {
        window._lastSavedSheetId = saveRes.spreadsheetId;
        window._lastSavedVersion = saveRes.version || 1;
      }
      await API.saveDCTQ(d, user);
    }

    UI.toast('📄 Đang tạo file Đề cương chi tiết...', 'ok');
    await exportWord();

    UI.toast('📄 Đang tạo file Bản mô tả học phần...', 'ok');
    try { await exportWordDCTQ(); }
    catch(eW) { console.error('exportWordDCTQ:', eW); UI.toast('⚠ Lỗi xuất DCTQ: ' + eW.message, 'err'); }

    _hoanThanhDone = true;
    FormState.finishEdit();
    FormState.clearDraft();
    document.getElementById('btnLamTiep').disabled = false;
    btn.textContent = '✓ Hoàn thành';
    UI.toast('✓ Đã lưu và tải 2 file Word thành công!', 'ok');
    setTimeout(() => alert(
      '✅ Hoàn thành!\n\n' +
      '• Google Sheet đã lưu lên Drive\n' +
      '• Đề cương chi tiết (.docx) đã tải về + lưu Drive\n' +
      '• Bản mô tả học phần (.docx) đã tải về + lưu Drive\n\n' +
      'Kiểm tra thư mục Downloads!'
    ), 300);

  } catch(e) {
    UI.toast('Lỗi: ' + e.message, 'err');
    console.error('doHoanThanh:', e);
  } finally {
    btn.disabled = false;
    if (btn.textContent === '⏳ Đang xử lý...') btn.textContent = '✓ Hoàn thành';
  }
}

function doLamTiep() {
  if (!_hoanThanhDone) { UI.toast('Vui lòng nhấn Hoàn thành trước!', 'err'); return; }
  if (confirm('Xóa toàn bộ dữ liệu và bắt đầu đề cương mới?')) {
    Form.reset();
    _resetHoanThanhBtn();
    App.show('form'); goTo(0);
    UI.toast('✓ Sẵn sàng nhập đề cương mới!', 'ok');
  }
}

function confirmKetThuc() { document.getElementById('modalKetThuc')?.classList.add('show')   }
function closeModal()     { document.getElementById('modalKetThuc')?.classList.remove('show') }
function doKetThuc()      { closeModal(); Auth.signOut() }

window.doHoanThanh    = doHoanThanh;
window.doLamTiep      = doLamTiep;
window.confirmKetThuc = confirmKetThuc;
window.closeModal     = closeModal;
window.doKetThuc      = doKetThuc;

// ════════════════════════════════════════════════════════════════
//  Màn hình Auth / App toggle — tích hợp RBAC
// ════════════════════════════════════════════════════════════════
function showAuth() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display  = 'none';
}

function showApp(user) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display  = 'block';

  const name   = user.name || user.email.split('@')[0];
  const avatar = name.charAt(0).toUpperCase();
  document.getElementById('userAvatar').textContent = avatar;
  document.getElementById('userName').textContent   = name;

  // ✅ Hiển thị role thay vì email ở badge
  const roleLabels = { Admin: '⚙ Admin', GiangVien: 'Giảng viên', ThuKy: 'Thư ký' };
  document.getElementById('userRole').textContent = roleLabels[user.role] || user.email || '';

  const dashNameEl = document.getElementById('dashName');
  if (dashNameEl) dashNameEl.textContent = name;

  // ✅ Áp dụng RBAC lên toàn bộ DOM ngay khi login
  RBAC.applyToDOM();

  loadMenuData();

  const gasInput = document.getElementById('gasUrlInput');
  if (gasInput) gasInput.value = APP_CONFIG.GAS_URL || '';

  App.show('dashboard');
}

window.showAuth = showAuth;
window.showApp  = showApp;

// ════════════════════════════════════════════════════════════════
//  Khởi động
// ════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  window._GAS_URL = APP_CONFIG.GAS_URL;

  const saved = sessionStorage.getItem('dcUser');
  if (saved) {
    try { window._currentUser = JSON.parse(saved); showApp(window._currentUser); }
    catch(e) { showAuth(); }
  } else {
    showAuth();
  }

  setInterval(() => {
    if (App.current === 'form') {
      const d = Form.collectAll();
      if (d.tenViet || d.maHP) FormState.saveDraft();
    }
  }, 60000);
});
