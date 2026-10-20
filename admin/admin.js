/**
 * HihoEdu Analytics Dashboard
 * - Đọc sự kiện từ backend Apps Script (analytics.gs) hoặc dùng dữ liệu mẫu
 * - Tính toán toàn bộ chỉ số phía trình duyệt & hiển thị bằng Chart.js
 */
(() => {
    'use strict';

    // =========================================================
    // HẰNG SỐ & TIỆN ÍCH
    // =========================================================
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => Array.from(document.querySelectorAll(s));
    const DAY = 86400000;
    const CFG_KEY = 'hiho_admin_cfg';
    const CATALOG_KEY = 'hiho_admin_catalog_v1';
    const CATALOG_API = atob('aHR0cHM6Ly9zaGVldGRiLmlvL2FwaS92MS9mY2RybjM1d3IyeWxh');
    const PALETTE = ['#f59e0b', '#8b5cf6', '#22d3ee', '#10b981', '#f43f5e', '#3b82f6', '#ec4899', '#84cc16', '#eab308', '#14b8a6', '#a855f7', '#64748b'];
    const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const WEEKDAYS_FULL = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const PAGE_NAMES = {
        '/': 'Trang chủ', '/index.html': 'Trang chủ', '/chi-tiet.html': 'Chi tiết khóa học',
        '/thanh-toan.html': 'Thanh toán', '/hoan-tat.html': 'Hoàn tất đơn hàng', '/gioi-thieu.html': 'Giới thiệu'
    };
    const SOURCE_NAMES = {
        '(direct)': 'Truy cập trực tiếp', google: 'Google', facebook: 'Facebook', zalo: 'Zalo', tiktok: 'TikTok',
        youtube: 'YouTube', instagram: 'Instagram', coccoc: 'Cốc Cốc', bing: 'Bing', email: 'Email'
    };
    const TITLES = {
        overview: ['Tổng quan kinh doanh', 'fa-gauge-high'],
        products: ['Phân tích sản phẩm', 'fa-box-open'],
        traffic: ['Nguồn truy cập & thiết bị', 'fa-globe'],
        behavior: ['Hành vi khách hàng', 'fa-route'],
        orders: ['Đơn hàng & doanh thu', 'fa-receipt'],
        realtime: ['Thời gian thực', 'fa-satellite-dish']
    };

    const fmt = {
        num: (n) => (Math.round(n) || 0).toLocaleString('vi-VN'),
        vnd: (n) => (Math.round(n) || 0).toLocaleString('vi-VN') + 'đ',
        short: (n) => {
            n = Math.round(n) || 0;
            if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' tỷ';
            if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' tr';
            if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'k';
            return String(n);
        },
        pct: (v, d = 1) => (isFinite(v) ? (v * 100).toFixed(d) : '0') + '%',
        dur: (ms) => {
            const s = Math.round((ms || 0) / 1000);
            if (s < 60) return s + 's';
            const m = Math.floor(s / 60);
            if (m < 60) return m + 'p ' + (s % 60) + 's';
            return Math.floor(m / 60) + 'h ' + (m % 60) + 'p';
        },
        date: (ts) => new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        dt: (ts) => new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
        ago: (ts) => {
            const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
            if (s < 60) return s + ' giây trước';
            if (s < 3600) return Math.floor(s / 60) + ' phút trước';
            return Math.floor(s / 3600) + ' giờ trước';
        }
    };
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const trunc = (s, n) => (s = String(s || ''), s.length > n ? s.slice(0, n - 1) + '…' : s);
    const parsePrice = (s) => (typeof s === 'number' ? s : parseInt(String(s || '').replace(/[^\d]/g, ''), 10) || 0);
    const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
    const div = (a, b) => (b ? a / b : 0);
    const pageName = (p) => PAGE_NAMES[p] || p;
    const sourceName = (s) => SOURCE_NAMES[s] || s;
    const toDateInput = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

    const loadCfg = () => { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; } };
    const saveCfg = (c) => localStorage.setItem(CFG_KEY, JSON.stringify(c));

    // =========================================================
    // TRẠNG THÁI
    // =========================================================
    const state = {
        cfg: loadCfg(),
        mode: 'demo',
        preset: '30d',
        range: null,
        events: [],
        demoEvents: null,
        catalog: [],
        R: null, P: null, rows: [], spark: null,
        tab: 'overview',
        gran: 'day',
        metric: 'traffic',
        sellerBy: 'qty',
        productSort: { key: 'revenue', dir: -1 },
        productFilter: '',
        charts: {},
        dirty: {},
        rtTimer: null,
        loading: false
    };
    let catMap = new Map();
    const setCatalog = (items) => { state.catalog = items; catMap = new Map(items.map((c) => [String(c.id), c])); };
    const nameOf = (pid, fb) => (catMap.get(String(pid)) || {}).name || fb || `Khóa học #${pid}`;
    const imgOf = (pid) => (catMap.get(String(pid)) || {}).img || '';

    // =========================================================
    // CHART.JS DEFAULTS
    // =========================================================
    if (window.Chart) {
        Chart.defaults.color = '#7d8aa6';
        Chart.defaults.font.family = "'Be Vietnam Pro', system-ui, sans-serif";
        Chart.defaults.font.size = 11.5;
        Chart.defaults.borderColor = 'rgba(148,163,184,.08)';
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.boxWidth = 8;
        Chart.defaults.plugins.legend.labels.padding = 14;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(8,13,30,.96)';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(148,163,184,.22)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.plugins.tooltip.cornerRadius = 10;
        Chart.defaults.plugins.tooltip.titleColor = '#fff';
        Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
        Chart.defaults.plugins.tooltip.titleFont = { weight: '700' };
        Chart.defaults.elements.bar.borderRadius = 6;
        Chart.defaults.elements.line.tension = 0.38;
        Chart.defaults.elements.point.radius = 0;
        Chart.defaults.elements.point.hoverRadius = 5;
    }

    const gradFill = (color, top = 0.32) => (ctx) => {
        const { chart } = ctx;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return hexA(color, 0.1);
        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, hexA(color, top));
        g.addColorStop(1, hexA(color, 0));
        return g;
    };
    const mkChart = (id, config) => {
        if (state.charts[id]) { state.charts[id].destroy(); delete state.charts[id]; }
        const el = document.getElementById(id);
        if (!el || !window.Chart) return null;
        state.charts[id] = new Chart(el, config);
        return state.charts[id];
    };
    const hBar = (id, labels, data, color, valueFmt, fullLabels) => mkChart(id, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: labels.map((_, i) => hexA(color, 0.95 - i * 0.06)), borderSkipped: false, barThickness: 'flex', maxBarThickness: 22 }] },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { title: (it) => (fullLabels ? fullLabels[it[0].dataIndex] : it[0].label), label: (it) => ' ' + (valueFmt ? valueFmt(it.raw) : fmt.num(it.raw)) } }
            },
            scales: {
                x: { grid: { color: 'rgba(148,163,184,.06)' }, ticks: { callback: (v) => (valueFmt === fmt.vnd ? fmt.short(v) : v) } },
                y: { grid: { display: false }, ticks: { color: '#b4c0d6', font: { size: 11 } } }
            }
        }
    });
    const doughnut = (id, labels, data, colors, valueFmt) => mkChart(id, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors || PALETTE, borderColor: '#0a1024', borderWidth: 3, hoverOffset: 8 }] },
        options: {
            cutout: '66%',
            plugins: {
                legend: { position: 'right', labels: { color: '#b4c0d6', font: { size: 11.5 } } },
                tooltip: {
                    callbacks: {
                        label: (it) => {
                            const total = it.dataset.data.reduce((s, v) => s + v, 0);
                            return ` ${it.label}: ${valueFmt ? valueFmt(it.raw) : fmt.num(it.raw)} (${fmt.pct(div(it.raw, total))})`;
                        }
                    }
                }
            }
        }
    });

    // =========================================================
    // KHOẢNG THỜI GIAN
    // =========================================================
    function computeRange(preset) {
        const now = Date.now();
        const today = sod(now);
        const d = new Date();
        switch (preset) {
            case 'today': return { from: today, to: now };
            case 'yesterday': return { from: today - DAY, to: today - 1 };
            case '7d': return { from: today - 6 * DAY, to: now };
            case '90d': return { from: today - 89 * DAY, to: now };
            case 'month': return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to: now };
            case 'custom': {
                const f = $('#dateFrom').value, t = $('#dateTo').value;
                if (f && t) {
                    const from = new Date(f + 'T00:00:00').getTime();
                    const to = Math.min(now, new Date(t + 'T23:59:59').getTime());
                    if (from < to) return { from, to };
                }
                return { from: today - 29 * DAY, to: now };
            }
            default: return { from: today - 29 * DAY, to: now };
        }
    }
    const prevRange = (r) => { const len = r.to - r.from; return { from: r.from - len - 1, to: r.from - 1 }; };
    const autoGran = (r) => { const days = (r.to - r.from) / DAY; return days <= 2 ? 'hour' : days <= 62 ? 'day' : days <= 180 ? 'week' : 'month'; };

    // =========================================================
    // DỮ LIỆU: CATALOG (SheetDB) – lưu đệm 6 giờ
    // =========================================================
    async function loadCatalog(force) {
        if (!force) {
            try {
                const c = JSON.parse(localStorage.getItem(CATALOG_KEY) || 'null');
                if (c && Date.now() - c.t < 6 * 3600000 && c.items && c.items.length) { setCatalog(c.items); return; }
            } catch (e) { }
        }
        try {
            const res = await fetch(CATALOG_API);
            const data = await res.json();
            if (Array.isArray(data)) {
                const items = data.filter((c) => c && c.id !== undefined && c.id !== '' && c.ten_khoa_hoc).map((c) => ({
                    id: String(c.id).trim(),
                    name: String(c.ten_khoa_hoc).trim(),
                    price: parsePrice(c.gia_moi),
                    cat: (String(c.danh_muc_chinh || 'Khác').split(',')[0] || 'Khác').trim() || 'Khác',
                    img: String(c.anh_bia || '').trim()
                }));
                if (items.length) {
                    setCatalog(items);
                    try { localStorage.setItem(CATALOG_KEY, JSON.stringify({ t: Date.now(), items })); } catch (e) { }
                }
            }
        } catch (e) { console.warn('Không tải được danh sách khóa học', e); }
    }

    // =========================================================
    // DỮ LIỆU: SỰ KIỆN
    // =========================================================
    function normalizeRows(cols, rows) {
        const ix = {};
        cols.forEach((c, i) => (ix[c] = i));
        const out = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            let meta = null;
            const m = r[ix.meta];
            if (m) { try { meta = JSON.parse(m); } catch (e) { } }
            out[i] = {
                ts: Number(r[ix.ts]), e: String(r[ix.event]), vid: String(r[ix.vid]), sid: String(r[ix.sid]),
                page: String(r[ix.page] || '/'), pid: String(r[ix.pid] ?? ''), pname: String(r[ix.pname] || ''),
                value: Number(r[ix.value]) || 0, ref: String(r[ix.ref] || ''), source: String(r[ix.source] || '(direct)'),
                medium: String(r[ix.medium] || 'none'), campaign: String(r[ix.campaign] || ''), device: String(r[ix.device] || 'desktop'),
                browser: String(r[ix.browser] || 'Khác'), os: String(r[ix.os] || 'Khác'), isNew: Number(r[ix['new']]) === 1, meta
            };
        }
        return out.sort((a, b) => a.ts - b.ts);
    }

    async function apiGet(params) {
        const q = new URLSearchParams(Object.assign({ key: state.cfg.key }, params)).toString();
        const res = await fetch(state.cfg.api + (state.cfg.api.includes('?') ? '&' : '?') + q, { method: 'GET' });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error === 'unauthorized' ? 'Sai ADMIN_KEY – vui lòng kiểm tra lại trong Cài đặt' : (j.error || 'Lỗi backend'));
        return j;
    }

    async function loadData() {
        if (state.loading) return;
        state.loading = true;
        showLoader(true);
        try {
            state.range = computeRange(state.preset);
            const prev = prevRange(state.range);
            const need = Math.min(prev.from, sod(Date.now()) - 29 * DAY);
            if (state.mode === 'demo') {
                if (!state.demoEvents) state.demoEvents = generateDemo();
                state.events = state.demoEvents;
            } else {
                const j = await apiGet({ action: 'events', from: need, to: Date.now() });
                state.events = normalizeRows(j.cols, j.rows);
            }
            recompute();
            renderAll();
        } catch (err) {
            console.error(err);
            toast(err.message || 'Không tải được dữ liệu', 'err');
            $('#pageSub').textContent = '⚠ ' + (err.message || 'Lỗi tải dữ liệu');
        } finally {
            state.loading = false;
            showLoader(false);
        }
    }

    // =========================================================
    // PHÂN TÍCH: TÍNH TOÁN CHỈ SỐ
    // =========================================================
    function compute(events, from, to) {
        const sessions = new Map();
        const visitors = new Set(), newVisitors = new Set();
        const products = new Map(), pages = new Map();
        const searches = new Map(), contacts = new Map(), perf = new Map(), errors = new Map();
        const heat = Array.from({ length: 7 }, () => new Array(24).fill(0));
        const weekday = new Array(7).fill(0);
        const scroll = [0, 0, 0, 0];
        const orders = [], paidIds = new Set();
        let pageviews = 0, revenue = 0, paidRevenue = 0, paidOrders = 0, perfSum = 0, perfN = 0;

        const P = (pid, pname) => {
            pid = String(pid);
            let p = products.get(pid);
            if (!p) { p = { pid, name: '', views: 0, viewers: new Set(), clicks: 0, carts: 0, removes: 0, qty: 0, revenue: 0, paidQty: 0, paidRevenue: 0 }; products.set(pid, p); }
            if (pname && !p.name) p.name = pname;
            return p;
        };
        const PG = (page) => {
            let g = pages.get(page);
            if (!g) { g = { page, views: 0, viewers: new Set(), time: 0, scrollSum: 0, scrollN: 0, entries: 0 }; pages.set(page, g); }
            return g;
        };

        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            if (ev.ts < from || ev.ts > to) continue;
            let s = sessions.get(ev.sid);
            if (!s) {
                s = {
                    sid: ev.sid, vid: ev.vid, start: ev.ts, end: ev.ts, pv: 0, engaged: 0, source: ev.source, medium: ev.medium,
                    campaign: ev.campaign, ref: ev.ref, device: ev.device, browser: ev.browser, os: ev.os, isNew: ev.isNew,
                    view: false, cart: false, checkout: false, purchase: false, paid: false, revenue: 0, landing: '',
                    cartItems: new Map()
                };
                sessions.set(ev.sid, s);
            }
            if (ev.ts > s.end) s.end = ev.ts;
            visitors.add(ev.vid);
            if (ev.isNew) newVisitors.add(ev.vid);
            const meta = ev.meta || {};

            switch (ev.e) {
                case 'page_view': {
                    pageviews++; s.pv++;
                    const d = new Date(ev.ts), wd = (d.getDay() + 6) % 7;
                    heat[wd][d.getHours()]++; weekday[wd]++;
                    const g = PG(ev.page); g.views++; g.viewers.add(ev.vid);
                    if (!s.landing) { s.landing = ev.page; g.entries++; }
                    break;
                }
                case 'engage': {
                    const v = Math.min(ev.value, 1800000);
                    s.engaged += v;
                    const g = PG(ev.page); g.time += v;
                    if (meta.scroll != null) {
                        g.scrollSum += meta.scroll; g.scrollN++;
                        scroll[meta.scroll >= 75 ? 3 : meta.scroll >= 50 ? 2 : meta.scroll >= 25 ? 1 : 0]++;
                    }
                    break;
                }
                case 'product_view': { const p = P(ev.pid, ev.pname); p.views++; p.viewers.add(ev.vid); s.view = true; break; }
                case 'product_click': { P(ev.pid, ev.pname).clicks++; break; }
                case 'add_to_cart': {
                    if (meta.dup) break;
                    P(ev.pid, ev.pname).carts++; s.cart = true;
                    s.cartItems.set(String(ev.pid), ev.value || 0);
                    break;
                }
                case 'remove_from_cart': { P(ev.pid, ev.pname).removes++; s.cartItems.delete(String(ev.pid)); break; }
                case 'begin_checkout': { s.checkout = true; break; }
                case 'purchase': {
                    const items = Array.isArray(meta.items) ? meta.items : [];
                    revenue += ev.value; s.purchase = true; s.revenue += ev.value;
                    items.forEach((it) => { const p = P(it.id, it.n); p.qty++; p.revenue += Number(it.p) || 0; });
                    orders.push({ ts: ev.ts, id: ev.pid, value: ev.value, items, source: s.source, device: s.device, paid: false });
                    break;
                }
                case 'purchase_paid': {
                    if (paidIds.has(ev.pid)) break;
                    paidIds.add(ev.pid); paidOrders++; paidRevenue += ev.value; s.paid = true;
                    (Array.isArray(meta.items) ? meta.items : []).forEach((it) => { const p = P(it.id, it.n); p.paidQty++; p.paidRevenue += Number(it.p) || 0; });
                    break;
                }
                case 'search': {
                    const q = String(meta.q || '').trim().toLowerCase();
                    if (!q) break;
                    const x = searches.get(q) || { q, count: 0, results: 0, zero: 0 };
                    x.count++; x.results += Math.max(0, ev.value); if (ev.value === 0) x.zero++;
                    searches.set(q, x);
                    break;
                }
                case 'contact_click': { const t = meta.type || 'khác'; contacts.set(t, (contacts.get(t) || 0) + 1); break; }
                case 'perf': {
                    if (ev.value > 0 && ev.value < 60000) {
                        const x = perf.get(ev.page) || { page: ev.page, sum: 0, n: 0 };
                        x.sum += ev.value; x.n++; perf.set(ev.page, x); perfSum += ev.value; perfN++;
                    }
                    break;
                }
                case 'js_error': {
                    const k = `${meta.msg || '?'}|${meta.src || ''}:${meta.line || ''}`;
                    const x = errors.get(k) || { msg: meta.msg || '?', at: `${meta.src || ''}:${meta.line || ''}`, count: 0, last: 0 };
                    x.count++; x.last = Math.max(x.last, ev.ts); errors.set(k, x);
                    break;
                }
            }
        }
        orders.forEach((o) => (o.paid = paidIds.has(o.id)));

        // ---- Tổng hợp theo phiên ----
        const agg = (map, key, s) => {
            let x = map.get(key);
            if (!x) { x = { key, sessions: 0, users: new Set(), bounces: 0, orders: 0, revenue: 0 }; map.set(key, x); }
            x.sessions++; x.users.add(s.vid); if (s.pv <= 1) x.bounces++; if (s.purchase) x.orders++; x.revenue += s.revenue;
            return x;
        };
        const sources = new Map(), mediums = new Map(), devices = new Map(), browsers = new Map(), oses = new Map(), campaigns = new Map(), refs = new Map();
        const abandon = new Map();
        let bounces = 0, durSum = 0, sView = 0, sCart = 0, sCheckout = 0, sPurchase = 0, sPaid = 0, abandonValue = 0, abandonSessions = 0;
        sessions.forEach((s) => {
            if (s.pv <= 1) bounces++;
            durSum += s.engaged || (s.end - s.start);
            agg(sources, s.source, s);
            agg(mediums, `${s.source} / ${s.medium}`, s);
            agg(devices, s.device, s); agg(browsers, s.browser, s); agg(oses, s.os, s);
            if (s.campaign) agg(campaigns, s.campaign, s).sm = `${s.source} / ${s.medium}`;
            if (s.ref) agg(refs, s.ref, s);
            if (s.view) sView++;
            if (s.cart) sCart++;
            if (s.checkout) sCheckout++;
            if (s.purchase) sPurchase++;
            if (s.paid) sPaid++;
            if (s.cart && !s.purchase) {
                abandonSessions++;
                s.cartItems.forEach((v, pid) => { abandonValue += v; abandon.set(pid, (abandon.get(pid) || 0) + 1); });
            }
        });
        const nS = sessions.size;
        const returning = [...visitors].filter((v) => !newVisitors.has(v)).length;

        return {
            from, to, sessions, products, pages, heat, weekday, scroll, orders,
            visitors: visitors.size, newVisitors: newVisitors.size, returningVisitors: returning,
            pageviews, sessionsN: nS, bounceRate: div(bounces, nS), avgDuration: div(durSum, nS),
            ordersN: orders.length, revenue, paidOrders, paidRevenue,
            cr: div(sPurchase, nS), aov: div(revenue, orders.length),
            funnel: [
                ['Truy cập', nS], ['Xem sản phẩm', sView], ['Thêm giỏ hàng', sCart],
                ['Vào thanh toán', sCheckout], ['Đặt hàng', sPurchase], ['Đã thanh toán', sPaid]
            ],
            cartSessions: sCart, checkoutSessions: sCheckout, abandonSessions, abandonValue,
            abandonRate: div(abandonSessions, sCart), abandon,
            sources, mediums, devices, browsers, oses, campaigns, refs,
            searchList: [...searches.values()].sort((a, b) => b.count - a.count),
            contacts, perf: [...perf.values()], avgLoad: div(perfSum, perfN), errors: [...errors.values()].sort((a, b) => b.count - a.count)
        };
    }

    // Chuỗi thời gian theo giờ / ngày / tuần / tháng
    function series(events, from, to, gran) {
        const buckets = [];
        const labels = [];
        let idxOf;
        const start = new Date(from);
        if (gran === 'hour') {
            start.setMinutes(0, 0, 0);
            const s0 = start.getTime();
            for (let t = s0; t <= to; t += 3600000) {
                const d = new Date(t);
                labels.push(`${String(d.getHours()).padStart(2, '0')}h ${(to - from) > DAY * 1.1 ? d.getDate() + '/' + (d.getMonth() + 1) : ''}`.trim());
            }
            idxOf = (ts) => Math.floor((ts - s0) / 3600000);
        } else if (gran === 'day') {
            const s0 = sod(from);
            for (let t = s0; t <= to; t += DAY) { const d = new Date(t); labels.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`); }
            idxOf = (ts) => Math.floor((sod(ts) - s0) / DAY + 0.01);
        } else if (gran === 'week') {
            const d0 = new Date(sod(from)); d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));
            const s0 = d0.getTime();
            for (let t = s0; t <= to; t += 7 * DAY) { const d = new Date(t); labels.push(`Tuần ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`); }
            idxOf = (ts) => Math.floor((sod(ts) - s0) / (7 * DAY) + 0.001);
        } else {
            const y0 = start.getFullYear(), m0 = start.getMonth();
            const end = new Date(to);
            const n = (end.getFullYear() - y0) * 12 + (end.getMonth() - m0) + 1;
            for (let i = 0; i < n; i++) { const d = new Date(y0, m0 + i, 1); labels.push(`T${d.getMonth() + 1}/${d.getFullYear()}`); }
            idxOf = (ts) => { const d = new Date(ts); return (d.getFullYear() - y0) * 12 + d.getMonth() - m0; };
        }
        for (let i = 0; i < labels.length; i++) buckets.push({ pv: 0, vids: new Set(), sids: new Map(), orders: 0, revenue: 0, paid: 0, paidRevenue: 0, buyers: new Set() });

        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            if (ev.ts < from || ev.ts > to) continue;
            const b = buckets[idxOf(ev.ts)];
            if (!b) continue;
            b.vids.add(ev.vid);
            let s = b.sids.get(ev.sid);
            if (!s) { s = { pv: 0, eng: 0 }; b.sids.set(ev.sid, s); }
            if (ev.e === 'page_view') { b.pv++; s.pv++; }
            else if (ev.e === 'engage') s.eng += Math.min(ev.value, 1800000);
            else if (ev.e === 'purchase') { b.orders++; b.revenue += ev.value; b.buyers.add(ev.sid); }
            else if (ev.e === 'purchase_paid') { b.paid++; b.paidRevenue += ev.value; }
        }
        const pick = (fn) => buckets.map(fn);
        return {
            labels,
            pageviews: pick((b) => b.pv),
            visitors: pick((b) => b.vids.size),
            sessions: pick((b) => b.sids.size),
            orders: pick((b) => b.orders),
            revenue: pick((b) => b.revenue),
            paid: pick((b) => b.paid),
            paidRevenue: pick((b) => b.paidRevenue),
            avgDuration: pick((b) => { let s = 0; b.sids.forEach((x) => (s += x.eng)); return div(s, b.sids.size); }),
            bounceRate: pick((b) => { let n = 0; b.sids.forEach((x) => { if (x.pv <= 1) n++; }); return div(n, b.sids.size); }),
            cr: pick((b) => div(b.buyers.size, b.sids.size))
        };
    }

    function quickStats(events, from) {
        let pv = 0, orders = 0;
        const v = new Set();
        for (let i = events.length - 1; i >= 0; i--) {
            const ev = events[i];
            if (ev.ts < from) break;
            v.add(ev.vid);
            if (ev.e === 'page_view') pv++;
            else if (ev.e === 'purchase') orders++;
        }
        return { pv, visitors: v.size, orders };
    }

    // Gộp dữ liệu sản phẩm với danh sách khóa học (để thấy cả khóa CHƯA bán được)
    function productRows(R) {
        const map = new Map();
        state.catalog.forEach((c) => map.set(String(c.id), { pid: String(c.id), name: c.name, price: c.price, cat: c.cat, img: c.img, inCatalog: true }));
        R.products.forEach((p, pid) => {
            if (!map.has(pid)) map.set(pid, { pid, name: nameOf(pid, p.name), price: 0, cat: 'Khác', img: '', inCatalog: false });
        });
        const rows = [];
        map.forEach((base) => {
            const p = R.products.get(base.pid);
            const views = p ? p.views : 0, viewers = p ? p.viewers.size : 0, qty = p ? p.qty : 0;
            if (!base.inCatalog && !views && !qty && !(p && (p.clicks || p.carts))) return;
            rows.push(Object.assign(base, {
                views, viewers, clicks: p ? p.clicks : 0, carts: p ? p.carts : 0, removes: p ? p.removes : 0,
                qty, revenue: p ? p.revenue : 0, paidQty: p ? p.paidQty : 0, paidRevenue: p ? p.paidRevenue : 0,
                cr: div(qty, viewers), cartRate: div(p ? p.carts : 0, viewers)
            }));
        });
        return rows;
    }

    function recompute() {
        const r = state.range, p = prevRange(r);
        state.R = compute(state.events, r.from, r.to);
        state.P = compute(state.events, p.from, p.to);
        state.rows = productRows(state.R);
        state.spark = series(state.events, r.from, r.to, autoGran(r) === 'hour' ? 'hour' : 'day');
        state.gran = autoGran(r);
        $$('#granSeg button').forEach((b) => b.classList.toggle('active', b.dataset.gran === state.gran));
    }

    // =========================================================
    // RENDER CHUNG
    // =========================================================
    function renderAll() {
        Object.keys(TITLES).forEach((t) => (state.dirty[t] = true));
        const r = state.range, p = prevRange(r);
        $('#pageSub').innerHTML = `${fmt.date(r.from)} – ${fmt.date(r.to)} <span style="opacity:.6">· so sánh với ${fmt.date(p.from)} – ${fmt.date(p.to)} · cập nhật ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>`;
        renderTab(state.tab);
    }

    function renderTab(tab) {
        if (!state.R) return;
        if (tab === 'realtime') { startRealtime(); return; }
        if (!state.dirty[tab]) return;
        state.dirty[tab] = false;
        ({ overview: renderOverview, products: renderProducts, traffic: renderTraffic, behavior: renderBehavior, orders: renderOrders })[tab]();
    }

    const emptyHTML = (msg, icon = 'fa-inbox') => `<div class="empty"><i class="fa-solid ${icon}"></i>${msg}</div>`;

    const deltaHTML = (cur, prev, invert) => {
        if (!prev && !cur) return '<span class="delta flat">–</span>';
        if (!prev) return '<span class="delta up"><i class="fa-solid fa-sparkles"></i> Mới</span>';
        const d = (cur - prev) / prev;
        if (Math.abs(d) < 0.005) return '<span class="delta flat">0%</span>';
        const good = invert ? d < 0 : d > 0;
        return `<span class="delta ${good ? 'up' : 'down'}"><i class="fa-solid fa-arrow-${d > 0 ? 'up' : 'down'}"></i> ${fmt.pct(Math.abs(d))}</span>`;
    };

    const rankHTML = (items, opts = {}) => {
        if (!items.length) return emptyHTML(opts.empty || 'Chưa có dữ liệu');
        const max = Math.max(...items.map((x) => x.v), 1);
        return items.map((x, i) => `
            <div class="rank-item">
                <div class="rank-no ${opts.medal ? 'medal' : ''}">${i + 1}</div>
                ${opts.thumb ? (x.img ? `<img class="rank-thumb" src="${esc(x.img)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div class="rank-thumb"></div>') : ''}
                <div class="rank-body">
                    <div class="rank-name" title="${esc(x.name)}">${esc(x.name)}${x.tag ? ' ' + x.tag : ''}</div>
                    <div class="rank-bar"><span style="width:${Math.max(3, (x.v / max) * 100)}%;${opts.color ? `background:${opts.color}` : ''}"></span></div>
                </div>
                <div class="rank-val">${x.label}${x.sub ? `<small>${x.sub}</small>` : ''}</div>
            </div>`).join('');
    };

    const tableHTML = (cols, rows, opts = {}) => {
        if (!rows.length) return emptyHTML(opts.empty || 'Chưa có dữ liệu');
        const head = cols.map((c) => {
            const sorted = opts.sort && opts.sort.key === c.key;
            return `<th class="${c.num ? 'num' : ''} ${opts.sortable && c.key ? 'sortable' : ''} ${sorted ? 'sorted' : ''}" data-key="${c.key || ''}">${c.label}${sorted ? (opts.sort.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`;
        }).join('');
        const body = rows.map((r, i) => `<tr>${cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.render ? c.render(r, i) : esc(r[c.key])}</td>`).join('')}</tr>`).join('');
        return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    };

    // =========================================================
    // VIEW: TỔNG QUAN
    // =========================================================
    function renderOverview() {
        const R = state.R, P = state.P, now = Date.now(), today = sod(now);
        // Quick stats
        const q = [['qToday', today], ['qWeek', today - 6 * DAY], ['qMonth', today - 29 * DAY]];
        q.forEach(([id, from]) => {
            const s = quickStats(state.events, from);
            $('#' + id).innerHTML = `${fmt.num(s.pv)} <small>lượt xem</small>`;
            $('#' + id + 'Meta').innerHTML = `<i class="fa-solid fa-user" style="opacity:.6"></i> ${fmt.num(s.visitors)} khách &nbsp;·&nbsp; <i class="fa-solid fa-bag-shopping" style="opacity:.6"></i> ${fmt.num(s.orders)} đơn`;
        });

        // KPI
        const sp = state.spark;
        const kpis = [
            { label: 'Khách truy cập', icon: 'fa-users', color: '#f59e0b', cur: R.visitors, prev: P.visitors, f: fmt.num, s: sp.visitors, foot: `${fmt.num(R.newVisitors)} khách mới` },
            { label: 'Lượt xem trang', icon: 'fa-eye', color: '#8b5cf6', cur: R.pageviews, prev: P.pageviews, f: fmt.num, s: sp.pageviews, foot: `${div(R.pageviews, R.sessionsN).toFixed(1)} trang / phiên` },
            { label: 'Phiên truy cập', icon: 'fa-arrow-pointer', color: '#22d3ee', cur: R.sessionsN, prev: P.sessionsN, f: fmt.num, s: sp.sessions, foot: `${fmt.num(R.returningVisitors)} khách quay lại` },
            { label: 'Thời gian TB / phiên', icon: 'fa-clock', color: '#3b82f6', cur: R.avgDuration, prev: P.avgDuration, f: fmt.dur, s: sp.avgDuration, foot: 'Thời gian xem thực tế' },
            { label: 'Tỷ lệ thoát', icon: 'fa-door-open', color: '#f43f5e', cur: R.bounceRate, prev: P.bounceRate, f: (v) => fmt.pct(v), s: sp.bounceRate, invert: true, foot: 'Chỉ xem 1 trang rồi rời đi' },
            { label: 'Đơn hàng', icon: 'fa-bag-shopping', color: '#10b981', cur: R.ordersN, prev: P.ordersN, f: fmt.num, s: sp.orders, foot: `${fmt.num(R.paidOrders)} đã thanh toán` },
            { label: 'Doanh thu (đặt hàng)', icon: 'fa-sack-dollar', color: '#eab308', cur: R.revenue, prev: P.revenue, f: fmt.vnd, s: sp.revenue, foot: `Thực thu: ${fmt.vnd(R.paidRevenue)}` },
            { label: 'Tỷ lệ chuyển đổi', icon: 'fa-bullseye', color: '#ec4899', cur: R.cr, prev: P.cr, f: (v) => fmt.pct(v, 2), s: sp.cr, foot: `Giá trị đơn TB: ${fmt.short(R.aov)}` }
        ];
        $('#kpiGrid').innerHTML = kpis.map((k, i) => `
            <div class="card kpi" style="--kc:${k.color};animation:fadeUp .5s ${i * 0.05}s both">
                <div class="kpi-top"><div class="kpi-label"><i class="fa-solid ${k.icon}"></i>${k.label}</div>${deltaHTML(k.cur, k.prev, k.invert)}</div>
                <div class="kpi-val">${k.f(k.cur)}</div>
                <div class="kpi-foot"><span>${k.foot}</span><span title="Kỳ trước">${k.f(k.prev)}</span></div>
                <div class="spark"><canvas id="spark${i}"></canvas></div>
            </div>`).join('');
        kpis.forEach((k, i) => mkChart('spark' + i, {
            type: 'line',
            data: { labels: sp.labels, datasets: [{ data: k.s, borderColor: k.color, borderWidth: 2, fill: true, backgroundColor: gradFill(k.color, 0.28) }] },
            options: { plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, animation: { duration: 900 } }
        }));

        renderTrafficChart();

        // Insights
        $('#insights').innerHTML = buildInsights(R, P, state.rows).map((x, i) => {
            const c = { good: ['rgba(16,185,129,.14)', '#10b981'], bad: ['rgba(244,63,94,.14)', '#f43f5e'], warn: ['rgba(245,158,11,.14)', '#f59e0b'], info: ['rgba(139,92,246,.15)', '#a78bfa'] }[x.type];
            return `<div class="insight" style="animation-delay:${i * 0.06}s"><div class="insight-ic" style="background:${c[0]};color:${c[1]}"><i class="fa-solid ${x.icon}"></i></div><div><b>${x.title}</b><p>${x.text}</p></div></div>`;
        }).join('');

        // Funnel
        const f = R.funnel, top = Math.max(f[0][1], 1);
        const fColors = ['#8b5cf6', '#6d70f0', '#3b82f6', '#22d3ee', '#10b981', '#84cc16'];
        $('#funnel').innerHTML = f.map(([label, v], i) => {
            const rate = i === 0 ? 1 : div(v, f[i - 1][1]);
            return `<div class="funnel-row">
                <div class="funnel-label">${label}</div>
                <div class="funnel-track"><div class="funnel-fill" style="width:0;background:linear-gradient(90deg,${fColors[i]},${hexA(fColors[i], 0.6)})" data-w="${Math.max(2, (v / top) * 100)}">${fmt.num(v)}</div></div>
                <div class="funnel-rate"><b>${fmt.pct(div(v, top))}</b><small>${i ? '↳ ' + fmt.pct(rate, 0) : 'tổng'}</small></div>
            </div>`;
        }).join('');
        requestAnimationFrame(() => setTimeout(() => $$('#funnel .funnel-fill').forEach((el) => (el.style.width = el.dataset.w + '%')), 60));

        // Mini lists
        const best = state.rows.filter((r) => r.qty > 0).sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 5);
        $('#miniBest').innerHTML = rankHTML(best.map((r) => ({ name: r.name, img: r.img, v: r.qty, label: `${fmt.num(r.qty)} đơn`, sub: fmt.short(r.revenue) })), { medal: true, thumb: true, empty: 'Chưa có đơn hàng trong kỳ này' });
        const viewed = state.rows.filter((r) => r.views > 0).sort((a, b) => b.views - a.views).slice(0, 5);
        $('#miniViewed').innerHTML = rankHTML(viewed.map((r) => ({ name: r.name, img: r.img, v: r.views, label: fmt.num(r.views), sub: `${fmt.num(r.viewers)} người` })), { medal: true, thumb: true, color: 'linear-gradient(90deg,#22d3ee,#8b5cf6)' });

        // Heatmap
        const max = Math.max(1, ...R.heat.flat());
        let hm = '<div></div>' + Array.from({ length: 24 }, (_, h) => `<div class="hm-hour">${h}</div>`).join('');
        R.heat.forEach((row, d) => {
            hm += `<div class="hm-label">${WEEKDAYS[d]}</div>`;
            row.forEach((v, h) => {
                const a = v / max;
                const bg = v === 0 ? 'rgba(148,163,184,.05)' : a > 0.8 ? `rgba(244,63,94,${0.55 + a * 0.4})` : `rgba(245,158,11,${0.1 + a * 0.75})`;
                hm += `<div class="hm-cell" style="background:${bg}" title="${WEEKDAYS_FULL[d]}, ${h}h–${h + 1}h: ${fmt.num(v)} lượt xem"></div>`;
            });
        });
        $('#heatmap').innerHTML = hm;
    }

    function renderTrafficChart() {
        const r = state.range;
        const s = series(state.events, r.from, r.to, state.gran);
        if (state.metric === 'traffic') {
            mkChart('chartTraffic', {
                type: 'line',
                data: {
                    labels: s.labels, datasets: [
                        { label: 'Lượt xem trang', data: s.pageviews, borderColor: '#f59e0b', borderWidth: 2.5, fill: true, backgroundColor: gradFill('#f59e0b', 0.3) },
                        { label: 'Khách truy cập', data: s.visitors, borderColor: '#8b5cf6', borderWidth: 2.5, fill: true, backgroundColor: gradFill('#8b5cf6', 0.18) },
                        { label: 'Phiên', data: s.sessions, borderColor: '#22d3ee', borderWidth: 2, borderDash: [5, 5], fill: false }
                    ]
                },
                options: {
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'top', align: 'end' }, tooltip: { callbacks: { label: (it) => ` ${it.dataset.label}: ${fmt.num(it.raw)}` } } },
                    scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 12, maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,.06)' } } }
                }
            });
        } else {
            mkChart('chartTraffic', {
                data: {
                    labels: s.labels, datasets: [
                        { type: 'bar', label: 'Doanh thu đặt hàng', data: s.revenue, backgroundColor: hexA('#f59e0b', 0.85), yAxisID: 'y', order: 2 },
                        { type: 'bar', label: 'Đã thanh toán', data: s.paidRevenue, backgroundColor: hexA('#10b981', 0.85), yAxisID: 'y', order: 3 },
                        { type: 'line', label: 'Số đơn', data: s.orders, borderColor: '#8b5cf6', borderWidth: 2.5, yAxisID: 'y1', order: 1, pointRadius: 3, pointBackgroundColor: '#8b5cf6' }
                    ]
                },
                options: {
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'top', align: 'end' }, tooltip: { callbacks: { label: (it) => ` ${it.dataset.label}: ${it.dataset.yAxisID === 'y' ? fmt.vnd(it.raw) : fmt.num(it.raw)}` } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { maxTicksLimit: 12, maxRotation: 0 } },
                        y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,.06)' }, ticks: { callback: (v) => fmt.short(v) } },
                        y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { precision: 0 } }
                    }
                }
            });
        }
    }

    function buildInsights(R, P, rows) {
        const out = [];
        const add = (type, icon, title, text) => out.push({ type, icon, title, text });

        if (P.visitors > 0) {
            const g = (R.visitors - P.visitors) / P.visitors;
            if (Math.abs(g) >= 0.05) add(g > 0 ? 'good' : 'bad', g > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
                `Lượng khách ${g > 0 ? 'tăng' : 'giảm'} ${fmt.pct(Math.abs(g))}`,
                `So với kỳ trước: ${fmt.num(P.visitors)} → ${fmt.num(R.visitors)} khách.${g < 0 ? ' Nên kiểm tra lại quảng cáo hoặc tăng tần suất đăng bài.' : ' Tiếp tục duy trì các kênh đang hiệu quả!'}`);
        }
        if (P.revenue > 0) {
            const g = (R.revenue - P.revenue) / P.revenue;
            if (Math.abs(g) >= 0.05) add(g > 0 ? 'good' : 'bad', 'fa-sack-dollar', `Doanh thu ${g > 0 ? 'tăng' : 'giảm'} ${fmt.pct(Math.abs(g))}`, `${fmt.vnd(P.revenue)} → <b>${fmt.vnd(R.revenue)}</b> so với kỳ trước.`);
        }
        const best = rows.filter((r) => r.qty > 0).sort((a, b) => b.qty - a.qty)[0];
        if (best) add('good', 'fa-trophy', 'Sản phẩm ngôi sao', `<b>${esc(best.name)}</b> bán chạy nhất với ${fmt.num(best.qty)} đơn (${fmt.vnd(best.revenue)}). Nên đẩy quảng cáo & tạo combo kèm khóa này.`);

        const totViews = rows.reduce((s, r) => s + r.viewers, 0), totQty = rows.reduce((s, r) => s + r.qty, 0);
        const avgCr = div(totQty, totViews);
        const opp = rows.filter((r) => r.viewers >= 15 && r.cr < avgCr * 0.4).sort((a, b) => b.views - a.views)[0];
        if (opp) add('warn', 'fa-magnifying-glass-dollar', 'Nhiều người xem nhưng ít mua', `<b>${esc(opp.name)}</b>: ${fmt.num(opp.views)} lượt xem nhưng chỉ ${fmt.num(opp.qty)} đơn (${fmt.pct(opp.cr)}, TB ${fmt.pct(avgCr)}). Thử giảm giá, thêm video giới thiệu hoặc đánh giá học viên.`);

        const zero = rows.filter((r) => r.qty === 0 && r.inCatalog).length;
        if (zero && state.catalog.length) add('warn', 'fa-box-archive', `${zero}/${state.catalog.length} khóa học chưa có đơn`, 'Trong kỳ này. Cân nhắc gom vào combo, chạy Flash Sale hoặc làm mới ảnh bìa & tiêu đề.');

        let peak = [0, 0, 0];
        R.heat.forEach((row, d) => row.forEach((v, h) => { if (v > peak[0]) peak = [v, d, h]; }));
        if (peak[0] > 0) add('info', 'fa-clock', 'Khung giờ vàng', `Đông khách nhất vào <b>${peak[2]}h–${peak[2] + 1}h ${WEEKDAYS_FULL[peak[1]]}</b>. Thời điểm tốt nhất để đăng bài, livestream hoặc bật quảng cáo.`);

        const ch = [...R.sources.values()].filter((x) => x.sessions >= 20 && x.orders > 0).sort((a, b) => div(b.orders, b.sessions) - div(a.orders, a.sessions))[0];
        if (ch) add('good', 'fa-share-nodes', `Kênh chuyển đổi tốt nhất: ${esc(sourceName(ch.key))}`, `Tỷ lệ ra đơn ${fmt.pct(div(ch.orders, ch.sessions), 2)} (${fmt.num(ch.orders)} đơn / ${fmt.num(ch.sessions)} phiên). Nên tăng ngân sách cho kênh này.`);

        const mob = R.devices.get('mobile');
        const mShare = div(mob ? mob.sessions : 0, R.sessionsN);
        if (mShare > 0.55) add('info', 'fa-mobile-screen', `${fmt.pct(mShare, 0)} khách dùng điện thoại`, 'Ưu tiên tối ưu giao diện mobile: nút mua to rõ, ảnh nhẹ, thanh toán gọn trong 1 màn hình.');

        if (R.cartSessions >= 5 && R.abandonRate > 0.4) add('bad', 'fa-cart-arrow-down', `Tỷ lệ bỏ giỏ hàng ${fmt.pct(R.abandonRate, 0)}`, `Ước tính <b>${fmt.vnd(R.abandonValue)}</b> bị bỏ lỡ. Thêm mã giảm giá ở bước thanh toán hoặc nhắn Zalo nhắc khách.`);

        const zs = R.searchList.filter((s) => s.zero > 0).sort((a, b) => b.zero - a.zero)[0];
        if (zs) add('info', 'fa-magnifying-glass', 'Khách tìm nhưng không thấy', `Từ khóa “<b>${esc(zs.q)}</b>” được tìm ${zs.zero} lần nhưng không có kết quả. Có thể bổ sung khóa học chủ đề này.`);

        if (R.ordersN >= 5) {
            const pr = div(R.paidOrders, R.ordersN);
            if (pr < 0.75) add('warn', 'fa-credit-card', `Chỉ ${fmt.pct(pr, 0)} đơn đã thanh toán`, `${fmt.num(R.ordersN - R.paidOrders)} đơn chưa chuyển khoản — hãy gọi điện / nhắn Zalo chăm sóc để chốt đơn.`);
        }
        if (R.avgLoad > 3000) add('bad', 'fa-gauge-simple-high', 'Website tải hơi chậm', `Thời gian tải TB ${(R.avgLoad / 1000).toFixed(1)}s (nên dưới 3s). Nén ảnh bìa, giảm script để giữ chân khách.`);
        if (R.errors.length) add('bad', 'fa-bug', `${fmt.num(R.errors.reduce((s, e) => s + e.count, 0))} lỗi JavaScript`, 'Khách gặp lỗi khi dùng web. Xem chi tiết ở mục Hành vi khách → Lỗi JavaScript.');

        if (!out.length) add('info', 'fa-circle-info', 'Chưa đủ dữ liệu', 'Hệ thống cần thêm dữ liệu truy cập để đưa ra gợi ý. Hãy quay lại sau vài ngày nhé!');
        return out;
    }

    // =========================================================
    // VIEW: SẢN PHẨM
    // =========================================================
    function renderProducts() {
        const rows = state.rows;
        renderBestChart();

        const worst = rows.filter((r) => r.inCatalog || r.views > 0).sort((a, b) => a.qty - b.qty || b.views - a.views).slice(0, 15);
        $('#worstList').innerHTML = rankHTML(worst.map((r) => ({
            name: r.name, img: r.img, v: r.views, label: `${fmt.num(r.qty)} đơn`, sub: `${fmt.num(r.views)} lượt xem`,
            tag: r.qty === 0 ? '<span class="tag red">Chưa bán</span>' : ''
        })), { thumb: true, color: 'linear-gradient(90deg,#f43f5e,#f59e0b)' });

        const viewed = rows.filter((r) => r.views > 0).sort((a, b) => b.views - a.views).slice(0, 10);
        hBar('chartViewed', viewed.map((r) => trunc(r.name, 24)), viewed.map((r) => r.views), '#22d3ee', null, viewed.map((r) => r.name));
        const clicked = rows.filter((r) => r.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 10);
        hBar('chartClicked', clicked.map((r) => trunc(r.name, 24)), clicked.map((r) => r.clicks), '#8b5cf6', null, clicked.map((r) => r.name));

        const cats = new Map();
        rows.forEach((r) => { if (r.revenue > 0) cats.set(r.cat || 'Khác', (cats.get(r.cat || 'Khác') || 0) + r.revenue); });
        const catArr = [...cats.entries()].sort((a, b) => b[1] - a[1]);
        const catTop = catArr.slice(0, 7);
        if (catArr.length > 7) catTop.push(['Khác', catArr.slice(7).reduce((s, x) => s + x[1], 0)]);
        doughnut('chartCategory', catTop.map((x) => x[0]), catTop.map((x) => x[1]), null, fmt.vnd);

        const totViewers = rows.reduce((s, r) => s + r.viewers, 0), totQty = rows.reduce((s, r) => s + r.qty, 0);
        const avgCr = div(totQty, totViewers);
        const opp = rows.filter((r) => r.viewers >= 10 && r.cr < avgCr * 0.6).sort((a, b) => b.views - a.views).slice(0, 8);
        $('#oppTable').innerHTML = tableHTML([
            { label: 'Khóa học', render: (r) => `<div class="td-name">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy">` : ''}<span title="${esc(r.name)}">${esc(r.name)}</span></div>` },
            { label: 'Lượt xem', num: true, render: (r) => fmt.num(r.views) },
            { label: 'Thêm giỏ', num: true, render: (r) => fmt.num(r.carts) },
            { label: 'Đơn', num: true, render: (r) => fmt.num(r.qty) },
            { label: 'Tỷ lệ mua', num: true, render: (r) => `<span class="tag red">${fmt.pct(r.cr)}</span>` },
            { label: 'Doanh thu tiềm năng*', num: true, render: (r) => `<span class="tag green">+${fmt.vnd(Math.max(0, r.viewers * avgCr - r.qty) * (r.price || div(r.revenue, r.qty) || 0))}</span>` },
            { label: 'Gợi ý', render: (r) => r.carts > r.qty * 2 ? '<span class="tag amber">Khách bỏ giỏ → nhắc thanh toán</span>' : r.cartRate < 0.03 ? '<span class="tag violet">Ít thêm giỏ → xem lại giá/mô tả</span>' : '<span class="tag">Thêm ưu đãi / đánh giá</span>' }
        ], opp, { empty: 'Tuyệt vời! Không có sản phẩm nào có tỷ lệ mua bất thường.' }) +
            (opp.length ? `<div class="card-sub" style="margin-top:10px">* Doanh thu thêm nếu khóa học đạt tỷ lệ mua trung bình (${fmt.pct(avgCr, 2)}).</div>` : '');

        renderProductTable();
    }

    function renderBestChart() {
        const by = state.sellerBy;
        const best = state.rows.filter((r) => r.qty > 0).sort((a, b) => b[by] - a[by]).slice(0, 10);
        hBar('chartBest', best.map((r) => trunc(r.name, 30)), best.map((r) => r[by]), '#f59e0b', by === 'revenue' ? fmt.vnd : (v) => fmt.num(v) + ' đơn', best.map((r) => r.name));
    }

    const PRODUCT_COLS = [
        { key: 'name', label: 'Khóa học', render: (r) => `<div class="td-name">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy">` : ''}<span title="${esc(r.name)}">${esc(r.name)}</span></div>` },
        { key: 'price', label: 'Giá', num: true, render: (r) => (r.price ? fmt.vnd(r.price) : '–') },
        { key: 'views', label: 'Lượt xem', num: true, render: (r) => fmt.num(r.views) },
        { key: 'viewers', label: 'Người xem', num: true, render: (r) => fmt.num(r.viewers) },
        { key: 'clicks', label: 'Lượt nhấp', num: true, render: (r) => fmt.num(r.clicks) },
        { key: 'carts', label: 'Thêm giỏ', num: true, render: (r) => fmt.num(r.carts) },
        { key: 'qty', label: 'Đơn', num: true, render: (r) => `<b>${fmt.num(r.qty)}</b>` },
        { key: 'paidQty', label: 'Đã TT', num: true, render: (r) => fmt.num(r.paidQty) },
        { key: 'revenue', label: 'Doanh thu', num: true, render: (r) => `<b style="color:#fbbf24">${fmt.vnd(r.revenue)}</b>` },
        { key: 'cr', label: 'Tỷ lệ mua', num: true, render: (r) => `<span class="tag ${r.cr >= 0.05 ? 'green' : r.cr > 0 ? 'amber' : 'red'}">${fmt.pct(r.cr)}</span>` }
    ];

    function renderProductTable() {
        const { key, dir } = state.productSort;
        const f = state.productFilter.toLowerCase();
        const rows = state.rows.filter((r) => !f || r.name.toLowerCase().includes(f)).sort((a, b) => {
            const x = a[key], y = b[key];
            return (typeof x === 'string' ? x.localeCompare(y, 'vi') : x - y) * dir;
        });
        $('#productTable').innerHTML = tableHTML(PRODUCT_COLS, rows, { sortable: true, sort: state.productSort, empty: 'Không tìm thấy khóa học' });
    }

    // =========================================================
    // VIEW: NGUỒN TRUY CẬP
    // =========================================================
    function renderTraffic() {
        const R = state.R;
        const src = [...R.sources.values()].sort((a, b) => b.sessions - a.sessions);
        const top = src.slice(0, 7);
        const rest = src.slice(7).reduce((s, x) => s + x.sessions, 0);
        const labels = top.map((x) => sourceName(x.key)).concat(rest ? ['Khác'] : []);
        doughnut('chartSources', labels, top.map((x) => x.sessions).concat(rest ? [rest] : []));

        const med = [...R.mediums.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 15);
        const maxS = Math.max(1, ...med.map((x) => x.sessions));
        $('#sourceTable').innerHTML = tableHTML([
            { label: 'Nguồn / Kênh', render: (x) => `<b>${esc(sourceName(x.key.split(' / ')[0]))}</b> <span class="tag">${esc(x.key.split(' / ')[1] || '')}</span>` },
            { label: 'Phiên', num: true, render: (x) => `<span class="mini-bar" style="width:${(x.sessions / maxS) * 60}px"></span>${fmt.num(x.sessions)}` },
            { label: 'Khách', num: true, render: (x) => fmt.num(x.users.size) },
            { label: 'Tỷ lệ thoát', num: true, render: (x) => fmt.pct(div(x.bounces, x.sessions), 0) },
            { label: 'Đơn', num: true, render: (x) => fmt.num(x.orders) },
            { label: 'Doanh thu', num: true, render: (x) => fmt.vnd(x.revenue) },
            { label: 'Chuyển đổi', num: true, render: (x) => { const c = div(x.orders, x.sessions); return `<span class="tag ${c >= R.cr && c > 0 ? 'green' : c > 0 ? 'amber' : ''}">${fmt.pct(c, 2)}</span>`; } }
        ], med);

        const devNames = { mobile: 'Điện thoại', desktop: 'Máy tính', tablet: 'Máy tính bảng' };
        const dev = [...R.devices.values()].sort((a, b) => b.sessions - a.sessions);
        doughnut('chartDevices', dev.map((x) => devNames[x.key] || x.key), dev.map((x) => x.sessions), ['#f59e0b', '#8b5cf6', '#22d3ee', '#64748b']);
        const br = [...R.browsers.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 8);
        hBar('chartBrowsers', br.map((x) => x.key), br.map((x) => x.sessions), '#3b82f6', (v) => fmt.num(v) + ' phiên');
        doughnut('chartNewRet', ['Khách mới', 'Khách quay lại'], [R.newVisitors, R.returningVisitors], ['#10b981', '#8b5cf6']);

        const camp = [...R.campaigns.values()].sort((a, b) => b.sessions - a.sessions);
        $('#campaignTable').innerHTML = tableHTML([
            { label: 'Chiến dịch', render: (x) => `<b>${esc(x.key)}</b><div class="card-sub">${esc(x.sm || '')}</div>` },
            { label: 'Phiên', num: true, render: (x) => fmt.num(x.sessions) },
            { label: 'Đơn', num: true, render: (x) => fmt.num(x.orders) },
            { label: 'Doanh thu', num: true, render: (x) => fmt.vnd(x.revenue) },
            { label: 'CR', num: true, render: (x) => fmt.pct(div(x.orders, x.sessions), 2) }
        ], camp, { empty: 'Chưa có chiến dịch. Gắn ?utm_source=facebook&utm_campaign=ten-chien-dich vào link quảng cáo để theo dõi.' });

        const refs = [...R.refs.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 12);
        $('#refTable').innerHTML = tableHTML([
            { label: 'Website', render: (x) => `<i class="fa-solid fa-link" style="opacity:.4;margin-right:6px"></i>${esc(x.key)}` },
            { label: 'Phiên', num: true, render: (x) => fmt.num(x.sessions) },
            { label: 'Đơn', num: true, render: (x) => fmt.num(x.orders) },
            { label: 'Doanh thu', num: true, render: (x) => fmt.vnd(x.revenue) }
        ], refs, { empty: 'Chưa có lượt truy cập từ website khác' });

        const pg = [...R.pages.values()].filter((p) => p.views > 0).sort((a, b) => b.views - a.views).slice(0, 20);
        const maxV = Math.max(1, ...pg.map((p) => p.views));
        $('#pageTable').innerHTML = tableHTML([
            { label: 'Trang', render: (p) => `<b>${esc(pageName(p.page))}</b><div class="card-sub">${esc(p.page)}</div>` },
            { label: 'Lượt xem', num: true, render: (p) => `<span class="mini-bar" style="width:${(p.views / maxV) * 80}px"></span>${fmt.num(p.views)}` },
            { label: 'Người xem', num: true, render: (p) => fmt.num(p.viewers.size) },
            { label: 'Vào trang đầu', num: true, render: (p) => fmt.num(p.entries) },
            { label: 'Thời gian TB', num: true, render: (p) => fmt.dur(div(p.time, p.views)) },
            { label: 'Cuộn TB', num: true, render: (p) => (p.scrollN ? fmt.pct(div(p.scrollSum, p.scrollN) / 100, 0) : '–') }
        ], pg);
    }

    // =========================================================
    // VIEW: HÀNH VI
    // =========================================================
    function renderBehavior() {
        const R = state.R;
        const chips = [
            ['Phiên có thêm giỏ', fmt.num(R.cartSessions), '#f59e0b'],
            ['Vào trang thanh toán', fmt.num(R.checkoutSessions), '#8b5cf6'],
            ['Tỷ lệ bỏ giỏ hàng', fmt.pct(R.abandonRate, 1), '#f43f5e'],
            ['Giá trị giỏ bị bỏ (ước tính)', fmt.vnd(R.abandonValue), '#22d3ee']
        ];
        $('#cartStats').innerHTML = chips.map(([l, v, c]) => `<div class="stat-chip" style="border-left:3px solid ${c}"><small>${l}</small><b>${v}</b></div>`).join('');

        const ab = [...R.abandon.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
        $('#abandonList').innerHTML = rankHTML(ab.map(([pid, n]) => {
            const row = state.rows.find((r) => r.pid === pid);
            return { name: row ? row.name : nameOf(pid), img: row ? row.img : imgOf(pid), v: n, label: `${fmt.num(n)} lần`, sub: row && row.price ? fmt.short(row.price) : '' };
        }), { thumb: true, color: 'linear-gradient(90deg,#f43f5e,#ec4899)', empty: 'Không có giỏ hàng bị bỏ' });

        const sl = R.searchList.slice(0, 40);
        $('#searchTable').innerHTML = tableHTML([
            { label: 'Từ khóa', render: (s) => `<i class="fa-solid fa-magnifying-glass" style="opacity:.35;margin-right:6px"></i><b>${esc(s.q)}</b>` },
            { label: 'Lượt tìm', num: true, render: (s) => fmt.num(s.count) },
            { label: 'Kết quả TB', num: true, render: (s) => div(s.results, s.count).toFixed(1) },
            { label: '', render: (s) => (s.zero === s.count ? '<span class="tag red">Không có kết quả</span>' : '') }
        ], sl, { empty: 'Chưa có lượt tìm kiếm nào' });

        const zs = R.searchList.filter((s) => s.zero > 0).sort((a, b) => b.zero - a.zero).slice(0, 8);
        $('#zeroSearch').innerHTML = rankHTML(zs.map((s) => ({ name: '“' + s.q + '”', v: s.zero, label: `${fmt.num(s.zero)} lần` })), { color: 'linear-gradient(90deg,#f43f5e,#f59e0b)', empty: 'Mọi từ khóa đều có kết quả 👍' });

        mkChart('chartWeekday', {
            type: 'bar',
            data: { labels: WEEKDAYS_FULL, datasets: [{ data: R.weekday, backgroundColor: R.weekday.map((v) => (v === Math.max(...R.weekday) ? '#f59e0b' : hexA('#22d3ee', 0.55))) }] },
            options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (it) => ` ${fmt.num(it.raw)} lượt xem` } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }
        });
        mkChart('chartScroll', {
            type: 'bar',
            data: { labels: ['0–25%', '25–50%', '50–75%', '75–100%'], datasets: [{ data: R.scroll, backgroundColor: ['#f43f5e', '#f59e0b', '#22d3ee', '#10b981'] }] },
            options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (it) => ` ${fmt.num(it.raw)} lượt (${fmt.pct(div(it.raw, R.scroll.reduce((s, v) => s + v, 0)))})` } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }
        });
        const ctNames = { zalo: 'Zalo', phone: 'Điện thoại', facebook: 'Facebook', messenger: 'Messenger', email: 'Email', tiktok: 'TikTok', youtube: 'YouTube' };
        const ct = [...R.contacts.entries()].sort((a, b) => b[1] - a[1]);
        doughnut('chartContact', ct.map((x) => ctNames[x[0]] || x[0]), ct.map((x) => x[1]), ['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#22d3ee']);

        const pf = R.perf.map((p) => ({ page: p.page, avg: div(p.sum, p.n), n: p.n })).sort((a, b) => b.avg - a.avg);
        $('#perfTable').innerHTML = tableHTML([
            { label: 'Trang', render: (p) => esc(pageName(p.page)) },
            { label: 'Tải TB', num: true, render: (p) => `<span class="tag ${p.avg < 2000 ? 'green' : p.avg < 4000 ? 'amber' : 'red'}">${(p.avg / 1000).toFixed(2)}s</span>` },
            { label: 'Mẫu', num: true, render: (p) => fmt.num(p.n) }
        ], pf);
        $('#errorTable').innerHTML = tableHTML([
            { label: 'Lỗi', render: (e) => `<span title="${esc(e.msg)}" style="font-family:monospace;font-size:12px">${esc(trunc(e.msg, 48))}</span><div class="card-sub">${esc(e.at)}</div>` },
            { label: 'Số lần', num: true, render: (e) => `<span class="tag red">${fmt.num(e.count)}</span>` }
        ], R.errors.slice(0, 10), { empty: 'Không có lỗi nào 🎉' });
    }

    // =========================================================
    // VIEW: ĐƠN HÀNG
    // =========================================================
    function renderOrders() {
        const R = state.R, P = state.P;
        const stats = [
            ['Đơn đặt hàng', fmt.num(R.ordersN), deltaHTML(R.ordersN, P.ordersN), 'fa-cart-shopping', '#f59e0b'],
            ['Đã thanh toán', `${fmt.num(R.paidOrders)} <small style="font-size:13px;color:var(--muted)">(${fmt.pct(div(R.paidOrders, R.ordersN), 0)})</small>`, deltaHTML(R.paidOrders, P.paidOrders), 'fa-circle-check', '#10b981'],
            ['Doanh thu thực thu', fmt.vnd(R.paidRevenue), deltaHTML(R.paidRevenue, P.paidRevenue), 'fa-money-bill-trend-up', '#22d3ee'],
            ['Giá trị đơn trung bình', fmt.vnd(R.aov), deltaHTML(R.aov, P.aov), 'fa-scale-balanced', '#8b5cf6']
        ];
        $('#orderStats').innerHTML = stats.map(([l, v, d, ic, c], i) => `
            <div class="card kpi" style="--kc:${c};animation:fadeUp .5s ${i * 0.05}s both">
                <div class="kpi-top"><div class="kpi-label"><i class="fa-solid ${ic}"></i>${l}</div>${d}</div>
                <div class="kpi-val">${v}</div>
            </div>`).join('');

        const r = state.range;
        const g = autoGran(r);
        const s = series(state.events, r.from, r.to, g === 'hour' ? 'hour' : g === 'month' ? 'week' : g);
        mkChart('chartRevenue', {
            type: 'bar',
            data: {
                labels: s.labels, datasets: [
                    { label: 'Doanh thu đặt hàng', data: s.revenue, backgroundColor: hexA('#f59e0b', 0.85) },
                    { label: 'Đã thanh toán', data: s.paidRevenue, backgroundColor: hexA('#10b981', 0.85) }
                ]
            },
            options: {
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { position: 'top', align: 'end' }, tooltip: { callbacks: { label: (it) => ` ${it.dataset.label}: ${fmt.vnd(it.raw)}` } } },
                scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 14, maxRotation: 0 } }, y: { beginAtZero: true, ticks: { callback: (v) => fmt.short(v) } } }
            }
        });

        const basket = [0, 0, 0, 0, 0];
        R.orders.forEach((o) => basket[Math.min(4, Math.max(1, o.items.length) - 1)]++);
        mkChart('chartBasket', {
            type: 'bar',
            data: { labels: ['1 khóa', '2 khóa', '3 khóa', '4 khóa', '5+ khóa'], datasets: [{ data: basket, backgroundColor: ['#8b5cf6', '#6d70f0', '#3b82f6', '#22d3ee', '#10b981'] }] },
            options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (it) => ` ${fmt.num(it.raw)} đơn (${fmt.pct(div(it.raw, R.ordersN))})` } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });

        const devIc = { mobile: 'fa-mobile-screen', desktop: 'fa-desktop', tablet: 'fa-tablet-screen-button' };
        const list = R.orders.slice().sort((a, b) => b.ts - a.ts).slice(0, 150);
        $('#orderTable').innerHTML = tableHTML([
            { label: 'Thời gian', render: (o) => `<span style="white-space:nowrap">${fmt.dt(o.ts)}</span>` },
            { label: 'Mã đơn', render: (o) => `<b style="font-family:monospace">${esc(o.id)}</b>` },
            { label: 'Khóa học', render: (o) => { const names = o.items.map((it) => nameOf(it.id, it.n)); return `<span title="${esc(names.join('\n'))}">${esc(trunc(names[0] || '–', 46))}${names.length > 1 ? ` <span class="tag violet">+${names.length - 1}</span>` : ''}</span>`; } },
            { label: 'Giá trị', num: true, render: (o) => `<b>${fmt.vnd(o.value)}</b>` },
            { label: 'Trạng thái', render: (o) => (o.paid ? '<span class="tag green"><i class="fa-solid fa-check"></i> Đã thanh toán</span>' : '<span class="tag amber"><i class="fa-regular fa-clock"></i> Chờ thanh toán</span>') },
            { label: 'Nguồn', render: (o) => esc(sourceName(o.source)) },
            { label: '', render: (o) => `<i class="fa-solid ${devIc[o.device] || 'fa-display'}" style="opacity:.55"></i>` }
        ], list, { empty: 'Chưa có đơn hàng trong khoảng thời gian này' });
    }

    // =========================================================
    // VIEW: THỜI GIAN THỰC
    // =========================================================
    function startRealtime() {
        stopRealtime();
        refreshRealtime();
        state.rtTimer = setInterval(refreshRealtime, state.mode === 'demo' ? 5000 : 30000);
    }
    function stopRealtime() { if (state.rtTimer) { clearInterval(state.rtTimer); state.rtTimer = null; } }

    async function refreshRealtime() {
        const now = Date.now(), since = now - 30 * 60000;
        let evs = [];
        try {
            if (state.mode === 'demo') {
                demoLiveTick();
                const all = state.demoEvents;
                for (let i = all.length - 1; i >= 0 && all[i].ts >= since; i--) evs.push(all[i]);
                evs.reverse();
            } else {
                const j = await apiGet({ action: 'events', from: since, to: now });
                evs = normalizeRows(j.cols, j.rows);
            }
        } catch (e) { toast(e.message, 'err'); return; }

        const active = new Set(), pagesNow = new Map();
        const perMin = new Array(30).fill(0);
        const last5 = now - 5 * 60000;
        const lastPage = new Map();
        evs.forEach((ev) => {
            if (ev.e === 'page_view') {
                const m = Math.floor((now - ev.ts) / 60000);
                if (m >= 0 && m < 30) perMin[29 - m]++;
            }
            if (ev.ts >= last5) {
                active.add(ev.vid);
                if (ev.e === 'page_view' || ev.e === 'product_view') {
                    lastPage.set(ev.vid, ev.e === 'product_view' ? '🎓 ' + nameOf(ev.pid, ev.pname) : pageName(ev.page));
                }
            }
        });
        lastPage.forEach((p) => pagesNow.set(p, (pagesNow.get(p) || 0) + 1));
        $('#rtActive').textContent = fmt.num(active.size);
        $('#rtMeta').textContent = `${fmt.num(evs.filter((e) => e.e === 'page_view').length)} lượt xem trong 30 phút · cập nhật ${new Date().toLocaleTimeString('vi-VN')}`;
        const pg = [...pagesNow.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
        $('#rtPages').innerHTML = rankHTML(pg.map(([n, v]) => ({ name: n, v, label: `${v} người` })), { color: 'linear-gradient(90deg,#10b981,#22d3ee)', empty: 'Chưa có ai đang truy cập' });

        if (state.charts.chartRealtime) {
            state.charts.chartRealtime.data.datasets[0].data = perMin;
            state.charts.chartRealtime.update('none');
        } else {
            mkChart('chartRealtime', {
                type: 'bar',
                data: { labels: perMin.map((_, i) => (i === 29 ? 'Bây giờ' : `-${29 - i}p`)), datasets: [{ data: perMin, backgroundColor: perMin.map((_, i) => hexA('#10b981', 0.35 + (i / 29) * 0.6)) }] },
                options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (it) => ` ${it.raw} lượt xem` } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
            });
        }

        const FEED = {
            page_view: ['fa-eye', '#8b5cf6', (e) => `Xem trang <b>${esc(pageName(e.page))}</b>`],
            product_view: ['fa-graduation-cap', '#22d3ee', (e) => `Xem khóa học <b>${esc(nameOf(e.pid, e.pname))}</b>`],
            product_click: ['fa-arrow-pointer', '#3b82f6', (e) => `Nhấp vào <b>${esc(nameOf(e.pid, e.pname))}</b>`],
            add_to_cart: ['fa-cart-plus', '#f59e0b', (e) => `Thêm vào giỏ <b>${esc(nameOf(e.pid, e.pname))}</b>`],
            begin_checkout: ['fa-credit-card', '#ec4899', (e) => `Vào trang thanh toán · ${fmt.vnd(e.value)}`],
            purchase: ['fa-bag-shopping', '#10b981', (e) => `🎉 Đặt đơn <b>${esc(e.pid)}</b> · <b>${fmt.vnd(e.value)}</b>`],
            purchase_paid: ['fa-circle-check', '#10b981', (e) => `💰 Đã thanh toán <b>${esc(e.pid)}</b> · ${fmt.vnd(e.value)}`],
            search: ['fa-magnifying-glass', '#a78bfa', (e) => `Tìm kiếm “<b>${esc((e.meta || {}).q || '')}</b>”`],
            contact_click: ['fa-headset', '#3b82f6', (e) => `Bấm liên hệ <b>${esc((e.meta || {}).type || '')}</b>`]
        };
        const feed = evs.filter((e) => FEED[e.e]).slice(-40).reverse();
        const devIc = { mobile: 'fa-mobile-screen', desktop: 'fa-desktop', tablet: 'fa-tablet-screen-button' };
        $('#rtFeed').innerHTML = feed.length ? feed.map((e) => {
            const [ic, c, txt] = FEED[e.e];
            return `<div class="feed-item"><div class="feed-ic" style="background:${hexA(c, 0.14)};color:${c}"><i class="fa-solid ${ic}"></i></div>
                <div class="feed-body"><div>${txt(e)}</div><small><i class="fa-solid ${devIc[e.device] || 'fa-display'}"></i> ${esc(e.browser)} · ${esc(sourceName(e.source))} · khách ${esc(String(e.vid).slice(-5))}</small></div>
                <div class="feed-time">${fmt.ago(e.ts)}</div></div>`;
        }).join('') : emptyHTML('Chưa có hoạt động trong 30 phút qua', 'fa-satellite-dish');
    }

    // =========================================================
    // DỮ LIỆU MẪU (DEMO)
    // =========================================================
    const DEMO_CATALOG = [
        ['Thành thạo Excel từ cơ bản đến nâng cao', 199000, 'Tin học văn phòng'], ['Facebook Ads thực chiến 2026', 399000, 'Marketing'],
        ['TikTok Shop: Xây kênh bán hàng triệu view', 349000, 'Kinh doanh online'], ['ChatGPT & AI cho người đi làm', 249000, 'AI'],
        ['Thiết kế Canva chuyên nghiệp', 149000, 'Thiết kế'], ['Photoshop cho người mới bắt đầu', 199000, 'Thiết kế'],
        ['Edit video CapCut viral', 179000, 'Video'], ['Bán hàng Shopee từ A-Z', 299000, 'Kinh doanh online'],
        ['Python cơ bản cho người không chuyên', 299000, 'Lập trình'], ['Kế toán thực hành trên Excel', 349000, 'Tin học văn phòng'],
        ['Midjourney – Tạo ảnh bằng AI', 229000, 'AI'], ['Copywriting bán hàng đỉnh cao', 249000, 'Marketing'],
        ['Google Sheets & AppScript tự động hóa', 279000, 'Tin học văn phòng'], ['SEO Website lên top Google', 399000, 'Marketing'],
        ['Combo 10 khóa Marketing toàn diện', 799000, 'Combo'], ['Power BI phân tích dữ liệu', 449000, 'Tin học văn phòng'],
        ['Livestream bán hàng chốt đơn', 199000, 'Kinh doanh online'], ['Tiếng Anh giao tiếp công sở', 299000, 'Ngoại ngữ'],
        ['Zalo OA & Marketing tự động', 189000, 'Marketing'], ['Combo AI ứng dụng trọn đời', 699000, 'Combo']
    ].map((x, i) => ({ id: String(i + 1), name: x[0], price: x[1], cat: x[2], img: '' }));

    function generateDemo() {
        if (!state.catalog.length) setCatalog(DEMO_CATALOG);
        const cat = state.catalog.slice(0, 80);
        let seed = 20261020;
        const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
        const wpick = (arr) => { let t = 0; for (const a of arr) t += a.w; let r = rnd() * t; for (const a of arr) { if ((r -= a.w) <= 0) return a; } return arr[arr.length - 1]; };
        const uid = () => Math.floor(rnd() * 1e12).toString(36) + Math.floor(rnd() * 1e6).toString(36);
        const prods = cat.map((c, i) => ({ c: Object.assign({}, c, { price: c.price || 199000 }), w: (1 / Math.pow((i % 17) + 1, 0.85)) * (0.4 + rnd() * 1.2), conv: rnd() < 0.18 ? 0.004 : 0.03 + rnd() * 0.14 }));
        const sources = [
            { w: 22, source: '(direct)', medium: 'none', campaign: '', ref: '', m: 1.4 },
            { w: 26, source: 'google', medium: 'organic', campaign: '', ref: 'google.com', m: 1.3 },
            { w: 24, source: 'facebook', medium: 'social', campaign: '', ref: 'facebook.com', m: 0.9 },
            { w: 7, source: 'facebook', medium: 'cpc', campaign: 'flash-sale-thang-10', ref: '', m: 1.1 },
            { w: 8, source: 'zalo', medium: 'social', campaign: '', ref: '', m: 1.6 },
            { w: 7, source: 'tiktok', medium: 'social', campaign: '', ref: 'tiktok.com', m: 0.6 },
            { w: 3, source: 'tiktok', medium: 'cpc', campaign: 'tiktok-ads-khoa-ai', ref: '', m: 0.8 },
            { w: 3, source: 'youtube', medium: 'social', campaign: '', ref: 'youtube.com', m: 1 },
            { w: 2, source: 'coccoc', medium: 'organic', campaign: '', ref: 'coccoc.com', m: 1.1 },
            { w: 2, source: 'email', medium: 'email', campaign: 'newsletter-t10', ref: '', m: 1.8 }
        ];
        const devices = [{ w: 66, d: 'mobile' }, { w: 29, d: 'desktop' }, { w: 5, d: 'tablet' }];
        const mB = [{ w: 38, b: 'Chrome' }, { w: 24, b: 'Safari' }, { w: 16, b: 'Facebook App' }, { w: 10, b: 'Zalo App' }, { w: 6, b: 'Cốc Cốc' }, { w: 6, b: 'Samsung' }];
        const dB = [{ w: 58, b: 'Chrome' }, { w: 20, b: 'Cốc Cốc' }, { w: 15, b: 'Edge' }, { w: 5, b: 'Firefox' }, { w: 2, b: 'Safari' }];
        const hours = [1, 0.6, 0.3, 0.2, 0.2, 0.4, 1, 2, 3, 3.4, 3.8, 4.2, 4.6, 3.8, 3.2, 3.2, 3.4, 3.8, 4.4, 5.6, 6.4, 6.2, 4.6, 2.4].map((w, h) => ({ w, h }));
        const weekF = [1, 0.96, 1, 1.04, 1.08, 1.22, 1.12];
        const queries = [['excel', 10, 4], ['marketing', 8, 6], ['tiktok', 7, 3], ['ai', 9, 5], ['chatgpt', 7, 2], ['facebook ads', 5, 3], ['photoshop', 4, 2], ['canva', 5, 2], ['bán hàng online', 4, 4], ['python', 3, 1], ['kế toán', 3, 1], ['capcut', 3, 1], ['ielts', 3, 0], ['autocad', 2, 0], ['chứng khoán', 2, 0], ['tiếng trung', 2, 0], ['seo', 2, 2], ['premiere', 1, 0]].map(([q, w, n]) => ({ q, w, n }));
        const contacts = [{ w: 45, t: 'zalo' }, { w: 25, t: 'phone' }, { w: 20, t: 'facebook' }, { w: 10, t: 'messenger' }];
        const staticPages = [{ w: 75, p: '/' }, { w: 25, p: '/gioi-thieu.html' }];
        const lists = ['courseList', 'topCoursesList', 'newCoursesList', 'searchDropdownDesktop', 'aiCoursesList'];

        const events = [], pool = [];
        const now = Date.now(), DAYS = 190, start = sod(now) - (DAYS - 1) * DAY;
        for (let d = 0; d < DAYS; d++) {
            const dayStart = start + d * DAY, dow = (new Date(dayStart).getDay() + 6) % 7;
            let n = (55 + d * 0.38) * weekF[dow] * (0.8 + rnd() * 0.4);
            if (rnd() < 0.05) n *= 1.8;
            n = Math.round(n);
            for (let i = 0; i < n; i++) {
                let ts = dayStart + wpick(hours).h * 3600000 + Math.floor(rnd() * 3600000);
                if (ts > now) continue;
                const returning = pool.length > 50 && rnd() < 0.32;
                const vid = returning ? pool[Math.floor(rnd() * pool.length)] : uid();
                if (!returning) { pool.push(vid); if (pool.length > 4000) pool.shift(); }
                const src = wpick(sources), dev = wpick(devices).d;
                const browser = (dev === 'desktop' ? wpick(dB) : wpick(mB)).b;
                const os = dev === 'desktop' ? (browser === 'Safari' || rnd() < 0.12 ? 'macOS' : 'Windows') : (browser === 'Safari' || (browser !== 'Samsung' && rnd() < 0.3) ? 'iOS' : 'Android');
                const base = { vid, sid: uid(), source: src.source, medium: src.medium, campaign: src.campaign, ref: src.ref, device: dev, browser, os, isNew: !returning };
                const push = (e, extra) => events.push(Object.assign({ ts, e, page: '/', pid: '', pname: '', value: 0, meta: null }, base, extra));
                const cart = [];
                const nPages = rnd() < 0.4 ? 1 : 2 + Math.floor(-Math.log(rnd() + 1e-9) * 2.2);
                let page = (src.medium === 'organic' || src.medium === 'cpc') && rnd() < 0.55 ? 'product' : wpick(staticPages).p;
                let nextProd = null;
                for (let k = 0; k < Math.min(nPages, 12); k++) {
                    if (page === 'product') {
                        const pr = nextProd || wpick(prods); nextProd = null;
                        const path = '/chi-tiet.html';
                        push('page_view', { page: path });
                        if (k === 0) push('perf', { page: path, value: Math.round((dev === 'mobile' ? 1700 : 1000) + rnd() * 2600) });
                        ts += 800 + rnd() * 1500;
                        push('product_view', { page: path, pid: pr.c.id, pname: pr.c.name, value: pr.c.price });
                        const stay = 8000 + rnd() * 150000;
                        if (rnd() < Math.min(0.6, pr.conv * 0.9 * src.m * 3)) {
                            ts += stay * 0.6;
                            push('add_to_cart', { page: path, pid: pr.c.id, pname: pr.c.name, value: pr.c.price, meta: { dup: 0 } });
                            if (!cart.includes(pr)) cart.push(pr);
                        }
                        ts += stay;
                        push('engage', { page: path, value: Math.round(stay), meta: { scroll: Math.min(100, Math.round(20 + rnd() * 85)) } });
                        page = rnd() < 0.55 ? 'product' : wpick(staticPages).p;
                    } else {
                        push('page_view', { page });
                        if (k === 0) push('perf', { page, value: Math.round((dev === 'mobile' ? 1900 : 1100) + rnd() * 3000) });
                        if (rnd() < 0.14) { const q = wpick(queries); ts += 3000 + rnd() * 8000; push('search', { page, value: q.n, meta: { q: q.q } }); }
                        const stay = 5000 + rnd() * 90000;
                        ts += stay * 0.5;
                        if (rnd() < 0.035) push('contact_click', { page, meta: { type: wpick(contacts).t } });
                        if (k < nPages - 1) {
                            nextProd = wpick(prods);
                            push('product_click', { page, pid: nextProd.c.id, pname: nextProd.c.name, meta: { list: lists[Math.floor(rnd() * lists.length)] } });
                            page = 'product';
                        }
                        ts += stay * 0.5;
                        push('engage', { page: events[events.length - 1].page, value: Math.round(stay), meta: { scroll: Math.round(rnd() * 100) } });
                    }
                    ts += 1000 + rnd() * 4000;
                }
                if (cart.length && rnd() < 0.58) {
                    const total = cart.reduce((s, p) => s + p.c.price, 0);
                    const items = cart.map((p) => ({ id: p.c.id, n: p.c.name, p: p.c.price }));
                    ts += 5000;
                    push('page_view', { page: '/thanh-toan.html' });
                    push('begin_checkout', { page: '/thanh-toan.html', value: total, meta: { items } });
                    if (rnd() < 0.62) {
                        ts += 40000 + rnd() * 120000;
                        const oid = 'SEVQR' + (10000 + Math.floor(rnd() * 90000));
                        push('page_view', { page: '/hoan-tat.html' });
                        push('purchase', { page: '/hoan-tat.html', pid: oid, value: total, meta: { items } });
                        if (rnd() < 0.8) { ts += 60000 + rnd() * 180000; push('purchase_paid', { page: '/hoan-tat.html', pid: oid, value: total, meta: { items } }); }
                    }
                }
                if (rnd() < 0.004) push('js_error', { page: '/', meta: { msg: "Cannot read properties of null (reading 'classList')", src: 'main.js', line: 594 } });
            }
        }
        state._demo = { prods, sources, devices, mB, dB, queries, pool, uid, wpick, rnd };
        return events.filter((e) => e.ts <= now).sort((a, b) => a.ts - b.ts);
    }

    // Sinh thêm vài sự kiện "đang diễn ra" cho chế độ demo realtime
    function demoLiveTick() {
        const D = state._demo;
        if (!D) return;
        const n = 1 + Math.floor(D.rnd() * 4);
        for (let i = 0; i < n; i++) {
            const src = D.wpick(D.sources), dev = D.wpick(D.devices).d;
            const base = {
                vid: D.pool[Math.floor(D.rnd() * D.pool.length)] || D.uid(), sid: D.uid(), source: src.source, medium: src.medium, campaign: src.campaign, ref: src.ref,
                device: dev, browser: (dev === 'desktop' ? D.wpick(D.dB) : D.wpick(D.mB)).b, os: dev === 'desktop' ? 'Windows' : 'Android', isNew: D.rnd() < 0.6
            };
            const pr = D.wpick(D.prods);
            const r = D.rnd();
            const ts = Date.now() - Math.floor(D.rnd() * 4000);
            const ev = r < 0.45 ? { e: 'page_view', page: D.rnd() < 0.6 ? '/' : '/chi-tiet.html' }
                : r < 0.78 ? { e: 'product_view', page: '/chi-tiet.html', pid: pr.c.id, pname: pr.c.name, value: pr.c.price }
                    : r < 0.88 ? { e: 'search', page: '/', value: 3, meta: { q: D.wpick(D.queries).q } }
                        : r < 0.96 ? { e: 'add_to_cart', page: '/chi-tiet.html', pid: pr.c.id, pname: pr.c.name, value: pr.c.price, meta: { dup: 0 } }
                            : { e: 'purchase', page: '/hoan-tat.html', pid: 'SEVQR' + (10000 + Math.floor(D.rnd() * 90000)), value: pr.c.price, meta: { items: [{ id: pr.c.id, n: pr.c.name, p: pr.c.price }] } };
            state.demoEvents.push(Object.assign({ ts, page: '/', pid: '', pname: '', value: 0, meta: null }, base, ev));
        }
    }

    // =========================================================
    // XUẤT CSV
    // =========================================================
    function downloadCSV(filename, header, rows) {
        const escCSV = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        const csv = '\ufeff' + [header, ...rows].map((r) => r.map(escCSV).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('Đã xuất file ' + filename, 'ok');
    }
    function exportEvents() {
        const r = state.range;
        const rows = state.events.filter((e) => e.ts >= r.from && e.ts <= r.to).map((e) => [
            new Date(e.ts).toLocaleString('vi-VN'), e.e, e.page, e.pid, e.pid && e.e !== 'purchase' && e.e !== 'purchase_paid' ? nameOf(e.pid, e.pname) : '', e.value,
            e.source, e.medium, e.campaign, e.device, e.browser, e.os, e.vid, e.sid, e.meta ? JSON.stringify(e.meta) : ''
        ]);
        downloadCSV(`hihoedu-su-kien-${toDateInput(r.from)}_${toDateInput(r.to)}.csv`,
            ['Thời gian', 'Sự kiện', 'Trang', 'Mã SP/Đơn', 'Tên khóa học', 'Giá trị', 'Nguồn', 'Kênh', 'Chiến dịch', 'Thiết bị', 'Trình duyệt', 'HĐH', 'Mã khách', 'Mã phiên', 'Chi tiết'], rows);
    }
    function exportProducts() {
        const r = state.range;
        downloadCSV(`hihoedu-san-pham-${toDateInput(r.from)}_${toDateInput(r.to)}.csv`,
            ['Mã', 'Khóa học', 'Danh mục', 'Giá', 'Lượt xem', 'Người xem', 'Lượt nhấp', 'Thêm giỏ', 'Đơn hàng', 'Đã thanh toán', 'Doanh thu', 'Tỷ lệ mua (%)'],
            state.rows.slice().sort((a, b) => b.revenue - a.revenue).map((x) => [x.pid, x.name, x.cat, x.price, x.views, x.viewers, x.clicks, x.carts, x.qty, x.paidQty, x.revenue, (x.cr * 100).toFixed(2)]));
    }

    // =========================================================
    // UI: TOAST, LOADER, MODE, SETTINGS
    // =========================================================
    function toast(msg, type = 'ok') {
        const el = document.createElement('div');
        el.className = 'toast ' + type;
        el.innerHTML = `<i class="fa-solid ${type === 'ok' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i><span>${esc(msg)}</span>`;
        $('#toastWrap').appendChild(el);
        setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3800);
    }
    function showLoader(on) {
        $('#loader').classList.toggle('show', on);
        $('#btnRefresh').classList.toggle('spinning', on);
    }
    function updateModeUI() {
        const live = state.mode === 'live';
        $('#modePill').classList.toggle('live', live);
        $('#modeTitle').textContent = live ? 'Đang kết nối' : 'Dữ liệu mẫu';
        $('#modeSub').textContent = live ? 'Dữ liệu thật từ website' : 'Chưa kết nối backend';
        $('#demoBanner').classList.toggle('hidden', live);
    }
    function openSettings() {
        $('#cfgApi').value = state.cfg.api || '';
        $('#cfgKey').value = state.cfg.key || '';
        $('#cfgNoTrack').checked = localStorage.getItem('hiho_no_track') === '1';
        $('#connStatus').textContent = '';
        $('#settingsModal').classList.add('show');
    }
    const closeSettings = () => $('#settingsModal').classList.remove('show');

    async function testConnection() {
        const api = $('#cfgApi').value.trim(), key = $('#cfgKey').value.trim();
        const st = $('#connStatus');
        if (!/^https:\/\/script\.google\.com\//.test(api)) { st.innerHTML = '<span style="color:var(--danger)">✖ Link phải bắt đầu bằng https://script.google.com/</span>'; return false; }
        st.innerHTML = '<span style="color:var(--muted)"><i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...</span>';
        try {
            const res = await fetch(`${api}?action=stats&key=${encodeURIComponent(key)}`);
            const j = await res.json();
            if (!j.ok) throw new Error(j.error === 'unauthorized' ? 'Sai ADMIN_KEY' : j.error);
            st.innerHTML = `<span style="color:var(--success)">✔ Kết nối thành công! Đã có ${fmt.num(j.totalRows)} sự kiện được ghi nhận.</span>`;
            return true;
        } catch (e) {
            st.innerHTML = `<span style="color:var(--danger)">✖ ${esc(e.message || 'Không kết nối được')}. Kiểm tra lại link & quyền "Bất kỳ ai" khi Deploy.</span>`;
            return false;
        }
    }

    function switchTab(tab) {
        if (!TITLES[tab]) return;
        state.tab = tab;
        $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
        $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + tab));
        $('#pageTitle').textContent = TITLES[tab][0];
        if (tab !== 'realtime') stopRealtime();
        renderTab(tab);
        $('#sidebar').classList.remove('open');
        $('#overlay').classList.remove('show');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        try { history.replaceState(null, '', '#' + tab); } catch (e) { }
    }

    function bindUI() {
        $$('.nav-btn').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
        $$('[data-goto]').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.goto)));
        $('#menuToggle').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#overlay').classList.add('show'); });
        $('#overlay').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#overlay').classList.remove('show'); });

        $$('#rangeSeg button').forEach((b) => b.addEventListener('click', () => {
            $$('#rangeSeg button').forEach((x) => x.classList.toggle('active', x === b));
            if (b.dataset.range === 'custom') {
                $('#customRange').classList.add('show');
                if (!$('#dateFrom').value) { $('#dateFrom').value = toDateInput(state.range.from); $('#dateTo').value = toDateInput(state.range.to); }
                return;
            }
            $('#customRange').classList.remove('show');
            state.preset = b.dataset.range;
            loadData();
        }));
        $('#btnApplyRange').addEventListener('click', () => { state.preset = 'custom'; loadData(); });
        $('#btnRefresh').addEventListener('click', () => { if (state.mode === 'live') loadCatalog(); loadData(); });
        $('#btnExport').addEventListener('click', exportEvents);
        $('#btnExportProducts').addEventListener('click', exportProducts);

        $$('#granSeg button').forEach((b) => b.addEventListener('click', () => {
            state.gran = b.dataset.gran;
            $$('#granSeg button').forEach((x) => x.classList.toggle('active', x === b));
            const days = (state.range.to - state.range.from) / DAY;
            if (state.gran === 'hour' && days > 14) toast('Khoảng thời gian dài – biểu đồ theo giờ có thể rất dày', 'ok');
            renderTrafficChart();
        }));
        $$('#metricSeg button').forEach((b) => b.addEventListener('click', () => {
            state.metric = b.dataset.metric;
            $$('#metricSeg button').forEach((x) => x.classList.toggle('active', x === b));
            renderTrafficChart();
        }));
        $$('#sellerSeg button').forEach((b) => b.addEventListener('click', () => {
            state.sellerBy = b.dataset.by;
            $$('#sellerSeg button').forEach((x) => x.classList.toggle('active', x === b));
            renderBestChart();
        }));
        let st;
        $('#productSearch').addEventListener('input', (e) => { clearTimeout(st); st = setTimeout(() => { state.productFilter = e.target.value.trim(); renderProductTable(); }, 200); });
        $('#productTable').addEventListener('click', (e) => {
            const th = e.target.closest('th.sortable');
            if (!th || !th.dataset.key) return;
            const k = th.dataset.key;
            state.productSort = { key: k, dir: state.productSort.key === k ? -state.productSort.dir : (k === 'name' ? 1 : -1) };
            renderProductTable();
        });

        $('#btnOpenSettings').addEventListener('click', openSettings);
        $('#btnBannerConnect').addEventListener('click', openSettings);
        $('#btnCloseSettings').addEventListener('click', closeSettings);
        $('#settingsModal').addEventListener('click', (e) => { if (e.target.id === 'settingsModal') closeSettings(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettings(); });
        $('#btnTestConn').addEventListener('click', testConnection);
        $('#btnSaveCfg').addEventListener('click', async () => {
            if (!(await testConnection())) return;
            state.cfg = { api: $('#cfgApi').value.trim(), key: $('#cfgKey').value.trim(), demo: false };
            saveCfg(state.cfg);
            toast('Đã lưu! Đang tải dữ liệu thật...', 'ok');
            setTimeout(() => location.reload(), 700);
        });
        $('#btnUseDemo').addEventListener('click', () => {
            state.cfg.demo = true; saveCfg(state.cfg);
            setTimeout(() => location.reload(), 200);
        });
        $('#cfgNoTrack').addEventListener('change', (e) => {
            if (e.target.checked) localStorage.setItem('hiho_no_track', '1'); else localStorage.removeItem('hiho_no_track');
            toast(e.target.checked ? 'Trình duyệt này sẽ không được tính vào thống kê' : 'Đã bật lại theo dõi cho trình duyệt này', 'ok');
        });
        $('#btnClearCatalog').addEventListener('click', async () => {
            localStorage.removeItem(CATALOG_KEY);
            await loadCatalog(true);
            if (state.R) { state.rows = productRows(state.R); renderAll(); }
            toast(`Đã tải ${state.catalog.length} khóa học`, 'ok');
        });
    }

    // =========================================================
    // KHỞI ĐỘNG
    // =========================================================
    async function init() {
        bindUI();
        state.mode = state.cfg.api && state.cfg.key && !state.cfg.demo ? 'live' : 'demo';
        updateModeUI();
        state.range = computeRange(state.preset);
        await loadCatalog();
        const hash = location.hash.replace('#', '');
        if (TITLES[hash] && hash !== 'overview') switchTab(hash);
        await loadData();
        // Tự làm mới mỗi 5 phút khi đang ở chế độ thật
        if (state.mode === 'live') setInterval(() => { if (document.visibilityState === 'visible' && state.tab !== 'realtime') loadData(); }, 300000);
    }

    if (!window.Chart) {
        document.body.insertAdjacentHTML('afterbegin', '<div class="banner" style="margin:20px">Không tải được thư viện biểu đồ (Chart.js). Vui lòng kiểm tra kết nối mạng.</div>');
    }
    init();
})();
