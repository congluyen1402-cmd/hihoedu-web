/**
 * =====================================================================
 *  HIHOEDU / NOHIEDU ANALYTICS BACKEND (Google Apps Script)
 * =====================================================================
 *  TÍCH HỢP TRỰC TIẾP VÀO GOOGLE SHEET HIỆN CÓ
 *  (Link: https://docs.google.com/spreadsheets/d/1mCLapOn3tv0_VzdOSSfcNK-XvKUtkrbe3lKRdcfln4c/edit)
 *
 *  CAM KẾT AN TOÀN TUYỆT ĐỐI CHO DỮ LIỆU CŨ:
 *  - KHÔNG xóa, KHÔNG sửa bất kỳ sheet hay dòng dữ liệu nào hiện có.
 *  - Dữ liệu tracking được lưu riêng hoàn toàn vào tab mới tên: "Analytics_Events".
 *  - Giữ nguyên hoạt động của hệ thống đơn hàng (new_order) và kiểm tra thanh toán (check_status).
 * =====================================================================
 */

var ANALYTICS_CONFIG = {
  SHEET_EVENTS: 'Analytics_Events', // Tab riêng biệt, không đụng vào các sheet cũ
  MAX_BATCH: 60,
  MAX_ROWS_RESPONSE: 250000
};

var ANALYTICS_COLS = [
  'ts', 'event', 'vid', 'sid', 'page', 'pid', 'pname', 'value',
  'ref', 'source', 'medium', 'campaign', 'device', 'browser', 'os',
  'screen', 'lang', 'new', 'meta'
];

var ANALYTICS_ALLOWED_EVENTS = {
  page_view: 1, engage: 1, product_view: 1, product_click: 1,
  add_to_cart: 1, remove_from_cart: 1, begin_checkout: 1,
  purchase: 1, purchase_paid: 1, search: 1, contact_click: 1,
  perf: 1, js_error: 1
};

/**
 * BƯỚC 1: Chạy hàm này 1 lần trong Apps Script để tạo tab "Analytics_Events" và lấy mã ADMIN_KEY
 */
function setupAnalytics() {
  var sh = getAnalyticsEventsSheet_();
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_KEY')) {
    props.setProperty('ADMIN_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 16));
  }
  SpreadsheetApp.getActiveSpreadsheet().setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
  Logger.log('✅ Đã tạo thành công tab riêng: ' + sh.getName() + ' (Các tab cũ được giữ nguyên 100%)');
  Logger.log('🔑 ADMIN_KEY CỦA BẠN (Dùng để xem trang admin): ' + props.getProperty('ADMIN_KEY'));
}

/** Đổi ADMIN_KEY mới nếu cần */
function resetAdminKey() {
  var key = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', key);
  Logger.log('🔑 ADMIN_KEY mới: ' + key);
}

function getAnalyticsEventsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ANALYTICS_CONFIG.SHEET_EVENTS);
  if (!sh) {
    // Chỉ tạo mới tab Analytics_Events, không động đến các sheet khác
    sh = ss.insertSheet(ANALYTICS_CONFIG.SHEET_EVENTS);
    sh.getRange(1, 1, 1, ANALYTICS_COLS.length)
      .setValues([ANALYTICS_COLS])
      .setFontWeight('bold')
      .setBackground('#0B132B')
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function analyticsJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function analyticsClip_(v, n) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  return s.length > n ? s.slice(0, n) : s;
}

/* ------------------------------------------------------------------ */
/*  XỬ LÝ DỮ LIỆU ĐẾN (doPost)                                        */
/* ------------------------------------------------------------------ */
function handleAnalyticsDoPost_(body) {
  try {
    var ctx = body.ctx || {};
    var events = Array.isArray(body.events) ? body.events.slice(0, ANALYTICS_CONFIG.MAX_BATCH) : [];
    var now = Date.now();
    var rows = [];

    for (var i = 0; i < events.length; i++) {
      var ev = events[i] || {};
      if (!ANALYTICS_ALLOWED_EVENTS[ev.event]) continue;
      var ts = Number(ev.ts) || now;
      if (Math.abs(ts - now) > 6 * 3600 * 1000) ts = now;
      var meta = ev.meta ? analyticsClip_(JSON.stringify(ev.meta), 3000) : '';
      rows.push([
        ts,
        analyticsClip_(ev.event, 32),
        analyticsClip_(ctx.vid, 40),
        analyticsClip_(ctx.sid, 40),
        analyticsClip_(ev.page || ctx.page, 120),
        analyticsClip_(ev.pid, 60),
        analyticsClip_(ev.pname, 200),
        Number(ev.value) || 0,
        analyticsClip_(ctx.ref, 200),
        analyticsClip_(ctx.source, 60),
        analyticsClip_(ctx.medium, 40),
        analyticsClip_(ctx.campaign, 100),
        analyticsClip_(ctx.device, 16),
        analyticsClip_(ctx.browser, 30),
        analyticsClip_(ctx.os, 30),
        analyticsClip_(ctx.screen, 16),
        analyticsClip_(ctx.lang, 10),
        ctx['new'] ? 1 : 0,
        meta
      ]);
    }
    if (!rows.length) return analyticsJson_({ ok: true, n: 0 });

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var sh = getAnalyticsEventsSheet_();
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, ANALYTICS_COLS.length).setValues(rows);
    } finally {
      lock.releaseLock();
    }
    return analyticsJson_({ ok: true, n: rows.length });
  } catch (err) {
    return analyticsJson_({ ok: false, error: String(err) });
  }
}

