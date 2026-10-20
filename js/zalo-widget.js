/**
 * HihoEdu Zalo Widget & QR Modal
 * - Nút Zalo nổi góc dưới phải màn hình với hiệu ứng radar sóng âm
 * - Hiển thị mã QR chuẩn vuông sắc nét (đã cắt riêng phần QR chuyên nghiệp)
 * - Nút bấm chuyển trực tiếp vào giao diện nhắn tin Zalo
 */
(function () {
    'use strict';

    // CẤU HÌNH LIÊN KẾT ZALO:
    // Link mở thẳng vào khung chat Zalo của chủ shop:
    var ZALO_PHONE = '0925760173'; 
    var ZALO_CHAT_URL = 'https://zalo.me/' + ZALO_PHONE;
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
                bottom: 82px; /* Tránh đè lên thanh bottom bar trên mobile */
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
            border: 2px solid rgba(255, 255, 255, 0.9);
            text-decoration: none;
        }
        .zalo-btn-main:hover {
            transform: scale(1.1) translateY(-2px);
            box-shadow: 0 12px 30px rgba(0, 104, 255, 0.6);
        }
        .zalo-btn-main svg {
            width: 38px;
            height: 38px;
            display: block;
            pointer-events: none;
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
            width: 280px;
            background: #ffffff;
            border-radius: 22px;
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
            .zalo-hover-card { display: none !important; }
            .zalo-tooltip { display: none !important; }
        }

        /* Modal Lightbox Toàn Màn Hình */
        .zalo-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(11, 19, 43, 0.78);
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
            max-width: 360px;
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

    // 2. SVG Icon Zalo chuẩn chính hãng (Bong bóng chat trắng + chữ Zalo xanh)
    var ZALO_SVG = '<svg width="38" height="38" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;pointer-events:none;"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.779 43.5892C10.1019 43.846 13.0061 43.1836 15.0682 42.1825C24.0225 47.1318 38.0197 46.8954 46.4923 41.4732C46.8209 40.9803 47.1279 40.4677 47.4128 39.9363C49.1062 36.7779 50.0004 33.22 50.0004 27.1316V22.7175C50.0004 16.629 49.1062 13.0711 47.4128 9.91273C45.7385 6.75436 43.2461 4.28093 40.0877 2.58758C36.9293 0.894239 33.3714 0 27.283 0H22.8499C17.6644 0 14.2982 0.652754 11.4699 1.89893C11.3153 2.03737 11.1636 2.17818 11.0151 2.32135C2.71734 10.3203 2.08658 27.6593 9.12279 37.0782C9.13064 37.0921 9.13933 37.1061 9.14889 37.1203C10.2334 38.7185 9.18694 41.5154 7.55068 43.1516C7.28431 43.399 7.37944 43.5512 7.779 43.5892Z" fill="#ffffff"/><path d="M20.5632 17H10.8382V19.0853H17.5869L10.9329 27.3317C10.7244 27.635 10.5728 27.9194 10.5728 28.5639V29.0947H19.748C20.203 29.0947 20.5822 28.7156 20.5822 28.2606V27.1421H13.4922L19.748 19.2938C19.8428 19.1801 20.0134 18.9716 20.0893 18.8768L20.1272 18.8199C20.4874 18.2891 20.5632 17.8341 20.5632 17.2844V17Z" fill="#0068FF"/><path d="M25.814 19.6924C23.1979 19.6924 21.0747 21.8156 21.0747 24.4317C21.0747 27.0478 23.1979 29.171 25.814 29.171C28.4301 29.171 30.5533 27.0478 30.5533 24.4317C30.5723 21.8156 28.4491 19.6924 25.814 19.6924ZM25.814 27.2184C24.2785 27.2184 23.0273 25.9672 23.0273 24.4317C23.0273 22.8962 24.2785 21.645 25.814 21.645C27.3495 21.645 28.6007 22.8962 28.6007 24.4317C28.6007 25.9672 27.3685 27.2184 25.814 27.2184Z" fill="#0068FF"/><path d="M29.4562 29.0944H30.5747V19.957H28.6221V28.2793C28.6221 28.7153 29.0012 29.0944 29.4562 29.0944Z" fill="#0068FF"/><path d="M32.9416 29.0947H34.3255V17H32.2402V28.3933C32.2402 28.7725 32.5435 29.0947 32.9416 29.0947Z" fill="#0068FF"/><path d="M40.4867 19.6162C37.8516 19.6162 35.7095 21.7584 35.7095 24.3934C35.7095 27.0285 37.8516 29.1707 40.4867 29.1707C43.1217 29.1707 45.2639 27.0285 45.2639 24.3934C45.2639 21.7584 43.1217 19.6162 40.4867 19.6162ZM40.4867 27.2181C38.9322 27.2181 37.681 25.9669 37.681 24.4124C37.681 22.8579 38.9322 21.6067 40.4867 21.6067C42.0412 21.6067 43.2924 22.8579 43.2924 24.4124C43.2924 25.9669 42.0412 27.2181 40.4867 27.2181Z" fill="#0068FF"/></svg>';
    var ZALO_MINI_SVG = '<svg width="18" height="18" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;pointer-events:none;"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.779 43.5892C10.1019 43.846 13.0061 43.1836 15.0682 42.1825C24.0225 47.1318 38.0197 46.8954 46.4923 41.4732C46.8209 40.9803 47.1279 40.4677 47.4128 39.9363C49.1062 36.7779 50.0004 33.22 50.0004 27.1316V22.7175C50.0004 16.629 49.1062 13.0711 47.4128 9.91273C45.7385 6.75436 43.2461 4.28093 40.0877 2.58758C36.9293 0.894239 33.3714 0 27.283 0H22.8499C17.6644 0 14.2982 0.652754 11.4699 1.89893C11.3153 2.03737 11.1636 2.17818 11.0151 2.32135C2.71734 10.3203 2.08658 27.6593 9.12279 37.0782C9.13064 37.0921 9.13933 37.1061 9.14889 37.1203C10.2334 38.7185 9.18694 41.5154 7.55068 43.1516C7.28431 43.399 7.37944 43.5512 7.779 43.5892Z" fill="#ffffff"/><path d="M20.5632 17H10.8382V19.0853H17.5869L10.9329 27.3317C10.7244 27.635 10.5728 27.9194 10.5728 28.5639V29.0947H19.748C20.203 29.0947 20.5822 28.7156 20.5822 28.2606V27.1421H13.4922L19.748 19.2938C19.8428 19.1801 20.0134 18.9716 20.0893 18.8768L20.1272 18.8199C20.4874 18.2891 20.5632 17.8341 20.5632 17.2844V17Z" fill="#0068FF"/><path d="M25.814 19.6924C23.1979 19.6924 21.0747 21.8156 21.0747 24.4317C21.0747 27.0478 23.1979 29.171 25.814 29.171C28.4301 29.171 30.5533 27.0478 30.5533 24.4317C30.5723 21.8156 28.4491 19.6924 25.814 19.6924ZM25.814 27.2184C24.2785 27.2184 23.0273 25.9672 23.0273 24.4317C23.0273 22.8962 24.2785 21.645 25.814 21.645C27.3495 21.645 28.6007 22.8962 28.6007 24.4317C28.6007 25.9672 27.3685 27.2184 25.814 27.2184Z" fill="#0068FF"/><path d="M29.4562 29.0944H30.5747V19.957H28.6221V28.2793C28.6221 28.7153 29.0012 29.0944 29.4562 29.0944Z" fill="#0068FF"/><path d="M32.9416 29.0947H34.3255V17H32.2402V28.3933C32.2402 28.7725 32.5435 29.0947 32.9416 29.0947Z" fill="#0068FF"/><path d="M40.4867 19.6162C37.8516 19.6162 35.7095 21.7584 35.7095 24.3934C35.7095 27.0285 37.8516 29.1707 40.4867 29.1707C43.1217 29.1707 45.2639 27.0285 45.2639 24.3934C45.2639 21.7584 43.1217 19.6162 40.4867 19.6162ZM40.4867 27.2181C38.9322 27.2181 37.681 25.9669 37.681 24.4124C37.681 22.8579 38.9322 21.6067 40.4867 21.6067C42.0412 21.6067 43.2924 22.8579 43.2924 24.4124C43.2924 25.9669 42.0412 27.2181 40.4867 27.2181Z" fill="#0068FF"/></svg>';

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
            
            <a href="${ZALO_CHAT_URL}" target="_blank" rel="noopener noreferrer" class="zalo-btn-main" id="btnMainZalo" title="Chat Zalo & Quét mã QR" aria-label="Chat Zalo với HihoEdu">
                ${ZALO_SVG}
            </a>

            <div class="zalo-tooltip">
                <i class="fa-solid fa-qrcode" style="color:#60a5fa"></i>
                <span>Tư vấn Zalo / Quét mã</span>
            </div>

            <div class="zalo-hover-card">
                <div style="background: linear-gradient(135deg, #0088ff 0%, #0068ff 100%); color: #fff; padding: 10px 14px; border-radius: 14px; margin-bottom: 12px; display:flex; align-items:center; justify-content:space-between;">
                    <div style="font-weight: 800; font-size: 13.5px; display:flex; align-items:center; gap:7px;">
                        ${ZALO_MINI_SVG} Tư vấn Zalo HihoEdu
                    </div>
                    <span style="font-size: 10px; background: rgba(255,255,255,0.25); padding: 2px 7px; border-radius: 20px; font-weight: 600;">Trực tuyến</span>
                </div>
                
                <!-- Ảnh mã QR vuông sạch chuyên nghiệp -->
                <div style="background: #ffffff; padding: 10px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); cursor: pointer;" onclick="window.openZaloModal();" title="Bấm để phóng to">
                    <img src="${QR_IMG}" alt="Mã QR Zalo HihoEdu" style="width: 175px; height: 175px; margin: 0 auto; display: block; border-radius: 6px;">
                </div>

                <p style="font-size: 11.5px; color: #64748b; margin: 0 0 10px; line-height: 1.4;">
                    Quét mã bằng Zalo để kết nối ngay, hoặc bấm nút dưới để mở chat trực tiếp.
                </p>

                <div style="display:flex; gap:6px;">
                    <button type="button" onclick="window.openZaloModal();" style="flex:1; padding: 8px 10px; background: #f1f5f9; hover:background:#e2e8f0; color: #334155; font-size: 12px; font-weight: 700; border-radius: 10px; border: none; cursor: pointer; transition: background 0.2s;">
                        <i class="fa-solid fa-expand"></i> Phóng to
                    </button>
                    <a href="${ZALO_CHAT_URL}" target="_blank" rel="noopener noreferrer" style="flex:1.6; padding: 8px 12px; background: #0068FF; color: #fff; font-size: 12px; font-weight: 700; border-radius: 10px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 10px rgba(0,104,255,0.35);">
                        ${ZALO_MINI_SVG} Nhắn tin Zalo
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
                    
                    <!-- Khung ảnh QR chuẩn vuông đẹp mắt -->
                    <div style="background: #ffffff; border-radius: 20px; padding: 14px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.08); margin: 0 auto 16px; width: 230px; height: 230px; display:flex; align-items:center; justify-content:center;">
                        <img src="${QR_IMG}" alt="Mã QR Zalo HihoEdu" style="width: 200px; height: 200px; display: block; border-radius: 6px;">
                    </div>

                    <h3 style="font-size: 17px; font-weight: 800; color: #0B132B; margin: 0 0 6px;">Quét Mã Để Nhắn Tin Zalo</h3>
                    <p style="font-size: 12.5px; color: #64748b; margin: 0 0 18px; line-height: 1.5;">
                        Mở camera hoặc ứng dụng Zalo quét mã phía trên, hoặc nhấn nút dưới để vào thẳng giao diện nhắn tin Zalo.
                    </p>

                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <a href="${ZALO_CHAT_URL}" target="_blank" rel="noopener noreferrer" style="width:100%; padding: 13px; background: linear-gradient(135deg, #0088ff 0%, #0068ff 100%); color:#fff; font-size: 14px; font-weight: 800; border-radius: 14px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow: 0 6px 18px rgba(0, 104, 255, 0.4);">
                            ${ZALO_MINI_SVG} Nhắn Tin Qua Zalo Ngay
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
                // Trên Mobile: mở trực tiếp ứng dụng Zalo chat
                if (window.innerWidth <= 768) {
                    window.location.href = ZALO_CHAT_URL;
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
