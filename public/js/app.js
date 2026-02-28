// Main App — SPA Router
const App = {
    user: null,
    currentPage: 'dashboard',

    async init() {
        // Check session
        try {
            const data = await API.get('/api/auth/me');
            this.user = data.user;
            this.showApp();
        } catch {
            this.showLogin();
        }

        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');

            try {
                const data = await API.post('/api/auth/login', { username, password });
                this.user = data.user;
                errorEl.style.display = 'none';
                this.showApp();
            } catch (err) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await API.post('/api/auth/logout');
            this.user = null;
            this.showLogin();
        });

        // Sidebar toggle (mobile)
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        // Nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigate(page);
                document.getElementById('sidebar').classList.remove('open');
            });
        });

        // Notification bell
        document.getElementById('notification-bell').addEventListener('click', () => {
            this.showNotifications();
        });
    },

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    },

    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';

        // Set user info
        document.getElementById('user-name').textContent = this.user.full_name;
        const roleLabels = { admin: 'Yönetici', operator: 'Operatör', viewer: 'İzleyici' };
        document.getElementById('user-role').textContent = roleLabels[this.user.role] || this.user.role;

        // Show/hide role-specific nav items
        document.querySelectorAll('.nav-link[data-role]').forEach(link => {
            const requiredRole = link.dataset.role;
            link.style.display = (requiredRole === 'admin' && this.user.role !== 'admin') ? 'none' : 'flex';
        });

        this.updatePendingBadge();
        this.updateNotificationBadge();
        this.navigate('dashboard');

        // Poll notifications every 60s
        this._notifInterval = setInterval(() => this.updateNotificationBadge(), 60000);
    },

    async updatePendingBadge() {
        if (this.user.role !== 'admin') return;
        try {
            const { count } = await API.get('/api/pending/count');
            // Find or create badge on dashboard nav
            const pendingLink = document.querySelector('.nav-link[data-page="pending"]');
            let badge = pendingLink.querySelector('.nav-badge');
            if (count > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'nav-badge';
                    pendingLink.appendChild(badge);
                }
                badge.textContent = count;
            } else if (badge) {
                badge.remove();
            }
        } catch { }
    },

    async updateNotificationBadge() {
        try {
            const { count } = await API.get('/api/notifications/unread');
            const badge = document.getElementById('notif-badge');
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        } catch { }
    },

    async showNotifications() {
        try {
            const notifications = await API.get('/api/notifications');
            const hasUnread = notifications.some(n => !n.is_read);

            let bodyHTML = '';
            if (notifications.length === 0) {
                bodyHTML = '<div class="empty-state"><span class="material-icons-round">notifications_none</span><h3>Bildirim yok</h3></div>';
            } else {
                bodyHTML = '<div class="notif-list">' + notifications.map(n => `
                    <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
                        <div class="notif-icon ${n.type}">
                            <span class="material-icons-round">${n.type === 'success' ? 'check_circle' :
                        n.type === 'warning' ? 'warning' :
                            n.type === 'danger' ? 'error' : 'info'
                    }</span>
                        </div>
                        <div class="notif-content">
                            <div class="notif-title">${n.title}</div>
                            <div class="notif-msg">${n.message}</div>
                            <div class="notif-time">${formatDate(n.created_at)}</div>
                        </div>
                        ${!n.is_read ? `<button class="btn btn-ghost btn-sm" onclick="markNotifRead(${n.id})" title="Okundu"><span class="material-icons-round" style="font-size:16px">done</span></button>` : ''}
                    </div>
                `).join('') + '</div>';
            }

            Modal.show('Bildirimler', bodyHTML, `
                ${hasUnread ? '<button class="btn btn-secondary" onclick="markAllNotifsRead()">Tümünü Okundu Yap</button>' : ''}
                <button class="btn btn-primary" onclick="Modal.hide()">Kapat</button>
            `);
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    navigate(page) {
        this.currentPage = page;

        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            molds: 'Kalıp Yönetimi',
            stock: 'Stok Hareketleri',
            machines: 'Makina Yönetimi',
            import: 'Excel Import',
            users: 'Kullanıcı Yönetimi',
            pending: 'Onay Bekleyenler',
            maintenance: 'Bakım Takip',
            backup: 'Yedekleme'
        };
        document.getElementById('page-title').textContent = titles[page] || page;

        // Clear topbar actions
        document.getElementById('topbar-actions').innerHTML = '';

        // Render with animation
        const content = document.getElementById('page-content');
        content.style.animation = 'none';
        content.offsetHeight;
        content.style.animation = 'fadeIn 0.3s ease-out';

        // Route
        switch (page) {
            case 'dashboard': renderDashboard(); break;
            case 'molds': renderMolds(); break;
            case 'stock': renderStock(); break;
            case 'machines': renderMachines(); break;
            case 'import': renderImport(); break;
            case 'users': renderUsers(); break;
            case 'pending': renderPending(); break;
            case 'maintenance': renderMaintenance(); break;
            case 'backup': renderBackup(); break;
            default: content.innerHTML = '<div class="empty-state"><h3>Sayfa bulunamadı</h3></div>';
        }
    }
};

// Notification helpers
async function markNotifRead(id) {
    try {
        await API.put(`/api/notifications/${id}/read`);
        App.updateNotificationBadge();
        App.showNotifications();
    } catch (err) { showToast(err.message, 'error'); }
}

async function markAllNotifsRead() {
    try {
        await API.put('/api/notifications/read-all');
        App.updateNotificationBadge();
        Modal.hide();
        showToast('Tüm bildirimler okundu olarak işaretlendi.', 'success');
    } catch (err) { showToast(err.message, 'error'); }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => App.init());