/* ------------------------------------------------------------------ */
/*  XỬ LÝ TRẢ DỮ LIỆU CHO DASHBOARD (doGet)                           */
/* ------------------------------------------------------------------ */
function handleAnalyticsDoGet_(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'ping' || p.action === 'analytics_ping') {
    return analyticsJson_({ ok: true, service: 'hihoedu-analytics' });
  }

  var key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || p.key !== key) {
    return analyticsJson_({ ok: false, error: 'unauthorized' });
  }

  if (p.action === 'events' || p.action === 'analytics_events') {
    var from = Number(p.from) || 0;
    var to = Number(p.to) || Date.now();
    return analyticsJson_(readAnalyticsEvents_(from, to));
  }
  if (p.action === 'stats' || p.action === 'analytics_stats') {
    var sh = getAnalyticsEventsSheet_();
    return analyticsJson_({ ok: true, totalRows: Math.max(0, sh.getLastRow() - 1) });
  }
  return analyticsJson_({ ok: false, error: 'unknown analytics action' });
}

function readAnalyticsEvents_(from, to) {
  var sh = getAnalyticsEventsSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { ok: true, cols: ANALYTICS_COLS, rows: [] };

  var tsCol = sh.getRange(2, 1, last - 1, 1).getValues();
  var lo = 0, hi = tsCol.length;
  var safeFrom = from - 10 * 60 * 1000;
  while (lo < hi) {
    var mid = (lo + hi) >> 1;
    if (Number(tsCol[mid][0]) < safeFrom) lo = mid + 1; else hi = mid;
  }
  var startIdx = Math.max(0, lo - 200);
  var count = tsCol.length - startIdx;
  if (count <= 0) return { ok: true, cols: ANALYTICS_COLS, rows: [] };

  var data = sh.getRange(2 + startIdx, 1, count, ANALYTICS_COLS.length).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var ts = Number(data[i][0]);
    if (ts >= from && ts <= to) out.push(data[i]);
    if (out.length >= ANALYTICS_CONFIG.MAX_ROWS_RESPONSE) break;
  }
  return { ok: true, cols: ANALYTICS_COLS, rows: out };
}

/* ------------------------------------------------------------------ */
/*  ĐIỀU HƯỚNG CHÍNH (doPost & doGet)                                  */
/*  Nếu file script của bạn ĐÃ CÓ sẵn doGet/doPost, chỉ cần chèn 3    */
/*  dòng điều hướng vào đầu hàm cũ của bạn như hướng dẫn bên dưới.    */
/* ------------------------------------------------------------------ */
function doPost(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      // Nếu là request gửi sự kiện theo dõi từ website -> chuyển vào xử lý analytics
      if (body.action === 'analytics_track' || body.ctx || Array.isArray(body.events)) {
        return handleAnalyticsDoPost_(body);
      }
    } catch (err) {}
  }

  // --- NẾU BẠN CÓ CODE doPost CŨ (nhận đơn hàng mới 'new_order'): DÁN CODE CŨ CỦA BẠN VÀO DƯỚI ĐÂY ---
  // Ví dụ:
  // if (body && body.action === 'new_order') { ... xử lý đơn hàng của bạn ... }

  return analyticsJson_({ ok: false, error: 'unhandled post action' });
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  
  // Nếu là request từ Dashboard Analytics -> chuyển vào xử lý analytics
  if (p.action === 'events' || p.action === 'stats' || p.action === 'ping' ||
      p.action === 'analytics_events' || p.action === 'analytics_stats') {
    return handleAnalyticsDoGet_(e);
  }

  // --- NẾU BẠN CÓ CODE doGet CŨ (kiểm tra thanh toán 'check_status'): DÁN CODE CŨ CỦA BẠN VÀO DƯỚI ĐÂY ---
  // Ví dụ:
  // if (p.action === 'check_status') { ... kiểm tra thanh toán đơn hàng ... }

  return analyticsJson_({ ok: false, error: 'unhandled get action' });
}
