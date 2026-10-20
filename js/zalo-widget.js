/**
 * HihoEdu Zalo Widget & QR Modal
 * Tự động tạo:
 * 1. Nút Zalo nổi (Floating Button) kèm hiệu ứng radar sóng âm góc dưới phải màn hình
 * 2. Thẻ xem trước mã QR (Hover Card trên Desktop)
 * 3. Hộp thoại phóng to mã QR (Modal Lightbox) trên mọi thiết bị
 * 4. Tương thích 100% Mobile & Desktop, không đè lên thanh menu dưới
 */
(function () {
    'use strict';

    var ZALO_URL = 'https://zaloapp.com/qr/p/9ww6r6joc965';
    var QR_IMG = 'images/zalo-qr.png';

    // 1. Chèn CSS styles
    var css = `
        .zalo-float-wrap {
            position: fixed;
            bottom: 28px;
            right: 28px;
            z-index: 9998;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        @media (max-width: 768px) {
            .zalo-float-wrap {
                bottom: 82px; /* Tránh đè lên thanh sticky bottom bar trên điện thoại */
                right: 18px;
            }
        }
        .zalo-pulse-ring {
            position: absolute;
            inset: -8px;
            border-radius: 9999px;
            background: rgba(0, 104, 255, 0.4);
            animation: zaloRadar 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            pointer-events: none;
            z-index: 1;
        }
        .zalo-pulse-ring-2 {
            position: absolute;
            inset: -16px;
            border-radius: 9999px;
            background: rgba(0, 104, 255, 0.2);
            animation: zaloRadar 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            animation-delay: 0.6s;
            pointer-events: none;
            z-index: 1;
        }
        @keyframes zaloRadar {
            0% { transform: scale(0.85); opacity: 0.9; }
            100% { transform: scale(1.6); opacity: 0; }
        }
        .zalo-btn-main {
            position: relative;
            z-index: 2;
            width: 58px;
            height: 58px;
            border-radius: 9999px;
            background: linear-gradient(135deg, #0088ff 0%, #0068ff 100%);
            box-shadow: 0 8px 24px rgba(0, 104, 255, 0.45), 0 2px 6px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            border: 2px solid rgba(255, 255, 255, 0.85);
            text-decoration: none;
        }
        .zalo-btn-main:hover {
            transform: scale(1.1) translateY(-2px);
            box-shadow: 0 12px 30px rgba(0, 104, 255, 0.6);
        }
        .zalo-btn-main svg {
            width: 34px;
            height: 34px;
            fill: #ffffff;
        }
        .zalo-tooltip {
            position: absolute;
            right: 70px;
            top: 50%;
            transform: translateY(-50%);
            background: #0B132B;
            color: #ffffff;
            padding: 8px 14px;
            border-radius: 30px;
            font-size: 13px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 4px 16px rgba(0,0,0,0.25);
            pointer-events: none;
            opacity: 0;
            transition: all 0.25s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            border: 1px solid rgba(255,255,255,0.15);
        }
        .zalo-tooltip::after {
            content: '';
            position: absolute;
            right: -6px;
            top: 50%;
            transform: translateY(-50%);
            border-width: 6px 0 6px 6px;
            border-style: solid;
            border-color: transparent transparent transparent #0B132B;
        }
        .zalo-float-wrap:hover .zalo-tooltip {
            opacity: 1;
            right: 76px;
        }

        /* Hover Card Trên Desktop */
        .zalo-hover-card {
            position: absolute;
            bottom: 74px;
            right: 0;
            width: 290px;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 45px rgba(11, 19, 43, 0.25), 0 2px 10px rgba(0, 104, 255, 0.15);
            border: 1px solid rgba(0, 104, 255, 0.15);
            padding: 16px;
            text-align: center;
            opacity: 0;
            visibility: hidden;
            transform: translateY(12px) scale(0.95);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 9999;
        }
        .zalo-float-wrap.active .zalo-hover-card,
        .zalo-float-wrap:hover .zalo-hover-card {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
        }
        @media (max-width: 768px) {
            /* Trên Mobile ẩn hover card, bấm vào nút sẽ mở thẳng Lightbox Modal */
            .zalo-hover-card { display: none !important; }
            .zalo-tooltip { display: none !important; }
        }

        /* Modal Lightbox Toàn Màn Hình */
        .zalo-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(11, 19, 43, 0.75);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        .zalo-modal-backdrop.show {
            opacity: 1;
            visibility: visible;
        }
        .zalo-modal-content {
            background: #ffffff;
            border-radius: 24px;
            max-width: 380px;
            width: 100%;
            overflow: hidden;
            box-shadow: 0 25px 60px rgba(0,0,0,0.35);
            transform: scale(0.9) translateY(20px);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
        }
        .zalo-modal-backdrop.show .zalo-modal-content {
            transform: scale(1) translateY(0);
        }
        .zalo-modal-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 36px;
            height: 36px;
            border-radius: 9999px;
            background: rgba(0,0,0,0.06);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #4b5563;
            cursor: pointer;
            transition: all 0.2s;
            z-index: 10;
        }
        .zalo-modal-close:hover {
            background: rgba(239, 68, 68, 0.15);
            color: #dc2626;
            transform: rotate(90deg);
        }
    `;

    var styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.appendChild(document.createTextNode(css));
    document.head.appendChild(styleEl);

    // 2. SVG Icon Zalo chuẩn chính hãng
    var ZALO_SVG = '<svg viewBox="0 0 48 48"><path d="M24 4C12.95 4 4 12.51 4 23.01c0 5.86 2.8 11.13 7.27 14.73-.32 2.76-1.5 6.37-3.83 8.89 0 0 5.62-.48 10.42-3.41 1.95.53 4.02.82 6.14.82 11.05 0 20-8.51 20-19.01S35.05 4 24 4z" fill="#fff" opacity=".18"/><path d="M12.5 30.5c.3 0 .6-.1.8-.4l7.6-9.1h-7.6c-.6 0-1-.4-1-1s.4-1 1-1h10c.6 0 1 .4 1 1 0 .2-.1.5-.3.7l-7.7 9.3h8.3c.6 0 1 .4 1 1s-.4 1-1 1h-10.5c-.7-.1-1.2-.6-.6-1.5zm16.7-11.5c-3.6 0-6.5 2.8-6.5 6.2s2.9 6.2 6.5 6.2 6.5-2.8 6.5-6.2-2.9-6.2-6.5-6.2zm0 10.4c-2.4 0-4.3-1.9-4.3-4.2s1.9-4.2 4.3-4.2 4.3 1.9 4.3 4.2-1.9 4.2-4.3 4.2z" fill="#fff"/></svg>';

    // 3. Khởi tạo HTML Widget & Modal
    function initZaloWidget() {
        if (document.getElementById('zaloFloatWidget')) return;

        // Container Nút Nổi
        var wrap = document.createElement('div');
        wrap.id = 'zaloFloatWidget';
        wrap.className = 'zalo-float-wrap';
        wrap.innerHTML = `
            <div class="zalo-pulse-ring"></div>
            <div class="zalo-pulse-ring-2"></div>
            
            <a href="${ZALO_URL}" target="_blank" rel="noopener noreferrer" class="zalo-btn-main" id="btnMainZalo" title="Chat Zalo & Quét mã QR" aria-label="Chat Zalo với HihoEdu">
                ${ZALO_SVG}
            </a>

            <div class="zalo-tooltip">
                <i class="fa-solid fa-qrcode" style="color:#60a5fa"></i>
                <span>Tư vấn Zalo / Quét mã</span>
            </div>

            <div class="zalo-hover-card">
                <div style="background: linear-gradient(135deg, #0088ff 0%, #0068ff 100%); color: #fff; padding: 10px 14px; border-radius: 14px; margin-bottom: 12px; display:flex; align-items:center; justify-content:space-between;">
                    <div style="font-weight: 800; font-size: 14px; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-comment-dots"></i> Tư vấn Zalo HihoEdu
                    </div>
                    <span style="font-size: 10px; background: rgba(255,255,255,0.25); padding: 2px 7px; border-radius: 20px; font-weight: 600;">24/7</span>
                </div>
                
                <div style="background: #f8fafc; padding: 8px; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 10px; cursor: pointer;" onclick="window.openZaloModal();">
                    <img src="${QR_IMG}" alt="Danh thiếp Zalo HihoEdu" style="width: 100%; height: auto; border-radius: 10px; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                </div>

                <p style="font-size: 11.5px; color: #64748b; margin: 0 0 10px; line-height: 1.4;">
                    Quét mã bằng camera hoặc ứng dụng Zalo để được tư vấn lộ trình học miễn phí.
                </p>

                <div style="display:flex; gap:6px;">
                    <button type="button" onclick="window.openZaloModal();" style="flex:1; padding: 8px 10px; background: #f1f5f9; hover:background:#e2e8f0; color: #334155; font-size: 12px; font-weight: 700; border-radius: 10px; border: none; cursor: pointer; transition: background 0.2s;">
                        <i class="fa-solid fa-expand"></i> Phóng to
                    </button>
                    <a href="${ZALO_URL}" target="_blank" rel="noopener noreferrer" style="flex:1.5; padding: 8px 12px; background: #0068FF; color: #fff; font-size: 12px; font-weight: 700; border-radius: 10px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 4px 10px rgba(0,104,255,0.35);">
                        Chat Zalo <i class="fa-solid fa-arrow-right" style="font-size: 10px;"></i>
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(wrap);

        // Modal Lightbox Phóng To
        var modal = document.createElement('div');
        modal.id = 'zaloQRModal';
        modal.className = 'zalo-modal-backdrop';
        modal.innerHTML = `
            <div class="zalo-modal-content">
                <button class="zalo-modal-close" onclick="window.closeZaloModal();" aria-label="Đóng">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
                <div style="padding: 24px 20px 20px; text-align: center;">
                    <div style="display:inline-flex; align-items:center; gap:8px; padding: 6px 14px; background: #eff6ff; color: #0068ff; border-radius: 30px; font-size: 12px; font-weight: 800; margin-bottom: 14px;">
                        <i class="fa-solid fa-shield-halved"></i> Kênh Zalo Chính Thức HihoEdu
                    </div>
                    
                    <div style="background: #ffffff; border-radius: 16px; padding: 4px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.08); margin-bottom: 16px;">
                        <img src="${QR_IMG}" alt="Mã QR Zalo HihoEdu" style="width: 100%; height: auto; border-radius: 14px; display: block;">
                    </div>

                    <h3 style="font-size: 17px; font-weight: 800; color: #0B132B; margin: 0 0 6px;">Quét Mã Để Thêm Bạn Zalo</h3>
                    <p style="font-size: 12.5px; color: #64748b; margin: 0 0 18px; line-height: 1.5;">
                        Mở camera hoặc Zalo quét mã phía trên, hoặc nhấn nút bên dưới để mở cuộc trò chuyện trực tiếp.
                    </p>

                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <a href="${ZALO_URL}" target="_blank" rel="noopener noreferrer" style="width:100%; padding: 13px; background: linear-gradient(135deg, #0088ff 0%, #0068ff 100%); color:#fff; font-size: 14px; font-weight: 800; border-radius: 14px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow: 0 6px 18px rgba(0, 104, 255, 0.4);">
                            <i class="fa-solid fa-comment-dots text-base"></i> Nhắn Tin Qua Zalo Ngay
                        </a>
                        <button type="button" onclick="window.closeZaloModal();" style="width:100%; padding: 10px; background: transparent; color:#64748b; font-size: 13px; font-weight: 600; border:none; cursor:pointer;">
                            Để sau
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Đóng modal khi bấm ra ngoài hoặc nhấn phím ESC
        modal.addEventListener('click', function (e) {
            if (e.target === modal) window.closeZaloModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') window.closeZaloModal();
        });

        // Xử lý click nút Zalo chính trên Mobile
        var btnMain = document.getElementById('btnMainZalo');
        if (btnMain) {
            btnMain.addEventListener('click', function (e) {
                // Trên Mobile mở Modal QR để người dùng có thể quét hoặc bấm chat
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    window.openZaloModal();
                }
            });
        }

        // Bắt sự kiện trên các nút có data-zalo-qr trên toàn website
        document.addEventListener('click', function (e) {
            var target = e.target.closest('[data-zalo-qr]');
            if (target) {
                e.preventDefault();
                window.openZaloModal();
            }
        });
    }

    // Các hàm global
    window.openZaloModal = function () {
        var m = document.getElementById('zaloQRModal');
        if (m) m.classList.add('show');
    };

    window.closeZaloModal = function () {
        var m = document.getElementById('zaloQRModal');
        if (m) m.classList.remove('show');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initZaloWidget);
    } else {
        initZaloWidget();
    }
})();
