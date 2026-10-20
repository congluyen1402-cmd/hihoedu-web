/**
 * HihoEdu Tracker – thu thập dữ liệu hành vi người dùng (nhẹ, không cookie bên thứ 3)
 * Gắn vào CUỐI mỗi trang, SAU cart.js và main.js:
 *     <script src="js/tracker.js" defer></script>
 *
 * Sự kiện thu thập: page_view, engage (thời gian xem + % cuộn), product_view,
 * product_click, add_to_cart, remove_from_cart, begin_checkout, purchase,
 * purchase_paid, search, contact_click, perf (tốc độ tải trang), js_error.
 */
(function () {
    'use strict';

    // ================== CẤU HÌNH ==================
    // Link Web App (Apps Script analytics.gs):
    var ENDPOINT = 'https://script.google.com/macros/s/AKfycbywNm8RWGA92SFBgSThbTwjed7L4xg9Wg4N8qXcOzsLHGij1FPWmVSCLUIQwaABe-Yyeg/exec';
    var SESSION_TIMEOUT = 30 * 60 * 1000; // 30 phút không hoạt động = phiên mới
    var FLUSH_INTERVAL = 4000;
    // ==============================================

    try {
        if (window.__hihoTracker) return;
        window.__hihoTracker = true;

        var ua = navigator.userAgent || '';
        if (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|pingdom|gtmetrix/i.test(ua)) return;
        if (/\/admin(\/|$)/.test(location.pathname)) return;

        var store = {
            get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
            set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
        };
        if (store.get('hiho_no_track') === '1') return; // admin tự loại trừ lượt truy cập của mình

        var enabled = /^https:\/\/script\.google\.com\//.test(ENDPOINT);

        // ---------- Định danh khách & phiên ----------
        var uid = function () {
            return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        };
        var isNewVisitor = false;
        var vid = store.get('hiho_vid');
        if (!vid) { vid = uid(); store.set('hiho_vid', vid); isNewVisitor = true; }

        // ---------- Nguồn truy cập ----------
        var qs = new URLSearchParams(location.search);
        var refHost = '';
        try {
            if (document.referrer) {
                var r = new URL(document.referrer);
                if (r.hostname !== location.hostname) refHost = r.hostname.replace(/^www\./, '');
            }
        } catch (e) { }

        var classify = function () {
            var src = qs.get('utm_source'), med = qs.get('utm_medium'), camp = qs.get('utm_campaign');
            if (src) return { source: src.toLowerCase(), medium: (med || 'utm').toLowerCase(), campaign: camp || '' };
            if (qs.get('fbclid')) return { source: 'facebook', medium: 'social', campaign: '' };
            if (qs.get('gclid')) return { source: 'google', medium: 'cpc', campaign: '' };
            if (qs.get('ttclid')) return { source: 'tiktok', medium: 'cpc', campaign: '' };
            if (/zalo/i.test(ua)) return { source: 'zalo', medium: 'social', campaign: '' };
            if (/FBAN|FBAV|FB_IAB|Instagram/i.test(ua) && !refHost) return { source: 'facebook', medium: 'social', campaign: '' };
            if (!refHost) return { source: '(direct)', medium: 'none', campaign: '' };
            var map = [
                [/google\./, 'google', 'organic'], [/bing\.|coccoc|yahoo|duckduckgo|yandex/, refHost.split('.')[0], 'organic'],
                [/facebook|fb\.|messenger/, 'facebook', 'social'], [/instagram/, 'instagram', 'social'],
                [/zalo/, 'zalo', 'social'], [/tiktok/, 'tiktok', 'social'], [/youtube|youtu\.be/, 'youtube', 'social'],
                [/t\.co|twitter|x\.com/, 'twitter', 'social'], [/linkedin/, 'linkedin', 'social']
            ];
            for (var i = 0; i < map.length; i++) if (map[i][0].test(refHost)) return { source: map[i][1], medium: map[i][2], campaign: '' };
            return { source: refHost, medium: 'referral', campaign: '' };
        };

        var now = Date.now();
        var sess = null;
        try { sess = JSON.parse(store.get('hiho_sess') || 'null'); } catch (e) { }
        var cls = classify();
        var hasCampaign = !!qs.get('utm_source') || !!qs.get('fbclid') || !!qs.get('gclid');
        if (!sess || now - sess.last > SESSION_TIMEOUT || hasCampaign ||
            new Date(sess.last).toDateString() !== new Date(now).toDateString()) {
            sess = { id: uid(), last: now, source: cls.source, medium: cls.medium, campaign: cls.campaign, ref: refHost };
        }
        var touch = function () { sess.last = Date.now(); store.set('hiho_sess', JSON.stringify(sess)); };
        touch();

        // ---------- Thiết bị ----------
        var w = Math.min(screen.width || 0, window.innerWidth || 9999);
        var device = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet'
            : (/Mobi|iPhone|Android/i.test(ua) || w < 768) ? 'mobile' : 'desktop';
        var browser = /Zalo/i.test(ua) ? 'Zalo App' : /FBAN|FBAV|FB_IAB/i.test(ua) ? 'Facebook App' : /coc_coc|CocCoc/i.test(ua) ? 'Cốc Cốc'
            : /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung'
            : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Khác';
        var os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
            : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Khác';

        var page = (location.pathname.replace(/\/index\.html$/, '/') || '/');

        var ctx = function () {
            return {
                vid: vid, sid: sess.id, page: page, ref: sess.ref, source: sess.source, medium: sess.medium,
                campaign: sess.campaign, device: device, browser: browser, os: os,
                screen: (screen.width || 0) + 'x' + (screen.height || 0), lang: (navigator.language || '').slice(0, 5),
                'new': isNewVisitor ? 1 : 0
            };
        };

        // ---------- Hàng đợi & gửi ----------
        var queue = [];
        var flush = function (useBeacon) {
            if (!enabled) { queue.length = 0; return; }
            if (!queue.length) return;
            var batch = queue.splice(0, 50);
            var payload = JSON.stringify({ action: 'analytics_track', ctx: ctx(), events: batch });
            var sent = false;
            if (useBeacon && navigator.sendBeacon) {
                try { sent = navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'text/plain;charset=utf-8' })); } catch (e) { }
            }
            if (!sent) {
                try {
                    fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: payload.length < 60000, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload })
                        .catch(function () { });
                } catch (e) { }
            }
            if (queue.length) flush(useBeacon);
        };

        var track = function (event, data) {
            data = data || {};
            var ev = { event: event, ts: Date.now(), page: page };
            for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) ev[k] = data[k];
            queue.push(ev);
            touch();
            if (!enabled && window.console) console.debug('[HihoTracker - chưa cấu hình ENDPOINT]', ev);
        };

        var parsePrice = function (s) {
            if (typeof s === 'number') return s;
            return parseInt(String(s || '').replace(/[^\d]/g, ''), 10) || 0;
        };

        window.HihoTrack = { track: track, flush: flush };

        // ================== 1. PAGE VIEW ==================
        track('page_view', { meta: { title: document.title.slice(0, 120), path: location.pathname + location.search.slice(0, 80) } });

        // ================== 2. ENGAGEMENT (thời gian xem thực + % cuộn) ==================
        var visibleSince = document.visibilityState === 'visible' ? Date.now() : 0;
        var activeMs = 0, maxScroll = 0, lastSentActive = 0;
        window.addEventListener('scroll', function () {
            var h = document.documentElement.scrollHeight - window.innerHeight;
            var p = h > 0 ? Math.round((window.scrollY / h) * 100) : 100;
            if (p > maxScroll) maxScroll = Math.min(100, p);
        }, { passive: true });

        var sendEngage = function () {
            if (visibleSince) { activeMs += Date.now() - visibleSince; visibleSince = 0; }
            var delta = activeMs - lastSentActive;
            if (delta < 500) return;
            lastSentActive = activeMs;
            track('engage', { value: Math.min(delta, 30 * 60 * 1000), meta: { scroll: maxScroll } });
            flush(true);
        };
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') sendEngage();
            else visibleSince = Date.now();
        });
        window.addEventListener('pagehide', sendEngage);

        // ================== 3. PRODUCT VIEW (trang chi tiết) ==================
        if (/chi-tiet/.test(location.pathname)) {
            var pid = qs.get('id');
            if (pid) {
                var tries = 0;
                var waitTitle = setInterval(function () {
                    var t = document.getElementById('courseTitle');
                    var pr = document.getElementById('courseNewPrice');
                    var name = t ? (t.textContent || '').trim() : '';
                    if (name || ++tries > 40) {
                        clearInterval(waitTitle);
                        track('product_view', { pid: pid, pname: name, value: pr ? parsePrice(pr.textContent) : 0 });
                    }
                }, 200);
            }
        }

        // ================== 4. CLICK: sản phẩm & liên hệ ==================
        document.addEventListener('click', function (e) {
            var a = e.target && e.target.closest ? e.target.closest('a') : null;
            if (!a) return;
            var href = a.getAttribute('href') || '';
            var m = href.match(/chi-tiet\.html\?id=([^&#]+)/);
            if (m) {
                var listEl = a.closest('[id]');
                var list = listEl ? listEl.id : '';
                var nameEl = a.querySelector('h3,h4') || (a.parentElement && a.parentElement.querySelector('h3,h4'));
                var img = a.querySelector('img');
                var name = nameEl ? nameEl.textContent.trim() : (img ? img.alt : '');
                track('product_click', { pid: decodeURIComponent(m[1]), pname: name.slice(0, 200), meta: { list: list } });
                flush(true);
                return;
            }
            var type = /^tel:/.test(href) ? 'phone' : /zalo\.me|zalo/i.test(href) ? 'zalo' : /m\.me|messenger/i.test(href) ? 'messenger'
                : /facebook\.com|fb\.com/i.test(href) ? 'facebook' : /^mailto:/.test(href) ? 'email' : /tiktok/i.test(href) ? 'tiktok'
                : /youtube/i.test(href) ? 'youtube' : '';
            if (type) { track('contact_click', { meta: { type: type, href: href.slice(0, 120) } }); flush(true); }
        }, true);

        // ================== 5. GIỎ HÀNG ==================
        var wrapCart = function () {
            if (typeof window.addToCart === 'function' && !window.addToCart.__tracked) {
                var orig = window.addToCart;
                window.addToCart = function (course) {
                    try {
                        var before = typeof getCart === 'function' ? getCart().length : -1;
                        var r = orig.apply(this, arguments);
                        var after = typeof getCart === 'function' ? getCart().length : -1;
                        if (course) track('add_to_cart', {
                            pid: String(course.id || ''), pname: String(course.ten_khoa_hoc || '').slice(0, 200),
                            value: parsePrice(course.gia_moi), meta: { dup: after === before ? 1 : 0 }
                        });
                        return r;
                    } catch (err) { return orig.apply(this, arguments); }
                };
                window.addToCart.__tracked = true;
            }
            if (typeof window.removeFromCart === 'function' && !window.removeFromCart.__tracked) {
                var origR = window.removeFromCart;
                window.removeFromCart = function (name) {
                    try {
                        var item = (typeof getCart === 'function' ? getCart() : []).filter(function (c) { return c.ten_khoa_hoc === name; })[0];
                        if (item) track('remove_from_cart', { pid: String(item.id || ''), pname: String(name).slice(0, 200), value: parsePrice(item.gia_moi) });
                    } catch (e) { }
                    return origR.apply(this, arguments);
                };
                window.removeFromCart.__tracked = true;
            }
        };
        wrapCart();
        document.addEventListener('DOMContentLoaded', wrapCart);

        // ================== 6. CHECKOUT & ĐƠN HÀNG ==================
        if (/thanh-toan/.test(location.pathname) && typeof getCart === 'function') {
            var cart = getCart();
            if (cart.length) {
                track('begin_checkout', {
                    value: cart.reduce(function (s, c) { return s + parsePrice(c.gia_moi); }, 0),
                    meta: { items: cart.map(function (c) { return { id: String(c.id || ''), n: String(c.ten_khoa_hoc || '').slice(0, 120), p: parsePrice(c.gia_moi) }; }) }
                });
            }
        }

        if (/hoan-tat/.test(location.pathname)) {
            var order = null;
            try { order = JSON.parse(store.get('hiho_latest_order') || 'null'); } catch (e) { }
            if (order && order.orderId) {
                var done = {};
                try { done = JSON.parse(store.get('hiho_tracked_orders') || '{}'); } catch (e) { }
                var items = (order.items || []).map(function (c) { return { id: String(c.id || ''), n: String(c.ten_khoa_hoc || '').slice(0, 120), p: parsePrice(c.gia_moi) }; });
                if (!done[order.orderId]) {
                    track('purchase', { pid: order.orderId, value: Number(order.total) || 0, meta: { items: items } });
                    done[order.orderId] = 1;
                    store.set('hiho_tracked_orders', JSON.stringify(done));
                    flush(true);
                }
                // Theo dõi khi thanh toán thành công (hộp paymentSuccessBox hiện ra)
                var watchPaid = function () {
                    var box = document.getElementById('paymentSuccessBox');
                    if (!box) return;
                    var obs = new MutationObserver(function () {
                        if (!box.classList.contains('hidden') && done[order.orderId] !== 2) {
                            done[order.orderId] = 2;
                            store.set('hiho_tracked_orders', JSON.stringify(done));
                            track('purchase_paid', { pid: order.orderId, value: Number(order.total) || 0, meta: { items: items } });
                            flush(true);
                            obs.disconnect();
                        }
                    });
                    obs.observe(box, { attributes: true, attributeFilter: ['class'] });
                };
                if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchPaid); else watchPaid();
            }
        }

        // ================== 7. TÌM KIẾM ==================
        var bindSearch = function (inputId, dropId) {
            var input = document.getElementById(inputId);
            if (!input || input.__tracked) return;
            input.__tracked = true;
            var timer = null, lastQ = '';
            input.addEventListener('input', function () {
                clearTimeout(timer);
                timer = setTimeout(function () {
                    var q = (input.value || '').trim().toLowerCase();
                    if (q.length < 2 || q === lastQ) return;
                    lastQ = q;
                    var drop = document.getElementById(dropId);
                    var n = drop ? drop.querySelectorAll('a[href*="chi-tiet"]').length : -1;
                    track('search', { value: n, meta: { q: q.slice(0, 80) } });
                }, 1500);
            });
        };
        var initSearch = function () {
            bindSearch('searchInput', 'searchDropdownDesktop');
            bindSearch('mobileSearchInput', 'searchDropdownMobile');
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSearch); else initSearch();

        // ================== 8. TỐC ĐỘ TẢI TRANG ==================
        window.addEventListener('load', function () {
            setTimeout(function () {
                try {
                    var nav = performance.getEntriesByType('navigation')[0];
                    if (nav && nav.loadEventEnd > 0) {
                        track('perf', { value: Math.round(nav.loadEventEnd), meta: { ttfb: Math.round(nav.responseStart), dom: Math.round(nav.domContentLoadedEventEnd) } });
                    }
                } catch (e) { }
            }, 0);
        });

        // ================== 9. LỖI JAVASCRIPT ==================
        var errCount = 0;
        window.addEventListener('error', function (e) {
            if (++errCount > 3) return;
            track('js_error', { meta: { msg: String(e.message || '').slice(0, 200), src: String(e.filename || '').split('/').pop().slice(0, 60), line: e.lineno || 0 } });
        });

        // ---------- Gửi định kỳ ----------
        setInterval(function () { flush(false); }, FLUSH_INTERVAL);
        setTimeout(function () { flush(false); }, 1500);
    } catch (err) {
        // Tracker không bao giờ được làm hỏng website
        if (window.console) console.warn('HihoTracker error', err);
    }
})();
