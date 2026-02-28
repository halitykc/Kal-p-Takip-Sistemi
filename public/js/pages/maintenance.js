// Maintenance Tracking Page
async function renderMaintenance() {
    const content = document.getElementById('page-content');
    const isAdmin = App.user.role === 'admin';

    if (isAdmin) {
        const topbarActions = document.getElementById('topbar-actions');
        topbarActions.innerHTML = `
            <button class="btn btn-primary" id="add-maint-btn">
                <span class="material-icons-round">add</span> Yeni Bakım Kaydı
            </button>`;
        document.getElementById('add-maint-btn').addEventListener('click', () => showMaintenanceForm());
    }

    content.innerHTML = `
        <div class="filters-bar">
            <select id="maint-type-filter">
                <option value="">Tüm Türler</option>
                <option value="Bakım">Bakım</option>
                <option value="Arıza">Arıza</option>
                <option value="Revizyon">Revizyon</option>
                <option value="Kontrol">Kontrol</option>
            </select>
            <select id="maint-status-filter">
                <option value="">Tüm Durumlar</option>
                <option value="Planlandı">Planlandı</option>
                <option value="Devam Ediyor">Devam Ediyor</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="İptal">İptal</option>
            </select>
        </div>
        <div id="upcoming-section"></div>
        <div class="section">
            <div class="section-header">
                <div class="section-title">
                    <span class="material-icons-round">build</span>
                    Bakım Kayıtları
                </div>
                <button class="btn btn-ghost btn-sm" onclick="exportMaintenance()" title="Excel'e Aktar">
                    <span class="material-icons-round">download</span> Excel
                </button>
            </div>
            <div class="section-body" style="padding:0" id="maint-table">
                <div class="spinner"></div>
            </div>
        </div>`;

    document.getElementById('maint-type-filter').addEventListener('change', loadMaintenanceRecords);
    document.getElementById('maint-status-filter').addEventListener('change', loadMaintenanceRecords);

    loadUpcomingMaintenance();
    loadMaintenanceRecords();
}

async function loadUpcomingMaintenance() {
    try {
        const records = await API.get('/api/maintenance/upcoming');
        const section = document.getElementById('upcoming-section');
        if (records.length === 0) { section.innerHTML = ''; return; }

        section.innerHTML = `
        <div class="section" style="border-left: 3px solid var(--warning)">
            <div class="section-header">
                <div class="section-title" style="color:var(--warning)">
                    <span class="material-icons-round">schedule</span>
                    Yaklaşan Bakımlar (30 gün içinde)
                </div>
            </div>
            <div class="section-body" style="padding:0">
                ${renderTable([
            { label: 'Kalıp Kodu', render: r => `<strong class="font-mono text-accent">${r.mold_code}</strong>` },
            { label: 'Ürün Kodu', render: r => `<span class="font-mono">${r.product_code}</span>` },
            { label: 'Son Bakım Türü', key: 'maintenance_type' },
            { label: 'Sonraki Bakım', render: r => `<span class="badge badge-warning">${formatDate(r.next_maintenance_date)}</span>` },
        ], records)}
            </div>
        </div>`;
    } catch { }
}

