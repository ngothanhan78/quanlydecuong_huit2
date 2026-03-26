// ════════════════════════════════════════════════════════════════
//  form.js — Thu thập, điền, reset dữ liệu form
//  Tất cả logic đọc/ghi DOM form nằm ở đây.
//  Khi thêm field mới: thêm vào FIELD_SCHEMA → hàm này tự xử lý.
// ════════════════════════════════════════════════════════════════

const Form = {

  // ── Helpers DOM ──────────────────────────────────────────────
  _v(id)        { return document.getElementById(id)?.value?.trim() || '' },
  _set(id, val) {
    const el = document.getElementById(id);
    if (!el || val === undefined) return;
    el.value = val || '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  },
  _check(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  },

  // ════════════════════════════════════════════════════════════
  //  collectAll — đọc toàn bộ form → object data
  //  ⚠  Khi thêm field mới: thêm dòng tương ứng ở đây
  //     VÀ khai báo trong field-schema.js
  // ════════════════════════════════════════════════════════════
  collectAll() {
    const v = (id) => this._v(id);
    const c = (id) => document.getElementById(id)?.checked || false;

    // Hình thức giảng dạy — đọc từ checkbox động (class ht-checkbox)
    const hinhThuc = Array.from(
      document.querySelectorAll('.ht-checkbox:checked')
    ).map(el => el.value).filter(Boolean);

    return {
      // ── Mục 1: Thông tin tổng quát ──
      tenViet      : v('tenViet'),
      tenAnh       : v('tenAnh'),
      maHP         : v('maHP'),
      maTuQuan     : v('maTuQuan'),
      hocKy        : v('hocKy'),
      khoaDT       : v('khoaDT'),
      trinhDo      : v('trinhDo'),
      khoiKT       : v('khoiKT'),
      loaiHP       : v('loaiHP'),
      nganhDT      : v('nganhDT'),
      chuyenNganh  : v('chuyenNganh'),
      donVi        : v('donVi'),

      // Tín chỉ & giờ
      tcTong       : v('tcTong'),
      tcLT         : v('tcLT')  || '0',
      tcTH         : v('tcTH')  || '0',
      tietLT       : document.getElementById('tietLT_val')?.value  || '',
      tietTNTH     : document.getElementById('tietTNTH_val')?.value || '',
      gioTuHoc     : document.getElementById('gioTuHoc_val')?.value || '',
      ects         : document.getElementById('ects')?.value         || '',

      // Điều kiện tham gia
      hpTienQuyet  : v('hpTienQuyet'),
      hpTruoc      : v('hpTruoc'),
      hpSongHanh   : v('hpSongHanh'),
      hinhThuc,

      // ── Mục 3: Mô tả ──
      moTa         : v('moTa'),

      // ── Mục 9: Quy định ──
      loaiDK       : v('loaiDK'),
      hpCotLoi     : v('hpCotLoi') || 'no',

      // ── Mục 10-11: Hướng dẫn & Phê duyệt ──
      hkApDung     : v('hkApDung'),
      namHocApDung : v('namHocApDung'),
      pdLanDau     : document.getElementById('pdLanDau')?.checked  || false,
      pdCapNhat    : document.getElementById('pdCapNhat')?.checked  || false,
      pdLanThu     : v('pdLanThu'),
      ngayPD       : v('ngayPD'),
      ngayCapNhat  : v('ngayCapNhat'),
      truongKhoa   : v('truongKhoa'),
      truongBM     : v('truongBM'),
      chunhiem     : v('chunhiem'),

      // Hidden / computed
      phamViNganh  : v('phamViNganh'),
      phamVi       : v('nganhDT') && v('phamViTrinhDo')
                     ? v('nganhDT') + ', ' + v('phamViTrinhDo')
                     : (v('phamViNganh') || ''),
      phamViTrinhDo: v('phamViTrinhDo'),

      // ── Bảng động ──
      giangVien    : this._getGVData(),
      clo          : this._getTableData('cloBody'),
      chuong       : this._getTableData('chuongBody'),
      chiTiet      : this._getTableData('chiTietBody'),
      phuongPhap   : this._getTableData('ppBody'),
      danhGia      : this._getTableData('dgBody'),
      giaoTrinh    : this._getNguonData('gtBody'),
      taiLieu      : this._getNguonData('tlBody'),
      phanMem      : this._getNguonData('pmBody'),
    };
  },

  // ── Đọc bảng Giảng viên ──────────────────────────────────────
  _getGVData() {
    const rows = [];
    document.getElementById('gvBody')?.querySelectorAll('tr').forEach(tr => {
      const tenEl   = tr.querySelector('.gv-ten');
      const emailEl = tr.querySelector('.gv-email');
      const donviEl = tr.querySelector('.gv-donvi');
      if (!tenEl) return;
      rows.push([
        '',                      // hocham (bỏ — đã nhập thẳng vào tên)
        tenEl.value   || '',     // ten
        emailEl?.value || '',    // email
        donviEl?.value || '',    // donvi
      ]);
    });
    return rows;
  },

  // ── Đọc bảng thông thường (input/select/textarea) ───────────
  _getTableData(tbodyId) {
    const rows = [];
    document.getElementById(tbodyId)?.querySelectorAll('tr').forEach(tr => {
      const cells = [];
      tr.querySelectorAll('input,select,textarea').forEach(el => cells.push(el.value || ''));
      rows.push(cells);
    });
    return rows;
  },

  // ── Đọc bảng Nguồn học liệu (chỉ 1 input text/row) ─────────
  _getNguonData(tbodyId) {
    const rows = [];
    document.getElementById(tbodyId)?.querySelectorAll('tr').forEach(tr => {
      const inp = tr.querySelector('input[type=text], input:not([type])');
      if (inp) rows.push(inp.value || '');
    });
    return rows;
  },

  // ════════════════════════════════════════════════════════════
  //  fillForm — điền dữ liệu từ object d vào form
  // ════════════════════════════════════════════════════════════
  fill(d) {
    if (!d) return;
    const s = (id, val) => this._set(id, val);
    const c = (id, val) => this._check(id, val);

    // ── Mục 1 ──
    s('tenViet', d.tenViet); s('tenAnh', d.tenAnh);
    s('maHP',    d.maHP);    s('maTuQuan', d.maTuQuan);
    s('hocKy',   d.hocKy);  s('khoaDT', d.khoaDT);
    s('trinhDo', d.trinhDo);s('khoiKT', d.khoiKT);
    s('loaiHP',  d.loaiHP); s('nganhDT', d.nganhDT);
    s('chuyenNganh', d.chuyenNganh);
    s('donVi',   d.donVi);
    s('tcTong',  d.tcTong); s('tcLT', d.tcLT); s('tcTH', d.tcTH);
    Calc.calcTC();

    // Override calc displays nếu có giá trị đã lưu
    if (d.tietLT) {
      const el  = document.getElementById('tietLT');
      const hid = document.getElementById('tietLT_val');
      if (el)  el.textContent = d.tietLT + ' tiết';
      if (hid) hid.value      = d.tietLT;
    }
    if (d.tietTNTH) {
      const el  = document.getElementById('tietTNTH');
      const hid = document.getElementById('tietTNTH_val');
      if (el)  el.textContent = d.tietTNTH + ' tiết';
      if (hid) hid.value      = d.tietTNTH;
    }
    if (d.gioTuHoc) {
      const el  = document.getElementById('gioTuHoc');
      const hid = document.getElementById('gioTuHoc_val');
      if (el)  el.textContent = d.gioTuHoc + ' giờ';
      if (hid) hid.value      = d.gioTuHoc;
    }
    if (d.ects) {
      const el  = document.getElementById('ectsDisplay');
      const hid = document.getElementById('ects');
      if (el)  el.textContent = d.ects;
      if (hid) hid.value      = d.ects;
    }

    s('hpTienQuyet', d.hpTienQuyet);
    s('hpTruoc',     d.hpTruoc);
    s('hpSongHanh',  d.hpSongHanh);
    s('moTa',        d.moTa);
    s('loaiDK',      d.loaiDK);
    s('hpCotLoi',    d.hpCotLoi || 'no');
    s('hkApDung',    d.hkApDung);
    s('namHocApDung',d.namHocApDung);

    // Hình thức checkboxes
    // Hình thức checkboxes — tick đúng các value khớp
    document.querySelectorAll('.ht-checkbox').forEach(el => {
      el.checked = (d.hinhThuc || []).includes(el.value);
    });

    c('pdLanDau',  d.pdLanDau);
    c('pdCapNhat', d.pdCapNhat);
    s('pdLanThu',  d.pdLanThu);
    s('ngayPD',    d.ngayPD);
    s('ngayCapNhat', d.ngayCapNhat);
    s('truongKhoa', d.truongKhoa);
    s('truongBM',   d.truongBM);
    s('chunhiem',   d.chunhiem);
    s('phamViNganh',d.phamViNganh || '');
    s('phamVi',     d.phamVi      || '');
    s('phamViTrinhDo', d.phamViTrinhDo || '');

    setTimeout(() => { Calc.updateQuyDinh(); Calc.updateHuongDan(); }, 50);
    Calc.syncNganh(d.nganhDT || '');

    // ── Điền bảng động ──
    this._fillByAdd('gvBody',      d.giangVien,  DynRows.addGV.bind(DynRows),      'gv');
    this._fillByAdd('cloBody',     d.clo,        DynRows.addCLO.bind(DynRows));
    this._fillByAdd('chuongBody',  d.chuong,     DynRows.addChuong.bind(DynRows));

    // Tính lại tự học sau khi fill chương
    setTimeout(() => {
      document.querySelectorAll('#chuongBody tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input[type=number]');
        if (inputs.length >= 3) {
          const lt = parseFloat(inputs[0]?.value) || 0;
          const th = parseFloat(inputs[1]?.value) || 0;
          const tu = (lt / 15) * 35 + (th / 30) * 20;
          if (lt || th) inputs[2].value = +tu.toFixed(1) || '';
        }
      });
      Calc.updateChuongSum();
    }, 100);

    this._fillByAdd('chiTietBody', d.chiTiet,    DynRows.addChiTiet.bind(DynRows));
    this._fillByAdd('ppBody',      d.phuongPhap, DynRows.addPP.bind(DynRows));
    this._fillByAdd('dgBody',      d.danhGia,    DynRows.addDG.bind(DynRows));

    // Nguồn học liệu (1 input/row)
    const toStr = r => typeof r === 'string' ? r : (Array.isArray(r) ? (r[1] || r[0] || '') : String(r || ''));
    const fillNguon = (tbodyId, arr, addFn) => {
      document.getElementById(tbodyId).innerHTML = '';
      (arr || []).forEach(r => {
        addFn();
        const tb  = document.getElementById(tbodyId);
        const inp = tb.lastElementChild?.querySelector('input[type=text], input:not([type])');
        if (inp) inp.value = toStr(r);
      });
    };
    fillNguon('gtBody', d.giaoTrinh, DynRows.addGT.bind(DynRows));
    fillNguon('tlBody', d.taiLieu,   DynRows.addTL.bind(DynRows));
    fillNguon('pmBody', d.phanMem,   DynRows.addPM.bind(DynRows));

    this._syncGvDatalist();
  },

  // ── Fill bảng qua hàm addXxx ─────────────────────────────────
  _fillByAdd(tbodyId, dataArr, addFn, mode) {
    document.getElementById(tbodyId).innerHTML = '';
    (dataArr || []).forEach(r => {
      addFn();
      const tb = document.getElementById(tbodyId);
      const tr = tb.lastElementChild;
      if (!tr) return;
      let row = Array.isArray(r) ? [...r] : [r];

      if (mode === 'gv') {
        this._fillGVRow(tr, row);
      } else {
        tr.querySelectorAll('input,select,textarea').forEach((el, i) => {
          if (row[i] !== undefined) {
            el.value = String(row[i] || '');
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      }
    });
  },

  // ── Fill đặc biệt cho dòng GV ────────────────────────────────
  _fillGVRow(tr, row) {
    // Chuẩn hóa format cũ [STT, hocham, ten, email, donvi] → [_, ten, email, donvi]
    if (row.length >= 5) row = [row[1] || '', row[2] || '', row[3] || '', row[4] || ''];
    // row[0] = hocham (bỏ qua), row[1] = ten, row[2] = email, row[3] = donvi
    const ten   = (row[0] && row[1] ? row[0] + ' ' + row[1] : row[1] || row[0] || '').trim();
    const email = row[2] || '';
    const donvi = row[3] || '';

    const tenEl   = tr.querySelector('.gv-ten');
    const emailEl = tr.querySelector('.gv-email');
    const donviEl = tr.querySelector('.gv-donvi');
    if (tenEl)   tenEl.value   = ten;
    if (emailEl) emailEl.value = email;
    if (donviEl) donviEl.value = donvi;
  },

  // ── Sync datalist dl-gv từ tên GV trong bảng ─────────────────
  _syncGvDatalist() {
    const dl = document.getElementById('dl-gv');
    if (!dl) return;
    const existing = new Set(Array.from(dl.querySelectorAll('option')).map(o => o.value));
    document.querySelectorAll('#gvBody tr').forEach(tr => {
      const tenEl = tr.querySelector('.gv-ten');
      if (tenEl) {
        const ten = tenEl.value.trim();
        if (ten && !existing.has(ten)) {
          const opt = document.createElement('option');
          opt.value = ten;
          dl.appendChild(opt);
          existing.add(ten);
        }
      }
    });
  },

  // ════════════════════════════════════════════════════════════
  //  reset — xóa sạch form về trạng thái ban đầu
  // ════════════════════════════════════════════════════════════
  reset() {
    document.querySelectorAll(
      '#mod-form input[type=text], #mod-form input[type=number],' +
      '#mod-form input[type=email], #mod-form input[type=date],' +
      '#mod-form textarea, #mod-form select'
    ).forEach(el => {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    document.querySelectorAll('#mod-form input[type=checkbox]').forEach(el => el.checked = false);

    // Reset calc displays
    ['tietLT','tietTNTH','gioTuHoc','ectsDisplay'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.tagName !== 'INPUT') el.textContent = '—';
    });

    Calc.syncNganh('');
    DynRows.clearAll();
    DynRows.initDefault();
  },

  // ════════════════════════════════════════════════════════════
  //  validate — kiểm tra field bắt buộc trước khi chuyển section
  //  Trả về số field còn trống (0 = hợp lệ)
  // ════════════════════════════════════════════════════════════
  validate(sectionIdx) {
    // Xóa highlight cũ
    document.querySelectorAll('.field-empty').forEach(el => el.classList.remove('field-empty'));
    document.querySelectorAll('.field-empty-label').forEach(el => el.remove());

    let emptyCount = 0;

    // Validate field tĩnh theo FIELD_SCHEMA
    Object.values(FIELD_SCHEMA)
      .filter(f => f.section === sectionIdx && f.required && f.type !== 'hidden')
      .forEach(f => {
        const el = document.getElementById(f.formId);
        if (!el) return;
        const val = el.tagName === 'SELECT' ? el.value : el.value.trim();
        if (!val) {
          el.classList.add('field-empty');
          const hint = document.createElement('span');
          hint.className   = 'field-empty-label';
          hint.textContent = '⚠ Chưa điền';
          el.parentNode.insertBefore(hint, el.nextSibling);
          emptyCount++;
        }
      });

    // Validate bảng động bắt buộc
    const REQUIRED_TABLES = { 1:'gvBody', 3:'cloBody', 4:'chuongBody', 5:'ppBody', 6:'dgBody' };
    const tbodyId = REQUIRED_TABLES[sectionIdx];
    if (tbodyId) {
      const tbody = document.getElementById(tbodyId);
      if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        if (rows.length === 0) {
          emptyCount++;
          UI.toast('⚠️ Bảng chưa có dữ liệu, vui lòng thêm ít nhất 1 dòng!', 'err');
        } else {
          rows.forEach(row => {
            row.querySelectorAll('input:not([type=hidden]), select').forEach(el => {
              if (el.style.width === '55px') return; // bỏ qua % nhỏ
              const val = el.tagName === 'SELECT' ? el.value : el.value.trim();
              if (!val) { el.classList.add('field-empty'); emptyCount++; }
            });
          });
        }
      }
    }

    return emptyCount;
  },

  // ════════════════════════════════════════════════════════════
  //  validateFinal — validate toàn bộ required fields trước khi submit
  // ════════════════════════════════════════════════════════════
  validateFinal() {
    const REQUIRED = [
      { id:'tenViet', label:'Tên học phần (Tiếng Việt)' },
      { id:'maHP',    label:'Mã học phần' },
      // chunhiem: tự động điền theo email đăng nhập, không bắt buộc nhập tay
    ];
    return REQUIRED.filter(f => {
      const el = document.getElementById(f.id);
      return !el || !el.value.trim();
    });
  },
};

window.Form = Form;

// ── Shortcut toàn cục (dùng trong HTML) ─────────────────────────
function collectAllData() { return Form.collectAll() }
function fillForm(d)       { Form.fill(d)             }
function resetForm()       { Form.reset()             }
