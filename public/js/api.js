// API Client
const API = {
    async request(method, url, data = null) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) opts.body = JSON.stringify(data);

        const res = await fetch(url, opts);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Bir hata oluştu.');
        return json;
    },

    get(url) { return this.request('GET', url); },
    post(url, data) { return this.request('POST', url, data); },
    put(url, data) { return this.request('PUT', url, data); },
    delete(url) { return this.request('DELETE', url); },

    async upload(url, formData) {
        const res = await fetch(url, { method: 'POST', body: formData });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Yükleme hatası.');
        return json;
    }
};

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons-round">${icons[type]}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Format date for display
function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('tr-TR');
    } catch { return dateStr; }
}

// Get status badge HTML
function getStatusBadge(status) {
    const map = {
        'Yeni': 'badge-info',
        'Stokta': 'badge-success',
        'Aktif': 'badge-success',
        'Çıkış': 'badge-danger',
        'Bakımda': 'badge-warning',
        'Arızalı': 'badge-danger',
        'Depoda': 'badge-neutral',
        'Hurda': 'badge-danger',
    };
    return `<span class="badge ${map[status] || 'badge-neutral'}">${status}</span>`;
}

// Get mold type badge
function getTypeBadge(type) {
    const map = {
        'Kalıp': 'badge-info',
        'Zımba': 'badge-warning',
        'Plaka': 'badge-success',
    };
    return `<span class="badge ${map[type] || 'badge-neutral'}">${type}</span>`;
}

// Movement type badge
function getMovementBadge(type) {
    return type === 'Giriş'
        ? '<span class="badge badge-success">↓ Giriş</span>'
        : '<span class="badge badge-danger">↑ Çıkış</span>';
}