async function loadMaintenanceRecords() {
    const container = document.getElementById('maint-table');
    const maintenance_type = document.getElementById('maint-type-filter').value;
    const status = document.getElementById('maint-status-filter').value;

    const params = new URLSearchParams();
    if (maintenance_type) params.set('maintenance_type', maintenance_type);
    if (status) params.set('status', status);

    try {
        const records = await API.get(`/api/maintenance?${params}`);
        const isAdmin = App.user.role === 'admin';

        const statusBadge = (s) => {
            const map = { 'Planlandı': 'badge-info', 'Devam Ediyor': 'badge-warning', 'Tamamlandı': 'badge-success', 'İptal': 'badge-neutral' };
            return `<span class="badge ${map[s] || 'badge-neutral'}">${s}</span>`;
        };

        container.innerHTML = renderTable([
            { label: 'Kalıp Kodu', render: r => `<strong class="font-mono text-accent">${r.mold_code}</strong>` },
            { label: 'Ürün Kodu', render: r => `<span class="font-mono">${r.product_code}</span>` },
            { label: 'Tür', render: r => `<span class="badge badge-info">${r.maintenance_type}</span>` },
            { label: 'Başlangıç', render: r => formatDate(r.start_date) },
            { label: 'Bitiş', render: r => r.end_date ? formatDate(r.end_date) : '-' },
            { label: 'Maliyet', render: r => r.cost > 0 ? `₺${r.cost.toLocaleString('tr-TR')}` : '-' },
            { label: 'Teknisyen', render: r => r.technician || '-' },
            { label: 'Durum', render: r => statusBadge(r.status) },
            ...(isAdmin ? [{
                label: 'İşlem', render: r => `
                <div class="action-btns">
                    <button class="action-btn edit" onclick="showMaintenanceForm(${r.id})" title="Düzenle">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="action-btn delete" onclick="deleteMaintenanceRecord(${r.id})" title="Sil">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>` }] : [])
        ], records, { emptyIcon: 'build', emptyTitle: 'Bakım kaydı bulunamadı', emptyText: 'Yeni bir bakım kaydı ekleyerek başlayın.' });
    } catch (err) {
        container.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function showMaintenanceForm(id = null) {
    const isEdit = id !== null;
    let record = {};
    let molds = [];

    try {
        molds = await API.get('/api/molds');
        if (isEdit) {
            const records = await API.get(`/api/maintenance?limit=500`);
            record = records.find(r => r.id === id) || {};
        }
    } catch (err) { showToast(err.message, 'error'); return; }

    const moldOpts = molds.map(m =>
        `<option value="${m.id}" ${record.mold_id == m.id ? 'selected' : ''}>${m.mold_code} — ${m.product_code} (${m.mold_type})</option>`
    ).join('');

    const today = new Date().toISOString().split('T')[0];

    Modal.show(isEdit ? 'Bakım Kaydı Düzenle' : 'Yeni Bakım Kaydı', `
        <form id="maint-form">
            ${!isEdit ? `<div class="form-group">
                <label>Kalıp *</label>
                <select id="mtf-mold" required>
                    <option value="">Kalıp seçin...</option>
                    ${moldOpts}
                </select>
            </div>` : ''}
            <div class="form-row">
                <div class="form-group">
                    <label>Bakım Türü *</label>
                    <select id="mtf-type" required>
                        <option value="Bakım" ${record.maintenance_type === 'Bakım' ? 'selected' : ''}>Bakım</option>
                        <option value="Arıza" ${record.maintenance_type === 'Arıza' ? 'selected' : ''}>Arıza</option>
                        <option value="Revizyon" ${record.maintenance_type === 'Revizyon' ? 'selected' : ''}>Revizyon</option>
                        <option value="Kontrol" ${record.maintenance_type === 'Kontrol' ? 'selected' : ''}>Kontrol</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Durum</label>
                    <select id="mtf-status">
                        <option value="Planlandı" ${record.status === 'Planlandı' ? 'selected' : ''}>Planlandı</option>
                        <option value="Devam Ediyor" ${record.status === 'Devam Ediyor' ? 'selected' : ''}>Devam Ediyor</option>
                        <option value="Tamamlandı" ${record.status === 'Tamamlandı' ? 'selected' : ''}>Tamamlandı</option>
                        <option value="İptal" ${record.status === 'İptal' ? 'selected' : ''}>İptal</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Başlangıç Tarihi *</label>
                    <input type="date" id="mtf-start" value="${record.start_date || today}" required>
                </div>
                <div class="form-group">
                    <label>Bitiş Tarihi</label>
                    <input type="date" id="mtf-end" value="${record.end_date || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Maliyet (₺)</label>
                    <input type="number" id="mtf-cost" value="${record.cost || 0}" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Teknisyen</label>
                    <input type="text" id="mtf-tech" value="${record.technician || ''}" placeholder="Sorumlu teknisyen">
                </div>
            </div>
            <div class="form-group">
                <label>Sonraki Bakım Tarihi</label>
                <input type="date" id="mtf-next" value="${record.next_maintenance_date || ''}">
            </div>
            <div class="form-group">
                <label>Açıklama</label>
                <textarea id="mtf-desc" rows="2" placeholder="Bakım detayları...">${record.description || ''}</textarea>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="Modal.hide()">İptal</button>
        <button class="btn btn-primary" id="maint-save-btn">
            <span class="material-icons-round">save</span> Kaydet
        </button>
    `);

    document.getElementById('maint-save-btn').addEventListener('click', async () => {
        const data = {
            maintenance_type: document.getElementById('mtf-type').value,
            description: document.getElementById('mtf-desc').value || null,
            start_date: document.getElementById('mtf-start').value,
            end_date: document.getElementById('mtf-end').value || null,
            cost: parseFloat(document.getElementById('mtf-cost').value) || 0,
            technician: document.getElementById('mtf-tech').value || null,
            status: document.getElementById('mtf-status').value,
            next_maintenance_date: document.getElementById('mtf-next').value || null,
        };

        if (!isEdit) {
            data.mold_id = document.getElementById('mtf-mold').value;
            if (!data.mold_id) { showToast('Kalıp seçimi zorunludur.', 'error'); return; }
        }

        if (!data.start_date) { showToast('Başlangıç tarihi zorunludur.', 'error'); return; }

        try {
            if (isEdit) await API.put(`/api/maintenance/${id}`, data);
            else await API.post('/api/maintenance', data);
            showToast(isEdit ? 'Bakım kaydı güncellendi.' : 'Bakım kaydı oluşturuldu.', 'success');
            Modal.hide();
            loadMaintenanceRecords();
            loadUpcomingMaintenance();
        } catch (err) { showToast(err.message, 'error'); }
    });
}

function deleteMaintenanceRecord(id) {
    Modal.confirm('Bakım Kaydı Sil', 'Bu bakım kaydını silmek istediğinize emin misiniz?', async () => {
        try {
            await API.delete(`/api/maintenance/${id}`);
            showToast('Bakım kaydı silindi.', 'success');
            loadMaintenanceRecords();
        } catch (err) { showToast(err.message, 'error'); }
    });
}

function exportMaintenance() {
    window.open('/api/export/maintenance', '_blank');
}
