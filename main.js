// Document ready function
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // You can add more interactive features here
    // For example: tutorial filtering, dark mode toggle, etc.
});

// ── Global skeleton loader ────────────────────────────────────────────────────
function showSkeletons(containerId, count = 6) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    if (!document.getElementById('shimmerStyle')) {
        const s = document.createElement('style');
        s.id = 'shimmerStyle';
        s.textContent = `
            @keyframes shimmer {
                0%   { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50%       { opacity: 0.6; }
            }
            .skeleton-card .skeleton-line {
                background: linear-gradient(90deg, var(--border-color, #e0e0e0) 25%, var(--bg-secondary, #f5f5f5) 50%, var(--border-color, #e0e0e0) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(s);
    }

    grid.innerHTML = Array(count).fill(`
        <div class="course-card skeleton-card" style="pointer-events:none">
            <div class="course-image skeleton-line" style="min-height:80px"></div>
            <div class="course-content">
                <div class="skeleton-line" style="height:14px;width:40%;margin-bottom:10px"></div>
                <div class="skeleton-line" style="height:18px;margin-bottom:8px"></div>
                <div class="skeleton-line" style="height:14px;width:70%;margin-bottom:8px"></div>
                <div class="skeleton-line" style="height:14px;width:50%;margin-bottom:16px"></div>
                <div class="skeleton-line" style="height:36px;border-radius:8px"></div>
            </div>
        </div>
    `).join('');
}
