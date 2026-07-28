// Theme toggle functionality
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

// Initialize theme on page load
initTheme();

// ── Responsive Hamburger Menu ─────────────────────────────────────────────────
// Injected into every page automatically — no HTML changes needed.
document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Find the navbar container
    const navbarContainer = document.querySelector('.navbar .container');
    const navLinks = document.querySelector('.navbar .nav-links');
    if (!navbarContainer || !navLinks) return;

    // Create hamburger button
    const hamburger = document.createElement('button');
    hamburger.className = 'nav-hamburger';
    hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = '<span></span><span></span><span></span>';

    // Insert hamburger as last child of navbar container
    navbarContainer.appendChild(hamburger);

    // Toggle menu open/close
    hamburger.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('nav-open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu when a nav link is clicked (navigate away or anchor)
    navLinks.addEventListener('click', (e) => {
        const target = e.target.closest('a, button:not(.theme-toggle)');
        if (target && !target.classList.contains('theme-toggle')) {
            navLinks.classList.remove('nav-open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });

    // Close menu when clicking outside the navbar
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) {
            navLinks.classList.remove('nav-open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });

    // Close menu on window resize back to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navLinks.classList.remove('nav-open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });
});
