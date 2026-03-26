// ════════════════════════════════════════════════════════════════
//  modules/tonghop/tonghop.js — UI Tổng hợp đề cương
//  Hiển thị trong #mod-tonghop
//  Quyền: Admin và ThuKy
// ════════════════════════════════════════════════════════════════

const TongHopPanel = {

  _currentTab    : 'kiemtra',
  _trichXuatData : null,

  // ── Trạng thái tuần tự ──────────────────────────────────────
  _stepDone : {
    kiemtra  : false,  // bước 1 xong → mở tab tonghop
    tonghop  : false,  // bước 2 xong → mở tab trichxuat
  },

  _unlockTab(tabId) {
    const btn = document.getElementById('thTab-' + tabId);
    if (!btn) return;
    btn.classList.remove('th-tab-locked');
    btn.classList.add('th-tab-unlocked');
    // Cập nhật label bỏ icon khóa
    const labels = { tonghop: '🗂 Sắp xếp & Tổng hợp', trichxuat: '🔍 Trích xuất' };
    if (labels[tabId]) btn.textContent = labels[tabId];
  },

  open() {
    App.show('tonghop');
    this.switchTab('kiemtra');
  },

  switchTab(tab) {
    // Kiểm tra khóa
    if (tab === 'tonghop'   && !this._stepDone.kiemtra) {
      UI.toast('⚠ Vui lòng Kiểm tra nộp đề cương trước.', 'err'); return;
    }
    if (tab === 'trichxuat' && !this._stepDone.tonghop) {
      UI.toast('⚠ Vui lòng hoàn thành Sắp xếp & Tổng hợp trước.', 'err'); return;
    }

    this._currentTab = tab;
    document.querySelectorAll('.th-tab').forEach(el =>
      el.classList.toggle('active', el.dataset.tab === tab));
    document.querySelectorAll('.th-panel').forEach(el =>
      el.classList.toggle('active', el.id === 'thPanel-' + tab));
    if (tab === 'trichxuat') this._loadVerSheets();
  },

  // ════════════════════════════════════════════════════════════
  //  TAB 1: Kiểm tra nộp bài
  // ════════════════════════════════════════════════════════════
  async runKiemTra() {
    this._setLoading('kiemtra', true, 'Đang kiểm tra...');
    const res = await TongHopAPI.kiemTraNopBai();
    this._setLoading('kiemtra', false);
    if (!res || !res.success) { UI.toast('❌ ' + (res?.message || 'Lỗi kết nối'), 'err'); return; }

    const summary = document.getElementById('thKiemTraSummary');
    if (summary) summary.innerHTML = `
      <span class="th-badge green">✅ Đã nộp: ${res.daNop}</span>
      <span class="th-badge red">❌ Chưa nộp: ${res.chuaNop}</span>
      <span class="th-badge gray">Tổng: ${res.total}</span>
    `;

    const tbody = document.getElementById('thKiemTraBody');
    if (!tbody) return;
    tbody.innerHTML = (res.results || []).map(r => `
      <tr>
        <td style="text-align:center">${r.stt}</td>
        <td>${r.maHP}</td>
        <td>${r.tenHP || ''}</td>
        <td><span class="th-badge ${r.nop ? 'green' : 'red'}">${r.trangThai}</span></td>
      </tr>
    `).join('');

    // ✅ Mở khoá tab Sắp xếp & Tổng hợp
    this._stepDone.kiemtra = true;
    this._unlockTab('tonghop');
    UI.toast('✅ Kiểm tra xong! Bạn có thể chuyển sang Sắp xếp & Tổng hợp.', 'ok');
  },

  // ════════════════════════════════════════════════════════════
  //  TAB 2: Sắp xếp + Tổng hợp
  // ════════════════════════════════════════════════════════════
  async runSapXep() {
    if (!confirm('Sắp xếp lại thứ tự học phần theo Trattu_HP?\nLink cũ (cột AA, AB) sẽ bị xóa.')) return;
    this._setLoading('tonghop', true, 'Đang sắp xếp...');
    const res = await TongHopAPI.sapXep();
    this._setLoading('tonghop', false);
    if (!res || !res.success) { UI.toast('❌ ' + (res?.message || 'Lỗi'), 'err'); return; }
    UI.toast('✅ ' + res.message, 'ok');
    if (res.notFound?.length) {
      document.getElementById('thSapXepWarn').textContent =
        '⚠ Không tìm thấy trong Trattu_HP: ' + res.notFound.join(', ');
      document.getElementById('thSapXepWarn').style.display = 'block';
    } else {
      document.getElementById('thSapXepWarn').style.display = 'none';
    }
  },

  async runTongHop() {
    if (!confirm('Bắt đầu tổng hợp?\nQuá trình này sẽ mất vài phút.')) return;
    this._setLoading('tonghop', true, '⏳ Đang tổng hợp — vui lòng chờ...');
    document.getElementById('thTongHopResult').style.display = 'none';
    const res = await TongHopAPI.tongHop();
    this._setLoading('tonghop', false);
    if (!res || !res.success) { UI.toast('❌ ' + (res?.message || 'Lỗi'), 'err'); return; }

    UI.toast('✅ ' + res.message, 'ok');

    // Hiển thị kết quả
    const resultBox = document.getElementById('thTongHopResult');
    resultBox.style.display = 'block';
    document.getElementById('thVerName').textContent     = res.verName;
    document.getElementById('thVerLink').href            = res.verSheetUrl;
    document.getElementById('thFolderDocLink').href      = res.folderDocUrl;
    document.getElementById('thFolderDctqLink').href     = res.folderDctqUrl;
    document.getElementById('thTotalRows').textContent   = res.totalRows;

    // Lưu để download
    this._lastTongHopResult = res;

    // ✅ Mở khoá tab Trích xuất
    this._stepDone.tonghop = true;
    this._unlockTab('trichxuat');
    if (res.warnings?.length) {
      UI.toast(`⚠ Tổng hợp xong nhưng có ${res.warnings.length} lỗi tìm file.`, 'err');
    }
  },

  async downloadTongHop() {
    const res = this._lastTongHopResult;
    if (!res) { UI.toast('Chưa có dữ liệu tổng hợp.', 'err'); return; }
    // Mở sheet để export — Google Sheets có thể export Excel qua URL
    const exportUrl = res.verSheetUrl
      .replace('/edit', '/export?format=xlsx')
      .replace(/#gid=\d+/, '');
    window.open(exportUrl, '_blank');
  },

  // ════════════════════════════════════════════════════════════
  //  TAB 3: Trích xuất
  // ════════════════════════════════════════════════════════════
  async _loadVerSheets() {
    const sel = document.getElementById('thVerSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Đang tải...</option>';
    document.getElementById('thColSelect').innerHTML = '<option value="">— Chọn sheet trước —</option>';
    document.getElementById('thTrichXuatResult').style.display = 'none';

    const res = await TongHopAPI.getVerSheets();
    if (!res || !res.success || !res.sheets?.length) {
      sel.innerHTML = '<option value="">Chưa có sheet Ver_ nào</option>';
      return;
    }
    sel.innerHTML = '<option value="">— Chọn sheet —</option>' +
      res.sheets.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
  },

  async onVerChange(sheetName) {
    const colSel = document.getElementById('thColSelect');
    colSel.innerHTML = '<option value="">Đang tải header...</option>';
    document.getElementById('thTrichXuatResult').style.display = 'none';
    if (!sheetName) { colSel.innerHTML = '<option value="">— Chọn sheet trước —</option>'; return; }

    const res = await TongHopAPI.getVerHeaders(sheetName);
    if (!res || !res.success) { colSel.innerHTML = '<option value="">Lỗi tải header</option>'; return; }
    colSel.innerHTML = '<option value="">— Chọn cột —</option>' +
      res.headers.map(h => `<option value="${h.index}">${h.letter}: ${h.label}</option>`).join('');
  },

  async runTrichXuat() {
    const sheetName = document.getElementById('thVerSelect').value;
    const colIndex  = document.getElementById('thColSelect').value;
    if (!sheetName) { UI.toast('Vui lòng chọn sheet.', 'err'); return; }
    if (colIndex === '') { UI.toast('Vui lòng chọn cột.', 'err'); return; }

    this._setLoading('trichxuat', true, 'Đang trích xuất...');
    const res = await TongHopAPI.trichXuat(sheetName, parseInt(colIndex));
    this._setLoading('trichxuat', false);
    if (!res || !res.success) { UI.toast('❌ ' + (res?.message || 'Lỗi'), 'err'); return; }

    this._trichXuatData = res;
    this._renderTrichXuat(res);
  },

  _renderTrichXuat(res) {
    const resultBox = document.getElementById('thTrichXuatResult');
    resultBox.style.display = 'block';

    document.getElementById('thTrichXuatTitle').textContent =
      `Kết quả trích xuất cột "${res.colHeader}" từ ${res.sheetName}`;

    const tbody = document.getElementById('thTrichXuatBody');
    if (!tbody) return;

    // Tính số phần tối đa
    const maxParts = Math.max(...res.rows.map(r => r.parts.length), 1);

    // Header động
    const thead = document.getElementById('thTrichXuatHead');
    if (thead) {
      let thHtml = '<tr><th>#</th><th>Tên học phần</th><th>Chủ nhiệm HP</th>';
      for (let j = 0; j < maxParts; j++) {
        thHtml += `<th>${res.colHeader}${j > 0 ? ' (' + (j+1) + ')' : ''}</th>`;
      }
      thHtml += '</tr>';
      thead.innerHTML = thHtml;
    }

    tbody.innerHTML = res.rows.map((r, i) => {
      let partCells = '';
      for (let j = 0; j < maxParts; j++) {
        partCells += `<td>${r.parts[j] || ''}</td>`;
      }
      return `<tr>
        <td style="text-align:center">${i+1}</td>
        <td>${r.tenHP || ''}</td>
        <td>${r.tenGV || ''}</td>
        ${partCells}
      </tr>`;
    }).join('');
  },

  downloadTrichXuat() {
    const data = this._trichXuatData;
    if (!data) { UI.toast('Chưa có dữ liệu.', 'err'); return; }

    const maxParts = Math.max(...data.rows.map(r => r.parts.length), 1);

    // Tạo header CSV
    let headers = ['STT', 'Tên học phần', 'Chủ nhiệm HP'];
    for (let j = 0; j < maxParts; j++) {
      headers.push(data.colHeader + (j > 0 ? ' (' + (j+1) + ')' : ''));
    }

    const csvRows = [headers];
    data.rows.forEach((r, i) => {
      const row = [i+1, r.tenHP, r.tenGV];
      for (let j = 0; j < maxParts; j++) row.push(r.parts[j] || '');
      csvRows.push(row);
    });

    // Encode CSV
    const bom     = '\uFEFF'; // UTF-8 BOM để Excel đọc được tiếng Việt
    const csvStr  = bom + csvRows.map(r =>
      r.map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',')
    ).join('\r\n');

    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `TrichXuat_${data.colHeader}_${data.sheetName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Helpers UI ───────────────────────────────────────────────
  _setLoading(tab, isLoading, msg) {
    const el = document.getElementById('thLoading-' + tab);
    if (!el) return;
    el.textContent  = msg || '';
    el.style.display = isLoading ? 'block' : 'none';
    // Disable/enable buttons
    document.querySelectorAll(`#thPanel-${tab} button`).forEach(btn => {
      btn.disabled = isLoading;
    });
  },
};

window.TongHopPanel = TongHopPanel;

// Shortcuts
function openTongHop()              { TongHopPanel.open()                   }
function thSwitchTab(t)             { TongHopPanel.switchTab(t)             }
function thRunKiemTra()             { TongHopPanel.runKiemTra()             }
function thRunSapXep()              { TongHopPanel.runSapXep()              }
function thRunTongHop()             { TongHopPanel.runTongHop()             }
function thDownloadTongHop()        { TongHopPanel.downloadTongHop()        }
function thOnVerChange(v)           { TongHopPanel.onVerChange(v)           }
function thRunTrichXuat()           { TongHopPanel.runTrichXuat()           }
function thDownloadTrichXuat()      { TongHopPanel.downloadTrichXuat()      }
