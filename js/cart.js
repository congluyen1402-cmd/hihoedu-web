// Global Cart Logic cho HihoEdu

const CART_KEY = 'hiho_cart';

// Khởi tạo giỏ hàng nếu chưa có
function getCart() {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
    renderCartUI();
}

function formatPrice(priceStr) {
    if (!priceStr) return '0đ';
    return priceStr;
}

function parsePriceToNumber(priceStr) {
    if (!priceStr) return 0;
    // Bỏ "đ", dấu chấm, phẩy, khoảng trắng
    let numStr = priceStr.toString().replace(/[đ.,\s]/g, '');
    return parseInt(numStr) || 0;
}

function formatNumberToPrice(num) {
    return num.toLocaleString('vi-VN') + 'đ';
}

function addToCart(course) {
    const cart = getCart();
    // Dùng ten_khoa_hoc làm ID vì dữ liệu sheet không chắc có ID
    const exists = cart.find(item => item.ten_khoa_hoc === course.ten_khoa_hoc);
    
    if (!exists) {
        cart.push(course);
        saveCart(cart);
        openCartModal();
    } else {
        alert('Khóa học này đã có trong giỏ hàng của bạn!');
        openCartModal();
    }
}

function removeFromCart(courseName) {
    let cart = getCart();
    cart = cart.filter(item => item.ten_khoa_hoc !== courseName);
    saveCart(cart);
}

function updateCartBadge() {
    const cart = getCart();
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
        badge.textContent = cart.length;
        if(cart.length > 0) {
            badge.classList.remove('hidden');
            badge.classList.add('flex');
        } else {
            badge.classList.remove('flex');
            badge.classList.add('hidden');
        }
    });
}

function injectCartHTML() {
    const cartHTML = `
        <!-- Overlay -->
        <div id="cartOverlay" class="fixed inset-0 bg-black/50 z-[60] hidden opacity-0 transition-opacity duration-300"></div>
        
        <!-- Cart Slide-over -->
        <div id="cartModal" class="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white shadow-2xl z-[70] transform translate-x-full transition-transform duration-300 flex flex-col">
            <!-- Header -->
            <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#0B132B] text-white">
                <h2 class="text-xl font-bold flex items-center gap-3">
                    <i class="fa-solid fa-cart-shopping text-cta"></i> Giỏ Hàng Của Bạn
                </h2>
                <button onclick="closeCartModal()" class="text-gray-300 hover:text-white transition p-2 bg-white/10 hover:bg-red-500 rounded-full w-8 h-8 flex items-center justify-center">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>
            
            <!-- Body: Items -->
            <div id="cartItemsContainer" class="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col gap-4">
                <!-- Data will be rendered here -->
            </div>
            
            <!-- Footer: Total & Checkout -->
            <div class="border-t border-gray-200 p-6 bg-white shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
                <div class="flex justify-between items-center mb-6">
                    <span class="text-gray-600 font-medium text-lg">Tổng tiền tạm tính:</span>
                    <span id="cartTotalPrice" class="text-3xl font-extrabold text-red-600">0đ</span>
                </div>
                <button id="btnGoToCheckout" onclick="window.location.href='thanh-toan.html'" class="w-full py-4 bg-cta hover:bg-ctaHover text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30 transition duration-300 uppercase tracking-wide flex items-center justify-center gap-2">
                    Thanh Toán Ngay <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', cartHTML);
    document.getElementById('cartOverlay').addEventListener('click', closeCartModal);
}

function renderCartUI() {
    const cart = getCart();
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotalPrice');
    const checkoutBtn = document.getElementById('btnGoToCheckout');
    
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center opacity-70">
                <div class="w-24 h-24 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-4xl mb-6">
                    <i class="fa-solid fa-bag-shopping"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-2">Chưa có sản phẩm trong giỏ hàng.</h3>
                <p class="text-gray-500 text-sm mb-6">Hãy chọn những khóa học phù hợp với bạn nhé!</p>
                <button onclick="closeCartModal(); window.location.href='index.html#courses';" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2">
                    XEM CÁC KHÓA HỌC <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        `;
        totalEl.textContent = '0đ';
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
        return;
    }
    
    let total = 0;
    let html = '';
    
    cart.forEach(course => {
        let price = parsePriceToNumber(course.gia_moi);
        total += price;
        
        let coverImg = course.anh_bia || 'https://placehold.co/400x300/0f172a/ffffff?text=HihoEdu';
        let oldPriceHtml = course.gia_cu ? `<span class="text-gray-400 line-through text-xs font-medium">${course.gia_cu}</span>` : '';
        
        html += `
            <div class="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4 relative pr-10 hover:shadow-md transition group">
                <div class="w-24 h-20 rounded-xl overflow-hidden shrink-0">
                    <img src="${coverImg}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="Cover">
                </div>
                <div class="flex flex-col justify-center flex-1">
                    <h4 class="font-bold text-sm text-primary mb-1 line-clamp-2 leading-tight">${course.ten_khoa_hoc}</h4>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-red-500 font-extrabold text-sm">${course.gia_moi}</span>
                        ${oldPriceHtml}
                    </div>
                </div>
                <!-- Delete btn -->
                <button onclick="removeFromCart('${course.ten_khoa_hoc.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '')}')" class="absolute top-1/2 -translate-y-1/2 right-3 w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-full transition">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    totalEl.textContent = formatNumberToPrice(total);
    checkoutBtn.disabled = false;
    checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
}

function openCartModal() {
    const overlay = document.getElementById('cartOverlay');
    const modal = document.getElementById('cartModal');
    if(overlay && modal) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        modal.classList.remove('translate-x-full');
    }
    renderCartUI();
}

function closeCartModal() {
    const overlay = document.getElementById('cartOverlay');
    const modal = document.getElementById('cartModal');
    if(overlay && modal) {
        overlay.classList.add('opacity-0');
        modal.classList.add('translate-x-full');
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Chỉ chèn HTML giỏ hàng nếu chưa có
    if(!document.getElementById('cartModal')) {
        injectCartHTML();
    }
    updateCartBadge();
});
