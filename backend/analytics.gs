/**
 * =====================================================================
 *  HIHOEDU ANALYTICS BACKEND  (Google Apps Script)
 * =====================================================================
 *  - Nhận sự kiện từ js/tracker.js (doPost) và lưu vào sheet "Events"
 *  - Trả dữ liệu cho trang quản trị admin/ (doGet, cần ADMIN_KEY)
 *
 *  CÁCH CÀI ĐẶT (xem chi tiết trong HUONG_DAN_ANALYTICS.md):
 *   1. Tạo 1 Google Sheet MỚI (vd: "HihoEdu Analytics")
 *   2. Tiện ích mở rộng > Apps Script > dán toàn bộ file này vào
 *   3. Chọn hàm "setup" > bấm Chạy (Run) > cấp quyền
 *      -> Xem ADMIN_KEY trong Nhật ký thực thi (Execution log)
 *   4. Triển khai (Deploy) > Tùy chọn triển khai mới > Ứng dụng web
 *      - Thực thi dưới dạng: Tôi (Me)
 *      - Người có quyền truy cập: Bất kỳ ai (Anyone)
 *   5. Copy link Web App (.../exec) dán vào js/tracker.js và trang admin
 * =====================================================================
 */

var CONFIG = {
  SHEET_EVENTS: 'Events',
  MAX_BATCH: 60,          // tối đa số sự kiện / 1 lần gửi
  MAX_ROWS_RESPONSE: 250000
};

// Thứ tự cột trong sheet Events (KHÔNG đổi thứ tự sau khi đã có dữ liệu)
var COLS = ['ts', 'event', 'vid', 'sid', 'page', 'pid', 'pname', 'value',
  'ref', 'source', 'medium', 'campaign', 'device', 'browser', 'os',
  'screen', 'lang', 'new', 'meta'];

var ALLOWED_EVENTS = {
  page_view: 1, engage: 1, product_view: 1, product_click: 1,
  add_to_cart: 1, remove_from_cart: 1, begin_checkout: 1,
  purchase: 1, purchase_paid: 1, search: 1, contact_click: 1,
  perf: 1, js_error: 1
};

/** Chạy 1 lần để tạo sheet + sinh ADMIN_KEY */
function setup() {
  var sh = getEventsSheet_();
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_KEY')) {
    props.setProperty('ADMIN_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 16));
  }
  SpreadsheetApp.getActiveSpreadsheet().setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
  Logger.log('✅ Đã tạo sheet: ' + sh.getName());
  Logger.log('🔑 ADMIN_KEY của bạn (dùng để đăng nhập trang admin): ' + props.getProperty('ADMIN_KEY'));
}

/** Đổi ADMIN_KEY mới (nếu lỡ lộ key) */
function resetAdminKey() {
  var key = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', key);
  Logger.log('🔑 ADMIN_KEY mới: ' + key);
}

function getEventsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.SHEET_EVENTS);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.SHEET_EVENTS);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold').setBackground('#0B132B').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clip_(v, n) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  return s.length > n ? s.slice(0, n) : s;
}

