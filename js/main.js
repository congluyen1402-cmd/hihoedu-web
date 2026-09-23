document.addEventListener('DOMContentLoaded', () => {

    // 1. Dropdown Menu Logic
    const categoryBtn = document.getElementById('categoryBtn');
    const categoryMenu = document.getElementById('categoryMenu');

    if (categoryBtn && categoryMenu) {
        // Toggle on click
        categoryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            categoryMenu.classList.toggle('dropdown-open');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!categoryBtn.contains(e.target) && !categoryMenu.contains(e.target)) {
                categoryMenu.classList.remove('dropdown-open');
            }
        });

        // Ensure menu stays open if hovered on desktop
        const dropdownParent = categoryBtn.parentElement;
        dropdownParent.addEventListener('mouseenter', () => {
            if (window.innerWidth >= 768) {
                categoryMenu.classList.add('dropdown-open');
            }
        });
        dropdownParent.addEventListener('mouseleave', () => {
            if (window.innerWidth >= 768) {
                categoryMenu.classList.remove('dropdown-open');
            }
        });
    }

    // 2. Countdown Timer Logic
    // Set timer to end 3 days from now
    const getTargetDate = () => {
        const target = new Date();
        target.setDate(target.getDate() + 3);
        target.setHours(23, 59, 59);
        return target.getTime();
    };

    // Keep target date in localStorage so it doesn't reset on every refresh
    let countDownDate = localStorage.getItem('hihoedu_countdown');
    if (!countDownDate || new Date().getTime() > parseInt(countDownDate)) {
        countDownDate = getTargetDate();
        localStorage.setItem('hihoedu_countdown', countDownDate);
    } else {
        countDownDate = parseInt(countDownDate);
    }

    const updateTimer = () => {
        const now = new Date().getTime();
        const distance = countDownDate - now;

        if (distance < 0) {
            // Reset if expired
            localStorage.removeItem('hihoedu_countdown');
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const elDays = document.getElementById("cd-days");
        const elHours = document.getElementById("cd-hours");
        const elMinutes = document.getElementById("cd-minutes");
        const elSeconds = document.getElementById("cd-seconds");

        if (elDays) elDays.innerHTML = days < 10 ? "0" + days : days;
        if (elHours) elHours.innerHTML = hours < 10 ? "0" + hours : hours;
        if (elMinutes) elMinutes.innerHTML = minutes < 10 ? "0" + minutes : minutes;
        if (elSeconds) elSeconds.innerHTML = seconds < 10 ? "0" + seconds : seconds;
    };

    // Initial call
    updateTimer();

    // Update every second
    setInterval(updateTimer, 1000);

    // 3. Fetch Dynamic Courses from SheetDB
    const courseList = document.getElementById('courseList');
    const courseLoading = document.getElementById('courseLoading');
    const SHEETDB_API = 'https://sheetdb.io/api/v1/fcdrn35wr2yla'; // <-- THAY LINK SHEETDB VÀO ĐÂY

    if (courseList && courseLoading) {
        // Check if the API link is still the placeholder or invalid
        if (SHEETDB_API.includes('[DÁN_LINK') || !SHEETDB_API.startsWith('http')) {
            console.warn('HihoEdu: Chưa cập nhật link API SheetDB.');
            courseLoading.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation text-5xl text-yellow-500 mb-4"></i>
                <p class="text-yellow-600 font-medium text-center text-lg">
                    Lỗi: Chưa điền Link API.<br>
                    Vui lòng mở file <b>js/main.js</b> (dòng 88) và thay thế biến <b>SHEETDB_API</b> bằng link SheetDB thật của bạn!
                </p>`;
            return; // Dừng thực thi fetch
        }

        let allCourses = []; // Biến lưu toàn bộ khóa học để lọc
        let filteredCourses = []; // Danh sách khóa học đang hiển thị
        let currentPage = 1;
        const itemsPerPage = 12;

        const renderPagination = () => {
            const paginationContainer = document.getElementById('paginationContainer');
            if (!paginationContainer) return;

            const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
            
            if (totalPages <= 1) {
                paginationContainer.innerHTML = '';
                return;
            }

            let paginationHTML = '';

            // Nút Trước
            if (currentPage > 1) {
                paginationHTML += `<button class="pagination-btn px-4 py-2 rounded-lg font-medium transition bg-white text-gray-700 border border-gray-300 hover:bg-gray-100" data-page="${currentPage - 1}">< Trước</button>`;
            }

            // Các trang
            for (let i = 1; i <= totalPages; i++) {
                if (i === currentPage) {
                    paginationHTML += `<button class="pagination-btn px-4 py-2 rounded-lg font-medium transition bg-[#0B132B] text-white" data-page="${i}">${i}</button>`;
                } else {
                    paginationHTML += `<button class="pagination-btn px-4 py-2 rounded-lg font-medium transition bg-white text-gray-700 border border-gray-300 hover:bg-gray-100" data-page="${i}">${i}</button>`;
                }
            }

            // Nút Tiếp
            if (currentPage < totalPages) {
                paginationHTML += `<button class="pagination-btn px-4 py-2 rounded-lg font-medium transition bg-white text-gray-700 border border-gray-300 hover:bg-gray-100" data-page="${currentPage + 1}">Tiếp ></button>`;
            }

            paginationContainer.innerHTML = paginationHTML;
        };

        // Bắt sự kiện click phân trang
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.pagination-btn');
                if (btn) {
                    const page = parseInt(btn.getAttribute('data-page'));
                    if (page && page !== currentPage) {
                        currentPage = page;
                        renderCourses(currentPage);
                        renderPagination();
                        
                        // Cuộn mượt mà lên đầu danh sách
                        const section = courseList.closest('section');
                        if (section) {
                            window.scrollTo({ top: section.offsetTop - 100, behavior: 'smooth' });
                        }
                    }
                }
            });
        }

        // Hàm tạo HTML cho 1 thẻ khóa học
        const generateCourseHTML = (course, index) => {
            let eventBadgeHTML = '';
            if (course.su_kien) {
                const event = course.su_kien.trim();
                let badgeClass = 'bg-primary text-white'; // Default Navy
                let icon = '';
                const eventLower = event.toLowerCase();
                
                if (eventLower === 'flash sale') {
                    badgeClass = 'bg-gradient-to-r from-red-600 via-pink-600 to-red-600 text-white pulse-fast border border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.5)]';
                    icon = '⚡ ';
                } else if (eventLower === 'hot') {
                    badgeClass = 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black wiggle border border-yellow-400 shadow-lg';
                    icon = '🔥 ';
                } else if (eventLower === 'mới') {
                    badgeClass = 'bg-emerald-500 text-white animate-bounce shadow-lg border border-emerald-400';
                    icon = '✨ ';
                }
                
                eventBadgeHTML = `
                    <div class="${badgeClass} text-xs font-extrabold px-3 py-1.5 rounded-full z-10 whitespace-nowrap uppercase tracking-wider flex items-center gap-1">
                        ${icon}${event}
                    </div>
                `;
            }

            const revealClasses = "reveal-on-scroll opacity-0 translate-y-4 md:translate-y-12 transition-all duration-500 md:duration-[800ms] ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0";
            const delay = index * 100;

            return `
                <div class="${revealClasses} bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 group flex flex-col h-full" data-delay="${delay}">
                    <a href="chi-tiet.html?id=${course.id}" class="block relative overflow-hidden aspect-video">
                        <img src="${course.anh_bia}" alt="${course.ten_khoa_hoc}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                        <!-- Badges -->
                        <div class="absolute top-2 left-2 flex items-start gap-2 flex-wrap max-w-[90%] z-20">
                            ${eventBadgeHTML}
                            <div class="bg-white/95 backdrop-blur text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-primary shadow-sm whitespace-nowrap border border-gray-100">
                                ${course.danh_muc_con || course.danh_muc_chinh || 'Khóa học'}
                            </div>
                        </div>
                    </a>
                    <div class="p-5 flex flex-col flex-grow">
                        <a href="chi-tiet.html?id=${course.id}" class="block">
                            <h3 class="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-cta transition">${course.ten_khoa_hoc}</h3>
                        </a>
                        
                        <div class="mt-auto">
                            <!-- Info Row -->
                            <div class="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                                <div class="flex items-center gap-1.5">
                                    <i class="fa-solid fa-book text-gray-400"></i> ${course.so_bai_giang || '0'} bài giảng
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <i class="fa-solid fa-clock text-gray-400"></i> Sở hữu trọn đời
                                </div>
                            </div>
                            <!-- Price -->
                            <div class="text-center mb-4">
                                <span class="text-2xl font-extrabold text-red-600 block">${course.gia_moi}</span>
                            </div>
                            <!-- Button -->
                            <button type="button" data-course-index="${allCourses.indexOf(course)}" class="btn-add-cart block w-full py-3 px-4 bg-slate-900 text-white font-bold text-center rounded-xl hover:bg-slate-800 transition shadow-md">
                                <i class="fa-solid fa-cart-shopping mr-2"></i> THÊM VÀO GIỎ HÀNG
                            </button>
                        </div>
                    </div>
                </div>
            `;
        };

        // Hàm render cho các khu vực nổi bật
        const renderSpecialSections = () => {
            const sections = [
                { id: 'newCoursesList', keyword: 'mới' },
                { id: 'topCoursesList', keyword: 'top' },
                { id: 'comboCoursesList', keyword: 'combo' }
            ];

            sections.forEach(sec => {
                const container = document.getElementById(sec.id);
                if (!container) return;

                const filtered = allCourses.filter(c => c.nhom_hien_thi && c.nhom_hien_thi.toLowerCase().includes(sec.keyword));
                const limited = filtered.slice(0, 8); // Giới hạn 8 khóa học
                
                const sectionParent = container.closest('section');
                if (limited.length === 0) {
                    if (sectionParent) sectionParent.style.display = 'none'; // Ẩn nếu không có dữ liệu
                    return;
                }
                
                if (sectionParent) sectionParent.style.display = 'block';
                container.innerHTML = limited.map((course, index) => generateCourseHTML(course, index)).join('');
            });
        };

        // Hàm render giao diện danh sách khóa học chính (có phân trang)
        const renderCourses = (page) => {
            if (!courseList) return;
            courseList.innerHTML = ''; // Xóa grid hiện tại
            
            courseList.classList.remove('animate-fadeIn');
            void courseList.offsetWidth; // Trigger reflow
            courseList.classList.add('animate-fadeIn');

            const start = (page - 1) * itemsPerPage;
            const end = page * itemsPerPage;
            const displayCourses = filteredCourses.slice(start, end);

            if (!displayCourses || displayCourses.length === 0) {
                courseList.innerHTML = '<p class="col-span-1 sm:col-span-2 lg:col-span-4 text-center text-gray-500 py-10 font-medium text-lg">Không tìm thấy khóa học nào trong danh mục này.</p>';
                return;
            }

            const coursesHTML = displayCourses.map((course, index) => generateCourseHTML(course, index)).join('');
            
            courseList.innerHTML = coursesHTML;
            
            // Khởi tạo lại observer cho các phần tử mới render
            if (window.initScrollReveal) {
                window.initScrollReveal();
            }
        };

        // Xử lý sự kiện click "Thêm vào giỏ hàng" bằng Event Delegation
        courseList.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-add-cart');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                
                const index = btn.getAttribute('data-course-index');
                const course = allCourses[parseInt(index, 10)];
                
                if (course && typeof addToCart === 'function') {
                    addToCart(course);
                } else if (!course) {
                    console.error("Course not found at index:", index);
                } else {
                    console.error("addToCart function is not defined.");
                }
            }
        });

        // Fetch API
        fetch(SHEETDB_API)
            .then(response => response.json())
            .then(data => {
                courseLoading.remove();
                if (Array.isArray(data) && data.length > 0) {
                    allCourses = data; // Lưu lại
                    filteredCourses = [...allCourses];
                    currentPage = 1;
                    
                    if (typeof renderSpecialSections === 'function') {
                        renderSpecialSections();
                    }
                    
                    renderCourses(currentPage); // Hiển thị ban đầu
                    renderPagination();
                } else {
                    courseList.innerHTML = '<p class="col-span-1 sm:col-span-2 lg:col-span-4 text-center text-gray-500">Chưa có khóa học nào.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching courses:', error);
                if (courseLoading) {
                    courseLoading.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i><p class="text-red-500 font-medium">Lỗi khi tải danh sách khóa học. Vui lòng thử lại sau.</p>';
                }
            });

        // 4. Filtering Logic (Bắt sự kiện click menu)
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (courseList) {
                    e.preventDefault(); // Ngăn trình duyệt nhảy lên đầu trang chỉ khi ở trang chủ
                }

                // Tắt menu trên mobile (nếu có open class)
                const categoryMenu = document.getElementById('categoryMenu');
                if (categoryMenu) {
                    categoryMenu.classList.remove('dropdown-open');
                }

                // Lấy category từ data attribute
                const category = btn.getAttribute('data-category');

                // Lọc và Cập nhật Breadcrumb
                const breadcrumbCategory = document.getElementById('breadcrumbCategory');
                const breadcrumbContainer = document.getElementById('breadcrumbContainer');

                if (category === 'all' || category === 'show-all') {
                    // Xem tất cả
                    filteredCourses = [...allCourses];
                    if (breadcrumbContainer) breadcrumbContainer.classList.add('hidden');
                } else {
                    // Lọc theo danh mục
                    if (breadcrumbContainer) breadcrumbContainer.classList.remove('hidden');
                    if (breadcrumbCategory) breadcrumbCategory.textContent = category;

                    // Ưu tiên khớp danh_muc_con, nếu ko thì khớp danh_muc_chinh
                    filteredCourses = allCourses.filter(c => c.danh_muc_con === category || c.danh_muc_chinh === category);
                }

                // Reset về trang 1
                currentPage = 1;
                renderCourses(currentPage);
                renderPagination();

                // Cuộn mượt mà xuống danh sách khóa học
                const section = courseList.closest('section');
                if (section) {
                    // Timeout nhỏ để đảm bảo render DOM xong rồi cuộn
                    setTimeout(() => {
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            });
        });

        // 5. Search Logic
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                
                const breadcrumbCategory = document.getElementById('breadcrumbCategory');
                const breadcrumbContainer = document.getElementById('breadcrumbContainer');

                if (query === '') {
                    filteredCourses = [...allCourses];
                    if (breadcrumbContainer) breadcrumbContainer.classList.add('hidden');
                } else {
                    filteredCourses = allCourses.filter(c => {
                        const nameMatch = c.ten_khoa_hoc && c.ten_khoa_hoc.toLowerCase().includes(query);
                        const catMainMatch = c.danh_muc_chinh && c.danh_muc_chinh.toLowerCase().includes(query);
                        const catSubMatch = c.danh_muc_con && c.danh_muc_con.toLowerCase().includes(query);
                        return nameMatch || catMainMatch || catSubMatch;
                    });
                    
                    if (breadcrumbContainer) breadcrumbContainer.classList.remove('hidden');
                    if (breadcrumbCategory) breadcrumbCategory.textContent = `Tìm kiếm: "${query}"`;
                }

                // Cập nhật giao diện với trang 1
                currentPage = 1;
                renderCourses(currentPage);
                renderPagination();
            });
        }
    }

    // ==========================================
    // UI/UX UPGRADES: Scroll Animations & Progress
    // ==========================================

    // A. Navbar Scroll Effect & Progress Bar
    const header = document.querySelector('header');
    const scrollProgress = document.getElementById('scrollProgress');

    window.addEventListener('scroll', () => {
        // Navbar Effect
        if (window.scrollY > 50) {
            header.classList.remove('bg-white', 'py-3');
            header.classList.add('bg-white/90', 'backdrop-blur-md', 'shadow-sm', 'py-2');
        } else {
            header.classList.add('bg-white', 'py-3');
            header.classList.remove('bg-white/90', 'backdrop-blur-md', 'shadow-sm', 'py-2');
        }

        // Scroll Progress Bar
        if (scrollProgress) {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (scrollTop / scrollHeight) * 100;
            scrollProgress.style.width = scrolled + '%';
        }
    });

    // B. IntersectionObserver for Scroll Reveal & Staggered Grid
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.15 // Triggers when 15% of the element is visible
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    
                    // Xử lý Staggered Animation cho Grid Khóa học (các phần tử có data-delay)
                    const delay = el.getAttribute('data-delay');
                    if (delay) {
                        setTimeout(() => {
                            el.classList.remove('opacity-0', 'translate-y-12', 'translate-y-4', 'md:translate-y-12');
                            el.classList.add('opacity-100', 'translate-y-0', 'md:translate-y-0');
                        }, parseInt(delay));
                    } else {
                        // Reveal bình thường
                        el.classList.remove('opacity-0', 'translate-y-12', 'translate-y-4', 'md:translate-y-12');
                        el.classList.add('opacity-100', 'translate-y-0', 'md:translate-y-0');
                    }
                    
                    // Ngừng observe sau khi đã hiện (chạy 1 lần)
                    observer.unobserve(el);
                }
            });
        }, observerOptions);

        // Khởi tạo observer cho tất cả các phần tử có class 'reveal-on-scroll'
        // Cần gọi lại hàm này sau khi render danh sách khóa học động
        window.initScrollReveal = () => {
            // Tự động chuyển đổi các thẻ cũ dùng data-aos thành reveal-on-scroll
            const aosElements = document.querySelectorAll('[data-aos]:not(.revealed)');
            aosElements.forEach(el => {
                el.classList.add('reveal-on-scroll', 'opacity-0', 'translate-y-4', 'md:translate-y-12', 'transition-all', 'duration-500', 'md:duration-[800ms]', 'ease-out', 'motion-reduce:transition-none', 'motion-reduce:opacity-100', 'motion-reduce:translate-y-0');
                
                // Xử lý delay cũ của AOS nếu có
                const delay = el.getAttribute('data-aos-delay');
                if (delay) el.setAttribute('data-delay', delay);
                
                el.removeAttribute('data-aos');
            });

            const revealElements = document.querySelectorAll('.reveal-on-scroll:not(.revealed)');
            revealElements.forEach(el => {
                revealObserver.observe(el);
                el.classList.add('revealed'); // Đánh dấu đã observe để không bị lặp
            });
        };

        // Chạy lần đầu
        initScrollReveal();
    }
});
