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
// Uses document-level event delegation so it survives dynamic navbar rebuilds.
document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Find the navbar container
    const navbarContainer = document.querySelector('.navbar .container');
    if (!navbarContainer) return;

    // Prevent double-inject (some pages may load theme.js twice)
    if (navbarContainer.querySelector('.nav-hamburger')) return;

    // Create hamburger button
    const hamburger = document.createElement('button');
    hamburger.className = 'nav-hamburger';
    hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    navbarContainer.appendChild(hamburger);

    function getNavLinks() {
        return document.querySelector('.navbar .nav-links');
    }

    function closeMenu() {
        const nl = getNavLinks();
        if (nl) nl.classList.remove('nav-open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
        const nl = getNavLinks();
        if (nl) nl.classList.add('nav-open');
        hamburger.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
    }

    // Toggle on hamburger click
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        const nl = getNavLinks();
        if (!nl) return;
        const isOpen = nl.classList.contains('nav-open');
        isOpen ? closeMenu() : openMenu();
    });

    // Close when any nav link or button (except theme toggle) is clicked
    // Using document delegation so it works after dynamic navbar rebuilds
    document.addEventListener('click', (e) => {
        const inNavbar = e.target.closest('.navbar');
        if (!inNavbar) {
            // Clicked outside navbar — close
            closeMenu();
            return;
        }
        // Clicked inside navbar
        const isHamburger = e.target.closest('.nav-hamburger');
        if (isHamburger) return; // handled by hamburger listener above

        const isTheme = e.target.closest('.theme-toggle') || e.target.id === 'themeToggle';
        if (isTheme) return; // don't close on theme toggle

        const isLink = e.target.closest('a') || e.target.closest('button');
        if (isLink) {
            // Small delay so navigation starts before menu hides
            setTimeout(closeMenu, 80);
        }
    });

    // Close on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeMenu();
    });
});