/* ------------------------------------------------------------------ */
/*  NHẬN SỰ KIỆN TỪ WEBSITE                                            */
/* ------------------------------------------------------------------ */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, error: 'empty' });
    var body = JSON.parse(e.postData.contents);
    var ctx = body.ctx || {};
    var events = Array.isArray(body.events) ? body.events.slice(0, CONFIG.MAX_BATCH) : [];
    var now = Date.now();
    var rows = [];

    for (var i = 0; i < events.length; i++) {
      var ev = events[i] || {};
      if (!ALLOWED_EVENTS[ev.event]) continue;
      var ts = Number(ev.ts) || now;
      if (Math.abs(ts - now) > 6 * 3600 * 1000) ts = now; // chống sai giờ máy khách
      var meta = ev.meta ? clip_(JSON.stringify(ev.meta), 3000) : '';
      rows.push([
        ts,
        clip_(ev.event, 32),
        clip_(ctx.vid, 40),
        clip_(ctx.sid, 40),
        clip_(ev.page || ctx.page, 120),
        clip_(ev.pid, 60),
        clip_(ev.pname, 200),
        Number(ev.value) || 0,
        clip_(ctx.ref, 200),
        clip_(ctx.source, 60),
        clip_(ctx.medium, 40),
        clip_(ctx.campaign, 100),
        clip_(ctx.device, 16),
        clip_(ctx.browser, 30),
        clip_(ctx.os, 30),
        clip_(ctx.screen, 16),
        clip_(ctx.lang, 10),
        ctx['new'] ? 1 : 0,
        meta
      ]);
    }
    if (!rows.length) return json_({ ok: true, n: 0 });

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var sh = getEventsSheet_();
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, COLS.length).setValues(rows);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, n: rows.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ------------------------------------------------------------------ */
/*  TRẢ DỮ LIỆU CHO TRANG ADMIN                                        */
/* ------------------------------------------------------------------ */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'ping') return json_({ ok: true, service: 'hihoedu-analytics' });

  var key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || p.key !== key) return json_({ ok: false, error: 'unauthorized' });

  if (p.action === 'events') {
    var from = Number(p.from) || 0;
    var to = Number(p.to) || Date.now();
    return json_(readEvents_(from, to));
  }
  if (p.action === 'stats') {
    var sh = getEventsSheet_();
    return json_({ ok: true, totalRows: Math.max(0, sh.getLastRow() - 1) });
  }
  return json_({ ok: false, error: 'unknown action' });
}

function readEvents_(from, to) {
  var sh = getEventsSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { ok: true, cols: COLS, rows: [] };

  // Cột ts gần như tăng dần -> tìm dòng bắt đầu bằng binary search để đọc ít dữ liệu hơn
  var tsCol = sh.getRange(2, 1, last - 1, 1).getValues();
  var lo = 0, hi = tsCol.length;
  var safeFrom = from - 10 * 60 * 1000; // lùi 10 phút phòng sự kiện đến trễ
  while (lo < hi) {
    var mid = (lo + hi) >> 1;
    if (Number(tsCol[mid][0]) < safeFrom) lo = mid + 1; else hi = mid;
  }
  var startIdx = Math.max(0, lo - 200);
  var count = tsCol.length - startIdx;
  if (count <= 0) return { ok: true, cols: COLS, rows: [] };

  var data = sh.getRange(2 + startIdx, 1, count, COLS.length).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var ts = Number(data[i][0]);
    if (ts >= from && ts <= to) out.push(data[i]);
    if (out.length >= CONFIG.MAX_ROWS_RESPONSE) break;
  }
  return { ok: true, cols: COLS, rows: out };
}

/* ------------------------------------------------------------------ */
/*  BẢO TRÌ: chuyển dữ liệu cũ sang sheet lưu trữ (tùy chọn)           */
/*  Có thể đặt Trigger chạy hàng tháng: Kích hoạt > Thêm trình kích hoạt */
/* ------------------------------------------------------------------ */
function archiveOldEvents() {
  var KEEP_DAYS = 400;
  var sh = getEventsSheet_();
  var last = sh.getLastRow();
  if (last < 2) return;
  var cutoff = Date.now() - KEEP_DAYS * 86400000;
  var ts = sh.getRange(2, 1, last - 1, 1).getValues();
  var n = 0;
  while (n < ts.length && Number(ts[n][0]) < cutoff) n++;
  if (!n) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = 'Archive_' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var ar = ss.getSheetByName(name) || ss.insertSheet(name);
  var rows = sh.getRange(2, 1, n, COLS.length).getValues();
  ar.getRange(1, 1, 1, COLS.length).setValues([COLS]);
  ar.getRange(ar.getLastRow() + 1, 1, rows.length, COLS.length).setValues(rows);
  sh.deleteRows(2, n);
  Logger.log('Đã lưu trữ ' + n + ' dòng vào ' + name);
}
