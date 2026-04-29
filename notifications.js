// Toast notification system
const toast = {
    show(message, type = 'info', duration = 3500) {
        // Remove existing toasts
        document.querySelectorAll('.toast-notification').forEach(t => t.remove());

        const colors = {
            success: '#27ae60',
            error:   '#e74c3c',
            warning: '#f39c12',
            info:    '#3498db'
        };
        const icons = {
            success: '✅',
            error:   '❌',
            warning: '⚠️',
            info:    'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `<span>${icons[type]}</span> <span>${message}</span>`;
        toast.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(0,0,0,0.25);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 320px;
            animation: slideInToast 0.3s ease-out;
        `;

        // Add animation keyframes once
        if (!document.getElementById('toastStyle')) {
            const style = document.createElement('style');
            style.id = 'toastStyle';
            style.textContent = `
                @keyframes slideInToast {
                    from { opacity: 0; transform: translateX(100px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideOutToast {
                    from { opacity: 1; transform: translateX(0); }
                    to   { opacity: 0; transform: translateX(100px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutToast 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(msg, duration) { this.show(msg, 'success', duration); },
    error(msg, duration)   { this.show(msg, 'error',   duration); },
    warning(msg, duration) { this.show(msg, 'warning', duration); },
    info(msg, duration)    { this.show(msg, 'info',    duration); }
};
